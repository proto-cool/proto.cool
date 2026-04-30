<script lang="ts">
	import { PINNED_TAG } from '$lib/constants';

	let { tags, max = 5 }: { tags: readonly string[]; max?: number } = $props();

	let visible = $derived(tags.filter((t) => t !== PINNED_TAG));
	let shown = $derived(visible.slice(0, max));
	let overflow = $derived(Math.max(0, visible.length - max));
</script>

{#if shown.length > 0}
	<ul class="tag-chips" aria-label="tags">
		{#each shown as t (t)}
			<li class="chip">{t}</li>
		{/each}
		{#if overflow > 0}
			<li class="chip chip-overflow">+{overflow}</li>
		{/if}
	</ul>
{/if}

<style>
	.tag-chips {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.chip {
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--color-fg-dim);
		border: 1px solid var(--color-edge);
		padding: 2px 6px;
	}
	.chip-overflow { color: var(--color-fg-mute); }
</style>
