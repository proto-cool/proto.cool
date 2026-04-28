<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		line1: string;
		line2: string;
		emphasis?: string; // word inside line 1 to render italic for emphasis (optional)
		punct?: string; // trailing punctuation for line 2 (rendered hot, e.g. ".")
		deck?: Snippet;
	}
	let { line1, line2, emphasis, punct, deck }: Props = $props();

	let line1Parts = $derived.by(() => {
		if (!emphasis) return { before: line1, mid: '', after: '' };
		const i = line1.indexOf(emphasis);
		if (i < 0) return { before: line1, mid: '', after: '' };
		return {
			before: line1.slice(0, i),
			mid: emphasis,
			after: line1.slice(i + emphasis.length)
		};
	});
</script>

<div class="lockup">
	<span class="l1">
		{line1Parts.before}{#if line1Parts.mid}<em>{line1Parts.mid}</em>{/if}{line1Parts.after}
	</span>
	<span class="l2"
		>{line2}{#if punct}<span class="punct">{punct}</span>{/if}</span
	>
	{#if deck}
		<div class="deck">{@render deck()}</div>
	{/if}
</div>

<style>
	.lockup {
		position: relative;
		z-index: 2;
		font-family: var(--font-display);
		font-weight: 800;
		font-style: normal;
		line-height: 0.86;
		letter-spacing: -0.04em;
		color: var(--hal-bone);
	}
	.l1 {
		display: block;
		font-size: 132px;
		text-shadow:
			0 0 1px rgba(226, 245, 207, 0.55),
			0 0 18px rgba(184, 255, 90, 0.22);
	}
	.l1 em {
		font-style: italic;
	}
	.l2 {
		display: block;
		font-size: 132px;
		color: transparent;
		-webkit-text-stroke: 1.2px var(--hal-warm);
		text-shadow: 0 0 18px rgba(184, 255, 90, 0.18);
	}
	.l2 .punct {
		color: var(--hal-hot);
		-webkit-text-stroke: 0;
		text-shadow:
			0 0 8px rgba(184, 255, 90, 0.7),
			0 0 18px rgba(130, 227, 75, 0.35);
	}
	.deck {
		margin-top: 26px;
		font-family: var(--font-sans);
		font-weight: 500;
		font-style: normal;
		font-size: var(--text-sm);
		line-height: 1.55;
		letter-spacing: 0;
		color: var(--hal-bone);
		max-width: 480px;
		/* dark halo behind text to lift it off the bright dither below */
		text-shadow:
			0 0 6px rgba(6, 9, 6, 0.85),
			0 0 14px rgba(6, 9, 6, 0.6);
	}
	.deck :global(b),
	.deck :global(strong) {
		color: var(--hal-ember);
		font-weight: 700;
	}
	@container chrome (max-width: 767px) {
		.l1,
		.l2 {
			font-size: 72px;
		}
		.deck {
			font-size: var(--text-sm);
		}
	}
	@container chrome (min-width: 768px) and (max-width: 1023px) {
		.l1,
		.l2 {
			font-size: 96px;
		}
	}
</style>
