# proto.cool — Design tokens & theming engine

**Date:** 2026-04-24
**Branch:** `feat/move-to-atproto`
**Status:** approved

## Context

This spec defines the foundational design system for proto.cool v2: every CSS custom property the rest of the codebase will consume, plus the mechanism for selecting and persisting a theme + mode.

It is the first spec after the SvelteKit scaffold, deliberately scoped to **tokens + theming engine only**. UI primitives, blogging primitives, and AT Proto post primitives are subsequent specs. Builds on `2026-04-24-v2-sveltekit-scaffold-design.md`.

The site's identity is "nasapunk neon alternate universe" — a 90s retrofuturistic aesthetic where the UI mimics a TUI/CRT atmosphere. Each theme is a "channel" tuned to a different palette and glow personality, with the same structural skeleton.

## Aesthetic intent

The system pushes toward **TUI bones wrapped in modern bloom atmosphere**. Without this stated explicitly, the engine could just as easily host a polished modern dashboard with neon accents — that is *not* the goal.

**Reference points** (these shape token defaults and primitive design later):

- **Modern TUIs** — ratatui apps, lazygit, btop, charmbracelet/bubbletea apps. Source for frame chrome, status indicators, character-cell alignment, concentric focus selection.
- **Industrial / aerospace consoles** — Apollo MOCR, NORAD SAGE displays, Tektronix scopes. Source for nasapunk seriousness — telemetry-style layouts, grid-aligned data, decorative chrome that signals "instrumentation."
- **90s shareware DOS** — Norton Commander, DOS Edit, BBS doors. Selectively. Chunky knockout type, bold colored panels with hard edges, ALL-CAPS labels with letter-spacing.

**Design principles** (guardrails for primitives):

1. **Hard 1px edges, no rounded corners.** No `--radius-md` or `--radius-lg` exists in the token surface — discourage rounded by not providing it. Default `border-radius` is 0.
2. **Knockout (black-on-color)** is the canonical contrast pattern. Bright color blocks with `#000` text. The logomark is the proof.
3. **Frame chrome via box-drawing characters.** Panels and sections can be wrapped in `┌─ TITLE ──┐` style frames. A glyph constants module (`glyphs.ts`) provides the vocabulary.
4. **Character-cell grid awareness.** Tokens (`--cell-w`, `--cell-h`) anchor mixed-font layouts to a monospace column rhythm.
5. **Atmosphere via wide soft glow halos**, structure via tight 1px outlines. Glow tokens are layered: hard edge + soft bloom.
6. **Concentric focus rings** mimic TUI selection (1px solid + 3px halo + outer bloom).
7. **Status indicator vocabulary** — `[OK]`, `[!]`, `[X]`, `[?]`, `[●]`. Provided as glyph constants.
8. **Scanline texture** is available as an opt-in surface utility (`.bg-scanline`), off by default.

These are *guardrails*, not a style guide. The token system here makes them possible; the primitives spec exercises them.

## Decisions

| Decision | Choice |
|---|---|
| Catalog scope | Engine + default neon green + 1 reference alternate (magenta vapor) |
| Theme model | Color + glow personality vary; type/space/radii fixed across themes |
| Light mode strategy | Knockout daytime variant — same palette, glow-off solid blocks |
| Token architecture | Pure semantic (no primitive ramp layer) |
| Glow vocabulary | Semantic by usage: `--glow-text`, `--glow-edge`, `--glow-focus`, `--glow-pulse` |
| Glow personality | TUI bones (hard 1px edges) + modern bloom (wide soft halos) |
| Type scale | Two-tier: body/UI math (20px base × 1.25) + hand-picked display tier |
| Logomark behavior | Follows active theme — uses `--color-accent` like everything else |
| Persistence | Cookies (SSR-readable, no FOUC) |
| `system` mode | Resolved by CSS media query, no JS needed |
| Themes | Static CSS files now; engine compatible with future themes-as-PDS-records |
| Reference alternate | Magenta vapor (synthwave: hot magenta + cyan accent) |
| Status colors | Shared across themes for accessibility recognition (overridable but not overridden in v1) |

## Engine architecture

The engine is two HTML attributes plus cookies for persistence. **No JavaScript required for first paint on SSR routes.**

### Attributes

```html
<html data-theme="neon-green" data-mode="dark">
```

- Themes match `[data-theme="<id>"]`
- Modes match `[data-mode="dark" | "light" | "system"]`
- Theme CSS targets the combination: `[data-theme="neon-green"][data-mode="dark"]`

