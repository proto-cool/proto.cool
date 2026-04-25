# proto.cool — TUI shell (v1)

**Date:** 2026-04-24
**Branch:** `feat/move-to-atproto`
**Status:** draft

## Context

proto.cool v2 is a "webbed site OS" — the conceit is that the entire site presents itself as a personal terminal/operating system somebody built for themselves. This spec defines the **global TUI shell** that wraps every route: the chrome zone (logoblock + cluster bar + nav tabs + content frame + prompt bar) plus a Powerline-style statusbar at the bottom.

This is the first spec after the design tokens & theming engine (`2026-04-24-design-tokens-and-theming-engine-design.md`), and it is the **primitives layer** that consumes those tokens. UI primitives (button, input, link, dialog) get exercised by the shell itself — there is no separate primitives spec; if a primitive is needed by the shell, it's built here.

This spec covers the shell **only**. The federated content feed (Bluesky / pckt / Grain), in-content filter chips, search overlay logic, and command palette logic are deferred to follow-up specs. Visible affordances for those features are present in the chrome from day one (so the shell reads correctly), but they open stub overlays in v1.

## Aesthetic intent

The site IS a TUI/OS — the chrome is full-bleed, dense, instrumentation-style. The voice is **hackerpunk / dotfiles-porn**, not government console:

- Personal terminal somebody built for themselves — `protocol7@helios:~/content`, not `CLEARANCE: COSMIC // EYES ONLY`
- TUI bones (boxed cells, hard 1px edges, character-cell vocabulary, gridline texture) wrapped in modern bloom atmosphere (per the theming engine guardrails)
- Greeble grouped into labeled clusters with visible logical structure (`// identity`, `// clock`, `// link`, `// system`) — no scattered flat rows of cells
- Real typography (Atkinson body, Lunema display) **inside** the content window; pixel font (Departure Mono) reserved for **chrome only** (status, labels, prompts, meta-row dates)
- Chrome bands run full-bleed (TUI OS feel); content window is reading-width centered (~660px max) — this tension is the shell's signature

The visual reference is iteration v6 of the brainstorm session at `.superpowers/brainstorm/.../content/v6-feed.html`. That mockup is the source of truth for visual decisions made during design.

## Decisions

| Decision | Choice |
| --- | --- |
| Sections | `content` (`/`), `projects` (`/projects`), `about` (`/about`); hotkeys `1`/`2`/`3` |
| `/dev/themes` | Killed — chrome itself is the visual validation surface |
| `/projects` | Real route, minimal stub list view |
| Top taskbar | None — clusters cover its job, less duplication |
| Bottom statusbar | Powerline / agnoster-style angled segments |
| Content window | Reading-width (max 660px), centered inside full-bleed chrome |
| Logomark | Dedicated bordered "logoblock" with sub-line + sigil; anchors top-left |
| Greeble grouping | Labeled clusters (`// identity` etc.) — header + label/value rows |
| Cluster set v1 | identity · clock · link · system (4) |
| Filter UI for content | Lives in the content window's crumb-strip (not chrome) — wired in feed spec; visual placeholder only in v1 |
| Component model | Composable siblings under `src/lib/shell/`, assembled by root layout |
| Chrome data — real | version, kernel, shell, sig, user, host, theme, clock, uptime, pwd |
| Chrome data — cosmetic | rx/tx, conn, signal sparkline, cur, mode, rec timer (all in `cosmetic.ts`) |
| Uptime origin | Fixed `SITE_ORIGIN` date (counted forward); `runtime.ts` ticks client-side |
| Keyboard | Single global `KeyboardLayer` for `1`/`2`/`3`/`t`/`?`/`/`/`:`/`Esc` |
| Section-local hotkeys | Visible in dock, not wired in v1 (lands with feed spec) |
| `t` behavior | Opens theme picker overlay (not a blind cycle) |
| Search / command (`/` `:`) | Stub overlays in v1 ("coming soon" centered modal) |
| Help (`?`) | Real overlay listing every registered command from `commands.ts` |
| Modal pattern | Single `Overlay.svelte` chrome + content components per overlay type |
| Mode display in statusbar | Cosmetic-only in v1, always `normal` |
| Responsive | Container queries on chrome zone; 5 progressive breakpoints |
| Light mode | Glows neutralize (engine handles); gridline bg hides; logoblock loses halo; statusbar still works |
| New tokens | None — chrome derives from existing theme tokens with computed opacities |
| Routing | Native `<a href>` links; SvelteKit handles client-side nav; `aria-current="page"` for active |
| Prerendering | About + projects = `prerender = true`; content stays dynamic for the feed spec |

