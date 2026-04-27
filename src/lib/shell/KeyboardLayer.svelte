<script lang="ts">
	import { onMount } from 'svelte';
	import { findCommand } from './commands';
	import { currentOverlay, closeOverlay, type OverlayKind } from './overlay';
	import HelpOverlay from './HelpOverlay.svelte';
	import ThemePickerOverlay from './ThemePickerOverlay.svelte';

	let openKind = $state<OverlayKind | null>(null);
	$effect(() => currentOverlay.subscribe((v) => (openKind = v)));

	function isFormTarget(t: EventTarget | null): boolean {
		if (!(t instanceof HTMLElement)) return false;
		return !!t.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]');
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.ctrlKey || e.metaKey || e.altKey) return;
		if (isFormTarget(e.target)) return;

		if (e.key === 'Escape') {
			if (openKind) {
				e.preventDefault();
				closeOverlay();
			}
			return;
		}

		if (openKind) return; // overlay swallows other hotkeys

		const cmd = findCommand(e.key);
		if (cmd) {
			e.preventDefault();
			cmd.run();
		}
	}

	onMount(() => {
		window.addEventListener('keydown', onKeydown);
		return () => window.removeEventListener('keydown', onKeydown);
	});
</script>

{#if openKind === 'help'}
	<HelpOverlay />
{:else if openKind === 'theme'}
	<ThemePickerOverlay />
{/if}
