import { describe, it, expect, beforeEach } from 'vitest';
import { openDatabase, runMigrations, type DB } from './db';
import { getFeatured, PINNED_TAG } from './featured';

function makeDb(): DB {
	const db = openDatabase(':memory:');
	runMigrations(db);
	return db;
}

function insertDoc(db: DB, opts: {
	uri: string;
	tags?: string[];
	cover?: boolean;
	createdAt?: string;
}) {
	const value = JSON.stringify({
		title: 'doc',
		publishedAt: opts.createdAt ?? '2026-04-29T00:00:00Z',
		tags: opts.tags,
		coverImage: opts.cover ? { ref: { $link: 'cid' } } : undefined
	});
	db.prepare(
		`INSERT INTO records (uri, did, collection, rkey, cid, kind, status, value, created_at, indexed_at)
		 VALUES (?, 'did:x', 'site.standard.document', 'k', 'c', 'owned', 'ok', ?, ?, ?)`
	).run(opts.uri, value, opts.createdAt ?? '2026-04-29T00:00:00Z', '2026-04-29T00:00:00Z');
}

describe('getFeatured', () => {
	let db: DB;
	beforeEach(() => { db = makeDb(); });

	it('exposes "Pinned" as the canonical tag', () => {
		expect(PINNED_TAG).toBe('Pinned');
	});

	it('returns null when no docs exist', () => {
		expect(getFeatured(db)).toBeNull();
	});

	it('returns null when no docs have a coverImage', () => {
		insertDoc(db, { uri: 'at://x/site.standard.document/a' });
		expect(getFeatured(db)).toBeNull();
	});

	it('prefers latest Pinned doc with cover', () => {
		insertDoc(db, { uri: 'at://x/site.standard.document/old-pin', tags: ['Pinned'], cover: true, createdAt: '2026-01-01T00:00:00Z' });
		insertDoc(db, { uri: 'at://x/site.standard.document/new-pin', tags: ['Pinned'], cover: true, createdAt: '2026-04-29T00:00:00Z' });
		insertDoc(db, { uri: 'at://x/site.standard.document/recent', cover: true, createdAt: '2026-04-30T00:00:00Z' });
		expect(getFeatured(db)?.uri).toBe('at://x/site.standard.document/new-pin');
	});

	it('falls back to latest doc with cover when nothing is Pinned', () => {
		insertDoc(db, { uri: 'at://x/site.standard.document/a', cover: true, createdAt: '2026-01-01T00:00:00Z' });
		insertDoc(db, { uri: 'at://x/site.standard.document/b', cover: true, createdAt: '2026-04-29T00:00:00Z' });
		expect(getFeatured(db)?.uri).toBe('at://x/site.standard.document/b');
	});

	it('ignores non-standard collections', () => {
		db.prepare(
			`INSERT INTO records (uri, did, collection, rkey, cid, kind, status, value, created_at, indexed_at)
			 VALUES ('at://x/app.bsky.feed.post/p', 'did:x', 'app.bsky.feed.post', 'k', 'c', 'owned', 'ok',
			         '{"text":"t","coverImage":{"ref":{"$link":"x"}},"tags":["Pinned"]}', ?, ?)`
		).run('2026-04-29T00:00:00Z', '2026-04-29T00:00:00Z');
		expect(getFeatured(db)).toBeNull();
	});
});
