// JSON endpoint that mirrors the home page's feed query. Used by the
// client-side load-more flow. Same query params as the page loader so a
// load-more request can pass through whatever filter/sort the user has
// active in the URL.

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/bootstrap';
import { getFeedPage } from '$lib/server/feed';
import { getFeatured } from '$lib/server/featured';
import { parseFeedQuery, feedQueryToInput } from '$lib/server/feed-params';
import { hydrateSubjectHandles } from '$lib/server/hydrate-handles';

export const GET: RequestHandler = async ({ url }) => {
	const db = getDb();
	const q = parseFeedQuery(url.searchParams);

	// Featured is pinned across every filter and SSR page 1 excludes its
	// URI from the stream — so we MUST exclude it here for every page too,
	// otherwise page 2's unfiltered offset overlaps page 1's filtered
	// offset by one (the featured row reappears at the page boundary).
	const featured = getFeatured(db);
	const exclude = featured ? [featured.uri] : [];

	const stream = getFeedPage(db, feedQueryToInput(q, { exclude }));
	hydrateSubjectHandles(db, stream.items);

	return json({
		items: stream.items,
		page: stream.page,
		totalPages: stream.totalPages,
		total: stream.total
	});
};
