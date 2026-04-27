# Phosphor Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the heavy TUI chrome (Logoblock, ClusterBar, NavTabs, PromptBar, ContentFrame, Statusbar, gridline page background) with the phosphor-halogen + pixel-dither shell described in `docs/superpowers/specs/2026-04-27-phosphor-shell-design.md`.

**Architecture:** Three vertical bands stacked inside a `Stage` container — `NavPanel` (elevated) · hero zone (open, with dithered halogen halo + lockup + instrument cluster) · `StatsPanel` (elevated). Each Svelte component owns its CSS via scoped `<style>` blocks. A tiny `phosphor-shell.css` only carries shell-wide reduced-motion overrides. Tokens move to a halogen vocabulary (`--hal-*`) with legacy `--color-*` aliases for compatibility during the migration window.

**Tech Stack:** SvelteKit 2 + Svelte 5 (runes: `$props`, `$state`, `$effect`, `$derived`), TypeScript, vitest, container queries, CSS layers, Bayer-dither SVG data URIs.

---

## Source spec sections → tasks coverage

| Spec section                                                         | Tasks           |
| -------------------------------------------------------------------- | --------------- |
| Halogen palette + glow tokens                                        | A1, A4          |
| Bayer dither utilities                                               | A2              |
| `pulse-phosphor` keyframe                                            | A3              |
| New `phosphor-green` theme & default                                 | A4, B1          |
| `instrument-data.ts` colocated cosmetic helper                       | C1              |
| `BrandBadge` / `ChannelPads` / `StatusStrip`                         | D1, D2, D3      |
| `NavPanel` (elevated, edge-catch, drop shadow, corner brackets)      | D4              |
| `HeroLockup` (italic Lunema 800, knockout line 2, deck)              | D5              |
| `Halo` (3 dithered rings, mask-stepped)                              | D6              |
| `InstrumentCluster` (meter + readout + minimap)                      | D7              |
| `StatsPanel` (6 mono columns, edge-catch)                            | D8              |
| `Stage` (anthracite bg, ambient dither, container query)             | E1              |
| `Shell.svelte` rewrite                                               | E2              |
| Hero lockups on `/`, `/projects`, `/about`                           | E3              |
| Drop `/`, `:` chip + stubs                                           | F1, F2, F3      |
| Restyle `HelpOverlay`, `ThemePickerOverlay`                          | F3              |
| Trim `ChromeData` (drop `kernel`/`shell`)                            | G1              |
| Delete old shell components                                          | H1              |
| Delete `cosmetic.ts`, `shell.css`, `glyphs.ts(/test)`                | H1, H2          |
| Delete `neon-green.css`, `magenta-vapor.css`                         | H2              |
| Trim `glow-keyframes.css` (drop `pulse-green`, `pulse-magenta`)      | H3              |
| Container-query breakpoints (xs/sm/md/lg/xl)                         | I1              |
| Reduced motion                                                       | I2              |
| Validation & acceptance                                              | J1              |
| Out of scope (light mode, search/cmd palette, feed, animated dither) | not implemented |

---

## File structure

**New files:**

```
src/lib/theme/themes/phosphor-green.css
src/lib/shell/phosphor-shell.css
src/lib/shell/Stage.svelte
src/lib/shell/NavPanel.svelte
src/lib/shell/BrandBadge.svelte
src/lib/shell/ChannelPads.svelte
src/lib/shell/StatusStrip.svelte
src/lib/shell/HeroLockup.svelte
src/lib/shell/Halo.svelte
src/lib/shell/InstrumentCluster.svelte
src/lib/shell/StatsPanel.svelte
src/lib/shell/instrument-data.ts
src/lib/shell/instrument-data.test.ts
```

**Modified files:**

```
src/lib/theme/tokens.css
src/lib/theme/utilities.css
src/lib/theme/glow-keyframes.css
src/lib/theme/registry.ts
src/lib/shell/Shell.svelte
src/lib/shell/KeyboardLayer.svelte
src/lib/shell/commands.ts
src/lib/shell/commands.test.ts
src/lib/shell/overlay.ts
src/lib/shell/overlay.test.ts
src/lib/shell/HelpOverlay.svelte
src/lib/shell/ThemePickerOverlay.svelte
src/lib/shell/chrome.ts
src/lib/shell/chrome.test.ts
src/routes/+page.svelte
src/routes/projects/+page.svelte
src/routes/about/+page.svelte
src/app.css
```

**Deleted:**

```
src/lib/shell/Logoblock.svelte
src/lib/shell/Cluster.svelte
src/lib/shell/ClusterBar.svelte
src/lib/shell/NavTabs.svelte
src/lib/shell/ContentFrame.svelte
src/lib/shell/PromptBar.svelte
src/lib/shell/Statusbar.svelte
src/lib/shell/StubOverlay.svelte
src/lib/shell/cosmetic.ts
src/lib/shell/shell.css
src/lib/theme/themes/neon-green.css
src/lib/theme/themes/magenta-vapor.css
src/lib/theme/glyphs.ts
src/lib/theme/glyphs.test.ts
```

---

## Phase A — Theme foundation (non-breaking)

These tasks add new tokens, utilities, keyframes, and a new theme alongside the existing one. Existing components keep working because the new theme provides legacy `--color-*` aliases.

### Task A1: Add halogen panel-surface and glow tokens to `tokens.css`

**Files:** Modify `src/lib/theme/tokens.css`

- [ ] **Step 1: Append halogen panel + glow tokens after the existing `:root` block**

Open `src/lib/theme/tokens.css`. Append (after the existing `:root { … }` block, before the `@media (prefers-reduced-motion)` block):

```css
/* ==========================================================================
   Halogen tokens — shared dither tile URLs (per-theme palette overrides
   the actual fill colors via theme files).
   The dither tiles below are LIME by default; theme files may override
   the --dither-* custom properties to recolor.
   ========================================================================== */

:root {
	--dither-sparse: url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4' shape-rendering='crispEdges'%3E%3Crect x='0' y='0' width='1' height='1' fill='%23b8ff5a'/%3E%3Crect x='2' y='2' width='1' height='1' fill='%23b8ff5a'/%3E%3C/svg%3E");
	--dither-medium: url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4' shape-rendering='crispEdges'%3E%3Crect x='0' y='0' width='1' height='1' fill='%23b8ff5a'/%3E%3Crect x='2' y='0' width='1' height='1' fill='%23b8ff5a'/%3E%3Crect x='2' y='2' width='1' height='1' fill='%23b8ff5a'/%3E%3Crect x='0' y='2' width='1' height='1' fill='%23b8ff5a'/%3E%3C/svg%3E");
	--dither-dense: url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4' shape-rendering='crispEdges'%3E%3Crect x='0' y='0' width='1' height='1' fill='%23b8ff5a'/%3E%3Crect x='2' y='0' width='1' height='1' fill='%23b8ff5a'/%3E%3Crect x='1' y='1' width='1' height='1' fill='%23b8ff5a'/%3E%3Crect x='3' y='1' width='1' height='1' fill='%23b8ff5a'/%3E%3Crect x='2' y='2' width='1' height='1' fill='%23b8ff5a'/%3E%3Crect x='0' y='2' width='1' height='1' fill='%23b8ff5a'/%3E%3Crect x='1' y='3' width='1' height='1' fill='%23b8ff5a'/%3E%3Crect x='3' y='3' width='1' height='1' fill='%23b8ff5a'/%3E%3C/svg%3E");
}
```

- [ ] **Step 2: Verify the file parses**

Run: `npm run check`
Expected: passes (or only pre-existing warnings unrelated to this file).

- [ ] **Step 3: Commit**

```bash
git add src/lib/theme/tokens.css
git commit -m "theme: add bayer dither tile tokens (sparse/medium/dense)"
```

---

### Task A2: Add `.dither-*` utility classes to `utilities.css`

**Files:** Modify `src/lib/theme/utilities.css`

- [ ] **Step 1: Replace `utilities.css` with the dither utilities + the existing scanline utility**

Replace the contents of `src/lib/theme/utilities.css` with:

```css
/* src/lib/theme/utilities.css
 * Opt-in utility classes. Theme-aware via custom properties.
 */

@layer utilities {
	.bg-scanline {
		position: relative;
	}

	.bg-scanline::before {
		content: '';
		position: absolute;
		inset: 0;
		pointer-events: none;
		background-image: repeating-linear-gradient(
			0deg,
			transparent 0,
			transparent 2px,
			var(--color-accent) 2px,
			var(--color-accent) 3px
		);
		opacity: var(--scanline-opacity, 0.012);
	}

	/* ------------------------------------------------------------------
	   Bayer dither tiles. Use as background-image; tiles at 4px so the
	   pattern reads as 1-bit dither at viewing distance. Theme files may
	   override the --dither-* custom properties to recolor.
	   ------------------------------------------------------------------ */
	.dither-sparse,
	.dither-medium,
	.dither-dense {
		background-repeat: repeat;
		background-size: 4px 4px;
		image-rendering: pixelated;
	}
	.dither-sparse {
		background-image: var(--dither-sparse);
	}
	.dither-medium {
		background-image: var(--dither-medium);
	}
	.dither-dense {
		background-image: var(--dither-dense);
	}
}
```

- [ ] **Step 2: Verify**

