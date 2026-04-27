<script lang="ts">
	// Decorative dithered halogen halo. Anchors to lower-left of parent,
	// extends well past parent bounds so the dither bleeds full-bleed.
	// Mark parent position: relative.
</script>

<div class="halo" aria-hidden="true">
	<div class="ring ring-1 dither-dense"></div>
	<div class="ring ring-2 dither-medium"></div>
	<div class="ring ring-3 dither-sparse"></div>
</div>

<style>
	.halo,
	.halo .ring {
		position: absolute;
		top: -40px;
		bottom: -40px;
		left: -160px;
		right: -120px;
		pointer-events: none;
	}
	.ring {
		mix-blend-mode: screen;
	}
	.ring-1 {
		-webkit-mask-image: radial-gradient(46% 60% at 22% 56%, #000 0%, #000 14%, transparent 26%);
		mask-image: radial-gradient(46% 60% at 22% 56%, #000 0%, #000 14%, transparent 26%);
		opacity: 0.95;
	}
	.ring-2 {
		-webkit-mask-image: radial-gradient(70% 88% at 22% 56%, #000 14%, #000 28%, transparent 42%);
		mask-image: radial-gradient(70% 88% at 22% 56%, #000 14%, #000 28%, transparent 42%);
		opacity: 0.7;
	}
	.ring-3 {
		-webkit-mask-image: radial-gradient(95% 110% at 22% 56%, #000 28%, #000 46%, transparent 64%);
		mask-image: radial-gradient(95% 110% at 22% 56%, #000 28%, #000 46%, transparent 64%);
		opacity: 0.55;
	}
</style>
