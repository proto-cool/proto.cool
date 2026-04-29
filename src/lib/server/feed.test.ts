import { describe, it, expect } from 'vitest';
import { buildFeedQuery, hydrateRow, type FeedFilter } from './feed';
import { openDatabase, runMigrations, type DB } from './db';
import { getFeed } from './feed';
import { decodeCursor } from './cursor';

describe('buildFeedQuery', () => {
	it('builds a default DESC query with no filters', () => {
		const { sql, params } = buildFeedQuery({});
		expect(sql).toContain("r.status = 'ok'");
		expect(sql).toContain('ORDER BY r.created_at DESC, r.uri DESC');
		expect(sql).toContain('LIMIT ?');
		expect(params).toContain(20);
	});

	it('caps limit at 50', () => {
		const { params } = buildFeedQuery({ limit: 99999 });
		expect(params).toContain(50);
	});

	it('uses the requested limit when within cap', () => {
		const { params } = buildFeedQuery({ limit: 7 });
		expect(params).toContain(7);
	});

	it('rejects non-positive limits by falling back to default', () => {
		const a = buildFeedQuery({ limit: 0 });
		const b = buildFeedQuery({ limit: -5 });
		expect(a.params).toContain(20);
		expect(b.params).toContain(20);
	});

	it('emits ASC order when filter.order = "asc"', () => {
		const { sql } = buildFeedQuery({ order: 'asc' });
		expect(sql).toContain('ORDER BY r.created_at ASC, r.uri ASC');
	});

	it('emits a collection IN (...) clause when sources are provided', () => {
		const { sql, params } = buildFeedQuery({ sources: ['bsky'] });
		expect(sql).toMatch(/r\.collection IN \(\?\s*,\s*\?\)/);
		expect(params).toContain('app.bsky.feed.post');
		expect(params).toContain('app.bsky.feed.repost');
	});

	it('emits no collection clause when sources is empty', () => {
		const { sql } = buildFeedQuery({ sources: [] });
		expect(sql).not.toContain('r.collection IN');
	});

	it('emits 1=0 when the only requested source has no NSIDs wired up', () => {
		const { sql } = buildFeedQuery({ sources: ['pckt'] });
		expect(sql).toContain('1 = 0');
		expect(sql).not.toContain('r.collection IN');
	});

	it('drops unwired sources silently when at least one source has NSIDs', () => {
		const { sql, params } = buildFeedQuery({ sources: ['bsky', 'pckt'] });
		// Only bsky's two NSIDs make the IN clause; pckt vanishes.
		expect(sql).toMatch(/r\.collection IN \(\?\s*,\s*\?\)/);
		expect(sql).not.toContain('1 = 0');
		expect(params).toContain('app.bsky.feed.post');
		expect(params).toContain('app.bsky.feed.repost');
	});

	it('emits date-range BETWEEN when from and to are provided', () => {
		const filter: FeedFilter = {
			from: '2026-01-01T00:00:00.000Z',
			to: '2026-04-01T00:00:00.000Z'
		};
		const { sql, params } = buildFeedQuery(filter);
		expect(sql).toMatch(/r\.created_at\s*>=\s*\?/);
		expect(sql).toMatch(/r\.created_at\s*<\s*\?/);
		expect(params).toContain(filter.from);
		expect(params).toContain(filter.to);
	});

	it('emits a keyset predicate matching DESC order direction', () => {
		const { sql, params } = buildFeedQuery({
			cursor: { ts: '2026-03-01T00:00:00.000Z', uri: 'at://x/y/z' }
		});
		// DESC: walk backwards in time → next page is created_at < cursor.ts (or =/uri<)
		expect(sql).toMatch(/\(r\.created_at, r\.uri\)\s*<\s*\(\?, \?\)/);
		expect(params).toContain('2026-03-01T00:00:00.000Z');
		expect(params).toContain('at://x/y/z');
	});

	it('emits a keyset predicate matching ASC order direction', () => {
		const { sql } = buildFeedQuery({
			order: 'asc',
			cursor: { ts: '2026-03-01T00:00:00.000Z', uri: 'at://x/y/z' }
		});
		expect(sql).toMatch(/\(r\.created_at, r\.uri\)\s*>\s*\(\?, \?\)/);
	});

	it('selects engagement and subject columns via LEFT JOINs', () => {
		const { sql } = buildFeedQuery({});
		expect(sql).toMatch(/LEFT JOIN engagement e ON e\.uri = r\.uri/);
		expect(sql).toMatch(/LEFT JOIN records s ON s\.uri = r\.subject_uri AND s\.status = 'ok'/);
	});

	it('emits a reply-exclusion predicate by default', () => {
		const { sql } = buildFeedQuery({});
		expect(sql).toMatch(/json_extract\(r\.value, '\$\.reply'\) IS NULL/);
		expect(sql).toContain(`r.collection != 'app.bsky.feed.post'`);
	});

	it('omits the reply predicate when includeReplies is true', () => {
		const { sql } = buildFeedQuery({ includeReplies: true });
		expect(sql).not.toContain('json_extract');
	});
});

