import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { z } from 'zod';
import { getDb } from '$lib/server/bootstrap';
import { getFeedPage } from '$lib/server/feed';
import { getFeatured } from '$lib/server/featured';
import { getCachedProfile, resolveProfile } from '$lib/server/profiles';
import { createAtpClient } from '$lib/server/atp-client';
import { getBskyAppview, getOwnerDid, getPdsHost } from '$lib/server/config';

const QuerySchema = z.object({
	page: z.coerce.number().int().positive().optional()
});

const PAGE_SIZE = 20;

export const load: PageServerLoad = async ({ url }) => {
	const db = getDb();

	const parsed = QuerySchema.safeParse({
		page: url.searchParams.get('page') ?? undefined
	});
	if (!parsed.success) throw error(400, parsed.error.message);
	const page = parsed.data.page ?? 1;

	const featured = getFeatured(db);
	const stream = getFeedPage(db, {
		page,
		limit: PAGE_SIZE,
		exclude: featured ? [featured.uri] : []
	});

	// Hydrate handles for any subject in the stream — both reposts (subject is
	// the original post) and quote posts (subject is the quoted record). For
	// uncached DIDs, fire-and-forget the resolver so the next render has them.
	const client = createAtpClient(getBskyAppview());
	const subjectDids = new Set<string>();
	for (const item of stream.items) {
		if (item.subject) {
			const m = item.subject.uri.match(/^at:\/\/([^\/]+)\//);
			if (m) subjectDids.add(m[1]);
		}
	}
	for (const did of subjectDids) {
		const cached = getCachedProfile(db, did);
		if (cached?.handle) {
			for (const item of stream.items) {
				if (item.subject && item.subject.uri.startsWith(`at://${did}/`)) {
					item.subjectHandle = cached.handle;
				}
			}
		} else {
			void resolveProfile(db, client, did);
		}
	}

	const ownerDid = getOwnerDid() ?? '';
	const blobCtx = { ownerDid, pdsHost: getPdsHost() };

	return { featured, stream, blobCtx };
};
