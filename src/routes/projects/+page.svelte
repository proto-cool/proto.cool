<script lang="ts">
	import HeroLockup from '$lib/shell/HeroLockup.svelte';
	import Halo from '$lib/shell/Halo.svelte';
	import InstrumentCluster from '$lib/shell/InstrumentCluster.svelte';
</script>

<svelte:head>
	<title>projects · proto.cool</title>
</svelte:head>

<div class="page">
	<Halo />
	<HeroLockup line1="things in" line2="flight" punct=".">
		{#snippet deck()}
			projects in flight, archived, abandoned. wired in a follow-up spec.
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
@container chrome (max-width: 767px) {
	.page {
		grid-template-columns: 1fr;
		gap: 24px;
		min-height: auto;
	}
}
</style>