describe('hydrateRow', () => {
	it('hydrates an owned bsky post with engagement and no subject', () => {
		const row = {
			uri: 'at://did:plc:abc/app.bsky.feed.post/1',
			collection: 'app.bsky.feed.post',
			kind: 'owned' as const,
			subject_uri: null,
			created_at: '2026-04-01T12:00:00.000Z',
			value: '{"$type":"app.bsky.feed.post","text":"hi","createdAt":"2026-04-01T12:00:00.000Z"}',
			like_count: 5,
			repost_count: 1,
			reply_count: 2,
			reactor_sample: '[{"did":"did:plc:x","handle":"alice.bsky.social","avatar":null}]',
			engagement_source: 'bsky',
			subject_uri_resolved: null,
			subject_collection: null,
			subject_kind: null,
			subject_created_at: null,
			subject_value: null,
			subject_like_count: null,
			subject_repost_count: null,
			subject_reply_count: null,
			subject_reactor_sample: null,
			subject_engagement_source: null
		};

		const item = hydrateRow(row);

		expect(item.uri).toBe(row.uri);
		expect(item.collection).toBe('app.bsky.feed.post');
		expect(item.kind).toBe('owned');
		expect(item.subjectUri).toBe(null);
		expect(item.createdAt).toBe('2026-04-01T12:00:00.000Z');
		expect((item.value as { text: string }).text).toBe('hi');
		expect(item.engagement?.likeCount).toBe(5);
		expect(item.engagement?.repostCount).toBe(1);
		expect(item.engagement?.replyCount).toBe(2);
		expect(item.engagement?.reactorSample).toEqual([
			{ did: 'did:plc:x', handle: 'alice.bsky.social', avatar: null }
		]);
		expect(item.subject).toBe(null);
	});

	it('hydrates a record without engagement (engagement_source NULL)', () => {
		const row = {
			uri: 'at://did:plc:abc/blog.pckt.entry/1',
			collection: 'blog.pckt.entry',
			kind: 'owned' as const,
			subject_uri: null,
			created_at: '2026-04-01T12:00:00.000Z',
			value: '{"$type":"blog.pckt.entry","title":"hi"}',
			like_count: null,
			repost_count: null,
			reply_count: null,
			reactor_sample: null,
			engagement_source: null,
			subject_uri_resolved: null,
			subject_collection: null,
			subject_kind: null,
			subject_created_at: null,
			subject_value: null,
			subject_like_count: null,
			subject_repost_count: null,
			subject_reply_count: null,
			subject_reactor_sample: null,
			subject_engagement_source: null
		};
		const item = hydrateRow(row);
		expect(item.engagement).toBeUndefined();
	});

	it('hydrates a repost with a resolved subject', () => {
		const row = {
			uri: 'at://did:plc:abc/app.bsky.feed.repost/1',
			collection: 'app.bsky.feed.repost',
			kind: 'owned' as const,
			subject_uri: 'at://did:plc:other/app.bsky.feed.post/abc',
			created_at: '2026-04-02T12:00:00.000Z',
			value: '{"$type":"app.bsky.feed.repost","subject":{"uri":"at://did:plc:other/app.bsky.feed.post/abc","cid":"bafy"}}',
			like_count: null,
			repost_count: null,
			reply_count: null,
			reactor_sample: null,
			engagement_source: null,
			subject_uri_resolved: 'at://did:plc:other/app.bsky.feed.post/abc',
			subject_collection: 'app.bsky.feed.post',
			subject_kind: 'external' as const,
			subject_created_at: '2026-04-01T08:00:00.000Z',
			subject_value: '{"$type":"app.bsky.feed.post","text":"original"}',
			subject_like_count: 12,
			subject_repost_count: 3,
			subject_reply_count: 4,
			subject_reactor_sample: '[]',
			subject_engagement_source: 'bsky'
		};
		const item = hydrateRow(row);
		expect(item.subjectUri).toBe('at://did:plc:other/app.bsky.feed.post/abc');
		expect(item.subject).not.toBeNull();
		expect(item.subject?.uri).toBe('at://did:plc:other/app.bsky.feed.post/abc');
		expect(item.subject?.kind).toBe('external');
		expect((item.subject?.value as { text: string }).text).toBe('original');
		expect(item.subject?.engagement?.likeCount).toBe(12);
	});

	it('hydrates a row whose subject_uri is set but subject row is missing (deleted target)', () => {
		const row = {
			uri: 'at://did:plc:abc/app.bsky.feed.repost/2',
			collection: 'app.bsky.feed.repost',
			kind: 'owned' as const,
			subject_uri: 'at://did:plc:other/app.bsky.feed.post/gone',
			created_at: '2026-04-02T12:00:00.000Z',
			value: '{}',
			like_count: null,
			repost_count: null,
			reply_count: null,
			reactor_sample: null,
			engagement_source: null,
			subject_uri_resolved: null,
			subject_collection: null,
			subject_kind: null,
			subject_created_at: null,
			subject_value: null,
			subject_like_count: null,
			subject_repost_count: null,
			subject_reply_count: null,
			subject_reactor_sample: null,
			subject_engagement_source: null
		};
		const item = hydrateRow(row);
		expect(item.subjectUri).toBe('at://did:plc:other/app.bsky.feed.post/gone');
		expect(item.subject).toBe(null);
	});
});

