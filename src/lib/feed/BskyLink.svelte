<script lang="ts">
	import BskyIcon from './BskyIcon.svelte';

	let {
		href,
		label = 'view on bluesky'
	}: { href: string; label?: string } = $props();
</script>

<a class="bsky-link" {href} target="_blank" rel="noopener noreferrer">
	<BskyIcon size={11} />
	<span class="label">{label} →</span>
</a>

<style>
	.bsky-link {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--color-cool);
		text-decoration: none;
		white-space: nowrap;
	}
	.bsky-link:hover {
		color: var(--color-warm);
	}
	.label { line-height: 1; }
</style>
