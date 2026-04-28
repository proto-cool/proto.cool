<script lang="ts">
	// Topographic halo — fills the .intro hero exactly, plus extends upward
	// past the fixed header to the top of the viewport (the stage's
	// `overflow: hidden` clips the bleed at y=0).
	//
	// Render: dust (sparse 1-bit grain) + topo (irregular bezier contours).
	// No diagonal mask fade — the topo's own low-alpha strokes are subtle
	// enough; covering the whole hero is the point.

	const VB_W = 1200;
	const VB_H = 900;
	const ROWS = 36;

	const noise = (i: number, x: number) => {
		const a = Math.sin(i * 0.41 + x * 0.0036) * 20;
		const b = Math.cos(i * 0.27 + x * 0.0019) * 12;
		const c = Math.sin(i * 0.83 + x * 0.0072) * 7;
		const ridge = Math.sin(i * 0.15) * Math.cos(x * 0.0008) * 15;
		return a + b + c + ridge;
	};

	const lines = Array.from({ length: ROWS }, (_, i) => {
		const t = i / (ROWS - 1);
		const yBase = -20 + t * (VB_H + 40);
		const major = i % 5 === 0;
		const minor = i % 5 === 2;
		const xs = [0, 240, 480, 720, 960, VB_W];
		const ctrls = xs.map((x) => ({ x, y: yBase + noise(i, x) }));
		return { yBase, major, minor, ctrls };
	});

	const buildPath = (ctrls: { x: number; y: number }[]) => {
		let d = `M ${ctrls[0].x - 60} ${ctrls[0].y} `;
		for (let k = 1; k < ctrls.length; k++) {
			const cur = ctrls[k];
			const prev = ctrls[k - 1];
			const cx1 = prev.x + (cur.x - prev.x) * 0.55;
			const cy1 = prev.y;
			const cx2 = prev.x + (cur.x - prev.x) * 0.45;
			const cy2 = cur.y;
			d += `C ${cx1} ${cy1}, ${cx2} ${cy2}, ${cur.x} ${cur.y} `;
		}
		d += `L ${VB_W + 60} ${ctrls[ctrls.length - 1].y}`;
		return d;
	};
</script>

<div class="halo" aria-hidden="true">
	<div class="dust"></div>
	<svg class="topo" viewBox="0 0 {VB_W} {VB_H}" preserveAspectRatio="none">
		<g class="lines">
			{#each lines as l, i (i)}
				<path d={buildPath(l.ctrls)} class:major={l.major} class:minor={l.minor} />
			{/each}
		</g>
	</svg>
</div>

<style>
	/* Halo box: bleeds past .intro on every side. Top extends past the fixed
	   header to viewport top; left/right bleed past the stage gutter; bottom
	   stays at the .intro bottom. Stage's overflow:hidden clips overflow. */
	.halo {
		position: absolute;
		top: -200px;
		left: -200px;
		right: -200px;
		bottom: 0;
		pointer-events: none;
		overflow: hidden;
	}
	.halo > * {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		mix-blend-mode: screen;
	}

	.dust {
		background-image: var(--dither-sparse);
		background-size: 4px 4px;
		image-rendering: pixelated;
		-webkit-mask-image: linear-gradient(
			120deg,
			rgba(0, 0, 0, 0.7) 0%,
			rgba(0, 0, 0, 0.45) 28%,
			rgba(0, 0, 0, 0.22) 60%,
			transparent 92%
		);
		mask-image: linear-gradient(
			120deg,
			rgba(0, 0, 0, 0.7) 0%,
			rgba(0, 0, 0, 0.45) 28%,
			rgba(0, 0, 0, 0.22) 60%,
			transparent 92%
		);
		opacity: 0.22;
	}

	.topo {
		-webkit-mask-image: linear-gradient(
			122deg,
			rgba(0, 0, 0, 0.92) 0%,
			rgba(0, 0, 0, 0.7) 30%,
			rgba(0, 0, 0, 0.45) 55%,
			rgba(0, 0, 0, 0.22) 78%,
			transparent 95%
		);
		mask-image: linear-gradient(
			122deg,
			rgba(0, 0, 0, 0.92) 0%,
			rgba(0, 0, 0, 0.7) 30%,
			rgba(0, 0, 0, 0.45) 55%,
			rgba(0, 0, 0, 0.22) 78%,
			transparent 95%
		);
	}

	.topo .lines path {
		fill: none;
		stroke: rgba(130, 227, 75, 0.22);
		stroke-width: 1;
		vector-effect: non-scaling-stroke;
	}
	.topo .lines path.minor {
		stroke: rgba(110, 138, 92, 0.32);
		stroke-width: 0.75;
	}
	.topo .lines path.major {
		stroke: rgba(184, 255, 90, 0.32);
		stroke-width: 1.4;
	}
</style>
