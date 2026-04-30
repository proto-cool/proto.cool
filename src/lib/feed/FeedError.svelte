<script lang="ts">
	let { message = "couldn’t load", onretry }: { message?: string; onretry: () => void } = $props();
</script>

<p class="err" role="status" aria-live="polite">
	<span class="msg">{message}</span>
	<span class="sep" aria-hidden="true">·</span>
	<button type="button" class="retry" onclick={onretry}>retry →</button>
</p>

<style>
	.err {
		text-align: center;
		font-family: var(--font-mono);
		font-size: 12px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--color-fg-mute);
		margin: 32px 0 8px;
		display: flex;
		justify-content: center;
		align-items: baseline;
		gap: 10px;
	}
	.msg { color: var(--color-fg-dim); }
	.sep { color: var(--color-fg-mute); }
	.retry {
		background: transparent;
		border: none;
		padding: 0;
		font: inherit;
		letter-spacing: inherit;
		text-transform: inherit;
		color: var(--color-warm);
		cursor: pointer;
	}
	.retry:hover { color: var(--color-hot); }
	.retry:focus-visible {
		outline: 2px solid var(--color-warm);
		outline-offset: 2px;
	}
</style>
