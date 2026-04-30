// Auto-derived snapshot for the home sidebar's `/// pulse` block. Counts
// and latest-timestamps of owned records, split into "posts" (bsky-side
// collections) vs "blogs" (standard.site documents). Cheap — two scalar
// queries against the records table. Called once per home-page load.

import { collectionsForSource } from './config';
import type { DB } from './db';

export type PulseStats = {
	lastPost: string | null; // ISO 8601 of newest non-blog owned record
	lastBlog: string | null; // ISO 8601 of newest blog owned record
	posts: number;
	blogs: number;
};

export function getPulseStats(db: DB): PulseStats {
	const blogCollections = collectionsForSource('standard');
	if (blogCollections.length === 0) {
		// Should never happen with the current config — guard anyway so the
		// IN clause stays valid.
		return { lastPost: null, lastBlog: null, posts: 0, blogs: 0 };
	}
	const blogPlaceholders = blogCollections.map(() => '?').join(', ');

	const postRow = db
		.prepare(
			`SELECT MAX(created_at) AS ts, COUNT(*) AS n FROM records
			 WHERE kind = 'owned' AND status = 'ok'
			   AND collection NOT IN (${blogPlaceholders})`
		)
		.get(...blogCollections) as { ts: string | null; n: number };

	const blogRow = db
		.prepare(
			`SELECT MAX(created_at) AS ts, COUNT(*) AS n FROM records
			 WHERE kind = 'owned' AND status = 'ok'
			   AND collection IN (${blogPlaceholders})`
		)
		.get(...blogCollections) as { ts: string | null; n: number };

	return {
		lastPost: postRow.ts,
		lastBlog: blogRow.ts,
		posts: postRow.n,
		blogs: blogRow.n
	};
}
