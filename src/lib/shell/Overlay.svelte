<script lang="ts">
	import { onMount, tick, type Snippet } from 'svelte';
	import { closeOverlay } from './overlay';

	let { title, children }: { title: string; children: Snippet } = $props();

	let dialogEl: HTMLDivElement;
	let prevActive: Element | null = null;

	function focusables(): HTMLElement[] {
		if (!dialogEl) return [];
		return Array.from(
			dialogEl.querySelectorAll<HTMLElement>(
				'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
			)
		);
	}

	function trap(e: KeyboardEvent) {
		if (e.key !== 'Tab') return;
		const els = focusables();
		if (els.length === 0) return;
		const first = els[0];
		const last = els[els.length - 1];
		if (e.shiftKey && document.activeElement === first) {
			e.preventDefault();
			last.focus();
		} else if (!e.shiftKey && document.activeElement === last) {
			e.preventDefault();
			first.focus();
		}
	}

	function onBackdrop(e: MouseEvent) {
		if (e.target === e.currentTarget) closeOverlay();
	}

	onMount(() => {
		prevActive = document.activeElement;
		(async () => {
			await tick();
			// Focus the first interactive element if any, otherwise fall back to the
			// dialog container itself (it has tabindex="-1") so backdrop keydown still
			// fires and the trap doesn't silently break for content-less overlays.
			(focusables()[0] ?? dialogEl)?.focus();
		})();
		return () => {
			(prevActive as HTMLElement | null)?.focus?.();
		};
	});
</script>

<div
	class="backdrop"
	role="presentation"
	onclick={onBackdrop}
	onkeydown={(e) => {
		if (e.key === 'Escape') closeOverlay();
		else trap(e);
	}}
>
	<div
		class="dialog"
		role="dialog"
		aria-modal="true"
		aria-label={title}
		bind:this={dialogEl}
		tabindex="-1"
	>
		<header class="dialog-header">{title}</header>
		<div class="dialog-body">
			{@render children()}
		</div>
	</div>
</div>

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		display: grid;
		place-items: center;
		background: color-mix(in srgb, var(--color-bg) 88%, transparent);
		z-index: var(--z-modal, 100);
	}
	.dialog {
		min-width: 320px;
		max-width: 560px;
		max-height: 80vh;
		overflow: auto;
		background: var(--color-surface);
		border: 1px solid var(--color-accent);
		box-shadow: var(--glow-edge);
		font-family: var(--font-mono);
		font-size: var(--text-sm);
	}
	.dialog-header {
		padding: 8px 12px;
		background: color-mix(in srgb, var(--color-accent) 15%, transparent);
		border-bottom: 1px solid color-mix(in srgb, var(--color-accent) 35%, transparent);
		color: var(--color-fg);
		letter-spacing: var(--tracking-wide);
	}
	.dialog-body {
		padding: 16px;
	}
</style>
