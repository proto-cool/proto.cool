<script lang="ts">
	import { getContext } from 'svelte';
	import { clock } from './runtime';
	import type { ChromeData } from './chrome';

	const chrome = getContext<ChromeData>('chrome');
	let date = $derived($clock.date);
</script>

<div class="status" aria-hidden="true">
	<span class="live-dot"></span>
	<span class="lbl">LIVE</span>
	<span class="warm">{date}</span>
	<span class="cool">SIG 0X{chrome.system.sig.toUpperCase()}</span>
</div>

<style>
	.status {
		display: inline-flex;
		align-items: center;
		gap: 14px;
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		letter-spacing: 0.1em;
		color: var(--hal-dim);
		text-transform: uppercase;
	}
	.live-dot {
		width: 8px;
		height: 8px;
		border-radius: 999px;
		background: var(--hal-ember);
		box-shadow:
			0 0 6px var(--hal-hot),
			0 0 14px rgba(130, 227, 75, 0.8);
		animation: var(--glow-pulse, none);
	}
	.warm {
		color: var(--hal-warm);
	}
	.cool {
		color: var(--hal-cool);
	}
</style>
