<script lang="ts">
	import type { FeedItem } from '$lib/server/feed';
	import type { BlobContext } from '$lib/blob';
	import MicropostCard from './MicropostCard.svelte';
	import RepostCard from './RepostCard.svelte';
	import BlogCard from './BlogCard.svelte';

	let {
		item,
		ownerHandle,
		blobCtx
	}: { item: FeedItem; ownerHandle: string; blobCtx: BlobContext } = $props();
</script>

{#if item.collection === 'app.bsky.feed.post'}
	<MicropostCard {item} {ownerHandle} {blobCtx} />
{:else if item.collection === 'app.bsky.feed.repost'}
	<RepostCard {item} {blobCtx} />
{:else if item.collection === 'site.standard.document'}
	<BlogCard {item} />
{:else}
	<div class="unsupported">[unsupported: {item.collection}]</div>
{/if}

<style>
	.unsupported {
		background: var(--shell-veil);
		border: 1px solid var(--color-edge);
		padding: 14px 18px;
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--color-fg-mute);
		letter-spacing: 0.12em;
	}
</style>
