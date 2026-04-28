# Nav theme controls — design

Date: 2026-04-28
Branch: feat/move-to-atproto

## Summary

Restructure `NavPanel` so `BrandBadge` (with its inline archive greeble — the `.meta` panel showing `№02`, `archive`, the bar graph, and `live`) stays anchored to the left exactly as it is, and **everything else pulls into a tight cluster on the right edge**: `ChannelPads`, the new `ThemeControls`, and the new `GreebleStrip`. Grid becomes `auto 1fr auto auto auto`, where the `1fr` is the elastic gap between the brand and the right cluster.

```
[ BrandBadge + archive greeble ]   ←  1fr gap  →   [ ChannelPads ] [ ThemeControls ] [ GreebleStrip ]
```

1. **ThemeControls** — two icon-driven buttons:
   - **Sys** (Phosphor `Monitor`) — toggles "follow OS color scheme" on/off.
   - **Theme** — shows the current theme's 3-chip swatch trio plus a Phosphor `CaretDown`. Click or hotkey `t` opens a dropdown listing every registered theme variant. Selecting a row calls `setTheme()` and closes the dropdown.
2. **GreebleStrip** — replaces the current `LIVE` / date / `SIG 0X…` text strip with a much thinner pure-decoration greeble: a vertical tick rule (alternating long/short mil-spec ticks) with one or two of the gaps replaced by lit indicator pips in `--hal-warm` / `--hal-cool`.

In parallel, every nav button that owns a hotkey gains a "corner pip" greeble — a small `[1]` / `[2]` / `[3]` / `[t]` stamp in the top-right corner of the pad — so the keymap is visible on the chassis, not only inside the help overlay.

The standalone `ThemePickerOverlay` is removed; the dropdown replaces it.

## Goals

- Make theme switching a one-click affordance from any page, without a modal overlay.
- Make hotkeys discoverable on the buttons themselves.
- Adopt Phosphor Icons (`phosphor-svelte`) as the project's icon library — pleasingly self-referential given `phosphor-shell.css` / `phosphor-green`.
- Keep the door open for future themes by treating each light/dark variant as its own registry entry.
- Simplify the right edge of the header: drop the `LIVE` / clock / signature text strip in favor of a quiet decorative greeble.

## Non-goals

- Light-mode token palette. `setMode('light')` will flip `data-mode` immediately and look broken until tokens ship; that is an accepted tradeoff and a separate piece of work.
- A help-overlay button in the nav (`?` stays hotkey-only).
- Reworking `BrandBadge` or other shell chrome.
- Removing the `clock` runtime store or `chrome.system.sig` data — both stay; only their nav rendering goes away. `InstrumentCluster` (uptime) and `StatsPanel` (`build 0x…`) are untouched.

## Layout

`NavPanel.svelte` grid changes from `auto 1fr auto` to `auto 1fr auto auto auto`:

```
col 1: BrandBadge       (auto, left)
col 2: <empty gap>      (1fr — elastic spacer; takes whatever room is left)
col 3: ChannelPads      (auto, right cluster)
col 4: ThemeControls    (auto, right cluster)
col 5: GreebleStrip     (auto, right cluster, hugs the right padding)
```

`BrandBadge` (including its inline archive greeble) is unchanged — same column, same scroll-shrink behavior.

`ChannelPads` loses its `justify-self: center` rule — it now sits in its own auto column on the right, separated from `ThemeControls` and `GreebleStrip` by the existing `gap` on `.nav-panel` (28px → 18px when scrolled). The right cluster reads as one tight assembly.

`ChannelPads`, `ThemeControls`, and `GreebleStrip` all share the existing scroll-shrink animation that was applied to `.status` and `.channels` (`transform: scale(...)` when `nav-panel.scrolled`). They use `transform`, not `padding`, to keep the GPU path consistent with the rest of the nav.

### ThemeControls subgroup

```
┌──────┬─────────────┐
│  ⌧   │   ◐◐◐  ▾    │
└──────┴─────────────┘
  sys     theme  [t]
```

Two buttons separated by a 1px vertical edge rule (`var(--hal-edge)`). Both buttons mirror the `.ch` styling from `ChannelPads.svelte` (border, padding, mono caps) so they visually rhyme with the channel pads.

#### Sys button

- Phosphor `Monitor` icon, ~14px, `var(--hal-dim)` default.
- Active state when `mode === 'system'`: lamp lit, hot border, `.live` inset glow — same active treatment as a channel pad.
- Click → `setMode('system')` if currently off, else `setMode(<resolvedVariant>)` to pin.
- No corner pip (sys has no hotkey).

#### Theme button

- Body: 3-chip swatch trio drawn from the current theme's palette (see "Swatch trio" below) + Phosphor `CaretDown`.
- Active state: same `.live` treatment when the dropdown is open.
- Click → toggle dropdown.
- Corner pip `[t]` in top-right.

### Dropdown

