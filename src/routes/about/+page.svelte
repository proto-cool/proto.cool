<script lang="ts">
	import HeroLockup from '$lib/shell/HeroLockup.svelte';
	import Halo from '$lib/shell/Halo.svelte';
	import InstrumentCluster from '$lib/shell/InstrumentCluster.svelte';
</script>

<svelte:head>
	<title>about · proto.cool</title>
</svelte:head>

<div class="page">
	<Halo />
	<HeroLockup line1="kept in the" line2="open" emphasis="open" punct=".">
		{#snippet deck()}
			proto.cool is a personal terminal somebody (protocol7) built for
			themselves on top of the at protocol. real content lands in the
			federated feed spec.
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
