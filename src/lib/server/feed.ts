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
};

export type FeedFilter = {
	// undefined or [] both mean "no source filter" — return all sources.
	// A source whose NSIDs aren't wired up yet (standard/grain when collections aren't wired up) is
	// silently dropped from the IN clause; if that's the only source, the
	// query reduces to `1 = 0` (zero rows).
	sources?: Source[];
	from?: string; // ISO 8601 — inclusive lower bound (>=)
	to?: string;   // ISO 8601 — exclusive upper bound (<)
	cursor?: Cursor;
	limit?: number;
	order?: 'desc' | 'asc';
	// Default false — replies (app.bsky.feed.post records with a non-null
	// `reply` field) are excluded from the feed, matching bsky.app's default
	// "Posts" tab. Set true for a "Posts & Replies"-style view.
	includeReplies?: boolean;
};

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export type BuiltQuery = {
	sql: string;
	params: ReadonlyArray<string | number>;
};

export function buildFeedQuery(filter: FeedFilter): BuiltQuery {
	const order: 'asc' | 'desc' = filter.order === 'asc' ? 'asc' : 'desc';
	const dirSql = order === 'asc' ? 'ASC' : 'DESC';
	const cmpOp = order === 'asc' ? '>' : '<';

	const limit =
		typeof filter.limit === 'number' && filter.limit > 0
			? Math.min(filter.limit, MAX_LIMIT)
			: DEFAULT_LIMIT;

	const wheres: string[] = [`r.status = 'ok'`];
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
		wheres.push(`(r.created_at, r.uri) ${cmpOp} (?, ?)`);
		params.push(filter.cursor.ts, filter.cursor.uri);
	}

	if (!filter.includeReplies) {
		// Reply posts have a non-null `reply` field on the record value.
		// Reposts (app.bsky.feed.repost) don't carry that field, so the
		// collection guard keeps them in the result regardless.
		wheres.push(
			`(r.collection != 'app.bsky.feed.post' OR json_extract(r.value, '$.reply') IS NULL)`
		);
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
		ORDER BY r.created_at ${dirSql}, r.uri ${dirSql}
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
		nextCursor = encodeCursor({ ts: last.createdAt, uri: last.uri });
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
