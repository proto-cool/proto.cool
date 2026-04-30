<script lang="ts">
	// Phosphor-styled custom checkbox bound to a parent-owned `auto` flag.
	// Rendered alongside the FeedToolbar so the toggle is always reachable
	// regardless of auto-load activity (the LoadMore footer scrolls away
	// faster than a user can click it once auto-load is engaged).
	let { auto = $bindable() }: { auto: boolean } = $props();
</script>

<label class="auto" class:on={auto}>
	<input type="checkbox" bind:checked={auto} />
	<span class="box" aria-hidden="true"></span>
	<span class="lbl">auto-load</span>
</label>

<style>
	.auto {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		font-family: var(--font-mono);
		font-size: 12px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--color-fg-dim);
		cursor: pointer;
		user-select: none;
		transition: color 120ms ease;
	}
	.auto:hover { color: var(--color-fg); }
	.auto.on { color: var(--color-fg); }
	.lbl { line-height: 1; }
	/* Hide the native input but keep it accessible (focus, screen readers,
	   form behavior). The .box span below is the visual checkbox. */
	.auto input {
		position: absolute;
		width: 1px;
		height: 1px;
		margin: -1px;
		padding: 0;
		border: 0;
		overflow: hidden;
		clip: rect(0 0 0 0);
		white-space: nowrap;
	}
	.box {
		position: relative;
		display: inline-block;
		width: 13px;
		height: 13px;
		border: 1px solid var(--color-edge);
		background: transparent;
		transition: border-color 120ms ease, background-color 120ms ease;
	}
	.auto:hover .box { border-color: var(--color-fg-dim); }
	.auto.on .box {
		border-color: var(--color-warm);
		background: color-mix(in srgb, var(--color-warm) 18%, transparent);
	}
	.auto.on .box::after {
		content: '';
		position: absolute;
		inset: 2px;
		background: var(--color-warm);
		box-shadow: 0 0 6px color-mix(in srgb, var(--color-hot) 55%, transparent);
	}
	.auto input:focus-visible + .box {
		outline: 2px solid var(--color-warm);
		outline-offset: 2px;
	}
</style>
