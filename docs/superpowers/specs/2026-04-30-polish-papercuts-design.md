# Polish Papercuts — Design

Date: 2026-04-30
Scope: Bucket 1 + Bucket 2 of the polish/UX papercut audit. Mobile/touch concerns and content gaps (`/about`, `/projects`) are explicitly out of scope.

## Goal

Ship a consistent baseline of focus, hover, error, and loading affordances across the feed and shell, plus a few targeted content/semantic fixes that don't require new visual vocabulary.

## What's in / what's out

In:
- Focus-ring coverage on every interactive element, using the existing tone split.
- Inline error state for feed fetch failures.
- Visible loading affordance for filter/sort transitions.
- Reactive relative-time + `<time>` semantic + absolute tooltip.
- Engagement strip de-emphasis (smaller / dimmer).
- Clickable handles in cards.
- Server-provided image dimensions for `ImageGrid` to eliminate layout shift.
- Blog cover image — drop forced 21:9 crop.

Out (deferred):
- Mobile/touch pass — hit targets, NavPanel narrow widths, lightbox crowding.
- Building out `/about` and `/projects` (content task, not polish).
- Skip-link, semantic helpovr, deeper a11y rework — opportunistic only.

## Design decisions

### 1. Focus rings — tone-coded by group

Existing pattern stays:
- `--color-warm` (the default) — primary interactive surfaces: `LoadMore`, `FeedToolbar`, `AutoLoadToggle`, `ThemeControls`.
- `--color-cool` — sidebar `.cell` and elsewhere grid.
- `--color-hot` — HUD-tier (`.hud-btn`).

Style: `outline: 2px solid <token>; outline-offset: 2px;` (matches existing rules). Use `outline-offset: -2px` only where the element clips its own outline (e.g. Sidebar `.cell` already does this).

Add `:focus-visible` rules to:
- `Lightbox` close + nav buttons — warm.
- Blog page `.breadcrumb a`, `.discuss-cta`, `.back a` — warm.
- `FacetText` `<a>` (links + mentions) — warm.
- `LinkCard` `<a>` — warm.
- `ImageGrid` `.slot` button — warm.

`MicropostCard` and `RepostCard` are resolved by decision 6 instead — the card itself stays a non-interactive landmark, and the handle / embedded media / `BskyLink` inside it carry the focus.

### 2. Error state — inline

When a feed fetch fails, render a single mono line in place of (or appended to) the feed area:

```
couldn't load · retry →
```

Treatment: same vocabulary as `— end of feed —` in `LoadMore.svelte` — `font-mono`, small, uppercase, letterspaced, dim color. The `retry →` is a button that re-runs the failed call.

Wiring:
- `+page.svelte` keeps a new `error: string | null` state.
- `applyQuery` / `loadMore` set it on `null` return; clear it on success.
- A new `<FeedError {message} onretry={...} />` component renders below `entries-wrap` (and replaces it when `items.length === 0 && error`).

No toasts. No overlays.

### 3. Loading affordance

Existing `entries-wrap.loading { opacity: 0.55 }` stays. Add a small "loading…" mono caption to the right of `FeedToolbar` (inside `.filter-row`, sharing space with `AutoLoadToggle`) that's visible only while a filter/sort fetch is in flight. One line, dim, no spinner. `LoadMore` already has its own "loading…" state and is unchanged.

### 4. Reactive time + semantic markup

- New `<RelativeTime datetime={iso} />` component that wraps `<time>` with `datetime={iso}`, `title={absoluteFormatted}` (e.g. `2026-04-12 14:32 UTC`), and renders `relativeTime(iso)` reactively against the existing `now` store from `src/lib/shell/runtime.ts`.
- Replace inline `relativeTime(...)` calls in `MicropostCard`, `RepostCard`, `BlogCard`, `QuotePostCard`, `Sidebar` (pulse), and feed cards in general with `<RelativeTime>`.

### 5. Engagement strip de-emphasis

In `EngagementStrip.svelte`:
- Phosphor icon `size` 18 → 14.
- Active-row color: `--color-fg` → `--color-fg-dim`.
- Zero-row color: `--color-fg-mute` (already there).
- Gap: 22px → 18px (proportional).
- Border-top + padding-top stay as visual separator from card body.

The trailing snippet (BskyLink) is unchanged — that one *is* interactive.

