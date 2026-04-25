<script lang="ts">
	import { getContext } from 'svelte';
	import type { ChromeData } from './chrome';

	const chrome = getContext<ChromeData>('chrome');
	const subline = `// personal terminal · v${chrome.system.build}-atproto`;
	const sigilLine = `.;:: built by ${chrome.identity.user} — sig 0x${chrome.system.sig.toUpperCase()} ::;.`;
</script>

<aside class="logoblock" aria-label="proto.cool">
	<div class="logomark">
		<span class="logo-prompt" aria-hidden="true">$</span>
		<span class="logo-mark">proto.cool</span>
		<span class="logo-cursor" aria-hidden="true"></span>
	</div>
	<div class="subline">{subline}</div>
	<div class="sigil" aria-hidden="true">{sigilLine}</div>
</aside>

<style>
	.logoblock {
		display: inline-flex;
		flex-direction: column;
		gap: 6px;
		padding: 10px 14px 12px;
		border: 1px solid var(--color-accent);
		background: color-mix(in srgb, var(--color-accent) 6%, transparent);
		box-shadow:
			0 0 0 1px var(--color-accent),
			0 0 24px color-mix(in srgb, var(--color-accent) 45%, transparent);
	}
	:global([data-mode='light']) .logoblock {
		border-color: var(--color-edge);
		box-shadow: 0 0 0 1px var(--color-edge);
		background: color-mix(in srgb, var(--color-accent) 4%, transparent);
	}

	.logomark {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		line-height: 1;
	}
	.logo-prompt {
		font-family: var(--font-mono);
		color: var(--color-accent-2);
		font-size: 30px;
		line-height: 1;
		text-shadow: var(--glow-text);
	}
	.logo-mark {
		background: var(--color-accent);
		color: var(--color-on-accent);
		font-family: var(--font-display);
		font-weight: var(--weight-black);
		font-size: 26px;
		padding: 4px 8px;
		letter-spacing: var(--tracking-tight);
		line-height: 1;
		box-shadow: var(--glow-edge);
	}
	.logo-cursor {
		display: inline-block;
		background: var(--color-accent-2);
		width: 14px;
		height: 30px;
		box-shadow: var(--glow-edge);
		animation: var(--glow-pulse);
	}

	.subline {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: var(--color-fg-dim);
		letter-spacing: var(--tracking-wide);
	}
	.sigil {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: var(--color-fg-mute);
		opacity: 0.7;
	}

	@media (prefers-reduced-motion: reduce) {
		.logo-cursor {
			animation: none;
		}
	}
</style>
