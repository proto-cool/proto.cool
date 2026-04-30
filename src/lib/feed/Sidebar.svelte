<script lang="ts">
	import { currentTheme } from '$lib/theme';
	import RelativeTime from './RelativeTime.svelte';
	import type { PulseStats } from '$lib/server/pulse';
	import {
		GithubLogo,
		RssSimple,
		EnvelopeSimple,
		SteamLogo
	} from 'phosphor-svelte';
	import BskyIcon from './BskyIcon.svelte';

	let { pulse }: { pulse: PulseStats } = $props();
</script>

<aside class="sidebar" aria-label="sidebar">
	<section class="block">
		<header class="kicker">/// pulse</header>
		<dl class="pulse">
			<dt>last post</dt>
			<dd>{#if pulse.lastPost}<RelativeTime datetime={pulse.lastPost} />{:else}—{/if}</dd>

			<dt>last blog</dt>
			<dd>{#if pulse.lastBlog}<RelativeTime datetime={pulse.lastBlog} />{:else}—{/if}</dd>

			<dt>posts</dt>
			<dd>{pulse.posts}</dd>

			<dt>blogs</dt>
			<dd>{pulse.blogs}</dd>

			<dt>theme</dt>
			<dd>{$currentTheme}</dd>
		</dl>
	</section>

	<section class="block">
		<header class="kicker">/// elsewhere</header>
		<div class="grid">
			<a class="cell" href="https://bsky.app/profile/proto.cool" target="_blank" rel="noopener noreferrer">
				<span class="icon"><BskyIcon /></span>
				<span class="label">bsky</span>
			</a>
			<a class="cell" href="https://github.com/proto-cool" target="_blank" rel="noopener noreferrer">
				<span class="icon"><GithubLogo size={24} weight="regular" /></span>
				<span class="label">gh</span>
			</a>
			<a class="cell" href="https://steamcommunity.com/id/Protocol7/" target="_blank" rel="noopener noreferrer">
				<span class="icon"><SteamLogo size={24} weight="regular" /></span>
				<span class="label">steam</span>
			</a>
			<a class="cell" href="https://pdsls.dev/at://proto.cool" target="_blank" rel="noopener noreferrer">
				<span class="icon icon-text">at://</span>
				<span class="label">atp</span>
			</a>
			<a class="cell" href="mailto:nduncan@fastmail.com">
				<span class="icon"><EnvelopeSimple size={24} weight="regular" /></span>
				<span class="label">mail</span>
			</a>
			<a class="cell" href="/feed.xml">
				<span class="icon"><RssSimple size={24} weight="regular" /></span>
				<span class="label">rss</span>
			</a>
		</div>
	</section>
</aside>

<style>
	.sidebar {
		display: flex;
		flex-direction: column;
		gap: 22px;
		position: sticky;
		top: 96px;
		align-self: start;
	}
	.block {
		background: var(--shell-veil);
		border: 1px solid var(--color-edge);
		padding: 16px 18px 18px;
	}
	.kicker {
		font-family: var(--font-mono);
		font-size: 13px;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: var(--color-fg-dim);
		margin: 0 0 14px;
		padding-bottom: 12px;
		border-bottom: 1px solid var(--color-edge);
	}

	.pulse {
		display: grid;
		grid-template-columns: 8ch 1fr;
		gap: 7px 14px;
		margin: 0;
		font-family: var(--font-mono);
	}
	.pulse dt {
		font-size: 11px;
		letter-spacing: 0.16em;
		text-transform: lowercase;
		color: var(--color-fg-dim);
		align-self: baseline;
	}
	.pulse dd {
		margin: 0;
		font-size: 13px;
		color: var(--color-fg);
		align-self: baseline;
	}

	/* Collapsed-border control panel: each cell carries its own 1px border.
	   Negative gap on the grid + matching outer border on .grid would also
	   work; this is simpler and reads cleanly on hover. */
	.grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0;
	}
	.cell {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 14px 8px;
		border: 1px solid var(--color-edge);
		text-decoration: none;
		color: inherit;
		transition: color 100ms ease;
		/* Avoid the doubled-border effect by collapsing shared edges. */
		margin: -0.5px 0 0 -0.5px;
	}
	.cell:focus-visible {
		outline: 2px solid var(--color-cool);
		outline-offset: -2px;
	}
	.cell .icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 24px;
		color: var(--color-fg-dim);
		transition: color 100ms ease;
	}
	.cell .icon-text {
		font-family: var(--font-display);
		font-style: italic;
		font-size: 22px;
		line-height: 1;
	}
	.cell .label {
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.16em;
		text-transform: lowercase;
		color: var(--color-fg-dim);
		transition: color 100ms ease;
	}
	.cell:hover .icon { color: var(--color-warm); }
	.cell:hover .label { color: var(--color-fg); }
</style>
