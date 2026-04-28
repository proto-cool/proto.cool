<script lang="ts">
	import HeroSection from '$lib/shell/HeroSection.svelte';
</script>

<svelte:head>
	<title>about · proto.cool</title>
</svelte:head>

<article class="about">
	<HeroSection
		mark="03"
		line1="kept in the"
		emphasis="kept"
		line2="open"
		ariaLabel="proto.cool — about"
	>
		{#snippet deck()}
			proto.cool is a personal terminal somebody (<b>protocol7</b>) built for themselves on top of
			the at protocol. real content lands in the federated feed spec.
		{/snippet}
	</HeroSection>
</article>

<style>
	.about {
		display: contents;
	}
</style>
