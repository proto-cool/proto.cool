# proto.cool — phosphor shell (redesign)

**Date:** 2026-04-27
**Branch:** `feat/move-to-atproto`
**Status:** draft
**Supersedes (visually):** `2026-04-24-tui-shell-design.md`

## Context

The TUI shell from the v1 spec (`2026-04-24-tui-shell-design.md`) is built and working — clusters, prompt bar, powerline statusbar, sigils, gridline backdrop. It reads as **dotfiles-porn / hackerpunk**, and at this point it's too heavy: every page is dressed up like a personal-OS console regardless of what's on it.

This spec replaces the visual identity of the shell. The conceit shifts from **"the site IS a TUI/OS"** to **"the site is an avant-garde-but-normal website where typography and greebles sing, with a sci-fi / halogen / phosphor wash."** The point is that an indexed personal site is the subject; the chrome is supporting cast, not lead.

The atproto routing, federated content feed, theming engine, keyboard layer, overlay system, and section model **stay**. The existing `Logoblock`, `ClusterBar`, `Cluster`, `NavTabs`, `PromptBar`, `Statusbar`, and the heavy gridline page background are **replaced**. The font stack (Atkinson Hyperlegible Next / Lunema Sans / Departure Mono) is kept — it maps cleanly onto the new direction.

The visual reference of record is `.superpowers/brainstorm/78171-1777315780/content/halogen-v5-panels.html`. That mockup is the source of truth for visual decisions made during this spec.

## Aesthetic intent

- **Phosphor halogen** — bone text on near-black green-anthracite, a hot lime accent that reads as an instrument lamp catching on type and panel rims. Cool teal as a rare secondary. References: MUTHUR/Nostromo, Severance terminals, NVG/HUD, halt-and-catch-fire title cards, Apollo cabin lamps.
- **Pixel dithering** as a first-class motif. Bayer-style 4×4 tiles in three densities (sparse / medium / dense) used in: the halogen halo behind the hero (stepped concentric rings, dense → sparse), meter overflow tails, ambient screen-blend noise across the canvas, and a small minimap fill.
- **No page-wide frame.** No console-frame border around the whole shell, no bracket reticles framing the page. The dithered halo bleeds full-bleed off the canvas edges.
- **Lifted panels for chrome bands.** The top nav and bottom stats bar sit on solid-surface panels (with a subtle phosphor edge highlight on the lit edge and a soft drop shadow into the dithered hero) so the dither doesn't bleed through them. Tiny corner brackets at panel ends keep the engineered feel without re-introducing a page frame.
- **One-line wordmark.** `proto.cool` is a locked lockup, italic Lunema Extra Bold, always one line, set inside a small lit brand badge.
- **The display still sings.** Italic Lunema Extra Bold runs the hero at huge scale with halogen text-shadow; line two is outline-only with a phosphor stroke. The headline is the loudest moment on every landing page.
- **Greeble is typographic, not OS chrome.** Mono register marks (`VOL · № 04`, `SIG 0X9A3`, `EST MMXXVI`), small uppercase labels, hairline rules, lit pips — all set in Departure Mono. No `protocol7@helios:~/content` prompt cosplay.

## Decisions

