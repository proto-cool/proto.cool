<script lang="ts">
	import '../app.css';
	import { setContext, onMount } from 'svelte';
	import favicon from '$lib/assets/favicon.svg';
	import Shell from '$lib/shell/Shell.svelte';
	import KeyboardLayer from '$lib/shell/KeyboardLayer.svelte';
	import { startRuntimeTicks, stopRuntimeTicks } from '$lib/shell/runtime';

	let { data, children } = $props();
	setContext('chrome', data.chrome);

	onMount(() => {
		startRuntimeTicks();
		return () => stopRuntimeTicks();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<KeyboardLayer />
<Shell>
	{@render children()}
</Shell>
