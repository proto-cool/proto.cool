<script lang="ts">
	import { getContext } from 'svelte';
	import { page as pageStore } from '$app/state';
	import HeroSection from '$lib/shell/HeroSection.svelte';
	import FeaturedBlock from '$lib/feed/FeaturedBlock.svelte';
	import Card from '$lib/feed/Card.svelte';
	import Pagination from '$lib/feed/Pagination.svelte';
	import Sidebar from '$lib/feed/Sidebar.svelte';
	import type { ChromeData } from '$lib/shell/chrome';

	let { data } = $props();
	const chrome = getContext<ChromeData>('chrome');
	let ownerHandle = $derived(chrome.identity.user.replace(/^@/, ''));
</script>

<svelte:head>
	<title>content · proto.cool</title>
</svelte:head>

<article class="home">
	<HeroSection
		variant="large"
		line1="a digital"
		emphasis="digital"
		line2="digest"
		ariaLabel="proto.cool — a digital digest"
		avatar="/protocol7_headshot.webp"
		avatarAlt="protocol7"
		avatarLabel="protocol7"
		avatarId="@proto.cool"
	>
		{#snippet deck()}
			i'm <b>protocol7</b>, a creative technologist with 12+ years of full-stack dev experience and
			side obsessions in type, 3d printing, and game design. this site is a working archive — the
			projects, posts, and half-built things that fall out of all of it.
		{/snippet}
	</HeroSection>

	<div class="layout">
		<div class="content">
			{#if data.featured}
				<FeaturedBlock item={data.featured} blobCtx={data.blobCtx} />
			{/if}

			<section class="ledger" aria-labelledby="ledger-heading">
				<header class="ledger-head">
					<p class="kicker">/// recent · index</p>
					<h2 id="ledger-heading" class="ledger-title">posts <em>&amp;</em> projects</h2>
					<span class="rule" aria-hidden="true"></span>
				</header>

				{#if data.stream.items.length === 0}
					<p class="empty">nothing here yet.</p>
				{:else}
					<ol class="entries">
						{#each data.stream.items as item (item.uri)}
							<li class="entry">
								<Card {item} {ownerHandle} blobCtx={data.blobCtx} />
							</li>
						{/each}
					</ol>
					<Pagination page={data.stream.page} totalPages={data.stream.totalPages} basePath={pageStore.url.pathname} />
				{/if}
			</section>
		</div>

		<Sidebar />
	</div>
</article>

<style>
	.home { display: contents; }
	.layout {
		position: relative;
		z-index: 1;
		max-width: 1200px;
		width: 100%;
		margin-inline: auto;
		padding: 12px 32px 96px;
		display: grid;
		grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
		gap: 36px;
		align-items: start;
	}
	.content { display: flex; flex-direction: column; gap: 22px; min-width: 0; }
	.ledger { display: block; }
	.ledger-head {
		display: grid;
		grid-template-columns: auto auto 1fr;
		align-items: end;
		gap: 18px;
		margin-bottom: 32px;
	}
	.kicker {
		margin: 0;
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: var(--color-fg-dim);
	}
	.ledger-title {
		margin: 0;
		font-family: var(--font-display);
		font-weight: 800;
		font-size: 36px;
		line-height: 0.95;
		letter-spacing: -0.025em;
		color: var(--color-fg);
	}
	.ledger-title em { font-style: italic; color: var(--color-warm); }
	.rule {
		display: block; height: 1px;
		background: linear-gradient(90deg,
			rgba(184, 255, 90, 0.25) 0,
			rgba(184, 255, 90, 0.1) 60%,
			transparent 100%);
		align-self: end; margin-bottom: 8px;
	}
	.entries {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 18px;
	}
	.entry { display: block; }
	.empty {
		margin: 0;
		padding: 32px 4px;
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--color-fg-dim);
		text-align: center;
	}

	@container chrome (max-width: 1023px) {
		.layout {
			grid-template-columns: 1fr;
			gap: 28px;
		}
	}
	@container chrome (max-width: 767px) {
		.layout { padding: 8px 16px 64px; }
		.ledger-title { font-size: 26px; }
	}
</style>
