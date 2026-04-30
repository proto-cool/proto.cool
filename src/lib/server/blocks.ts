// Parse the `content` field of a site.standard.document into a flat array
// of blocks. pckt stores content inline (≤20KB) via `items` or as an
// external blob (>20KB) via a blob ref. Caller supplies a fetcher (CID →
// JSON string) for the blob path.

export type Block = { $type: string } & Record<string, unknown>;

type BlobRef = { ref: { $link: string } | string };

type ContentLike = {
	items?: unknown;
	blob?: BlobRef;
};

export type BlobFetcher = (cid: string) => Promise<string>;

function cidOf(ref: { $link: string } | string): string {
	return typeof ref === 'string' ? ref : ref.$link;
}

export async function parseContent(
	content: ContentLike | null | undefined,
	fetcher: BlobFetcher
): Promise<Block[]> {
	if (!content) return [];
	if (Array.isArray(content.items)) {
		return content.items.filter(
			(b): b is Block => Boolean(b) && typeof b === 'object'
		);
	}
	if (content.blob) {
		try {
			const json = await fetcher(cidOf(content.blob.ref));
			const parsed = JSON.parse(json) as { items?: unknown };
			if (Array.isArray(parsed.items)) {
				return parsed.items.filter(
					(b): b is Block => Boolean(b) && typeof b === 'object'
				);
			}
		} catch {
			return [];
		}
	}
	return [];
}
