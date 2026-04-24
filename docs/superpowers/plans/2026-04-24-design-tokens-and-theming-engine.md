# Design Tokens & Theming Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the proto.cool design token system and cookie-driven theming engine, including the default neon green theme and the magenta vapor reference alternate. Per spec at `docs/superpowers/specs/2026-04-24-design-tokens-and-theming-engine-design.md`.

**Architecture:** Pure-semantic CSS custom properties scoped to `[data-theme="<id>"][data-mode="<mode>"]` selectors. Theme + mode persisted via cookies, read by SvelteKit `handle` hook at SSR for FOUC-free first paint. A small client module exposes `setTheme` / `setMode`. TUI bones (hard 1px edges, frame chrome, character grid) wrapped in modern bloom (wide soft halos).

**Tech Stack:** SvelteKit 2 + Svelte 5 (existing), TypeScript strict (existing), Vitest (existing — node environment), plain CSS with `@layer`. **No new dependencies.**

---

## File structure produced by this plan

```
src/
├── app.css                                   MODIFY — add layer order + imports
├── app.html                                  MODIFY — placeholders + inline script
├── app.d.ts                                  MODIFY — declare App.Locals
├── hooks.server.ts                           NEW
├── routes/
│   ├── +layout.server.ts                     NEW
│   └── dev/themes/+page.svelte               NEW — test route (dev-gated)
│   └── dev/themes/+page.server.ts            NEW — dev gate
└── lib/
    └── theme/
        ├── index.ts                          NEW — public API
        ├── registry.ts                       NEW — typed theme list
        ├── cookies.ts                        NEW — pure parse + DOM write
        ├── glyphs.ts                         NEW — frame chrome, status, cursor
        ├── resolve.ts                        NEW — pure validation helpers
        ├── tokens.css                        NEW — fixed tokens
        ├── glow-keyframes.css                NEW — pulse keyframes
        ├── utilities.css                     NEW — .bg-scanline
        ├── base.css                          NEW — element resets
        └── themes/
            ├── neon-green.css                NEW
            └── magenta-vapor.css             NEW

src/lib/theme/cookies.test.ts                 NEW — tests
src/lib/theme/resolve.test.ts                 NEW — tests
src/lib/theme/glyphs.test.ts                  NEW — tests
```

## Test strategy

Vitest is configured for node environment only (per `vite.config.ts`). To stay in that environment and avoid adding jsdom:
- **Pure logic** (cookie parsing, theme/mode resolution, glyph constants) lives in dedicated modules and is fully tested.
- **DOM-touching code** (writing `document.cookie`, setting `document.documentElement.dataset.*`) is a thin wrapper, not unit-tested. Validation happens via the dev test route at `/dev/themes`.

---

## Task 1: Create theme registry and types

**Files:**
- Create: `src/lib/theme/registry.ts`

- [ ] **Step 1: Write `registry.ts`**

```ts
// src/lib/theme/registry.ts

export const themes = [
	{
		id: 'neon-green',
		name: 'Neon green',
		supportedModes: ['dark', 'light'],
		default: true
	},
	{
		id: 'magenta-vapor',
		name: 'Magenta vapor',
		supportedModes: ['dark', 'light']
	}
] as const;

export type ThemeId = (typeof themes)[number]['id'];
export type Mode = 'dark' | 'light' | 'system';

export const DEFAULT_THEME: ThemeId = 'neon-green';
export const DEFAULT_MODE: Mode = 'system';
```

- [ ] **Step 2: Type-check**

Run: `pnpm check`
Expected: PASS — no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/theme/registry.ts
git commit -m "theme: add registry and types"
```

---

## Task 2: Create pure cookie parser with tests (TDD)

**Files:**
- Create: `src/lib/theme/cookies.ts`
- Create: `src/lib/theme/cookies.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/theme/cookies.test.ts
import { describe, it, expect } from 'vitest';
import { parseCookieValue } from './cookies';