| Decision | Choice |
| --- | --- |
| Page frame | None. Full-bleed stage with a dithered halogen halo that bleeds beyond the canvas |
| Top chrome | `NavPanel` — elevated panel with brand badge + channel pads + status strip |
| Bottom chrome | `StatsPanel` — elevated panel with mono register tape (~6 columns) |
| Hero | Open zone in the middle of the page; dithered halo + lockup + instrument cluster live here |
| Wordmark | `proto.cool` — locked lockup, italic Lunema 800, always one line, in a lit brand badge |
| Channel nav | Lit pill-style "channel pads" — content / projects / about / feed; live channel highlighted with phosphor border + inset glow |
| Status strip | Live dot · date · sig (mono) — right side of the nav panel |
| Hero lockup | Two-line italic Lunema 800 display; line 1 solid bone with halogen text-shadow; line 2 outline-only with phosphor stroke; punctuation hot |
| Halo | Three concentric Bayer-dither rings (dense → medium → sparse), masked with stepped radial gradients, anchored at lower-left of hero, bleeds beyond canvas |
| Instrument cluster | One `InstrumentCluster` panel to the right of the hero — meter (with dithered overflow tail), readout grid (rx · conn · pds · uptime), signal minimap with dither + grid backing |
| Stats panel | 6 mono columns: VOL/№, EST, NET, BUILD, MODE, identity-pointer |
| Prompt bar / TUI bar | Removed |
| Sigils / cursor / "$ pwd" / "// kernel" | Removed. Greeble is typographic only |
| Gridline page background | Removed. Replaced by ambient screen-blended dither at very low opacity |
| Logoblock subline + sigil row | Removed |
| Cluster bar (4 clusters) | Removed. One curated `InstrumentCluster` lives in the hero |
| Powerline statusbar (fixed bottom) | Removed |
| Theme | New `phosphor-green` is the v1 default. Existing `neon-green` and `magenta-vapor` themes deleted; tokens reshaped around halogen vocabulary |
| Mode | Dark is canonical. Light mode is **out of scope for v1** — punted to a follow-up spec (the halogen vocabulary is dark-native; a paper-mode requires fresh design, not a token flip) |
| Reduced motion | Pulse animations and glow softening neutralised; dither tiles stay (they're static images, not motion) |
| Font stack | Unchanged: Atkinson Hyperlegible Next / Lunema Sans / Departure Mono |
| Routes | Unchanged: `/` (content), `/projects`, `/about`. Keyboard hotkeys 1/2/3 still wired |
| Overlays | Unchanged mechanism (`Overlay.svelte` + content components). `?` help and `t` theme picker still work; their content gets restyled to the phosphor vocabulary |
| Search/cmd (`/`, `:`) | Out of scope for v1. Drop the chip from the chrome; deferred to feed spec |
| Container queries | Kept. `chrome` container scope is now on the `Stage` element |
| Prerendering | Unchanged: `/about` and `/projects` prerender; `/` stays dynamic for the feed |

## Architecture

```
+============================================+
|  NavPanel (elevated)                       |
|  [proto.cool]  ° ° ° °         live · …   |
+============================================+
|                                            |
|        ▒░░    AN INDEXED                   |
|       ▓▒░░    PERSONAL ARCHIVE.            |
|      █▓▒░░░     deck text…    [Cluster]   |
|       ▓▒░░░░                              |
|                                            |
|     ↑ dithered halogen halo, bleeds        |
+============================================+
|  StatsPanel (elevated)                     |
|  ● VOL 02/№4 | EST | NET | BUILD | MODE   |
+============================================+
```

Three vertical bands stacked: NavPanel · Hero (Stage backdrop with halo + lockup + cluster) · StatsPanel. Both panels sit at z-index above the ambient dither; the hero is open and lets the halo do its thing.

## Components

New files under `src/lib/shell/`:

- **`Stage.svelte`** — outermost container; provides the anthracite background, the ambient screen-blended dither overlay, and the container-query scope (`chrome`). Hosts NavPanel, slotted children (the hero/page content), and StatsPanel.
- **`NavPanel.svelte`** — elevated top panel. Composes `BrandBadge` + `ChannelPads` + `StatusStrip`. Solid lifted surface, phosphor edge highlight on the top edge, soft drop shadow below, corner bracket marks at panel ends.
- **`BrandBadge.svelte`** — `proto.cool` wordmark in a lit pill (italic Lunema 800, halogen text-shadow). Pulse pip on the left. Wraps with `<a href="/">`.
- **`ChannelPads.svelte`** — section nav. Renders the existing `sections` array as lit pills with lamp dots. Live channel uses phosphor border + inset glow. Keeps `aria-current="page"`. Hotkeys 1/2/3 stay wired in `KeyboardLayer`.
- **`StatusStrip.svelte`** — right-side data strip in the nav. Live dot · date · sig (mono). Date and sig come from `chrome` context; the live dot is a CSS-only pulse.
- **`HeroLockup.svelte`** — the page-level display moment: two-line italic Lunema 800. Takes `line1`, `line2`, and `deck` (markdown-allowed) as props. Used by `/`, `/projects`, `/about` (and feeds back into route-specific content). Per-route lockups override.
- **`Halo.svelte`** — the dithered halogen halo. Three layered rings (`.ring-1/2/3`) using `dither-dense / -medium / -sparse` utilities masked with stepped radial gradients. Anchored at lower-left of its parent (the hero region) and extended past parent bounds via negative absolute insets so it bleeds full-bleed. Decorative; `aria-hidden`.
- **`InstrumentCluster.svelte`** — the right-of-hero panel: cap label, segmented `Meter` with dithered overflow tail, `ReadoutGrid` with rx/conn/pds/uptime rows, `SignalMinimap` with grid backing + dithered fill + pulse. Real values come from `chrome` (pds, build) and `runtime` (uptime, clock). Cosmetic readouts (rx, conn, minimap heartbeat) come from a tiny new `instrument-data.ts` helper colocated with the component.
- **`StatsPanel.svelte`** — elevated bottom panel. ~6 mono columns: VOL/№ · EST · NET · BUILD · MODE · identity-pointer. Phosphor edge highlight on the bottom edge; drop shadow upward.

Existing files **kept**:

- `Shell.svelte` — rewritten to compose `Stage` → `NavPanel` + `{children}` (with hero slot) + `StatsPanel`.
- `KeyboardLayer.svelte` — kept; still binds 1/2/3 → sections, `t` → theme picker, `?` → help. Drop `/` and `:` bindings (search/cmd are out of scope).
- `commands.ts` / `commands.test.ts` — keep `theme`, `help`, and the section commands. Delete `search` and `cmd` (chip is gone).
- `sections.ts` — unchanged (content / projects / about + hotkeys).
- `runtime.ts` / `runtime.test.ts` — kept; uptime, clock, pwd still drive the panels.
- `chrome.ts` / `chrome.test.ts` — kept. Trim what's surfaced (no more `kernel`, `shell`, `cur`, `mode`, `rec`).
- `Overlay.svelte` / `overlay.ts` / `overlay.test.ts` — kept.
- `HelpOverlay.svelte` / `ThemePickerOverlay.svelte` — kept; restyled to phosphor vocabulary.

Existing files **deleted**:

- `Logoblock.svelte` (replaced by `BrandBadge`)
- `Cluster.svelte` and `ClusterBar.svelte` (replaced by `InstrumentCluster`)
- `NavTabs.svelte` (replaced by `ChannelPads`)
- `PromptBar.svelte` (no replacement — out of scope)
- `Statusbar.svelte` (replaced by `StatsPanel`)
- `cosmetic.ts` (cursor coords, editor mode, rec timer all gone). The link rxTx/conn and the signal sparkline migrate into the colocated `instrument-data.ts` helper next to `InstrumentCluster.svelte`, no longer a generic shell util.
- `StubOverlay.svelte` — its callers (search/cmd chips) are gone. Re-add when feed-search lands; do not keep dead code.
- `shell.css` — superseded by `phosphor-shell.css`
- All `[data-mode='light']` selectors throughout shell + theme stylesheets — light mode is out of scope for v1; remove the half-implemented light-mode branches rather than leaving dead CSS

New files under `src/lib/theme/`:

- **`themes/phosphor-green.css`** — the v1 default theme. Defines all `--hal-*` tokens.
- **Update `tokens.css`** — add halogen panel surface tokens, dither tile pattern URLs as CSS custom properties, and refactor glow tokens to halogen vocabulary (text-glow, edge-glow, panel-glow, dot-glow).
- **Update `glow-keyframes.css`** — pulse keyframes retuned for halogen pip (slower, warmer at peak); remove the bright-cycle CRT-bloom keyframe.
- **`utilities.css`** — add `.dither-sparse / .dither-medium / .dither-dense` utility classes (Bayer 4×4 SVG data URIs, `background-size: 4px`, `image-rendering: pixelated`).

Existing theme files **deleted**:

- `themes/neon-green.css`
- `themes/magenta-vapor.css`
- `glyphs.ts` / `glyphs.test.ts` — TUI glyph registry no longer used. The few greeble marks needed (corner brackets, dotted hairline, pip) are CSS, not glyph data.

## Theme tokens (phosphor-green)

```css
--hal-anthra:    #060906;   /* base anthracite */
--hal-anthra-2:  #0a0e0a;   /* +1 */
--hal-anthra-3:  #0e1310;   /* panel surface */
--hal-edge:      #1d2c1a;   /* warm dark green hairline */
--hal-warm:      #82e34b;   /* mid phosphor — register marks, glow values */
--hal-hot:       #b8ff5a;   /* hot lime — accents, lit channels, badge border */
--hal-ember:     #d4ff80;   /* peak — meter peak segment, pulse pip */
--hal-bone:      #e2f5cf;   /* off-white green-tinted body text */
--hal-dim:       #6e8a5c;   /* dim mono labels */
--hal-deep-dim:  #2c3a26;   /* dimmed lamp / inactive */
--hal-cool:      #4ad29c;   /* rare cyan-teal accent — sig, "atproto" */
```

Glow tokens:

```css
--glow-text:    0 0 1px rgba(226,245,207,.95), 0 0 6px rgba(184,255,90,.55), 0 0 22px rgba(184,255,90,.30);
--glow-edge:    0 0 8px rgba(184,255,90,.55);
--glow-panel:   inset 0 1px 0 rgba(184,255,90,.10), 0 6px 22px rgba(0,0,0,.55);
--glow-pip:     0 0 6px var(--hal-hot), 0 0 16px rgba(130,227,75,.7);
```

Dither pattern URLs as tokens (so utilities and one-off components share them):

```css
--dither-sparse: url("data:image/svg+xml;utf8,…");
--dither-medium: url("data:image/svg+xml;utf8,…");
--dither-dense:  url("data:image/svg+xml;utf8,…");
```

Atkinson / Lunema / Departure Mono kept as-is. `--font-sans`, `--font-display`, `--font-mono` unchanged.

## Responsive

Container queries on `Stage` (`container-name: chrome`). Same five breakpoints as v1 (xs / sm / md / lg / xl) with these adjustments:

- **xs (≤ 479px)** — `NavPanel` collapses: brand badge + a single open-overlay button for channels (channel pads move into the overlay). Status strip drops to date only. `InstrumentCluster` moves below the hero, full-width. Hero lockup font-size drops to `~64–72px`. Stats panel collapses to 2-column grid showing VOL and BUILD only.
- **sm (480–767px)** — channel pads visible; status strip drops sig. Cluster stays below hero.
- **md (768–1023px)** — full nav; cluster moves to hero side at narrower fixed width (240px).
- **lg (1024–1279px)** — full layout as designed.
- **xl (≥ 1280px)** — same as lg with relaxed padding.

## Reduced motion

`@media (prefers-reduced-motion: reduce)` neutralises:
- pulse keyframes on the brand badge pip and status live-dot
- meter peak segment any animation
- minimap pulse animation

The dither tiles, halo masks, glow text-shadows, and box-shadows **stay** — they are static rendering, not motion, and are part of the visual identity. Removing them would remove the design.

## Accessibility notes

- All decorative dither / halo / minimap / lamp pip elements use `aria-hidden="true"`.
- Channel pads keep `aria-current="page"` for the live channel.
- Wordmark anchor has accessible name `proto.cool — home`.
- Stats panel info is decorative; uses `aria-hidden="true"` on the wrapper and conveys no critical state.
- Color contrast: `--hal-bone` (`#e2f5cf`) on `--hal-anthra` (`#060906`) is well over 7:1 WCAG AAA. Mono dim text (`--hal-dim` on `--hal-anthra-3`) is checked against AA-non-essential.
- Reduced-transparency: panel `background` does not rely on `backdrop-filter` for legibility; the `backdrop-filter: blur(2px)` on the cluster is purely cosmetic.

## What's out of scope (v1)

- **Light mode.** The halogen vocabulary is dark-native. A paper / day-mode requires its own design pass; punted.
- **Search / command palette overlays.** The `/` and `:` chip is gone from the chrome; bring it back when feed-search lands.
- **Federated feed content.** This spec is the chrome rebuild only. The feed (Bluesky / pckt / Grain) lands in the feed spec on top of the new shell.
- **Theme switching to anything other than phosphor-green.** Theming engine stays, but v1 ships with one theme. Alternates (e.g., a warm-tungsten cousin) come later if wanted.
- **Animated halo / dither.** Halo and dither are static. No drifting noise, no scanline animation. (We just threw out the CRT cosplay; don't bring it back.)

## Migration plan summary

The implementation plan (next step) will sequence:

1. Token updates and the new `phosphor-green` theme — swap in place (no feature flag): the existing themes are getting deleted anyway, and the redesign is a clean break, not an A/B.
2. New components built in isolation under `src/lib/shell/` (NavPanel, BrandBadge, ChannelPads, StatusStrip, HeroLockup, Halo, InstrumentCluster, StatsPanel, Stage).
3. `Shell.svelte` rewrite to compose the new tree.
4. Hero lockups added to `+page.svelte`, `/projects/+page.svelte`, `/about/+page.svelte`.
5. Deletion of old components, old themes, and `cosmetic.ts` / `glyphs.ts`.
6. Restyle of `HelpOverlay`, `ThemePickerOverlay`, `StubOverlay` to phosphor vocabulary.
7. Container-query and reduced-motion pass.
8. Test sweep (unit tests for runtime / chrome / sections kept; component-level tests rewritten where needed).

Sequencing details (file-by-file order, what gets touched together, where the seams are) belong in the implementation plan, not here.
