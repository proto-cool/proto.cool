<script lang="ts">
	import { blobUrl, type BlobContext } from '$lib/blob';
	import Lightbox from '$lib/feed/Lightbox.svelte';

	type AspectRatio = { width: number; height: number };
	type Attrs = {
		src: string;
		alt?: string;
		title?: string;
		align?: 'left' | 'center' | 'right';
		aspectRatio?: AspectRatio;
		blob?: { ref: { $link: string } | string };
	};

	let {
		attrs,
		blobCtx
	}: { attrs: Attrs; blobCtx: BlobContext } = $props();

	let isOpen = $state(false);

	function cidOf(ref: { $link: string } | string): string {
		return typeof ref === 'string' ? ref : ref.$link;
	}

	let resolvedSrc = $derived.by(() => {
		// pckt's src may be a "blob:CID" pseudo-URL, an http(s) URL, or empty
		// when the blob field carries the actual ref. Prefer the blob field.
		if (attrs.blob) return blobUrl(blobCtx, blobCtx.ownerDid, cidOf(attrs.blob.ref));
		if (attrs.src.startsWith('blob:')) {
			return blobUrl(blobCtx, blobCtx.ownerDid, attrs.src.slice('blob:'.length));
		}
		return attrs.src;
	});

	let alignClass = $derived(`align-${attrs.align ?? 'center'}`);
	let aspect = $derived(
		attrs.aspectRatio
			? `${attrs.aspectRatio.width} / ${attrs.aspectRatio.height}`
			: undefined
	);
</script>

<figure class="img-block {alignClass}">
	<button
		type="button"
		class="img-btn"
		onclick={() => (isOpen = true)}
		aria-label="open image"
	>
		<img
			src={resolvedSrc}
			alt={attrs.alt ?? ''}
			loading="lazy"
			style:aspect-ratio={aspect}
		/>
	</button>
	{#if attrs.title}
		<figcaption>{attrs.title}</figcaption>
	{/if}
</figure>

{#if isOpen}
	<Lightbox
		images={[{ src: resolvedSrc, alt: attrs.alt }]}
		onClose={() => (isOpen = false)}
	/>
{/if}

<style>
	.img-block { margin: 24px 0; }
	.img-block.align-left { text-align: left; }
	.img-block.align-center { text-align: center; }
	.img-block.align-right { text-align: right; }
	.img-btn {
		display: inline-block;
		padding: 0; margin: 0; border: 0; background: none; cursor: pointer;
		max-width: 100%;
	}
	img {
		max-width: 100%;
		height: auto;
		display: block;
		border: 1px solid var(--color-edge);
	}
	figcaption {
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.1em;
		color: var(--color-fg-dim);
		margin-top: 8px;
	}
</style>