describe('parseCookieValue', () => {
	it('returns the value when the named cookie is present', () => {
		expect(parseCookieValue('foo=bar; baz=qux', 'baz')).toBe('qux');
	});

	it('returns undefined when the cookie is missing', () => {
		expect(parseCookieValue('foo=bar', 'missing')).toBeUndefined();
	});

	it('returns undefined for an empty cookie string', () => {
		expect(parseCookieValue('', 'foo')).toBeUndefined();
	});

	it('handles a single cookie with no semicolons', () => {
		expect(parseCookieValue('proto-theme=neon-green', 'proto-theme')).toBe('neon-green');
	});

	it('handles whitespace around delimiters', () => {
		expect(parseCookieValue('a=1;  b=2 ;c=3', 'b')).toBe('2');
	});

	it('does not match cookie name as a prefix of another name', () => {
		expect(parseCookieValue('proto-theme-old=x; proto-theme=neon-green', 'proto-theme')).toBe(
			'neon-green'
		);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- cookies.test.ts`
Expected: FAIL — module `./cookies` not found, or `parseCookieValue` is undefined.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/theme/cookies.ts

/**
 * Pure cookie-string parser. Works in any environment.
 * Returns the value of the named cookie, or undefined if absent.
 */
export function parseCookieValue(cookieString: string, name: string): string | undefined {
	if (!cookieString) return undefined;
	const parts = cookieString.split(';');
	for (const part of parts) {
		const trimmed = part.trim();
		const eq = trimmed.indexOf('=');
		if (eq === -1) continue;
		const key = trimmed.slice(0, eq);
		if (key === name) return trimmed.slice(eq + 1);
	}
	return undefined;
}

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * Browser-only: write a cookie via document.cookie.
 * Not unit-tested — validated via the dev test route.
 */
export function writeCookie(name: string, value: string): void {
	if (typeof document === 'undefined') return;
	document.cookie = `${name}=${value}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- cookies.test.ts`
Expected: PASS — all 6 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/theme/cookies.ts src/lib/theme/cookies.test.ts
git commit -m "theme: add cookie parse + write helpers"
```

---

## Task 3: Create theme/mode resolvers with tests (TDD)

**Files:**
- Create: `src/lib/theme/resolve.ts`
- Create: `src/lib/theme/resolve.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/theme/resolve.test.ts
import { describe, it, expect } from 'vitest';
import { resolveTheme, resolveMode } from './resolve';

describe('resolveTheme', () => {
	it('returns a known theme id when valid', () => {
		expect(resolveTheme('neon-green')).toBe('neon-green');
		expect(resolveTheme('magenta-vapor')).toBe('magenta-vapor');
	});

	it('returns the default when the value is unknown', () => {
		expect(resolveTheme('not-a-theme')).toBe('neon-green');
	});

	it('returns the default when the value is undefined', () => {
		expect(resolveTheme(undefined)).toBe('neon-green');
	});

	it('returns the default for empty string', () => {
		expect(resolveTheme('')).toBe('neon-green');
	});
});

describe('resolveMode', () => {
	it('returns valid modes verbatim', () => {
		expect(resolveMode('dark')).toBe('dark');
		expect(resolveMode('light')).toBe('light');
		expect(resolveMode('system')).toBe('system');
	});

	it('returns the default for unknown values', () => {
		expect(resolveMode('purple')).toBe('system');
	});

	it('returns the default for undefined', () => {
		expect(resolveMode(undefined)).toBe('system');
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- resolve.test.ts`
Expected: FAIL — module `./resolve` not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/theme/resolve.ts
import { themes, DEFAULT_THEME, DEFAULT_MODE, type ThemeId, type Mode } from './registry';

const VALID_THEME_IDS = new Set<string>(themes.map((t) => t.id));
const VALID_MODES = new Set<Mode>(['dark', 'light', 'system']);

/**
 * Pure: validate a string against the theme registry.
 * Returns the input if it's a known theme id, otherwise the default.
 */
export function resolveTheme(value: string | undefined): ThemeId {
	if (value && VALID_THEME_IDS.has(value)) return value as ThemeId;
	return DEFAULT_THEME;
}

/**
 * Pure: validate a string against the allowed modes.
 * Returns the input if valid, otherwise the default.
 */
export function resolveMode(value: string | undefined): Mode {
	if (value && VALID_MODES.has(value as Mode)) return value as Mode;
	return DEFAULT_MODE;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- resolve.test.ts`
Expected: PASS — all 7 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/theme/resolve.ts src/lib/theme/resolve.test.ts
git commit -m "theme: add resolveTheme and resolveMode"
```

---

## Task 4: Create glyph constants with smoke test

**Files:**
- Create: `src/lib/theme/glyphs.ts`
- Create: `src/lib/theme/glyphs.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/theme/glyphs.test.ts
import { describe, it, expect } from 'vitest';
import { FRAME, STATUS, CURSOR, PROMPT } from './glyphs';

describe('glyphs', () => {
	it('exports FRAME with single-line and double-line box-drawing characters', () => {
		expect(FRAME.tl).toBe('┌');
		expect(FRAME.br).toBe('┘');
		expect(FRAME.h).toBe('─');
		expect(FRAME.v).toBe('│');
		expect(FRAME.dTl).toBe('╔');
		expect(FRAME.dH).toBe('═');
	});

	it('exports STATUS indicators', () => {
		expect(STATUS.ok).toBe('[OK]');
		expect(STATUS.warn).toBe('[!]');
		expect(STATUS.err).toBe('[X]');
	});

	it('exports CURSOR variants', () => {
		expect(CURSOR.block).toBe('█');
	});

	it('exports PROMPT variants', () => {
		expect(PROMPT.shell).toBe('$');
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- glyphs.test.ts`
Expected: FAIL — module `./glyphs` not found.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/theme/glyphs.ts

export const FRAME = {
	// single-line
	tl: '┌',
	tr: '┐',
	bl: '└',
	br: '┘',
	h: '─',
	v: '│',
	cross: '┼',
	tDown: '┬',
	tUp: '┴',
	tRight: '├',
	tLeft: '┤',
	// double-line variants for emphasis
	dTl: '╔',
	dTr: '╗',
	dBl: '╚',
	dBr: '╝',
	dH: '═',
	dV: '║'
} as const;

export const STATUS = {
	ok: '[OK]',
	warn: '[!]',
	err: '[X]',
	info: '[?]',
	dot: '[●]',
	empty: '[ ]'
} as const;

export const CURSOR = {
	block: '█',
	bar: '▎',
	under: '▁'
} as const;

export const PROMPT = {
	shell: '$',
	arrow: '>',
	bracket: '>>'
} as const;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- glyphs.test.ts`
Expected: PASS — all 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/theme/glyphs.ts src/lib/theme/glyphs.test.ts
git commit -m "theme: add glyph constants module"
```

---

## Task 5: Create the public theme API

**Files:**
- Create: `src/lib/theme/index.ts`

- [ ] **Step 1: Write `index.ts`**

```ts
// src/lib/theme/index.ts
import { themes, type ThemeId, type Mode, DEFAULT_THEME, DEFAULT_MODE } from './registry';
import { writeCookie } from './cookies';
import { resolveTheme, resolveMode } from './resolve';

export { themes, DEFAULT_THEME, DEFAULT_MODE };
export type { ThemeId, Mode };
export { resolveTheme, resolveMode };

const THEME_COOKIE = 'proto-theme';
const MODE_COOKIE = 'proto-mode';

/**
 * Browser-only: switch to the named theme.
 * Validates against the registry. Persists to cookie + updates the dom.
 */
export function setTheme(id: ThemeId): void {
	const resolved = resolveTheme(id);
	writeCookie(THEME_COOKIE, resolved);
	if (typeof document !== 'undefined') {
		document.documentElement.dataset.theme = resolved;
	}
}

/**
 * Browser-only: switch mode.
 * Validates. Persists to cookie + updates the dom.
 */
export function setMode(mode: Mode): void {
	const resolved = resolveMode(mode);
	writeCookie(MODE_COOKIE, resolved);
	if (typeof document !== 'undefined') {
		document.documentElement.dataset.mode = resolved;
	}
}

export const COOKIE_NAMES = {
	theme: THEME_COOKIE,
	mode: MODE_COOKIE
} as const;
```

- [ ] **Step 2: Type-check**

Run: `pnpm check`
Expected: PASS — no type errors.

- [ ] **Step 3: Run all tests so far**

Run: `pnpm test`
Expected: PASS — all tests from Tasks 2, 3, 4 still green.

- [ ] **Step 4: Commit**

```bash
git add src/lib/theme/index.ts
git commit -m "theme: add public API (setTheme, setMode)"
```

---

## Task 6: Create fixed tokens CSS

**Files:**
- Create: `src/lib/theme/tokens.css`

- [ ] **Step 1: Write `tokens.css`**

```css
/* src/lib/theme/tokens.css
 * Fixed tokens — do NOT vary across themes. Defaults at :root.
 */

:root {
	/* Type — body/UI tier (20px base, ~1.25 ratio, rounded) */
	--text-xs: 13px;
	--text-sm: 16px;
	--text-base: 20px;
	--text-md: 24px;
	--text-lg: 32px;
	--text-xl: 40px;
	--text-2xl: 48px;

	/* Type — display tier (Lunema, hand-picked, fluid) */
	--display-sm: clamp(48px, 6vw, 64px);
	--display-md: clamp(64px, 9vw, 96px);
	--display-lg: clamp(80px, 12vw, 128px);
	--display-xl: clamp(96px, 16vw, 160px);

	/* Line-heights */
	--leading-tight: 1.1;
	--leading-snug: 1.3;
	--leading-body: 1.55;
	--leading-loose: 1.75;

	/* Letter-spacing */
	--tracking-tight: -0.02em;
	--tracking-normal: 0;
	--tracking-wide: 0.04em;
	--tracking-mono: -0.01em;

	/* Weights */
	--weight-regular: 400;
	--weight-medium: 500;
	--weight-bold: 700;
	--weight-black: 800;

	/* Spacing — 4px base */
	--space-0: 0;
	--space-1: 4px;
	--space-2: 8px;
	--space-3: 12px;
	--space-4: 16px;
	--space-5: 20px;
	--space-6: 24px;
	--space-8: 32px;
	--space-10: 40px;
	--space-12: 48px;
	--space-16: 64px;
	--space-20: 80px;
	--space-24: 96px;

	/* Character cell — Departure Mono at 16px (calibration estimate) */
	--cell-w: 10px;
	--cell-h: 20px;

	/* Radii — mostly zero, sharp aesthetic */
	--radius-none: 0;
	--radius-sm: 2px;
	--radius-pill: 9999px;

	/* Motion */
	--duration-instant: 0ms;
	--duration-fast: 100ms;
	--duration-base: 200ms;
	--duration-slow: 400ms;

	--ease-out: cubic-bezier(0.2, 0, 0, 1);
	--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
	--ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);

	/* Z-index — small fixed scale */
	--z-base: 0;
	--z-raised: 10;
	--z-overlay: 100;
	--z-toast: 1000;

	/* Status colors — shared across themes for accessibility recognition.
	 * Theme files MAY override inside their own selectors but v1 themes do not. */
	--color-ok: #4ade80;
	--color-warn: #ffb800;
	--color-error: #ff4444;
	--color-info: #50a0ff;
}

/* Reduced motion — neutralize all durations */
@media (prefers-reduced-motion: reduce) {
	:root {
		--duration-instant: 0ms;
		--duration-fast: 0ms;
		--duration-base: 0ms;
		--duration-slow: 0ms;
	}
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/theme/tokens.css
git commit -m "theme: add fixed tokens (type, space, cell, radii, motion, z, status)"
```

---

## Task 7: Create glow keyframes CSS

**Files:**
- Create: `src/lib/theme/glow-keyframes.css`

- [ ] **Step 1: Write `glow-keyframes.css`**

```css
/* src/lib/theme/glow-keyframes.css
 * @keyframes for theme --glow-pulse animations.
 * @keyframes don't go inside @layer.
 */

@keyframes pulse-green {
	0%,
	100% {
		text-shadow:
			0 0 6px rgba(91, 250, 91, 0.55),
			0 0 14px rgba(91, 250, 91, 0.25);
		box-shadow:
			0 0 0 1px rgba(91, 250, 91, 1),
			0 0 8px rgba(91, 250, 91, 0.4);
	}
	50% {
		text-shadow:
			0 0 12px rgba(91, 250, 91, 0.85),
			0 0 24px rgba(91, 250, 91, 0.45);
		box-shadow:
			0 0 0 1px rgba(91, 250, 91, 1),
			0 0 18px rgba(91, 250, 91, 0.7);
	}
}

@keyframes pulse-magenta {
	0%,
	100% {
		text-shadow:
			0 0 6px rgba(255, 43, 214, 0.55),
			0 0 14px rgba(255, 43, 214, 0.25);
		box-shadow:
			0 0 0 1px rgba(255, 43, 214, 1),
			0 0 8px rgba(255, 43, 214, 0.4);
	}
	50% {
		text-shadow:
			0 0 12px rgba(255, 43, 214, 0.85),
			0 0 24px rgba(255, 43, 214, 0.45);
		box-shadow:
			0 0 0 1px rgba(255, 43, 214, 1),
			0 0 18px rgba(255, 43, 214, 0.7);
	}
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/theme/glow-keyframes.css
git commit -m "theme: add pulse keyframes for glow-pulse"
```

---

## Task 8: Create utilities CSS (.bg-scanline)

**Files:**
- Create: `src/lib/theme/utilities.css`

- [ ] **Step 1: Write `utilities.css`**

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
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/theme/utilities.css
git commit -m "theme: add .bg-scanline utility"
```

---

## Task 9: Create base CSS (element resets + base styles)

**Files:**
- Create: `src/lib/theme/base.css`

- [ ] **Step 1: Write `base.css`**

```css
/* src/lib/theme/base.css
 * Element resets and base styles using tokens.
 * Note: app.css already sets html { font-family, font-synthesis, smoothing }.
 * This file extends that with element-level defaults.
 */

@layer base {
	*,
	*::before,
	*::after {
		box-sizing: border-box;
	}

	html {
		background: var(--color-bg);
		color: var(--color-fg);
		font-size: var(--text-base);
		line-height: var(--leading-body);
	}

	body {
		margin: 0;
		min-height: 100vh;
	}

	h1,
	h2,
	h3,
	h4,
	h5,
	h6 {
		margin: 0;
		font-weight: var(--weight-bold);
		line-height: var(--leading-snug);
	}

	p {
		margin: 0 0 var(--space-4) 0;
	}

	a {
		color: var(--color-link);
		text-decoration-color: var(--color-accent);
		text-decoration-thickness: 2px;
		text-underline-offset: 3px;
	}

	a:visited {
		color: var(--color-link-visited);
	}

	a:hover {
		text-decoration-thickness: 3px;
	}

	*:focus {
		outline: none;
	}

	*:focus-visible {
		outline: none;
		box-shadow: var(--glow-focus);
	}

	::selection {
		background: var(--color-accent);
		color: var(--color-on-accent);
	}

	hr {
		border: 0;
		border-top: 1px solid var(--color-edge);
		margin: var(--space-6) 0;
	}

	code,
	kbd,
	pre,
	samp {
		font-family: var(--font-mono);
		letter-spacing: var(--tracking-mono);
	}
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/theme/base.css
git commit -m "theme: add element resets and base styles"
```

---

## Task 10: Create default theme — neon green

**Files:**
- Create: `src/lib/theme/themes/neon-green.css`

- [ ] **Step 1: Write `neon-green.css`**

```css
/* src/lib/theme/themes/neon-green.css
 * Default theme. Phosphor green CRT vibe. Soft halo bloom + hard 1px edges.
 */

[data-theme='neon-green'][data-mode='dark'],
[data-theme='neon-green'][data-mode='system'] {
	--color-bg: #050508;
	--color-surface: #0c0c12;
	--color-surface-2: #15151d;
	--color-edge: #1f2a1f;
	--color-fg: #e8f5e8;
	--color-fg-dim: #9caa9c;
	--color-fg-mute: #5c6b5c;
	--color-accent: #5bfa5b;
	--color-accent-2: #5bfa5b;
	--color-on-accent: #000;
	--color-link: #5bfa5b;
	--color-link-visited: #3daa3d;
	--color-focus: #5bfa5b;

	--glow-text:
		0 0 8px rgba(91, 250, 91, 0.5),
		0 0 18px rgba(91, 250, 91, 0.25);
	--glow-edge:
		0 0 0 1px rgba(91, 250, 91, 1),
		0 0 16px rgba(91, 250, 91, 0.4),
		0 0 4px rgba(91, 250, 91, 0.5);
	--glow-focus:
		0 0 0 1px #5bfa5b,
		0 0 0 3px rgba(91, 250, 91, 0.4),
		0 0 14px rgba(91, 250, 91, 0.55);
	--glow-pulse: pulse-green 2s var(--ease-in-out) infinite;
}

[data-theme='neon-green'][data-mode='light'] {
	--color-bg: #f5f5f0;
	--color-surface: #ffffff;
	--color-surface-2: #fafaf5;
	--color-edge: #1f1f1f;
	--color-fg: #0a0a0a;
	--color-fg-dim: #4a4a4a;
	--color-fg-mute: #7a7a7a;
	--color-accent: #5bfa5b;
	--color-accent-2: #5bfa5b;
	--color-on-accent: #000;
	--color-link: #0a0a0a;
	--color-link-visited: #4a4a4a;
	--color-focus: #0a0a0a;

	--glow-text: none;
	--glow-edge: none;
	--glow-focus: 0 0 0 2px var(--color-focus);
	--glow-pulse: none;
}

@media (prefers-color-scheme: light) {
	[data-theme='neon-green'][data-mode='system'] {
		--color-bg: #f5f5f0;
		--color-surface: #ffffff;
		--color-surface-2: #fafaf5;
		--color-edge: #1f1f1f;
		--color-fg: #0a0a0a;
		--color-fg-dim: #4a4a4a;
		--color-fg-mute: #7a7a7a;
		--color-accent: #5bfa5b;
		--color-accent-2: #5bfa5b;
		--color-on-accent: #000;
		--color-link: #0a0a0a;
		--color-link-visited: #4a4a4a;
		--color-focus: #0a0a0a;

		--glow-text: none;
		--glow-edge: none;
		--glow-focus: 0 0 0 2px var(--color-focus);
		--glow-pulse: none;
	}
}

/* Reduced motion — per-theme pulse override */
@media (prefers-reduced-motion: reduce) {
	[data-theme='neon-green'] {
		--glow-pulse: none;
	}
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/theme/themes/neon-green.css
git commit -m "theme: add neon green default theme"
```

---

## Task 11: Create reference alternate — magenta vapor

**Files:**
- Create: `src/lib/theme/themes/magenta-vapor.css`

- [ ] **Step 1: Write `magenta-vapor.css`**

```css
/* src/lib/theme/themes/magenta-vapor.css
 * Reference alternate. Synthwave: hot magenta + cyan secondary, layered halos.
 */

[data-theme='magenta-vapor'][data-mode='dark'],
[data-theme='magenta-vapor'][data-mode='system'] {
	--color-bg: #100012;
	--color-surface: #1a0f1f;
	--color-surface-2: #241828;
	--color-edge: #3a1e40;
	--color-fg: #f5e8f2;
	--color-fg-dim: #b59cb0;
	--color-fg-mute: #6e5468;
	--color-accent: #ff2bd6;
	--color-accent-2: #2bffe7;
	--color-on-accent: #000;
	--color-link: #ff2bd6;
	--color-link-visited: #b01f95;
	--color-focus: #2bffe7;

	--glow-text:
		0 0 8px rgba(255, 43, 214, 0.6),
		0 0 24px rgba(255, 43, 214, 0.25);
	--glow-edge:
		0 0 0 1px rgba(255, 43, 214, 1),
		0 0 14px rgba(255, 43, 214, 0.5),
		0 0 4px rgba(43, 255, 231, 0.4);
	--glow-focus:
		0 0 0 1px #2bffe7,
		0 0 0 3px rgba(43, 255, 231, 0.4),
		0 0 14px rgba(43, 255, 231, 0.55);
	--glow-pulse: pulse-magenta 2s var(--ease-in-out) infinite;
}

[data-theme='magenta-vapor'][data-mode='light'] {
	--color-bg: #faf5f8;
	--color-surface: #ffffff;
	--color-surface-2: #fafaf8;
	--color-edge: #1f1f1f;
	--color-fg: #0a0a0a;
	--color-fg-dim: #4a4a4a;
	--color-fg-mute: #7a7a7a;
	--color-accent: #ff2bd6;
	--color-accent-2: #2bffe7;
	--color-on-accent: #000;
	--color-link: #0a0a0a;
	--color-link-visited: #4a4a4a;
	--color-focus: #0a0a0a;

	--glow-text: none;
	--glow-edge: none;
	--glow-focus: 0 0 0 2px var(--color-focus);
	--glow-pulse: none;
}

@media (prefers-color-scheme: light) {
	[data-theme='magenta-vapor'][data-mode='system'] {
		--color-bg: #faf5f8;
		--color-surface: #ffffff;
		--color-surface-2: #fafaf8;
		--color-edge: #1f1f1f;
		--color-fg: #0a0a0a;
		--color-fg-dim: #4a4a4a;
		--color-fg-mute: #7a7a7a;
		--color-accent: #ff2bd6;
		--color-accent-2: #2bffe7;
		--color-on-accent: #000;
		--color-link: #0a0a0a;
		--color-link-visited: #4a4a4a;
		--color-focus: #0a0a0a;

		--glow-text: none;
		--glow-edge: none;
		--glow-focus: 0 0 0 2px var(--color-focus);
		--glow-pulse: none;
	}
}

@media (prefers-reduced-motion: reduce) {
	[data-theme='magenta-vapor'] {
		--glow-pulse: none;
	}
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/theme/themes/magenta-vapor.css
git commit -m "theme: add magenta vapor reference alternate"
```

---

## Task 12: Wire CSS imports into app.css with layer order

**Files:**
- Modify: `src/app.css`

- [ ] **Step 1: Read current `app.css`**

Run: `cat src/app.css | head -30`
Expected: shows the existing `@font-face` blocks and `:root` font tokens.

- [ ] **Step 2: Update `app.css`**

The current file ends with the body/code base styles. Replace the entire file with:

```css
@import './lib/theme/tokens.css' layer(tokens);
@import './lib/theme/glow-keyframes.css';
@import './lib/theme/themes/neon-green.css' layer(themes);
@import './lib/theme/themes/magenta-vapor.css' layer(themes);
@import './lib/theme/base.css' layer(base);
@import './lib/theme/utilities.css' layer(utilities);

@layer reset, tokens, themes, base, components, utilities;

/* ==========================================================================
   Fonts
   ========================================================================== */

/* Atkinson Hyperlegible Next — variable, body default */
@font-face {
	font-family: 'Atkinson Hyperlegible Next';
	src: url('/fonts/AtkinsonHyperlegibleNextVF-Variable.woff2') format('woff2');
	font-weight: 100 900;
	font-style: normal;
	font-display: swap;
}

/* Lunema Sans — static, display & marks. Only 400 / 800 cuts exist. */
@font-face {
	font-family: 'Lunema Sans';
	src: url('/fonts/lunema-sans-v-02-regular.woff2') format('woff2');
	font-weight: 400;
	font-style: normal;
	font-display: swap;
}
@font-face {
	font-family: 'Lunema Sans';
	src: url('/fonts/lunema-sans-v-02-regular-italic.woff2') format('woff2');
	font-weight: 400;
	font-style: italic;
	font-display: swap;
}
@font-face {
	font-family: 'Lunema Sans';
	src: url('/fonts/lunema-sans-v-02-extra-bold.woff2') format('woff2');
	font-weight: 800;
	font-style: normal;
	font-display: swap;
}
@font-face {
	font-family: 'Lunema Sans';
	src: url('/fonts/lunema-sans-v-02-extra-bold-italic.woff2') format('woff2');
	font-weight: 800;
	font-style: italic;
	font-display: swap;
}

/* Departure Mono — static, code & flavor. Pixel font — keep at small sizes. */
@font-face {
	font-family: 'Departure Mono';
	src: url('/fonts/DepartureMono-Regular.woff2') format('woff2');
	font-weight: 400;
	font-style: normal;
	font-display: swap;
}

/* ==========================================================================
   Font tokens (kept here next to @font-face)
   ========================================================================== */

:root {
	--font-sans:
		'Atkinson Hyperlegible Next', ui-sans-serif, system-ui, -apple-system,
		BlinkMacSystemFont, 'Segoe UI', sans-serif;
	--font-display: 'Lunema Sans', var(--font-sans);
	--font-mono:
		'Departure Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
}

/* ==========================================================================
   Global font behavior (must precede base.css element styles)
   ========================================================================== */

html {
	font-family: var(--font-sans);
	font-synthesis: none;
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
	text-rendering: optimizeLegibility;
}
```

**Note:** `@import` rules MUST come before any other CSS rule per the spec. The `@layer` declaration line that orders the layers also goes near the top. The font setup follows.

- [ ] **Step 3: Smoke check the build still works**

Run: `pnpm check`
Expected: PASS — no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app.css
git commit -m "theme: wire layer order and import token + theme stylesheets"
```

---

## Task 13: Declare App.Locals shape

**Files:**
- Modify: `src/app.d.ts`

- [ ] **Step 1: Read current `app.d.ts`**

Run: `cat src/app.d.ts`
Expected: shows the default SvelteKit `App` namespace with empty interfaces.

- [ ] **Step 2: Update `app.d.ts` to declare locals**

Replace entire file content with:

```ts
// See https://svelte.dev/docs/kit/types#app.d.ts
import type { ThemeId, Mode } from '$lib/theme/registry';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			theme: ThemeId;
			mode: Mode;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
```

- [ ] **Step 3: Type-check**

Run: `pnpm check`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app.d.ts
git commit -m "theme: declare App.Locals theme + mode shape"
```

---

## Task 14: Create the SSR `handle` hook

**Files:**
- Create: `src/hooks.server.ts`

- [ ] **Step 1: Write `hooks.server.ts`**

```ts
// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit';
import { resolveTheme, resolveMode } from '$lib/theme/resolve';
import { COOKIE_NAMES } from '$lib/theme';

export const handle: Handle = async ({ event, resolve }) => {
	const theme = resolveTheme(event.cookies.get(COOKIE_NAMES.theme));
	const mode = resolveMode(event.cookies.get(COOKIE_NAMES.mode));

	event.locals.theme = theme;
	event.locals.mode = mode;

	return resolve(event, {
		transformPageChunk: ({ html }) =>
			html.replace('%proto.theme%', theme).replace('%proto.mode%', mode)
	});
};
```

- [ ] **Step 2: Type-check**

Run: `pnpm check`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/hooks.server.ts
git commit -m "theme: add SSR handle hook for cookie-driven theming"
```

---

## Task 15: Add placeholders + inline safety script to app.html

**Files:**
- Modify: `src/app.html`

- [ ] **Step 1: Read current `app.html`**

Run: `cat src/app.html`
Expected: shows the existing scaffold with font preloads.

- [ ] **Step 2: Replace `<html>` opening tag and inject inline script**

Edit `src/app.html`:

Replace:
```html
<html lang="en">
	<head>
```

With:
```html
<html lang="en" data-theme="%proto.theme%" data-mode="%proto.mode%">
	<head>
		<script>
			var c = document.cookie,
				t = c.match(/proto-theme=([^;]+)/),
				m = c.match(/proto-mode=([^;]+)/);
			if (t) document.documentElement.dataset.theme = t[1];
			if (m) document.documentElement.dataset.mode = m[1];
		</script>
```

The result should be:

```html
<!doctype html>
<html lang="en" data-theme="%proto.theme%" data-mode="%proto.mode%">
	<head>
		<script>
			var c = document.cookie,
				t = c.match(/proto-theme=([^;]+)/),
				m = c.match(/proto-mode=([^;]+)/);
			if (t) document.documentElement.dataset.theme = t[1];
			if (m) document.documentElement.dataset.mode = m[1];
		</script>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<meta name="text-scale" content="scale" />

		<link
			rel="preload"
			href="/fonts/AtkinsonHyperlegibleNextVF-Variable.woff2"
			as="font"
			type="font/woff2"
			crossorigin
		/>
		<link
			rel="preload"
			href="/fonts/lunema-sans-v-02-regular.woff2"
			as="font"
			type="font/woff2"
			crossorigin
		/>

		%sveltekit.head%
	</head>
	<body data-sveltekit-preload-data="hover">
		<div style="display: contents">%sveltekit.body%</div>
	</body>
</html>
```

**Critical:** the `<script>` MUST NOT have `defer` or `async` — it needs to run synchronously before paint.

- [ ] **Step 3: Commit**

```bash
git add src/app.html
git commit -m "theme: wire data-theme/data-mode placeholders + inline cookie script"
```

---

## Task 16: Pass theme/mode through layout server load

**Files:**
- Create: `src/routes/+layout.server.ts`

- [ ] **Step 1: Write `+layout.server.ts`**

```ts
// src/routes/+layout.server.ts
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals }) => ({
	theme: locals.theme,
	mode: locals.mode
});
```

- [ ] **Step 2: Type-check**

Run: `pnpm check`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/routes/+layout.server.ts
git commit -m "theme: pass theme/mode to layout via server load"
```

---

## Task 17: Smoke check — server starts and renders

**Files:** none changed.

- [ ] **Step 1: Run the dev server in background**

Run: `pnpm dev`
Expected: server starts on http://localhost:5173 (or similar). No errors.

- [ ] **Step 2: Curl the root**

Run: `curl -s http://localhost:5173/ | grep -o 'data-theme="[^"]*" data-mode="[^"]*"'`
Expected: prints `data-theme="neon-green" data-mode="system"`.

- [ ] **Step 3: Curl with a theme cookie**

Run: `curl -s -b 'proto-theme=magenta-vapor; proto-mode=dark' http://localhost:5173/ | grep -o 'data-theme="[^"]*" data-mode="[^"]*"'`
Expected: prints `data-theme="magenta-vapor" data-mode="dark"`.

- [ ] **Step 4: Stop the dev server**

Kill the background dev process.

- [ ] **Step 5: Commit (if anything was inadvertently changed; otherwise skip)**

If `git status` shows nothing modified, skip. Otherwise:
```bash
git status
# investigate any unexpected changes
```

---

## Task 18: Build the dev test route — `/dev/themes`

**Files:**
- Create: `src/routes/dev/themes/+page.server.ts`
- Create: `src/routes/dev/themes/+page.svelte`

- [ ] **Step 1: Write the dev gate**

```ts
// src/routes/dev/themes/+page.server.ts
import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	if (!dev) error(404);
	return {};
};
```

- [ ] **Step 2: Write the test page**

```svelte
<!-- src/routes/dev/themes/+page.svelte -->
<script lang="ts">
	import { themes, setTheme, setMode, type ThemeId, type Mode } from '$lib/theme';
	import { FRAME, STATUS, CURSOR, PROMPT } from '$lib/theme/glyphs';

	let { data } = $props();

	// Track active selections locally so the picker reflects clicks immediately.
	// (setTheme/setMode update the dom dataset and write the cookie, but data.theme
	// from the server load doesn't refresh without a reload.)
	let currentTheme = $state<ThemeId>(data.theme);
	let currentMode = $state<Mode>(data.mode);

	function applyTheme(id: ThemeId) {
		setTheme(id);
		currentTheme = id;
	}

	function applyMode(m: Mode) {
		setMode(m);
		currentMode = m;
	}

	const modes: Mode[] = ['dark', 'light', 'system'];

	const colorTokens = [
		'--color-bg',
		'--color-surface',
		'--color-surface-2',
		'--color-edge',
		'--color-fg',
		'--color-fg-dim',
		'--color-fg-mute',
		'--color-accent',
		'--color-accent-2',
		'--color-on-accent',
		'--color-link',
		'--color-link-visited',
		'--color-focus',
		'--color-ok',
		'--color-warn',
		'--color-error',
		'--color-info'
	];

	const textSizes = [
		{ name: 'xs', token: '--text-xs' },
		{ name: 'sm', token: '--text-sm' },
		{ name: 'base', token: '--text-base' },
		{ name: 'md', token: '--text-md' },
		{ name: 'lg', token: '--text-lg' },
		{ name: 'xl', token: '--text-xl' },
		{ name: '2xl', token: '--text-2xl' }
	];

	const displaySizes = [
		{ name: 'sm', token: '--display-sm' },
		{ name: 'md', token: '--display-md' },
		{ name: 'lg', token: '--display-lg' },
		{ name: 'xl', token: '--display-xl' }
	];
</script>

<svelte:head>
	<title>theme test · proto.cool</title>
</svelte:head>

<div class="page">
	<header class="picker">
		<div class="picker-row">
			<span class="picker-label">THEME</span>
			{#each themes as t}
				<button
					class="picker-btn"
					class:active={currentTheme === t.id}
					onclick={() => applyTheme(t.id as ThemeId)}>{t.name}</button
				>
			{/each}
		</div>
		<div class="picker-row">
			<span class="picker-label">MODE</span>
			{#each modes as m}
				<button
					class="picker-btn"
					class:active={currentMode === m}
					onclick={() => applyMode(m)}>{m}</button
				>
			{/each}
		</div>
		<div class="picker-row">
			<span class="picker-label">CURRENT</span>
			<code>{currentTheme} / {currentMode}</code>
		</div>
	</header>

	<section class="block">
		<h2>Logomark</h2>
		<div class="logomark">
			<span class="logo-prompt">{PROMPT.shell}</span>
			<span class="logo-mark">proto.cool</span>
			<span class="logo-cursor"></span>
		</div>
	</section>

	<section class="block">
		<h2>Frame chrome panel</h2>
		<pre class="frame">
{FRAME.tl}{FRAME.h.repeat(2)} TELEMETRY {FRAME.h.repeat(20)}{FRAME.tr}
{FRAME.v}  STATUS    <span class="ok">{STATUS.ok}</span> nominal       {FRAME.v}
{FRAME.v}  UPLINK    <span class="ok">{STATUS.ok}</span> stable        {FRAME.v}
{FRAME.v}  AT-PROTO  <span class="ok">{STATUS.ok}</span> connected     {FRAME.v}
{FRAME.v}  CACHE     <span class="warn">{STATUS.warn}</span>  warming       {FRAME.v}
{FRAME.bl}{FRAME.h.repeat(33)}{FRAME.br}</pre>
	</section>

	<section class="block">
		<h2>Buttons</h2>
		<div class="row">
			<button class="btn-knockout">[ RUN ]</button>
			<button class="btn-ghost">[ FOCUS ME ]</button>
			<button class="btn-idle">[ IDLE ]</button>
		</div>
	</section>

	<section class="block">
		<h2>Body text</h2>
		<p>
			Streaming from <a href="#">at://protocol7.computer/cool.proto.post/3kdj…</a> — last update
			<span class="accent">14s</span> ago<span class="cursor-blink">{CURSOR.block}</span>
		</p>
		<p class="dim">Secondary text in <code>--color-fg-dim</code>.</p>
		<p class="mute">Tertiary text in <code>--color-fg-mute</code> — UI only.</p>
	</section>

	<section class="block">
		<h2>Type scale — body/UI tier</h2>
		{#each textSizes as t}
			<div class="type-row" style="font-size: var({t.token})">
				{t.name} — The quick brown fox jumps over the lazy dog
			</div>
		{/each}
	</section>

	<section class="block">
		<h2>Type scale — display tier</h2>
		{#each displaySizes as t}
			<div class="display-row" style="font-size: var({t.token})">
				display-{t.name}
			</div>
		{/each}
	</section>

	<section class="block">
		<h2>Status indicators</h2>
		<div class="row mono">
			<span class="ok">{STATUS.ok}</span>
			<span class="warn">{STATUS.warn}</span>
			<span class="err">{STATUS.err}</span>
			<span class="info">{STATUS.info}</span>
			<span class="accent">{STATUS.dot}</span>
		</div>
	</section>

	<section class="block">
		<h2>Color tokens</h2>
		<div class="swatches">
			{#each colorTokens as token}
				<div class="swatch">
					<div class="swatch-chip" style="background: var({token})"></div>
					<code>{token}</code>
				</div>
			{/each}
		</div>
	</section>

	<section class="block">
		<h2>Glow tokens applied</h2>
		<div class="row">
			<span class="glow-text-sample">--glow-text on accent text</span>
		</div>
		<div class="row">
			<div class="glow-edge-sample">--glow-edge on a panel</div>
		</div>
	</section>

	<section class="block bg-scanline" style="--scanline-opacity: 0.04">
		<h2>.bg-scanline utility</h2>
		<p>Scanlines visible at 4% opacity for demonstration. Default is 1.2%.</p>
	</section>

	<section class="block">
		<h2>Character cell calibration</h2>
		<p>
			A row of 30 monospace characters should align to 30 cell widths. If the green grid
			and the chars don't match exactly, adjust <code>--cell-w</code> in
			<code>tokens.css</code>.
		</p>
		<div class="cell-calib">
			<div class="cell-grid"></div>
			<div class="cell-mono">123456789012345678901234567890</div>
		</div>
	</section>
</div>

<style>
	.page {
		max-width: 920px;
		margin: 0 auto;
		padding: var(--space-8);
		font-family: var(--font-sans);
		font-size: var(--text-base);
		line-height: var(--leading-body);
	}

	.picker {
		position: sticky;
		top: 0;
		background: var(--color-surface);
		padding: var(--space-4);
		margin-bottom: var(--space-8);
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		box-shadow: var(--glow-edge);
		z-index: var(--z-raised);
	}
	.picker-row {
		display: flex;
		gap: var(--space-3);
		align-items: center;
		font-family: var(--font-mono);
		font-size: var(--text-sm);
	}
	.picker-label {
		color: var(--color-fg-mute);
		min-width: 80px;
		letter-spacing: var(--tracking-wide);
	}
	.picker-btn {
		font-family: var(--font-mono);
		font-size: var(--text-sm);
		padding: var(--space-1) var(--space-3);
		background: transparent;
		color: var(--color-fg);
		border: 1px solid var(--color-edge);
		cursor: pointer;
		letter-spacing: var(--tracking-wide);
	}
	.picker-btn.active {
		background: var(--color-accent);
		color: var(--color-on-accent);
		border-color: var(--color-accent);
	}

	.block {
		margin-bottom: var(--space-12);
		padding-top: var(--space-4);
		border-top: 1px solid var(--color-edge);
	}
	.block h2 {
		font-family: var(--font-mono);
		font-size: var(--text-sm);
		color: var(--color-fg-dim);
		letter-spacing: var(--tracking-wide);
		text-transform: uppercase;
		margin-bottom: var(--space-4);
	}

	.row {
		display: flex;
		gap: var(--space-4);
		align-items: center;
		flex-wrap: wrap;
	}
	.row.mono {
		font-family: var(--font-mono);
		font-size: var(--text-base);
	}

	.logomark {
		display: inline-flex;
		align-items: center;
		gap: var(--space-3);
	}
	.logo-prompt {
		font-family: var(--font-mono);
		color: var(--color-accent);
		font-size: var(--text-2xl);
		line-height: 1;
		text-shadow: var(--glow-text);
	}
	.logo-mark {
		background: var(--color-accent);
		color: var(--color-on-accent);
		font-family: var(--font-display);
		font-weight: var(--weight-black);
		font-size: var(--text-xl);
		padding: var(--space-2) var(--space-3);
		letter-spacing: var(--tracking-tight);
		line-height: 1;
		box-shadow: var(--glow-edge);
	}
	.logo-cursor {
		display: inline-block;
		background: var(--color-accent);
		width: 14px;
		height: var(--text-2xl);
		box-shadow: var(--glow-edge);
		animation: var(--glow-pulse);
	}

	.frame {
		font-family: var(--font-mono);
		font-size: var(--text-sm);
		color: var(--color-accent);
		line-height: 1.4;
		margin: 0;
		text-shadow: var(--glow-text);
	}

	.btn-knockout {
		font-family: var(--font-mono);
		font-weight: var(--weight-bold);
		font-size: var(--text-sm);
		background: var(--color-accent);
		color: var(--color-on-accent);
		border: 0;
		padding: var(--space-2) var(--space-4);
		letter-spacing: var(--tracking-wide);
		box-shadow: var(--glow-edge);
		cursor: pointer;
	}
	.btn-ghost {
		font-family: var(--font-mono);
		font-weight: var(--weight-bold);
		font-size: var(--text-sm);
		background: transparent;
		color: var(--color-accent);
		border: 1px solid var(--color-accent);
		padding: var(--space-2) var(--space-4);
		letter-spacing: var(--tracking-wide);
		cursor: pointer;
	}
	.btn-idle {
		font-family: var(--font-mono);
		font-weight: var(--weight-bold);
		font-size: var(--text-sm);
		background: transparent;
		color: var(--color-fg-mute);
		border: 1px solid var(--color-edge);
		padding: var(--space-2) var(--space-4);
		letter-spacing: var(--tracking-wide);
		cursor: pointer;
	}

	.accent {
		color: var(--color-accent);
		text-shadow: var(--glow-text);
	}
	.dim {
		color: var(--color-fg-dim);
	}
	.mute {
		color: var(--color-fg-mute);
	}
	.ok {
		color: var(--color-ok);
	}
	.warn {
		color: var(--color-warn);
	}
	.err {
		color: var(--color-error);
	}
	.info {
		color: var(--color-info);
	}

	.cursor-blink {
		display: inline-block;
		color: var(--color-accent);
		animation: var(--glow-pulse);
		margin-left: 2px;
	}

	.type-row {
		font-family: var(--font-sans);
		margin-bottom: var(--space-2);
		line-height: var(--leading-snug);
	}
	.display-row {
		font-family: var(--font-display);
		font-weight: var(--weight-black);
		line-height: var(--leading-tight);
		letter-spacing: var(--tracking-tight);
		margin-bottom: var(--space-4);
	}

	.swatches {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
		gap: var(--space-3);
	}
	.swatch {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}
	.swatch-chip {
		aspect-ratio: 2 / 1;
		border: 1px solid var(--color-edge);
	}
	.swatch code {
		font-size: var(--text-xs);
	}

	.glow-text-sample {
		font-family: var(--font-display);
		font-weight: var(--weight-black);
		font-size: var(--text-xl);
		color: var(--color-accent);
		text-shadow: var(--glow-text);
	}
	.glow-edge-sample {
		padding: var(--space-4);
		background: var(--color-surface);
		color: var(--color-fg);
		font-family: var(--font-mono);
		box-shadow: var(--glow-edge);
	}

	.cell-calib {
		position: relative;
		display: inline-block;
	}
	.cell-grid {
		position: absolute;
		inset: 0;
		background-image: repeating-linear-gradient(
			90deg,
			rgba(91, 250, 91, 0.2) 0,
			rgba(91, 250, 91, 0.2) 1px,
			transparent 1px,
			transparent var(--cell-w)
		);
	}
	.cell-mono {
		font-family: var(--font-mono);
		font-size: 16px;
		color: var(--color-fg);
		white-space: pre;
	}
</style>
```

- [ ] **Step 3: Type-check**

Run: `pnpm check`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/routes/dev/themes/
git commit -m "theme: add /dev/themes test route for visual validation"
```

---

## Task 19: End-to-end smoke check via dev server

**Files:** none changed.

- [ ] **Step 1: Run the dev server**

Run: `pnpm dev`

- [ ] **Step 2: Open the test route**

Visit: http://localhost:5173/dev/themes

Expected:
- The page renders with the default neon green theme in dark/system mode.
- Theme picker buttons at the top show "Neon green" (active) and "Magenta vapor".
- Mode picker shows "dark", "light", "system" with "system" active.
- Click "Magenta vapor" — page re-themes to magenta + cyan, page reload not required (uses `setTheme`).
- Click "light" — page switches to knockout/print register.
- Click "dark" — page returns to glow register.
- Refresh — selection persists (cookie).
- The frame-chrome panel shows box-drawing borders + `[OK]` indicators.
- The character-cell calibration block: the green vertical lines should align with monospace character boundaries.

- [ ] **Step 3: Verify no FOUC**

Refresh the page on a non-default theme (e.g. magenta vapor + light). The page should appear correctly themed from the first paint — no flash of dark or default theme.

- [ ] **Step 4: Verify reduced-motion neutralizes pulse**

In macOS System Settings → Accessibility → Display → enable "Reduce motion". Refresh the test route. The cursor block and logo cursor should NOT animate. (Re-disable reduced motion when done.)

- [ ] **Step 5: Verify system mode follows OS**

In macOS System Settings → Appearance, toggle Light/Dark while the test route is open with mode set to "system". The page should track the OS preference (light/knockout when OS is light, glow when OS is dark).

- [ ] **Step 6: If `--cell-w` calibration is off**

If the green grid lines in the calibration block don't align with monospace character boundaries, adjust `--cell-w` (and/or `--cell-h`) in `src/lib/theme/tokens.css` to match. Then commit:

```bash
git add src/lib/theme/tokens.css
git commit -m "theme: calibrate --cell-w to actual Departure Mono width"
```

- [ ] **Step 7: Stop the dev server**

Kill the dev process.

---

## Task 20: Run the full quality bar

**Files:** none changed.

- [ ] **Step 1: Run all tests**

Run: `pnpm test`
Expected: PASS — all tests across cookies, resolve, glyphs.

- [ ] **Step 2: Type-check**

Run: `pnpm check`
Expected: PASS.

- [ ] **Step 3: Lint**

Run: `pnpm lint`
Expected: PASS. If formatting fails, run `pnpm format` then re-check.

- [ ] **Step 4: Production build**

Run: `pnpm build`
Expected: PASS — build succeeds, no errors.

- [ ] **Step 5: Production preview smoke check**

Run: `pnpm preview`
Visit: http://localhost:4173/

Expected: home page renders, no errors in console. (The `/dev/themes` route 404s in production — this is correct.)

- [ ] **Step 6: Stop the preview server.**

- [ ] **Step 7: Final state check**

Run: `git status && git log --oneline | head -25`
Expected: working tree clean, ~20 new commits all prefixed `theme:` (or appropriate scope).

---

## Self-review checklist (run before declaring done)

- [ ] Every spec section has at least one task implementing it. The aesthetic intent section is encoded via `glyphs.ts`, `--cell-w`/`--cell-h`, the layered glow values, and the `.bg-scanline` utility.
- [ ] No placeholders, no TODOs, no "implement later" anywhere.
- [ ] Type names match across tasks: `ThemeId`, `Mode`, `themes`, `setTheme`, `setMode`, `resolveTheme`, `resolveMode`, `parseCookieValue`, `writeCookie`.
- [ ] All four `[data-theme][data-mode]` selector blocks exist for both themes (dark, light, system × 2 themes = 6 selector blocks per theme; the system block has both a base block and a `prefers-color-scheme: light` override).
- [ ] No new dependencies were added to `package.json`.
- [ ] The inline `<script>` in `app.html` has no `defer` or `async`.
- [ ] `@import` rules in `app.css` come before any other CSS rule.
