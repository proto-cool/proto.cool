<script lang="ts">
	import type { Snippet } from 'svelte';
	import NavPanel from './NavPanel.svelte';
	import StatsPanel from './StatsPanel.svelte';

	let { children }: { children: Snippet } = $props();
</script>

<div class="stage">
	<NavPanel />
	<main class="hero">
		{@render children()}
	</main>
	<div class="horizon" aria-hidden="true"></div>
	<!-- StatsPanel renders position:fixed at viewport bottom (HUD flavor) -->
	<StatsPanel />
</div>

<style>
	.stage {
		position: relative;
		container-type: inline-size;
		container-name: chrome;
		min-height: 100dvh;
		background: var(--color-bg);
		color: var(--color-fg);
		font-family: var(--font-sans);
		display: flex;
		flex-direction: column;
		/* clip-path instead of overflow:hidden — both clip the halo, but
		   overflow:hidden establishes a non-scrolling scroll container that
		   breaks position:sticky for descendants (e.g. the home sidebar). */
		clip-path: inset(0);
	}
	.hero {
		position: relative;
		z-index: 1;
		flex: 1 0 auto;
		width: 100%;
		max-width: 1200px;
		margin-inline: auto;
		display: flex;
		flex-direction: column;
		gap: 24px;
		/* top padding clears the fixed nav at its expanded size */
		padding: 96px 40px 48px;
	}

	/* slim transition between content and footer */
	.horizon {
		position: relative;
		z-index: 2;
		height: 14px;
		pointer-events: none;
	}
	.horizon::before {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		height: 1px;
		background: linear-gradient(
			90deg,
			transparent 0,
			color-mix(in srgb, var(--color-hot) 10%, transparent) 25%,
			color-mix(in srgb, var(--color-hot) 18%, transparent) 50%,
			color-mix(in srgb, var(--color-hot) 10%, transparent) 75%,
			transparent 100%
		);
	}
	.horizon::after {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		bottom: 1px;
		height: 5px;
		background-image: repeating-linear-gradient(
			90deg,
			transparent 0,
			transparent 63px,
			color-mix(in srgb, var(--color-hot) 16%, transparent) 63px,
			color-mix(in srgb, var(--color-hot) 16%, transparent) 64px,
			transparent 64px,
			transparent 128px
		);
		-webkit-mask-image: linear-gradient(180deg, transparent 0, #000 100%);
		mask-image: linear-gradient(180deg, transparent 0, #000 100%);
	}

	@container chrome (max-width: 479px) {
		.hero {
			padding: 76px 16px 36px;
			gap: 16px;
		}
	}
	@container chrome (min-width: 480px) and (max-width: 1023px) {
		.hero {
			padding: 88px 28px 40px;
			gap: 20px;
		}
	}
	@container chrome (min-width: 1024px) {
		.hero {
			padding: 96px 40px 48px;
		}
	}
</style>
