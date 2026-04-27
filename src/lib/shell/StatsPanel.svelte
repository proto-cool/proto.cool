<script lang="ts">
	import { getContext } from 'svelte';
	import type { ChromeData } from './chrome';

	const chrome = getContext<ChromeData>('chrome');

	// VOL is cosmetic (issue / volume motif). Bumped when the visual identity
	// changes; tied to release rather than calendar.
	const VOL = '02';
	const ISSUE = '04';
	const EST = 'MMXXVI';
	const MODE_LABEL = 'ARCHIVE';
</script>

<footer class="stats-panel" aria-hidden="true">
	<div class="cell">
		<span class="pip"></span><span class="lab">VOL</span>
		<b class="glow">{VOL} / № {ISSUE}</b>
	</div>
	<div class="cell"><span class="lab">EST</span><b>{EST}</b></div>
	<div class="cell"><span class="lab">NET</span><b class="cool">ATPROTO</b></div>
	<div class="cell"><span class="lab">BUILD</span><b class="glow">0x{chrome.system.sig.toUpperCase().slice(0, 4)}</b></div>
	<div class="cell"><span class="lab">MODE</span><b>{MODE_LABEL}</b></div>
	<div class="cell"><span class="lab">↳</span><b>{chrome.identity.user}@{chrome.identity.host}</b></div>
</footer>

<style>
	.stats-panel {
		position: relative;
		z-index: 3;
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		letter-spacing: 0.08em;
		color: var(--hal-dim);
		background: linear-gradient(180deg, var(--hal-anthra-3) 0%, #0d130c 100%);
		border-top: 1px solid var(--hal-edge);
		box-shadow:
			inset 0 1px 0 rgba(184, 255, 90, 0.05),
			inset 0 -1px 0 rgba(184, 255, 90, 0.1),
			0 -6px 22px rgba(0, 0, 0, 0.55);
		padding: 0 12px;
	}
	.stats-panel::before,
	.stats-panel::after {
		content: '';
		position: absolute;
		bottom: 6px;
		width: 10px;
		height: 10px;
		border: 0 solid var(--hal-hot);
		box-shadow: 0 0 4px rgba(184, 255, 90, 0.5);
		opacity: 0.6;
		pointer-events: none;
	}
	.stats-panel::before {
		left: 8px;
		border-bottom-width: 1.5px;
		border-left-width: 1.5px;
	}
	.stats-panel::after {
		right: 8px;
		border-bottom-width: 1.5px;
		border-right-width: 1.5px;
	}
	.cell {
		padding: 14px 14px;
		display: flex;
		gap: 8px;
		align-items: baseline;
	}
	.cell + .cell {
		border-left: 1px dotted var(--hal-edge);
	}
	.cell b {
		font-weight: 400;
		color: var(--hal-bone);
	}
	.cell .glow {
		color: var(--hal-warm);
		text-shadow: 0 0 6px rgba(184, 255, 90, 0.5);
	}
	.cell .cool {
		color: var(--hal-cool);
	}
	.pip {
		width: 6px;
		height: 6px;
		border-radius: 999px;
		background: var(--hal-hot);
		box-shadow: 0 0 6px var(--hal-hot);
		align-self: center;
	}
@container chrome (max-width: 767px) {
	.stats-panel {
		grid-template-columns: repeat(2, 1fr);
	}
	.stats-panel .cell:nth-child(n + 5) {
		display: none;
	}
}
@container chrome (min-width: 768px) and (max-width: 1023px) {
	.stats-panel {
		grid-template-columns: repeat(3, 1fr);
	}
	.stats-panel .cell:nth-child(n + 7) {
		display: none;
	}
}
</style>
