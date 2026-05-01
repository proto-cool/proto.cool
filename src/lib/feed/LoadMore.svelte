<script lang="ts">
	import { CircleNotch } from 'phosphor-svelte';

	type Props = {
		hasMore: boolean;
		loading: boolean;
		auto: boolean;
		onload: () => void;
	};
	let { hasMore, loading, auto, onload }: Props = $props();

	let btnRef: HTMLButtonElement | null = $state(null);

	$effect(() => {
		if (!auto || !btnRef || !hasMore) return;
		const el = btnRef;
		const obs = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting && !loading) onload();
				}
			},
			{ rootMargin: '600px 0px' }
		);
		obs.observe(el);
		return () => obs.disconnect();
	});
</script>

{#if hasMore}
	<div class="wrap">
		<button bind:this={btnRef} class="btn" type="button" disabled={loading} onclick={onload}>
			{#if loading}
				<CircleNotch size={14} weight="regular" class="spin" />
				<span class="lbl">loading</span>
			{:else}
				load more →
			{/if}
		</button>
	</div>
{:else}
	<p class="end">— end of feed —</p>
{/if}

<style>
	.wrap {
		display: flex;
		justify-content: center;
		margin: 32px 0 12px;
	}
	.btn {
		font-family: var(--font-mono);
		font-size: 13px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		background: transparent;
		border: 1px solid var(--color-edge);
		color: var(--color-fg);
		padding: 10px 22px;
		cursor: pointer;
		transition: color 120ms ease, border-color 120ms ease, background-color 120ms ease;
	}
	.btn:hover:not(:disabled) {
		color: var(--color-warm);
		border-color: var(--color-warm);
	}
	.btn:focus-visible {
		outline: 2px solid var(--color-warm);
		outline-offset: 2px;
	}
	.btn:disabled {
		opacity: 0.55;
		cursor: progress;
	}
	.btn :global(.spin) {
		vertical-align: -2px;
		margin-right: 8px;
		animation: rotate 1s linear infinite;
	}
	.lbl { vertical-align: baseline; }
	@keyframes rotate {
		to { transform: rotate(360deg); }
	}
	@media (prefers-reduced-motion: reduce) {
		.btn :global(.spin) { animation: none; }
	}
	.end {
		text-align: center;
		font-family: var(--font-mono);
		font-size: 12px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--color-fg-mute);
		margin: 32px 0 8px;
	}
</style>