Run: `npm run check`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/lib/theme/utilities.css
git commit -m "theme: add .dither-sparse/-medium/-dense utility classes"
```

---

### Task A3: Add `pulse-phosphor` keyframe to `glow-keyframes.css`

**Files:** Modify `src/lib/theme/glow-keyframes.css`

- [ ] **Step 1: Append `pulse-phosphor` after the existing `pulse-magenta`**

Open `src/lib/theme/glow-keyframes.css`. Append at the bottom:

```css
@keyframes pulse-phosphor {
	0%,
	100% {
		box-shadow:
			0 0 5px rgba(184, 255, 90, 0.7),
			0 0 12px rgba(130, 227, 75, 0.45);
	}
	50% {
		box-shadow:
			0 0 8px rgba(184, 255, 90, 0.95),
			0 0 22px rgba(130, 227, 75, 0.7);
	}
}
```

- [ ] **Step 2: Verify**

Run: `npm run check`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/lib/theme/glow-keyframes.css
git commit -m "theme: add pulse-phosphor keyframe"
```

---

### Task A4: Create `phosphor-green.css` theme file

**Files:** Create `src/lib/theme/themes/phosphor-green.css`

The new theme defines all `--hal-*` tokens AND maps them to the legacy `--color-*` tokens that existing components still read. This is the bridge that lets us swap themes without breaking anything.

- [ ] **Step 1: Create the file**

Write `src/lib/theme/themes/phosphor-green.css`:

```css
/* src/lib/theme/themes/phosphor-green.css
 * Default theme. Sci-fi halogen / phosphor-CRT energy.
 * Bone text on near-black green-anthracite, hot lime accents,
 * cool teal as a rare secondary. Dark-native; light mode is
 * out of scope for v1 (single block, no mode discriminator).
 */

[data-theme='phosphor-green'] {
	/* ---- halogen palette ---- */
	--hal-anthra: #060906;
	--hal-anthra-2: #0a0e0a;
	--hal-anthra-3: #0e1310;
	--hal-edge: #1d2c1a;
	--hal-warm: #82e34b;
	--hal-hot: #b8ff5a;
	--hal-ember: #d4ff80;
	--hal-bone: #e2f5cf;
	--hal-dim: #6e8a5c;
	--hal-deep-dim: #2c3a26;
	--hal-cool: #4ad29c;

	/* ---- legacy aliases (so existing color-* consumers keep working) ---- */
	--color-bg: var(--hal-anthra);
	--color-surface: var(--hal-anthra-2);
	--color-surface-2: var(--hal-anthra-3);
	--color-edge: var(--hal-edge);
	--color-fg: var(--hal-bone);
	--color-fg-dim: var(--hal-dim);
	--color-fg-mute: var(--hal-deep-dim);
	--color-accent: var(--hal-hot);
	--color-accent-2: var(--hal-cool);
	--color-on-accent: var(--hal-anthra);
	--color-link: var(--hal-bone);
	--color-link-visited: var(--hal-dim);
	--color-focus: var(--hal-hot);

	/* ---- glow tokens (halogen vocabulary) ---- */
	--glow-text:
		0 0 1px rgba(226, 245, 207, 0.95), 0 0 6px rgba(184, 255, 90, 0.55),
		0 0 22px rgba(184, 255, 90, 0.3);
	--glow-edge:
		0 0 0 1px rgba(184, 255, 90, 1), 0 0 12px rgba(184, 255, 90, 0.45),
		0 0 4px rgba(184, 255, 90, 0.55);
	--glow-panel: inset 0 1px 0 rgba(184, 255, 90, 0.1), 0 6px 22px rgba(0, 0, 0, 0.55);
	--glow-pip: 0 0 6px var(--hal-hot), 0 0 16px rgba(130, 227, 75, 0.7);
	--glow-focus:
		0 0 0 1px var(--hal-hot), 0 0 0 3px rgba(184, 255, 90, 0.4), 0 0 14px rgba(184, 255, 90, 0.55);
	--glow-pulse: pulse-phosphor 2.4s var(--ease-in-out) infinite;
}

/* Reduced motion — neutralize the pulse */
@media (prefers-reduced-motion: reduce) {
	[data-theme='phosphor-green'] {
		--glow-pulse: none;
	}
}
```

- [ ] **Step 2: Verify the file parses**

Run: `npm run check`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/lib/theme/themes/phosphor-green.css
git commit -m "theme: add phosphor-green theme (halogen palette + legacy aliases)"
```

---

## Phase B — Wire phosphor-green as the default

### Task B1: Update registry, app.css imports, and verify

**Files:** Modify `src/lib/theme/registry.ts`, `src/app.css`

- [ ] **Step 1: Update the theme registry**

Replace `src/lib/theme/registry.ts` with:

```ts
export const themes = [
	{
		id: 'phosphor-green',
		name: 'Phosphor green',
		supportedModes: ['dark'],
		default: true
	}
] as const;

export type ThemeId = (typeof themes)[number]['id'];
export type Mode = 'dark' | 'light' | 'system';

export const DEFAULT_THEME: ThemeId = 'phosphor-green';
export const DEFAULT_MODE: Mode = 'dark';
```

Notes:

- We deliberately drop `neon-green` and `magenta-vapor` from the registry now. The theme files still exist on disk; they get deleted in Task H2. Cookies that reference the old themes resolve to the default through `resolveTheme`.
- `DEFAULT_MODE` is now `'dark'` because light mode is out of scope.

- [ ] **Step 2: Update app.css to import the new theme alongside the old shell.css**

Replace the import block at the top of `src/app.css` (the first 9 lines) with:

```css
@import './lib/theme/tokens.css' layer(tokens);
@import './lib/theme/glow-keyframes.css';
@import './lib/theme/themes/phosphor-green.css' layer(themes);
@import './lib/theme/base.css' layer(base);
@import './lib/theme/utilities.css' layer(utilities);
@import './lib/shell/shell.css' layer(shell);
@import './lib/shell/phosphor-shell.css' layer(shell);

@layer reset, tokens, themes, base, shell, components, utilities;
```

(Leaves the `@font-face` blocks below unchanged.)

We keep `shell.css` imported for now so the existing TUI components (Logoblock, ClusterBar, Statusbar, etc.) keep rendering correctly through the migration window. `phosphor-shell.css` is added alongside; it gets dropped together with `shell.css` in Task H1 once the old components are deleted.

`phosphor-shell.css` doesn't exist yet, so we need to create it as a placeholder.

- [ ] **Step 3: Create empty `phosphor-shell.css` placeholder**

Write `src/lib/shell/phosphor-shell.css`:

```css
/* src/lib/shell/phosphor-shell.css
 * Shell-wide styles. Most styling lives inside individual Svelte
 * component <style> blocks; this file is reserved for cross-component
 * concerns (reduced motion, etc.). Filled in during Task I2.
 */
```

- [ ] **Step 4: Verify the build**

Run: `npm run build`
Expected: build succeeds. The site renders the existing TUI components colored from the new phosphor palette (legacy `--color-*` tokens are aliased to `--hal-*`). Cookies for the now-removed `neon-green` / `magenta-vapor` themes resolve to `phosphor-green` via `resolveTheme`'s fallback. The visual is mid-migration — fully replaced in Phase E.

Run: `npm run test`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/theme/registry.ts src/app.css src/lib/shell/phosphor-shell.css
git commit -m "theme: make phosphor-green the default; drop neon/magenta from registry"
```

---

## Phase C — Helper logic (TDD)

### Task C1: `instrument-data.ts` — colocated cosmetic readouts

The `cosmetic.ts` module had cursor coords, editor mode, rec timer, signal sparkline, and link rxTx/conn. Of those, only the signal sparkline and rxTx/conn are still wanted (in the `InstrumentCluster`). They migrate into a small colocated helper. The rest is deleted in Task H1.

**Files:** Create `src/lib/shell/instrument-data.ts`, `src/lib/shell/instrument-data.test.ts`

- [ ] **Step 1: Write the failing test**

Write `src/lib/shell/instrument-data.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { get } from 'svelte/store';

describe('instrument-data', () => {
	it('exposes a static linkInfo with rxTx and conn', async () => {
		const { linkInfo } = await import('./instrument-data');
		expect(linkInfo.rxTx).toMatch(/^\d+ \/ \d+$/);
		expect(typeof linkInfo.conn).toBe('number');
		expect(linkInfo.conn).toBeGreaterThan(0);
	});

	it('signalSparkline starts on the first frame', async () => {
		const { signalSparkline } = await import('./instrument-data');
		const value = get(signalSparkline);
		expect(typeof value).toBe('string');
		expect(value.length).toBeGreaterThan(0);
	});

	describe('signalSparkline ticks (browser only)', () => {
		const originalWindow = globalThis.window;

		beforeEach(() => {
			vi.useFakeTimers();
			(globalThis as { window: object }).window = {} as object;
		});

		afterEach(() => {
			vi.useRealTimers();
			if (originalWindow === undefined) {
				delete (globalThis as { window?: object }).window;
			} else {
				(globalThis as { window: object }).window = originalWindow;
			}
		});

		it('advances frames every 600ms when subscribed', async () => {
			vi.resetModules();
			const { signalSparkline } = await import('./instrument-data');
			const seen: string[] = [];
			const unsub = signalSparkline.subscribe((v) => seen.push(v));
			vi.advanceTimersByTime(1800);
			unsub();
			expect(seen.length).toBeGreaterThan(1);
		});
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- --run src/lib/shell/instrument-data.test.ts`
Expected: FAIL with "Cannot find module './instrument-data'".

