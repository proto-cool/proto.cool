<script lang="ts">
	import HeroLockup from '$lib/shell/HeroLockup.svelte';
	import Halo from '$lib/shell/Halo.svelte';
	import InstrumentCluster from '$lib/shell/InstrumentCluster.svelte';
</script>

<svelte:head>
	<title>content · proto.cool</title>
</svelte:head>

<div class="page">
	<Halo />
	<HeroLockup
		line1="an indexed"
		emphasis="indexed"
		line2="personal archive"
		punct="."
	>
		{#snippet deck()}
			a personal site, kept in the open — <b>posts, projects, ephemera</b>.
			longform lives in the pds, indexed and instrumented from here.
		{/snippet}
	</HeroLockup>
	<InstrumentCluster />
</div>

<style>
	.page {
		position: relative;
		display: grid;
		grid-template-columns: 1fr 280px;
		gap: 36px;
		align-items: center;
		min-height: 420px;
		flex: 1;
	}
</style>
