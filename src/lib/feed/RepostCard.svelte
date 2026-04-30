<script lang="ts">
	import type { FeedItem } from '$lib/server/feed';
	import FacetText from './FacetText.svelte';
	import ImageGrid from './ImageGrid.svelte';
	import LinkCard from './LinkCard.svelte';
	import EngagementStrip from './EngagementStrip.svelte';
	import BskyChip from './BskyChip.svelte';
	import BskyLink from './BskyLink.svelte';
	import { relativeTime } from '$lib/relative-time';
	import { blobUrl, type BlobContext } from '$lib/blob';

	let {
		item,
		blobCtx
	}: { item: FeedItem; blobCtx: BlobContext } = $props();

	type SubjectValue = {
		text?: string;
		facets?: readonly any[];
		embed?: any;
	};

	function didFromUri(uri: string): string {
		const m = uri.match(/^at:\/\/([^\/]+)\//);
		return m ? m[1] : '';
	}
	function rkeyFromUri(uri: string): string {
		return uri.split('/').pop() ?? '';
	}
	function cidOf(ref: { $link: string } | string): string {
		return typeof ref === 'string' ? ref : ref.$link;
	}

	let subject = $derived(item.subject);
	let subjectValue = $derived(subject?.value as SubjectValue | undefined);
	let subjectHandle = $derived(item.subjectHandle ?? null);
	let subjectDid = $derived(subject ? didFromUri(subject.uri) : '');
	let permalink = $derived(
		subject
			? `https://bsky.app/profile/${subjectHandle ?? subjectDid}/post/${rkeyFromUri(subject.uri)}`
			: '#'
	);

	let images = $derived.by(() => {
		if (!subjectValue) return [];
		const e = subjectValue.embed as any;
		const list = e?.images ?? e?.media?.images;
		if (Array.isArray(list)) {
			return list.map((i: { image: { ref: any }; alt?: string }) => ({
				src: blobUrl(blobCtx, subjectDid, cidOf(i.image.ref)),
				alt: i.alt
			}));
		}
		return [];
	});

	let external = $derived.by(() => {
		const e = subjectValue?.embed as any;
		const ext = e?.external ?? e?.media?.external;
		if (ext) {
			return {
				uri: ext.uri as string,
				title: ext.title as string,
				description: ext.description as string | undefined,
				thumb: ext.thumb ? blobUrl(blobCtx, subjectDid, cidOf(ext.thumb.ref)) : undefined
			};
		}
		return null;
	});
</script>

<article class="card">
	<a class="card-overlay" href={permalink} target="_blank" rel="noopener noreferrer" aria-label="open original post on bsky"></a>

	<header class="head">
		<span class="repost-line">↻ reposted · {relativeTime(item.createdAt)}</span>
		<BskyChip label="repost" />
	</header>
	<div class="rule"></div>
	{#if !subject}
		<p class="unavailable">[unavailable]</p>
	{:else}
		<header class="subject-head">
			<span class="handle">@{subjectHandle ?? `${subjectDid.slice(0, 12)}…`}</span>
			<span class="time">{relativeTime(subject.createdAt)}</span>
		</header>
		{#if subjectValue?.text}
			<p class="body"><FacetText text={subjectValue.text} facets={subjectValue.facets} /></p>
		{/if}
		{#if images.length > 0}
			<div class="embed-wrap"><ImageGrid {images} /></div>
		{:else if external}
			<div class="embed-wrap"><LinkCard {...external} /></div>
		{/if}
		<EngagementStrip
			replyCount={subject.engagement?.replyCount ?? 0}
			repostCount={subject.engagement?.repostCount ?? 0}
			likeCount={subject.engagement?.likeCount ?? 0}
		>
			{#snippet trailing()}
				<BskyLink href={permalink} label="view original on bluesky" />
			{/snippet}
		</EngagementStrip>
	{/if}
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
	.card > :not(.card-overlay) {
		position: relative;
		z-index: 1;
	}
	.head {
		display: flex; justify-content: space-between; align-items: center;
		font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.12em;
	}
	.repost-line { color: var(--color-cool); }
	.rule { height: 1px; background: var(--color-edge); margin: 10px 0 12px; }
	.subject-head {
		display: flex; justify-content: space-between;
		font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.12em;
		color: var(--color-fg-dim);
		padding-bottom: 6px;
		margin-bottom: 10px;
	}
	.handle { color: var(--color-fg); }
	.body { margin: 0 0 12px; line-height: 1.55; color: var(--color-fg); font-size: 14px; }
	.embed-wrap { margin: 12px 0 0; }
	.unavailable {
		font-family: var(--font-mono); font-size: 12px; color: var(--color-fg-mute);
		text-align: center; padding: 24px 0; margin: 0;
	}
</style>
