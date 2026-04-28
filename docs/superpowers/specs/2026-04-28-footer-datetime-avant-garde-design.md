# Footer date/time + avant-garde terminal zhush — design

**Date:** 2026-04-28
**Component:** `src/lib/shell/StatsPanel.svelte`
**Status:** approved (pending spec re-read)

## Goal

Add a stardate-style date/time readout to the StatsPanel footer strip and lift the
whole strip's typography toward "avant-garde terminal" — the avant-garde move is
typographic mixing (mono ↔ display italic, lowercase keys, alternating separators,
bracket ornament around the clock), not motion. The footer stays a single row.

## Current state

The footer is one fixed-bottom flex row, three zones:

- **Left:** five 7×7 squares, three filled with `--hal-hot` (decorative, static).
- **Center:** key/value pairs `vol 02 ◆ no 04 ◆ est MMXXVI ◆ net atproto ◆ build 0x___ ◆ mode ARCHIVE` (uppercase mono, all `◆` separators).
- **Right:** `▷ {user}@{host}` rendered as `▷ protocol7@helios` by default.

The `clock` and `uptime` stores in `src/lib/shell/runtime.ts` already tick once per
second; nothing about the data layer needs to change.

## Final shape (wide, ≥1024px)

```
[▣▣▣▢▢]   vol 02  ◆  no 04  ▍  net atproto  ◆  build 0xABCD   ⟨ 2026·D118 · 14:32:08 ⟩   ▷ protocol7@helios
```

Left decoration · key/value run · bracketed clock · identity. The italic-display
brackets around the clock and the italic-display `0xABCD` build value are the two
"rhyme" points across the strip.

## Components

### Date / time block (new)

- Format: `YYYY·D{doy} · HH:MM:SS` — local year, local day-of-year, local time.
  Example: `2026·D118 · 14:32:08`.
- Wrapped in mathematical angle brackets `⟨ ⟩` (U+27E8 / U+27E9) set in
  **Lunema Sans 400 italic**, colored `--hal-warm`. The brackets read as ornament,
  not text — they're the display-italic accent that anchors the avant-garde register.
- Inside: **Departure Mono** 10px (matches the rest of the strip).
- `D{nnn}` segment colored `--hal-cool` — same teal used on `atproto`, so the two
  cool accents echo each other across the row.
- Time colons (`:`) render statically — same color as the surrounding bone
  digits. (Earlier draft included a 1 Hz blink; pulled because the shell
  already has plenty of ambient motion and the blink read as gimmick.)
- Subscribed to the existing `clock` store from `src/lib/shell/runtime.ts`; DOY is
  computed inline from the same `Date` value (`Math.floor((now - Jan1Local) / 86_400_000) + 1`).
  No changes to `runtime.ts`.

### Existing key/value segments — typographic refresh

- **Keys lowercase, dim.** `vol`, `no`, `net`, `build` rendered as literal lowercase
  strings. The `.k` rule overrides the panel-level `text-transform: uppercase` with
  `text-transform: none` so the lowercase glyphs render verbatim.
- **Values uppercase, bone** — unchanged for `02`, `04`. `atproto` keeps `--hal-cool`
  (already does).
- **Build value italic display.** The build hex (e.g. `0xABCD`) renders in
  **Lunema Sans 400 italic** at matched optical size, replacing the current mono
  rendering. Pairs typographically with the italic brackets around the clock.
- **Dropped:** `est MMXXVI` and `mode ARCHIVE` segments removed entirely. The
  date/time block supersedes EST's "when" function; MODE was decorative.

### Separators

Alternate by position between `◆` (current diamond, U+25C6) and `▍` (left-half
block, U+258D, ~6px wide). Both `--hal-deep-dim`. The clock's brackets serve as its
own visual boundary — no separator immediately before it.

Concrete sequence (wide):

```
vol 02  ◆  no 04  ▍  net atproto  ◆  build 0xABCD   ⟨ … clock … ⟩
```

This breaks the metronome of the uniform-diamond row without introducing a third
glyph.

### Left squares

Unchanged: static `▣▣▣▢▢`, three filled `--hal-hot`, two empty.

### Right identity

Unchanged. Existing `▷ {chrome.identity.user}@{chrome.identity.host}` markup,
styling, and responsive behavior all stay as-is.

## Responsive behavior

Container queries on `chrome` are already in place. Updated breakpoints:

- **≥1024px:** full strip as shown above.
- **768–1023px:** hide the `build` segment first (least informational); date/time
  stays full.
- **≤767px:** hide left squares; hide `vol`, `no`. Show `net atproto`, the clock,
  and the right identity. Clock strips year and seconds → `⟨D118 · 14:32⟩`. The
  identity continues to hide its `who` text at this breakpoint, as it does today.
- **≤479px:** clock further reduces to `⟨14:32⟩` only. Identity behavior unchanged
  from current. `net atproto` continues to hide as it does at this breakpoint today.

## Files touched

- `src/lib/shell/StatsPanel.svelte` — markup, styles, new `clock` subscription,
  new keyframe for colon blink.
- (No new component, no `runtime.ts` change, no theme token additions.)

## Tests

Add `src/lib/shell/stats-panel.test.ts`:

- Renders with a mocked / overridden `clock` store value (e.g.
  `{ date: '2026-04-28', time: '14:32:08' }`); asserts the visible text contains
  `D118` and `14:32:08`.
- Asserts `EST` and `MODE` strings are absent (regression guard for the deletions).
- Asserts the lowercase keys (`vol`, `no`, `net`, `build`) render as written.
- (Colon-blink hook removed — colons render statically.)
- Right-identity markup is unchanged; no new assertions there.

DOY computation gets a small unit test alongside the component test (or inline):
verifies Jan 1 → `D1`, Apr 28 (non-leap year flow) → `D118`, Dec 31 of a leap year
→ `D366`.

## Reduced motion

No new motion is introduced by this change — colon stays static, no animations
added. The existing `--glow-pulse` motion in `phosphor-green.css` already handles
its own reduced-motion gating.

## Out of scope

- Heartbeat/scanning animation on the left squares (P3-style motion).
- Inverted-segment background on the clock (P3).
- A second row / promoted "console readout" footer.
- Additional time zones / dual-zone display.
- Timezone-aware DOY (uses local time, mirroring the existing `clock` derivation).