- Anchored under the theme button, right-aligned to the subgroup's right edge so it doesn't overhang the GreebleStrip.
- Rendered inline inside `ThemeControls` (not portaled). The nav has `z-index: 5` and no clipping concerns.
- Width: hugs content; min-width matches the trigger so it doesn't look truncated.
- Each row: `[swatch trio]   family-name   variant-tag`. Variant tag is a small mono `· DK` / `· LT` token in `var(--hal-cool)`.
- Active row: `.live` border + lamp lit.
- Keyboard: `↑` / `↓` move focus, `Enter` selects, `Esc` closes, `Tab` closes (to release focus to the next nav item).
- Mouse: click outside closes, click row selects + closes.
- ARIA: `role="listbox"` on the panel, `role="option"` with `aria-selected` on each row, `aria-haspopup="listbox"` and `aria-expanded` on the trigger.

### Corner pip greeble

A tiny stamped serial reading `[1]`, `[2]`, `[3]` on each channel pad and `[t]` on the theme button.

- Position: `position: absolute; top: -1px; right: -1px;` so it overlaps the border, like a milled label inset into the chassis.
- Type: `var(--font-mono)`, ~9–10px, letter-spacing 0.08em, lowercase to match HelpOverlay.
- Default color: `var(--hal-deep-dim)`. On hover/focus of the parent button: brightens to `var(--hal-hot)` with a `text-shadow: 0 0 8px rgba(184, 255, 90, 0.5)` (matches `HelpOverlay`'s `.hk` treatment).
- `aria-hidden="true"` — decorative; the binding is announced via the help overlay.
- Source: hotkey strings come from existing `sections.ts` (`s.hotkey`) and `commands.ts` (`theme-picker`'s `hotkey: 't'`).

## GreebleStrip

Replaces `StatusStrip` on the right of the nav. Pure decoration; no live clock, no LIVE label, no `SIG` text.

Visual: a horizontal arrangement of vertical mil-spec ticks plus one or two lit indicator pips (option D from brainstorming).

- **Ticks** — ~10–14 thin vertical bars, 1px wide, alternating heights (e.g. `8px / 12px / 8px / 12px / …`), `var(--hal-deep-dim)`. Even spacing (~6px gap). Renders as a short ruler stamped on the chassis.
- **Pips** — two of the gaps host small ~4px round dots in `--hal-warm` and `--hal-cool`, positioned at intentionally non-symmetric indices to avoid looking generated. Both faintly glow via the existing `--glow-pulse` token (already reduced-motion-gated through `phosphor-shell.css`).
- **Total width** — fits in roughly the width of the existing `SIG 0X…` token, so the nav doesn't reflow at smaller breakpoints.
- **No interactivity, no aria** — `aria-hidden="true"` on the wrapper.
- **Implementation** — single `GreebleStrip.svelte` component, styles scoped, tick array generated by a small static config so order/heights are predictable across renders (matters for SSR hydration).

The `clock` import and `chrome.system.sig` reference disappear from this component. Both remain available for `InstrumentCluster` and `StatsPanel` respectively.

## Theme registry change

`registry.ts` expands so each light/dark variant is its own entry. Day-one shape:

```ts
export const themes = [
	{
		id: 'phosphor-green-dark',
		family: 'phosphor-green',
		familyName: 'Phosphor green',
		variant: 'dark',
		default: true
	},
	{
		id: 'phosphor-green-light',
		family: 'phosphor-green',
		familyName: 'Phosphor green',
		variant: 'light'
	}
] as const;

export type ThemeId = (typeof themes)[number]['id'];
export type Variant = 'dark' | 'light';
```

`Mode` (`'dark' | 'light' | 'system'`) is retained for cookie/data-attribute compatibility with the resolve and SSR layers, but the public ThemeControls UI no longer exposes a separate L/D/S widget — the variant lives on the theme entry and `mode = 'system'` becomes the only meta-mode.

### "System" semantics (Y2)

`localStorage.proto-last-family` records the last-chosen family. When sys is on:

1. Watch `matchMedia('(prefers-color-scheme: dark)')`.
2. Resolve to the theme `{ family: lastFamily, variant: matched-os-scheme }`.
3. Fall back to `DEFAULT_THEME`'s family if `lastFamily` is unset.
4. If the resolved variant doesn't exist in the registry (e.g. only dark is registered), fall back to the family's other variant.

Switching from sys → an explicit theme writes the new family to `lastFamily` and sets `mode='dark'|'light'` per that theme's variant. Switching from explicit → sys re-resolves immediately.

### Swatch trio

Pulled from each theme's palette tokens, not declared per-theme. The trio is `[--hal-hot, --hal-warm, --hal-cool]` — three saturated tokens that already differ across our planned themes. To render swatches for a theme that isn't currently active, we need its palette without applying it globally:

- Each theme exports a palette object (already required for the theming engine — see `2026-04-24-design-tokens-and-theming-engine-design.md`).
- `ThemeControls` reads the trio off each theme's palette directly when rendering rows. No CSS variable juggling required.

Future override hatch: an optional `swatch?: [string, string, string]` field on the registry entry can override the pulled trio when a designer wants something different. Out of scope for this change.

## Removals and rewires

- **Delete** `src/lib/shell/ThemePickerOverlay.svelte`.
- **Remove** `'theme'` from the `OverlayKind` union in `overlay.ts`.
- **Remove** the `'theme'` branch and the `ThemePickerOverlay` import from `KeyboardLayer.svelte`.
- **Keep** the `theme-picker` command in `commands.ts` so the help overlay still shows `[t]`, but change its `run()` to toggle the theme dropdown via a new writable store (see below).

### Hotkey wiring

A new module `src/lib/shell/theme-controls.ts` exports a small writable:

```ts
import { writable } from 'svelte/store';
export const themeDropdownOpen = writable(false);
```

- `ThemeControls.svelte` subscribes to `themeDropdownOpen` and renders the dropdown accordingly. Outside-click and `Esc` set it to `false`.
- `commands.ts`'s `theme-picker.run()` becomes `() => themeDropdownOpen.update((v) => !v)`.
- This keeps `KeyboardLayer.svelte` agnostic — it still calls `findCommand(e.key).run()` and the command does the right thing.

## Phosphor Icons

- Add `phosphor-svelte` to `package.json` (`pnpm add phosphor-svelte` per project convention).
- Imports tree-shake: `import { Monitor, CaretDown } from 'phosphor-svelte'`.
- Default size 14px in nav buttons; weight `regular` unless we settle on `duotone` later.

## Files touched

| File                                      | Change                                                                                                                                                                     |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/shell/NavPanel.svelte`           | grid: 5-col `auto 1fr auto auto auto`; mount `<ThemeControls />` and `<GreebleStrip />`; drop `<StatusStrip />` import; drop the `.channels { justify-self: center }` rule |
| `src/lib/shell/ChannelPads.svelte`        | render corner pip from `s.hotkey`                                                                                                                                          |
| `src/lib/shell/ThemeControls.svelte`      | **new** — sys button, theme button, dropdown                                                                                                                               |
| `src/lib/shell/theme-controls.ts`         | **new** — `themeDropdownOpen` store                                                                                                                                        |
| `src/lib/shell/GreebleStrip.svelte`       | **new** — tick rule + indicator pips                                                                                                                                       |
| `src/lib/shell/StatusStrip.svelte`        | **delete** (no other consumers)                                                                                                                                            |
| `src/lib/shell/ThemePickerOverlay.svelte` | **delete**                                                                                                                                                                 |
| `src/lib/shell/KeyboardLayer.svelte`      | drop `ThemePickerOverlay` import + `theme` branch                                                                                                                          |
| `src/lib/shell/overlay.ts`                | drop `'theme'` from `OverlayKind`                                                                                                                                          |
| `src/lib/shell/commands.ts`               | `theme-picker.run()` toggles `themeDropdownOpen`                                                                                                                           |
| `src/lib/theme/registry.ts`               | add `phosphor-green-light`; export `family`, `familyName`, `variant`, `palette`                                                                                            |
| `src/lib/theme/index.ts`                  | helpers for sys-mode resolution + `lastFamily` persistence                                                                                                                 |
| `package.json`                            | `+ phosphor-svelte`                                                                                                                                                        |

## Edge cases

- **SSR:** the dropdown defaults to closed. `ThemeControls` only mounts the `matchMedia` listener and reads `localStorage.lastFamily` inside `onMount`, so SSR output is deterministic and matches the cookie-resolved theme already on `<html>`.
- **Reduced motion:** corner-pip brightening is opacity/color only; no transition-distance changes needed. The dropdown's open/close uses opacity + `translateY(-2px)` and is gated by `@media (prefers-reduced-motion: reduce)` to swap the slide for a snap.
- **Variant mismatch:** if a user has `lastFamily=acid-yellow` and acid-yellow is later removed, sys-resolution falls back to `DEFAULT_THEME.family` and clears the stale `lastFamily`.
- **Cookie collisions:** existing cookies (`proto-theme`, `proto-mode`) keep working; this change does not alter cookie names or the `resolve()` layer.

## Test plan

Unit / Vitest:

- `theme/registry.ts` — registry shape (each entry has family/variant/palette).
- `theme-controls.ts` — store toggles.
- A new `theme-controls-resolve.test.ts` covering the sys-mode resolver: lastFamily set / unset, OS dark / light, missing variant fallback.

Component-level (Vitest + Svelte Testing Library if available):

- ThemeControls renders one row per registered theme.
- Clicking a row calls `setTheme(id)` and closes the dropdown.
- `t` toggles the dropdown via the command store.
- `Esc` closes when open; outside-click closes.

Visual / browser:

- Corner pips render on channels and theme button; brighten on hover/focus.
- Sys button toggles `data-mode` to track OS scheme via `matchMedia` (manually flip system scheme).
- Dropdown does not clip under the GreebleStrip on the smallest container-query breakpoint that the nav supports.
- GreebleStrip renders the tick array and lit pips in deterministic positions across SSR → hydration (no flicker / no React-style mismatch).
- Reduced-motion preference removes the slide-in and the pip pulse.

## Open questions

None — all forks resolved during brainstorming.
