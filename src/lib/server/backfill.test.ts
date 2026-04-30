import { describe, it, expect } from 'vitest';
import { openDatabase, runMigrations } from './db';
import { runBackfill } from './backfill';
import type { AtpClient, ListRecordsResult } from './atp-client';

function makeMockClient(
	pages: Record<string, ListRecordsResult[]>
): AtpClient {
	const cursors: Record<string, number> = {};
	return {
		async listRecords({ collection, cursor }) {
			const list = pages[collection] ?? [];
			if (list.length === 0) return { records: [], cursor: null };
			// Find the page index given the cursor (we use page index as cursor).
			let idx = 0;
			if (cursor !== undefined) idx = Number(cursor);
			cursors[collection] = idx;
			const page = list[idx] ?? { records: [], cursor: null };
			return page;
		},
		async getRecord() {
			throw new Error('not used');
		},
		async resolveHandle() {
			throw new Error('not used');
		},
		async getPosts() {
			throw new Error('not used');
		},
		async getProfile() {
			throw new Error('not used');
		}
	};
}

describe('runBackfill', () => {
	const did = 'did:plc:abc';

	it('inserts records from a single-page listRecords response', async () => {
		const db = openDatabase(':memory:');
		runMigrations(db);

		const client = makeMockClient({
			'app.bsky.feed.post': [
				{
					records: [
						{
							uri: `at://${did}/app.bsky.feed.post/1`,
							cid: 'bafy1',
							value: {
								$type: 'app.bsky.feed.post',
								text: 'one',
								createdAt: '2026-04-01T00:00:00.000Z'
							}
						},
						{
							uri: `at://${did}/app.bsky.feed.post/2`,
							cid: 'bafy2',
							value: {
								$type: 'app.bsky.feed.post',
								text: 'two',
								createdAt: '2026-04-02T00:00:00.000Z'
							}
						}
					],
					cursor: null
				}
			],
			'app.bsky.feed.repost': [{ records: [], cursor: null }]
		});

		const result = await runBackfill(db, client, did);

		expect(result.totalInserted).toBe(2);
		const rows = db
			.prepare(`SELECT uri, kind, status, did, collection FROM records ORDER BY uri`)
			.all() as Array<{
				uri: string;
				kind: string;
				status: string;
				did: string;
				collection: string;
			}>;
		expect(rows.length).toBe(2);
		expect(rows[0].kind).toBe('owned');
		expect(rows[0].status).toBe('ok');
		expect(rows[0].did).toBe(did);
		expect(rows[0].collection).toBe('app.bsky.feed.post');
	});

	it('paginates until cursor is null', async () => {
		const db = openDatabase(':memory:');
		runMigrations(db);

		const client = makeMockClient({
			'app.bsky.feed.post': [
				{
					records: [
						{
							uri: `at://${did}/app.bsky.feed.post/1`,
							cid: 'bafy',
							value: { $type: 'app.bsky.feed.post', createdAt: '2026-04-01' }
						}
					],
					cursor: '1'
				},
				{
					records: [
						{
							uri: `at://${did}/app.bsky.feed.post/2`,
							cid: 'bafy',
							value: { $type: 'app.bsky.feed.post', createdAt: '2026-04-02' }
						}
					],
					cursor: '2'
				},
				{
					records: [
						{
							uri: `at://${did}/app.bsky.feed.post/3`,
							cid: 'bafy',
							value: { $type: 'app.bsky.feed.post', createdAt: '2026-04-03' }
						}
					],
					cursor: null
				}
			],
			'app.bsky.feed.repost': [{ records: [], cursor: null }]
		});

		const result = await runBackfill(db, client, did);
		expect(result.totalInserted).toBe(3);
	});

	it('extracts createdAt from record.value when present', async () => {
		const db = openDatabase(':memory:');
		runMigrations(db);
		const client = makeMockClient({
			'app.bsky.feed.post': [
				{
					records: [
						{
							uri: `at://${did}/app.bsky.feed.post/1`,
							cid: 'bafy',
							value: {
								$type: 'app.bsky.feed.post',
								text: 'hi',
								createdAt: '2026-04-15T08:30:00.000Z'
							}
						}
					],
					cursor: null
				}
			],
			'app.bsky.feed.repost': [{ records: [], cursor: null }]
		});
		await runBackfill(db, client, did);
		const row = db
			.prepare(`SELECT created_at FROM records`)
			.get() as { created_at: string };
		expect(row.created_at).toBe('2026-04-15T08:30:00.000Z');
	});

	it('falls back to indexed_at as created_at if record.value.createdAt is missing', async () => {
		const db = openDatabase(':memory:');
		runMigrations(db);
		const client = makeMockClient({
			'app.bsky.feed.post': [
				{
					records: [
						{
							uri: `at://${did}/app.bsky.feed.post/1`,
							cid: 'bafy',
							value: { $type: 'app.bsky.feed.post', text: 'hi' } // no createdAt
						}
					],
					cursor: null
				}
			],
			'app.bsky.feed.repost': [{ records: [], cursor: null }]
		});
		await runBackfill(db, client, did);
		const row = db
			.prepare(`SELECT created_at, indexed_at FROM records`)
			.get() as { created_at: string; indexed_at: string };
		expect(row.created_at).toBe(row.indexed_at);
	});

	it('is idempotent — running twice yields the same row count', async () => {
		const db = openDatabase(':memory:');
		runMigrations(db);
		const client = makeMockClient({
			'app.bsky.feed.post': [
				{
					records: [
						{
							uri: `at://${did}/app.bsky.feed.post/1`,
							cid: 'bafy',
							value: { $type: 'app.bsky.feed.post', createdAt: '2026-04-01' }
						}
					],
					cursor: null
				}
			],
			'app.bsky.feed.repost': [{ records: [], cursor: null }]
		});
		await runBackfill(db, client, did);
		await runBackfill(db, client, did);
		const count = db.prepare(`SELECT COUNT(*) as n FROM records`).get() as { n: number };
		expect(count.n).toBe(1);
	});

	it('writes to records.kind = "owned"', async () => {
		const db = openDatabase(':memory:');
		runMigrations(db);
		const client = makeMockClient({
			'app.bsky.feed.post': [
				{
					records: [
						{
							uri: `at://${did}/app.bsky.feed.post/1`,
							cid: 'bafy',
							value: { createdAt: '2026-04-01' }
						}
					],
					cursor: null
				}
			],
			'app.bsky.feed.repost': [{ records: [], cursor: null }]
		});
		await runBackfill(db, client, did);
		const row = db.prepare(`SELECT kind FROM records`).get() as { kind: string };
		expect(row.kind).toBe('owned');
	});
});
