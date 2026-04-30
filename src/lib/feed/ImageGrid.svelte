<script lang="ts">
	import AltChip from './AltChip.svelte';
	import Lightbox from './Lightbox.svelte';

	export type GridImage = { src: string; alt?: string };

	let { images }: { images: GridImage[] } = $props();

	let lightboxOpen = $state(false);
	let lightboxIndex = $state(0);

	function open(i: number, e: MouseEvent) {
		e.stopPropagation();
		e.preventDefault();
		lightboxIndex = i;
		lightboxOpen = true;
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
			<button
				type="button"
				class="slot"
				class:hero={(layout === 'three' || layout === 'four') && i === 0}
				onclick={(e) => open(i, e)}
				aria-label={`open image ${i + 1}`}
			>
				<img src={img.src} alt={img.alt ?? ''} loading="lazy" />
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
	.grid-one { grid-template-columns: 1fr; }
	.grid-one .slot { aspect-ratio: 16 / 9; }
	.grid-two { grid-template-columns: 1fr 1fr; }
	.grid-two .slot { aspect-ratio: 1; }
	.grid-three { grid-template-columns: 1fr 1fr; grid-template-rows: auto auto; }
	.grid-three .slot { aspect-ratio: 1; }
	.grid-three .slot.hero { grid-column: span 2; aspect-ratio: 16 / 9; }
	.grid-four { grid-template-columns: 1fr 1fr 1fr; grid-template-rows: auto auto; }
	.grid-four .slot { aspect-ratio: 1; }
	.grid-four .slot.hero { grid-column: span 3; aspect-ratio: 16 / 9; }

	.slot {
		position: relative;
		display: block;
		padding: 0;
		margin: 0;
		border: 1px solid var(--color-edge);
		background: var(--shell-veil);
		overflow: hidden;
		cursor: pointer;
	}
	.slot img { width: 100%; height: 100%; object-fit: cover; display: block; }
</style>
