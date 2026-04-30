import { describe, it, expect, beforeEach } from 'vitest';
import { openDatabase, runMigrations, type DB } from './db';
import { getPulseStats } from './pulse';

function makeDb(): DB {
	const db = openDatabase(':memory:');
	runMigrations(db);
	return db;
}

function insertRecord(
	db: DB,
	opts: {
		uri: string;
		collection: string;
		createdAt: string;
		kind?: 'owned' | 'external';
		status?: 'ok' | 'pending' | 'error';
	}
) {
	db.prepare(
		`INSERT INTO records (uri, did, collection, rkey, cid, kind, status, value, created_at, indexed_at)
		 VALUES (?, 'did:x', ?, 'k', 'c', ?, ?, '{}', ?, ?)`
	).run(
		opts.uri,
		opts.collection,
		opts.kind ?? 'owned',
		opts.status ?? 'ok',
		opts.createdAt,
		opts.createdAt
	);
}

describe('getPulseStats', () => {
	let db: DB;
	beforeEach(() => {
		db = makeDb();
	});

	it('returns zeros and nulls on an empty db', () => {
		expect(getPulseStats(db)).toEqual({
			lastPost: null,
			lastBlog: null,
			posts: 0,
			blogs: 0
		});
	});

	it('counts owned posts (bsky collections), excludes blogs from the count', () => {
		insertRecord(db, {
			uri: 'at://x/app.bsky.feed.post/a',
			collection: 'app.bsky.feed.post',
			createdAt: '2026-04-30T10:00:00Z'
		});
		insertRecord(db, {
			uri: 'at://x/app.bsky.feed.repost/b',
			collection: 'app.bsky.feed.repost',
			createdAt: '2026-04-29T10:00:00Z'
		});
		insertRecord(db, {
			uri: 'at://x/site.standard.document/c',
			collection: 'site.standard.document',
			createdAt: '2026-04-28T10:00:00Z'
		});

		const stats = getPulseStats(db);
		expect(stats.posts).toBe(2);
		expect(stats.blogs).toBe(1);
	});

	it('reports the newest non-blog timestamp as lastPost', () => {
		insertRecord(db, {
			uri: 'at://x/app.bsky.feed.post/old',
			collection: 'app.bsky.feed.post',
			createdAt: '2026-01-01T00:00:00Z'
		});
		insertRecord(db, {
			uri: 'at://x/app.bsky.feed.post/new',
			collection: 'app.bsky.feed.post',
			createdAt: '2026-04-30T12:00:00Z'
		});
		insertRecord(db, {
			uri: 'at://x/site.standard.document/blog',
			collection: 'site.standard.document',
			createdAt: '2026-04-30T18:00:00Z' // newer but a blog — must not be lastPost
		});

		expect(getPulseStats(db).lastPost).toBe('2026-04-30T12:00:00Z');
	});

	it('reports the newest blog timestamp as lastBlog', () => {
		insertRecord(db, {
			uri: 'at://x/site.standard.document/old',
			collection: 'site.standard.document',
			createdAt: '2026-01-01T00:00:00Z'
		});
		insertRecord(db, {
			uri: 'at://x/site.standard.document/new',
			collection: 'site.standard.document',
			createdAt: '2026-04-30T18:00:00Z'
		});

		expect(getPulseStats(db).lastBlog).toBe('2026-04-30T18:00:00Z');
	});

	it('ignores non-owned records (external subjects of reposts/quotes)', () => {
		insertRecord(db, {
			uri: 'at://other/app.bsky.feed.post/x',
			collection: 'app.bsky.feed.post',
			createdAt: '2026-04-30T20:00:00Z',
			kind: 'external'
		});

		const stats = getPulseStats(db);
		expect(stats.posts).toBe(0);
		expect(stats.lastPost).toBeNull();
	});

	it('ignores non-ok status rows', () => {
		insertRecord(db, {
			uri: 'at://x/app.bsky.feed.post/pending',
			collection: 'app.bsky.feed.post',
			createdAt: '2026-04-30T20:00:00Z',
			status: 'pending'
		});

		expect(getPulseStats(db).posts).toBe(0);
	});
});
