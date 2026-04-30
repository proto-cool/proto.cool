# Sidebar zhush — design

**Date:** 2026-04-30
**Branch context:** `feat/move-to-atproto`
**Component:** `src/lib/feed/Sidebar.svelte` (replaces current placeholder)

## Goal

Replace the placeholder sidebar on the home page with two purpose-built blocks that fit the Phosphor-shell instrument-cluster vocabulary, add genuine information value, and don't decay without manual care.

## Scope

- `src/lib/feed/Sidebar.svelte` — rewrite
- New: server hook to surface "pulse" data (latest post / latest blog timestamps + counts)
- New: `/feed.xml` route (RSS) — wire up the destination the elsewhere block links to
- New: `BskyIcon` already exists; introduce no new icon dependencies (uses `phosphor-svelte`, already installed)

Out of scope: blog page (separate brainstorm), tag/archive discovery (handled by future `/blog` page), changes to the FeedToolbar / hero / chrome.

## Non-goals (explicit decisions made during brainstorm)

- No tag cloud — tags are a blog-only concept on this site, sparse for bsky records.
- No hand-edited "now" panel — operator self-flagged that it would go stale.
- No identity dump (DID / PDS endpoint) in the sidebar — hero already carries identity.
- No left-border accent stripes (per global feedback memory).
- No new visual vocabulary — reuses existing chrome (kicker, edge border, shell-veil fill).

## Layout

The sidebar stays in its existing column on `+page.svelte` (right column of `.layout`, sticky at `top: 96px`, collapses to single column under `1024px`). Two stacked blocks with the existing 22px gap.

```
┌─────────────────────┐
│ /// pulse           │
│ ─────────────────── │
│ last post   2h      │
│ last blog   9d      │
│ posts       247     │
│ blogs       12      │
│ theme       halogen │
└─────────────────────┘

┌─────────────────────┐
│ /// elsewhere       │
│ ─────────────────── │
│ ┌─────┬─────┬─────┐ │
│ │  ⊙  │  ⊙  │  ⊙  │ │
│ │bsky │ gh  │ atp │ │
│ ├─────┼─────┼─────┤ │
│ │  ⊙  │  ⊙  │  ⊙  │ │
│ │ rss │mail │steam│ │
│ └─────┴─────┴─────┘ │
└─────────────────────┘
```

Block chrome is identical to today: `var(--shell-veil)` fill, 1px `var(--color-edge)` border, kicker (`/// <name>`) with bottom rule. No new tokens.

## Block 1 — `/// pulse`

### Purpose

An auto-derived instrument readout. Every row sources from data already on the page or from the active theme store, so the block stays fresh without manual care. Complementary to the global `StatsPanel` (which carries vol / no / net / build / clock / ident — no counts, no activity timestamps).

### Rows

| label | value | source |
|---|---|---|
| `last post` | relative time, e.g. `2h`, `3d`, `2w` | newest non-blog `kind='owned'` record's `created_at` |
| `last blog` | relative time | newest blog (pckt / standard.site doc) `kind='owned'` record's `created_at` |
| `posts` | integer | `COUNT(*)` of non-blog `kind='owned'` records, status='ok' |
| `blogs` | integer | `COUNT(*)` of blog `kind='owned'` records, status='ok' |
| `theme` | active theme name, e.g. `halogen` | reads from theme store reactively (live updates when user flips themes) |

"Blog" identification piggybacks on the existing `collectionsForSource('standard')` mapping in `src/lib/server/config.ts`, so the categorization stays in one place.

### Data flow

A new server function `getPulseStats(db: DB): PulseStats` returns the four data values in one call (single round-trip — two `SELECT MIN/MAX` and two `COUNT` queries combined into one, or four cheap queries; SQLite cost is trivial either way). Called from the existing home page loader (`src/routes/+page.server.ts`) and passed to the page as `data.pulse`. The home page hands it to `<Sidebar pulse={data.pulse} />`.

`theme` is read client-side from the existing theme store/context — no SSR coupling needed; it just renders whichever theme is active at hydration and updates reactively after.

### Render

Definition-list-shaped layout, two columns inside the block:

- Label column: fixed character-width so values left-align cleanly (e.g. `width: 8ch` on the label column)
- Labels: `var(--font-mono)`, 11px, `letter-spacing: 0.16em`, lowercase, `color: var(--color-fg-dim)`
- Values: `var(--font-mono)`, 13px, regular case, `color: var(--color-fg)`
- Row gap: ~7px

### Relative-time formatting

Use the existing `relativeTime(iso, nowMs?)` helper at `src/lib/relative-time.ts`. Same helper that the cards use — output stays consistent (`just now` / `5m` / `3h` / `3d` / `2w` / `Feb 12` / `Dec 1 2024`).

### Empty / first-run states

- No posts yet → `last post` value renders as `—` (em dash), `posts` renders as `0`
- No blogs yet → same handling

## Block 2 — `/// elsewhere`

### Purpose

Plug-in points: where else the operator exists on the public web. Hand-curated list, very low maintenance (these URLs change ~once a year at most).

### Grid

2 rows × 3 columns, square cells, collapsed borders so internal lines read as a control-panel grid rather than separated tiles. Each cell is a single `<a>` containing icon (top, larger) + label (below, mono).

### Cells

