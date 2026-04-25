<!-- src/routes/projects/+page.svelte -->
<svelte:head>
	<title>projects · proto.cool</title>
</svelte:head>

<h1>~/projects</h1>
<p>list of things in flight, archived, and abandoned. wired in a follow-up spec.</p>

<ul class="stub">
	<li>proto.cool v2 — TUI shell</li>
	<li>theming engine</li>
	<li>at-proto integration</li>
</ul>

<style>
	h1 {
		font-family: var(--font-display);
		font-weight: var(--weight-black);
		letter-spacing: var(--tracking-tight);
		font-size: var(--display-md);
		margin: 0 0 var(--space-4);
	}
	.stub {
		font-family: var(--font-mono);
		font-size: var(--text-sm);
		color: var(--color-fg-dim);
		padding-left: var(--space-4);
	}
</style>
