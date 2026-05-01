<script lang="ts">
	import AltChip from './AltChip.svelte';
	import Lightbox from './Lightbox.svelte';

	export type GridImage = { src: string; alt?: string; aspect?: number };

	let { images }: { images: GridImage[] } = $props();

	let lightboxOpen = $state(false);
	let lightboxIndex = $state(0);
	let aspects = $state<Record<string, number>>({});
	let loaded = $state<Record<string, boolean>>({});

	function open(i: number, e: MouseEvent) {
		e.stopPropagation();
		e.preventDefault();
		lightboxIndex = i;
		lightboxOpen = true;
	}

	function onImgLoad(key: string, e: Event, hasServerAspect: boolean) {
		loaded[key] = true;
		if (hasServerAspect) return;
		const img = e.currentTarget as HTMLImageElement;
		if (img.naturalWidth && img.naturalHeight) {
			aspects[key] = img.naturalWidth / img.naturalHeight;
		}
	}

	function singleSlotStyle(key: string, serverAspect: number | undefined): string | null {
		const a = serverAspect ?? aspects[key];
		if (a === undefined) return null;
		const widthPct = a >= 1 ? 100 : Math.max(50, a * 100);
		return `aspect-ratio: ${a}; width: ${widthPct}%;`;
	}

	let layout = $derived.by(() => {
		switch (images.length) {
			case 1: return 'one' as const;
			case 2: return 'two' as const;
			case 3: return 'three' as const;
			case 4: return 'four' as const;
			default: return 'one' as const;
		}
	});
</script>

{#if images.length > 0}
	<div class="grid grid-{layout}">
		{#each images as img, i (img.src + i)}
			{@const key = img.src + i}
			<button
				type="button"
				class="slot"
				style={layout === 'one' ? singleSlotStyle(key, img.aspect) : null}
				onclick={(e) => open(i, e)}
				aria-label={`open image ${i + 1}`}
			>
				<img
					class="fg"
					class:loaded={loaded[key]}
					src={img.src}
					alt={img.alt ?? ''}
					loading="lazy"
					onload={(e) => onImgLoad(key, e, img.aspect !== undefined)}
				/>
				{#if img.alt}
					<AltChip alt={img.alt} />
				{/if}
			</button>
		{/each}
	</div>
{/if}

{#if lightboxOpen}
	<Lightbox {images} bind:index={lightboxIndex} onClose={() => (lightboxOpen = false)} />
{/if}

<style>
	.grid { display: grid; gap: 4px; }
	.grid-one { grid-template-columns: 1fr; justify-items: start; }
	.grid-two { grid-template-columns: 1fr 1fr; }
	.grid-three { grid-template-columns: 1fr 1fr 1fr; }
	.grid-four { grid-template-columns: 1fr 1fr; }

	.slot {
		position: relative;
		display: block;
		padding: 0;
		margin: 0;
		border: 1px solid var(--color-edge);
		background: var(--shell-veil);
		overflow: hidden;
		cursor: pointer;
		aspect-ratio: 1;
	}
	.slot:focus-visible {
		outline: 2px solid var(--color-warm);
		outline-offset: 2px;
	}
	.slot .fg {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: contain;
		display: block;
		opacity: 0;
		transition: opacity var(--dur-base) ease;
	}
	.slot .fg.loaded { opacity: 1; }
	@media (prefers-reduced-motion: reduce) {
		.slot .fg { opacity: 1; transition: none; }
	}

	.grid-one .slot {
		max-width: 100%;
	}
</style>
