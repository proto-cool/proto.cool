<script lang="ts">
	import Logoblock from './Logoblock.svelte';
	import ClusterBar from './ClusterBar.svelte';
	import NavTabs from './NavTabs.svelte';
	import ContentFrame from './ContentFrame.svelte';
	import PromptBar from './PromptBar.svelte';
	import Statusbar from './Statusbar.svelte';

	let { children } = $props();
</script>

<div class="chrome-zone">
	<header class="chrome-region cluster-row">
		<Logoblock />
		<ClusterBar />
	</header>

	<NavTabs />

	<main class="content-region">
		<ContentFrame>
			{@render children()}
		</ContentFrame>
	</main>

	<PromptBar />
</div>

<Statusbar />

<style>
	.cluster-row {
		display: flex;
		gap: 16px;
		flex-wrap: wrap;
		align-items: stretch;
	}
</style>