### Persistence

Two cookies, both `samesite=lax`, `path=/`, `max-age=1 year`:

- `proto-theme` — defaults to `neon-green`
- `proto-mode` — defaults to `system`

Cookies (not `localStorage`) so the server reads them at SSR and renders the document with correct `data-*` attributes already on `<html>` — zero FOUC. `localStorage` would force a client flash on first paint.

### `system` mode is resolved by CSS, not JS

Each theme block defines its own `system` selector that falls through to a media query:

```css
[data-theme="neon-green"][data-mode="dark"]   { /* dark vars */ }
[data-theme="neon-green"][data-mode="light"]  { /* light vars */ }
[data-theme="neon-green"][data-mode="system"] { /* dark by default */ }
@media (prefers-color-scheme: light) {
  [data-theme="neon-green"][data-mode="system"] { /* light vars */ }
}
```

No JS needed to honor system preference at first paint.

### SSR wiring (3 files)

**`src/hooks.server.ts`** — `handle` reads cookies, validates against the registry, populates `event.locals.theme` / `event.locals.mode`, and uses `transformPageChunk` to substitute `%proto.theme%` / `%proto.mode%` placeholders in `app.html`.

**`src/app.html`** — `<html lang="en" data-theme="%proto.theme%" data-mode="%proto.mode%">`. Document arrives correctly themed.

**`src/routes/+layout.server.ts`** — returns `{ theme, mode }` from locals so the layout (and any switcher UI built later) can read them.

**`src/app.d.ts`** — declares `App.Locals` shape so TypeScript knows about `theme` / `mode`.

### Prerendered routes — small inline script as safety net

Prerendered HTML is generated at build time and can't read cookies. To avoid the wrong theme flashing on those routes when a user has a non-default cookie, `app.html` includes a tiny inline `<script>` in `<head>` that runs synchronously before paint:

```html
<script>
  var c=document.cookie,
      t=c.match(/proto-theme=([^;]+)/),
      m=c.match(/proto-mode=([^;]+)/);
  if(t)document.documentElement.dataset.theme=t[1];
  if(m)document.documentElement.dataset.mode=m[1];
</script>
```

~200 bytes inline, runs before CSS applies, no flash. JS-disabled visitors on prerendered routes see the default theme — acceptable degradation.

### Runtime switching

A small client module exports two functions:

```ts
// src/lib/theme/index.ts
import type { ThemeId, Mode } from './registry';

export function setTheme(id: ThemeId): void;   // writes cookie + updates dom
export function setMode(mode: Mode): void;     // writes cookie + updates dom
```

The UI affordance that calls these (the picker) is **out of scope** — primitives spec.

### Theme registry

```ts
// src/lib/theme/registry.ts
export const themes = [
  { id: 'neon-green',    name: 'Neon green',    supportedModes: ['dark', 'light'], default: true },
  { id: 'magenta-vapor', name: 'Magenta vapor', supportedModes: ['dark', 'light'] },
] as const;

export type ThemeId = (typeof themes)[number]['id'];
export type Mode = 'dark' | 'light' | 'system';
```

`setTheme` validates against the registry. Adding a theme = drop a CSS file + add a registry entry + import the CSS in `app.css`.

## Token surface

Six categories. Color and glow vary per theme; everything else is fixed.

### Color tokens (theme-varying)

| Token | Purpose |
|---|---|
| `--color-bg` | Page background |
| `--color-surface` | Raised surface (card, panel, dialog) |
| `--color-surface-2` | Second-level raised (nested) |
| `--color-edge` | Borders, dividers, hairlines |
| `--color-fg` | Primary text |
| `--color-fg-dim` | Secondary text (captions, timestamps) |
| `--color-fg-mute` | Tertiary text (most muted; UI-only, not for body) |
| `--color-accent` | Primary brand accent |
| `--color-accent-2` | Secondary accent (only some themes use; defaults to `--color-accent`) |
| `--color-on-accent` | Text on accent surfaces — almost always `#000` |
| `--color-link` | Links |
| `--color-link-visited` | Visited links |
| `--color-focus` | Focus indicator |

**Status colors** (`--color-ok`, `--color-warn`, `--color-error`, `--color-info`) are *not* theme-varying by default. They live in `tokens.css` as fixed defaults shared across themes for accessibility recognition. A theme file CAN override them inside its own selector blocks if it has a strong reason to, but neither v1 theme does.

### Glow tokens (theme-varying)

