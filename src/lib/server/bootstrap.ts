// src/lib/server/bootstrap.ts
//
// One-shot boot. Imported as a side-effect from hooks.server.ts so it runs
// exactly once per Node process before the first request. The body is gated
// on shouldRunBackground() so vite dev / vitest / scripts/backfill don't
// connect upstream by accident.
//
// On boot:
//   1. open the DB (single shared instance, exported)
//   2. run migrations (idempotent)
//   3. if firehose.last_seq is missing → run backfill (full listRecords sweep)
//   4. start scheduler (60s tick)
//   5. start firehose (websocket)

import { openDatabase, runMigrations, type DB } from './db';
import {
	getPdsHost,
	getOwnerDid,
	getBskyAppview,
	shouldRunBackground
} from './config';
import { createAtpClient } from './atp-client';
import { runBackfill } from './backfill';
import { createBskyAdapter } from './adapters/bsky';
import { createStandardAdapter } from './adapters/standard';
import { createGrainAdapter } from './adapters/grain';
import type { AdapterRegistry } from './adapters/types';
import { createBreaker } from './breaker';
import { startScheduler, type SchedulerHandle } from './scheduler';
import { startFirehose, type FirehoseHandle } from './firehose';

const DB_PATH = process.env.PROTO_DB_PATH ?? './data/proto.sqlite';

let booted = false;
let dbInstance: DB | null = null;
let schedulerHandle: SchedulerHandle | null = null;
let firehoseHandle: FirehoseHandle | null = null;

export function getDb(): DB {
	if (!dbInstance) {
		dbInstance = openDatabase(DB_PATH);
		runMigrations(dbInstance);
	}
	return dbInstance;
}

export async function bootstrap(): Promise<void> {
	if (booted) return;
	booted = true;

	const db = getDb();

	if (!shouldRunBackground()) {
		console.info('[bootstrap] background workers disabled (set PROTO_BACKGROUND=1 to enable)');
		return;
	}

	const ownerDid = await resolveOwnerDid();
	if (!ownerDid) {
		console.warn('[bootstrap] no owner DID; skipping firehose + scheduler');
		return;
	}

	// Persist the resolved DID so request-time loaders (which can't run async
	// handle resolution on the hot path) can read it from the state table.
	db.prepare(
		`INSERT INTO state (key, value, updated_at) VALUES ('owner.did', ?, ?)
		 ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
	).run(ownerDid, new Date().toISOString());

	await ensureBackfillIfNeeded(db, ownerDid);

	const adapters: AdapterRegistry = {
		bsky: createBskyAdapter(createAtpClient(getBskyAppview())),
		standard: createStandardAdapter(db, createAtpClient(getBskyAppview())),
		grain: createGrainAdapter()
	};
	const breaker = createBreaker(db);
	const firehoseClient = createAtpClient(`https://${getPdsHost()}`);

	schedulerHandle = startScheduler(db, adapters, breaker);
	firehoseHandle = startFirehose({
		db,
		client: firehoseClient,
		pdsHost: getPdsHost(),
		ownerDid
	});

	console.info('[bootstrap] workers started');
}

async function resolveOwnerDid(): Promise<string | null> {
	const fromEnv = getOwnerDid();
	if (fromEnv) return fromEnv;
	const handle = process.env.PUBLIC_OWNER_HANDLE;
	if (!handle) return null;
	try {
		const client = createAtpClient(`https://${getPdsHost()}`);
		const { did } = await client.resolveHandle(handle);
		return did;
	} catch (err) {
		console.warn('[bootstrap] resolveHandle failed', err);
		return null;
	}
}

async function ensureBackfillIfNeeded(db: DB, ownerDid: string): Promise<void> {
	const seqRow = db
		.prepare(`SELECT value FROM state WHERE key = 'firehose.last_seq'`)
		.get() as { value: string } | undefined;
	if (seqRow) return; // already cached; firehose will resume

	console.info('[bootstrap] cold start — running backfill');
	const client = createAtpClient(`https://${getPdsHost()}`);
	const result = await runBackfill(db, client, ownerDid);
	console.info(`[bootstrap] backfill complete: ${result.totalInserted} rows`);
}

// For graceful shutdown — exported for tests / scripts that want it.
export function shutdown() {
	schedulerHandle?.stop();
	firehoseHandle?.stop();
	dbInstance?.close();
	booted = false;
	dbInstance = null;
	schedulerHandle = null;
	firehoseHandle = null;
}
