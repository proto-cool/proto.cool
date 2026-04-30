<script lang="ts">
	import type { Snippet } from 'svelte';
	let { children }: { children: Snippet } = $props();
</script>

<blockquote>{@render children()}</blockquote>

<style>
	blockquote {
		margin: 24px 0;
		padding: 8px 0 8px 20px;
		border-left: 2px solid var(--color-fg-dim);
		color: var(--color-fg-dim);
		font-style: italic;
	}
	blockquote :global(p) { margin: 0 0 8px; }
	blockquote :global(p:last-child) { margin-bottom: 0; }
</style>
