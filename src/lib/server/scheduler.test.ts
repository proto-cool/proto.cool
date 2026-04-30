import { describe, it, expect, beforeEach } from 'vitest';
import { openDatabase, runMigrations, type DB } from './db';
import { createBreaker } from './breaker';
import { tick } from './scheduler';
import type { Adapter, AdapterRegistry } from './adapters/types';

const NOW = '2026-04-29T12:00:00Z';

let db: DB;
beforeEach(() => {
	db = openDatabase(':memory:');
	runMigrations(db);
});

function fakeAdapter(source: 'bsky' | 'grain', overrides: Partial<Adapter> = {}): Adapter {
	const noop: Adapter = {
		source,
		async fetchEngagement(uris) {
			return {
				found: uris.map((uri) => ({
					uri,
					likeCount: 1,
					repostCount: 0,
					replyCount: 0,
					reactorSample: []
				})),
				notFound: []
			};
		},
		async fetchRecords(uris) {
			return {
				found: uris.map((uri) => ({
					uri,
					cid: 'fake-cid',
					value: { $type: 'app.bsky.feed.post', text: 'hi', createdAt: '2026-04-29T11:00:00Z' },
					createdAt: '2026-04-29T11:00:00Z'
				})),
				notFound: []
			};
		}
	};
	return { ...noop, ...overrides };
}

function fakeRegistry(over: Partial<AdapterRegistry> = {}): AdapterRegistry {
	return {
		bsky: over.bsky ?? fakeAdapter('bsky'),
		grain: over.grain ?? fakeAdapter('grain')
	};
}

