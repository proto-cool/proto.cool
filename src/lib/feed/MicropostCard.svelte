<script lang="ts">
	import type { FeedItem } from '$lib/server/feed';
	import FacetText from './FacetText.svelte';
	import ImageGrid from './ImageGrid.svelte';
	import LinkCard from './LinkCard.svelte';
	import QuotePostCard from './QuotePostCard.svelte';
	import EngagementStrip from './EngagementStrip.svelte';
	import BskyChip from './BskyChip.svelte';
	import BskyLink from './BskyLink.svelte';
	import RelativeTime from './RelativeTime.svelte';
	import { blobUrl, type BlobContext } from '$lib/blob';

	let {
		item,
		ownerHandle,
		blobCtx
	}: { item: FeedItem; ownerHandle: string; blobCtx: BlobContext } = $props();

	type RecordValue = {
		text?: string;
		facets?: readonly any[];
		embed?: any;
	};
	let value = $derived(item.value as RecordValue);

	let rkey = $derived(item.uri.split('/').pop() ?? '');
	// Use DIDs in bsky.app links — handles can change, DIDs are stable.
	// The owned post URI is at://<owner-did>/app.bsky.feed.post/<rkey>; pull
	// the DID from there (also available as blobCtx.ownerDid).
	let permalink = $derived(`https://bsky.app/profile/${blobCtx.ownerDid}/post/${rkey}`);

	function cidOf(ref: { $link: string } | string): string {
		return typeof ref === 'string' ? ref : ref.$link;
	}
	function didFromUri(uri: string): string {
		const m = uri.match(/^at:\/\/([^\/]+)\//);
		return m ? m[1] : '';
	}
	function rkeyFromUri(uri: string): string {
		return uri.split('/').pop() ?? '';
	}

	let mediaEmbed = $derived.by(() => {
		const e = value.embed as any;
		if (!e) return null;
		const images = e.images ?? e.media?.images;
		if (Array.isArray(images)) {
			return {
				kind: 'images' as const,
				images: images.map(
					(i: {
						image: { ref: any };
						alt?: string;
						aspectRatio?: { width: number; height: number };
					}) => ({
						src: blobUrl(blobCtx, blobCtx.ownerDid, cidOf(i.image.ref)),
						alt: i.alt,
						aspect:
							i.aspectRatio && i.aspectRatio.height > 0
								? i.aspectRatio.width / i.aspectRatio.height
								: undefined
					})
				)
			};
		}
		const external = e.external ?? e.media?.external;
		if (external) {
			return {
				kind: 'external' as const,
				uri: external.uri as string,
				title: external.title as string,
				description: external.description as string | undefined,
				thumb: external.thumb
					? blobUrl(blobCtx, blobCtx.ownerDid, cidOf(external.thumb.ref))
					: undefined
			};
		}
		return null;
	});

	let quotedSubjectDid = $derived(item.subject ? didFromUri(item.subject.uri) : '');
	let quotedPermalink = $derived(
		item.subject
			? `https://bsky.app/profile/${quotedSubjectDid}/post/${rkeyFromUri(item.subject.uri)}`
			: '#'
	);
</script>

<article class="card">
	<header class="head">
		<span class="head-left">
			<a
				class="handle"
				href="https://bsky.app/profile/{blobCtx.ownerDid}"
				target="_blank"
				rel="noopener noreferrer"
				onclick={(e) => e.stopPropagation()}
			>@{ownerHandle}</a>
			·
			<RelativeTime class="time" datetime={item.createdAt} />
		</span>
		<BskyChip />
	</header>
	<div class="rule"></div>
	{#if value.text}
		<p class="body"><FacetText text={value.text} facets={value.facets} /></p>
	{/if}
	{#if mediaEmbed?.kind === 'images'}
		<div class="embed-wrap"><ImageGrid images={mediaEmbed.images} /></div>
	{:else if mediaEmbed?.kind === 'external'}
		<div class="embed-wrap">
			<LinkCard
				uri={mediaEmbed.uri}
				title={mediaEmbed.title}
				description={mediaEmbed.description}
				thumb={mediaEmbed.thumb}
			/>
		</div>
	{/if}
	{#if item.subject}
		{@const subj = item.subject.value as { text?: string; facets?: any[] } | null}
		<QuotePostCard
			handle={item.subjectHandle ?? `${quotedSubjectDid.slice(0, 12)}…`}
			text={subj?.text ?? ''}
			facets={subj?.facets}
			createdAt={item.subject.createdAt}
			permalink={quotedPermalink}
			replyCount={item.subject.engagement?.replyCount ?? 0}
			repostCount={item.subject.engagement?.repostCount ?? 0}
			likeCount={item.subject.engagement?.likeCount ?? 0}
		/>
	{/if}
	<EngagementStrip
		replyCount={item.engagement?.replyCount ?? 0}
		repostCount={item.engagement?.repostCount ?? 0}
		likeCount={item.engagement?.likeCount ?? 0}
	>
		{#snippet trailing()}
			<BskyLink href={permalink} />
		{/snippet}
	</EngagementStrip>
</article>

<style>
	.card {
		display: block;
		background: var(--shell-veil);
		border: 1px solid var(--color-edge);
		padding: 18px 20px 16px;
		container-type: inline-size;
	}
	.head {
		display: flex; justify-content: space-between; align-items: center;
		font-family: var(--font-mono); font-size: 13px; letter-spacing: 0.12em;
		color: var(--color-fg-dim);
	}
	.head .handle {
		color: var(--color-fg);
		text-decoration: none;
		transition: color var(--dur-fast) ease, text-decoration-color var(--dur-fast) ease;
	}
	.head .handle:hover {
		color: var(--color-warm);
		text-decoration: underline;
	}
	.head .handle:focus-visible {
		outline: 2px solid var(--color-warm);
		outline-offset: 2px;
	}
	.rule { height: 1px; background: var(--color-edge); margin: 10px 0 14px; }
	.body { margin: 0 0 14px; line-height: 1.55; color: var(--color-fg); font-size: var(--text-base); }
	.embed-wrap { margin: 14px 0 0; }
</style>
