<script lang="ts">
	import type { Snippet } from 'svelte';
	import { ChatCircle, Repeat, Heart } from 'phosphor-svelte';

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

	function fmt(n: number): string {
		if (n < 1000) return String(n);
		if (n < 10_000) return `${(n / 1000).toFixed(1)}K`;
		if (n < 1_000_000) return `${Math.floor(n / 1000)}K`;
		return `${(n / 1_000_000).toFixed(1)}M`;
	}
</script>

<div class="engagement" aria-label="engagement">
	<span class="stat" class:zero={replyCount === 0}>
		<ChatCircle size={14} weight="regular" class="ic" />
		<span class="n">{fmt(replyCount)}</span>
	</span>
	<span class="stat" class:zero={repostCount === 0}>
		<Repeat size={14} weight="regular" class="ic" />
		<span class="n">{fmt(repostCount)}</span>
	</span>
	<span class="stat" class:zero={likeCount === 0}>
		<Heart size={14} weight="regular" class="ic" />
		<span class="n">{fmt(likeCount)}</span>
	</span>
	{#if trailing}
		<span class="trailing">{@render trailing()}</span>
	{/if}
</div>

<style>
	.engagement {
		display: flex;
		align-items: center;
		gap: 18px;
		padding-top: 14px;
		margin-top: 16px;
		border-top: 1px solid var(--color-edge);
		font-family: var(--font-mono);
		font-size: 13px;
		letter-spacing: 0.08em;
	}
	.stat { display: inline-flex; align-items: center; gap: 8px; line-height: 1; }
	.stat :global(.ic) { color: var(--color-fg-mute); flex-shrink: 0; }
	.n { color: var(--color-fg-dim); line-height: 1; }
	.stat.zero .n { color: var(--color-fg-mute); }
	.trailing { margin-left: auto; }
</style>
