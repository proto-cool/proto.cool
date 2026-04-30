<script lang="ts">
	let { alt, expanded = $bindable(false) }: { alt: string; expanded?: boolean } = $props();
</script>

<button
	type="button"
	class="alt-chip"
	class:expanded
	onclick={(e) => { e.stopPropagation(); e.preventDefault(); expanded = !expanded; }}
	aria-label={expanded ? 'hide alt text' : 'show alt text'}
>
	ALT
</button>
{#if expanded}
	<p class="alt-text">{alt}</p>
{/if}

<style>
	.alt-chip {
		position: absolute;
		bottom: 6px;
		right: 6px;
		background: rgba(10, 14, 10, 0.85);
		border: 1px solid var(--color-edge);
		color: var(--color-fg);
		font-family: var(--font-mono);
		font-size: 9px;
		letter-spacing: 0.16em;
		padding: 2px 6px;
		cursor: pointer;
		z-index: 2;
	}
	.alt-chip:hover, .alt-chip.expanded { color: var(--color-hot); }
	.alt-text {
		position: absolute;
		bottom: 28px;
		right: 6px;
		left: 6px;
		background: rgba(10, 14, 10, 0.92);
		border: 1px solid var(--color-edge);
		color: var(--color-fg);
		font-family: var(--font-mono);
		font-size: 11px;
		line-height: 1.5;
		padding: 8px 10px;
		margin: 0;
		z-index: 2;
	}
</style>