### 6. Clickable handles

In `MicropostCard.svelte`, `RepostCard.svelte`, `QuotePostCard.svelte`:
- `@{handle}` becomes an `<a>` to `https://bsky.app/profile/${did}`. DID-based (matches the existing pattern). `target="_blank" rel="noopener noreferrer"` and `onclick={(e) => e.stopPropagation()}` (defensive in case the card itself becomes clickable later).
- Style: same `--color-fg` color, `text-decoration: underline` on hover only (no permanent underline — feels lighter), `--color-warm` on hover. `:focus-visible` warm ring.

This resolves the focus-coverage question for cards (#7 in the punch list): the card itself stays a non-interactive landmark; the handle, embedded media, link cards, and BskyLink are the focusable units within it. `BlogCard`'s anchor wrapper is a different shape (the whole card *is* the link); leave it as-is.

### 7. Image dimensions from bsky lexicon

bsky `app.bsky.embed.images#image` carries an optional `aspectRatio: { width, height }`. The record already arrives on the client with this field populated where the original poster's client set it. The work is purely on the client-side `mediaEmbed` derivation in `MicropostCard` (and the equivalent path inside `RepostCard` for quoted-post embeds):
- `mediaEmbed` adds `aspect?: number` (computed `width / height`) per image.
- `ImageGrid` accepts the new `aspect` field on `GridImage` and uses it to set the slot's `aspect-ratio` and width immediately on first render — no JS-on-load needed for those images.
- Existing `onImgLoad` measurement stays as a fallback for embeds without `aspectRatio`.

### 8. Blog cover image

In `src/routes/blog/[...path]/+page.svelte`:
- Drop `aspect-ratio: 21 / 9` and `object-fit: cover` from `.hero` / `.hero img`.
- Use `width: 100%; height: auto; max-height: 60vh; object-fit: contain;`.
- Drop the explicit border. Keep the surrounding `<div class="hero">` for spacing.

Portrait covers display at natural ratio with a sensible cap; landscape covers fill column width.

## Components / files touched

New:
- `src/lib/feed/FeedError.svelte`
- `src/lib/feed/RelativeTime.svelte`

Edited:
- `src/lib/feed/Lightbox.svelte` — focus rings
- `src/lib/feed/FacetText.svelte` — focus, hover/focus consistency
- `src/lib/feed/LinkCard.svelte` — focus, hover
- `src/lib/feed/ImageGrid.svelte` — accept `aspect` per image, focus on slot, prefer server aspect
- `src/lib/feed/EngagementStrip.svelte` — de-emphasis
- `src/lib/feed/MicropostCard.svelte` — handle link, RelativeTime, pass aspect through
- `src/lib/feed/RepostCard.svelte` — handle link, RelativeTime, pass aspect through
- `src/lib/feed/QuotePostCard.svelte` — handle link, RelativeTime
- `src/lib/feed/BlogCard.svelte` — RelativeTime
- `src/lib/feed/Sidebar.svelte` — RelativeTime for pulse
- `src/routes/+page.svelte` — error state wiring + loading caption
- `src/routes/blog/[...path]/+page.svelte` — focus rings on links, cover image rules

## Testing

Visual / manual:
- Tab through home, blog, lightbox — every interactive element shows a tone-correct focus ring, no browser-default yellow.
- Force a `/api/feed` 500 in DevTools Network — inline error appears, `retry →` re-fires the request.
- Throttle network to Slow 3G — switching source/sort shows "loading…" caption.
- Open a feed post in a fresh tab; leave for ~90s — relative time updates without reload.
- Hover any time element — native tooltip with absolute timestamp.
- Click a handle — opens bsky profile in new tab.
- A post with `aspectRatio` set: image slot reserves the right size on first paint (no shift). A post without: previous JS-on-load behavior.
- Blog post with portrait cover: cover renders at natural aspect, capped at 60vh.

No new unit tests required — these are visual/integration concerns. If `RelativeTime` ends up with non-trivial logic (clamping, locale rules), a small test there.

## Out-of-scope reminders

- Mobile pass owns: hit-target sizing, NavPanel narrow-width behavior, lightbox crowding.
- Content task owns: `/about` and `/projects`.
- Animation pass owns: any motion treatment for state transitions; this spec uses instant changes.
