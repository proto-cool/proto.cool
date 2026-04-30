// Hydrate item.subjectHandle from the profiles cache. For DIDs that aren't
// cached yet we fire-and-forget the resolver — the next render of the same
// DID will pick up the cached handle. Mutates items in place.

import type { DB } from './db';
import type { FeedItem } from './feed';
import { getCachedProfile, resolveProfile } from './profiles';
import { createAtpClient } from './atp-client';
import { getBskyAppview } from './config';

export function hydrateSubjectHandles(db: DB, items: FeedItem[]): void {
	const dids = new Set<string>();
	for (const item of items) {
		if (item.subject) {
			const m = item.subject.uri.match(/^at:\/\/([^\/]+)\//);
			if (m) dids.add(m[1]);
		}
	}
	if (dids.size === 0) return;

	const client = createAtpClient(getBskyAppview());
	for (const did of dids) {
		const cached = getCachedProfile(db, did);
		if (cached?.handle) {
			for (const item of items) {
				if (item.subject?.uri.startsWith(`at://${did}/`)) {
					item.subjectHandle = cached.handle;
				}
			}
		} else {
			void resolveProfile(db, client, did);
		}
	}
}
