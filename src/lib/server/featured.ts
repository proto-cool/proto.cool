// Featured-doc selection. Looks for a doc tagged "Pinned" with a coverImage
// first; falls back to the latest doc with a coverImage; returns null
// otherwise. The Pinned tag value matches pckt's convention.

import { getFeedPage, type FeedItem } from './feed';
import type { DB } from './db';

export const PINNED_TAG = 'Pinned';

export function getFeatured(db: DB): FeedItem | null {
	const pinned = getFeedPage(db, {
		sources: ['standard'],
		tag: PINNED_TAG,
		requireCover: true,
		page: 1,
		limit: 1
	}).items[0];
	if (pinned) return pinned;

	const latest = getFeedPage(db, {
		sources: ['standard'],
		requireCover: true,
		page: 1,
		limit: 1
	}).items[0];
	return latest ?? null;
}
