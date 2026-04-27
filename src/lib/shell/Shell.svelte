<script lang="ts">
	import type { Snippet } from 'svelte';
	import Stage from './Stage.svelte';

	let { children }: { children: Snippet } = $props();
</script>

<Stage>
	{@render children()}
</Stage>
