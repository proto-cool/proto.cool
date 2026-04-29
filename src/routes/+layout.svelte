<script lang="ts">
	import '../app.css';
	import { setContext, onMount, untrack } from 'svelte';
	import favicon from '$lib/assets/favicon.svg';
	import Shell from '$lib/shell/Shell.svelte';
	import KeyboardLayer from '$lib/shell/KeyboardLayer.svelte';
	import { startRuntimeTicks, stopRuntimeTicks } from '$lib/shell/runtime';

	let { data, children } = $props();
	// chrome is request-stable (server-loaded once); untrack signals "want initial value"
	// to Svelte 5 so it doesn't warn about reading a $props field outside a reactive scope.
	setContext(
		'chrome',
		untrack(() => data.chrome)
	);
	setContext(
		'system',
		untrack(() => data.system)
	);

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
