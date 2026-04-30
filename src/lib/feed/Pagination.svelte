<script lang="ts">
	let {
		page,
		totalPages,
		basePath = '/'
	}: { page: number; totalPages: number; basePath?: string } = $props();

	function href(p: number): string {
		if (p <= 1) return basePath;
		const sep = basePath.includes('?') ? '&' : '?';
		return `${basePath}${sep}page=${p}`;
	}

	let pages = $derived.by(() => {
		const out: Array<number | '…'> = [];
		const w = 2;
		const lo = Math.max(2, page - w);
		const hi = Math.min(totalPages - 1, page + w);
		out.push(1);
		if (lo > 2) out.push('…');
		for (let p = lo; p <= hi; p++) out.push(p);
		if (hi < totalPages - 1) out.push('…');
		if (totalPages > 1) out.push(totalPages);
		return out;
	});
</script>

{#if totalPages > 1}
	<nav class="pager" aria-label="pagination">
		<a class="step" class:disabled={page <= 1} href={href(page - 1)} aria-label="previous page">‹</a>
		{#each pages as p, i (i)}
			{#if p === '…'}
				<span class="ellipsis">…</span>
			{:else}
				<a class="num" class:current={p === page} href={href(p)}>{p}</a>
			{/if}
		{/each}
		<a class="step" class:disabled={page >= totalPages} href={href(page + 1)} aria-label="next page">›</a>
	</nav>
{/if}

<style>
	.pager {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 14px;
		margin: 28px 0 8px;
		font-family: var(--font-mono);
		font-size: 14px;
		letter-spacing: 0.12em;
	}
	.step, .num, .ellipsis {
		color: var(--color-fg-dim);
		text-decoration: none;
		min-width: 24px;
		text-align: center;
		padding: 4px 6px;
	}
	.num:hover, .step:hover { color: var(--color-fg); }
	.num.current { color: var(--color-fg); border-bottom: 1px solid var(--color-warm); }
	.step.disabled { pointer-events: none; opacity: 0.3; }
</style>
