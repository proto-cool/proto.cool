import type { AtpClient } from '../atp-client';
import type { Adapter, EngagementRow, RecordRow, AdapterBatchResult } from './types';

const BATCH_SIZE = 25; // app.bsky.feed.getPosts cap

function chunk<T>(xs: T[], size: number): T[][] {
	const out: T[][] = [];
	for (let i = 0; i < xs.length; i += size) out.push(xs.slice(i, i + size));
	return out;
}

export function createBskyAdapter(client: AtpClient): Adapter {
	async function fetchAll(uris: string[]) {
		const found: Array<{
			uri: string;
			cid: string;
			record: Record<string, unknown>;
			likeCount?: number;
			repostCount?: number;
			replyCount?: number;
		}> = [];
		for (const batch of chunk(uris, BATCH_SIZE)) {
			const { posts } = await client.getPosts(batch);
			found.push(...posts);
		}
		const foundUris = new Set(found.map((p) => p.uri));
		const notFound = uris.filter((u) => !foundUris.has(u));
		return { found, notFound };
	}

	return {
		source: 'bsky',

		async fetchEngagement(uris): Promise<AdapterBatchResult<EngagementRow>> {
			if (uris.length === 0) return { found: [], notFound: [] };
			const { found, notFound } = await fetchAll(uris);
			return {
				found: found.map((p) => ({
					uri: p.uri,
					likeCount: p.likeCount ?? 0,
					repostCount: p.repostCount ?? 0,
					replyCount: p.replyCount ?? 0,
					reactorSample: []
				})),
				notFound
			};
		},

		async fetchRecords(uris): Promise<AdapterBatchResult<RecordRow>> {
			if (uris.length === 0) return { found: [], notFound: [] };
			const { found, notFound } = await fetchAll(uris);
			return {
				found: found.map((p) => {
					const createdAt =
						typeof p.record.createdAt === 'string'
							? p.record.createdAt
							: new Date().toISOString();
					return {
						uri: p.uri,
						cid: p.cid,
						value: p.record,
						createdAt
					};
				}),
				notFound
			};
		}
	};
}
