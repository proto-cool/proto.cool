<script lang="ts">
	import type { FeedItem } from '$lib/server/feed';
	import { blobUrl, type BlobContext } from '$lib/blob';

	let { item, blobCtx }: { item: FeedItem; blobCtx: BlobContext } = $props();

	type DocValue = {
		title: string;
		path?: string;
		description?: string;
		coverImage?: { ref: { $link: string } | string };
		publishedAt: string;
	};
	let value = $derived(item.value as DocValue);
	let href = $derived(value.path ? `/blog${value.path}` : '#');

	function cidOf(ref: { $link: string } | string): string {
		return typeof ref === 'string' ? ref : ref.$link;
	}
	let coverUrl = $derived(
		value.coverImage ? blobUrl(blobCtx, blobCtx.ownerDid, cidOf(value.coverImage.ref)) : null
	);

	const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun',
		'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
	let monthLabel = $derived.by(() => {
		const d = new Date(value.publishedAt);
		return `${MONTHS[d.getUTCMonth()]}·${d.getUTCFullYear()}`;
	});
</script>

<a class="featured" {href}>
	<header class="kicker">
		<span>/// featured · entry</span>
		<span class="month">{monthLabel}</span>
	</header>
	{#if coverUrl}
		<div class="cover"><img src={coverUrl} alt="" /></div>
	{/if}
	<div class="body">
		<h2 class="title">{value.title}</h2>
		{#if value.description}
			<p class="excerpt">{value.description}</p>
		{/if}
		<p class="cta">read entry →</p>
	</div>
</a>

<style>
	.featured {
		display: block;
		text-decoration: none;
		color: inherit;
		background: var(--shell-veil);
		border: 1px solid var(--color-edge);
		margin-bottom: 22px;
	}
	.featured:hover { border-color: var(--color-fg-dim); }
	.kicker {
		display: flex; justify-content: space-between;
		padding: 14px 20px;
		border-bottom: 1px solid var(--color-edge);
		font-family: var(--font-mono);
		font-size: 13px; letter-spacing: 0.2em;
		color: var(--color-fg-dim);
	}
	.month { color: var(--color-fg-dim); }
	.cover { aspect-ratio: 16 / 7; overflow: hidden; }
	.cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
	.body { padding: 24px 28px 22px; }
	.title {
		font-family: var(--font-display);
		font-style: italic; font-weight: 400;
		font-size: var(--text-lg); line-height: 1.05;
		letter-spacing: -0.015em;
		margin: 0 0 12px;
		color: var(--color-fg);
	}
	.excerpt {
		color: var(--color-fg-dim);
		font-size: var(--text-base); line-height: 1.55;
		margin: 0 0 18px;
	}
	.cta {
		font-family: var(--font-mono);
		font-size: 13px; letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--color-warm);
		margin: 0;
	}
</style>