## Section model

Three real sections in v1:

```ts
// src/lib/shell/sections.ts
export const sections = [
  { id: 'content',  label: 'content',  href: '/',         hotkey: '1', pwd: '~/content'  },
  { id: 'projects', label: 'projects', href: '/projects', hotkey: '2', pwd: '~/projects' },
  { id: 'about',    label: 'about',    href: '/about',    hotkey: '3', pwd: '~/about'    },
] as const;

export const utilities = [
  { id: 'themes', label: 'themes', hotkey: 't' },
  { id: 'help',   label: 'help',   hotkey: '?' },
] as const;
```

Adding a section later = adding an entry + creating a route folder. No other code touches the nav.

The `pwd` value drives the breadcrumb in chrome (logoblock subline, prompt bar, statusbar location segment) and is derived in one place: a `pwdForPath(pathname: string): string` helper in `runtime.ts` that maps `$page.url.pathname` to the section's `pwd`, falling back to the path itself for unknown routes.

## Visual structure

Stack from top to bottom inside the viewport:

```
┌──────────────────────────────────────────────────────────────────────────┐
│ chrome zone (gridline bg, padding 16px 18px 14px)                        │
│                                                                          │
│   ┌───────────┐  ┌─────────┐  ┌──────┐  ┌──────┐    ┌──────────────┐    │  ← cluster row
│   │ LOGOBLOCK │  │identity │  │ clock│  │ link │    │   system     │    │
│   │           │  │ user…   │  │ date │  │ pds… │    │ kernel…      │    │
│   │ // sub    │  │ host…   │  │ time │  │ rx/tx│    │ shell…       │    │
│   │ .;:sigil  │  │ pwd…    │  │ up   │  │ conn │    │ build…       │    │
│   └───────────┘  └─────────┘  └──────┘  └──────┘    └──────────────┘    │
│                                                                          │
│   ┌──────┬────────┬──────┐                            ┌────┬────┐       │  ← nav tabs
│   │cont *│projects│about │                            │ t  │ ?  │       │
│   ├──────┴────────┴──────┴────────────────────────────┴────┴────┤       │
│   │                                                              │       │
│   │              ┌──── content frame ─────┐                      │       │  ← content
│   │              │ ~/content   filters    │                      │       │     window
│   │              │                        │                      │       │     (reading-
│   │              │   [body in real fonts] │                      │       │      width,
│   │              │                        │                      │       │      centered)
│   │              └────────────────────────┘                      │       │
│   │                                                              │       │
│   └──────────────────────────────────────────────────────────────┘       │
│                                                                          │
│   ┌──$──┐ ┌──/ search  : cmd──┐         [j/k][↵][/][t][?]                │  ← prompt bar
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
└─[ $ ~/content ▶ section ▶ count ────────── tray ▶ theme ▶ clock ]────────┘  ← Powerline
                                                                                  statusbar
```

Each region is its own component (next section). The chrome zone has subtle gridline-paper background:

```css
background:
  linear-gradient(rgba(91,250,91,.035) 1px, transparent 1px) 0 0/100% 12px,
  linear-gradient(90deg, rgba(91,250,91,.035) 1px, transparent 1px) 0 0/12px 100%;
```

The opacity values resolve to `--color-accent` at `rgba(…, .035)` in the actual implementation — derived from the theme via `color-mix()`.

### Logoblock

Bordered cell anchoring the top-left corner. Three rows stacked:

1. The logomark itself: `$ proto.cool █` at ~30px — knockout green block + cyan prompt + cyan cursor (matches existing logomark from theme spec test route, scaled up)
2. Sub-line: `// personal terminal · v0.7.2-atproto` — Departure Mono, dim
3. Sigil: `.;:: built by protocol7 — sig 0x7A3F2B ::;.` — Departure Mono, very dim, decorative

Wrapped in a 1px accent border with a soft accent halo (`box-shadow: 0 0 0 1px var(--color-accent), 0 0 24px color-mix(in srgb, var(--color-accent) 45%, transparent)`). Background is the accent at very low opacity. In light mode the halo neutralizes; the border becomes solid `--color-edge`.

### Cluster bar

Row of `<Cluster>` instances side-by-side. The cluster row uses `flex-wrap: wrap` so clusters reflow naturally as the chrome narrows.

