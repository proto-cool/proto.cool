<script lang="ts">
	import Overlay from './Overlay.svelte';
	import { themes, setTheme, type ThemeId } from '$lib/theme';
	import { closeOverlay } from './overlay';

	function pickTheme(id: ThemeId) {
		setTheme(id);
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
	<p class="hint">light mode and theme alternates land in a follow-up.</p>
</Overlay>

<style>
	.row {
		display: flex;
		gap: 8px;
		align-items: center;
		flex-wrap: wrap;
	}
	.label {
		color: var(--hal-dim);
		min-width: 70px;
		letter-spacing: 0.1em;
		font-family: var(--font-mono);
		text-transform: uppercase;
	}
	.btn {
		font: inherit;
		padding: 6px 12px;
		background: rgba(184, 255, 90, 0.05);
		color: var(--hal-bone);
		border: 1px solid var(--hal-edge);
		cursor: pointer;
		font-family: var(--font-mono);
		letter-spacing: 0.06em;
	}
	.btn:hover {
		border-color: var(--hal-hot);
		color: var(--hal-bone);
		box-shadow: inset 0 0 12px rgba(184, 255, 90, 0.18);
	}
	.btn:focus-visible {
		outline: 2px solid var(--hal-hot);
		outline-offset: 2px;
	}
	.hint {
		margin: 14px 0 0;
		color: var(--hal-dim);
		font-size: var(--text-xs);
		font-family: var(--font-mono);
	}
</style>
