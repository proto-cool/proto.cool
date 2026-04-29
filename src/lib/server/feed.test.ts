import { describe, it, expect } from 'vitest';
import { buildFeedQuery, type FeedFilter } from './feed';

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
});
