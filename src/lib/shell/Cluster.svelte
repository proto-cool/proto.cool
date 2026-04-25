<script lang="ts">
	type Row = { label: string; value: string };
	let { id, rows }: { id: string; rows: Row[] } = $props();
</script>

<div class="cluster-stub" data-id={id}>
	<div>// {id}</div>
	{#each rows as r (r.label)}
		<div>{r.label} {r.value}</div>
	{/each}
</div>