| cell | icon | href |
|---|---|---|
| bsky | `BskyIcon` (existing custom SVG) | `https://bsky.app/profile/proto.cool` |
| gh | Phosphor `GithubLogo` | `https://github.com/proto-cool` |
| atp | text glyph `at://` in Lunema italic (`var(--font-display)`) | `https://atproto-browser.vercel.app/at/proto.cool` |
| rss | Phosphor `RssSimple` | `/feed.xml` |
| mail | Phosphor `EnvelopeSimple` | `mailto:nduncan@fastmail.com` |
| steam | Phosphor `SteamLogo` | `https://steamcommunity.com/id/Protocol7/` |

### Sizing & treatment

- Cell internal padding: ~14px 8px
- Icon: 24px, color `var(--color-fg-dim)`
- Label: 11px mono, `letter-spacing: 0.16em`, lowercase, `color: var(--color-fg-dim)`
- Cell borders: 1px `var(--color-edge)`, collapsed (use `display: grid` with negative margins or `border` on each cell — pick whichever lints clean; visually the inner lines should read as 1px, not 2px)
- Hover: icon → `var(--color-warm)`, label → `var(--color-fg)`. Subtle 100ms transition.
- Focus: visible outline using `var(--color-cool)` to match the keyboard-focus vocabulary used elsewhere in the chrome.
- External links use `target="_blank" rel="noopener noreferrer"`. Mail and `/feed.xml` do not.

### `at://` glyph treatment

The atp cell renders `at://` as an italic display-font text glyph rather than a Phosphor icon. Sized to occupy the same vertical footprint as the 24px icons in adjacent cells (so the row reads visually balanced):

```
font-family: var(--font-display);
font-style: italic;
font-size: ~22px;
line-height: 1;
color: var(--color-fg-dim); /* same hover treatment as the icons */
```

This mirrors how `StatsPanel` already uses display italic for the `⟨ … ⟩` brackets and `build-hex` accent — established vocabulary, no new dependencies.

## Server changes

### `getPulseStats(db: DB): PulseStats`

New export in `src/lib/server/pulse.ts` (kept separate from `feed.ts`, which is already long).

```ts
export type PulseStats = {
  lastPost: string | null;   // ISO 8601 of newest non-blog owned record
  lastBlog: string | null;   // ISO 8601 of newest blog owned record
  posts: number;
  blogs: number;
};
```

Implementation: two `MAX(created_at)` queries + two `COUNT(*)` queries against the records table, scoped to `kind='owned' AND status='ok'`, with the blog/non-blog split keyed off `collection IN (...blog collections...)`. Reuse `collectionsForSource('standard')` to compose the IN clause so the split stays in sync with the rest of the feed.

### Loader change

`src/routes/+page.server.ts` calls `getPulseStats(db)` once and exposes it as `pulse` on the loader payload. Tiny query — single-digit ms.

### `/feed.xml` route

A new SvelteKit `+server.ts` at `src/routes/feed.xml/+server.ts` (or similar) that returns an RSS 2.0 document of the latest N (say, 30) `kind='owned'` records. Item titles map per kind: blogs use the doc title, microposts/reposts use a truncated body. Out-of-scope to deep-design here — separate plan task. Acceptable v1: 20 items, 64-char title fallback, no enclosures (skip embedded image MIME juggling for now).

## Theme store integration

The active theme name is already exposed via `ThemeControls` and the existing theme registry (`src/lib/theme/registry.ts`). The pulse component subscribes to whatever store/context is currently used by `ThemeControls` — same source of truth, no new global. If that source isn't a store today (might be plain context), reading the active theme on each render after hydration is acceptable (the value changes only on user action).

## File-level changes

- **rewrite** `src/lib/feed/Sidebar.svelte` — replace the existing `/// now` (placeholder prose) + `/// links` (text list) blocks with the new `/// pulse` + `/// elsewhere` blocks
- **edit** `src/routes/+page.server.ts` — call `getPulseStats`, pass through
- **edit** `src/routes/+page.svelte` — pass `pulse` prop to `<Sidebar>`
- **add** `src/lib/server/pulse.ts` — `getPulseStats` + `PulseStats` type (separate file rather than appending to `feed.ts`, which is already large)
- **add** `src/routes/feed.xml/+server.ts` — RSS feed endpoint

## Testing

- Unit test `getPulseStats` against a seeded test DB: zero posts, only posts, only blogs, both, ensure counts and timestamps are correct.
- Unit test `/feed.xml` returns valid XML with the expected items.
- Manual: pulse renders correctly on first visit; theme value updates when flipping themes via `ThemeControls`; elsewhere icons hover/focus correctly; tab order is sensible.

## Accessibility

- `<aside aria-label="sidebar">` stays.
- Pulse rows are a `<dl>` with `<dt>` labels and `<dd>` values for screen-reader semantics.
- Elsewhere cells have visible labels (no icon-only mystery meat). Each `<a>` has the destination implicit from its visible text; no extra `aria-label` needed.
- Focus ring is visible (Phosphor-shell keyboard focus vocabulary already established).

## Open questions

None — all locked during brainstorm.

## Resume / handoff notes

When implementing:
1. Server-side first: write `getPulseStats`, wire it into the loader, sanity-check the values.
2. `/feed.xml` next — small but independent.
3. Sidebar component last — pure UI work once data is in hand.
4. Smoke-test all three themes (halogen, frost, mono, sodium, outrun) for the icon-grid hover/focus colors.
