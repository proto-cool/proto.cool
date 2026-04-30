export type Source = 'bsky' | 'standard' | 'grain';

const COLLECTIONS_BY_SOURCE: Record<Source, readonly string[]> = {
	bsky: ['app.bsky.feed.post', 'app.bsky.feed.repost'],
	standard: ['site.standard.document'],
	grain: []
};

export const WATCHED_COLLECTIONS: readonly string[] = Object.values(
	COLLECTIONS_BY_SOURCE
).flat();

const COLLECTION_TO_SOURCE: ReadonlyMap<string, Source> = new Map(
	(Object.entries(COLLECTIONS_BY_SOURCE) as Array<[Source, readonly string[]]>).flatMap(
		([source, collections]) => collections.map((c) => [c, source] as const)
	)
);

export function sourceForCollection(collection: string): Source | null {
	return COLLECTION_TO_SOURCE.get(collection) ?? null;
}

export function collectionsForSource(source: Source): readonly string[] {
	return COLLECTIONS_BY_SOURCE[source] ?? [];
}

/**
 * Read the operator's DID from the env. Returns null if unset; backfill /
 * bootstrap callers fall back to handle resolution in that case.
 */
export function getOwnerDid(): string | null {
	const v = process.env.PROTO_OWNER_DID;
	return v && v.length > 0 ? v : null;
}

export function getBskyAppview(): string {
	return process.env.PROTO_BSKY_APPVIEW ?? 'https://public.api.bsky.app';
}

export function getPdsHost(): string {
	return process.env.PROTO_PDS_HOST ?? 'pds.proto.cool';
}

export function shouldRunBackground(): boolean {
	return process.env.NODE_ENV === 'production' || process.env.PROTO_BACKGROUND === '1';
}
