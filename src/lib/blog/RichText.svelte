<script lang="ts">
	// Render pckt-faceted rich text. Facets describe inline features over byte
	// ranges of the plaintext. Multiple features can apply to the same range
	// (e.g. bold + italic), so we render the segment with all relevant classes.
	type LinkF = { $type: 'blog.pckt.richtext.facet#link'; uri: string };
	type AtMentionF = { $type: 'blog.pckt.richtext.facet#atMention'; atURI: string };
	type DidMentionF = { $type: 'blog.pckt.richtext.facet#didMention'; did: string };
	type StyleF = {
		$type:
			| 'blog.pckt.richtext.facet#bold'
			| 'blog.pckt.richtext.facet#italic'
			| 'blog.pckt.richtext.facet#underline'
			| 'blog.pckt.richtext.facet#strikethrough'
			| 'blog.pckt.richtext.facet#code'
			| 'blog.pckt.richtext.facet#highlight';
	};
	type IdF = { $type: 'blog.pckt.richtext.facet#id'; id: string };
	type Feature = LinkF | AtMentionF | DidMentionF | StyleF | IdF;

	type Facet = {
		index: { byteStart: number; byteEnd: number };
		features: Feature[];
	};

	let {
		text,
		facets = []
	}: { text: string; facets?: readonly Facet[] } = $props();

	type Segment = { text: string; features: readonly Feature[] };

	function buildSegments(text: string, facets: readonly Facet[]): Segment[] {
		if (facets.length === 0) return [{ text, features: [] }];
		const enc = new TextEncoder();
		const dec = new TextDecoder();
		const bytes = enc.encode(text);
		const sorted = [...facets].sort(
			(a, b) => a.index.byteStart - b.index.byteStart
		);
		const segs: Segment[] = [];
		let cursor = 0;
		for (const f of sorted) {
			if (f.index.byteStart > cursor) {
				segs.push({
					text: dec.decode(bytes.slice(cursor, f.index.byteStart)),
					features: []
				});
			}
			segs.push({
				text: dec.decode(bytes.slice(f.index.byteStart, f.index.byteEnd)),
				features: f.features
			});
			cursor = f.index.byteEnd;
		}
		if (cursor < bytes.length) {
			segs.push({ text: dec.decode(bytes.slice(cursor)), features: [] });
		}
		return segs;
	}

	let segments = $derived(buildSegments(text, facets));

	function linkOf(features: readonly Feature[]): string | null {
		for (const f of features) {
			if (f.$type === 'blog.pckt.richtext.facet#link') return f.uri;
		}
		return null;
	}
	function hasStyle(features: readonly Feature[], suffix: string): boolean {
		return features.some((f) => f.$type === `blog.pckt.richtext.facet#${suffix}`);
	}
</script>

{#each segments as seg, i (i)}
	{@const link = linkOf(seg.features)}
	{@const isBold = hasStyle(seg.features, 'bold')}
	{@const isItalic = hasStyle(seg.features, 'italic')}
	{@const isUnderline = hasStyle(seg.features, 'underline')}
	{@const isStrike = hasStyle(seg.features, 'strikethrough')}
	{@const isCode = hasStyle(seg.features, 'code')}
	{@const isHighlight = hasStyle(seg.features, 'highlight')}
	{#if link}
		<a
			href={link}
			target="_blank"
			rel="noopener noreferrer"
			class:bold={isBold}
			class:italic={isItalic}
			class:underline={isUnderline}
			class:strike={isStrike}
		>{seg.text}</a>
	{:else if isCode}
		<code>{seg.text}</code>
	{:else if isHighlight}
		<mark class:bold={isBold} class:italic={isItalic}>{seg.text}</mark>
	{:else}
		<span
			class:bold={isBold}
			class:italic={isItalic}
			class:underline={isUnderline}
			class:strike={isStrike}
		>{seg.text}</span>
	{/if}
{/each}

<style>
	.bold { font-weight: 700; }
	.italic { font-style: italic; }
	.underline { text-decoration: underline; }
	.strike { text-decoration: line-through; }
	a { color: var(--color-cool); text-decoration: underline; text-underline-offset: 2px; }
	code {
		font-family: var(--font-mono);
		font-size: 0.92em;
		background: var(--shell-veil);
		padding: 1px 5px;
		border: 1px solid var(--color-edge);
	}
	mark { background: color-mix(in srgb, var(--color-warm) 40%, transparent); color: var(--color-fg); padding: 0 2px; }
</style>
