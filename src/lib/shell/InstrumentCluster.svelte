<script lang="ts">
	import { getContext } from 'svelte';
	import { uptime } from './runtime';
	import { linkInfo, signalSparkline } from './instrument-data';
	import type { ChromeData } from './chrome';

	const chrome = getContext<ChromeData>('chrome');
	let up = $derived($uptime);
	let spark = $derived($signalSparkline);

	// 6 lit segments → peak → 1 medium-dither overflow → 2 sparse-dither overflow
	const meterSegs = [
		'lit',
		'lit',
		'lit',
		'lit',
		'lit',
		'lit',
		'peak',
		'fade-1',
		'fade-2',
		'fade-2'
	];
</script>

<aside class="cluster" aria-hidden="true">
	<div class="cap">
		<span>// instrument</span>
		<span class="id">CL-{chrome.system.build.replace(/\./g, '').slice(0, 4) || '0000'}</span>
	</div>
	<div class="body-pad">
		<!-- segmented meter; last 3 are dithered overflow -->
		<div class="meter">
			{#each meterSegs as cls, i (i)}
				<span class="seg {cls}"></span>
			{/each}
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
		border: 1px solid var(--color-edge);
		background: linear-gradient(180deg, color-mix(in srgb, var(--color-hot) 5%, transparent), rgba(0, 0, 0, 0));
		backdrop-filter: blur(2px);
	}
	.cap {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 8px 12px;
		border-bottom: 1px solid var(--color-edge);
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--color-fg-dim);
	}
	.cap .id {
		color: var(--color-warm);
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
		background: var(--color-surface);
		border: 1px solid var(--color-edge);
		position: relative;
	}
	.meter .seg.lit {
		background: var(--color-hot);
		border-color: var(--color-hot);
		box-shadow:
			0 0 10px color-mix(in srgb, var(--color-hot) 70%, transparent),
			inset 0 0 4px color-mix(in srgb, var(--color-ember) 45%, transparent);
	}
	.meter .seg.peak {
		background: var(--color-ember);
		border-color: var(--color-ember);
		box-shadow:
			0 0 14px color-mix(in srgb, var(--color-ember) 95%, transparent),
			0 0 30px color-mix(in srgb, var(--color-hot) 55%, transparent);
	}
	.meter .seg.fade-1,
	.meter .seg.fade-2 {
		background: transparent;
		border-color: var(--color-edge);
	}
	.meter .seg.fade-1::before {
		content: '';
		position: absolute;
		inset: 1px;
		background-color: var(--color-hot);
		-webkit-mask-image: var(--dither-mask-medium);
		mask-image: var(--dither-mask-medium);
		-webkit-mask-size: 4px 4px;
		mask-size: 4px 4px;
		-webkit-mask-repeat: repeat;
		mask-repeat: repeat;
	}
	.meter .seg.fade-2::before {
		content: '';
		position: absolute;
		inset: 1px;
		background-color: var(--color-hot);
		-webkit-mask-image: var(--dither-mask-sparse);
		mask-image: var(--dither-mask-sparse);
		-webkit-mask-size: 4px 4px;
		mask-size: 4px 4px;
		-webkit-mask-repeat: repeat;
		mask-repeat: repeat;
	}

	.readout {
		display: grid;
		grid-template-columns: auto 1fr auto;
		gap: 4px 10px;
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		border-top: 1px solid var(--color-edge);
		padding-top: 12px;
	}
	.readout .lab {
		color: var(--color-fg-dim);
		text-transform: uppercase;
		letter-spacing: 0.12em;
		font-size: 10px;
		align-self: center;
	}
	.readout .val {
		color: var(--color-fg);
	}
	.readout .val.glow {
		color: var(--color-warm);
		text-shadow: 0 0 8px color-mix(in srgb, var(--color-hot) 55%, transparent);
	}
	.readout .ind {
		width: 8px;
		height: 8px;
		border-radius: 999px;
		background: var(--color-fg-mute);
		align-self: center;
	}
	.readout .ind.on {
		background: var(--color-hot);
		box-shadow:
			0 0 6px var(--color-hot),
			0 0 12px color-mix(in srgb, var(--color-warm) 70%, transparent);
	}
	.readout .ind.cool {
		background: var(--color-cool);
		box-shadow: 0 0 6px var(--color-cool);
	}

	.minimap {
		margin-top: 6px;
		height: 56px;
		border: 1px solid var(--color-edge);
		position: relative;
		overflow: hidden;
		background: var(--color-bg);
	}
	.minimap .grid-bg {
		position: absolute;
		inset: 0;
		background-image:
			linear-gradient(to right, color-mix(in srgb, var(--color-hot) 8%, transparent) 1px, transparent 1px),
			linear-gradient(to bottom, color-mix(in srgb, var(--color-hot) 8%, transparent) 1px, transparent 1px);
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
		background: var(--color-ember);
		box-shadow:
			0 0 8px var(--color-ember),
			0 0 26px color-mix(in srgb, var(--color-ember) 85%, transparent),
			0 0 60px color-mix(in srgb, var(--color-hot) 55%, transparent);
		animation: var(--glow-pulse, none);
	}
	.minimap .label {
		position: absolute;
		left: 8px;
		bottom: 6px;
		font-family: var(--font-mono);
		font-size: 10px;
		color: var(--color-fg-dim);
		letter-spacing: 0.14em;
		text-transform: uppercase;
	}
	@container chrome (max-width: 767px) {
		.cluster {
			width: 100%;
		}
	}
</style>
