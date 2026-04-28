<script lang="ts">
	// pure decoration. tick rule with two lit indicator pips.
	// `kind: 'tick' | 'pip-warm' | 'pip-cool'` — pip indices are static so
	// SSR and hydration agree. tick heights alternate long/short.
	type Cell = { kind: 'tick'; tall: boolean } | { kind: 'pip-warm' } | { kind: 'pip-cool' };

	const cells: Cell[] = [
		{ kind: 'tick', tall: true },
		{ kind: 'pip-warm' },
		{ kind: 'tick', tall: false },
		{ kind: 'tick', tall: true },
		{ kind: 'pip-cool' },
		{ kind: 'tick', tall: false },
		{ kind: 'tick', tall: true }
	];
</script>

<div class="greeble" aria-hidden="true">
	{#each cells as c, i (i)}
		{#if c.kind === 'tick'}
			<i class="tick" class:tall={c.tall}></i>
		{:else if c.kind === 'pip-warm'}
			<i class="pip warm"></i>
		{:else}
			<i class="pip cool"></i>
		{/if}
	{/each}
</div>

<style>
	.greeble {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		padding: 0 6px;
		min-height: 14px;
	}
	.tick {
		display: inline-block;
		width: 1px;
		background: var(--hal-deep-dim);
	}
	.tick.tall {
		height: 12px;
	}
	.tick:not(.tall) {
		height: 8px;
	}
	.pip {
		display: inline-block;
		width: 4px;
		height: 4px;
		border-radius: 999px;
	}
	.pip.warm {
		background: var(--hal-warm);
		box-shadow:
			0 0 4px var(--hal-warm),
			0 0 10px rgba(130, 227, 75, 0.55);
		animation: var(--glow-pulse, none);
	}
	.pip.cool {
		background: var(--hal-cool);
		box-shadow:
			0 0 4px var(--hal-cool),
			0 0 10px rgba(74, 210, 156, 0.45);
		animation: var(--glow-pulse, none);
	}
</style>
