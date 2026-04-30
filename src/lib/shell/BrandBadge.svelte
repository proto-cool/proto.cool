<script lang="ts">
	// proto.cool brand lockup. Avant-garde terminal: thick hot rail, boot lamp,
	// massive Lunema 800 wordmark with PROTO filled and COOL outlined,
	// hot accent dot, blocky cursor, and a stacked mono greeble panel.
	// Compact mode (driven by parent scroll state) shrinks for the sticky header.
	let { compact = false }: { compact?: boolean } = $props();

	const LIT_BARS = 5;
	const bars = Array.from({ length: 7 }, (_, i) => i < LIT_BARS);
</script>

<a class="badge" class:compact href="/" aria-label="proto.cool — home">
	<span class="rail" aria-hidden="true"></span>
	<span class="boot" aria-hidden="true">
		<span class="bk">[</span><span class="lamp"></span><span class="bk">]</span>
	</span>
	<span class="wordmark">
		<span class="word fill">proto</span><span class="dot">.</span><span class="word outline"
			>cool</span
		><span class="cursor" aria-hidden="true"></span>
	</span>
	<span class="meta" aria-hidden="true">
		<span class="meta-row top">
			<span class="chip">№02</span>
			<span class="sep"></span>
			<span class="tag">archive</span>
		</span>
		<span class="meta-row bot">
			<span class="bars">
				{#each bars as on, i (i)}
					<i class="b" class:on></i>
				{/each}
			</span>
			<span class="lab">live</span>
		</span>
	</span>
</a>

<style>
	.badge {
		position: relative;
		display: inline-flex;
		align-items: stretch;
		gap: 16px;
		padding: 4px 0;
		text-decoration: none;
		transition: gap 420ms cubic-bezier(0.2, 0, 0, 1);
	}
	.badge.compact {
		gap: 12px;
	}
	.badge:hover .word.fill {
		text-shadow:
			0 0 1px color-mix(in srgb, var(--color-fg) 85%, transparent),
			0 0 18px color-mix(in srgb, var(--color-hot) 55%, transparent);
	}
	.badge:focus-visible {
		outline: 2px solid var(--color-hot);
		outline-offset: 4px;
	}

	/* thick hot left rail — anchors the lockup */
	.rail {
		width: 4px;
		align-self: stretch;
		background: var(--color-warm);
		box-shadow:
			0 0 4px color-mix(in srgb, var(--color-hot) 35%, transparent),
			0 0 12px color-mix(in srgb, var(--color-warm) 18%, transparent);
	}

	/* [●] boot bracket */
	.boot {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-family: var(--font-mono);
		font-size: 22px;
		line-height: 1;
		align-self: center;
		transition:
			font-size 420ms cubic-bezier(0.2, 0, 0, 1),
			gap 420ms cubic-bezier(0.2, 0, 0, 1);
	}
	.badge.compact .boot {
		font-size: 16px;
		gap: 3px;
	}
	.boot .lamp {
		transition:
			width 420ms cubic-bezier(0.2, 0, 0, 1),
			height 420ms cubic-bezier(0.2, 0, 0, 1);
	}
	.badge.compact .boot .lamp {
		width: 8px;
		height: 8px;
	}
	.boot .bk {
		color: var(--color-warm);
		text-shadow: 0 0 6px color-mix(in srgb, var(--color-hot) 45%, transparent);
	}
	.boot .lamp {
		width: 11px;
		height: 11px;
		border-radius: 999px;
		background: var(--color-ember);
		box-shadow:
			0 0 8px var(--color-hot),
			0 0 22px color-mix(in srgb, var(--color-hot) 85%, transparent);
		animation: var(--glow-pulse, none);
	}

	/* huge avant-garde wordmark */
	.wordmark {
		font-family: var(--font-display);
		font-weight: 800;
		font-style: normal;
		font-size: 56px;
		letter-spacing: -0.04em;
		line-height: 0.92;
		white-space: nowrap;
		align-self: center;
		transition:
			font-size 420ms cubic-bezier(0.2, 0, 0, 1),
			letter-spacing 420ms cubic-bezier(0.2, 0, 0, 1);
	}
	.badge.compact .wordmark {
		font-size: 30px;
		letter-spacing: -0.03em;
	}
	.word.fill {
		color: var(--color-fg);
		text-shadow:
			0 0 1px color-mix(in srgb, var(--color-fg) 55%, transparent),
			0 0 14px color-mix(in srgb, var(--color-hot) 18%, transparent);
	}
	.word.outline {
		color: transparent;
		-webkit-text-stroke: 1.2px var(--color-warm);
		text-shadow: 0 0 14px color-mix(in srgb, var(--color-hot) 18%, transparent);
	}
	.dot {
		color: var(--color-hot);
		text-shadow:
			0 0 6px color-mix(in srgb, var(--color-hot) 70%, transparent),
			0 0 16px color-mix(in srgb, var(--color-warm) 35%, transparent);
	}
	.cursor {
		display: inline-block;
		vertical-align: -0.04em;
		margin-left: 8px;
		width: 0.4em;
		height: 0.78em;
		background: var(--color-cool);
		box-shadow:
			0 0 6px color-mix(in srgb, var(--color-cool) 55%, transparent),
			0 0 12px color-mix(in srgb, var(--color-warm) 22%, transparent);
		animation: cursor-blink 1.1s steps(1, end) infinite;
	}

	/* stacked mono greeble panel */
	.meta {
		display: inline-flex;
		flex-direction: column;
		justify-content: center;
		gap: 6px;
		padding-left: 16px;
		border-left: 1px solid var(--color-edge);
		font-family: var(--font-mono);
		font-size: 11px;
		line-height: 1;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		opacity: 1;
		transform: translateX(0);
		transition:
			opacity 280ms ease,
			transform 380ms cubic-bezier(0.2, 0, 0, 1);
		will-change: opacity, transform;
	}
	.badge.compact .meta {
		opacity: 0;
		transform: translateX(-12px);
	}
	.meta-row {
		display: inline-flex;
		align-items: center;
		gap: 8px;
	}
	.meta .chip {
		color: var(--color-bg);
		background: var(--color-hot);
		padding: 3px 6px 2px;
		font-weight: 400;
		box-shadow: 0 0 8px color-mix(in srgb, var(--color-hot) 50%, transparent);
	}
	.meta .sep {
		display: inline-block;
		width: 16px;
		height: 1px;
		background: var(--color-edge);
	}
	.meta .tag {
		color: var(--color-warm);
	}
	.meta .bars {
		display: inline-flex;
		gap: 2px;
		align-items: center;
	}
	.meta .bars .b {
		display: inline-block;
		width: 5px;
		height: 9px;
		background: var(--color-fg-mute);
	}
	.meta .bars .b.on {
		background: var(--color-hot);
		box-shadow: 0 0 4px color-mix(in srgb, var(--color-hot) 65%, transparent);
	}
	.meta .lab {
		color: var(--color-fg-dim);
	}

	@keyframes cursor-blink {
		0%,
		60% {
			opacity: 1;
		}
		61%,
		100% {
			opacity: 0;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.cursor {
			animation: none;
		}
	}

	/* Light mode — punch through. Solid color, no halos. */
	:global([data-theme$='-light']) .badge:hover .word.fill {
		text-shadow: none;
	}
	:global([data-theme$='-light']) .rail {
		box-shadow: none;
	}
	:global([data-theme$='-light']) .boot .bk,
	:global([data-theme$='-light']) .word.fill,
	:global([data-theme$='-light']) .word.outline,
	:global([data-theme$='-light']) .dot {
		text-shadow: none;
	}
	:global([data-theme$='-light']) .boot .lamp,
	:global([data-theme$='-light']) .meta .chip,
	:global([data-theme$='-light']) .meta .bars .b.on {
		box-shadow: none;
	}

	@container chrome (max-width: 1199px) {
		.meta {
			display: none;
		}
		.wordmark {
			font-size: 48px;
		}
	}
	@container chrome (max-width: 767px) {
		.wordmark {
			font-size: 34px;
		}
		.boot {
			font-size: 16px;
		}
		.boot .lamp {
			width: 8px;
			height: 8px;
		}
		.badge {
			gap: 10px;
		}
		.rail {
			width: 3px;
		}
	}
</style>
