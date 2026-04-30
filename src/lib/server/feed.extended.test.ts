import { describe, it, expect } from 'vitest';
import { openDatabase, runMigrations, type DB } from './db';
import { getFeed, getFeedPage } from './feed';

function makeDb(): DB {
	const db = openDatabase(':memory:');
	runMigrations(db);
	return db;
}

function insertStandard(
	db: DB,
	opts: { uri: string; tags?: string[]; coverImage?: unknown; createdAt?: string }
) {
	const value = JSON.stringify({
		title: 't',
		publishedAt: opts.createdAt ?? '2026-04-29T00:00:00Z',
		tags: opts.tags,
		coverImage: opts.coverImage
	});
	db.prepare(
		`INSERT INTO records (uri, did, collection, rkey, cid, kind, status, value, created_at, indexed_at)
		 VALUES (?, 'did:x', 'site.standard.document', 'k', 'c', 'owned', 'ok', ?, ?, ?)`
	).run(opts.uri, value, opts.createdAt ?? '2026-04-29T00:00:00Z', '2026-04-29T00:00:00Z');
}

function insertPost(db: DB, uri: string, createdAt = '2026-04-29T00:00:00Z') {
	db.prepare(
		`INSERT INTO records (uri, did, collection, rkey, cid, kind, status, value, created_at, indexed_at)
		 VALUES (?, 'did:x', 'app.bsky.feed.post', 'k', 'c', 'owned', 'ok', '{"text":"t"}', ?, ?)`
	).run(uri, createdAt, createdAt);
}

describe('extended filters', () => {
	it('tag filter matches records with the value in tags array', () => {
		const db = makeDb();
		insertStandard(db, { uri: 'at://x/site.standard.document/a', tags: ['Pinned', 'foo'] });
		insertStandard(db, { uri: 'at://x/site.standard.document/b', tags: ['foo'] });
		const r = getFeed(db, { tag: 'Pinned' });
		expect(r.items.map((i) => i.uri)).toEqual(['at://x/site.standard.document/a']);
	});

	it('requireCover filter excludes records with null coverImage', () => {
		const db = makeDb();
		insertStandard(db, { uri: 'at://x/site.standard.document/a', coverImage: { ref: { $link: 'cid' } } });
		insertStandard(db, { uri: 'at://x/site.standard.document/b' });
		const r = getFeed(db, { requireCover: true });
		expect(r.items.map((i) => i.uri)).toEqual(['at://x/site.standard.document/a']);
	});

	it('exclude removes specified URIs', () => {
		const db = makeDb();
		insertPost(db, 'at://x/p/a');
		insertPost(db, 'at://x/p/b', '2026-04-29T01:00:00Z');
		const r = getFeed(db, { exclude: ['at://x/p/a'] });
		expect(r.items.map((i) => i.uri)).toEqual(['at://x/p/b']);
	});

	it('empty exclude is a no-op', () => {
		const db = makeDb();
		insertPost(db, 'at://x/p/a');
		const r = getFeed(db, { exclude: [] });
		expect(r.items.length).toBe(1);
	});
});

describe('pagination', () => {
	function insertN(db: DB, n: number) {
		for (let i = 0; i < n; i++) {
			const created = new Date(Date.UTC(2026, 0, 1 + i)).toISOString();
			db.prepare(
				`INSERT INTO records (uri, did, collection, rkey, cid, kind, status, value, created_at, indexed_at)
				 VALUES (?, 'did:x', 'app.bsky.feed.post', 'k', 'c', 'owned', 'ok', '{"text":"t"}', ?, ?)`
			).run(`at://x/p/${i}`, created, created);
		}
	}

	it('page=1 returns first page in desc order', () => {
		const db = makeDb();
		insertN(db, 25);
		const r = getFeedPage(db, { page: 1, limit: 10 });
		expect(r.items.length).toBe(10);
		expect(r.total).toBe(25);
		expect(r.totalPages).toBe(3);
		expect(r.page).toBe(1);
		expect(r.items[0].uri).toBe('at://x/p/24');
	});

	it('page=3 returns last (partial) page', () => {
		const db = makeDb();
		insertN(db, 25);
		const r = getFeedPage(db, { page: 3, limit: 10 });
		expect(r.items.length).toBe(5);
		expect(r.total).toBe(25);
		expect(r.totalPages).toBe(3);
	});

	it('page beyond range returns empty items but keeps total', () => {
		const db = makeDb();
		insertN(db, 5);
		const r = getFeedPage(db, { page: 99, limit: 10 });
		expect(r.items).toEqual([]);
		expect(r.total).toBe(5);
		expect(r.totalPages).toBe(1);
	});

	it('total reflects filters', () => {
		const db = makeDb();
		insertN(db, 10);
		const r = getFeedPage(db, { page: 1, limit: 5, exclude: ['at://x/p/9', 'at://x/p/8'] });
		expect(r.total).toBe(8);
	});
});