Four tokens, each holds a **complete CSS value** (not composed from sub-tokens — keeps the surface tight, lets each theme dial personality directly):

| Token | Applied as | Notes |
|---|---|---|
| `--glow-text` | `text-shadow: var(--glow-text)` | Atmospheric bloom on accent text + display moments |
| `--glow-edge` | `box-shadow: var(--glow-edge)` | Hard 1px outline + wide soft halo (TUI bones + bloom) |
| `--glow-focus` | `box-shadow: var(--glow-focus)` | Concentric: 1px solid + 3px halo + outer bloom |
| `--glow-pulse` | `animation: var(--glow-pulse)` | Animated pulse for cursors, status dots |

In **light/knockout mode**, all four neutralize: `--glow-text: none`, `--glow-edge: none`, `--glow-focus: 0 0 0 2px var(--color-focus)` (solid ring instead of halo), `--glow-pulse: none`.

### Type tokens (fixed across themes)

**Font families** — already in `app.css`:

```
--font-sans:    'Atkinson Hyperlegible Next', ...   /* body default */
--font-display: 'Lunema Sans', ...                  /* sparingly: headings, marks */
--font-mono:    'Departure Mono', ...               /* code, flavor, TUI chrome */
```

**Body/UI tier** — 20px base, ~1.25 ratio, rounded for cleanliness:

```
--text-xs:   13px   /* fine print, chips */
--text-sm:   16px   /* small UI, form labels */
--text-base: 20px   /* body default */
--text-md:   24px   /* lead paragraph, large UI */
--text-lg:   32px   /* h3 */
--text-xl:   40px   /* h2 */
--text-2xl:  48px   /* h1 */
```

**Display tier** — Lunema moments, fluid via `clamp()`:

```
--display-sm: clamp(48px,  6vw,  64px)
--display-md: clamp(64px,  9vw,  96px)
--display-lg: clamp(80px, 12vw, 128px)
--display-xl: clamp(96px, 16vw, 160px)
```

**Line-heights:**

```
--leading-tight: 1.1     /* display */
--leading-snug:  1.3     /* headings */
--leading-body:  1.55    /* prose; tuned for Atkinson at 20px */
--leading-loose: 1.75
```

**Letter-spacing:**

```
--tracking-tight:  -0.02em   /* display, Lunema bold */
--tracking-normal:  0
--tracking-wide:    0.04em   /* small uppercase labels */
--tracking-mono:   -0.01em   /* Departure Mono optical adjustment */
```

**Weights:**

```
--weight-regular: 400
--weight-medium:  500   /* Atkinson only — Lunema snaps to 400/800 */
--weight-bold:    700
--weight-black:   800   /* Lunema Extra Bold */
```

### Spacing tokens (fixed)

4px base, numeric naming (Tailwind-style — universally recognized):

```
--space-0:  0      --space-6:  24px
--space-1:  4px    --space-8:  32px
--space-2:  8px    --space-10: 40px
--space-3:  12px   --space-12: 48px
--space-4:  16px   --space-16: 64px
--space-5:  20px   --space-20: 80px
                   --space-24: 96px
```

### Character-cell tokens (fixed) — for TUI grid alignment

```
--cell-w: 10px    /* Departure Mono character width at 16px size, approx */
--cell-h: 20px    /* matching row height */
```

Layouts that want a TUI feel use `calc(var(--cell-w) * N)` for widths and `calc(var(--cell-h) * N)` for vertical rhythm. Keeps mixed-font frames aligned to a monospace column grid. Pure monospace contexts use `1ch` instead.

These are calibration values and may need eyeball-tuning once Departure Mono is rendered in the actual implementation. The implementation should verify and adjust.

### Radii tokens (fixed, mostly zero)

```
--radius-none: 0       /* default for everything */
--radius-sm:   2px     /* subtle softening for inputs if needed */
--radius-pill: 9999px  /* avatars, pills — when intentionally round */
```

No `--radius-md` or `--radius-lg`. **Discourage rounded corners by not providing them.**

### Motion tokens (fixed)

```
--duration-instant: 0ms
--duration-fast:    100ms
--duration-base:    200ms
--duration-slow:    400ms

--ease-out:    cubic-bezier(0.2, 0, 0, 1)
--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1)
--ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1)
```

Under `prefers-reduced-motion: reduce`:

- All `--duration-*` resolve to `0ms` (override block lives in `tokens.css`)
- `--glow-pulse` resolves to `none` (override block lives in *each theme file*, since the value is theme-defined)

Pattern:

