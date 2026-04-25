<script lang="ts">
	export type ClusterRow = { label: string; value: string };

	let {
		id,
		rows,
		minWidth = 150
	}: { id: string; rows: ClusterRow[]; minWidth?: number } = $props();
</script>

<section class="cluster" style:min-width={`${minWidth}px`} aria-label={id}>
	<header class="cluster-header">// {id}</header>
	<div class="cluster-body">
		{#each rows as r (r.label)}
			<div class="row">
				<span class="row-label">{r.label}</span>
				<span class="row-value">{r.value}</span>
			</div>
		{/each}
	</div>
</section>

<style>
	.cluster {
		display: flex;
		flex-direction: column;
		border: 1px solid color-mix(in srgb, var(--color-accent) 55%, transparent);
		background: color-mix(in srgb, var(--color-bg) 70%, transparent);
		font-family: var(--font-mono);
		font-size: var(--text-xs);
	}
	.cluster-header {
		padding: 4px 8px;
		background: color-mix(in srgb, var(--color-accent) 12%, transparent);
		color: var(--color-fg-dim);
		border-bottom: 1px solid color-mix(in srgb, var(--color-accent) 35%, transparent);
		letter-spacing: var(--tracking-wide);
	}
	.cluster-body {
		padding: 6px 8px 8px;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.row {
		display: grid;
		grid-template-columns: 56px 1fr;
		gap: 8px;
	}
	.row-label {
		color: var(--color-fg-mute);
	}
	.row-value {
		color: var(--color-accent);
	}
</style>
