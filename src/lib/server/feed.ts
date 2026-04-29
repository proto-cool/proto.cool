import { collectionsForSource, type Source } from './config';
import type { Cursor } from './cursor';

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
	// A source whose NSIDs aren't wired up yet (pckt/standard/grain in v1) is
	// silently dropped from the IN clause; if that's the only source, the
	// query reduces to `1 = 0` (zero rows).
	sources?: Source[];
	from?: string; // ISO 8601 — inclusive lower bound (>=)
	to?: string;   // ISO 8601 — exclusive upper bound (<)
	cursor?: Cursor;
	limit?: number;
	order?: 'desc' | 'asc';
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