Each cluster is a labeled box:

```
┌─ // identity ─────────┐
│ user   protocol7      │
│ host   helios         │
│ pwd    ~/content      │
└───────────────────────┘
```

- Header strip (tinted-accent background): `// <id>` label
- Body: stacked rows of `<label>  <value>` pairs in Departure Mono
- Border: 1px accent at 55% opacity
- Min width: 150px (system cluster: 200px)

The four v1 clusters:

| Cluster | Rows |
| --- | --- |
| `// identity` | user, host, pwd |
| `// clock` | date, time, up |
| `// link` | pds, rx/tx, conn |
| `// system` | kernel, shell, build, theme |

`<Cluster>` is generic — takes `{ id, rows }` props. New clusters are one-line additions in the `+layout.server.ts` data.

### Nav tabs

Real tab cards that visually lift onto the content frame. Each tab is a bordered card. The active tab pops up 1px and shares its bottom edge with the content frame interior — like real OS window-manager tabs.

```
  ┌──────┬────────┬──────┐                  ┌────┬────┐
  │cont *│projects│about │                  │ t  │ ?  │
  ├──────┴────────┴──────┴──────────────────┴────┴────┤
  │             content frame interior...             │
  └────────────────────────────────────────────────────┘
```

- Active tab: `background: var(--color-bg)`, accent border on top + sides, bottom border matches content interior (visually merges)
- Inactive tab: tinted-accent background, dim label
- Active tab gets a glowing cyan `*` suffix
- Hotkey prefix `[1]` shown to the left of label at `≥ md` breakpoint
- Utility tabs (`themes`, `help`) on the right with a flex spacer; transparent background to distinguish from section tabs

Underlying markup: `<a href={section.href} aria-current={active ? 'page' : undefined}>` — proper nav semantics. Click (or tap) navigates via SvelteKit's client-side router.

### Content frame

The bordered region the tabs lift onto. Two layers:

- Outer `<ContentFrame>`: 1px accent border, `--color-surface` background, accent halo. Full width of the chrome zone.
- Inner reading-window: max-width 660px, centered, padding `32px 24px` (`18px 16px` at narrow widths).

The reading-window contains:

- A **crumb-strip** at the top (Departure Mono, separator hairline below): `~/content — index · N entries` + a knockout `[stamp]` chip on the right (e.g. `ls -al`, `tail -f`)
- The page's actual content (rendered by the route's `+page.svelte` via Svelte slot/snippet)

The crumb-strip is where in-content filters will live (when the feed spec lands). For v1 it's a static meta-line.

### Prompt bar

Below the content frame, above the Powerline statusbar:

```
[ $ ~/content ]  [ / search  : cmd ]               [j/k][↵][/][t][?]
```

- Left segment: `$` + current `pwd` in a bordered chip
- Center segment: `/` + "search" and `:` + "cmd" in a cyan-bordered chip (clickable — opens stub overlays in v1)
- Right cluster: keybind dock — one chip per registered command, rendered from `commands.ts`

Below `md` breakpoint, the dock collapses to icon-only chips.

### Powerline statusbar

Full-bleed agnoster-style strip at the bottom edge of the viewport (above any safe-area inset). Uses CSS triangle borders for the angled separators.

Segments left → right:

| Segment | Content | Style |
| --- | --- | --- |
| s1 | `$ <pwd>` | Knockout accent (bg: accent, fg: on-accent) |
| s2 | `[N] <section>` | Tinted accent bg, accent fg |
| s3 | `<entries> · <meta>` | Faint accent bg, dim fg |
| (spacer) | | — |
| tray | `cur N,N` | Faint accent bg, dim label / accent value |
| tray | `mode normal` | same |
| tray | `rec ● 0:42:11` | same; pulsing red `●` cosmetic |
| theme | `⌁ neon-green/dk` | Surface-2 bg, cyan fg (matches the cyan accent used elsewhere) |
| clock | `14:32:07` | Knockout accent (matches s1) |

Each segment ends in a `::after` triangle border that flows into the next segment's color. Implementation: small CSS-triangle pseudo-element per segment, sized to match the bar height.

The first three segments (s1/s2/s3) are real data; tray is cosmetic-only; theme + clock are real.

## Component architecture

