<script lang="ts">
	// Halo — 3D wireframe topographic mesh, one-point perspective.
	//
	// World coords: x in [0, VB_W] (left/right), y in [0, VB_H]
	// (y=0 = FAR, y=VB_H = NEAR), z = heightmap(x, y) elevation.
	//
	// Projection: vanishing point at top-center; far rows converge
	// toward it, near rows spread to full width. Z lifts points up
	// scaled by perspective so peaks deform less in the distance.
	//
	// The result is a Tron-style receding terrain grid — the mesh IS
	// the surface, and the surface IS 3D by construction.

	const VB_W = 1200;
	const VB_H = 900;

	// World extends well past the viewBox so the projected grid fills
	// the entire visible halo even at the compressed far rows.
	// (Far-row width = WORLD_X_RANGE * FAR_SCALE — needs to exceed VB_W.)
	const WORLD_X_PAD = 2800;
	const WORLD_Y_PAD = 240;
	const WORLD_X_RANGE = VB_W + WORLD_X_PAD * 2;
	const WORLD_Y_RANGE = VB_H + WORLD_Y_PAD * 2;
	const WORLD_X_START = -WORLD_X_PAD;
	const WORLD_Y_START = -WORLD_Y_PAD;

	const COLS = 60;
	const ROWS = 22;

	// Perspective tunables
	const VAN_X = VB_W / 2;
	const VAN_Y = VB_H * 0.04; // horizon — pushed near the visible top
	const NEAR_Y = VB_H * 1.05; // near plane — slightly past the bottom edge
	const FAR_SCALE = 0.2; // how compressed the far rows are (0 = collapse to point)
	const Z_LIFT = 150; // px of vertical lift per unit elevation (scaled by perspective)

	type Peak = { x: number; y: number; h: number; s: number };
	const peaks: Peak[] = [
		{ x: 200, y: 380, h: 1.2, s: 220 },
		{ x: 740, y: 220, h: 0.95, s: 260 },
		{ x: 1080, y: 580, h: 1.0, s: 220 },
		{ x: 480, y: 700, h: 1.1, s: 240 },
		{ x: 60, y: 800, h: 0.6, s: 170 },
		{ x: 980, y: 880, h: 0.55, s: 180 },
		// a depression
		{ x: 620, y: 540, h: -0.45, s: 200 }
	];

	const heightAt = (x: number, y: number): number => {
		let h =
			0.32 * Math.sin(x * 0.0044 + y * 0.0028) +
			0.22 * Math.cos(x * 0.0029 - y * 0.0046) +
			0.13 * Math.sin(x * 0.0078 + y * 0.0015);
		for (const p of peaks) {
			const dx = x - p.x;
			const dy = y - p.y;
			h += p.h * Math.exp(-(dx * dx + dy * dy) / (2 * p.s * p.s));
		}
		return h;
	};

	// One-point perspective projection. World y is normalized to
	// [0..1] across the visible viewBox span (so depth=0 at the top of
	// the viewBox and depth=1 at the bottom). Padding rows sit outside
	// that range and project past the visible area.
	const project = (x: number, y: number, z: number) => {
		const t = y / VB_H; // 0 = far/horizon, 1 = near, can go negative or >1
		const scale = FAR_SCALE + (1 - FAR_SCALE) * t;
		const sx = VAN_X + (x - VAN_X) * scale;
		const sy = VAN_Y + (NEAR_Y - VAN_Y) * t - z * Z_LIFT * scale;
		return { sx, sy, scale };
	};

	type Pt = { sx: number; sy: number; scale: number; h: number };
	const grid: Pt[][] = [];
	for (let r = 0; r <= ROWS; r++) {
		grid[r] = [];
		for (let c = 0; c <= COLS; c++) {
			const x = WORLD_X_START + (c / COLS) * WORLD_X_RANGE;
			const y = WORLD_Y_START + (r / ROWS) * WORLD_Y_RANGE;
			const h = heightAt(x, y);
			grid[r][c] = { ...project(x, y, h), h };
		}
	}

	// Smooth path through grid points using Catmull-Rom → cubic Bezier
	// conversion (tension 0.5). Endpoints duplicate themselves so the
	// curve's tangents at the ends match the segment direction.
	const polyline = (pts: Pt[]) => {
		if (pts.length < 2) return '';
		let d = `M ${pts[0].sx.toFixed(1)} ${pts[0].sy.toFixed(1)}`;
		for (let i = 0; i < pts.length - 1; i++) {
			const p0 = pts[i - 1] ?? pts[i];
			const p1 = pts[i];
			const p2 = pts[i + 1];
			const p3 = pts[i + 2] ?? p2;
			const cp1x = p1.sx + (p2.sx - p0.sx) / 6;
			const cp1y = p1.sy + (p2.sy - p0.sy) / 6;
			const cp2x = p2.sx - (p3.sx - p1.sx) / 6;
			const cp2y = p2.sy - (p3.sy - p1.sy) / 6;
			d +=
				` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)},` +
				` ${cp2x.toFixed(1)} ${cp2y.toFixed(1)},` +
				` ${p2.sx.toFixed(1)} ${p2.sy.toFixed(1)}`;
		}
		return d;
	};

	// Horizontal wires (constant r) — depth determines brightness
	const hWires = grid.map((row, r) => ({
		d: polyline(row),
		t: r / ROWS // 0 = far, 1 = near
	}));

	// Vertical wires (constant c)
	const vWires = Array.from({ length: COLS + 1 }, (_, c) => ({
		d: polyline(grid.map((row) => row[c]))
	}));
