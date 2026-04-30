<script lang="ts">
	import RichText from '../RichText.svelte';

	let {
		level = 2,
		plaintext,
		facets = []
	}: { level?: number; plaintext: string; facets?: readonly any[] } = $props();

	let lvl = $derived(Math.min(6, Math.max(1, level)));
</script>

{#if lvl === 1}
	<h1 class="h h1"><RichText text={plaintext} {facets} /></h1>
{:else if lvl === 2}
	<h2 class="h h2"><RichText text={plaintext} {facets} /></h2>
{:else if lvl === 3}
	<h3 class="h h3"><RichText text={plaintext} {facets} /></h3>
{:else if lvl === 4}
	<h4 class="h h4"><RichText text={plaintext} {facets} /></h4>
{:else if lvl === 5}
	<h5 class="h h5"><RichText text={plaintext} {facets} /></h5>
{:else}
	<h6 class="h h6"><RichText text={plaintext} {facets} /></h6>
{/if}

<style>
	.h {
		color: var(--color-fg);
		margin: 32px 0 14px;
		line-height: 1.15;
	}
	.h1, .h2, .h3 {
		font-family: var(--font-display);
		font-style: italic;
		font-weight: 800;
		letter-spacing: -0.01em;
	}
	.h1 { font-size: 40px; }
	.h2 { font-size: 32px; }
	.h3 { font-size: 26px; }
	.h4, .h5, .h6 {
		font-family: var(--font-sans);
		font-weight: 700;
	}
	.h4 { font-size: 22px; }
	.h5 { font-size: 20px; }
	.h6 { font-size: 16px; text-transform: uppercase; letter-spacing: 0.08em; }
</style>
