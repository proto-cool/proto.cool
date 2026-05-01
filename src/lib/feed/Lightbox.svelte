<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { prefersReducedMotion } from '$lib/prefers-reduced-motion';

	export type LightboxImage = { src: string; alt?: string };

	let {
		images,
		index = $bindable(0),
		onClose
	}: { images: LightboxImage[]; index?: number; onClose: () => void } = $props();

	function next() { if (index < images.length - 1) index += 1; }
	function prev() { if (index > 0) index -= 1; }

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
		else if (e.key === 'ArrowRight') next();
		else if (e.key === 'ArrowLeft') prev();
	}

	onMount(() => {
		document.addEventListener('keydown', onKey);
		return () => document.removeEventListener('keydown', onKey);
	});

	let current = $derived(images[index]);
</script>

<div
	class="overlay"
	role="dialog"
	aria-modal="true"
	aria-label="image viewer"
	tabindex="-1"
	onclick={(e) => { if (e.target === e.currentTarget) onClose(); }}
	onkeydown={(e) => { if (e.key === 'Escape') onClose(); }}
	transition:fade={{ duration: $prefersReducedMotion ? 0 : 200 }}
>
	<button class="close" type="button" aria-label="close" onclick={onClose}>×</button>
	{#if images.length > 1}
		<button class="nav prev" type="button" aria-label="previous" disabled={index === 0} onclick={prev}>‹</button>
		<button class="nav next" type="button" aria-label="next" disabled={index === images.length - 1} onclick={next}>›</button>
		<div class="counter">{index + 1} / {images.length}</div>
	{/if}
	{#key current.src}
		<img
			src={current.src}
			alt={current.alt ?? ''}
			in:fade={{ duration: $prefersReducedMotion ? 0 : 120 }}
			out:fade={{ duration: $prefersReducedMotion ? 0 : 120 }}
		/>
	{/key}
	{#if current.alt}
		<p class="alt">{current.alt}</p>
	{/if}
</div>

<style>
	.overlay {
		position: fixed; inset: 0;
		background: rgba(0, 0, 0, 0.92);
		display: flex; align-items: center; justify-content: center;
		flex-direction: column;
		z-index: var(--z-toast, 1000);
		padding: 24px;
	}
	img { max-width: 95vw; max-height: 90dvh; object-fit: contain; border: 1px solid var(--color-edge); }
	.alt {
		max-width: 80ch;
		margin: 16px 0 0;
		color: var(--color-fg);
		font-family: var(--font-mono);
		font-size: 12px;
		line-height: 1.5;
		text-align: center;
	}
	.close, .nav {
		position: absolute;
		background: rgba(10, 14, 10, 0.5);
		border: 1px solid var(--color-edge);
		color: var(--color-fg);
		font-family: var(--font-mono);
		font-size: 24px;
		width: 40px; height: 40px;
		display: flex; align-items: center; justify-content: center;
		cursor: pointer;
	}
	.close { top: 16px; right: 16px; }
	.prev { left: 16px; top: 50%; transform: translateY(-50%); }
	.next { right: 16px; top: 50%; transform: translateY(-50%); }
	.nav:disabled { opacity: 0.3; cursor: default; }
	.close:focus-visible,
	.nav:focus-visible {
		outline: 2px solid var(--color-warm);
		outline-offset: 2px;
	}
	.counter {
		position: absolute; top: 16px; left: 50%; transform: translateX(-50%);
		font-family: var(--font-mono); font-size: 12px; color: var(--color-fg-dim);
		letter-spacing: 0.16em;
	}
</style>
