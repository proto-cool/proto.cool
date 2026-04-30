<script lang="ts">
	import { getContext, tick } from 'svelte';
	import { page as pageStore } from '$app/state';
	import { replaceState } from '$app/navigation';
	import HeroSection from '$lib/shell/HeroSection.svelte';
	import FeaturedBlock from '$lib/feed/FeaturedBlock.svelte';
	import Card from '$lib/feed/Card.svelte';
	import FeedToolbar from '$lib/feed/FeedToolbar.svelte';
	import AutoLoadToggle from '$lib/feed/AutoLoadToggle.svelte';
	import LoadMore from '$lib/feed/LoadMore.svelte';
	import FeedError from '$lib/feed/FeedError.svelte';
	import Sidebar from '$lib/feed/Sidebar.svelte';
	import type { ChromeData } from '$lib/shell/chrome';
	import type { FeedItem } from '$lib/server/feed';

	type SourceVal = 'all' | 'bsky' | 'blog';
	type SortVal = 'newest' | 'oldest' | 'popular';

	let { data } = $props();
	const chrome = getContext<ChromeData>('chrome');
	let ownerHandle = $derived(chrome.identity.user.replace(/^@/, ''));

	// Stream state. Mirrors data.stream from SSR for the very first render,
	// then takes over as the source of truth — filter/sort changes mutate
	// it in place via /api/feed (no loader re-run, no page navigation).
	// Client-side override of the loader payload. While `override` is null
	// the page reads straight from `data` (correct on SSR + first hydrate).
	// applyQuery() / loadMore() set `override` to swap in fetched results
	// without touching the URL's loader. A real navigation produces a fresh
	// data.stream reference, which the effect below detects and clears.
	type Override = {
		items: FeedItem[];
		page: number;
		totalPages: number;
		source: SourceVal;
		sort: SortVal;
	};
	let override = $state<Override | null>(null);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let lastFailedOp = $state<null | (() => Promise<void>)>(null);

	// Auto-load preference. Persisted in localStorage so the choice survives
	// reloads. Lifted to the page (rather than living inside LoadMore) so
	// the AutoLoadToggle in the toolbar row can flip it from anywhere — the
	// LoadMore footer scrolls past too quickly when auto is on.
	const AUTO_STORAGE_KEY = 'proto.feed.autoload';
	let auto = $state(false);
	let autoMounted = $state(false);
	$effect(() => {
		auto = localStorage.getItem(AUTO_STORAGE_KEY) === '1';
		autoMounted = true;
	});
	$effect(() => {
		if (!autoMounted) return;
		localStorage.setItem(AUTO_STORAGE_KEY, auto ? '1' : '0');
	});

	let lastStream: typeof data.stream | undefined;
	$effect(() => {
		const cur = data.stream;
		if (lastStream === undefined) {
			lastStream = cur;
			return;
		}
		if (cur !== lastStream) {
			lastStream = cur;
			override = null;
			loading = false;
		}
	});

	let items = $derived(override?.items ?? data.stream.items);
	let page = $derived(override?.page ?? data.stream.page);
	let totalPages = $derived(override?.totalPages ?? data.stream.totalPages);
	let source: SourceVal = $derived(override?.source ?? data.query.source);
	let sort: SortVal = $derived(override?.sort ?? data.query.sort);

	let hasMore = $derived(page < totalPages);

	async function fetchPage(p: number, src: SourceVal, srt: SortVal): Promise<{
		items: FeedItem[];
		page: number;
		totalPages: number;
	} | null> {
		const url = new URL('/api/feed', pageStore.url);
		if (src !== 'all') url.searchParams.set('source', src);
		if (srt !== 'newest') url.searchParams.set('sort', srt);
		if (p !== 1) url.searchParams.set('page', String(p));
		const res = await fetch(url);
		if (!res.ok) return null;
		return await res.json();
	}

	function syncUrl(src: SourceVal, srt: SortVal) {
		const url = new URL(pageStore.url);
		if (src === 'all') url.searchParams.delete('source');
		else url.searchParams.set('source', src);
		if (srt === 'newest') url.searchParams.delete('sort');
		else url.searchParams.set('sort', srt);
		url.searchParams.delete('page');
		replaceState(url, {});
	}

	async function applyQuery(next: { source: SourceVal; sort: SortVal }) {
		if (next.source === source && next.sort === sort) return;
		const op = () => applyQuery(next);
		loading = true;
		const body = await fetchPage(1, next.source, next.sort);
		if (!body) {
			loading = false;
			error = "couldn’t load";
			lastFailedOp = op;
			return;
		}
		error = null;
		lastFailedOp = null;
		syncUrl(next.source, next.sort);

		// View Transitions API gives us a free cross-fade on the swap.
		// Falls back to an instant swap on browsers that don't support it
		// (still smooth — only the items list changes; featured/toolbar/
		// header don't move, so there's no perceived jump).
		const swap = () => {
			override = {
				items: body.items,
				page: body.page,
				totalPages: body.totalPages,
				source: next.source,
				sort: next.sort
			};
			loading = false;
		};
		const startVT = (
			document as Document & { startViewTransition?: (cb: () => unknown) => unknown }
		).startViewTransition;
		if (typeof startVT === 'function') {
			startVT.call(document, async () => {
				swap();
				await tick();
			});
		} else {
			swap();
		}
	}

	async function loadMore() {
		if (loading || !hasMore) return;
		const op = () => loadMore();
		loading = true;
		try {
			const body = await fetchPage(page + 1, source, sort);
			if (!body) {
				error = "couldn’t load";
				lastFailedOp = op;
				return;
			}
			error = null;
			lastFailedOp = null;
			// Offset pagination drifts when new firehose records land between
			// page fetches — the same URI can appear at the bottom of page N
			// and the top of page N+1. Filter dupes by URI on append so the
			// keyed each block stays valid.
			const seen = new Set(items.map((i) => i.uri));
			const novel = body.items.filter((i) => !seen.has(i.uri));
			override = {
				items: [...items, ...novel],
				page: body.page,
				totalPages: body.totalPages,
				source,
				sort
			};
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>content · proto.cool</title>
</svelte:head>

<article class="home">
	<HeroSection
		variant="large"
		line1="good to"
		emphasis="good"
		line2="see you"
		ariaLabel="proto.cool — good to see you"
		avatar="/protocol7_headshot.webp"
		avatarAlt="protocol7"
		avatarLabel="protocol7"
		avatarId="@proto.cool"
	>
		{#snippet deck()}
			i'm <b>Nick</b> (a.k.a. protocol7). programmer by trade — 12+ years, mostly AI engineering
			these days. on the side: graphic design, 3d printing, game design, and whatever else catches
			my eye. proto.cool is where it all lands.
		{/snippet}
	</HeroSection>

	<div class="layout">
		<section class="content" aria-label="content">
			<header class="section-head">
				<p class="kicker">/// index · content</p>
				<span class="rule" aria-hidden="true"></span>
			</header>

			{#if data.featured}
				<FeaturedBlock item={data.featured} blobCtx={data.blobCtx} />
			{/if}

			<div class="feed-region">
				<div class="feed-rule" aria-hidden="true"></div>

				<div class="filter-row">
					<FeedToolbar {source} {sort} onchange={applyQuery} />
					<div class="filter-end">
						{#if loading}<span class="loading-caption">loading…</span>{/if}
						<AutoLoadToggle bind:auto />
					</div>
				</div>

				<div class="entries-wrap" class:loading aria-busy={loading}>
					{#if items.length === 0 && error && lastFailedOp}
						<FeedError message={error} onretry={lastFailedOp} />
					{:else if items.length === 0}
						<p class="empty">nothing here yet.</p>
					{:else}
						<ol class="entries">
							{#each items as item (item.uri)}
								<li class="entry">
									<Card {item} {ownerHandle} blobCtx={data.blobCtx} />
								</li>
							{/each}
						</ol>
						{#if error && lastFailedOp}
							<FeedError message={error} onretry={lastFailedOp} />
						{:else}
							<LoadMore {hasMore} {loading} {auto} onload={loadMore} />
						{/if}
					{/if}
				</div>
			</div>
		</section>

		<Sidebar pulse={data.pulse} />
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
	.content { display: flex; flex-direction: column; gap: 28px; min-width: 0; }
	.section-head {
		display: grid;
		grid-template-columns: auto 1fr;
		align-items: center;
		gap: 18px;
		margin-bottom: 4px;
	}
	.kicker {
		margin: 0;
		font-family: var(--font-mono);
		font-size: 13px;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: var(--color-fg-dim);
	}
	.rule {
		display: block; height: 1px;
		background: linear-gradient(90deg,
			rgba(184, 255, 90, 0.25) 0,
			rgba(184, 255, 90, 0.1) 60%,
			transparent 100%);
	}
	.feed-region {
		display: flex;
		flex-direction: column;
		gap: 18px;
	}
	/* Wraps FeedToolbar (left) + AutoLoadToggle (right) in a single row.
	   Owns the bottom border so the toolbar component itself can stay
	   focused on its own controls. */
	.filter-row {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: baseline;
		gap: 18px 32px;
		padding: 10px 0 16px;
		border-bottom: 1px solid var(--color-edge);
	}
	.filter-end {
		display: flex;
		align-items: baseline;
		gap: 14px;
	}
	.loading-caption {
		font-family: var(--font-mono);
		font-size: 12px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--color-fg-mute);
	}
	/* Tick-rule echoing the GreebleStrip vocabulary — visually distinct
	   from the smooth gradient rule under the title. Marks the boundary
	   between pinned/featured content and the live feed below. */
	.feed-rule {
		height: 7px;
		background-image: repeating-linear-gradient(
			90deg,
			transparent 0,
			transparent 13px,
			var(--color-edge) 13px,
			var(--color-edge) 14px,
			transparent 14px,
			transparent 28px
		);
		opacity: 0.7;
	}
	.entries-wrap {
		/* Subtle dim while a fetch is in flight — gives feedback even on
		   browsers where View Transitions aren't available. */
		transition: opacity 140ms ease;
	}
	.entries-wrap.loading { opacity: 0.55; }
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
		font-size: 14px;
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
	}

	/* View Transitions: tune the cross-fade. Works only when the browser
	   supports startViewTransition; otherwise the @keyframes are unused. */
	:global(::view-transition-old(root)),
	:global(::view-transition-new(root)) {
		animation-duration: 220ms;
		animation-timing-function: ease;
	}
</style>
