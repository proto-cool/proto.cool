// Shared URL → FeedPageInput parsing for the home page loader and the
// /api/feed JSON endpoint. The two surfaces accept the same query shape
// (?source=&sort=&page=) so deep-links and load-more requests stay
// consistent. Bad values fall back to defaults instead of 4xx-ing —
// the toolbar should always be able to recover from a stale URL.

import { z } from 'zod';
import type { Source } from './config';
import type { FeedPageInput } from './feed';

const SourceFilter = z.enum(['all', 'bsky', 'blog']).catch('all');
const SortOrder = z.enum(['newest', 'oldest', 'popular']).catch('newest');
const PageNum = z.coerce.number().int().positive().catch(1);

const QuerySchema = z.object({
	source: SourceFilter,
	sort: SortOrder,
	page: PageNum
});

export type FeedQuery = z.infer<typeof QuerySchema>;

export function parseFeedQuery(searchParams: URLSearchParams): FeedQuery {
	return QuerySchema.parse({
		source: searchParams.get('source') ?? undefined,
		sort: searchParams.get('sort') ?? undefined,
		page: searchParams.get('page') ?? undefined
	});
}

export function feedQueryToInput(
	q: FeedQuery,
	opts: { exclude?: readonly string[] } = {}
): FeedPageInput {
	const sources: Source[] | undefined =
		q.source === 'all' ? undefined : q.source === 'bsky' ? ['bsky'] : ['standard'];
	const order =
		q.sort === 'popular' ? 'popular' : q.sort === 'oldest' ? 'asc' : 'desc';
	return {
		page: q.page,
		sources,
		order,
		exclude: opts.exclude
	};
}
