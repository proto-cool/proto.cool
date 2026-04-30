// Placeholder. Grain's image-record NSIDs are deferred; replace this with a
// real adapter (mirroring bsky.ts in shape) when those land. Until then, the
// scheduler routes any 'grain' refresh to this file and it intentionally
// throws — the per-source breaker swallows it, the source enters cooldown,
// and the rest of the workers continue.

import type { Adapter, AdapterBatchResult } from './types';

export function createGrainAdapter(): Adapter {
	const notYetWired = (op: string) => async (): Promise<AdapterBatchResult<never>> => {
		throw new Error(`grain adapter not yet wired (op=${op})`);
	};
	return {
		source: 'grain',
		fetchEngagement: notYetWired('fetchEngagement') as Adapter['fetchEngagement'],
		fetchRecords: notYetWired('fetchRecords') as Adapter['fetchRecords']
	};
}
