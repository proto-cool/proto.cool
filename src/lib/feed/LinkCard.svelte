<script lang="ts">
	let {
		uri,
		title,
		description,
		thumb
	}: {
		uri: string;
		title: string;
		description?: string;
		thumb?: string;
	} = $props();

	let domain = $derived.by(() => {
		try { return new URL(uri).hostname.replace(/^www\./, ''); }
		catch { return uri; }
	});
</script>

<a
	class="link-card"
	href={uri}
	target="_blank"
	rel="noopener noreferrer"
	onclick={(e) => e.stopPropagation()}
>
	{#if thumb}
		<div class="thumb"><img src={thumb} alt="" loading="lazy" /></div>
	{:else}
		<div class="thumb thumb-empty" aria-hidden="true">↗</div>
	{/if}
	<div class="body">
		<p class="domain">→ {domain}</p>
		<p class="title">{title}</p>
		{#if description}
			<p class="desc">{description}</p>
		{/if}
	</div>
</a>

<style>
	.link-card {
		display: grid;
		grid-template-columns: 140px 1fr;
		border: 1px solid var(--color-edge);
		background: var(--shell-veil);
		text-decoration: none;
		color: inherit;
		overflow: hidden;
		transition: border-color var(--dur-fast) ease;
	}
	.thumb { aspect-ratio: 1; overflow: hidden; }
	.thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
	.thumb-empty {
		display: flex; align-items: center; justify-content: center;
		font-family: var(--font-mono); color: var(--color-fg-mute); font-size: 24px;
		background: var(--shell-veil-strong, var(--shell-veil));
	}
	.body { padding: 12px 14px; }
	.domain {
		font-family: var(--font-mono);
		font-size: 10px; letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--color-cool);
		margin: 0 0 4px;
	}
	.title { color: var(--color-fg); margin: 0 0 4px; line-height: 1.3; }
	.desc { color: var(--color-fg-dim); font-size: 12px; line-height: 1.4; margin: 0; }
	.link-card:hover { border-color: var(--color-fg-dim); }
	.link-card:focus-visible {
		outline: 2px solid var(--color-warm);
		outline-offset: 2px;
	}
	@container (max-width: 480px) {
		.link-card { grid-template-columns: 1fr; }
		.thumb { aspect-ratio: 16 / 9; }
	}
</style>
