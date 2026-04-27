<script lang="ts">
	// proto.cool brand lockup. Always one line. Italic Lunema 800
	// inside a halogen-rimmed pill with a pulse pip. Anchors to "/".
</script>

<a class="badge" href="/" aria-label="proto.cool — home">
	<span class="pulse" aria-hidden="true"></span>
	<span class="wordmark">proto<span class="dot">.</span>cool</span>
</a>

<style>
	.badge {
		position: relative;
		display: inline-flex;
		align-items: center;
		gap: 10px;
		padding: 6px 14px;
		border: 1px solid var(--hal-hot);
		background: rgba(184, 255, 90, 0.05);
		box-shadow:
			inset 0 0 12px rgba(184, 255, 90, 0.2),
			0 0 10px rgba(184, 255, 90, 0.25);
		text-decoration: none;
	}
	.badge:hover {
		background: rgba(184, 255, 90, 0.08);
	}
	.badge:focus-visible {
		outline: 2px solid var(--hal-hot);
		outline-offset: 2px;
	}
	.pulse {
		width: 8px;
		height: 8px;
		border-radius: 999px;
		background: var(--hal-ember);
		box-shadow:
			0 0 6px var(--hal-hot),
			0 0 16px rgba(184, 255, 90, 0.7);
		animation: var(--glow-pulse, none);
	}
	.wordmark {
		font-family: var(--font-display);
		font-weight: 800;
		font-style: italic;
		font-size: 28px;
		letter-spacing: -0.025em;
		line-height: 1;
		white-space: nowrap; /* lock to one line */
		color: var(--hal-bone);
		text-shadow: var(--glow-text);
	}
	.wordmark .dot {
		color: var(--hal-hot);
		text-shadow:
			0 0 6px rgba(184, 255, 90, 0.95),
			0 0 18px rgba(130, 227, 75, 0.6);
	}
</style>
