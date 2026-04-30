// Per-collection canonical-timestamp extraction. Most atproto records use
// `createdAt`, but some lexicons name the field differently (e.g.
// site.standard.document uses `publishedAt`). When neither field is present
// the caller-supplied fallback is used.

export function extractCreatedAt(
	collection: string,
	value: Record<string, unknown>,
	fallback: string
): string {
	if (collection === 'site.standard.document') {
		const p = value.publishedAt;
		if (typeof p === 'string') return p;
	}
	const c = value.createdAt;
	if (typeof c === 'string') return c;
	return fallback;
}
