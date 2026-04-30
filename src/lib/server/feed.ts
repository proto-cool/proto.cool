import { collectionsForSource, type Source } from './config';
import { encodeCursor, type Cursor } from './cursor';
import type { DB } from './db';

export type EngagementSummary = {
	likeCount: number;
	repostCount: number;
	replyCount: number;
	reactorSample: Array<{ did: string; handle: string; avatar: string | null }>;
};

export type FeedItem = {
	uri: string;
	collection: string;
	kind: 'owned' | 'external';
	subjectUri: string | null;
	createdAt: string;
	value: unknown;
	engagement?: EngagementSummary;
	subject?: FeedItem | null;
	// Hydrated server-side from the profiles cache when a subject is present.
	// May be null if not cached yet (the page loader fires an async resolve and
	// it'll be present on the next render).
	subjectHandle?: string | null;
};

export type FeedFilter = {
	// undefined or [] both mean "no source filter" — return all sources.
	// A source whose NSIDs aren't wired up yet (grain in v1) is silently
	// dropped from the IN clause; if that's the only source, the query
	// reduces to `1 = 0` (zero rows).
	sources?: Source[];
	from?: string; // ISO 8601 — inclusive lower bound (>=)
	to?: string;   // ISO 8601 — exclusive upper bound (<)
	cursor?: Cursor;
	limit?: number;
	// 'desc' / 'asc' sort by created_at. 'popular' sorts by a weighted
	// engagement score (likes + 2×reposts + replies) with created_at as a
	// tiebreaker. Cursor pagination is only valid for time-based orders;
	// 'popular' relies on offset pagination via getFeedPage.
	order?: 'desc' | 'asc' | 'popular';
	// Default false — replies (app.bsky.feed.post records with a non-null
	// `reply` field) are excluded from the feed, matching bsky.app's default
	// "Posts" tab. Set true for a "Posts & Replies"-style view.
	includeReplies?: boolean;
	// Match records where value->>'$.tags' (a JSON array) contains the value.
	tag?: string;
	// Filter to records that have a non-null value->>'$.coverImage'.
	requireCover?: boolean;
	// URIs to omit from the result (for "exclude the featured doc from the
	// stream" use case).
	exclude?: readonly string[];
};

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export type BuiltQuery = {
	sql: string;
	params: ReadonlyArray<string | number>;
};

