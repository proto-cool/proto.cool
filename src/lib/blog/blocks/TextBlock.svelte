<script lang="ts">
	import RichText from '../RichText.svelte';

	let { plaintext, facets = [] }: { plaintext: string; facets?: readonly any[] } = $props();
</script>

<p class="text"><RichText text={plaintext} {facets} /></p>

<style>
	.text {
		margin: 0 0 20px;
		line-height: 1.7;
		color: var(--color-fg);
		font-size: var(--text-base);
	}
</style>
