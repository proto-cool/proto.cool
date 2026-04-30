<script lang="ts">
	// Render bsky-style faceted text. Facets describe spans of the plain text
	// by UTF-8 byte offsets, so we slice on byte boundaries (not char indices).
	type LinkFeature = { $type: 'app.bsky.richtext.facet#link'; uri: string };
	type MentionFeature = { $type: 'app.bsky.richtext.facet#mention'; did: string };
	type TagFeature = { $type: 'app.bsky.richtext.facet#tag'; tag: string };
	type Feature = LinkFeature | MentionFeature | TagFeature;
	type Facet = {
		index: { byteStart: number; byteEnd: number };
		features: Feature[];
	};

	let {
		text,
		facets = []
	}: { text: string; facets?: readonly Facet[] } = $props();

	type Segment = { text: string; feature: Feature | null };

	function buildSegments(text: string, facets: readonly Facet[]): Segment[] {
		if (facets.length === 0) return [{ text, feature: null }];
		const enc = new TextEncoder();
		const dec = new TextDecoder();
		const bytes = enc.encode(text);
		const sorted = [...facets].sort(
			(a, b) => a.index.byteStart - b.index.byteStart
		);
		const out: Segment[] = [];
		let cursor = 0;
		for (const f of sorted) {
			const { byteStart, byteEnd } = f.index;
			if (byteStart > cursor) {
				out.push({ text: dec.decode(bytes.slice(cursor, byteStart)), feature: null });
			}
			out.push({
				text: dec.decode(bytes.slice(byteStart, byteEnd)),
				feature: f.features[0] ?? null
			});
			cursor = byteEnd;
		}
		if (cursor < bytes.length) {
			out.push({ text: dec.decode(bytes.slice(cursor)), feature: null });
		}
		return out;
	}

	let segments = $derived(buildSegments(text, facets));
</script>

<span class="facet-text">
	{#each segments as seg, i (i)}
		{#if seg.feature?.$type === 'app.bsky.richtext.facet#link'}
			<a href={seg.feature.uri} target="_blank" rel="noopener noreferrer" onclick={(e) => e.stopPropagation()}>{seg.text}</a>
		{:else if seg.feature?.$type === 'app.bsky.richtext.facet#mention'}
			<a
				href="https://bsky.app/profile/{seg.feature.did}"
				target="_blank"
				rel="noopener noreferrer"
				class="mention"
				onclick={(e) => e.stopPropagation()}
			>{seg.text}</a>
		{:else if seg.feature?.$type === 'app.bsky.richtext.facet#tag'}
			<span class="tag">{seg.text}</span>
		{:else}
			{seg.text}
		{/if}
	{/each}
</span>

<style>
	.facet-text { white-space: pre-wrap; }
	a { color: var(--color-cool); text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 2px; }
	a:hover { color: var(--color-warm); }
	a:focus-visible {
		outline: 2px solid var(--color-warm);
		outline-offset: 2px;
	}
	.mention { color: var(--color-cool); }
	.tag { color: var(--color-warm); }
</style>
