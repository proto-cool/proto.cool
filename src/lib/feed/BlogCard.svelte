<script lang="ts">
	import type { FeedItem } from '$lib/server/feed';
	import TagChips from './TagChips.svelte';
	import { relativeTime } from '$lib/relative-time';

	let { item }: { item: FeedItem } = $props();

	type DocValue = {
		title: string;
		path?: string;
		description?: string;
		textContent?: string;
		tags?: readonly string[];
	};
	let value = $derived(item.value as DocValue);
	let href = $derived(value.path ? `/blog${value.path}` : '#');
	let excerpt = $derived(
		value.description ?? value.textContent?.slice(0, 200) ?? ''
	);
</script>

<a class="card" {href}>
	<header class="head">
		<span>{relativeTime(item.createdAt)}</span>
		<span class="kind-tag">BLOG</span>
	</header>
	<div class="rule"></div>
	<h2 class="title">{value.title}</h2>
	{#if excerpt}
		<p class="excerpt">{excerpt}</p>
	{/if}
	{#if value.tags && value.tags.length > 0}
		<div class="tags-wrap"><TagChips tags={value.tags} /></div>
	{/if}
	<p class="cta">read entry →</p>
</a>

<style>
	.card {
		display: block;
		text-decoration: none;
		color: inherit;
		background: var(--shell-veil);
		border: 1px solid var(--color-edge);
		padding: 18px 20px 16px;
	}
	.card:hover { border-color: var(--color-fg-dim); }
	.head {
		display: flex; justify-content: space-between;
		font-family: var(--font-mono); font-size: 13px; letter-spacing: 0.12em;
		color: var(--color-fg-dim);
	}
	.kind-tag { color: var(--color-warm); letter-spacing: 0.18em; text-transform: uppercase; font-size: 11px; }
	.rule { height: 1px; background: var(--color-edge); margin: 10px 0 14px; }
	.title {
		font-family: var(--font-display);
		font-style: italic; font-weight: 400;
		font-size: var(--text-md); line-height: 1.1;
		margin: 0 0 10px;
		color: var(--color-fg);
	}
	.excerpt {
		color: var(--color-fg-dim);
		font-size: var(--text-base); line-height: 1.5;
		margin: 0 0 14px;
		display: -webkit-box;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	.tags-wrap { margin: 0 0 14px; }
	.cta {
		font-family: var(--font-mono);
		font-size: 13px; letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--color-warm);
		margin: 0;
	}
</style>
