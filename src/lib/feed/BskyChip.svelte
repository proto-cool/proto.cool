<script lang="ts">
	import BskyIcon from './BskyIcon.svelte';

	let { label = 'bsky' }: { label?: string } = $props();
</script>

<span class="chip">
	<BskyIcon />
	<span class="label">{label}</span>
</span>

<style>
	.chip {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--color-cool);
		border: 1px solid color-mix(in srgb, var(--color-cool) 35%, var(--color-edge));
		padding: 2px 7px;
	}
</style>
