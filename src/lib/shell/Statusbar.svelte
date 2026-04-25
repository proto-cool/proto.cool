<script lang="ts">
	import { page } from '$app/state';
	import { pwdForPath, clock } from './runtime';
	import { sections } from './sections';
	import { cursorCoords, editorMode, recTimer } from './cosmetic';

	let pwd = $derived(pwdForPath(page.url.pathname));
	let activeSection = $derived(
		sections.find(
			(s) => s.href === page.url.pathname || page.url.pathname.startsWith(s.href + '/')
		)
	);
	let entriesLabel = $derived(activeSection ? `0 entries` : '');
	let theme = $derived(page.data.theme as string);
	let mode = $derived(page.data.mode as string);
</script>

<aside class="pl-bar" aria-label="status">
	<span class="pl-segment pl-knockout">$ {pwd}</span>
	{#if activeSection}
		<span class="pl-segment pl-tinted">[{activeSection.hotkey}] {activeSection.label}</span>
	{/if}
	<span class="pl-segment pl-faint">{entriesLabel}</span>

	<span class="pl-spacer"></span>

	<span class="pl-segment pl-faint" aria-hidden="true">cur {$cursorCoords}</span>
	<span class="pl-segment pl-faint" aria-hidden="true">mode {$editorMode}</span>
	<span class="pl-segment pl-faint" aria-hidden="true">
		<span class="pl-rec-dot">●</span> rec {$recTimer}
	</span>
	<span class="pl-segment pl-surface2" aria-live="polite">⌁ {theme}/{mode === 'dark' ? 'dk' : mode === 'light' ? 'lt' : 'sys'}</span>
	<span class="pl-segment pl-clock" aria-live="off">{$clock.time}</span>
</aside>

<style>
	.pl-rec-dot {
		color: var(--color-error);
		animation: var(--glow-pulse);
	}
</style>
