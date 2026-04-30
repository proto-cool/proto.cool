import { describe, it, expect, beforeEach } from 'vitest';
import { openDatabase, runMigrations, type DB } from '../db';
import { createStandardAdapter } from './standard';
import type { AtpClient } from '../atp-client';

function makeDb(): DB {
	const db = openDatabase(':memory:');
	runMigrations(db);
	return db;
}

function fakeAtp(overrides: Partial<AtpClient>): AtpClient {
	return {
		async listRecords() { throw new Error('not used'); },
		async getRecord() { throw new Error('not used'); },
		async resolveHandle() { throw new Error('not used'); },
		async getPosts() { return { posts: [] }; },
		async getProfile() { throw new Error('not used'); },
		...overrides
	};
}

function insertDoc(db: DB, opts: {
	uri: string;
	bskyPostRef?: { uri: string; cid: string };
}) {
	const value = JSON.stringify({
		title: 'doc',
		publishedAt: '2026-04-29T00:00:00Z',
		bskyPostRef: opts.bskyPostRef
	});
	db.prepare(
		`INSERT INTO records (uri, did, collection, rkey, cid, kind, status, value, created_at, indexed_at)
		 VALUES (?, 'did:plc:owner', 'site.standard.document', 'k', 'c', 'owned', 'ok', ?, ?, ?)`
	).run(opts.uri, value, '2026-04-29T00:00:00Z', '2026-04-29T00:00:00Z');
}

describe('standard adapter', () => {
	let db: DB;
	beforeEach(() => { db = makeDb(); });

	it('returns empty for empty input', async () => {
		const a = createStandardAdapter(db, fakeAtp({}));
		expect(await a.fetchEngagement([])).toEqual({ found: [], notFound: [] });
	});

	it('skips docs with no bskyPostRef (no-op success, NOT notFound)', async () => {
		insertDoc(db, { uri: 'at://did:plc:owner/site.standard.document/a' });
		let called = false;
		const client = fakeAtp({
			async getPosts() { called = true; return { posts: [] }; }
		});
		const a = createStandardAdapter(db, client);
		const r = await a.fetchEngagement(['at://did:plc:owner/site.standard.document/a']);
		expect(called).toBe(false);
		expect(r).toEqual({ found: [], notFound: [] });
	});

	it('fetches via bskyPostRef and keys by doc URI', async () => {
		insertDoc(db, {
			uri: 'at://did:plc:owner/site.standard.document/a',
			bskyPostRef: { uri: 'at://did:plc:owner/app.bsky.feed.post/x', cid: 'c1' }
		});
		const client = fakeAtp({
			async getPosts(uris) {
				expect(uris).toEqual(['at://did:plc:owner/app.bsky.feed.post/x']);
				return {
					posts: [{
						uri: 'at://did:plc:owner/app.bsky.feed.post/x',
						cid: 'c1',
						record: {},
						likeCount: 7,
						repostCount: 2,
						replyCount: 3
					}]
				};
			}
		});
		const a = createStandardAdapter(db, client);
		const r = await a.fetchEngagement(['at://did:plc:owner/site.standard.document/a']);
		expect(r.found).toEqual([{
			uri: 'at://did:plc:owner/site.standard.document/a',
			likeCount: 7,
			repostCount: 2,
			replyCount: 3,
			reactorSample: []
		}]);
		expect(r.notFound).toEqual([]);
	});

	it('appview-missing post returns notFound keyed by doc URI', async () => {
		insertDoc(db, {
			uri: 'at://did:plc:owner/site.standard.document/dead',
			bskyPostRef: { uri: 'at://did:plc:owner/app.bsky.feed.post/dead', cid: 'c2' }
		});
		const a = createStandardAdapter(db, fakeAtp({
			async getPosts() { return { posts: [] }; }
		}));
		const r = await a.fetchEngagement(['at://did:plc:owner/site.standard.document/dead']);
		expect(r.found).toEqual([]);
		expect(r.notFound).toEqual(['at://did:plc:owner/site.standard.document/dead']);
	});

	it('fetchRecords is a no-op (owned-only)', async () => {
		const a = createStandardAdapter(db, fakeAtp({}));
		const r = await a.fetchRecords(['at://x/y/z']);
		expect(r).toEqual({ found: [], notFound: [] });
	});
});
