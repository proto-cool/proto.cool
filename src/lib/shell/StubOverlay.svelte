<script lang="ts">
	import Overlay from './Overlay.svelte';
	let { kind }: { kind: 'search' | 'command' } = $props();
	const title = $derived(kind === 'search' ? 'search' : 'command');
	const hint = $derived(
		kind === 'search'
			? 'wired in the federated content feed spec — coming soon'
			: 'command palette — coming soon'
	);
</script>

<Overlay {title}>
	<p class="msg">{hint}</p>
	<p class="dim">close with <kbd>Esc</kbd></p>
</Overlay>

<style>
	.msg {
		margin: 0 0 8px;
	}
	.dim {
		color: var(--color-fg-mute);
		margin: 0;
	}
	kbd {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		padding: 1px 4px;
		border: 1px solid var(--color-edge);
		background: var(--color-surface-2);
	}
</style>
