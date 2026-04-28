<script lang="ts">
	// proto.cool brand lockup. Avant-garde terminal: thick hot rail, boot lamp,
	// massive Lunema 800 wordmark with PROTO filled and COOL outlined,
	// hot accent dot, blocky cursor, and a stacked mono greeble panel.
	// Compact mode (driven by parent scroll state) shrinks for the sticky header.
	let { compact = false }: { compact?: boolean } = $props();
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
				<i class="b on"></i><i class="b on"></i><i class="b on"></i><i class="b on"></i><i
					class="b on"
				></i><i class="b"></i><i class="b"></i>
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
			0 0 1px rgba(226, 245, 207, 0.85),
			0 0 18px rgba(184, 255, 90, 0.55);
	}
	.badge:focus-visible {
		outline: 2px solid var(--hal-hot);
		outline-offset: 4px;
	}

	/* thick hot left rail — anchors the lockup */
	.rail {
		width: 4px;
		align-self: stretch;
		background: var(--hal-warm);
		box-shadow:
			0 0 4px rgba(184, 255, 90, 0.35),
			0 0 12px rgba(130, 227, 75, 0.18);
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
		color: var(--hal-warm);
		text-shadow: 0 0 6px rgba(184, 255, 90, 0.45);
	}
	.boot .lamp {
		width: 11px;
		height: 11px;
		border-radius: 999px;
		background: var(--hal-ember);
		box-shadow:
			0 0 8px var(--hal-hot),
			0 0 22px rgba(184, 255, 90, 0.85);
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
		color: var(--hal-bone);
		text-shadow:
			0 0 1px rgba(226, 245, 207, 0.55),
			0 0 14px rgba(184, 255, 90, 0.18);
	}
	.word.outline {
		color: transparent;
		-webkit-text-stroke: 1.2px var(--hal-warm);
		text-shadow: 0 0 14px rgba(184, 255, 90, 0.18);
	}
	.dot {
		color: var(--hal-hot);
		text-shadow:
			0 0 6px rgba(184, 255, 90, 0.7),
			0 0 16px rgba(130, 227, 75, 0.35);
	}
	.cursor {
		display: inline-block;
		vertical-align: -0.04em;
		margin-left: 8px;
		width: 0.4em;
		height: 0.78em;
		background: var(--hal-warm);
		box-shadow:
			0 0 6px rgba(184, 255, 90, 0.45),
			0 0 12px rgba(130, 227, 75, 0.22);
		animation: cursor-blink 1.1s steps(1, end) infinite;
	}

	/* stacked mono greeble panel */
	.meta {
		display: inline-flex;
		flex-direction: column;
		justify-content: center;
		gap: 6px;
		padding-left: 16px;
		border-left: 1px solid var(--hal-edge);
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
		color: var(--hal-anthra);
		background: var(--hal-hot);
		padding: 3px 6px 2px;
		font-weight: 400;
		box-shadow: 0 0 8px rgba(184, 255, 90, 0.5);
	}
	.meta .sep {
		display: inline-block;
		width: 16px;
		height: 1px;
		background: var(--hal-edge);
	}
	.meta .tag {
		color: var(--hal-warm);
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
		background: var(--hal-deep-dim);
	}
	.meta .bars .b.on {
		background: var(--hal-hot);
		box-shadow: 0 0 4px rgba(184, 255, 90, 0.65);
	}
	.meta .lab {
		color: var(--hal-dim);
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
