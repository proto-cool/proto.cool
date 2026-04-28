<script lang="ts">
	import HeroSection from '$lib/shell/HeroSection.svelte';
</script>

<svelte:head>
	<title>projects · proto.cool</title>
</svelte:head>

<article class="projects">
	<HeroSection
		mark="02"
		line1="things in"
		emphasis="in"
		line2="flight"
		ariaLabel="proto.cool — projects"
	>
		{#snippet deck()}
			projects in flight, archived, abandoned. wired in a follow-up spec.
		{/snippet}
	</HeroSection>
</article>

<style>
	.projects {
		display: contents;
	}
</style>
