<script lang="ts">
	import BrandBadge from './BrandBadge.svelte';
	import ChannelPads from './ChannelPads.svelte';
	import StatusStrip from './StatusStrip.svelte';
</script>

<header class="nav-panel">
	<BrandBadge />
	<ChannelPads />
	<StatusStrip />
</header>

<style>
	.nav-panel {
		position: relative;
		z-index: 3;
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: 24px;
		padding: 14px 28px;
		background: linear-gradient(180deg, #0d130c 0%, var(--hal-anthra-3) 100%);
		border-bottom: 1px solid var(--hal-edge);
		box-shadow:
			inset 0 1px 0 rgba(184, 255, 90, 0.1),
			inset 0 -1px 0 rgba(184, 255, 90, 0.05),
			0 6px 22px rgba(0, 0, 0, 0.55);
	}
	/* corner bracket marks at panel ends */
	.nav-panel::before,
	.nav-panel::after {
		content: '';
		position: absolute;
		top: 6px;
		width: 10px;
		height: 10px;
		border: 0 solid var(--hal-hot);
		box-shadow: 0 0 4px rgba(184, 255, 90, 0.5);
		opacity: 0.6;
		pointer-events: none;
	}
	.nav-panel::before {
		left: 8px;
		border-top-width: 1.5px;
		border-left-width: 1.5px;
	}
	.nav-panel::after {
		right: 8px;
		border-top-width: 1.5px;
		border-right-width: 1.5px;
	}

	/* center the channel pads in the middle column */
	.nav-panel :global(.channels) {
		justify-self: center;
	}
	@container chrome (max-width: 767px) {
		.nav-panel {
			grid-template-columns: 1fr auto;
			gap: 12px;
			padding: 10px 16px;
		}
		.nav-panel :global(.channels) {
			grid-column: 1 / -1;
			grid-row: 2;
			justify-self: stretch;
			flex-wrap: wrap;
		}
		.nav-panel :global(.status) {
			font-size: 10px;
			gap: 8px;
		}
		.nav-panel :global(.status .cool) {
			display: none; /* drop sig on small */
		}
	}
</style>