```
src/lib/shell/
├── Shell.svelte           # outer chrome zone wrapper (gridline bg, padding, slot order)
├── Logoblock.svelte       # logomark + sub-line + sigil
├── ClusterBar.svelte      # row of <Cluster>; takes data from context
├── Cluster.svelte         # generic { id, rows } box
├── NavTabs.svelte         # tab cards from sections.ts + utilities.ts
├── ContentFrame.svelte    # outer frame + reading-width inner; renders crumb-strip
├── PromptBar.svelte       # prompt segments + keybind dock
├── Statusbar.svelte       # Powerline statusbar
├── KeyboardLayer.svelte   # global window-level hotkey listener
├── Overlay.svelte         # generic centered modal: focus trap, esc-to-close, click-out
├── HelpOverlay.svelte     # content for ?: lists commands grouped by category
├── ThemePickerOverlay.svelte  # content for t: theme + mode picker
├── StubOverlay.svelte     # content for / and :: "coming soon" placeholder
├── overlay.ts             # writable<OverlayKind | null> + openOverlay/closeOverlay helpers
├── sections.ts            # section + utility registries (typed)
├── commands.ts            # hotkey + command registry (derives nav from sections.ts)
├── chrome.ts              # server-loaded chrome data shape + helpers (used by +layout.server.ts)
├── runtime.ts             # client-only stores: clock tick, uptime, current pwd
└── cosmetic.ts            # honest fakes: rx/tx, conn, signal, cur, mode, rec, etc.
```

Root layout:

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import '../app.css';
  import { setContext, onMount } from 'svelte';
  import Shell from '$lib/shell/Shell.svelte';
  import KeyboardLayer from '$lib/shell/KeyboardLayer.svelte';
  import { startRuntimeTicks } from '$lib/shell/runtime';
  let { data, children } = $props();
  setContext('chrome', data.chrome);
  onMount(() => startRuntimeTicks());
</script>

<KeyboardLayer />
<Shell>
  {@render children()}
</Shell>
```

`<Shell>` itself composes the regions in order — Logoblock + ClusterBar + NavTabs + ContentFrame (with the page slot) + PromptBar + Statusbar. Each region reads what it needs from context (`getContext('chrome')`) and from `runtime.ts` stores.

Each route's `+page.svelte` only renders the inside of the content window:

```svelte
<!-- src/routes/+page.svelte -->
<script>
  let { data } = $props();
</script>

<!-- this renders inside ContentFrame's reading window -->
<h1>~/content</h1>
<!-- placeholder feed surface for v1 -->
```

## Data sources for chrome

### Server-loaded (`+layout.server.ts`)

```ts
// src/routes/+layout.server.ts
import { resolveChromeData } from '$lib/shell/chrome';

export const load = async ({ locals }) => ({
  theme: locals.theme,        // existing
  mode: locals.mode,          // existing
  chrome: resolveChromeData() // new
});
```

`resolveChromeData()` returns `ChromeData`:

```ts
type ChromeData = {
  identity: { user: string; host: string };
  link:     { pds: string };
  system:   { kernel: string; shell: string; build: string; sig: string };
};
```

Source for each field:

| Field | Source |
| --- | --- |
| `user` | `PUBLIC_OWNER_HANDLE` env var (`protocol7`) |
| `host` | `PUBLIC_HOST_LABEL` env var (`helios`) |
| `pds`  | `PUBLIC_PDS_HOST` env var (`pds.proto.cool`) |
| `kernel` | `proto-kit ${SVELTEKIT_VERSION}` from `package.json` (read at build via Vite `define`) |
| `shell` | `svelte ${SVELTE_VERSION}` from `package.json` |
| `build` | `package.json` `version` field |
| `sig` | First 7 chars of `GIT_COMMIT_SHA` (set at build via `process.env.GIT_COMMIT_SHA`, falls back to `0000000`) |

Vite config exposes the build-time constants via `define`. Use `execFileSync` (not `exec`) — explicit args, no shell, no injection surface:

```ts
// vite.config.ts (additions)
import pkg from './package.json';
import { execFileSync } from 'node:child_process';

const sha = (() => {
  try { return execFileSync('git', ['rev-parse', 'HEAD']).toString().trim(); }
  catch { return '0000000'; }
})();

export default defineConfig({
  define: {
    '__BUILD_VERSION__': JSON.stringify(pkg.version),
    '__BUILD_SHA__': JSON.stringify(sha),
    '__SVELTE_VERSION__': JSON.stringify(pkg.devDependencies.svelte),
    '__SVELTEKIT_VERSION__': JSON.stringify(pkg.devDependencies['@sveltejs/kit']),
  },
  // ...existing config...
});
```

`chrome.ts` references the constants and trims `^` prefixes from version strings.

### Client-tick (`runtime.ts`)

```ts
// src/lib/shell/runtime.ts
import { writable, derived, type Readable } from 'svelte/store';

