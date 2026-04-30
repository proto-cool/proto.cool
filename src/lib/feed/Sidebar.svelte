<script lang="ts">
	import { currentTheme } from '$lib/theme';
	import { relativeTime } from '$lib/relative-time';
	import type { PulseStats } from '$lib/server/pulse';

	let { pulse }: { pulse: PulseStats } = $props();

	// `relativeTime` returns an absolute date for old entries; for the pulse
	// block's tight rhythm we want a uniformly short value. Fall back to '—'
	// when missing.
	function fmt(ts: string | null): string {
		if (!ts) return '—';
		return relativeTime(ts);
	}
</script>

<aside class="sidebar" aria-label="sidebar">
	<section class="block">
		<header class="kicker">/// pulse</header>
		<dl class="pulse">
			<dt>last post</dt>
			<dd>{fmt(pulse.lastPost)}</dd>

			<dt>last blog</dt>
			<dd>{fmt(pulse.lastBlog)}</dd>

			<dt>posts</dt>
			<dd>{pulse.posts}</dd>

			<dt>blogs</dt>
			<dd>{pulse.blogs}</dd>

			<dt>theme</dt>
			<dd>{$currentTheme}</dd>
		</dl>
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
</style>