```css
/* tokens.css — global durations override */
@media (prefers-reduced-motion: reduce) {
  :root {
    --duration-instant: 0ms;
    --duration-fast:    0ms;
    --duration-base:    0ms;
    --duration-slow:    0ms;
  }
}

/* themes/<id>.css — per-theme pulse override */
@media (prefers-reduced-motion: reduce) {
  [data-theme="<id>"] { --glow-pulse: none; }
}
```

### Z-index tokens (fixed)

```
--z-base:    0     /* page content */
--z-raised:  10    /* sticky bars, popovers */
--z-overlay: 100   /* dialogs, modals */
--z-toast:   1000  /* toasts, system-level */
```

## Theme definitions

Two themes × two modes = four palettes. Light mode is intentionally similar across themes — light IS the "print register" and themes barely vary there.

### Default — Neon green

**Dark (glow on):**

```
--color-bg:         #050508    /* deep cool black */
--color-surface:    #0C0C12
--color-surface-2:  #15151D
--color-edge:       #1F2A1F    /* green-tinted hairline */
--color-fg:         #E8F5E8    /* CRT-tinted bright */
--color-fg-dim:     #9CAA9C
--color-fg-mute:    #5C6B5C
--color-accent:     #5BFA5B    /* the phosphor green */
--color-accent-2:   #5BFA5B    /* no secondary in default */
--color-on-accent:  #000
--color-link:       #5BFA5B
--color-link-visited: #3DAA3D
--color-focus:      #5BFA5B

--glow-text:   0 0 8px rgba(91,250,91,.5),
               0 0 18px rgba(91,250,91,.25)

--glow-edge:   0 0 0 1px rgba(91,250,91,1),
               0 0 16px rgba(91,250,91,.4),
               0 0 4px rgba(91,250,91,.5)

--glow-focus:  0 0 0 1px #5BFA5B,
               0 0 0 3px rgba(91,250,91,.4),
               0 0 14px rgba(91,250,91,.55)

--glow-pulse:  pulse-green 2s var(--ease-in-out) infinite
```

**Light (knockout / print register):**

```
--color-bg:         #F5F5F0    /* warm cream off-white */
--color-surface:    #FFFFFF
--color-surface-2:  #FAFAF5
--color-edge:       #1F1F1F    /* high-contrast hairline */
--color-fg:         #0A0A0A
--color-fg-dim:     #4A4A4A
--color-fg-mute:    #7A7A7A
--color-accent:     #5BFA5B    /* still neon — FILL ONLY, never as text */
--color-on-accent:  #000
--color-link:       #0A0A0A    /* black w/ accent underline */
--color-link-visited: #4A4A4A
--color-focus:      #0A0A0A    /* solid black focus ring */

--glow-text:   none
--glow-edge:   none
--glow-focus:  0 0 0 2px var(--color-focus)
--glow-pulse:  none
```

### Magenta vapor — reference alternate

**Dark (glow on, layered halos):**

```
--color-bg:         #100012    /* deep purple-black */
--color-surface:    #1A0F1F
--color-surface-2:  #241828
--color-edge:       #3A1E40
--color-fg:         #F5E8F2    /* cool white, faint magenta tint */
--color-fg-dim:     #B59CB0
--color-fg-mute:    #6E5468
--color-accent:     #FF2BD6    /* hot magenta primary */
--color-accent-2:   #2BFFE7    /* cyan secondary — actively used */
--color-on-accent:  #000
--color-link:       #FF2BD6
--color-link-visited: #B01F95
--color-focus:      #2BFFE7    /* cyan ring against magenta UI */

--glow-text:   0 0 8px rgba(255,43,214,.6),
               0 0 24px rgba(255,43,214,.25)

--glow-edge:   0 0 0 1px rgba(255,43,214,1),
               0 0 14px rgba(255,43,214,.5),
               0 0 4px rgba(43,255,231,.4)         /* layered: magenta outline + magenta bloom + cyan inner */

--glow-focus:  0 0 0 1px #2BFFE7,
               0 0 0 3px rgba(43,255,231,.4),
               0 0 14px rgba(43,255,231,.55)

--glow-pulse:  pulse-magenta 2s var(--ease-in-out) infinite
```

**Light (knockout — same print register as default):**

