<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		replyCount = 0,
		repostCount = 0,
		likeCount = 0,
		trailing
	}: {
		replyCount?: number;
		repostCount?: number;
		likeCount?: number;
		trailing?: Snippet;
	} = $props();

	let hasAny = $derived(replyCount > 0 || repostCount > 0 || likeCount > 0);
	let show = $derived(hasAny || !!trailing);

	function fmt(n: number): string {
		if (n < 1000) return String(n);
		if (n < 10_000) return `${(n / 1000).toFixed(1)}K`;
		if (n < 1_000_000) return `${Math.floor(n / 1000)}K`;
		return `${(n / 1_000_000).toFixed(1)}M`;
	}
</script>

{#if show}
	<div class="engagement" aria-label="engagement">
		{#if hasAny}
			<span class="stat"><span class="ic">↪</span><span class="n">{fmt(replyCount)}</span></span>
			<span class="stat"><span class="ic">↻</span><span class="n">{fmt(repostCount)}</span></span>
			<span class="stat"><span class="ic">❤</span><span class="n">{fmt(likeCount)}</span></span>
		{/if}
		{#if trailing}
			<span class="trailing">{@render trailing()}</span>
		{/if}
	</div>
{/if}

<style>
	.engagement {
		display: flex;
		align-items: center;
		gap: 22px;
		padding-top: 12px;
		margin-top: 14px;
		border-top: 1px solid var(--color-edge);
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.08em;
	}
	.stat { display: inline-flex; align-items: baseline; gap: 6px; }
	.ic { color: var(--color-fg-mute); }
	.n { color: var(--color-fg); }
	.trailing { margin-left: auto; }
</style>
