<script lang="ts">
	import type { Snippet } from 'svelte';
	let { children }: { children: Snippet } = $props();
</script>

<ol class="ordered-list">{@render children()}</ol>

<style>
	.ordered-list {
		margin: 16px 0;
		padding-left: 28px;
		color: var(--color-fg);
	}
	.ordered-list :global(li) { padding-left: 4px; margin-bottom: 6px; }
	.ordered-list :global(li::marker) {
		color: var(--color-warm);
		font-family: var(--font-mono);
	}
</style>