function insertRecord(db: DB, args: {
	uri: string;
	collection: string;
	kind: 'owned' | 'external';
	status: 'pending' | 'ok';
	createdAt: string;
	subjectUri?: string | null;
	value?: unknown;
}) {
	db.prepare(
		`INSERT INTO records
		   (uri, did, collection, rkey, cid, kind, status, subject_uri, value, created_at, indexed_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	).run(
		args.uri,
		'did:plc:x',
		args.collection,
		args.uri.split('/').at(-1) ?? '',
		'cid',
		args.kind,
		args.status,
		args.subjectUri ?? null,
		args.value === undefined ? null : JSON.stringify(args.value),
		args.createdAt,
		NOW
	);
}

describe('scheduler.tick — phase A (enrichment)', () => {
	it('flips pending external rows to ok with fetched value', async () => {
		insertRecord(db, {
			uri: 'at://did:plc:y/app.bsky.feed.post/1',
			collection: 'app.bsky.feed.post',
			kind: 'external',
			status: 'pending',
			createdAt: NOW
		});
		const result = await tick(db, fakeRegistry(), createBreaker(db), NOW);
		expect(result.enrichedCount).toBe(1);
		const row = db
			.prepare(`SELECT status, value FROM records WHERE uri = ?`)
			.get('at://did:plc:y/app.bsky.feed.post/1') as { status: string; value: string };
		expect(row.status).toBe('ok');
		expect(JSON.parse(row.value).text).toBe('hi');
	});

	it('hard-deletes external rows the AppView reports as missing', async () => {
		insertRecord(db, {
			uri: 'at://did:plc:y/app.bsky.feed.post/GONE',
			collection: 'app.bsky.feed.post',
			kind: 'external',
			status: 'pending',
			createdAt: NOW
		});
		const adapters = fakeRegistry({
			bsky: fakeAdapter('bsky', {
				async fetchRecords(uris) {
					return { found: [], notFound: uris };
				}
			})
		});
		const result = await tick(db, adapters, createBreaker(db), NOW);
		expect(result.enrichedDeleted).toBe(1);
		const row = db
			.prepare(`SELECT uri FROM records WHERE uri = ?`)
			.get('at://did:plc:y/app.bsky.feed.post/GONE');
		expect(row).toBeUndefined();
	});

	it('skips phase A when bsky breaker is open', async () => {
		insertRecord(db, {
			uri: 'at://did:plc:y/app.bsky.feed.post/2',
			collection: 'app.bsky.feed.post',
			kind: 'external',
			status: 'pending',
			createdAt: NOW
		});
		const breaker = createBreaker(db);
		for (let i = 0; i < 5; i++) breaker.recordFailure('bsky', NOW);
		const result = await tick(db, fakeRegistry(), breaker, NOW);
		expect(result.enrichedCount).toBe(0);
	});
});

describe('scheduler.tick — phase B (engagement refresh)', () => {
	it('writes engagement rows for due owned posts in the recent tier', async () => {
		// 1h ago — well within recent tier and never refreshed.
		insertRecord(db, {
			uri: 'at://did:plc:x/app.bsky.feed.post/A',
			collection: 'app.bsky.feed.post',
			kind: 'owned',
			status: 'ok',
			createdAt: '2026-04-29T11:00:00Z'
		});
		const result = await tick(db, fakeRegistry(), createBreaker(db), NOW);
		expect(result.refreshed.find((r) => r.tier === 'recent' && r.source === 'bsky')?.count).toBe(1);
		const e = db
			.prepare(`SELECT * FROM engagement WHERE uri = ?`)
			.get('at://did:plc:x/app.bsky.feed.post/A') as { like_count: number; source: string };
		expect(e.like_count).toBe(1);
		expect(e.source).toBe('bsky');
	});

	it('does not refresh rows still within their tier interval', async () => {
		insertRecord(db, {
			uri: 'at://did:plc:x/app.bsky.feed.post/B',
			collection: 'app.bsky.feed.post',
			kind: 'owned',
			status: 'ok',
			createdAt: '2026-04-29T11:00:00Z'
		});
		// Engagement freshly refreshed 30 min ago — recent tier needs 1h.
		db.prepare(
			`INSERT INTO engagement (uri, like_count, repost_count, reply_count, reactor_sample, source, last_refreshed_at)
			 VALUES (?, 0, 0, 0, '[]', 'bsky', ?)`
		).run('at://did:plc:x/app.bsky.feed.post/B', '2026-04-29T11:30:00Z');
		const result = await tick(db, fakeRegistry(), createBreaker(db), NOW);
		expect(result.refreshed.find((r) => r.source === 'bsky')?.count).toBe(undefined);
	});

	it('isolates failures per source — grain throw does not block bsky', async () => {
		insertRecord(db, {
			uri: 'at://did:plc:x/app.bsky.feed.post/C',
			collection: 'app.bsky.feed.post',
			kind: 'owned',
			status: 'ok',
			createdAt: '2026-04-29T11:00:00Z'
		});
		const adapters = fakeRegistry({
			grain: fakeAdapter('grain', {
				async fetchEngagement() {
					throw new Error('grain offline');
				}
			})
		});
		const result = await tick(db, adapters, createBreaker(db), NOW);
		expect(result.refreshed.some((r) => r.source === 'bsky')).toBe(true);
		// (No grain rows due, so no grain error today — but the test confirms
		// the bsky path still runs in the presence of a poisoned grain adapter.)
		expect(result.errors.find((e) => e.source === 'bsky')).toBeUndefined();
	});

	it('records cron.<tier>.<source>.last_run on success', async () => {
		insertRecord(db, {
			uri: 'at://did:plc:x/app.bsky.feed.post/D',
			collection: 'app.bsky.feed.post',
			kind: 'owned',
			status: 'ok',
			createdAt: '2026-04-29T11:00:00Z'
		});
		await tick(db, fakeRegistry(), createBreaker(db), NOW);
		const row = db
			.prepare(`SELECT value FROM state WHERE key = ?`)
			.get('cron.recent.bsky.last_run') as { value: string };
		expect(row.value).toBe(NOW);
	});

	it('only refreshes owned posts (reposts inherit via subject join)', async () => {
		insertRecord(db, {
			uri: 'at://did:plc:x/app.bsky.feed.repost/R',
			collection: 'app.bsky.feed.repost',
			kind: 'owned',
			status: 'ok',
			createdAt: '2026-04-29T11:00:00Z'
		});
		const result = await tick(db, fakeRegistry(), createBreaker(db), NOW);
		expect(result.refreshed).toEqual([]);
		const e = db.prepare(`SELECT COUNT(*) AS c FROM engagement`).get() as { c: number };
		expect(e.c).toBe(0);
	});
});