- [ ] **Step 3: Create the implementation**

Write `src/lib/shell/instrument-data.ts`:

```ts
import { readable, type Readable } from 'svelte/store';

/**
 * Cosmetic instrument-cluster readouts.
 *
 * These are not real network telemetry — they're decorative typography
 * elements that make the InstrumentCluster panel feel alive. Keep small
 * and colocated. If real telemetry ever lands, replace these in place.
 */

const SPARK_FRAMES = ['▁▂▃▅▇▅▃▂', '▂▃▅▇▅▃▂▁', '▃▅▇▅▃▂▁▂', '▅▇▅▃▂▁▂▃', '▇▅▃▂▁▂▃▅'];

export const signalSparkline: Readable<string> = readable(SPARK_FRAMES[0], (set) => {
	if (typeof window === 'undefined') return;
	let i = 0;
	const id = setInterval(() => set(SPARK_FRAMES[(i = (i + 1) % SPARK_FRAMES.length)]), 600);
	return () => clearInterval(id);
});

export const linkInfo = { rxTx: '12 / 04', conn: 4 } as const;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- --run src/lib/shell/instrument-data.test.ts`
Expected: PASS — all four tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/shell/instrument-data.ts src/lib/shell/instrument-data.test.ts
git commit -m "shell: add instrument-data (rxTx, conn, signal sparkline)"
```

---

## Phase D — Atomic components

Each component is built in isolation. They aren't wired into `Shell.svelte` until Phase E. After each component, you can preview it by running `npm run dev` and visiting `/` — but the page still uses the old shell, so nothing renders the new component yet. That's fine; we're staging.

### Task D1: `BrandBadge.svelte`

The one-line wordmark in a lit pill. Wraps an `<a href="/">`.

**Files:** Create `src/lib/shell/BrandBadge.svelte`

- [ ] **Step 1: Create the component**

Write `src/lib/shell/BrandBadge.svelte`:

```svelte
<script lang="ts">
	// proto.cool brand lockup. Always one line. Italic Lunema 800
	// inside a halogen-rimmed pill with a pulse pip. Anchors to "/".
</script>

<a class="badge" href="/" aria-label="proto.cool — home">
	<span class="pulse" aria-hidden="true"></span>
	<span class="wordmark">proto<span class="dot">.</span>cool</span>
</a>

<style>
	.badge {
		position: relative;
		display: inline-flex;
		align-items: center;
		gap: 10px;
		padding: 6px 14px;
		border: 1px solid var(--hal-hot);
		background: rgba(184, 255, 90, 0.05);
		box-shadow:
			inset 0 0 12px rgba(184, 255, 90, 0.2),
			0 0 10px rgba(184, 255, 90, 0.25);
		text-decoration: none;
	}
	.badge:hover {
		background: rgba(184, 255, 90, 0.08);
	}
	.badge:focus-visible {
		outline: 2px solid var(--hal-hot);
		outline-offset: 2px;
	}
	.pulse {
		width: 8px;
		height: 8px;
		border-radius: 999px;
		background: var(--hal-ember);
		box-shadow:
			0 0 6px var(--hal-hot),
			0 0 16px rgba(184, 255, 90, 0.7);
		animation: var(--glow-pulse, none);
	}
	.wordmark {
		font-family: var(--font-display);
		font-weight: 800;
		font-style: italic;
		font-size: 28px;
		letter-spacing: -0.025em;
		line-height: 1;
		white-space: nowrap; /* lock to one line */
		color: var(--hal-bone);
		text-shadow: var(--glow-text);
	}
	.wordmark .dot {
		color: var(--hal-hot);
		text-shadow:
			0 0 6px rgba(184, 255, 90, 0.95),
			0 0 18px rgba(130, 227, 75, 0.6);
	}
</style>
```

- [ ] **Step 2: Verify**

Run: `npm run check`
Expected: passes (no Svelte warnings on this file).

- [ ] **Step 3: Commit**

```bash
git add src/lib/shell/BrandBadge.svelte
git commit -m "shell: BrandBadge — one-line wordmark in lit pill"
```

---

### Task D2: `ChannelPads.svelte`

The section nav, rendered as lit pills with lamp dots. Live channel uses phosphor border + inset glow. `aria-current="page"` on the active link.

**Files:** Create `src/lib/shell/ChannelPads.svelte`

- [ ] **Step 1: Create the component**

Write `src/lib/shell/ChannelPads.svelte`:

```svelte
<script lang="ts">
	import { page } from '$app/state';
	import { sections } from './sections';

	function isActive(href: string, pathname: string): boolean {
		if (href === '/') return pathname === '/';
		return pathname === href || pathname.startsWith(href + '/');
	}
</script>

<nav class="channels" aria-label="sections">
	{#each sections as s (s.id)}
		{@const active = isActive(s.href, page.url.pathname)}
		<a class="ch" class:live={active} href={s.href} aria-current={active ? 'page' : undefined}>
			<span class="lamp" aria-hidden="true"></span>
			<span class="label">{s.label}</span>
		</a>
	{/each}
</nav>

<style>
	.channels {
		display: inline-flex;
		align-items: stretch;
		gap: 8px;
	}
	.ch {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 7px 12px;
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--hal-dim);
		border: 1px solid var(--hal-edge);
		background: rgba(0, 0, 0, 0.25);
		text-decoration: none;
	}
	.ch:hover {
		color: var(--hal-bone);
	}
	.ch:focus-visible {
		outline: 2px solid var(--hal-hot);
		outline-offset: 2px;
	}
	.lamp {
		width: 6px;
		height: 6px;
		border-radius: 999px;
		background: var(--hal-deep-dim);
		box-shadow: inset 0 0 0 1px #0a0c0a;
	}
	.live {
		color: var(--hal-bone);
		border-color: var(--hal-hot);
		background: linear-gradient(180deg, rgba(184, 255, 90, 0.18), rgba(184, 255, 90, 0.04));
		box-shadow:
			inset 0 0 16px rgba(184, 255, 90, 0.18),
			0 0 8px rgba(184, 255, 90, 0.18);
	}
	.live .lamp {
		background: var(--hal-hot);
		box-shadow:
			0 0 5px var(--hal-hot),
			0 0 12px rgba(130, 227, 75, 0.7);
	}
</style>
```

- [ ] **Step 2: Verify**

Run: `npm run check`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/lib/shell/ChannelPads.svelte
git commit -m "shell: ChannelPads — lit section nav pills"
```

---

### Task D3: `StatusStrip.svelte`