export function buildFeedQuery(filter: FeedFilter): BuiltQuery {
	const order: 'asc' | 'desc' | 'popular' =
		filter.order === 'asc' ? 'asc' : filter.order === 'popular' ? 'popular' : 'desc';
	const dirSql = order === 'asc' ? 'ASC' : 'DESC';
	const cmpOp = order === 'asc' ? '>' : '<';

	const limit =
		typeof filter.limit === 'number' && filter.limit > 0
			? Math.min(filter.limit, MAX_LIMIT)
			: DEFAULT_LIMIT;

	// kind='owned' restricts the top-level feed to records the operator
	// authored. External records (subject of a repost / quote) live in the
	// same table and are joined in via subject_uri — they should never appear
	// as their own card.
	const wheres: string[] = [`r.status = 'ok'`, `r.kind = 'owned'`];
	const params: Array<string | number> = [];

	if (filter.sources && filter.sources.length > 0) {
		const collections = filter.sources.flatMap((s) => collectionsForSource(s));
		if (collections.length > 0) {
			const placeholders = collections.map(() => '?').join(', ');
			wheres.push(`r.collection IN (${placeholders})`);
			params.push(...collections);
		} else {
			// Source provided but it has no collections wired up yet — return zero rows.
			wheres.push(`1 = 0`);
		}
	}

	if (filter.from) {
		wheres.push(`r.created_at >= ?`);
		params.push(filter.from);
	}
	if (filter.to) {
		wheres.push(`r.created_at < ?`);
		params.push(filter.to);
	}
	if (filter.cursor) {
		if (order === 'popular') {
			// Score is computed inline (no aliased column reference allowed in
			// WHERE). The score expression must match the one used in ORDER BY
			// below — keep them in sync if either changes.
			wheres.push(
				`((COALESCE(e.like_count, 0) + 2 * COALESCE(e.repost_count, 0) + COALESCE(e.reply_count, 0)), r.created_at, r.uri) < (?, ?, ?)`
			);
			params.push(filter.cursor.score ?? 0, filter.cursor.ts, filter.cursor.uri);
		} else {
			wheres.push(`(r.created_at, r.uri) ${cmpOp} (?, ?)`);
			params.push(filter.cursor.ts, filter.cursor.uri);
		}
	}

	if (!filter.includeReplies) {
		// Reply posts have a non-null `reply` field on the record value.
		// Reposts (app.bsky.feed.repost) don't carry that field, so the
		// collection guard keeps them in the result regardless.
		wheres.push(
			`(r.collection != 'app.bsky.feed.post' OR json_extract(r.value, '$.reply') IS NULL)`
		);
	}

	if (filter.tag) {
		wheres.push(
			`EXISTS (SELECT 1 FROM json_each(json_extract(r.value, '$.tags')) WHERE value = ?)`
		);
		params.push(filter.tag);
	}
	if (filter.requireCover) {
		wheres.push(`json_extract(r.value, '$.coverImage') IS NOT NULL`);
	}
	if (filter.exclude && filter.exclude.length > 0) {
		const placeholders = filter.exclude.map(() => '?').join(', ');
		wheres.push(`r.uri NOT IN (${placeholders})`);
		params.push(...filter.exclude);
	}

	params.push(limit);

	const sql = `
		SELECT
			r.uri          AS uri,
			r.collection   AS collection,
			r.kind         AS kind,
			r.subject_uri  AS subject_uri,
			r.created_at   AS created_at,
			r.value        AS value,
			e.like_count        AS like_count,
			e.repost_count      AS repost_count,
			e.reply_count       AS reply_count,
			e.reactor_sample    AS reactor_sample,
			e.source            AS engagement_source,
			s.uri          AS subject_uri_resolved,
			s.collection   AS subject_collection,
			s.kind         AS subject_kind,
			s.created_at   AS subject_created_at,
			s.value        AS subject_value,
			se.like_count       AS subject_like_count,
			se.repost_count     AS subject_repost_count,
			se.reply_count      AS subject_reply_count,
			se.reactor_sample   AS subject_reactor_sample,
			se.source           AS subject_engagement_source
		FROM records r
		LEFT JOIN engagement e ON e.uri = r.uri
		LEFT JOIN records s ON s.uri = r.subject_uri AND s.status = 'ok'
		LEFT JOIN engagement se ON se.uri = s.uri
		WHERE ${wheres.join(' AND ')}
		ORDER BY ${
			order === 'popular'
				? '(COALESCE(e.like_count, 0) + 2 * COALESCE(e.repost_count, 0) + COALESCE(e.reply_count, 0)) DESC, r.created_at DESC, r.uri DESC'
				: `r.created_at ${dirSql}, r.uri ${dirSql}`
		}
		LIMIT ?
	`;

	return { sql, params };
}

type FeedRow = {
	uri: string;
	collection: string;
	kind: 'owned' | 'external';
	subject_uri: string | null;
	created_at: string;
	value: string | null;
	like_count: number | null;
	repost_count: number | null;
	reply_count: number | null;
	reactor_sample: string | null;
	engagement_source: string | null;
	subject_uri_resolved: string | null;
	subject_collection: string | null;
	subject_kind: 'owned' | 'external' | null;
	subject_created_at: string | null;
	subject_value: string | null;
	subject_like_count: number | null;
	subject_repost_count: number | null;
	subject_reply_count: number | null;
	subject_reactor_sample: string | null;
	subject_engagement_source: string | null;
};

function parseEngagement(
	likeCount: number | null,
	repostCount: number | null,
	replyCount: number | null,
	reactorSample: string | null,
	engagementSource: string | null
): EngagementSummary | undefined {
	if (engagementSource === null) return undefined;
	return {
		likeCount: likeCount ?? 0,
		repostCount: repostCount ?? 0,
		replyCount: replyCount ?? 0,
		reactorSample: reactorSample ? JSON.parse(reactorSample) : []
	};
}

