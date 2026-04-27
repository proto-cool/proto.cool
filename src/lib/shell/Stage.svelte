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
	<StatsPanel />
</div>

<style>
	.stage {
		position: relative;
		container-type: inline-size;
		container-name: chrome;
		min-height: 100dvh;
		background: var(--hal-anthra);
		color: var(--hal-bone);
		font-family: var(--font-sans);
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}
	/* ambient screen-blended dither — sits below panels, above bg */
	.stage::before {
		content: '';
		position: absolute;
		inset: 0;
		background-image: url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4' shape-rendering='crispEdges'%3E%3Crect x='0' y='0' width='1' height='1' fill='%2382e34b' fill-opacity='0.6'/%3E%3C/svg%3E");
		background-size: 4px 4px;
		opacity: 0.07;
		pointer-events: none;
		mix-blend-mode: screen;
		z-index: 0;
	}
	.hero {
		position: relative;
		z-index: 1;
		flex: 1;
		display: flex;
		flex-direction: column;
		padding: 72px 36px 60px;
	}
@container chrome (max-width: 479px) {
	.hero {
		padding: 40px 16px 36px;
	}
}
@container chrome (min-width: 480px) and (max-width: 1023px) {
	.hero {
		padding: 56px 24px 48px;
	}
}
@container chrome (min-width: 1024px) {
	.hero {
		padding: 72px 36px 60px;
	}
}
</style>
