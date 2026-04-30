<script lang="ts">
	import type { FeedItem } from '$lib/server/feed';
	import FacetText from './FacetText.svelte';
	import ImageGrid from './ImageGrid.svelte';
	import LinkCard from './LinkCard.svelte';
	import QuotePostCard from './QuotePostCard.svelte';
	import EngagementStrip from './EngagementStrip.svelte';
	import { relativeTime } from '$lib/relative-time';
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
	let permalink = $derived(`https://bsky.app/profile/${ownerHandle}/post/${rkey}`);

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
				images: images.map((i: { image: { ref: any }; alt?: string }) => ({
					src: blobUrl(blobCtx, blobCtx.ownerDid, cidOf(i.image.ref)),
					alt: i.alt
				}))
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
			? `https://bsky.app/profile/${item.subjectHandle ?? quotedSubjectDid}/post/${rkeyFromUri(item.subject.uri)}`
			: '#'
	);
</script>

<article class="card">
	<!-- background "open this post" affordance; sibling of inner content so
	     nested links/buttons don't violate HTML interactive-nesting rules -->
	<a class="card-overlay" href={permalink} target="_blank" rel="noopener noreferrer" aria-label="open post on bsky"></a>

	<header class="head">
		<span>{relativeTime(item.createdAt)}</span>
		<span></span>
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
	/>
</article>

<style>
	.card {
		position: relative;
		display: block;
		background: var(--shell-veil);
		border: 1px solid var(--color-edge);
		padding: 18px 20px 16px;
		container-type: inline-size;
	}
	.card:hover { border-color: var(--color-fg-dim); }
	.card-overlay {
		position: absolute;
		inset: 0;
		z-index: 0;
		text-indent: -9999px;
		overflow: hidden;
	}
	/* All real content sits above the overlay so its own clicks land first. */
	.card > :not(.card-overlay) {
		position: relative;
		z-index: 1;
	}
	.head {
		display: flex; justify-content: space-between;
		font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.12em;
		color: var(--color-fg-dim);
	}
	.rule { height: 1px; background: var(--color-edge); margin: 10px 0 12px; }
	.body { margin: 0 0 12px; line-height: 1.55; color: var(--color-fg); font-size: 14px; }
	.embed-wrap { margin: 12px 0 0; }
</style>