function parseValue(raw: string | null): unknown {
	if (raw === null) return null;
	return JSON.parse(raw);
}

export type FeedPage = {
	items: FeedItem[];
	total: number;
	page: number;
	totalPages: number;
};

export type FeedPageInput = Omit<FeedFilter, 'cursor'> & {
	page?: number;
};

export function getFeedPage(db: DB, input: FeedPageInput): FeedPage {
	const limit =
		typeof input.limit === 'number' && input.limit > 0
			? Math.min(input.limit, MAX_LIMIT)
			: DEFAULT_LIMIT;
	const page =
		typeof input.page === 'number' && input.page > 0 ? Math.floor(input.page) : 1;

	const baseFilter: FeedFilter = { ...input, cursor: undefined, limit };
	const built = buildFeedQuery(baseFilter);
	const fromIdx = built.sql.indexOf('FROM records r');
	if (fromIdx < 0) throw new Error('buildFeedQuery sql shape changed');
	const orderIdx = built.sql.indexOf('ORDER BY');
	const wherePart = built.sql.slice(fromIdx, orderIdx >= 0 ? orderIdx : built.sql.length);

	// COUNT runs against the same FROM/JOIN/WHERE but drops ORDER/LIMIT and the
	// trailing limit param.
	const countSql = `SELECT COUNT(*) AS n ${wherePart}`;
	const countParams = built.params.slice(0, built.params.length - 1);
	const total = (db.prepare(countSql).get(...countParams) as { n: number }).n;

	// Paged items query: replace the trailing LIMIT with LIMIT ? OFFSET ?
	const pageSql = built.sql.replace(/LIMIT \?\s*$/, 'LIMIT ? OFFSET ?');
	const offset = (page - 1) * limit;
	const items = (db.prepare(pageSql).all(...countParams, limit, offset) as FeedRow[]).map(
		hydrateRow
	);

	const totalPages = Math.max(1, Math.ceil(total / limit));
	return { items, total, page, totalPages };
}

export function getFeed(
	db: DB,
	filter: FeedFilter
): { items: FeedItem[]; nextCursor: string | null } {
	const { sql, params } = buildFeedQuery(filter);
	const rows = db.prepare(sql).all(...params) as FeedRow[];
	const items = rows.map(hydrateRow);

	const requested =
		typeof filter.limit === 'number' && filter.limit > 0
			? Math.min(filter.limit, MAX_LIMIT)
			: DEFAULT_LIMIT;

	let nextCursor: string | null = null;
	if (items.length === requested && items.length > 0) {
		const last = items.at(-1)!;
		if (filter.order === 'popular') {
			const e = last.engagement;
			const score = e ? e.likeCount + 2 * e.repostCount + e.replyCount : 0;
			nextCursor = encodeCursor({ ts: last.createdAt, uri: last.uri, score });
		} else {
			nextCursor = encodeCursor({ ts: last.createdAt, uri: last.uri });
		}
	}

	return { items, nextCursor };
}

export function hydrateRow(row: FeedRow): FeedItem {
	const item: FeedItem = {
		uri: row.uri,
		collection: row.collection,
		kind: row.kind,
		subjectUri: row.subject_uri,
		createdAt: row.created_at,
		value: parseValue(row.value),
		engagement: parseEngagement(
			row.like_count,
			row.repost_count,
			row.reply_count,
			row.reactor_sample,
			row.engagement_source
		)
	};

	if (row.subject_uri) {
		if (row.subject_uri_resolved) {
			item.subject = {
				uri: row.subject_uri_resolved,
				collection: row.subject_collection!,
				kind: row.subject_kind!,
				subjectUri: null,
				createdAt: row.subject_created_at!,
				value: parseValue(row.subject_value),
				engagement: parseEngagement(
					row.subject_like_count,
					row.subject_repost_count,
					row.subject_reply_count,
					row.subject_reactor_sample,
					row.subject_engagement_source
				),
				subject: null
			};
		} else {
			item.subject = null; // referenced but not (yet) cached / deleted
		}
	} else {
		item.subject = null;
	}

	return item;
}
