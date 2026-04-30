import type { PageServerLoad } from './$types';
import { getDb } from '$lib/server/bootstrap';
import { getFeedPage } from '$lib/server/feed';
import { getFeatured } from '$lib/server/featured';
import { parseFeedQuery, feedQueryToInput } from '$lib/server/feed-params';
import { hydrateSubjectHandles } from '$lib/server/hydrate-handles';
import { getOwnerDidFromState, getPdsHost } from '$lib/server/config';

export const load: PageServerLoad = async ({ url }) => {
	const db = getDb();
	const q = parseFeedQuery(url.searchParams);

	// Featured is pinned content — stays visible across every filter so
	// changing source/sort doesn't yank an item out from the top of the
	// page. Always exclude its URI from the stream so the row never
	// appears twice and offsets stay aligned across pages.
	const featuredForExclude = getFeatured(db);
	const featured = q.page === 1 ? featuredForExclude : null;

	const stream = getFeedPage(
		db,
		feedQueryToInput(q, {
			exclude: featuredForExclude ? [featuredForExclude.uri] : []
		})
	);
	hydrateSubjectHandles(db, stream.items);

	const ownerDid = getOwnerDidFromState(db) ?? '';
	const blobCtx = { ownerDid, pdsHost: getPdsHost() };

	return { featured, stream, blobCtx, query: q };
};
