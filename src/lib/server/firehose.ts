// src/lib/server/firehose.ts
//
// Long-running websocket against the operator's PDS (subscribeRepos). Decodes
// only the frame envelope (header + commit body) — uses com.atproto.repo.getRecord
// to fetch each op's record body, avoiding any CAR decoder.
//
// Each frame is the concatenation of two CBOR objects (header, then body). To
// read both objects from the same buffer we use `cborg.decodeFirst`, which
// returns `[value, remainder]`. We pass `@ipld/dag-cbor`'s `decodeOptions` so
// embedded CIDs (tag 42) decode to multiformats `CID` instances rather than
// raw byte arrays. `@ipld/dag-cbor` itself only re-exports `decode` (single
// object), so we reach into its underlying `cborg` dep for `decodeFirst`.
//
// Persists firehose.last_seq after every applied commit; on disconnect,
// reconnects with cursor=last_seq using exponential backoff with jitter.

import WebSocket from 'ws';
import { decodeFirst } from 'cborg';
import { decodeOptions } from '@ipld/dag-cbor';

import type { DB } from './db';
import type { AtpClient } from './atp-client';
import { applyCommit, type AppliedCommit, type CommitOp } from './firehose-handler';

const BACKOFF_INITIAL_MS = 1_000;
const BACKOFF_MAX_MS = 60_000;

export type FirehoseState = {
	connected: boolean;
	lastSeq: number | null;
	lastEventAtMs: number | null;
};

const STATE: FirehoseState = {
	connected: false,
	lastSeq: null,
	lastEventAtMs: null
};

export function getFirehoseState(): Readonly<FirehoseState> {
	return STATE;
}

export type FirehoseHandle = { stop: () => void };

export function startFirehose(args: {
	db: DB;
	client: AtpClient;
	pdsHost: string; // e.g. 'pds.proto.cool'
	ownerDid: string;
}): FirehoseHandle {
	let stopped = false;
	let backoffMs = BACKOFF_INITIAL_MS;
	let activeWs: WebSocket | null = null;

	// Initial cursor from state.
	const lastSeqRow = args.db
		.prepare(`SELECT value FROM state WHERE key = 'firehose.last_seq'`)
		.get() as { value: string } | undefined;
	let cursor: number | null = lastSeqRow ? Number(lastSeqRow.value) : null;
	STATE.lastSeq = cursor;

	const writeLastSeq = args.db.prepare(
		`INSERT INTO state (key, value, updated_at) VALUES ('firehose.last_seq', ?, ?)
		 ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
	);

	const connect = () => {
		if (stopped) return;
		const url = buildSubscribeUrl(args.pdsHost, cursor);
		console.info(`[firehose] connecting cursor=${cursor ?? '<none>'} -> ${url}`);
		const ws = new WebSocket(url);
		activeWs = ws;

		ws.binaryType = 'nodebuffer';

		ws.on('open', () => {
			STATE.connected = true;
			backoffMs = BACKOFF_INITIAL_MS;
			console.info('[firehose] connected');
		});

		async function handleMessage(raw: Buffer): Promise<void> {
				let advanceSeq: number | null = null;
				try {
					const frame = parseFrame(raw);
					STATE.lastEventAtMs = Date.now();

					if (frame === null) return;

					if (frame.t !== '#commit') {
						// #identity, #account, #sync, #info — advance cursor and skip.
						if ('seq' in frame.body && typeof frame.body.seq === 'number') {
							advanceSeq = frame.body.seq;
						}
						return;
					}

					const commitBody = frame.body as RawCommitBody;
					advanceSeq = commitBody.seq;

					if (commitBody.repo !== args.ownerDid) {
						return;
					}

					const ops = await materializeOps(args.client, commitBody);
					const applied: AppliedCommit = {
						seq: commitBody.seq,
						repo: commitBody.repo,
						ops
					};
					applyCommit(args.db, applied, args.ownerDid, new Date().toISOString());
				} catch (err) {
					console.warn('[firehose] decode/apply failed; skipping frame', err);
					// advanceSeq captures the seq if parseFrame succeeded; if it
					// didn't, we have nothing safe to advance to and will retry the
					// bad frame on next connect (correct — may be transient corruption).
				} finally {
					if (advanceSeq !== null) {
						cursor = advanceSeq;
						STATE.lastSeq = cursor;
						writeLastSeq.run(String(cursor), new Date().toISOString());
					}
				}
			}

		let handlerTail: Promise<void> = Promise.resolve();
		ws.on('message', (raw: Buffer) => {
			handlerTail = handlerTail.then(() => handleMessage(raw)).catch((err) => {
				console.warn('[firehose] handler queue caught error', err);
			});
		});

		ws.on('close', () => {
			STATE.connected = false;
			activeWs = null;
			if (stopped) return;
			const wait = backoffMs;
			backoffMs = Math.min(backoffMs * 2, BACKOFF_MAX_MS);
			const jitter = Math.random() * 0.3 * wait;
			console.info(`[firehose] closed; reconnecting in ${Math.round(wait + jitter)}ms`);
			setTimeout(connect, wait + jitter);
		});

		ws.on('error', (err: Error) => {
			console.warn('[firehose] socket error', err.message);
			// 'close' will fire after 'error'; backoff handled there.
		});
	};

	connect();

	return {
		stop() {
			stopped = true;
			activeWs?.close();
			STATE.connected = false;
		}
	};
}

function buildSubscribeUrl(pdsHost: string, cursor: number | null): string {
	const cursorParam = cursor !== null ? `?cursor=${cursor}` : '';
	return `wss://${pdsHost}/xrpc/com.atproto.sync.subscribeRepos${cursorParam}`;
}

type FrameHeader = { op: number; t?: string };
type RawCommitOp = { action: string; path: string; cid: { toString(): string } | null };
type RawCommitBody = {
	seq: number;
	repo: string;
	ops: RawCommitOp[];
	[k: string]: unknown;
};
type ParsedFrame = { t: string; body: { seq?: number; [k: string]: unknown } };

function parseFrame(bytes: Buffer): ParsedFrame | null {
	const u8 = new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const [headerVal, rest] = decodeFirst(u8, decodeOptions);
	const header = headerVal as FrameHeader;
	if (header.op !== 1 || !header.t) return null; // op=-1 errors, malformed
	const [bodyVal] = decodeFirst(rest, decodeOptions);
	return { t: header.t, body: bodyVal as ParsedFrame['body'] };
}

async function materializeOps(
	client: AtpClient,
	commit: RawCommitBody
): Promise<CommitOp[]> {
	const out: CommitOp[] = [];
	for (const op of commit.ops) {
		if (op.action === 'delete') {
			out.push({ action: 'delete', path: op.path });
			continue;
		}
		if (op.action !== 'create' && op.action !== 'update') continue;

		const [collection, rkey] = splitPath(op.path);
		if (!collection || !rkey) continue;
		const cidStr = op.cid ? op.cid.toString() : undefined;

		try {
			const fetched = await client.getRecord({
				repo: commit.repo,
				collection,
				rkey,
				cid: cidStr
			});
			out.push({
				action: op.action,
				path: op.path,
				cid: fetched.cid,
				record: fetched.value
			});
		} catch (err) {
			console.warn(`[firehose] getRecord failed for ${op.path}`, err);
			// skip this op; cursor still advances on the commit as a whole
		}
	}
	return out;
}

function splitPath(path: string): [string, string] {
	const idx = path.indexOf('/');
	if (idx === -1) return [path, ''];
	return [path.slice(0, idx), path.slice(idx + 1)];
}
