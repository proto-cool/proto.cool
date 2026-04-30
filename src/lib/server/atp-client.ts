import { Client, simpleFetchHandler } from '@atcute/client';
import type {
	ActorIdentifier,
	Cid,
	Handle,
	Nsid,
	RecordKey,
	ResourceUri
} from '@atcute/lexicons';
import type {} from '@atcute/atproto';
import type {} from '@atcute/bluesky';

export type ListRecordsResult = {
	records: Array<{
		uri: string;
		cid: string;
		value: Record<string, unknown>;
	}>;
	cursor: string | null;
};

export type GetRecordResult = {
	uri: string;
	cid: string;
	value: Record<string, unknown>;
};

export interface AtpClient {
	listRecords(args: {
		repo: string;
		collection: string;
		cursor?: string;
		limit?: number;
	}): Promise<ListRecordsResult>;
	getRecord(args: {
		repo: string;
		collection: string;
		rkey: string;
		cid?: string;
	}): Promise<GetRecordResult>;
	resolveHandle(handle: string): Promise<{ did: string }>;
	getPosts(uris: string[]): Promise<{
		posts: Array<{
			uri: string;
			cid: string;
			record: Record<string, unknown>;
			likeCount?: number;
			repostCount?: number;
			replyCount?: number;
		}>;
	}>;
}

export function createAtpClient(service: string): AtpClient {
	const rpc = new Client({ handler: simpleFetchHandler({ service }) });

	return {
		async listRecords({ repo, collection, cursor, limit }) {
			// @atcute lexicons type repo/collection as branded template-literal types
			// (ActorIdentifier = Did | Handle, Nsid = a.b.c). The public AtpClient
			// interface accepts plain strings and trusts the caller to pass valid
			// values; we narrow at the lexicon edge here.
			const response = await rpc.get('com.atproto.repo.listRecords', {
				params: {
					repo: repo as ActorIdentifier,
					collection: collection as Nsid,
					cursor,
					limit: limit ?? 100
				}
			});
			if (!response.ok) {
				throw new Error(
					`listRecords failed: ${response.data.error}: ${response.data.message ?? ''}`
				);
			}
			return {
				records: response.data.records.map((r) => ({
					uri: r.uri,
					cid: r.cid,
					value: r.value as Record<string, unknown>
				})),
				cursor: response.data.cursor ?? null
			};
		},

		async getRecord({ repo, collection, rkey, cid }) {
			// com.atproto.repo.getRecord returns parsed JSON ({uri, cid, value}),
			// unlike com.atproto.sync.getRecord which returns a CAR. We use the
			// repo variant so callers don't need a CAR decoder.
			const response = await rpc.get('com.atproto.repo.getRecord', {
				params: {
					repo: repo as ActorIdentifier,
					collection: collection as Nsid,
					rkey: rkey as RecordKey,
					cid: cid as Cid | undefined
				}
			});
			if (!response.ok) {
				throw new Error(
					`getRecord failed: ${response.data.error}: ${response.data.message ?? ''}`
				);
			}
			return {
				uri: response.data.uri,
				cid: response.data.cid ?? '',
				value: response.data.value as Record<string, unknown>
			};
		},

		async resolveHandle(handle) {
			const response = await rpc.get('com.atproto.identity.resolveHandle', {
				params: { handle: handle as Handle }
			});
			if (!response.ok) {
				throw new Error(
					`resolveHandle failed: ${response.data.error}: ${response.data.message ?? ''}`
				);
			}
			return { did: response.data.did };
		},

		async getPosts(uris) {
			// app.bsky.feed.getPosts caps at 25 URIs per call. The adapter slices
			// before calling, so we trust the caller here and pass the URIs through
			// as branded AT URIs.
			const response = await rpc.get('app.bsky.feed.getPosts', {
				params: { uris: uris as ResourceUri[] }
			});
			if (!response.ok) {
				throw new Error(
					`getPosts failed: ${response.data.error}: ${response.data.message ?? ''}`
				);
			}
			return {
				posts: response.data.posts.map((p) => ({
					uri: p.uri,
					cid: p.cid,
					record: p.record as Record<string, unknown>,
					likeCount: p.likeCount,
					repostCount: p.repostCount,
					replyCount: p.replyCount
				}))
			};
		}
	};
}