</script>

<div class="halo" aria-hidden="true">
	<div class="dust"></div>
	<svg class="mesh" viewBox="0 0 {VB_W} {VB_H}" preserveAspectRatio="none">
		<g class="wires">
			{#each vWires as w, i (i)}
				<path class="wire v" d={w.d} />
			{/each}
			{#each hWires as w, i (i)}
				<path class="wire h" d={w.d} style="--depth: {w.t.toFixed(3)}" />
			{/each}
		</g>
	</svg>
</div>

<style>
	/* Halo box: spans the full visible chrome width (the stage is full
	   viewport width with overflow:hidden, and 100cqw resolves against it).
	   Centered on .intro — which shares the stage's horizontal center
	   because .hero is margin-inline:auto. Top extends past the fixed
	   header to viewport top; bottom stays at .intro bottom. */
	.halo {
		position: absolute;
		top: -200px;
		bottom: 0;
		left: 50%;
		width: 100cqw;
		transform: translateX(-50%);
		pointer-events: none;
		overflow: hidden;
	}
	.halo > * {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}
	.dust,
	.mesh {
		mix-blend-mode: screen;
	}

	.dust {
		/* Medium-density dither tile (was sparse), scaled up so each
		   "pixel" is 2x2 — chunkier 1-bit grain, less of a fine sand
		   texture, more of a CRT-aperture feel.
		   Mask composes the dither pattern with a directional fade. */
		background-color: var(--color-hot);
		-webkit-mask-image: var(--dither-mask-medium),
			linear-gradient(
				120deg,
				rgba(0, 0, 0, 0.7) 0%,
				rgba(0, 0, 0, 0.45) 28%,
				rgba(0, 0, 0, 0.22) 60%,
				transparent 92%
			);
		mask-image: var(--dither-mask-medium),
			linear-gradient(
				120deg,
				rgba(0, 0, 0, 0.7) 0%,
				rgba(0, 0, 0, 0.45) 28%,
				rgba(0, 0, 0, 0.22) 60%,
				transparent 92%
			);
		-webkit-mask-size: 8px 8px, 100% 100%;
		mask-size: 8px 8px, 100% 100%;
		-webkit-mask-repeat: repeat, no-repeat;
		mask-repeat: repeat, no-repeat;
		-webkit-mask-composite: source-in;
		mask-composite: intersect;
		opacity: 0.18;
	}

	.mesh {
		overflow: visible;
		-webkit-mask-image: linear-gradient(
			122deg,
			rgba(0, 0, 0, 0.95) 0%,
			rgba(0, 0, 0, 0.82) 40%,
			rgba(0, 0, 0, 0.62) 70%,
			rgba(0, 0, 0, 0.45) 100%
		);
		mask-image: linear-gradient(
			122deg,
			rgba(0, 0, 0, 0.95) 0%,
			rgba(0, 0, 0, 0.82) 40%,
			rgba(0, 0, 0, 0.62) 70%,
			rgba(0, 0, 0, 0.45) 100%
		);
	}

	.wire {
		fill: none;
		vector-effect: non-scaling-stroke;
		stroke-linejoin: round;
	}
	/* Vertical wires — the "spokes" radiating from the vanishing point.
	   Uniform brightness so the perspective convergence reads cleanly.
	   Same hue as the horizontals — the grid reads as one mesh. */
	.wire.v {
		stroke: var(--color-hot);
		stroke-opacity: 0.32;
		stroke-width: 0.7;
	}
	/* Horizontal wires — depth-based brightness + width so the near
	   rows pop forward and far rows recede toward the horizon. */
	.wire.h {
		stroke: var(--color-hot);
		stroke-opacity: calc(0.12 + 0.4 * var(--depth));
		stroke-width: calc(0.6px + 0.6px * var(--depth));
	}

	/* Light mode — multiply blend so deep ink stamps onto paper
	   instead of vanishing under screen blend. */
	:global([data-theme$='-light']) .dust,
	:global([data-theme$='-light']) .mesh {
		mix-blend-mode: multiply;
	}
	:global([data-theme$='-light']) .wire.v {
		stroke-opacity: 0.18;
	}
	:global([data-theme$='-light']) .wire.h {
		stroke-opacity: calc(0.14 + 0.36 * var(--depth));
	}
</style>
