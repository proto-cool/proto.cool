import type { Source } from '../config';

export type EngagementRow = {
	uri: string;
	likeCount: number;
	repostCount: number;
	replyCount: number;
	reactorSample: Array<{ did: string; handle: string; avatar: string | null }>;
};

export type RecordRow = {
	uri: string;
	cid: string;
	value: Record<string, unknown>;
	createdAt: string;
};

// A 404 from the AppView is meaningful information — we hard-delete external
// records that 404. Adapters surface it as a partition of the response, not as
// a thrown error, so a single missing URI in a batch doesn't fail the rest.
export type AdapterBatchResult<T> = {
	found: T[];
	notFound: string[]; // URIs the AppView reported as missing
};

export interface Adapter {
	readonly source: Extract<Source, 'bsky' | 'standard' | 'grain'>;
	fetchEngagement(uris: string[]): Promise<AdapterBatchResult<EngagementRow>>;
	fetchRecords(uris: string[]): Promise<AdapterBatchResult<RecordRow>>;
}

export type AdapterRegistry = {
	bsky: Adapter;
	standard: Adapter;
	grain: Adapter;
};
