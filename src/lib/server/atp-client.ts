import { Client, simpleFetchHandler } from '@atcute/client';
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

export interface AtpClient {
	listRecords(args: {
		repo: string;
		collection: string;
		cursor?: string;
		limit?: number;
	}): Promise<ListRecordsResult>;
	resolveHandle(handle: string): Promise<{ did: string }>;
}

export function createAtpClient(service: string): AtpClient {
	const rpc = new Client({ handler: simpleFetchHandler({ service }) });

	return {
		async listRecords({ repo, collection, cursor, limit }) {
			const response = await rpc.get('com.atproto.repo.listRecords', {
				params: { repo: repo as any, collection: collection as any, cursor, limit: limit ?? 100 }
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

		async resolveHandle(handle) {
			const response = await rpc.get('com.atproto.identity.resolveHandle', {
				params: { handle: handle as any }
			});
			if (!response.ok) {
				throw new Error(
					`resolveHandle failed: ${response.data.error}: ${response.data.message ?? ''}`
				);
			}
			return { did: response.data.did };
		}
	};
}
