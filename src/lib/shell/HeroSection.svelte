<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import Halo from './Halo.svelte';
	import InstrumentCluster from './InstrumentCluster.svelte';

	export type HeroVariant = 'large' | 'normal' | 'compact';

	type Props = {
		variant?: HeroVariant;
		line1: string;
		line2?: string;
		emphasis?: string;
		punct?: string;
		deck?: Snippet;
		ariaLabel?: string;
		avatar?: string;
		avatarAlt?: string;
		avatarLabel?: string;
		avatarId?: string;
		mark?: string; // background numeral (e.g. "01"). Set null/empty to hide.
	};

	let {
		variant = 'normal',
		line1,
		line2,
		emphasis,
		punct = '.',
		deck,
		ariaLabel = 'proto.cool',
		avatar,
		avatarAlt = '',
		avatarLabel = 'protocol7',
		avatarId = '@proto.cool',
		mark = '01'
	}: Props = $props();

	let sectionName = $derived(page.url.pathname.split('/').filter(Boolean)[0] ?? 'index');

	let parts = $derived.by(() => {
		if (!emphasis) return { before: line1, mid: '', after: '' };
		const i = line1.indexOf(emphasis);
		if (i < 0) return { before: line1, mid: '', after: '' };
		return {
			before: line1.slice(0, i),
			mid: emphasis,
			after: line1.slice(i + emphasis.length)
		};
	});
</script>

<section
	class="intro"
	class:variant-large={variant === 'large'}
	class:variant-compact={variant === 'compact'}
	aria-label={ariaLabel}