```
--color-bg:         #FAF5F8    /* faint warm pink-white */
--color-surface:    #FFFFFF
--color-surface-2:  #FAFAF8
--color-edge:       #1F1F1F
--color-fg:         #0A0A0A
--color-fg-dim:     #4A4A4A
--color-fg-mute:    #7A7A7A
--color-accent:     #FF2BD6    /* still hot — FILL ONLY */
--color-accent-2:   #2BFFE7
--color-on-accent:  #000
--color-link:       #0A0A0A
--color-link-visited: #4A4A4A
--color-focus:      #0A0A0A

--glow-*:  same neutralization as default light
```

### Status colors (shared across themes)

```
--color-ok:    #4ADE80
--color-warn:  #FFB800
--color-error: #FF4444
--color-info:  #50A0FF
```

Theme-overridable but neither theme overrides at v1.

### Critical rule: bright accent in light mode is FILL-ONLY

Phosphor green and hot magenta both fail contrast as foreground text on white (`#5BFA5B` on white = ~1.5:1). In light mode:

- `--color-accent` is used **only as a background** (with `--color-on-accent: #000` text on top — exactly the logomark pattern)
- Links and focus shift to `--color-fg` (black) — links decorated with an accent-colored underline instead of accent-colored text
- Accent appears as solid blocks, callout fills, decorations — never as foreground

This is what makes light mode coherent — it's the "knockout poster" register, not a desaturated dark mode.

## File structure

```
src/
├── app.css                       (entry — fonts, layer order, imports)
├── app.html                      (existing — adds data-theme/data-mode placeholders + inline script)
├── app.d.ts                      (declares App.Locals shape)
├── hooks.server.ts               NEW — read cookies, populate locals, render placeholders
│
├── routes/
│   ├── +layout.server.ts         NEW — pass theme/mode to layout
│   └── +layout.svelte            (existing — imports app.css)
│
└── lib/
    └── theme/
        ├── index.ts              public API: setTheme, setMode, themes
        ├── registry.ts           typed theme list
        ├── cookies.ts            read/write helpers
        ├── glyphs.ts             frame chrome, status, cursor glyph constants
        ├── tokens.css            FIXED tokens (type, space, cell, radii, motion, z, fonts)
        ├── glow-keyframes.css    @keyframes for --glow-pulse animations
        ├── utilities.css         opt-in utility classes (.bg-scanline, etc.)
        ├── base.css              element resets + base styles
        └── themes/
            ├── neon-green.css    color + glow per [data-mode]
            └── magenta-vapor.css color + glow per [data-mode]
```

### Cascade order

`app.css` declares an explicit layer order:

```css
@layer reset, tokens, themes, base, components, utilities;

/* @font-face stays outside layers */

@import './lib/theme/tokens.css'                  layer(tokens);
@import './lib/theme/glow-keyframes.css';   /* @keyframes don't layer */
@import './lib/theme/themes/neon-green.css'       layer(themes);
@import './lib/theme/themes/magenta-vapor.css'    layer(themes);
@import './lib/theme/base.css'                    layer(base);
@import './lib/theme/utilities.css'               layer(utilities);
```

Component CSS added in later specs writes `@layer components { ... }` — wins over base, loses to utilities. Cheap insurance, costs nothing now.

### Adding a new theme

Two file edits:

1. Create `src/lib/theme/themes/<id>.css` with four selector blocks:
   ```css
   [data-theme="<id>"][data-mode="dark"]   { /* dark vars */ }
   [data-theme="<id>"][data-mode="light"]  { /* light vars */ }
   [data-theme="<id>"][data-mode="system"] { /* dark by default */ }
   @media (prefers-color-scheme: light) {
     [data-theme="<id>"][data-mode="system"] { /* light vars */ }
   }
   ```
2. Add an entry to `src/lib/theme/registry.ts` and import the new CSS in `app.css`.

No code changes needed elsewhere. `setTheme(<id>)` validates against the registry; the engine handles the rest.

## Glyph constants

`src/lib/theme/glyphs.ts` provides the TUI vocabulary used by primitives:

```ts
export const FRAME = {
  // single-line box drawing
  tl: '┌', tr: '┐', bl: '└', br: '┘',
  h:  '─', v:  '│', cross: '┼',
  tDown: '┬', tUp: '┴', tRight: '├', tLeft: '┤',
  // double-line variants for emphasis
  dTl: '╔', dTr: '╗', dBl: '╚', dBr: '╝',
  dH:  '═', dV:  '║',
} as const;

export const STATUS = {
  ok:    '[OK]',
  warn:  '[!]',
  err:   '[X]',
  info:  '[?]',
  dot:   '[●]',
  empty: '[ ]',
} as const;

export const CURSOR = {
  block: '█',
  bar:   '▎',
  under: '▁',
} as const;

export const PROMPT = {
  shell: '$',
  arrow: '>',
  bracket: '>>',
} as const;
```

