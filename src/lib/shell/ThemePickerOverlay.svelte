<script lang="ts">
	import Overlay from './Overlay.svelte';
	import { themes, setTheme, setMode, type ThemeId, type Mode } from '$lib/theme';
	import { closeOverlay } from './overlay';

	const modes: Mode[] = ['dark', 'light', 'system'];

	function pickTheme(id: ThemeId) {
		setTheme(id);
		closeOverlay();
	}
	function pickMode(m: Mode) {
		setMode(m);
		closeOverlay();
	}
</script>

<Overlay title="theme picker">
	<div class="row">
		<span class="label">// theme</span>
		{#each themes as t (t.id)}
			<button type="button" class="btn" onclick={() => pickTheme(t.id as ThemeId)}>
				{t.name}
			</button>
		{/each}
	</div>
	<div class="row">
		<span class="label">// mode</span>
		{#each modes as m (m)}
			<button type="button" class="btn" onclick={() => pickMode(m)}>{m}</button>
		{/each}
	</div>
</Overlay>

<style>
	.row {
		display: flex;
		gap: 6px;
		align-items: center;
		flex-wrap: wrap;
	}
	.row + .row {
		margin-top: 12px;
	}
	.label {
		color: var(--color-fg-mute);
		min-width: 70px;
		letter-spacing: var(--tracking-wide);
	}
	.btn {
		font: inherit;
		padding: 4px 10px;
		background: transparent;
		color: var(--color-fg);
		border: 1px solid var(--color-edge);
		cursor: pointer;
	}
	.btn:hover {
		border-color: var(--color-accent);
		color: var(--color-accent);
	}
	.btn:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}
</style>