>
	<Halo />

	{#if mark}
		<span class="bg-mark" aria-hidden="true"
			><span class="bg-num">{mark}</span><span class="bg-no">N°</span></span
		>
	{/if}

	<p class="intro-meta" aria-hidden="true">
		<span class="meta-tick"></span>
		<span class="meta-tag">vol·02</span>
		<span class="meta-div">/</span>
		<span class="meta-tag">archive</span>
		<span class="meta-div">/</span>
		<span class="meta-tag warm">est mmxxvi</span>
	</p>

	<h1 class="intro-lockup">
		<span class="lk-line lk-l1"
			>{parts.before}{#if parts.mid}<em>{parts.mid}</em>{/if}{parts.after}</span
		>
		{#if line2}
			<span class="lk-line lk-l2"
				>{line2}{#if punct}<span class="lk-dot">{punct}</span>{/if}</span
			>
		{/if}
	</h1>

	{#if deck}
		<p class="intro-deck">{@render deck()}</p>
	{/if}

	<div class="halo-foot" aria-hidden="true">
		<span class="hf-bar"></span>
		<span class="hf-label">// {sectionName}{#if mark} · {mark}{/if}</span>
		<span class="hf-rule"></span>
		<span class="hf-tick hf-tick-1"></span>
		<span class="hf-tick hf-tick-2"></span>
		<span class="hf-block"></span>
	</div>

	{#if variant !== 'compact'}
		<aside class="intro-aside" aria-label={avatar ? 'portrait' : 'live signal'}>
			{#if avatar}
				<figure class="intro-avatar">
					<span class="av-rail" aria-hidden="true">// subj 01 · 2026</span>
					<span class="av-rec" aria-hidden="true">
						<span class="av-rec-box">✓</span>
						OK
					</span>
					<span class="av-cb av-cb-tl" aria-hidden="true"></span>
					<span class="av-cb av-cb-tr" aria-hidden="true"></span>
					<span class="av-cb av-cb-bl" aria-hidden="true"></span>
					<span class="av-cb av-cb-br" aria-hidden="true"></span>
					<div class="av-frame">
						<img src={avatar} alt={avatarAlt} />
						<span class="av-scan" aria-hidden="true"></span>
						<span class="av-grid" aria-hidden="true"></span>
					</div>
				</figure>
				<ul class="av-data" aria-hidden="true">
					<li><span class="av-dl">// subject</span><span class="av-dv">{avatarLabel}</span></li>
					<li><span class="av-dl">// id</span><span class="av-dv warm">{avatarId}</span></li>
					<li><span class="av-dl">// status</span><span class="av-dv">operational</span></li>
				</ul>
			{:else}
				<InstrumentCluster />
			{/if}
		</aside>
	{/if}
</section>

<style>
	/* ============================================================
	   Base intro — used by 'normal' variant
	   ============================================================ */
	.intro {
		position: relative;
		display: grid;
		grid-template-columns: minmax(0, 1fr) 280px;
		/* meta / lockup / deck pack at top; trailing 1fr absorbs leftover space */
		grid-template-rows: auto auto auto 1fr;
		column-gap: 48px;
		row-gap: 20px;
		height: 480px;
		padding: 56px 40px 56px;
	}

	.intro-meta {
		grid-column: 1;
		grid-row: 1;
		margin: 0;
		display: inline-flex;
		align-items: center;
		gap: 10px;
		font-family: var(--font-mono);
		font-size: 11px;
		line-height: 1;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--hal-dim);
	}
	.meta-tick {
		display: inline-block;
		width: 18px;
		height: 1px;
		background: var(--hal-warm);
		box-shadow: 0 0 4px rgba(184, 255, 90, 0.4);
	}
	.meta-tag {
		color: var(--hal-bone);
	}
	.meta-tag.warm {
		color: var(--hal-warm);
	}
	.meta-div {
		color: var(--hal-deep-dim);
	}

	.intro-lockup {
		grid-column: 1;
		grid-row: 2;
		align-self: start;
		margin: 0;
		font-family: var(--font-display);
		font-weight: 800;
		font-style: normal;
		line-height: 1.02;
		letter-spacing: -0.035em;
		color: var(--hal-bone);
	}
	.lk-line {
		display: block;
		font-size: clamp(48px, 8vw, 104px);
		white-space: nowrap;
	}
	.lk-l1 {
		text-shadow:
			0 0 1px rgba(226, 245, 207, 0.55),
			0 0 18px rgba(184, 255, 90, 0.22);
	}
	.lk-l1 em {
		font-style: italic;
	}
	.lk-l2 {
		color: transparent;
		-webkit-text-stroke: 1.2px var(--hal-warm);
		text-shadow: 0 0 18px rgba(184, 255, 90, 0.18);
	}
	.lk-dot {
		color: var(--hal-hot);
		-webkit-text-stroke: 0;
		text-shadow:
			0 0 8px rgba(184, 255, 90, 0.7),
			0 0 18px rgba(130, 227, 75, 0.35);
	}

	.intro-deck {
		grid-column: 1;
		grid-row: 3;
		margin: 0;
		max-width: 640px;
		font-family: var(--font-sans);
		font-weight: 500;
		font-size: var(--text-sm);
		line-height: 1.55;
		color: var(--hal-bone);
		text-shadow:
			0 0 6px rgba(6, 9, 6, 0.85),
			0 0 14px rgba(6, 9, 6, 0.6);
	}
	.intro-deck :global(b),
	.intro-deck :global(strong) {
		color: var(--hal-ember);
		font-weight: 700;
	}

	.intro-aside {
		grid-column: 2;
		grid-row: 1 / -1;
		align-self: end;
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 14px;
		width: 100%;
	}
	.intro-aside :global(.cluster) {
		width: 100%;
	}

	/* ============================================================
	   Avatar — techy surveillance/HUD frame
	   ============================================================ */
	.intro-avatar {
		position: relative;
		margin: 0;
		width: 100%;
		isolation: isolate;
	}
	.av-frame {
		position: relative;
		border: 1px solid var(--hal-edge);
		background: var(--hal-anthra);
		overflow: hidden;
	}
	.av-frame img {
		display: block;
		width: 100%;
		aspect-ratio: 1;
		object-fit: cover;
		/* phosphor tint */
		filter: grayscale(70%) brightness(0.82) contrast(1.12) sepia(45%) hue-rotate(58deg)
			saturate(1.4);
	}
	/* CRT scanlines */
	.av-scan {
		position: absolute;
		inset: 0;
		background-image: repeating-linear-gradient(
			180deg,
			transparent 0,
			transparent 2px,
			rgba(0, 0, 0, 0.22) 2px,
			rgba(0, 0, 0, 0.22) 3px
		);
		mix-blend-mode: multiply;
		pointer-events: none;
	}
	/* fine grid mask on top of the frame */
	.av-grid {
		position: absolute;
		inset: 0;
		background-image:
			linear-gradient(to right, rgba(184, 255, 90, 0.05) 1px, transparent 1px),
			linear-gradient(to bottom, rgba(184, 255, 90, 0.05) 1px, transparent 1px);
		background-size: 24px 24px;
		mix-blend-mode: screen;
		pointer-events: none;
	}
	/* OK badge top-right, sits above the frame */
	.av-rec {
		position: absolute;
		top: 10px;
		right: 10px;
		z-index: 3;
		display: inline-flex;
		align-items: center;
		gap: 5px;
		padding: 3px 6px;
		background: rgba(6, 9, 6, 0.78);
		border: 1px solid var(--hal-warm);
		font-family: var(--font-mono);
		font-size: 9px;
		letter-spacing: 0.22em;
		color: var(--hal-warm);
	}
	.av-rec-box {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 9px;
		height: 9px;
		border: 1px solid var(--hal-warm);
		background: rgba(184, 255, 90, 0.16);
		color: var(--hal-warm);
		font-size: 8px;
		line-height: 1;
		letter-spacing: 0;
	}
	/* corner brackets */
	.av-cb {
		position: absolute;
		width: 14px;
		height: 14px;
		border: 0 solid var(--hal-hot);
		pointer-events: none;
		z-index: 2;
	}
	.av-cb-tl {
		top: -1px;
		left: -1px;
		border-top-width: 2px;
		border-left-width: 2px;
	}
	.av-cb-tr {
		top: -1px;
		right: -1px;
		border-top-width: 2px;
		border-right-width: 2px;
	}
	.av-cb-bl {
		bottom: -1px;
		left: -1px;
		border-bottom-width: 2px;
		border-left-width: 2px;
	}
	.av-cb-br {
		bottom: -1px;
		right: -1px;
		border-bottom-width: 2px;
		border-right-width: 2px;
	}
	/* datasheet — multi-row mono readout below the photo */
	.av-data {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		border: 1px solid var(--hal-edge);
		border-top: 0;
		background: linear-gradient(180deg, rgba(184, 255, 90, 0.04), rgba(0, 0, 0, 0));
	}
	.av-data li {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 12px;
		padding: 5px 10px;
		border-bottom: 1px dotted var(--hal-edge);
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.16em;
		text-transform: uppercase;
	}
	.av-data li:last-child {
		border-bottom: 0;
	}
	.av-dl {
		color: var(--hal-dim);
	}
	.av-dv {
		color: var(--hal-bone);
	}
	.av-dv.warm {
		color: var(--hal-warm);
	}

	/* vertical mono rail running up the right edge of the photo */
	.av-rail {
		position: absolute;
		top: 50%;
		right: -2px;
		transform: translate(100%, -50%) rotate(-90deg);
		transform-origin: left center;
		font-family: var(--font-mono);
		font-size: 9px;
		letter-spacing: 0.32em;
		text-transform: uppercase;
		color: var(--hal-dim);
		white-space: nowrap;
		pointer-events: none;
	}

	/* ============================================================
	   Variant: LARGE — avant-garde positioning. Each piece is
	   absolutely placed inside the hero box: meta top-left,
	   lockup vertically centered, deck bottom-left, photo
	   top-right, datasheet bottom-right (separated from photo),
	   cue bottom-right corner. The aside dissolves into the
	   parent so each child positions independently.
	   ============================================================ */
	.intro.variant-large {
		display: block;
		grid-template-columns: none;
		grid-template-rows: none;
		column-gap: 0;
		row-gap: 0;
		height: 480px;
		padding: 56px 40px;
	}

	.intro.variant-large .intro-meta {
		position: absolute;
		top: 56px;
		left: 40px;
		margin: 0;
		z-index: 2;
	}
	.intro.variant-large .intro-lockup {
		position: absolute;
		top: 96px;
		left: 40px;
		margin: 0;
		max-width: calc(100% - 360px);
		z-index: 2;
	}
	.intro.variant-large .intro-deck {
		position: absolute;
		/* sit just below the lockup — its height tracks the same clamp as .lk-line */
		top: calc(96px + clamp(98px, 16.32vw, 212px) + 20px);
		left: 40px;
		max-width: 640px;
		margin: 0;
		z-index: 2;
	}

	.intro.variant-large .intro-aside {
		position: absolute;
		top: 56px;
		right: 40px;
		width: 280px;
		display: flex;
		flex-direction: column;
		align-items: stretch;
		gap: 0;
		z-index: 3;
	}
	.intro.variant-large .av-data {
		border: 1px solid var(--hal-edge);
	}

	/* huge outline numeral — anchored top-left, peeks above the lockup.
	   Escapes the centered hero container so it stays pinned to the page edge. */
	.intro .bg-mark {
		position: absolute;
		top: 24px;
		left: calc(-32px - max(0px, (100cqw - 1200px) / 2));
		display: inline-flex;
		align-items: flex-start;
		gap: 14px;
		font-family: var(--font-display);
		font-weight: 800;
		font-style: italic;
		line-height: 0.78;
		letter-spacing: -0.06em;
		color: transparent;
		-webkit-text-stroke: 1px rgba(184, 255, 90, 0.08);
		pointer-events: none;
		z-index: 0;
		white-space: nowrap;
	}
	.bg-num {
		font-size: clamp(160px, 20vw, 320px);
	}
	.bg-no {
		font-family: var(--font-mono);
		font-size: 16px;
		letter-spacing: 0.1em;
		font-style: normal;
		line-height: 1.2;
		color: rgba(184, 255, 90, 0.16);
		-webkit-text-stroke: 0;
		margin-top: 14px;
	}

	/* ============================================================
	   Halo-foot — avant-garde divider at the bottom of every hero.
	   Flex strip: bar | label | rule (flex-grows to fill) | block.
	   Ticks are absolutely placed off the rule line.
	   ============================================================ */
	.halo-foot {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 8px;
		display: flex;
		align-items: center;
		gap: 12px;
		pointer-events: none;
		z-index: 1;
	}
	.hf-bar {
		flex: 0 0 auto;
		width: 96px;
		height: 4px;
		background: var(--hal-warm);
		box-shadow: 0 0 10px rgba(184, 255, 90, 0.5);
	}
	.hf-label {
		flex: 0 0 auto;
		font-family: var(--font-mono);
		font-size: 9px;
		letter-spacing: 0.32em;
		text-transform: uppercase;
		color: var(--hal-dim);
		line-height: 1;
		white-space: nowrap;
	}
	.hf-rule {
		flex: 1 1 auto;
		min-width: 0;
		height: 1px;
		background: linear-gradient(
			90deg,
			rgba(184, 255, 90, 0.42) 0,
			rgba(184, 255, 90, 0.28) 18%,
			transparent 35%,
			transparent 41%,
			rgba(184, 255, 90, 0.18) 44%,
			rgba(184, 255, 90, 0.34) 90%,
			rgba(184, 255, 90, 0.55) 100%
		);
	}
	.hf-tick {
		position: absolute;
		bottom: 50%;
		width: 1px;
		background: rgba(184, 255, 90, 0.5);
	}
	.hf-tick-1 {
		left: 48%;
		height: 8px;
	}
	.hf-tick-2 {
		left: 64%;
		height: 14px;
		background: rgba(184, 255, 90, 0.65);
		box-shadow: 0 0 4px rgba(184, 255, 90, 0.35);
	}
	.hf-block {
		flex: 0 0 auto;
		width: 16px;
		height: 9px;
		background: var(--hal-warm);
		opacity: 0.9;
		box-shadow: 0 0 6px rgba(184, 255, 90, 0.45);
	}

	/* ============================================================
	   Variant: COMPACT — single column, smaller, no aside
	   ============================================================ */
	.intro.variant-compact {
		grid-template-columns: minmax(0, 1fr);
		grid-template-rows: auto auto auto;
		column-gap: 0;
		row-gap: 16px;
		height: auto;
		min-height: 240px;
		padding: 32px 40px 32px;
	}
	.intro.variant-compact .intro-meta {
		grid-column: 1;
		grid-row: 1;
	}
	.intro.variant-compact .intro-lockup {
		grid-column: 1;
		grid-row: 2;
		align-self: start;
	}
	.intro.variant-compact .intro-deck {
		grid-column: 1;
		grid-row: 3;
		max-width: 720px;
	}
	.intro.variant-compact .lk-line {
		font-size: clamp(34px, 4.6vw, 56px);
		white-space: normal;
	}

	/* ============================================================
	   Mobile breakpoint — stack to single column
	   ============================================================ */
	@container chrome (max-width: 767px) {
		.intro {
			grid-template-columns: 1fr;
			grid-template-rows: auto auto auto auto;
			column-gap: 0;
			row-gap: 16px;
			height: auto;
			padding: 24px 0 32px;
		}
		.intro .intro-meta {
			grid-column: 1;
			grid-row: 1;
		}
		.intro .intro-lockup {
			grid-column: 1;
			grid-row: 2;
		}
		.intro .intro-deck {
			grid-column: 1;
			grid-row: 3;
		}
		.intro .intro-aside {
			grid-column: 1;
			grid-row: 4;
			align-self: stretch;
			align-items: stretch;
		}

		/* variant-large collapses to vertical stack on mobile */
		.intro.variant-large {
			display: flex;
			flex-direction: column;
			height: auto;
			padding: 24px 0 32px;
			gap: 16px;
		}
		.intro.variant-large .intro-meta,
		.intro.variant-large .intro-lockup,
		.intro.variant-large .intro-deck,
		.intro.variant-large .intro-avatar,
		.intro.variant-large .av-data {
			position: static;
			top: auto;
			right: auto;
			bottom: auto;
			left: auto;
			transform: none;
			width: auto;
			max-width: none;
		}
		.intro.variant-large .bg-mark {
			display: none;
		}

		.intro.variant-compact {
			padding: 20px 0 24px;
		}

		/* halo-foot collapses to bar + rule + block at narrow widths */
		.halo-foot .hf-label,
		.halo-foot .hf-tick {
			display: none;
		}
	}
</style>