const SITE_ORIGIN = new Date('2026-04-24T00:00:00Z'); // proto.cool v2 launch

const now = writable(new Date());
let interval: ReturnType<typeof setInterval> | null = null;

export function startRuntimeTicks() {
  if (interval) return;
  interval = setInterval(() => now.set(new Date()), 1000);
}

export const clock: Readable<{ date: string; time: string }> = derived(now, $n => ({
  date: $n.toISOString().slice(0, 10),
  time: $n.toTimeString().slice(0, 8),
}));

export const uptime: Readable<string> = derived(now, $n => {
  const ms = $n.getTime() - SITE_ORIGIN.getTime();
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${d}d ${String(h).padStart(2,'0')}h ${String(m).padStart(2,'0')}m`;
});

export function pwdForPath(pathname: string): string {
  if (pathname === '/') return '~/content';
  if (pathname.startsWith('/projects')) return '~/projects';
  if (pathname.startsWith('/about')) return '~/about';
  return '~' + pathname;
}
```

SSR-safe: stores have an initial value; `startRuntimeTicks` is called from `onMount` so the interval only runs in the browser. SSR snapshot of the clock matches request time, then hydrates.

### Cosmetic (`cosmetic.ts`)

```ts
// src/lib/shell/cosmetic.ts — honest fakes
import { readable } from 'svelte/store';

export const signalSparkline = readable('▁▂▃▅▇▅▃▂', set => {
  const frames = ['▁▂▃▅▇▅▃▂', '▂▃▅▇▅▃▂▁', '▃▅▇▅▃▂▁▂', '▅▇▅▃▂▁▂▃', '▇▅▃▂▁▂▃▅'];
  let i = 0;
  const id = setInterval(() => set(frames[i = (i + 1) % frames.length]), 600);
  return () => clearInterval(id);
});

export const cursorCoords = readable('1,1');
export const editorMode = readable('normal');
export const linkInfo = { rxTx: '42 / 07', conn: 3 };
export const recTimer = readable('0:42:11', set => {
  const start = Date.now();
  const id = setInterval(() => {
    const s = Math.floor((Date.now() - start) / 1000);
    set(`${Math.floor(s / 3600)}:${String(Math.floor(s/60)%60).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`);
  }, 1000);
  return () => clearInterval(id);
});
```

All cosmetic values are visually marked `aria-hidden="true"` in the components that render them. Honest about being decoration.

## Keyboard layer

`KeyboardLayer.svelte` mounts once (in the root layout) and is the only place global hotkeys are bound. Section-local hotkeys are out of scope for v1.

```ts
// src/lib/shell/commands.ts
import { goto } from '$app/navigation';
import { sections } from './sections';
import { openOverlay } from './overlay';

export type Command = {
  id: string;
  hotkey: string;       // single character, no modifiers
  label: string;
  category: 'navigation' | 'theme' | 'prompt' | 'help';
  run: () => void;
};

// Navigation commands are derived from sections.ts — single source of truth.
// Adding a section in sections.ts automatically registers its hotkey.
const navCommands: Command[] = sections.map(s => ({
  id: `goto-${s.id}`,
  hotkey: s.hotkey,
  label: `go to ${s.label}`,
  category: 'navigation',
  run: () => goto(s.href),
}));

export const commands: Command[] = [
  ...navCommands,
  { id: 'theme-picker', hotkey: 't', label: 'theme picker', category: 'theme',  run: () => openOverlay('theme') },
  { id: 'help',         hotkey: '?', label: 'help',         category: 'help',   run: () => openOverlay('help') },
  { id: 'search',       hotkey: '/', label: 'search',       category: 'prompt', run: () => openOverlay('search-stub') },
  { id: 'command',      hotkey: ':', label: 'command',      category: 'prompt', run: () => openOverlay('command-stub') },
];
```

`sections.ts` is the only file that knows about the section list. `commands.ts` derives nav commands from it; `NavTabs.svelte` reads from it directly. Adding a section = one edit + a route folder, with no risk of an unbound hotkey.

`KeyboardLayer` listens on `window` for `keydown` and:

1. Returns immediately if any modifier key is pressed (`event.ctrlKey || event.metaKey || event.altKey`)
2. Returns if the event target is `<input>`, `<textarea>`, or `[contenteditable]` (use `closest()` to be safe)
3. If `Escape` and an overlay is open → close it (return)
4. If an overlay is open → return (no other hotkeys swallow keys while modal)
5. Look up the key in the commands registry; if found, `event.preventDefault()` and call `run()`

The keybind **dock** (in `PromptBar`) and the **help overlay** both render from the same `commands` registry — no duplication, no drift.

### Overlays

`Overlay.svelte` is the modal chrome:

- Centered fixed positioning, dark backdrop (`background: color-mix(in srgb, var(--color-bg) 88%, transparent)`)
- Focus trap inside (cycles tab through focusable elements; restores focus on close)
- `Escape` and click-on-backdrop both close
- Keyboard layer holds the "open overlay" state in a small writable; only one overlay at a time

Three content components:

- `HelpOverlay.svelte` — renders `commands` grouped by `category`, shows hotkey + label per row
- `ThemePickerOverlay.svelte` — uses existing `setTheme()` and `setMode()` from `$lib/theme`; lists themes from registry + the three modes; closes after selection
- `StubOverlay.svelte` — single component; takes `kind: 'search' | 'command'` prop; shows "coming soon" message + a hint about which feature it is

## Responsive strategy

Container queries on the chrome zone (`@container chrome (min-width: ...)`) so the rules are about the chrome's own width, not the viewport. This means the shell behaves consistently if it's ever embedded somewhere narrower than the full viewport.

Five progressive breakpoints:

```css
@layer base {
  .chrome-zone {
    container-type: inline-size;
    container-name: chrome;
  }
}

@layer base {
  /* defaults are mobile-first (xs) */
  /* xs (< 480px): single info row, scrollable nav, minimal prompt + status */

  @container chrome (min-width: 480px)  { /* sm — single combined cluster */ }
  @container chrome (min-width: 768px)  { /* md — clusters wrap to 2 rows; full prompt dock */ }
  @container chrome (min-width: 1024px) { /* lg — all clusters in 1 row */ }
  @container chrome (min-width: 1280px) { /* xl — full as designed */ }
}
```

| Breakpoint | Logoblock | Clusters | Nav tabs | Prompt | Statusbar |
| --- | --- | --- | --- | --- | --- |
| **xs** (< 480px) | logomark only, smaller (~22px) | single compact info row (user · pwd · time) | hotkey prefix hidden; horizontal scroll if overflow | dock collapsed to icons only | `pwd · clock` only |
| **sm** (≥ 480px) | + sub-line | one combined `// info` cluster (user, host, pwd, time) | hotkey prefix hidden | center chip; dock visible | + section + theme |
| **md** (≥ 768px) | + sigil | clusters wrap to 2 rows | hotkey prefix visible | full | + count |
| **lg** (≥ 1024px) | full | all clusters in 1 row, tighter padding | full | full | full minus cosmetic tray |
| **xl** (≥ 1280px) | full | full as designed | full | full | full incl. cosmetic tray |

Touch behavior:

- Tabs and prompt chips remain clickable across all breakpoints
- Keybind hints in dock + statusbar mode display hide below `md` (irrelevant on touch)
- `KeyboardLayer` mounts everywhere but is a no-op without a physical keyboard
- Overlays still openable via clicking the corresponding chip (`?`, `t`, `/`, `:`)

## Theme integration

### Token reuse

The chrome derives all colors from existing tokens — **no new color tokens added in this spec**. Where the chrome needs a color variant (e.g. accent at low opacity for cluster header backgrounds), it uses `color-mix()`:

```css
.cluster-header {
  background: color-mix(in srgb, var(--color-accent) 12%, transparent);
  color: var(--color-fg-dim);
  border-bottom: 1px solid color-mix(in srgb, var(--color-accent) 35%, transparent);
}
```

This keeps the token surface tight and ensures every chrome surface follows the active theme automatically.

### Light mode behavior (knockout / print register)

The theme engine already neutralizes glow tokens in light mode. Chrome additions:

- Gridline background opacity drops to 0 in light mode (`[data-mode="light"] .chrome-zone { background-image: none; }`) — gridlines look wrong on a light background
- Logoblock halo neutralizes (uses `--glow-edge`, which is `none` in light mode — so this is automatic)
- Powerline statusbar segments still use accent fills + black text (knockout-poster pattern is still correct)
- Cluster borders darken via the existing `--color-edge` token — already designed to be a high-contrast hairline in light mode

The shell is tested in both modes during dev as part of acceptance.

### `[t]` hotkey

Opens `ThemePickerOverlay`, which lists themes from `$lib/theme/registry.ts` and the three modes. Selection calls existing `setTheme()` / `setMode()`. Overlay closes on selection. The cookie persistence + zero-FOUC machinery is unchanged — already handled by the engine.

## Accessibility

- **Nav tabs** are `<a href>` links with `aria-current="page"` for active state. Click + keyboard activation (Enter / Space on focused link) work natively. Tabs are *not* `role="tab"` — they're routed nav.
- **Cosmetic chrome** (`cur 1,1`, `mode normal`, `rec 0:42:11`, signal sparkline, the ASCII sigil under the logomark) is `aria-hidden="true"` — decoration, not content.
- **Live data**: clock + uptime have `aria-live="off"` (avoid screen-reader chatter every second). Theme name + section name have `aria-live="polite"` so changes are announced.
- **Overlays** trap focus inside, restore focus on close, are dismissible with `Escape`. Backdrop click closes too. Each overlay has a labelled heading.
- **Color-only signals** (`●` for PDS live, the cyan `*` on active tabs) always paired with text equivalents (`live`, the section's name being highlighted). No information conveyed by color alone.
- **Reduced motion**: cosmetic animations (signal sparkline cycling, REC pulse) honor `prefers-reduced-motion: reduce` and freeze on a single frame. The mechanism is the same as `--glow-pulse` neutralization in the theme engine — done at the CSS animation level.
- **Reduced data** (`prefers-reduced-data`): not specifically handled in v1 — chrome data is small (~few KB).

## File structure & integration

### New files

```
src/lib/shell/
├── Shell.svelte
├── Logoblock.svelte
├── ClusterBar.svelte
├── Cluster.svelte
├── NavTabs.svelte
├── ContentFrame.svelte
├── PromptBar.svelte
├── Statusbar.svelte
├── KeyboardLayer.svelte
├── Overlay.svelte
├── HelpOverlay.svelte
├── ThemePickerOverlay.svelte
├── StubOverlay.svelte
├── overlay.ts
├── sections.ts
├── commands.ts
├── chrome.ts
├── runtime.ts
├── cosmetic.ts
└── shell.css                   # any chrome-only utility classes (e.g. powerline triangles)

src/routes/projects/+page.svelte
src/routes/projects/+page.ts    # `export const prerender = true;`

src/routes/about/+page.svelte
src/routes/about/+page.ts       # `export const prerender = true;`
```

### Modified files

```
src/routes/+layout.svelte       # mount KeyboardLayer + Shell, render children inside
src/routes/+layout.server.ts    # return chrome data alongside theme/mode
src/routes/+page.svelte         # replace SvelteKit welcome with content section placeholder
src/app.d.ts                    # extend App.PageData with chrome shape
vite.config.ts                  # add `define` for build-time constants
```

### Deleted

```
src/routes/dev/themes/          # entire folder removed
```

### Cascade order (`app.css`)

```css
@layer reset, tokens, themes, base, shell, components, utilities;

/* additions: */
@import './lib/shell/shell.css' layer(shell);
```

Adds a new `shell` layer between `base` and `components`. Shell-specific utilities (powerline triangles, gridline background) live there.

### Integration with existing theme engine

- `+layout.server.ts` extends — does not replace. Existing `theme` / `mode` keys remain.
- Chrome reads `theme` / `mode` from page data to render the statusbar's theme chip + the data attributes flow unchanged.
- `[t]` opens a real picker UI; the underlying `setTheme()` / `setMode()` API is the same as before. The picker is the affordance the theme spec deferred to "primitives" — built here.
- Existing `glyphs.ts` constants (`FRAME`, `STATUS`, `CURSOR`, `PROMPT`) are imported by chrome components instead of redefined.

## Validation & acceptance

### Visual

- Chrome renders correctly across both themes (`neon-green`, `magenta-vapor`) × all three modes (`dark`, `light`, `system`)
- All five breakpoints visually checked at the chrome zone widths: 360, 480, 768, 1024, 1280, 1440px
- Active tab visually merges with the content frame top (no 1px gap)
- Powerline statusbar arrows align cleanly between segments (no aliasing seams)
- Cluster row reflows correctly when narrowing (no overlap, no scrollbar at any breakpoint until xs)
- Logoblock halo present in dark, absent in light (theme engine handles this)
- Gridline background visible in dark, hidden in light

### Behavior

- Hotkeys `1` / `2` / `3` navigate to the right routes; URL updates; active tab updates
- Hotkey `t` opens theme picker; selecting a theme + a mode persists in cookies + applies
- Hotkey `?` opens help overlay listing all 7 commands by category
- Hotkeys `/` and `:` open stub overlays
- `Escape` closes any open overlay
- Hotkeys do **not** fire when focus is inside an `<input>` / `<textarea>` / `[contenteditable]`
- Modifier keys (cmd/ctrl) suppress hotkey handling
- Overlay backdrop click closes; focus traps inside; focus restores on close
- Clock ticks once per second; uptime updates in tandem
- PDS status renders as live (will become real with the feed spec; v1 displays the cosmetic placeholder)

### A11Y

- All interactive elements reachable by keyboard; focus rings visible on `:focus-visible` only
- Cosmetic chrome elements not announced by screen reader
- Overlays read out their heading on open
- `prefers-reduced-motion: reduce` freezes the signal sparkline + REC pulse animation
- No color-only information conveyance (PDS dot has text label, active tab has both text highlight and asterisk)

### Tests

- **Vitest unit:**
  - `commands.ts` — every command has a unique hotkey; categories are valid
  - `sections.ts` — every section has a unique hotkey + href; no collisions with utilities
  - `runtime.ts` — `pwdForPath()` mappings; `uptime` formatter rounds correctly
  - `chrome.ts` — `resolveChromeData()` returns expected shape; falls back gracefully when env vars missing
- **Visual review:** chrome itself replaces `/dev/themes` as the validation surface — every rendered route is a theme test
- **No Playwright yet** — deferred until there's user-visible interactive behavior beyond hotkeys (per scaffold YAGNI)

## Out of scope

This spec **does not** cover:

- Federated content feed (Bluesky / pckt / Grain) fetching, lexicon resolution, per-source post components, or the engagement actions on those posts — own spec
- In-content filter chips wiring (`[all] [bsky] [pckt] [grain]` interactivity) — wired in feed spec; visible as static text in the crumb-strip in v1
- Search overlay logic (`/`) — stub overlay only in v1
- Command palette logic (`:`) — stub overlay only in v1
- Section-local hotkeys (`j` / `k` / `↵` for list navigation) — visible in dock as hints, not wired
- Real PDS status check (currently cosmetic) — wired in feed spec when there's an atproto fetcher to piggyback on
- Real link telemetry (rx/tx, conn, signal) — cosmetic forever, or replaced if we ever add real perf telemetry
- Mobile keyboard alternatives (e.g. swipe gestures for tab switching) — defer
- "Now" or other future sections — own routes when added
- Themes-as-PDS-records — the theme engine remains compatible; the picker reads from the static registry only in v1

## Implementation notes

- Container queries are widely supported but require `container-type: inline-size` on the chrome zone parent. Verify in target browsers (modern evergreen — fine).
- The Powerline triangle separators use CSS-triangle pseudo-elements (`border-top: Npx solid transparent; border-left: Npx solid <color>;`). Match the segment height exactly to avoid 1px artifacts. Hairline subpixel rendering in dark mode may need a thin extra stroke; address during implementation.
- `define` constants from Vite are inlined at build — they MUST be referenced by their full token names (`__BUILD_VERSION__` etc.); destructuring into a local before use is fine but they cannot be dynamic.
- The Svelte 5 `$props()` rune is used throughout (matches the existing `+layout.svelte`).
- `setContext('chrome', ...)` is called at the layout level; child components use `getContext<ChromeData>('chrome')`. Not reactive — chrome data is stable per-request.
- Section-page authoring contract: each route's `+page.svelte` may render whatever it wants; it always lands inside `ContentFrame`'s reading-width inner window. Pages should NOT add their own outer wrapper / page padding — that's the frame's job.
- The existing logomark CSS in `/dev/themes` (which is being deleted) is the source for the scaled-up Logoblock styles. Port those styles before deleting the route.
- `KeyboardLayer.svelte` should use `$effect(() => { ... })` for the listener registration so it cleans up on unmount (not strictly needed since it's mounted at root, but defensive).
- The `git` invocation in `vite.config.ts` uses `execFileSync('git', [...])` deliberately — explicit args, no shell, no injection surface. Falls back to `'0000000'` if `git` is unavailable (e.g. building from a tarball without `.git`).