Right-side data strip in the nav. Live dot · date · sig. Reads `chrome` context (date is computed client-side from `runtime`'s clock, sig comes from `chrome.system.sig`).

**Files:** Create `src/lib/shell/StatusStrip.svelte`

- [ ] **Step 1: Create the component**

Write `src/lib/shell/StatusStrip.svelte`:

```svelte
<script lang="ts">
	import { getContext } from 'svelte';
	import { clock } from './runtime';
	import type { ChromeData } from './chrome';

	const chrome = getContext<ChromeData>('chrome');
	let date = $derived($clock.date);
</script>

<div class="status" aria-hidden="true">
	<span class="live-dot"></span>
	<span class="lbl">LIVE</span>
	<span class="warm">{date}</span>
	<span class="cool">SIG 0X{chrome.system.sig.toUpperCase()}</span>
</div>

<style>
	.status {
		display: inline-flex;
		align-items: center;
		gap: 14px;
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		letter-spacing: 0.1em;
		color: var(--hal-dim);
		text-transform: uppercase;
	}
	.live-dot {
		width: 8px;
		height: 8px;
		border-radius: 999px;
		background: var(--hal-ember);
		box-shadow:
			0 0 6px var(--hal-hot),
			0 0 14px rgba(130, 227, 75, 0.8);
		animation: var(--glow-pulse, none);
	}
	.warm {
		color: var(--hal-warm);
	}
	.cool {
		color: var(--hal-cool);
	}
</style>
```

- [ ] **Step 2: Verify**

Run: `npm run check`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/lib/shell/StatusStrip.svelte
git commit -m "shell: StatusStrip — live dot, date, sig"
```

---

### Task D4: `NavPanel.svelte`

Composes BrandBadge + ChannelPads + StatusStrip into the elevated top panel. Solid lifted surface, phosphor edge highlight on top, drop shadow below, corner bracket marks at panel ends.

**Files:** Create `src/lib/shell/NavPanel.svelte`

- [ ] **Step 1: Create the component**

Write `src/lib/shell/NavPanel.svelte`:

```svelte
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
</style>
```

- [ ] **Step 2: Verify**

Run: `npm run check`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/lib/shell/NavPanel.svelte
git commit -m "shell: NavPanel — elevated panel composing badge + channels + status"
```

---

### Task D5: `HeroLockup.svelte`

The page-level display moment. Two-line italic Lunema 800 with halogen text-shadow on line 1 and phosphor outline on line 2. Optional `deck` prop for the body deck below.

**Files:** Create `src/lib/shell/HeroLockup.svelte`

- [ ] **Step 1: Create the component**

Write `src/lib/shell/HeroLockup.svelte`:

```svelte
<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		line1: string;
		line2: string;
		emphasis?: string; // word inside line 1 to render NON-italic for emphasis (optional)
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
		font-style: italic;
		line-height: 0.86;
		letter-spacing: -0.04em;
		color: var(--hal-bone);
	}
	.l1 {
		display: block;
		font-size: 140px;
		text-shadow:
			0 0 1px rgba(226, 245, 207, 0.7),
			0 0 14px rgba(184, 255, 90, 0.5),
			0 0 56px rgba(184, 255, 90, 0.28);
	}
	.l1 em {
		font-style: normal;
	}
	.l2 {
		display: block;
		font-size: 140px;
		color: transparent;
		-webkit-text-stroke: 1.4px var(--hal-hot);
		text-shadow: 0 0 26px rgba(184, 255, 90, 0.5);
	}
	.l2 .punct {
		color: var(--hal-hot);
		-webkit-text-stroke: 0;
		text-shadow:
			0 0 10px rgba(184, 255, 90, 0.95),
			0 0 26px rgba(130, 227, 75, 0.6);
	}
	.deck {
		margin-top: 22px;
		font-family: var(--font-sans);
		font-weight: 400;
		font-style: normal;
		font-size: var(--text-sm);
		line-height: 1.55;
		letter-spacing: 0;
		color: #b9c8a8;
		max-width: 480px;
		text-shadow: none;
	}
	.deck :global(b),
	.deck :global(strong) {
		color: var(--hal-bone);
		font-weight: 700;
	}
</style>
```

- [ ] **Step 2: Verify**

Run: `npm run check`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/lib/shell/HeroLockup.svelte
git commit -m "shell: HeroLockup — two-line italic Lunema display + optional deck"
```

---

### Task D6: `Halo.svelte`

The dithered halogen halo. Three concentric Bayer rings (dense → medium → sparse) masked with stepped radial gradients, anchored at lower-left of its parent and bleeding past the parent's bounds via negative absolute insets.

**Files:** Create `src/lib/shell/Halo.svelte`

- [ ] **Step 1: Create the component**

Write `src/lib/shell/Halo.svelte`:

```svelte
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
```

- [ ] **Step 2: Verify**

Run: `npm run check`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/lib/shell/Halo.svelte
git commit -m "shell: Halo — three-ring Bayer-dithered halogen halo"
```

---

### Task D7: `InstrumentCluster.svelte`

The right-of-hero instrument panel. Cap label, segmented meter with dithered overflow tail, readout grid, signal minimap. Inlines the meter / readout / minimap markup — they're tightly coupled and sub-components would be over-decomposition.

**Files:** Create `src/lib/shell/InstrumentCluster.svelte`

- [ ] **Step 1: Create the component**

Write `src/lib/shell/InstrumentCluster.svelte`:

```svelte
<script lang="ts">
	import { getContext } from 'svelte';
	import { uptime } from './runtime';
	import { linkInfo, signalSparkline } from './instrument-data';
	import type { ChromeData } from './chrome';

	const chrome = getContext<ChromeData>('chrome');
	let up = $derived($uptime);
	let spark = $derived($signalSparkline);
</script>

<aside class="cluster" aria-hidden="true">
	<div class="cap">
		<span>// instrument</span>
		<span class="id">CL-{chrome.system.build.replace(/\./g, '').slice(0, 4) || '0000'}</span>
	</div>
	<div class="body-pad">
		<!-- segmented meter; last 3 are dithered overflow -->
		<div class="meter">
			<span class="seg lit"></span>
			<span class="seg lit"></span>
			<span class="seg lit"></span>
			<span class="seg lit"></span>
			<span class="seg lit"></span>
			<span class="seg lit"></span>
			<span class="seg peak"></span>
			<span class="seg fade-1"></span>
			<span class="seg fade-2"></span>
			<span class="seg fade-2"></span>
		</div>

		<div class="readout">
			<span class="lab">rx</span><span class="ind on"></span><span class="val glow"
				>{linkInfo.rxTx} kb/s</span
			>
			<span class="lab">conn</span><span class="ind on"></span><span class="val"
				>{linkInfo.conn} / 12</span
			>
			<span class="lab">pds</span><span class="ind cool"></span><span class="val"
				>{chrome.link.pds}</span
			>
			<span class="lab">uptime</span><span class="ind on"></span><span class="val">{up}</span>
		</div>

		<div class="minimap">
			<div class="grid-bg"></div>
			<div class="dither-fill dither-dense"></div>
			<span class="pulse"></span>
			<span class="label">SIG {spark}</span>
		</div>
	</div>
</aside>

<style>
	.cluster {
		position: relative;
		z-index: 2;
		border: 1px solid var(--hal-edge);
		background: linear-gradient(180deg, rgba(184, 255, 90, 0.05), rgba(0, 0, 0, 0));
		backdrop-filter: blur(2px);
	}
	.cap {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 8px 12px;
		border-bottom: 1px solid var(--hal-edge);
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--hal-dim);
	}
	.cap .id {
		color: var(--hal-warm);
	}
	.body-pad {
		padding: 14px;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.meter {
		display: flex;
		gap: 3px;
		align-items: stretch;
	}
	.meter .seg {
		flex: 1;
		height: 14px;
		background: #0c1208;
		border: 1px solid #1a2a18;
		position: relative;
	}
	.meter .seg.lit {
		background: var(--hal-hot);
		border-color: var(--hal-hot);
		box-shadow:
			0 0 10px rgba(184, 255, 90, 0.7),
			inset 0 0 4px rgba(212, 255, 128, 0.45);
	}
	.meter .seg.peak {
		background: var(--hal-ember);
		border-color: var(--hal-ember);
		box-shadow:
			0 0 14px rgba(212, 255, 128, 0.95),
			0 0 30px rgba(184, 255, 90, 0.55);
	}
	.meter .seg.fade-1,
	.meter .seg.fade-2 {
		background: transparent;
		border-color: var(--hal-edge);
	}
	.meter .seg.fade-1::before {
		content: '';
		position: absolute;
		inset: 1px;
		background-image: var(--dither-medium);
		background-size: 4px 4px;
		image-rendering: pixelated;
	}
	.meter .seg.fade-2::before {
		content: '';
		position: absolute;
		inset: 1px;
		background-image: var(--dither-sparse);
		background-size: 4px 4px;
		image-rendering: pixelated;
	}

	.readout {
		display: grid;
		grid-template-columns: auto 1fr auto;
		gap: 4px 10px;
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		border-top: 1px solid var(--hal-edge);
		padding-top: 12px;
	}
	.readout .lab {
		color: var(--hal-dim);
		text-transform: uppercase;
		letter-spacing: 0.12em;
		font-size: 10px;
		align-self: center;
	}
	.readout .val {
		color: var(--hal-bone);
	}
	.readout .val.glow {
		color: var(--hal-warm);
		text-shadow: 0 0 8px rgba(184, 255, 90, 0.55);
	}
	.readout .ind {
		width: 8px;
		height: 8px;
		border-radius: 999px;
		background: var(--hal-deep-dim);
		align-self: center;
	}
	.readout .ind.on {
		background: var(--hal-hot);
		box-shadow:
			0 0 6px var(--hal-hot),
			0 0 12px rgba(130, 227, 75, 0.7);
	}
	.readout .ind.cool {
		background: var(--hal-cool);
		box-shadow: 0 0 6px var(--hal-cool);
	}

	.minimap {
		margin-top: 6px;
		height: 56px;
		border: 1px solid var(--hal-edge);
		position: relative;
		overflow: hidden;
		background: #050905;
	}
	.minimap .grid-bg {
		position: absolute;
		inset: 0;
		background-image:
			linear-gradient(to right, rgba(184, 255, 90, 0.08) 1px, transparent 1px),
			linear-gradient(to bottom, rgba(184, 255, 90, 0.08) 1px, transparent 1px);
		background-size: 12px 12px;
	}
	.minimap .dither-fill {
		position: absolute;
		inset: 0;
		-webkit-mask-image: linear-gradient(
			95deg,
			#000 0%,
			#000 20%,
			rgba(0, 0, 0, 0.85) 30%,
			rgba(0, 0, 0, 0.6) 45%,
			rgba(0, 0, 0, 0.35) 60%,
			rgba(0, 0, 0, 0.18) 75%,
			transparent 92%
		);
		mask-image: linear-gradient(
			95deg,
			#000 0%,
			#000 20%,
			rgba(0, 0, 0, 0.85) 30%,
			rgba(0, 0, 0, 0.6) 45%,
			rgba(0, 0, 0, 0.35) 60%,
			rgba(0, 0, 0, 0.18) 75%,
			transparent 92%
		);
		mix-blend-mode: screen;
	}
	.minimap .pulse {
		position: absolute;
		left: 22%;
		top: 50%;
		transform: translate(-50%, -50%);
		width: 14px;
		height: 14px;
		border-radius: 999px;
		background: var(--hal-ember);
		box-shadow:
			0 0 8px var(--hal-ember),
			0 0 26px rgba(212, 255, 128, 0.85),
			0 0 60px rgba(184, 255, 90, 0.55);
		animation: var(--glow-pulse, none);
	}
	.minimap .label {
		position: absolute;
		left: 8px;
		bottom: 6px;
		font-family: var(--font-mono);
		font-size: 10px;
		color: var(--hal-dim);
		letter-spacing: 0.14em;
		text-transform: uppercase;
	}
</style>
```

- [ ] **Step 2: Verify**

Run: `npm run check`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/lib/shell/InstrumentCluster.svelte
git commit -m "shell: InstrumentCluster — meter, readouts, signal minimap"
```

---

### Task D8: `StatsPanel.svelte`

The elevated bottom panel. Six mono columns: VOL/№ · EST · NET · BUILD · MODE · identity. Phosphor edge highlight on the bottom edge; soft drop shadow upward. Corner bracket marks at panel ends.

**Files:** Create `src/lib/shell/StatsPanel.svelte`

- [ ] **Step 1: Create the component**

Write `src/lib/shell/StatsPanel.svelte`:

```svelte
<script lang="ts">
	import { getContext } from 'svelte';
	import type { ChromeData } from './chrome';

	const chrome = getContext<ChromeData>('chrome');

	// VOL is cosmetic (issue / volume motif). Bumped when the visual identity
	// changes; tied to release rather than calendar.
	const VOL = '02';
	const ISSUE = '04';
	const EST = 'MMXXVI';
	const MODE_LABEL = 'ARCHIVE';
</script>

<footer class="stats-panel" aria-hidden="true">
	<div class="cell">
		<span class="pip"></span><span class="lab">VOL</span>
		<b class="glow">{VOL} / № {ISSUE}</b>
	</div>
	<div class="cell"><span class="lab">EST</span><b>{EST}</b></div>
	<div class="cell"><span class="lab">NET</span><b class="cool">ATPROTO</b></div>
	<div class="cell">
		<span class="lab">BUILD</span><b class="glow">0x{chrome.system.sig.toUpperCase().slice(0, 4)}</b
		>
	</div>
	<div class="cell"><span class="lab">MODE</span><b>{MODE_LABEL}</b></div>
	<div class="cell">
		<span class="lab">↳</span><b>{chrome.identity.user}@{chrome.identity.host}</b>
	</div>
</footer>

<style>
	.stats-panel {
		position: relative;
		z-index: 3;
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		letter-spacing: 0.08em;
		color: var(--hal-dim);
		background: linear-gradient(180deg, var(--hal-anthra-3) 0%, #0d130c 100%);
		border-top: 1px solid var(--hal-edge);
		box-shadow:
			inset 0 1px 0 rgba(184, 255, 90, 0.05),
			inset 0 -1px 0 rgba(184, 255, 90, 0.1),
			0 -6px 22px rgba(0, 0, 0, 0.55);
		padding: 0 12px;
	}
	.stats-panel::before,
	.stats-panel::after {
		content: '';
		position: absolute;
		bottom: 6px;
		width: 10px;
		height: 10px;
		border: 0 solid var(--hal-hot);
		box-shadow: 0 0 4px rgba(184, 255, 90, 0.5);
		opacity: 0.6;
		pointer-events: none;
	}
	.stats-panel::before {
		left: 8px;
		border-bottom-width: 1.5px;
		border-left-width: 1.5px;
	}
	.stats-panel::after {
		right: 8px;
		border-bottom-width: 1.5px;
		border-right-width: 1.5px;
	}
	.cell {
		padding: 14px 14px;
		display: flex;
		gap: 8px;
		align-items: baseline;
	}
	.cell + .cell {
		border-left: 1px dotted var(--hal-edge);
	}
	.cell b {
		font-weight: 400;
		color: var(--hal-bone);
	}
	.cell .glow {
		color: var(--hal-warm);
		text-shadow: 0 0 6px rgba(184, 255, 90, 0.5);
	}
	.cell .cool {
		color: var(--hal-cool);
	}
	.pip {
		width: 6px;
		height: 6px;
		border-radius: 999px;
		background: var(--hal-hot);
		box-shadow: 0 0 6px var(--hal-hot);
		align-self: center;
	}
</style>
```

- [ ] **Step 2: Verify**

Run: `npm run check`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/lib/shell/StatsPanel.svelte
git commit -m "shell: StatsPanel — mono register tape footer"
```

---

## Phase E — Stage, wiring, and pages

### Task E1: `Stage.svelte` — outermost container

Provides the anthracite background, the ambient screen-blended dither overlay, and the container-query scope (`chrome`). Hosts NavPanel, slotted children, and StatsPanel.

**Files:** Create `src/lib/shell/Stage.svelte`

- [ ] **Step 1: Create the component**

Write `src/lib/shell/Stage.svelte`:

```svelte
<script lang="ts">
	import type { Snippet } from 'svelte';
	import NavPanel from './NavPanel.svelte';
	import StatsPanel from './StatsPanel.svelte';

	let { children }: { children: Snippet } = $props();
</script>

<div class="stage">
	<NavPanel />
	<main class="hero">
		{@render children()}
	</main>
	<StatsPanel />
</div>

<style>
	.stage {
		position: relative;
		container-type: inline-size;
		container-name: chrome;
		min-height: 100dvh;
		background: var(--hal-anthra);
		color: var(--hal-bone);
		font-family: var(--font-sans);
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}
	/* ambient screen-blended dither — sits below panels, above bg */
	.stage::before {
		content: '';
		position: absolute;
		inset: 0;
		background-image: url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4' shape-rendering='crispEdges'%3E%3Crect x='0' y='0' width='1' height='1' fill='%2382e34b' fill-opacity='0.6'/%3E%3C/svg%3E");
		background-size: 4px 4px;
		opacity: 0.07;
		pointer-events: none;
		mix-blend-mode: screen;
		z-index: 0;
	}
	.hero {
		position: relative;
		z-index: 1;
		flex: 1;
		display: flex;
		flex-direction: column;
		padding: 72px 36px 60px;
	}
</style>
```

- [ ] **Step 2: Verify**

Run: `npm run check`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/lib/shell/Stage.svelte
git commit -m "shell: Stage — anthracite bg, ambient dither, container-query scope"
```

---

### Task E2: Rewrite `Shell.svelte` to compose the new tree

**Files:** Modify `src/lib/shell/Shell.svelte`

- [ ] **Step 1: Replace `Shell.svelte`**

Replace the contents of `src/lib/shell/Shell.svelte` with:

```svelte
<script lang="ts">
	import type { Snippet } from 'svelte';
	import Stage from './Stage.svelte';

	let { children }: { children: Snippet } = $props();
</script>

<Stage>
	{@render children()}
</Stage>
```

- [ ] **Step 2: Run dev and visit `/`**

Run: `npm run dev`
Open the printed URL (usually `http://localhost:5173/`).

Expected: the page loads with the new shell — phosphor-green Stage with NavPanel at the top (BrandBadge, ChannelPads, StatusStrip), the existing route content in the middle (currently just `<h1>~/content</h1>` etc.), and StatsPanel at the bottom. The hero zone is empty (no Halo, no HeroLockup, no InstrumentCluster yet — those go in pages in E3).

- [ ] **Step 3: Verify check + tests**

Run: `npm run check && npm run test`
Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add src/lib/shell/Shell.svelte
git commit -m "shell: rewrite Shell to Stage(NavPanel + slot + StatsPanel)"
```

---

### Task E3: Add HeroLockup + Halo + InstrumentCluster to `/`, `/projects`, `/about`

Each landing page gets its own lockup. The hero composes `Halo` + `HeroLockup` + `InstrumentCluster` in a positioned grid.

**Files:** Modify `src/routes/+page.svelte`, `src/routes/projects/+page.svelte`, `src/routes/about/+page.svelte`

- [ ] **Step 1: Replace `src/routes/+page.svelte`**

Write:

```svelte
<script lang="ts">
	import HeroLockup from '$lib/shell/HeroLockup.svelte';
	import Halo from '$lib/shell/Halo.svelte';
	import InstrumentCluster from '$lib/shell/InstrumentCluster.svelte';
</script>

<svelte:head>
	<title>content · proto.cool</title>
</svelte:head>

<div class="page">
	<Halo />
	<HeroLockup line1="an indexed" emphasis="indexed" line2="personal archive" punct=".">
		{#snippet deck()}
			a personal site, kept in the open — <b>posts, projects, ephemera</b>. longform lives in the
			pds, indexed and instrumented from here.
		{/snippet}
	</HeroLockup>
	<InstrumentCluster />
</div>

<style>
	.page {
		position: relative;
		display: grid;
		grid-template-columns: 1fr 280px;
		gap: 36px;
		align-items: center;
		min-height: 420px;
		flex: 1;
	}
</style>
```

- [ ] **Step 2: Replace `src/routes/projects/+page.svelte`**

Write:

```svelte
<script lang="ts">
	import HeroLockup from '$lib/shell/HeroLockup.svelte';
	import Halo from '$lib/shell/Halo.svelte';
	import InstrumentCluster from '$lib/shell/InstrumentCluster.svelte';
</script>

<svelte:head>
	<title>projects · proto.cool</title>
</svelte:head>

<div class="page">
	<Halo />
	<HeroLockup line1="things in" line2="flight" emphasis="flight" punct=".">
		{#snippet deck()}
			projects in flight, archived, abandoned. wired in a follow-up spec.
		{/snippet}
	</HeroLockup>
	<InstrumentCluster />
</div>

<style>
	.page {
		position: relative;
		display: grid;
		grid-template-columns: 1fr 280px;
		gap: 36px;
		align-items: center;
		min-height: 420px;
		flex: 1;
	}
</style>
```

- [ ] **Step 3: Replace `src/routes/about/+page.svelte`**

Write:

```svelte
<script lang="ts">
	import HeroLockup from '$lib/shell/HeroLockup.svelte';
	import Halo from '$lib/shell/Halo.svelte';
	import InstrumentCluster from '$lib/shell/InstrumentCluster.svelte';
</script>

<svelte:head>
	<title>about · proto.cool</title>
</svelte:head>

<div class="page">
	<Halo />
	<HeroLockup line1="kept in the" line2="open" emphasis="open" punct=".">
		{#snippet deck()}
			proto.cool is a personal terminal somebody (protocol7) built for themselves on top of the at
			protocol. real content lands in the federated feed spec.
		{/snippet}
	</HeroLockup>
	<InstrumentCluster />
</div>

<style>
	.page {
		position: relative;
		display: grid;
		grid-template-columns: 1fr 280px;
		gap: 36px;
		align-items: center;
		min-height: 420px;
		flex: 1;
	}
</style>
```

- [ ] **Step 4: Run dev and walk all three routes**

Run: `npm run dev`
Visit `/`, `/projects`, `/about` in the browser.

Expected:

- Each page renders with the dithered halogen halo bleeding in from the lower-left.
- Italic Lunema headline at huge scale (line 1 with halogen text-shadow, line 2 outline-only).
- Deck text below the headline.
- Instrument cluster panel on the right.
- NavPanel highlights the live channel (`content`/`projects`/`about`) via `aria-current="page"`.

- [ ] **Step 5: Verify check + tests**

Run: `npm run check && npm run test`
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add src/routes/+page.svelte src/routes/projects/+page.svelte src/routes/about/+page.svelte
git commit -m "routes: hero lockups for /, /projects, /about"
```

---

## Phase F — Overlay & keyboard cleanup

The search/cmd chips are gone (no PromptBar) so the matching commands and overlay kinds are dead.

### Task F1: Trim `overlay.ts` and update its tests

**Files:** Modify `src/lib/shell/overlay.ts`, `src/lib/shell/overlay.test.ts`

- [ ] **Step 1: Replace `overlay.ts`**

```ts
import { writable, type Readable } from 'svelte/store';

export type OverlayKind = 'help' | 'theme';

const store = writable<OverlayKind | null>(null);

export const currentOverlay: Readable<OverlayKind | null> = { subscribe: store.subscribe };

export function openOverlay(kind: OverlayKind): void {
	store.set(kind);
}

export function closeOverlay(): void {
	store.set(null);
}
```

- [ ] **Step 2: Replace `overlay.test.ts`**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { openOverlay, closeOverlay, currentOverlay } from './overlay';

beforeEach(() => closeOverlay());

describe('overlay store', () => {
	it('starts null', () => {
		expect(get(currentOverlay)).toBeNull();
	});

	it('openOverlay sets the kind', () => {
		openOverlay('help');
		expect(get(currentOverlay)).toBe('help');
	});

	it('opening a second overlay replaces the first', () => {
		openOverlay('help');
		openOverlay('theme');
		expect(get(currentOverlay)).toBe('theme');
	});

	it('closeOverlay resets to null', () => {
		openOverlay('help');
		closeOverlay();
		expect(get(currentOverlay)).toBeNull();
	});
});
```

- [ ] **Step 3: Run tests**

Run: `npm run test:unit -- --run src/lib/shell/overlay.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/shell/overlay.ts src/lib/shell/overlay.test.ts
git commit -m "shell: trim OverlayKind to help|theme (drop search/cmd stubs)"
```

---

### Task F2: Trim `commands.ts` and update its tests

**Files:** Modify `src/lib/shell/commands.ts`, `src/lib/shell/commands.test.ts`

- [ ] **Step 1: Replace `commands.ts`**

```ts
import { goto } from '$app/navigation';
import { sections } from './sections';
import { openOverlay } from './overlay';

export type CommandCategory = 'navigation' | 'theme' | 'help';

export type Command = {
	id: string;
	hotkey: string;
	label: string;
	category: CommandCategory;
	run: () => void;
};

const navCommands: Command[] = sections.map((s) => ({
	id: `goto-${s.id}`,
	hotkey: s.hotkey,
	label: `go to ${s.label}`,
	category: 'navigation',
	run: () => goto(s.href)
}));

export const commands: Command[] = [
	...navCommands,
	{
		id: 'theme-picker',
		hotkey: 't',
		label: 'theme picker',
		category: 'theme',
		run: () => openOverlay('theme')
	},
	{
		id: 'help',
		hotkey: '?',
		label: 'help',
		category: 'help',
		run: () => openOverlay('help')
	}
];

export function findCommand(hotkey: string): Command | undefined {
	return commands.find((c) => c.hotkey === hotkey);
}
```

- [ ] **Step 2: Replace `commands.test.ts`**

```ts
import { describe, it, expect, vi } from 'vitest';

vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
vi.mock('./overlay', () => ({ openOverlay: vi.fn(), closeOverlay: vi.fn() }));

import { commands } from './commands';
import { sections, utilities } from './sections';

describe('commands registry', () => {
	it('contains a navigation command for every section', () => {
		const navIds = sections.map((s) => `goto-${s.id}`);
		for (const id of navIds) {
			expect(commands.find((c) => c.id === id)).toBeDefined();
		}
	});

	it('contains theme-picker and help', () => {
		expect(commands.find((c) => c.id === 'theme-picker')).toBeDefined();
		expect(commands.find((c) => c.id === 'help')).toBeDefined();
	});

	it('does NOT contain search or command (out of scope for v1)', () => {
		expect(commands.find((c) => c.id === 'search')).toBeUndefined();
		expect(commands.find((c) => c.id === 'command')).toBeUndefined();
	});

	it('every hotkey is unique', () => {
		const keys = commands.map((c) => c.hotkey);
		expect(new Set(keys).size).toBe(keys.length);
	});

	it('every category is one of the three allowed values', () => {
		const allowed = new Set(['navigation', 'theme', 'help']);
		for (const c of commands) expect(allowed.has(c.category)).toBe(true);
	});

	it('hotkey list equals section + utility hotkeys', () => {
		const expected = new Set([...sections.map((s) => s.hotkey), ...utilities.map((u) => u.hotkey)]);
		const actual = new Set(commands.map((c) => c.hotkey));
		expect(actual).toEqual(expected);
	});
});
```

- [ ] **Step 3: Run tests**

Run: `npm run test:unit -- --run src/lib/shell/commands.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/shell/commands.ts src/lib/shell/commands.test.ts
git commit -m "shell: drop search+command commands (out of scope for v1)"
```

---

### Task F3: Update `KeyboardLayer.svelte` and restyle overlays

**Files:** Modify `src/lib/shell/KeyboardLayer.svelte`, `src/lib/shell/HelpOverlay.svelte`, `src/lib/shell/ThemePickerOverlay.svelte`

- [ ] **Step 1: Replace `KeyboardLayer.svelte`**

```svelte
<script lang="ts">
	import { onMount } from 'svelte';
	import { findCommand } from './commands';
	import { currentOverlay, closeOverlay, type OverlayKind } from './overlay';
	import HelpOverlay from './HelpOverlay.svelte';
	import ThemePickerOverlay from './ThemePickerOverlay.svelte';

	let openKind = $state<OverlayKind | null>(null);
	$effect(() => currentOverlay.subscribe((v) => (openKind = v)));

	function isFormTarget(t: EventTarget | null): boolean {
		if (!(t instanceof HTMLElement)) return false;
		return !!t.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]');
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.ctrlKey || e.metaKey || e.altKey) return;
		if (isFormTarget(e.target)) return;

		if (e.key === 'Escape') {
			if (openKind) {
				e.preventDefault();
				closeOverlay();
			}
			return;
		}

		if (openKind) return; // overlay swallows other hotkeys

		const cmd = findCommand(e.key);
		if (cmd) {
			e.preventDefault();
			cmd.run();
		}
	}

	onMount(() => {
		window.addEventListener('keydown', onKeydown);
		return () => window.removeEventListener('keydown', onKeydown);
	});
</script>

{#if openKind === 'help'}
	<HelpOverlay />
{:else if openKind === 'theme'}
	<ThemePickerOverlay />
{/if}
```

- [ ] **Step 2: Restyle `HelpOverlay.svelte`**

Replace the `<style>` block in `src/lib/shell/HelpOverlay.svelte` with phosphor vocabulary. The script + markup are unchanged, only the styles. Full file:

```svelte
<script lang="ts">
	import Overlay from './Overlay.svelte';
	import { commands, type CommandCategory } from './commands';

	const cats: CommandCategory[] = ['navigation', 'theme', 'help'];
	const grouped = cats.map((cat) => ({
		cat,
		items: commands.filter((c) => c.category === cat)
	}));
</script>

<Overlay title="help — keybinds">
	{#each grouped as g (g.cat)}
		{#if g.items.length}
			<section class="group">
				<h3 class="cat">// {g.cat}</h3>
				<ul class="rows">
					{#each g.items as c (c.id)}
						<li class="row">
							<span class="hk">[{c.hotkey}]</span>
							<span class="lbl">{c.label}</span>
						</li>
					{/each}
				</ul>
			</section>
		{/if}
	{/each}
</Overlay>

<style>
	.group + .group {
		margin-top: 14px;
	}
	.cat {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: var(--hal-dim);
		letter-spacing: 0.12em;
		margin: 0 0 8px;
		text-transform: uppercase;
	}
	.rows {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.row {
		display: grid;
		grid-template-columns: 60px 1fr;
		gap: 12px;
	}
	.hk {
		color: var(--hal-hot);
		text-shadow: 0 0 8px rgba(184, 255, 90, 0.5);
	}
	.lbl {
		color: var(--hal-bone);
	}
</style>
```

(Note: also update the `cats` list to drop `'prompt'` — that category no longer exists.)

- [ ] **Step 3: Restyle `ThemePickerOverlay.svelte`**

Replace the file with:

```svelte
<script lang="ts">
	import Overlay from './Overlay.svelte';
	import { themes, setTheme, type ThemeId } from '$lib/theme';
	import { closeOverlay } from './overlay';

	function pickTheme(id: ThemeId) {
		setTheme(id);
		closeOverlay();
	}
</script>

<Overlay title="theme picker">
	<div class="row">
		<span class="label">// theme</span>
		{#each themes as t (t.id)}
			<button type="button" class="btn" onclick={() => pickTheme(t.id as ThemeId)}>
				{t.name}
			</button>
		{/each}
	</div>
	<p class="hint">light mode and theme alternates land in a follow-up.</p>
</Overlay>

<style>
	.row {
		display: flex;
		gap: 8px;
		align-items: center;
		flex-wrap: wrap;
	}
	.label {
		color: var(--hal-dim);
		min-width: 70px;
		letter-spacing: 0.1em;
		font-family: var(--font-mono);
		text-transform: uppercase;
	}
	.btn {
		font: inherit;
		padding: 6px 12px;
		background: rgba(184, 255, 90, 0.05);
		color: var(--hal-bone);
		border: 1px solid var(--hal-edge);
		cursor: pointer;
		font-family: var(--font-mono);
		letter-spacing: 0.06em;
	}
	.btn:hover {
		border-color: var(--hal-hot);
		color: var(--hal-bone);
		box-shadow: inset 0 0 12px rgba(184, 255, 90, 0.18);
	}
	.btn:focus-visible {
		outline: 2px solid var(--hal-hot);
		outline-offset: 2px;
	}
	.hint {
		margin: 14px 0 0;
		color: var(--hal-dim);
		font-size: var(--text-xs);
		font-family: var(--font-mono);
	}
</style>
```

- [ ] **Step 4: Run dev, hit `?` and `t` to verify overlays**

Run: `npm run dev`. In the browser:

- Press `?` — Help overlay opens; keybinds list looks restyled.
- Press `Esc` — closes.
- Press `t` — Theme picker opens with `Phosphor green` button.
- Press `Esc` — closes.

Expected: both overlays render with phosphor vocabulary, no errors, focus trap and Escape work.

- [ ] **Step 5: Verify check + tests**

Run: `npm run check && npm run test`
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add src/lib/shell/KeyboardLayer.svelte src/lib/shell/HelpOverlay.svelte src/lib/shell/ThemePickerOverlay.svelte
git commit -m "shell: drop stub overlays from KeyboardLayer; restyle help+theme"
```

---

## Phase G — Trim `ChromeData`

### Task G1: Remove `kernel` and `shell` from `ChromeData`

The new shell never surfaces these fields, so they're dead weight on the server payload.

**Files:** Modify `src/lib/shell/chrome.ts`, `src/lib/shell/chrome.test.ts`

- [ ] **Step 1: Replace `chrome.ts`**

```ts
export type ChromeData = {
	identity: { user: string; host: string };
	link: { pds: string };
	system: { build: string; sig: string };
};

// Defaults match the production deployment so a clean checkout renders correctly
// without an .env file. Override locally via .env (see .env.example).
const DEFAULT_USER = 'protocol7';
const DEFAULT_HOST = 'helios';
const DEFAULT_PDS = 'pds.proto.cool';

// Server-only: reads process.env directly. Call from +layout.server.ts, not universal loads.
export function resolveChromeData(): ChromeData {
	return {
		identity: {
			user: process.env.PUBLIC_OWNER_HANDLE || DEFAULT_USER,
			host: process.env.PUBLIC_HOST_LABEL || DEFAULT_HOST
		},
		link: {
			pds: process.env.PUBLIC_PDS_HOST || DEFAULT_PDS
		},
		system: {
			build: __BUILD_VERSION__,
			sig: __BUILD_SHA__.slice(0, 7)
		}
	};
}
```

- [ ] **Step 2: Replace `chrome.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.stubGlobal('__BUILD_VERSION__', '0.7.2');
vi.stubGlobal('__BUILD_SHA__', '7a3f2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a');

const env = process.env;
beforeEach(() => {
	process.env = { ...env };
});

describe('resolveChromeData', () => {
	it('returns the expected shape with values from env + build constants', async () => {
		process.env.PUBLIC_OWNER_HANDLE = 'protocol7';
		process.env.PUBLIC_HOST_LABEL = 'helios';
		process.env.PUBLIC_PDS_HOST = 'pds.proto.cool';
		const { resolveChromeData } = await import('./chrome');
		const data = resolveChromeData();
		expect(data).toEqual({
			identity: { user: 'protocol7', host: 'helios' },
			link: { pds: 'pds.proto.cool' },
			system: {
				build: '0.7.2',
				sig: '7a3f2b1'
			}
		});
	});

	it('falls back to defaults when env vars are missing', async () => {
		delete process.env.PUBLIC_OWNER_HANDLE;
		delete process.env.PUBLIC_HOST_LABEL;
		delete process.env.PUBLIC_PDS_HOST;
		vi.resetModules();
		const { resolveChromeData } = await import('./chrome');
		const data = resolveChromeData();
		expect(data.identity.user).toBe('protocol7');
		expect(data.identity.host).toBe('helios');
		expect(data.link.pds).toBe('pds.proto.cool');
	});

	it('truncates SHA to first 7 chars', async () => {
		vi.resetModules();
		const { resolveChromeData } = await import('./chrome');
		expect(resolveChromeData().system.sig.length).toBe(7);
	});
});
```

(We also dropped the `__SVELTE_VERSION__` / `__SVELTEKIT_VERSION__` stubs since the resolver no longer reads them. Leave them defined in `vite.config.ts` and `app.d.ts` for now — removing those is unrelated cleanup.)

- [ ] **Step 3: Run tests**

Run: `npm run test:unit -- --run src/lib/shell/chrome.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/shell/chrome.ts src/lib/shell/chrome.test.ts
git commit -m "shell: trim ChromeData (drop kernel and shell fields)"
```

---

## Phase H — Deletions

The new tree is fully wired and works. Now delete the dead code.

### Task H1: Delete old shell components and modules

**Files to delete:** `Logoblock.svelte`, `Cluster.svelte`, `ClusterBar.svelte`, `NavTabs.svelte`, `ContentFrame.svelte`, `PromptBar.svelte`, `Statusbar.svelte`, `StubOverlay.svelte`, `cosmetic.ts`, `shell.css` (all under `src/lib/shell/`).

**Files to modify:** `src/app.css`

- [ ] **Step 1: Delete the files**

Run:

```bash
rm src/lib/shell/Logoblock.svelte \
   src/lib/shell/Cluster.svelte \
   src/lib/shell/ClusterBar.svelte \
   src/lib/shell/NavTabs.svelte \
   src/lib/shell/ContentFrame.svelte \
   src/lib/shell/PromptBar.svelte \
   src/lib/shell/Statusbar.svelte \
   src/lib/shell/StubOverlay.svelte \
   src/lib/shell/cosmetic.ts \
   src/lib/shell/shell.css
```

- [ ] **Step 2: Drop the now-broken `shell.css` import from `app.css`**

Replace the import block at the top of `src/app.css` (the first 9 lines) with:

```css
@import './lib/theme/tokens.css' layer(tokens);
@import './lib/theme/glow-keyframes.css';
@import './lib/theme/themes/phosphor-green.css' layer(themes);
@import './lib/theme/base.css' layer(base);
@import './lib/theme/utilities.css' layer(utilities);
@import './lib/shell/phosphor-shell.css' layer(shell);

@layer reset, tokens, themes, base, shell, components, utilities;
```

- [ ] **Step 3: Verify no orphan imports**

Run: `grep -rn "Logoblock\|ClusterBar\|/Cluster\b\|NavTabs\|ContentFrame\|PromptBar\|Statusbar\|StubOverlay\|/cosmetic\|shell\.css" src/`

Expected: no results.

- [ ] **Step 4: Verify check + tests + build**

Run: `npm run check && npm run test && npm run build`
Expected: all green; build succeeds.

- [ ] **Step 5: Commit**

```bash
git add -A src/lib/shell/ src/app.css
git commit -m "shell: delete old TUI components + cosmetic.ts + shell.css"
```

---

### Task H2: Delete old themes and the glyphs registry

**Files to delete:** `src/lib/theme/themes/neon-green.css`, `src/lib/theme/themes/magenta-vapor.css`, `src/lib/theme/glyphs.ts`, `src/lib/theme/glyphs.test.ts`.

- [ ] **Step 1: Delete the files**

Run:

```bash
rm src/lib/theme/themes/neon-green.css \
   src/lib/theme/themes/magenta-vapor.css \
   src/lib/theme/glyphs.ts \
   src/lib/theme/glyphs.test.ts
```

- [ ] **Step 2: Verify no orphan imports**

Run: `grep -rn "neon-green\|magenta-vapor\|/glyphs" src/`

Expected: no results.

- [ ] **Step 3: Verify check + tests + build**

Run: `npm run check && npm run test && npm run build`
Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add -A src/lib/theme/
git commit -m "theme: delete old themes (neon-green, magenta-vapor) and glyphs registry"
```

---

### Task H3: Trim `glow-keyframes.css` (remove `pulse-green`, `pulse-magenta`)

**Files:** Modify `src/lib/theme/glow-keyframes.css`

- [ ] **Step 1: Replace the file with phosphor-only keyframes**

```css
/* src/lib/theme/glow-keyframes.css
 * @keyframes for theme --glow-pulse animations.
 * @keyframes don't go inside @layer.
 */

@keyframes pulse-phosphor {
	0%,
	100% {
		box-shadow:
			0 0 5px rgba(184, 255, 90, 0.7),
			0 0 12px rgba(130, 227, 75, 0.45);
	}
	50% {
		box-shadow:
			0 0 8px rgba(184, 255, 90, 0.95),
			0 0 22px rgba(130, 227, 75, 0.7);
	}
}
```

- [ ] **Step 2: Verify**

Run: `npm run check && npm run build`
Expected: all green.

- [ ] **Step 3: Commit**

```bash
git add src/lib/theme/glow-keyframes.css
git commit -m "theme: trim glow-keyframes to pulse-phosphor only"
```

---

## Phase I — Responsive + reduced motion

### Task I1: Container-query breakpoints

The `Stage` element scopes the `chrome` container query. Each component handles its own responsive collapses by reading from that container.

**Files:** Modify `src/lib/shell/NavPanel.svelte`, `src/lib/shell/StatsPanel.svelte`, `src/lib/shell/Stage.svelte`, `src/routes/+page.svelte`, `src/routes/projects/+page.svelte`, `src/routes/about/+page.svelte`, `src/lib/shell/InstrumentCluster.svelte`

- [ ] **Step 1: Append container-query rules to `Stage.svelte` (`<style>` block)**

Add at the end of the existing `<style>` block:

```css
@container chrome (max-width: 479px) {
	.hero {
		padding: 40px 16px 36px;
	}
}
@container chrome (min-width: 480px) and (max-width: 1023px) {
	.hero {
		padding: 56px 24px 48px;
	}
}
@container chrome (min-width: 1024px) {
	.hero {
		padding: 72px 36px 60px;
	}
}
```

- [ ] **Step 2: Append container-query rules to `NavPanel.svelte` (`<style>` block)**

```css
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
```

- [ ] **Step 3: Append container-query rules to `StatsPanel.svelte` (`<style>` block)**

```css
@container chrome (max-width: 767px) {
	.stats-panel {
		grid-template-columns: repeat(2, 1fr);
	}
	.stats-panel .cell:nth-child(n + 5) {
		display: none;
	}
}
@container chrome (min-width: 768px) and (max-width: 1023px) {
	.stats-panel {
		grid-template-columns: repeat(3, 1fr);
	}
	.stats-panel .cell:nth-child(n + 7) {
		display: none;
	}
}
```

- [ ] **Step 4: Update each route's `.page` style block**

In each of `src/routes/+page.svelte`, `src/routes/projects/+page.svelte`, `src/routes/about/+page.svelte`, replace the `.page { … }` block with:

```css
.page {
	position: relative;
	display: grid;
	grid-template-columns: 1fr 280px;
	gap: 36px;
	align-items: center;
	min-height: 420px;
	flex: 1;
}
@container chrome (max-width: 767px) {
	.page {
		grid-template-columns: 1fr;
		gap: 24px;
		min-height: auto;
	}
}
```

- [ ] **Step 5: Append container-query rules to `InstrumentCluster.svelte` (`<style>` block)**

```css
@container chrome (max-width: 767px) {
	.cluster {
		width: 100%;
	}
}
```

- [ ] **Step 6: Append container-query rules to `HeroLockup.svelte` (`<style>` block)**

```css
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
```

- [ ] **Step 7: Resize the browser through all five breakpoints**

Run: `npm run dev`. Resize the window from ~360px wide up to ~1500px. Visit `/`, `/projects`, `/about` at each breakpoint.

Expected:

- xs (≤479px): nav stacks (badge top-left, channels wrap to row 2, sig hidden); hero collapses to 1 column; cluster goes below; stats shows 2 columns (VOL, EST).
- sm (480-767px): same nav stack; hero still 1 column.
- md (768-1023px): nav single row; hero 2 columns; cluster narrower (still 280px); stats shows 3 columns.
- lg (1024-1279px): full layout.
- xl (≥1280px): full layout (relaxed padding).

- [ ] **Step 8: Verify check**

Run: `npm run check`
Expected: passes.

- [ ] **Step 9: Commit**

```bash
git add src/lib/shell/Stage.svelte src/lib/shell/NavPanel.svelte src/lib/shell/StatsPanel.svelte src/lib/shell/InstrumentCluster.svelte src/lib/shell/HeroLockup.svelte src/routes/+page.svelte src/routes/projects/+page.svelte src/routes/about/+page.svelte
git commit -m "shell: container-query breakpoints (xs/sm/md/lg/xl)"
```

---

### Task I2: Reduced motion

The pulse keyframe is already neutralised by `phosphor-green.css` (sets `--glow-pulse: none`). The `--ease-*` durations are already neutralised by `tokens.css`. We just need to ensure no other `animation` properties slip past.

**Files:** Modify `src/lib/shell/phosphor-shell.css`

- [ ] **Step 1: Fill in `phosphor-shell.css`**

Replace `src/lib/shell/phosphor-shell.css` with:

```css
/* src/lib/shell/phosphor-shell.css
 * Shell-wide cross-component concerns.
 */

@layer shell {
	/* Reduced motion — global guarantee that no animation runs in the shell.
	 * Per-component pulse animations already read --glow-pulse (set to none in
	 * the theme's reduced-motion block); this is a belt-and-suspenders stop. */
	@media (prefers-reduced-motion: reduce) {
		.stage *,
		.stage *::before,
		.stage *::after {
			animation-duration: 0s !important;
			animation-iteration-count: 1 !important;
		}
	}
}
```

- [ ] **Step 2: Test reduced motion**

In a browser dev-tools rendering panel, set "Emulate CSS prefers-reduced-motion: reduce". Reload the page.

Expected: the brand-badge pulse pip and status-strip live-dot stop pulsing; the minimap pulse stops. Static halogen glow remains. Dither tiles still render (they're images, not animations).

- [ ] **Step 3: Verify check + tests + build**

Run: `npm run check && npm run test && npm run build`
Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add src/lib/shell/phosphor-shell.css
git commit -m "shell: global reduced-motion guard for the stage"
```

---

## Phase J — Final verification

### Task J1: End-to-end sweep

- [ ] **Step 1: Lint, format, type-check, test, build**

Run, in order:

```bash
npm run format
npm run lint
npm run check
npm run test
npm run build
```

Expected: all five succeed.

- [ ] **Step 2: Walk every route in dev**

Run: `npm run dev`. In the browser:

- Visit `/` — content channel highlighted; hero "an _indexed_ / personal archive." with halogen halo bleeding from lower-left; instrument cluster on the right; stats footer pinned at the bottom.
- Visit `/projects` — projects channel highlighted; hero "things in / _flight_."
- Visit `/about` — about channel highlighted; hero "kept in the / _open_."
- Press `1`, `2`, `3` — keyboard nav routes to the right pages and the live channel updates.
- Press `?` — Help overlay opens; lists `goto-content [1]`, `goto-projects [2]`, `goto-about [3]`, `theme-picker [t]`, `help [?]`. Press `Esc` to close.
- Press `t` — Theme picker opens. The only theme is "Phosphor green". Click it; overlay closes; nothing changes (the theme is already active). Press `t` again, press `Esc`.
- Tab through the page — focus order is brand badge → channel pads → no other interactives in the page; focus rings are halogen-tinted.
- Resize the window through xs / sm / md / lg / xl — layout adapts as described in I1.
- DevTools: emulate `prefers-reduced-motion: reduce` — pulses stop, dither and glow remain.

Expected: every interaction works without console errors.

- [ ] **Step 3: Verify final git state**

Run: `git status && git log --oneline | head -30`

Expected:

- Working tree clean.
- The phosphor-shell commits since the spec are present in the log.

- [ ] **Step 4: No final commit needed**

This task is verification only — there's nothing new to commit. If `format` modified files, commit those:

```bash
git add -A && git commit -m "chore: format" || echo "(no changes)"
```

---

## Out-of-scope reminders

These are NOT in this plan and should NOT be added:

- Light-mode `[data-mode='light']` blocks for the new theme (deferred).
- Search and command palette overlays / chip (deferred to feed spec).
- Federated content feed in `/` (deferred to feed spec).
- Animated halo / drifting dither / scan-line effects (explicitly excluded).
- Theme alternates beyond `phosphor-green` (single theme ships in v1).
