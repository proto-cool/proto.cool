<script lang="ts">
	let { alt }: { alt: string } = $props();
</script>

<span class="alt-chip" aria-label={`alt text: ${alt}`}>
	<span class="badge" aria-hidden="true">ALT</span>
	<span class="text" aria-hidden="true">{alt}</span>
</span>

<style>
	.alt-chip {
		position: absolute;
		bottom: 6px;
		right: 6px;
		z-index: 2;
	}
	.badge {
		display: inline-block;
		background: rgba(10, 14, 10, 0.85);
		border: 1px solid var(--color-edge);
		color: var(--color-fg);
		font-family: var(--font-mono);
		font-size: 9px;
		letter-spacing: 0.16em;
		padding: 2px 6px;
		cursor: help;
	}
	.text {
		position: absolute;
		bottom: 28px;
		right: 0;
		min-width: 200px;
		max-width: 320px;
		background: rgba(10, 14, 10, 0.92);
		border: 1px solid var(--color-edge);
		color: var(--color-fg);
		font-family: var(--font-mono);
		font-size: 11px;
		line-height: 1.5;
		padding: 8px 10px;
		visibility: hidden;
		opacity: 0;
		transition: opacity 120ms ease, visibility 0s linear 120ms;
		pointer-events: none;
	}
	.alt-chip:hover .text,
	.alt-chip:focus-within .text,
	.alt-chip:focus .text {
		visibility: visible;
		opacity: 1;
		transition: opacity 120ms ease, visibility 0s;
	}
	.alt-chip:hover .badge,
	.alt-chip:focus-within .badge,
	.alt-chip:focus .badge {
		color: var(--color-hot);
	}
</style>
