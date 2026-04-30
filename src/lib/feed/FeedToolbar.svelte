<script lang="ts">
	type SourceVal = 'all' | 'bsky' | 'blog';
	type SortVal = 'newest' | 'oldest' | 'popular';

	type Props = {
		source: SourceVal;
		sort: SortVal;
		onchange: (next: { source: SourceVal; sort: SortVal }) => void;
	};
	let { source, sort, onchange }: Props = $props();

	function setSource(value: SourceVal) {
		if (value === source) return;
		onchange({ source: value, sort });
	}
	function setSort(value: SortVal) {
		if (value === sort) return;
		onchange({ source, sort: value });
	}
</script>

<div class="toolbar" role="group" aria-label="feed filters">
	<fieldset class="seg">
		<legend class="lbl">source</legend>
		<button type="button" class:on={source === 'all'} onclick={() => setSource('all')}>all</button>
		<button type="button" class:on={source === 'bsky'} onclick={() => setSource('bsky')}>bsky</button>
		<button type="button" class:on={source === 'blog'} onclick={() => setSource('blog')}>blog</button>
	</fieldset>
	<fieldset class="seg">
		<legend class="lbl">sort</legend>
		<button type="button" class:on={sort === 'newest'} onclick={() => setSort('newest')}>newest</button>
		<button type="button" class:on={sort === 'oldest'} onclick={() => setSort('oldest')}>oldest</button>
		<button type="button" class:on={sort === 'popular'} onclick={() => setSort('popular')}>popular</button>
	</fieldset>
</div>

<style>
	.toolbar {
		display: flex;
		flex-wrap: wrap;
		gap: 18px 24px;
		align-items: flex-end;
	}
	.seg {
		display: flex;
		align-items: center;
		gap: 6px;
		border: none;
		padding: 0;
		margin: 0;
		min-width: 0;
	}
	.lbl {
		font-family: var(--font-mono);
		font-size: 12px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--color-fg-mute);
		padding: 0 10px 0 0;
		float: none;
	}
	.seg button {
		font-family: var(--font-mono);
		font-size: 13px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		background: transparent;
		border: 1px solid var(--color-edge);
		color: var(--color-fg-dim);
		padding: 6px 12px;
		cursor: pointer;
		transition: color 120ms ease, border-color 120ms ease;
	}
	.seg button:hover {
		color: var(--color-fg);
		border-color: var(--color-fg-dim);
	}
	.seg button.on {
		color: var(--color-warm);
		border-color: var(--color-warm);
	}
	.seg button:focus-visible {
		outline: 2px solid var(--color-warm);
		outline-offset: 2px;
	}

	@container chrome (max-width: 767px) {
		.toolbar { gap: 12px 16px; }
		.seg button { padding: 5px 9px; font-size: 12px; }
	}
</style>
