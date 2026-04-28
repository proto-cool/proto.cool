<script lang="ts">
	import { onMount } from 'svelte';
	import BrandBadge from './BrandBadge.svelte';
	import ChannelPads from './ChannelPads.svelte';
	import ThemeControls from './ThemeControls.svelte';
	import GreebleStrip from './GreebleStrip.svelte';

	let scrolled = $state(false);

	onMount(() => {
		const onScroll = () => {
			scrolled = window.scrollY > 24;
		};
		onScroll();
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	});
</script>

<header class="nav-panel" class:scrolled>
	<BrandBadge compact={scrolled} />
	<span class="gap" aria-hidden="true"></span>
	<ChannelPads />
	<GreebleStrip />
	<ThemeControls />
</header>

<style>
	.nav-panel {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 5;
		display: grid;
		grid-template-columns: auto 1fr auto auto auto;
		align-items: center;
		gap: 18px;
		padding: 16px 28px;
		background: rgba(6, 9, 6, 0.6);
		border-bottom: 1px solid var(--hal-edge);
		-webkit-backdrop-filter: blur(8px) saturate(115%);
		backdrop-filter: blur(8px) saturate(115%);
		transition:
			padding 380ms cubic-bezier(0.2, 0, 0, 1),
			gap 380ms cubic-bezier(0.2, 0, 0, 1);
		will-change: padding;
	}
	.nav-panel.scrolled {
		padding: 14px 28px 4px;
		gap: 14px;
	}

	.nav-panel::before {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		bottom: -1px;
		height: 1px;
		background: linear-gradient(
			90deg,
			transparent 0,
			rgba(184, 255, 90, 0.18) 25%,
			rgba(184, 255, 90, 0.32) 50%,
			rgba(184, 255, 90, 0.18) 75%,
			transparent 100%
		);
		opacity: 0.55;
		transition: opacity 380ms ease;
		will-change: opacity;
	}
	.nav-panel.scrolled::before {
		opacity: 1;
	}

	.gap {
		display: block;
	}

	/* right cluster scales together when scrolled (matches the old StatusStrip rhythm) */
	.nav-panel :global(.channels),
	.nav-panel :global(.theme-controls),
	.nav-panel :global(.greeble) {
		transform: scale(1) translateZ(0);
		transform-origin: right center;
		transition: transform 380ms cubic-bezier(0.2, 0, 0, 1);
		will-change: transform;
	}
	.nav-panel.scrolled :global(.channels),
	.nav-panel.scrolled :global(.theme-controls),
	.nav-panel.scrolled :global(.greeble) {
		transform: scale(0.92) translateZ(0);
	}
</style>
