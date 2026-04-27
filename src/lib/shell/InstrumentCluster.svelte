<script lang="ts">
	import { getContext } from 'svelte';
	import { uptime } from './runtime';
	import { linkInfo, signalSparkline } from './instrument-data';
	import type { ChromeData } from './chrome';

	const chrome = getContext<ChromeData>('chrome');
	let up = $derived($uptime);
	let spark = $derived($signalSparkline);
</script>

<aside class="cluster" aria-hidden="true">
	<div class="cap">
		<span>// instrument</span>
		<span class="id">CL-{chrome.system.build.replace(/\./g, '').slice(0, 4) || '0000'}</span>
	</div>
	<div class="body-pad">
		<!-- segmented meter; last 3 are dithered overflow -->
		<div class="meter">
			<span class="seg lit"></span>
			<span class="seg lit"></span>
			<span class="seg lit"></span>
			<span class="seg lit"></span>
			<span class="seg lit"></span>
			<span class="seg lit"></span>
			<span class="seg peak"></span>
			<span class="seg fade-1"></span>
			<span class="seg fade-2"></span>
			<span class="seg fade-2"></span>
		</div>

		<div class="readout">
			<span class="lab">rx</span><span class="ind on"></span><span class="val glow"
				>{linkInfo.rxTx} kb/s</span
			>
			<span class="lab">conn</span><span class="ind on"></span><span class="val"
				>{linkInfo.conn} / 12</span
			>
			<span class="lab">pds</span><span class="ind cool"></span><span class="val"
				>{chrome.link.pds}</span
			>
			<span class="lab">uptime</span><span class="ind on"></span><span class="val">{up}</span>
		</div>

		<div class="minimap">
			<div class="grid-bg"></div>
			<div class="dither-fill dither-dense"></div>
			<span class="pulse"></span>
			<span class="label">SIG {spark}</span>
		</div>
	</div>
</aside>

<style>
	.cluster {
		position: relative;
		z-index: 2;
		border: 1px solid var(--hal-edge);
		background: linear-gradient(180deg, rgba(184, 255, 90, 0.05), rgba(0, 0, 0, 0));
		backdrop-filter: blur(2px);
	}
	.cap {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 8px 12px;
		border-bottom: 1px solid var(--hal-edge);
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--hal-dim);
	}
	.cap .id {
		color: var(--hal-warm);
	}
	.body-pad {
		padding: 14px;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.meter {
		display: flex;
		gap: 3px;
		align-items: stretch;
	}
	.meter .seg {
		flex: 1;
		height: 14px;
		background: #0c1208;
		border: 1px solid #1a2a18;
		position: relative;
	}
	.meter .seg.lit {
		background: var(--hal-hot);
		border-color: var(--hal-hot);
		box-shadow:
			0 0 10px rgba(184, 255, 90, 0.7),
			inset 0 0 4px rgba(212, 255, 128, 0.45);
	}
	.meter .seg.peak {
		background: var(--hal-ember);
		border-color: var(--hal-ember);
		box-shadow:
			0 0 14px rgba(212, 255, 128, 0.95),
			0 0 30px rgba(184, 255, 90, 0.55);
	}
	.meter .seg.fade-1,
	.meter .seg.fade-2 {
		background: transparent;
		border-color: var(--hal-edge);
	}
	.meter .seg.fade-1::before {
		content: '';
		position: absolute;
		inset: 1px;
		background-image: var(--dither-medium);
		background-size: 4px 4px;
		image-rendering: pixelated;
	}
	.meter .seg.fade-2::before {
		content: '';
		position: absolute;
		inset: 1px;
		background-image: var(--dither-sparse);
		background-size: 4px 4px;
		image-rendering: pixelated;
	}

	.readout {
		display: grid;
		grid-template-columns: auto 1fr auto;
		gap: 4px 10px;
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		border-top: 1px solid var(--hal-edge);
		padding-top: 12px;
	}
	.readout .lab {
		color: var(--hal-dim);
		text-transform: uppercase;
		letter-spacing: 0.12em;
		font-size: 10px;
		align-self: center;
	}
	.readout .val {
		color: var(--hal-bone);
	}
	.readout .val.glow {
		color: var(--hal-warm);
		text-shadow: 0 0 8px rgba(184, 255, 90, 0.55);
	}
	.readout .ind {
		width: 8px;
		height: 8px;
		border-radius: 999px;
		background: var(--hal-deep-dim);
		align-self: center;
	}
	.readout .ind.on {
		background: var(--hal-hot);
		box-shadow:
			0 0 6px var(--hal-hot),
			0 0 12px rgba(130, 227, 75, 0.7);
	}
	.readout .ind.cool {
		background: var(--hal-cool);
		box-shadow: 0 0 6px var(--hal-cool);
	}

	.minimap {
		margin-top: 6px;
		height: 56px;
		border: 1px solid var(--hal-edge);
		position: relative;
		overflow: hidden;
		background: #050905;
	}
	.minimap .grid-bg {
		position: absolute;
		inset: 0;
		background-image:
			linear-gradient(to right, rgba(184, 255, 90, 0.08) 1px, transparent 1px),
			linear-gradient(to bottom, rgba(184, 255, 90, 0.08) 1px, transparent 1px);
		background-size: 12px 12px;
	}
	.minimap .dither-fill {
		position: absolute;
		inset: 0;
		-webkit-mask-image: linear-gradient(
			95deg,
			#000 0%,
			#000 20%,
			rgba(0, 0, 0, 0.85) 30%,
			rgba(0, 0, 0, 0.6) 45%,
			rgba(0, 0, 0, 0.35) 60%,
			rgba(0, 0, 0, 0.18) 75%,
			transparent 92%
		);
		mask-image: linear-gradient(
			95deg,
			#000 0%,
			#000 20%,
			rgba(0, 0, 0, 0.85) 30%,
			rgba(0, 0, 0, 0.6) 45%,
			rgba(0, 0, 0, 0.35) 60%,
			rgba(0, 0, 0, 0.18) 75%,
			transparent 92%
		);
		mix-blend-mode: screen;
	}
	.minimap .pulse {
		position: absolute;
		left: 22%;
		top: 50%;
		transform: translate(-50%, -50%);
		width: 14px;
		height: 14px;
		border-radius: 999px;
		background: var(--hal-ember);
		box-shadow:
			0 0 8px var(--hal-ember),
			0 0 26px rgba(212, 255, 128, 0.85),
			0 0 60px rgba(184, 255, 90, 0.55);
		animation: var(--glow-pulse, none);
	}
	.minimap .label {
		position: absolute;
		left: 8px;
		bottom: 6px;
		font-family: var(--font-mono);
		font-size: 10px;
		color: var(--hal-dim);
		letter-spacing: 0.14em;
		text-transform: uppercase;
	}
	@container chrome (max-width: 767px) {
		.cluster {
			width: 100%;
		}
	}
</style>
