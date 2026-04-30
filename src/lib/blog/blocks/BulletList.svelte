<script lang="ts">
	import type { Snippet } from 'svelte';
	let { children }: { children: Snippet } = $props();
</script>

<ul class="bullet-list">{@render children()}</ul>

<style>
	.bullet-list {
		margin: 16px 0;
		padding-left: 24px;
		color: var(--color-fg);
	}
	.bullet-list :global(li) { padding-left: 4px; margin-bottom: 6px; }
	.bullet-list :global(li::marker) {
		color: var(--color-warm);
		font-family: var(--font-mono);
	}
</style>
