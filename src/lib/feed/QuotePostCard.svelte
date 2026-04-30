<script lang="ts">
	import FacetText from './FacetText.svelte';
	import EngagementStrip from './EngagementStrip.svelte';
	import { relativeTime } from '$lib/relative-time';

	let {
		handle,
		text,
		facets,
		createdAt,
		permalink,
		replyCount = 0,
		repostCount = 0,
		likeCount = 0
	}: {
		handle: string;
		text: string;
		facets?: readonly any[];
		createdAt: string;
		permalink: string;
		replyCount?: number;
		repostCount?: number;
		likeCount?: number;
	} = $props();
</script>

<a
	class="quoted"
	href={permalink}
	target="_blank"
	rel="noopener noreferrer"
	onclick={(e) => e.stopPropagation()}
>
	<header class="head">
		<span class="handle">@{handle}</span>
		<span class="time">{relativeTime(createdAt)}</span>
	</header>
	{#if text}
		<p class="body"><FacetText {text} {facets} /></p>
	{/if}
	<EngagementStrip {replyCount} {repostCount} {likeCount} />
</a>

<style>
	.quoted {
		display: block;
		text-decoration: none;
		color: inherit;
		margin-top: 12px;
		padding: 12px 14px;
		border: 1px solid var(--color-edge);
		background: var(--color-bg);
		font-size: 13px;
	}
	.head {
		display: flex;
		justify-content: space-between;
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.12em;
		color: var(--color-fg-dim);
		padding-bottom: 6px;
		margin-bottom: 8px;
		border-bottom: 1px solid var(--color-edge);
	}
	.handle { color: var(--color-fg); }
	.body { margin: 0; line-height: 1.5; }
</style>