function seed(db: DB, rows: Array<Partial<{
	uri: string;
	did: string;
	collection: string;
	rkey: string;
	cid: string;
	kind: 'owned' | 'external';
	status: 'pending' | 'ok';
	subject_uri: string | null;
	value: string | null;
	created_at: string;
	indexed_at: string;
}>>) {
	const stmt = db.prepare(
		`INSERT INTO records (uri, did, collection, rkey, cid, kind, status, subject_uri, value, created_at, indexed_at)
		 VALUES (?,?,?,?,?,?,?,?,?,?,?)`
	);
	for (const r of rows) {
		stmt.run(
			r.uri ?? `at://did:plc:abc/app.bsky.feed.post/${Math.random()}`,
			r.did ?? 'did:plc:abc',
			r.collection ?? 'app.bsky.feed.post',
			r.rkey ?? 'r',
			r.cid ?? 'bafy',
			r.kind ?? 'owned',
			r.status ?? 'ok',
			r.subject_uri ?? null,
			r.value ?? '{}',
			r.created_at ?? '2026-04-01T12:00:00.000Z',
			r.indexed_at ?? '2026-04-01T12:00:00.000Z'
		);
	}
}

describe('getFeed', () => {
	function setup(): DB {
		const db = openDatabase(':memory:');
		runMigrations(db);
		return db;
	}

	it('returns empty result against an empty cache', () => {
		const db = setup();
		const result = getFeed(db, {});
		expect(result.items).toEqual([]);
		expect(result.nextCursor).toBe(null);
	});

	it('returns rows in DESC order by default', () => {
		const db = setup();
		seed(db, [
			{ uri: 'at://x/y/a', created_at: '2026-04-01T00:00:00.000Z' },
			{ uri: 'at://x/y/b', created_at: '2026-04-02T00:00:00.000Z' },
			{ uri: 'at://x/y/c', created_at: '2026-04-03T00:00:00.000Z' }
		]);
		const result = getFeed(db, {});
		expect(result.items.map((i) => i.uri)).toEqual(['at://x/y/c', 'at://x/y/b', 'at://x/y/a']);
	});

	it('respects ASC order', () => {
		const db = setup();
		seed(db, [
			{ uri: 'at://x/y/a', created_at: '2026-04-01T00:00:00.000Z' },
			{ uri: 'at://x/y/b', created_at: '2026-04-02T00:00:00.000Z' }
		]);
		const result = getFeed(db, { order: 'asc' });
		expect(result.items.map((i) => i.uri)).toEqual(['at://x/y/a', 'at://x/y/b']);
	});

	it('filters by source', () => {
		const db = setup();
		seed(db, [
			{ uri: 'at://x/y/a', collection: 'app.bsky.feed.post' },
			{ uri: 'at://x/y/b', collection: 'app.bsky.feed.repost' },
			{ uri: 'at://x/y/c', collection: 'blog.pckt.entry' }
		]);
		const result = getFeed(db, { sources: ['bsky'] });
		const collections = result.items.map((i) => i.collection).sort();
		expect(collections).toEqual(['app.bsky.feed.post', 'app.bsky.feed.repost']);
	});

	it('excludes status="pending" rows', () => {
		const db = setup();
		seed(db, [
			{ uri: 'at://x/y/a', status: 'ok' },
			{ uri: 'at://x/y/b', status: 'pending' }
		]);
		const result = getFeed(db, {});
		expect(result.items.map((i) => i.uri)).toEqual(['at://x/y/a']);
	});

	it('paginates stably across cursor walks (DESC)', () => {
		const db = setup();
		const all = Array.from({ length: 7 }, (_, i) => ({
			uri: `at://x/y/${i}`,
			created_at: `2026-04-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`
		}));
		seed(db, all);

		const page1 = getFeed(db, { limit: 3 });
		expect(page1.items.length).toBe(3);
		expect(page1.nextCursor).not.toBe(null);

		const page2 = getFeed(db, {
			limit: 3,
			cursor: decodeCursor(page1.nextCursor!)
		});
		expect(page2.items.length).toBe(3);

		const page3 = getFeed(db, {
			limit: 3,
			cursor: decodeCursor(page2.nextCursor!)
		});
		expect(page3.items.length).toBe(1);
		expect(page3.nextCursor).toBe(null);

		// Combined uris must equal all uris (no dupes, no skips), reverse-chronological.
		const combined = [...page1.items, ...page2.items, ...page3.items].map((i) => i.uri);
		expect(combined).toEqual(all.map((r) => r.uri).reverse());
	});

	it('cursor walk remains stable when a newer row is inserted mid-walk', () => {
		const db = setup();
		const initial = Array.from({ length: 5 }, (_, i) => ({
			uri: `at://x/y/${i}`,
			created_at: `2026-04-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`
		}));
		seed(db, initial);

		const page1 = getFeed(db, { limit: 2 });
		// Insert a brand-new row that would slip into the front had we used offset.
		seed(db, [
			{
				uri: 'at://x/y/inserted',
				created_at: '2026-04-09T00:00:00.000Z'
			}
		]);
		const page2 = getFeed(db, { limit: 2, cursor: decodeCursor(page1.nextCursor!) });

		// The keyset cursor must skip past the inserted row's anchor — items in
		// page2 are strictly older than page1's last item.
		const lastTsPage1 = page1.items.at(-1)!.createdAt;
		for (const it of page2.items) {
			expect(it.createdAt < lastTsPage1).toBe(true);
		}
	});

	it('emits null nextCursor when fewer than `limit` rows remain', () => {
		const db = setup();
		seed(db, [{ uri: 'at://x/y/only' }]);
		const result = getFeed(db, { limit: 5 });
		expect(result.items.length).toBe(1);
		expect(result.nextCursor).toBe(null);
	});

	it('excludes reply posts by default (mirrors bsky "Posts" tab)', () => {
		const db = setup();
		seed(db, [
			{
				uri: 'at://x/app.bsky.feed.post/original',
				collection: 'app.bsky.feed.post',
				value: '{"text":"hello world","createdAt":"2026-04-01T00:00:00.000Z"}',
				created_at: '2026-04-01T00:00:00.000Z'
			},
			{
				uri: 'at://x/app.bsky.feed.post/reply',
				collection: 'app.bsky.feed.post',
				value:
					'{"text":"replying","reply":{"root":{"uri":"at://other","cid":"c"},"parent":{"uri":"at://other","cid":"c"}}}',
				created_at: '2026-04-02T00:00:00.000Z'
			},
			{
				uri: 'at://x/app.bsky.feed.repost/r1',
				collection: 'app.bsky.feed.repost',
				value: '{"subject":{"uri":"at://other/app.bsky.feed.post/x","cid":"c"}}',
				created_at: '2026-04-03T00:00:00.000Z'
			}
		]);
		const result = getFeed(db, {});
		const uris = result.items.map((i) => i.uri).sort();
		expect(uris).toEqual([
			'at://x/app.bsky.feed.post/original',
			'at://x/app.bsky.feed.repost/r1'
		]);
	});

	it('includes reply posts when includeReplies is true', () => {
		const db = setup();
		seed(db, [
			{
				uri: 'at://x/app.bsky.feed.post/original',
				collection: 'app.bsky.feed.post',
				value: '{"text":"hello"}',
				created_at: '2026-04-01T00:00:00.000Z'
			},
			{
				uri: 'at://x/app.bsky.feed.post/reply',
				collection: 'app.bsky.feed.post',
				value:
					'{"text":"replying","reply":{"root":{"uri":"at://other","cid":"c"},"parent":{"uri":"at://other","cid":"c"}}}',
				created_at: '2026-04-02T00:00:00.000Z'
			}
		]);
		const result = getFeed(db, { includeReplies: true });
		expect(result.items.map((i) => i.uri).sort()).toEqual([
			'at://x/app.bsky.feed.post/original',
			'at://x/app.bsky.feed.post/reply'
		]);
	});

	it('inlines a resolved subject for a repost', () => {
		const db = setup();
		seed(db, [
			{
				uri: 'at://did:plc:other/app.bsky.feed.post/orig',
				did: 'did:plc:other',
				collection: 'app.bsky.feed.post',
				kind: 'external',
				value: '{"text":"original"}',
				created_at: '2026-04-01T00:00:00.000Z'
			},
			{
				uri: 'at://did:plc:abc/app.bsky.feed.repost/r1',
				collection: 'app.bsky.feed.repost',
				kind: 'owned',
				subject_uri: 'at://did:plc:other/app.bsky.feed.post/orig',
				value: '{"subject":{"uri":"at://did:plc:other/app.bsky.feed.post/orig","cid":"bafy"}}',
				created_at: '2026-04-02T00:00:00.000Z'
			}
		]);
		const result = getFeed(db, {});
		const repost = result.items.find((i) => i.collection === 'app.bsky.feed.repost')!;
		expect(repost.subject).not.toBeNull();
		expect((repost.subject!.value as { text: string }).text).toBe('original');
	});
});
