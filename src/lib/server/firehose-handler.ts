// src/lib/server/firehose-handler.ts
//
// Pure translation of a parsed firehose commit into DB writes. The websocket
// loop calls this; tests construct commits directly. Filtering on repo/
// collection happens here (not in the websocket loop) so the same logic is
// exercised in tests.

import type { DB } from './db';
import { WATCHED_COLLECTIONS } from './config';
import { extractCreatedAt } from './created-at';

export type CommitOp =
	| { action: 'create' | 'update'; path: string; cid: string; record: Record<string, unknown> }
	| { action: 'delete'; path: string };

export type AppliedCommit = {
	seq: number;
	repo: string;
	ops: CommitOp[];
};

export type ApplyResult = {
	owned: { upserted: number; deleted: number };
	pending: { enqueued: number };
};

export function applyCommit(
	db: DB,
	commit: AppliedCommit,
	ownerDid: string,
	nowIso: string
): ApplyResult {
	const result: ApplyResult = {
		owned: { upserted: 0, deleted: 0 },
		pending: { enqueued: 0 }
	};

	if (commit.repo !== ownerDid) return result;

	const upsertOwned = db.prepare(
		`INSERT INTO records
		   (uri, did, collection, rkey, cid, kind, status, subject_uri, value, created_at, indexed_at)
		 VALUES (?, ?, ?, ?, ?, 'owned', 'ok', ?, ?, ?, ?)
		 ON CONFLICT (uri) DO UPDATE SET
		   cid = excluded.cid,
		   value = excluded.value,
		   subject_uri = excluded.subject_uri,
		   created_at = excluded.created_at,
		   indexed_at = excluded.indexed_at`
	);
	const insertPending = db.prepare(
		`INSERT INTO records
		   (uri, did, collection, rkey, cid, kind, status, subject_uri, value, created_at, indexed_at)
		 VALUES (?, ?, ?, ?, '', 'external', 'pending', NULL, NULL, ?, ?)
		 ON CONFLICT (uri) DO NOTHING`
	);
	const del = db.prepare(`DELETE FROM records WHERE uri = ?`);

	const tx = db.transaction(() => {
		for (const op of commit.ops) {
			const [collection, rkey] = splitPath(op.path);
			if (!WATCHED_COLLECTIONS.includes(collection)) continue;
			const uri = `at://${commit.repo}/${op.path}`;

			if (op.action === 'delete') {
				del.run(uri);
				result.owned.deleted += 1;
				continue;
			}

			const value = op.record;
			const createdAt = extractCreatedAt(collection, value, nowIso);
			const subjectUri = extractSubjectUri(value);
			upsertOwned.run(
				uri,
				commit.repo,
				collection,
				rkey,
				op.cid,
				subjectUri,
				JSON.stringify(value),
				createdAt,
				nowIso
			);
			result.owned.upserted += 1;

			// Enqueue the externally-referenced URI for enrichment by the scheduler.
			// The DID parsed from at://<did>/... can be anyone — we don't filter on
			// it. Insert ON CONFLICT DO NOTHING: if we already cached it (own or
			// external, ok or pending) leave it alone.
			if (subjectUri) {
				const [, , extDid, extCollection, extRkey] = parseAtUri(subjectUri);
				if (extDid && extCollection && extRkey) {
					insertPending.run(subjectUri, extDid, extCollection, extRkey, nowIso, nowIso);
					result.pending.enqueued += 1;
				}
			}
		}
	});
	tx();

	return result;
}

function splitPath(path: string): [string, string] {
	const idx = path.indexOf('/');
	if (idx === -1) return [path, ''];
	return [path.slice(0, idx), path.slice(idx + 1)];
}

// Returns ['at:', '', did, collection, rkey] (matches URL.split('/') shape).
function parseAtUri(uri: string): [string, string, string?, string?, string?] {
	const parts = uri.split('/');
	if (parts.length < 5) return [parts[0] ?? '', parts[1] ?? ''];
	return [parts[0], parts[1], parts[2], parts[3], parts[4]];
}

function extractSubjectUri(value: Record<string, unknown>): string | null {
	// app.bsky.feed.repost: { subject: { uri, cid } }
	const subject = value.subject as { uri?: unknown } | undefined;
	if (subject && typeof subject.uri === 'string') return subject.uri;

	// app.bsky.feed.post with quote-style embed:
	//   embed.$type = 'app.bsky.embed.record',          embed.record = { uri }
	//   embed.$type = 'app.bsky.embed.recordWithMedia', embed.record.record = { uri }
	const embed = value.embed as
		| { $type?: unknown; record?: { uri?: unknown; record?: { uri?: unknown } } }
		| undefined;
	if (embed && typeof embed.$type === 'string') {
		if (embed.$type === 'app.bsky.embed.record') {
			const u = embed.record?.uri;
			if (typeof u === 'string') return u;
		} else if (embed.$type === 'app.bsky.embed.recordWithMedia') {
			const u = embed.record?.record?.uri;
			if (typeof u === 'string') return u;
		}
	}

	return null;
}