These are *constants*, not visual tokens, but they belong in the theme module because primitives reach for them constantly. Defining them centrally prevents inconsistent ad-hoc characters across components.

## Utility classes

Opt-in classes shipped with the engine. Currently one:

```css
/* src/lib/theme/utilities.css */
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

Theme-aware (uses `--color-accent`). Tunable per element via `--scanline-opacity`. Off by default — opt-in per surface where the CRT texture adds something.

## Validation & acceptance

A test route at `/_design/themes` (dev-only, not linked) cycles through every `[theme × mode]` combination and renders:

- The logomark
- A heading using each `--text-*` and `--display-*` size
- A paragraph of body text with an inline link
- A button (knockout block), a focused button (showing focus ring), an idle button
- A frame-chrome panel with `[OK]` / `[!]` status indicators
- Each glow token applied to a sample element
- A swatch grid of every color token
- The `.bg-scanline` utility on a sample surface

If all combinations render correctly with no FOUC and the focus rings appear only on `:focus-visible` (not `:focus`, so mouse users don't see rings), the engine works.

Plus:

- `setTheme()` and `setMode()` persist across reload (cookie present after navigating, refreshing, closing/reopening tab)
- `prefers-reduced-motion: reduce` neutralizes `--glow-pulse` to `none`
- Switching OS color scheme preference correctly toggles light/dark when `data-mode="system"`

### Accessibility — contrast verification

Spot-checked the palettes:

| Pair | Ratio | Result |
|---|---|---|
| Default dark — fg on bg | 17.6:1 | AAA |
| Default dark — accent on bg | 14:1 | AAA |
| Default dark — fg-dim on bg | ~7.1:1 | AAA |
| Default light — fg on bg | 19.4:1 | AAA |
| Magenta dark — fg on bg | ~16:1 | AAA |
| Magenta dark — magenta accent on bg | ~7.5:1 | AAA |
| Magenta dark — cyan accent on bg | ~14:1 | AAA |

The fill-only-accent rule for light mode keeps bright neon out of text contexts where it would fail.

`--color-fg-mute` intentionally fails body-text contrast (~3:1) — it's UI-only (icon hints, idle borders, etc.), never used for prose.

## Performance

- All theme CSS is static at build time. No runtime CSS generation.
- Each theme file is ~1–2KB. Both themes shipped together = ~3KB total.
- Fonts already preloaded (Atkinson VF, Lunema Regular).
- No additional JS for first paint on SSR routes; ~200 bytes inline on prerendered.

## Testing

- **Vitest**: registry validation, cookie read/write helpers, `setTheme`/`setMode` reject unknown IDs
- **Visual review**: the `/_design/themes` test route, eyeballed in dev across both themes × all three modes
- **No Playwright yet** — deferred per scaffold decision until there's something user-facing worth E2E-ing

## Out of scope

This spec **does not** cover:

- Theme switcher UI (the affordance that calls `setTheme` / `setMode`) — primitives spec
- Generic UI primitives (button, input, link, dialog)
- Blogging primitives (article layout, prose, code blocks, callouts, footnotes)
- AT Proto post primitives (post card, embeds, profile cards)
- Themes-as-PDS-records — engine kept compatible, not built. The implementation must not bake assumptions that block this future:
  - Don't hard-code theme IDs in client code outside the registry
  - Don't tightly couple themes to import-time CSS files in a way that prevents runtime variable injection later
- Additional themes beyond default + magenta vapor

Each is its own subsequent spec.

## Implementation notes

- The `--cell-w` / `--cell-h` values (10px / 20px) are calibration estimates for Departure Mono. The implementation should verify by rendering a test row of monospace characters and adjusting the values to match the rendered character box exactly.
- `transformPageChunk` placeholders (`%proto.theme%` / `%proto.mode%`) must not collide with SvelteKit's reserved `%sveltekit.*%` placeholders. Using a custom `%proto.*%` namespace avoids this.
- The `pulse-green` and `pulse-magenta` keyframes referenced by `--glow-pulse` are defined in `glow-keyframes.css`. Each animates the relevant `box-shadow` and/or `text-shadow` across the theme's glow color, fading in and out at ~2s.
- The inline `<script>` in `app.html` for prerendered-route safety must NOT be marked `defer` or `async` — it needs to run synchronously before paint.
