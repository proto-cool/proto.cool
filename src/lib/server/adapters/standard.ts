// Engagement adapter for site.standard.document. Docs are owned-only (we
// publish them, the firehose populates them) so fetchRecords is a no-op. For
// fetchEngagement, we look up each doc's bskyPostRef and call the bsky
// AppView, returning rows keyed by the *doc* URI so the engagement table
// joins correctly. Docs without a bskyPostRef are filtered out before the
// AppView call (no-op success — never returned as notFound, since the
// scheduler would treat that as a delete signal for owned docs).

import type { DB } from '../db';
import type { AtpClient } from '../atp-client';
import type { Adapter, EngagementRow, RecordRow, AdapterBatchResult } from './types';

const BATCH_SIZE = 25;

function chunk<T>(xs: T[], size: number): T[][] {
	const out: T[][] = [];
	for (let i = 0; i < xs.length; i += size) out.push(xs.slice(i, i + size));
	return out;
}

type DocBskyPair = { docUri: string; bskyUri: string };

function loadBskyPairs(db: DB, docUris: string[]): DocBskyPair[] {
	if (docUris.length === 0) return [];
	const placeholders = docUris.map(() => '?').join(', ');
	const rows = db
		.prepare(
			`SELECT uri, value FROM records
			 WHERE uri IN (${placeholders})
			   AND collection = 'site.standard.document'
			   AND status = 'ok'`
		)
		.all(...docUris) as Array<{ uri: string; value: string }>;
	const pairs: DocBskyPair[] = [];
	for (const row of rows) {
		try {
			const v = JSON.parse(row.value) as { bskyPostRef?: { uri?: string } };
			const bskyUri = v.bskyPostRef?.uri;
			if (typeof bskyUri === 'string' && bskyUri.length > 0) {
				pairs.push({ docUri: row.uri, bskyUri });
			}
		} catch {
			// malformed value — skip silently
		}
	}
	return pairs;
}

export function createStandardAdapter(db: DB, client: AtpClient): Adapter {
	return {
		source: 'standard',

		async fetchEngagement(uris): Promise<AdapterBatchResult<EngagementRow>> {
			if (uris.length === 0) return { found: [], notFound: [] };
			const pairs = loadBskyPairs(db, uris);
			if (pairs.length === 0) return { found: [], notFound: [] };

			const bskyByDoc = new Map(pairs.map((p) => [p.bskyUri, p.docUri]));
			const found: EngagementRow[] = [];
			const seenBsky = new Set<string>();
			for (const batch of chunk(pairs.map((p) => p.bskyUri), BATCH_SIZE)) {
				const { posts } = await client.getPosts(batch);
				for (const p of posts) {
					seenBsky.add(p.uri);
					const docUri = bskyByDoc.get(p.uri);
					if (!docUri) continue;
					found.push({
						uri: docUri,
						likeCount: p.likeCount ?? 0,
						repostCount: p.repostCount ?? 0,
						replyCount: p.replyCount ?? 0,
						reactorSample: []
					});
				}
			}
			const notFound = pairs
				.filter((p) => !seenBsky.has(p.bskyUri))
				.map((p) => p.docUri);
			return { found, notFound };
		},

		async fetchRecords(): Promise<AdapterBatchResult<RecordRow>> {
			return { found: [], notFound: [] };
		}
	};
}
