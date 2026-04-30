<script lang="ts">
	import Block from '$lib/blog/blocks/Block.svelte';
	import TagChips from '$lib/feed/TagChips.svelte';
	import { blobUrl } from '$lib/blob';

	let { data } = $props();

	type DocValue = {
		title: string;
		description?: string;
		coverImage?: { ref: { $link: string } | string };
		publishedAt: string;
		path?: string;
		tags?: readonly string[];
		bskyPostRef?: { uri: string; cid: string };
	};
	let value = $derived(data.doc.value as DocValue);

	function cidOf(ref: { $link: string } | string): string {
		return typeof ref === 'string' ? ref : ref.$link;
	}
	let coverUrl = $derived(
		value.coverImage ? blobUrl(data.blobCtx, data.blobCtx.ownerDid, cidOf(value.coverImage.ref)) : null
	);

	let publishedDate = $derived.by(() => {
		const d = new Date(value.publishedAt);
		return `${d.getUTCFullYear()}·${String(d.getUTCMonth() + 1).padStart(2, '0')}·${String(d.getUTCDate()).padStart(2, '0')}`;
	});

	let bskyDiscussion = $derived.by(() => {
		const ref = value.bskyPostRef;
		if (!ref) return null;
		const m = ref.uri.match(/^at:\/\/([^\/]+)\/[^\/]+\/(.+)$/);
		if (!m) return null;
		// m[1] is always a DID — at:// URIs lead with the DID, never a handle.
		return {
			did: m[1],
			rkey: m[2],
			engagement: data.doc.engagement
		};
	});

	let bskyUrl = $derived(
		bskyDiscussion
			? `https://bsky.app/profile/${bskyDiscussion.did}/post/${bskyDiscussion.rkey}`
			: null
	);

	let ogImage = $derived(coverUrl ?? '');
	let canonical = $derived(`https://proto.cool/blog${value.path ?? ''}`);
</script>

<svelte:head>
	<title>{value.title} · proto.cool</title>
	<meta name="description" content={value.description ?? ''} />
	<meta property="og:type" content="article" />
	<meta property="og:title" content={value.title} />
	<meta property="og:description" content={value.description ?? ''} />
	{#if ogImage}
		<meta property="og:image" content={ogImage} />
	{/if}
	<meta property="og:url" content={canonical} />
	<meta property="article:published_time" content={value.publishedAt} />
	<meta name="twitter:card" content={ogImage ? 'summary_large_image' : 'summary'} />
	<meta name="twitter:title" content={value.title} />
	<meta name="twitter:description" content={value.description ?? ''} />
	{#if ogImage}
		<meta name="twitter:image" content={ogImage} />
	{/if}
	<link rel="canonical" href={canonical} />
</svelte:head>

<article class="blog">
	<nav class="breadcrumb" aria-label="breadcrumb">
		<a href="/">← content</a>
		<span class="sep">/</span>
		<span>blog · {value.path?.replace(/^\//, '') ?? ''}</span>
	</nav>

	{#if coverUrl}
		<div class="hero"><img src={coverUrl} alt="" /></div>
	{/if}

	<p class="meta"><span class="warm">/// blog · entry</span> · <span>{publishedDate}</span></p>

	<h1 class="title">{value.title}</h1>

	{#if value.description}
		<p class="deck">{value.description}</p>
	{/if}

	<div class="body">
		{#each data.blocks as block, i (i)}
			<Block {block} blobCtx={data.blobCtx} />
		{/each}
	</div>

	{#if value.tags && value.tags.length > 0}
		<div class="tags-wrap"><TagChips tags={value.tags} /></div>
	{/if}

	{#if bskyDiscussion && bskyUrl}
		<section class="discuss" aria-labelledby="discuss-h">
			<h2 id="discuss-h" class="discuss-h">/// discuss · bsky</h2>
			{#if bskyDiscussion.engagement}
				<p class="counts">
					↪ {bskyDiscussion.engagement.replyCount} replies ·
					↻ {bskyDiscussion.engagement.repostCount} reposts ·
					❤ {bskyDiscussion.engagement.likeCount} likes
				</p>
			{/if}
			<a class="discuss-cta" href={bskyUrl} target="_blank" rel="noopener noreferrer">view & reply on bsky →</a>
		</section>
	{/if}

	<footer class="back">
		<a href="/">← back to content</a>
	</footer>
</article>

<style>
	.blog {
		max-width: 1024px;
		width: 100%;
		margin-inline: auto;
		padding: 32px 32px 96px;
		color: var(--color-fg);
	}
	.breadcrumb {
		font-family: var(--font-mono);
		font-size: 13px;
		letter-spacing: 0.16em;
		color: var(--color-fg-dim);
		margin-bottom: 24px;
	}
	.breadcrumb a { color: var(--color-fg-dim); text-decoration: none; }
	.breadcrumb a:focus-visible,
	.discuss-cta:focus-visible,
	.back a:focus-visible {
		outline: 2px solid var(--color-warm);
		outline-offset: 2px;
	}
	.breadcrumb .sep { color: var(--color-fg-mute); padding: 0 8px; }

	.hero {
		aspect-ratio: 21 / 9;
		margin-bottom: 32px;
		border: 1px solid var(--color-edge);
		overflow: hidden;
	}
	.hero img { width: 100%; height: 100%; object-fit: cover; display: block; }

	.meta {
		font-family: var(--font-mono);
		font-size: 13px;
		letter-spacing: 0.16em;
		color: var(--color-fg-dim);
		margin: 0 0 16px;
	}
	.meta .warm { color: var(--color-warm); }

	.title {
		font-family: var(--font-display);
		font-style: italic;
		font-weight: 800;
		font-size: 56px;
		line-height: 1.05;
		letter-spacing: -0.015em;
		margin: 0 0 20px;
	}
	.deck {
		font-size: var(--text-md);
		color: var(--color-fg-dim);
		line-height: 1.5;
		margin: 0 0 40px;
		max-width: 56ch;
	}
	.body {
		font-size: var(--text-base);
		color: var(--color-fg);
		max-width: 60ch;
	}
	.tags-wrap {
		max-width: 60ch;
		margin: 28px 0;
	}

	.discuss {
		max-width: 60ch;
		margin: 36px 0 24px;
		padding: 20px 0;
		border-top: 1px solid var(--color-edge);
		border-bottom: 1px solid var(--color-edge);
	}
	.discuss-h {
		font-family: var(--font-mono);
		font-size: 14px;
		letter-spacing: 0.18em;
		color: var(--color-cool);
		margin: 0 0 12px;
	}
	.counts {
		font-family: var(--font-mono);
		font-size: 14px;
		color: var(--color-fg-dim);
		margin: 0 0 12px;
	}
	.discuss-cta {
		font-family: var(--font-mono);
		font-size: 13px;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--color-warm);
	}

	.back {
		margin-top: 48px;
		padding-top: 18px;
		border-top: 1px solid var(--color-edge);
		font-family: var(--font-mono);
		font-size: 13px;
		letter-spacing: 0.16em;
	}
	.back a { color: var(--color-fg-dim); text-decoration: none; }

	@container chrome (max-width: 767px) {
		.blog { padding: 20px 16px 64px; }
		.title { font-size: 36px; }
	}
</style>
