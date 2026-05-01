<script lang="ts">
	import type { FeedItem } from '$lib/server/feed';
	import FacetText from './FacetText.svelte';
	import ImageGrid from './ImageGrid.svelte';
	import LinkCard from './LinkCard.svelte';
	import EngagementStrip from './EngagementStrip.svelte';
	import BskyChip from './BskyChip.svelte';
	import BskyLink from './BskyLink.svelte';
	import RelativeTime from './RelativeTime.svelte';
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
			? `https://bsky.app/profile/${subjectDid}/post/${rkeyFromUri(subject.uri)}`
			: '#'
	);

	let images = $derived.by(() => {
		if (!subjectValue) return [];
		const e = subjectValue.embed as any;
		const list = e?.images ?? e?.media?.images;
		if (Array.isArray(list)) {
			return list.map(
				(i: {
					image: { ref: any };
					alt?: string;
					aspectRatio?: { width: number; height: number };
				}) => ({
					src: blobUrl(blobCtx, subjectDid, cidOf(i.image.ref)),
					alt: i.alt,
					aspect:
						i.aspectRatio && i.aspectRatio.height > 0
							? i.aspectRatio.width / i.aspectRatio.height
							: undefined
				})
			);
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
	<header class="head">
		<span class="repost-line">↻ reposted · <RelativeTime datetime={item.createdAt} /></span>
		<BskyChip label="repost" />
	</header>
	<div class="rule"></div>
	{#if !subject}
		<p class="unavailable">[unavailable]</p>
	{:else}
		<header class="subject-head">
			<a
				class="handle"
				href="https://bsky.app/profile/{subjectDid}"
				target="_blank"
				rel="noopener noreferrer"
				onclick={(e) => e.stopPropagation()}
			>@{subjectHandle ?? `${subjectDid.slice(0, 12)}…`}</a>
			<RelativeTime class="time" datetime={subject.createdAt} />
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
		display: block;
		background: var(--shell-veil);
		border: 1px solid var(--color-edge);
		padding: 18px 20px 16px;
		container-type: inline-size;
	}
	.head {
		display: flex; justify-content: space-between; align-items: center;
		font-family: var(--font-mono); font-size: 13px; letter-spacing: 0.12em;
	}
	.repost-line { color: var(--color-cool); }
	.rule { height: 1px; background: var(--color-edge); margin: 10px 0 14px; }
	.subject-head {
		display: flex; justify-content: space-between;
		font-family: var(--font-mono); font-size: 13px; letter-spacing: 0.12em;
		color: var(--color-fg-dim);
		padding-bottom: 8px;
		margin-bottom: 12px;
	}
	.handle {
		color: var(--color-fg);
		text-decoration: none;
		transition: color var(--dur-fast) ease, text-decoration-color var(--dur-fast) ease;
	}
	.handle:hover {
		color: var(--color-warm);
		text-decoration: underline;
	}
	.handle:focus-visible {
		outline: 2px solid var(--color-warm);
		outline-offset: 2px;
	}
	.body { margin: 0 0 14px; line-height: 1.55; color: var(--color-fg); font-size: var(--text-base); }
	.embed-wrap { margin: 14px 0 0; }
	.unavailable {
		font-family: var(--font-mono); font-size: 14px; color: var(--color-fg-mute);
		text-align: center; padding: 28px 0; margin: 0;
	}
</style>
