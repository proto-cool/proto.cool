<script lang="ts">
	import { getContext } from 'svelte';
	import type { ChromeData } from './chrome';

	const chrome = getContext<ChromeData>('chrome');

	// VOL is cosmetic (issue / volume motif). Bumped when the visual identity
	// changes; tied to release rather than calendar.
	const VOL = '02';
	const ISSUE = '04';
</script>

<footer class="stats-panel" aria-hidden="true">
	<span class="shapes shapes-l">
		<span class="sq fill"></span>
		<span class="sq fill"></span>
		<span class="sq fill"></span>
		<span class="sq"></span>
		<span class="sq"></span>
	</span>

	<span class="line">
		<span class="seg"><span class="k">vol</span><span class="v">{VOL}</span></span>
		<span class="seg"><span class="k">no</span><span class="v">{ISSUE}</span></span>
		<span class="seg"><span class="k">net</span><span class="v warm">atproto</span></span>
		<span class="seg"
			><span class="k">build</span><span class="v"
				>0x{chrome.system.sig.toUpperCase().slice(0, 4)}</span
			></span
		>
	</span>

	<span class="ident">
		<span class="tri">▷</span>
		<span class="who">{chrome.identity.user}@{chrome.identity.host}</span>
	</span>
</footer>

<style>
	.stats-panel {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 6;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: var(--hal-dim);
		background: rgba(6, 9, 6, 0.72);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		border-top: 1px solid var(--hal-edge);
		padding: 5px 18px;
		min-height: 24px;
		pointer-events: none;
	}
	.ident {
		pointer-events: auto;
	}
	.stats-panel::before {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		top: -1px;
		height: 1px;
		background: linear-gradient(
			90deg,
			transparent 0,
			rgba(184, 255, 90, 0.35) 20%,
			rgba(184, 255, 90, 0.6) 50%,
			rgba(184, 255, 90, 0.35) 80%,
			transparent 100%
		);
		box-shadow: 0 0 6px rgba(184, 255, 90, 0.35);
		pointer-events: none;
	}

	.shapes {
		display: inline-flex;
		gap: 3px;
		align-items: center;
	}
	.sq {
		display: inline-block;
		width: 7px;
		height: 7px;
		background: transparent;
		border: 1px solid var(--hal-edge);
	}
	.sq.fill {
		background: var(--hal-hot);
		border-color: var(--hal-hot);
		box-shadow: 0 0 4px rgba(184, 255, 90, 0.6);
	}

	.line {
		display: inline-flex;
		align-items: center;
		gap: 14px;
		flex: 1;
		justify-content: center;
		min-width: 0;
		flex-wrap: wrap;
	}
	.seg {
		display: inline-flex;
		align-items: baseline;
		gap: 5px;
		white-space: nowrap;
		position: relative;
	}
	.seg + .seg::before {
		content: '◆';
		color: var(--hal-deep-dim);
		font-size: 7px;
		line-height: 1;
		margin-right: 14px;
		margin-left: -14px;
		align-self: center;
	}
	.k {
		color: var(--hal-dim);
	}
	.v {
		color: var(--hal-bone);
	}
	.v.warm {
		color: var(--hal-cool);
	}

	.ident {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		white-space: nowrap;
	}
	.tri {
		color: var(--hal-hot);
		font-size: 9px;
		line-height: 1;
		text-shadow: 0 0 4px rgba(184, 255, 90, 0.6);
	}
	.who {
		color: var(--hal-bone);
	}

	@container chrome (max-width: 1023px) {
		.stats-panel {
			padding: 6px 14px;
			gap: 12px;
		}
		.line {
			gap: 12px;
		}
		.seg + .seg::before {
			margin-right: 12px;
			margin-left: -12px;
		}
	}
	@container chrome (max-width: 767px) {
		.stats-panel {
			gap: 10px;
			padding: 6px 12px;
		}
		.shapes-l {
			display: none;
		}
		.line {
			justify-content: flex-start;
			gap: 10px;
		}
		.seg + .seg::before {
			margin-right: 10px;
			margin-left: -10px;
		}
		.ident .who {
			display: none;
		}
	}
</style>
