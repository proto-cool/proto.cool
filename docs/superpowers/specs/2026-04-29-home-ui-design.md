# Home UI Design Spec

**Date:** 2026-04-29
**Branch:** `feat/move-to-atproto`
**Scope:** Home/feed page (`/`) + blog permalink reading view (`/blog/[...path]`). Projects and About are out of scope (separate brainstorms).

---

## 1 · Goal

Render proto.cool's atproto records — bsky microposts, bsky reposts, and `site.standard.document` longform pieces — as a unified feed inside the existing phosphor shell. Provide a first-party reading view for longform docs. Click-through behavior leans on the original platform for bsky content (no internal post permalinks); only longform gets a hosted reading view because it's first-party content the site exists to showcase.

---

## 2 · Architecture

### 2.1 Source / collection wiring

Update `src/lib/server/config.ts`:

```ts
export type Source = 'bsky' | 'standard' | 'grain';  // dropped 'pckt'

const COLLECTIONS_BY_SOURCE: Record<Source, readonly string[]> = {
  bsky: ['app.bsky.feed.post', 'app.bsky.feed.repost'],
  standard: ['site.standard.document'],
  grain: []
};
```

`pckt` is not a separate source — it's an editor that emits records under the `site.standard.document` lexicon. Drop it from the type and the map.

`WATCHED_COLLECTIONS` automatically picks up `site.standard.document`; the firehose handler routes by collection so no handler changes are needed beyond optional special-casing for cover blobs.

### 2.2 New tables (migration `002_profiles.sql`)

```sql
CREATE TABLE IF NOT EXISTS profiles (
  did TEXT PRIMARY KEY,
  handle TEXT NOT NULL,
  display_name TEXT,
  fetched_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS profiles_handle_idx ON profiles(handle);
```

DID → `{handle, displayName}` only. No avatars (intentional — avoids blob proxying / image caching cost). Lazy-fetched via `app.bsky.actor.getProfile` when a record references a DID we haven't cached. TTL: 7 days; older rows refresh on next reference.

### 2.3 New adapter

`src/lib/server/adapters/standard.ts` — `createStandardAdapter()`:

- `source: 'standard'`
- `fetchEngagement(uris)` — for each doc URI, look up the doc record, extract `bskyPostRef.uri` if present. Batch the resolved bsky URIs through the bsky AppView, return engagement rows **keyed by the doc URI** (not the bsky URI). Docs without `bskyPostRef` are filtered out before the AppView batch and return as part of `found: []` with no entry — they're a no-op success, NOT `notFound` (the scheduler treats `notFound` as a delete signal for external rows, which we must not trigger for our own owned docs).
- `fetchRecords` — no-op. Standard docs are owned-only; the firehose populates them and they don't need AppView enrichment.

Adapter registry in `bootstrap.ts` updated to:

```ts
const adapters: AdapterRegistry = {
  bsky: createBskyAdapter(...),
  standard: createStandardAdapter(...),
  grain: createGrainAdapter()
};
```

`AdapterRegistry` type updated to include `standard`.

### 2.4 Profile resolver

New `src/lib/server/profiles.ts`:

```ts
export async function resolveProfile(db, client, did): Promise<Profile | null>;
export function getCachedProfile(db, did): Profile | null;  // sync, no fetch
```

`resolveProfile` checks the cache; if miss or stale (>7d), fetches via `app.bsky.actor.getProfile`, upserts, returns. Pure read-through cache. Failures cache a tombstone (NULL handle) for 1h to avoid hammering on bad DIDs.

The feed loader hydrates handles for repost subjects synchronously from the cache. For DIDs with no cache entry, kick off `void resolveProfile(db, client, did)` (no await — the SvelteKit load returns immediately) and render a fallback `@<did-prefix>…` placeholder for this request. The next page load (or refresh) will pick up the resolved handle. This avoids slowing the first render on a cold cache.

### 2.5 Routes

| Route | Purpose | Notes |
|---|---|---|
| `/` | Feed (existing) | Swap UI to render Featured + Stream |
| `/blog/[...path]` | Blog permalink | New. `[...path]` matches the doc's `path` field (leading slash stripped) |
| `/projects` | Placeholder | Out of scope |
| `/about` | Static | Unchanged |

---

## 3 · Feed page (`/`)

### 3.1 Composition

Vertical stack inside the existing `.hero` container:

1. `<HeroSection>` — unchanged ("a digital digest" intro)
2. `<FeaturedBlock>` — conditional, renders the pinned/latest cover-bearing doc (see §4)
3. `<Stream>` — chronological cards, paginated (see §3.3)
4. `<Pagination>` — numbered pages at bottom (decision 1C from brainstorm)

### 3.2 Server load

`src/routes/+page.server.ts`:

```ts
export const load: PageServerLoad = async ({ url }) => {
  const db = getDb();
  const page = parsePage(url.searchParams.get('page'));  // default 1, min 1
  const limit = 20;

  const featured = getFeatured(db);  // see §4.2
  const stream = getFeed(db, {
    page,
    limit,
    exclude: featured ? [featured.uri] : []
  });

  return { featured, stream, page };
};
```

Both queries run synchronously against SQLite; no Promise.all needed (better-sqlite3 is sync).

### 3.3 Pagination

Numbered pages, `?page=N` URL param. Page size = 20.

- Convert `page` → SQL offset (`(page - 1) * limit`)
- Total count returned alongside items so the page bar can render `1 · 2 · 3 · … · N`
- Page bar: prev arrow, current ± 2 neighbors, ellipsis, last, next arrow. Mono font, `--color-fg-dim`, current page in `--color-fg`. Sticky to bottom of stream, no fancy chrome
- `getFeed` extended to accept `{page?, limit?, exclude?}`. `cursor` param remains (used by future infinite-scroll if we ever change our minds)

### 3.4 Feed query extensions

`buildFeedQuery` (already exists) gains:
- `tag: string` — filter where `tags` array contains the value (`EXISTS (SELECT 1 FROM json_each(r.value, '$.tags') WHERE value = ?)`)
- `requireCover: boolean` — filter where `json_extract(r.value, '$.coverImage') IS NOT NULL`
- `exclude: readonly string[]` — `r.uri NOT IN (?, ?, ...)`. Skip the clause when the array is empty.
- `page` + `limit` — offset-based pagination, returns `{items, total, page, totalPages}`. Requires a second `SELECT COUNT(*)` query with the same WHERE clause; both queries built from a shared clause-builder helper so they stay in sync.

### 3.5 Empty state

Single dim line — `nothing here yet.` in `--color-fg-dim`, mono, centered in the stream area, no decoration.

---

## 4 · Featured block

### 4.1 Selection logic

```ts
function getFeatured(db: DB): FeedItem | null {
  // 1. latest standard doc tagged "Pinned" with a coverImage
  const pinned = getFeed(db, {
    sources: ['standard'],
    tag: 'Pinned',
    requireCover: true,
    limit: 1
  }).items[0];
  if (pinned) return pinned;

  // 2. latest standard doc with a coverImage
  return getFeed(db, {
    sources: ['standard'],
    requireCover: true,
    limit: 1
  }).items[0] ?? null;
}
```

**Pin tag:** `"Pinned"` (capital P) per pckt's convention. Keep this as a constant in `feed.ts` so it's a one-line change if pckt changes.

### 4.2 Layout

Single bordered container (`--shell-veil` bg, `--color-edge` border, no rounded corners). Top-down:

- **Kicker strip** — `/// featured · entry` mono label (left), month label `apr·2026` (right), `--color-fg-dim`, separated from cover by `--color-edge` rule
- **Cover image** — 16:7 aspect (deliberately less cinematic than the blog permalink's 21:9 hero so the two surfaces feel distinct), full container width, cover-crop, no rounded corners. Resolved via PDS blob URL: `https://<pds-host>/xrpc/com.atproto.sync.getBlob?did=<owner-did>&cid=<cid>`
- **Body** (~24px padding):
  - Title — italic Newsreader, ~28–32px, `--color-fg`, leading -0.015em
  - Excerpt — `description` field, sans, ~14px, `--color-fg-dim`, no truncation (let it run)
  - `read entry →` CTA — `--color-warm`, mono, uppercase, hover underline

**Click target:** entire block → `/blog/[...path]` derived from the doc's `path` field

**Hide:** when no doc with `coverImage` exists

**No engagement strip, no read-time chip, no tag chips on featured.**

---

## 5 · Card

Container vocabulary shared by all card types: `--shell-veil` background, 1px `--color-edge` border, no rounded corners, no shadow, ~18-20px padding, ~18px gap between cards in the stream.

A single dispatcher component `src/lib/feed/Card.svelte` takes a `FeedItem` and selects the variant based on `collection`:
- `app.bsky.feed.post` → micropost (5.1)
- `app.bsky.feed.repost` → repost (5.2)
- `site.standard.document` → blog (5.3)
- unknown collection → render a small dim placeholder `[unsupported: <collection>]` so future NSIDs added to `WATCHED_COLLECTIONS` don't break the render

### 5.1 Micropost (owned, `app.bsky.feed.post` with no subject)

- **Header row** — relative time (`2h`) on left, right slot empty
- **Header rule** — thin `--color-edge`
- **Body** — `value.text` rendered with bsky facets (link/mention spans, no markdown). Sans font, `--color-fg`. Replies excluded by default (`includeReplies:false` in feed filter)
- **Optional embed** — see §5.4
- **Footer rule + engagement** — `↪ N · ↻ N · ❤ N`, dim icons + bright counts. Hidden entirely (no rule, no strip) if all three counts are 0
- **Click target:** entire card → `https://bsky.app/profile/<handle>/post/<rkey>` in new tab. `<handle>` = operator handle from chrome data; `<rkey>` = parsed from URI

### 5.2 Repost (owned, `app.bsky.feed.repost`)

- **Header row** — `↻ reposted · 2h` in `--color-cool` on left; `REPOST` tag in `--color-cool` on right
- **Header rule**
- **Author meta line** — `@<resolved-handle> · <relativeTime>` in mono. Handle pulled from `profiles` cache (lazy-fetched async). If subject record was deleted/blocked or handle cache missing on first render: show `[unavailable]` and skip body+embed+engagement (the entire subject is an external row marked deleted)
- **Body** of the subject post (rendered same as 5.1 body)
- **Optional embed** from the subject
- **Footer rule + engagement** of the *subject* post (not the repost record). Counts come from `engagement` table joined on `subject_uri`. Hidden entirely if all three counts are 0 (matches §5.1)
- **Click target:** entire card → `https://bsky.app/profile/<original-handle>/post/<rkey>` in new tab (link to the *original*, not the repost)

### 5.3 Blog (owned, `site.standard.document`)

- **Header row** — relative time on left, `BLOG` tag in `--color-warm` on right
- **Header rule**
- **Title** — italic Newsreader, ~20px in card density, `--color-fg`, leading-tight
- **Excerpt** — `description` field truncated to ~3 lines with ellipsis, `--color-fg-dim`. Falls back to first 200 chars of `textContent` if `description` is missing
- **Tag chips** — mono row, each chip is `--color-edge` border + `--color-fg-dim` text, no fill, ~10px, padding `2px 6px`. Up to 5; `+N` overflow chip. Drop `Pinned` from the visible tag list (it's structural, not categorical)
- **`read entry →` CTA** — `--color-warm`
- **Click target:** entire card → `/blog/[...path]` (internal)
- **No embed in card form** — cover image is reserved for featured; in-stream blog cards stay text-only and compact

### 5.4 Embeds

**Smart image grid** (`app.bsky.embed.images`, plus `blog.pckt.block.image` in body context — see §6):

- 1 image: full slot, fixed aspect 16:9, cover-crop
- 2: side-by-side equal widths, each 1:1
- 3: hero on top (16:9), 2 stacked below (1:1 each)
- 4: hero on top (16:9), 3 across below (1:1 each)
- All slots cover-crop. Hero gets the largest by file size (or first image in array if file size unavailable)
- ALT chip in bottom-right when alt text present (mono, ~9px, `--color-fg` on `--shell-veil-strong` bg, `--color-edge` border). Click reveals alt text inline
- Click any slot → **lightbox** at full-resolution image. Lightbox supports keyboard arrows / swipe to navigate within the post, ESC to close, alt text shown at bottom
- bsky caps multi-image posts at 4; pattern terminates naturally

**External link card** (`app.bsky.embed.external`):
- Horizontal grid: 140px square thumb (left, cover-crop) + body (right). Stacks vertical at `<container 480px`
- Body: `domain` line in `--color-cool` mono uppercase, `title` in sans `--color-fg`, `description` in dim
- Whole card is the link target

**Video** (`app.bsky.embed.video`):
- Thumbnail at intrinsic aspect or 16:9 fallback, cover-crop
- Centered ▶ glyph in a `--color-fg` border, semi-transparent fill
- Duration chip bottom-right (mono, `0:42` style)
- Click → opens original on bsky.app (no inline HLS player in v1; this is a deliberate defer)

**Quote post** (`app.bsky.embed.record`):
- Nested box inside parent body, ~12px padding, container vocabulary inherited
- Header row → author meta line → body → engagement (smaller scale)
- Click bubbles up — clicking the nested quote opens the *quoted* post on bsky, not the parent

**Record-with-media** (`app.bsky.embed.recordWithMedia`):
- Render as quoted post first, then media using §5.4 grid rules

---

## 6 · Blog permalink (`/blog/[...path]`)

### 6.1 Resolution

`src/routes/blog/[...path]/+page.server.ts`:

```ts
export const load: PageServerLoad = async ({ params }) => {
  const db = getDb();
  const path = '/' + params.path;
  const row = db.prepare(`
    SELECT * FROM records
    WHERE collection = 'site.standard.document'
      AND status = 'ok'
      AND json_extract(value, '$.path') = ?
    LIMIT 1
  `).get(path);
  if (!row) throw error(404, 'doc not found');
  return { doc: hydrateDoc(row), engagement: getDocEngagement(db, row.uri) };
};
```

`getDocEngagement(uri)` looks up the engagement row keyed by doc URI (populated by the standard adapter resolving `bskyPostRef`). Returns `null` if no `bskyPostRef`.

### 6.2 Layout

Vertical column, max-width capped at the existing `.hero` container width (~1024px on desktop). Single column, no sidebar. Top-down:

1. **Breadcrumb** — `← content / blog · <slug>` mono, `--color-fg-dim`. Back link → `/`
2. **Cover image** — 21:9 hero, full content width, cover-crop. Hidden if no `coverImage`
3. **Meta strip** — `/// blog · entry` kicker (`--color-warm`) · publish date (`2026·04·29`). Single mono line
4. **Title** — italic Newsreader, ~44px, leading -0.015em
5. **Deck** — `description` field in serif or sans paragraph, `--color-fg-dim`, max-width 60ch
6. **Body** — pckt block renderer (§6.3), max-width **64ch**
7. **Tag chips** — small mono row at the bottom of the body. `Pinned` filtered out. Same chip style as §5.3
8. **bsky discussion block** — when `bskyPostRef` is present:
   - Header `/// discuss · bsky` mono, `--color-cool`
   - Engagement strip with labels: `↪ N replies · ↻ N reposts · ❤ N likes`
   - `view & reply on bsky →` CTA → `bsky.app/profile/<handle>/post/<rkey>` (handle/rkey parsed from `bskyPostRef.uri`)
   - Hidden entirely when `bskyPostRef` is absent
9. **Footer rule + back link** — `← back to content` mono

### 6.3 Block renderer (`src/lib/blog/blocks/`)

The `content` field is an open union of typed block records. Renderer maps `$type` → component:

| `$type` | Component | Notes |
|---|---|---|
| `blog.pckt.block.text` | `<TextBlock>` | `<p>` with facet-aware spans (see §6.4) |
| `blog.pckt.block.heading` | `<Heading>` | `<h{level}>` (1–6); h1–h3 use Newsreader italic, h4–h6 sans bold |
| `blog.pckt.block.image` | `<ImageBlock>` | `<img>` with `aspectRatio` for layout-pre-load. `alt`, `title` (caption), `align` (left/center/right) honored. Resolved blob URL via PDS. Same lightbox as feed images |
| `blog.pckt.block.blockquote` | `<Blockquote>` | `<blockquote>` with thin left rule (this is a paragraph-internal convention, not a card-level edge stripe — semantically OK) |
| `blog.pckt.block.codeBlock` | `<CodeBlock>` | `<pre><code>` mono, `--shell-veil` bg, `--color-edge` border, no syntax highlighting in v1 (defer) |
| `blog.pckt.block.bulletList` | `<BulletList>` | `<ul>` with custom mono markers |
| `blog.pckt.block.orderedList` | `<OrderedList>` | `<ol>` with custom mono markers |
| `blog.pckt.block.listItem` | `<ListItem>` | `<li>` |
| `blog.pckt.block.horizontalRule` | `<HRule>` | Thin gradient rule with mono `* * *` glyph centered |
| `blog.pckt.block.hardBreak` | `<HardBreak>` | `<br>` |

**Hybrid storage:** if `record.content.blob` is present (>20KB body), fetch the blob from the operator's PDS, parse JSON, render `items` array. Server-side fetch in the load function, cached for the lifetime of the request. No client-side fetching.

Unknown `$type` values render as a small dim placeholder `[unsupported block: <type>]` so future block types added to the lexicon don't break the render.

### 6.4 Facet rendering

`blog.pckt.richtext.facet` features map to inline elements:

| Feature | Element |
|---|---|
| `bold` | `<strong>` |
| `italic` | `<em>` |
| `underline` | `<u>` |
| `strikethrough` | `<s>` |
| `code` | `<code>` |
| `highlight` | `<mark>` |
| `link` | `<a href={uri}>` |
| `atMention` | `<a href={resolveAt(atURI)}>` (resolves to `/blog/...` if internal, or external) |
| `didMention` | `<span class="mention">` (resolves to `@handle` from profiles cache) |
| `id` | `<a id={id}>` (anchor target) |

Facets apply to byte ranges; renderer slices the plaintext into spans by overlapping facet boundaries.

### 6.5 SEO

Open Graph + Twitter card meta:
- `<title>` = doc title
- `og:title`, `og:description` (doc description), `og:image` (cover blob URL or fallback static), `og:type=article`, `article:published_time`
- Twitter: `summary_large_image` shape

### 6.6 404

`/blog/<unknown>` → simple 404 page: `← content / 404` breadcrumb, `doc not found` heading, link back to `/`. No fancy treatment.

---

## 7 · Helpers and shared utilities

### 7.1 Relative time (`src/lib/shell/relative-time.ts`)

```ts
export function relativeTime(iso: string, nowMs?: number): string;
// "2h", "3d", "Apr 12" (>1 month), "Apr 12 2025" (>1 year)
```

Pure, easy to test. Used by all card headers.

### 7.2 PDS blob URL builder (`src/lib/blob.ts`)

```ts
export function blobUrl(did: string, cid: string): string;
// → https://<pds-host>/xrpc/com.atproto.sync.getBlob?did=<did>&cid=<cid>
```

For external (non-owned) blobs, resolves to `cdn.bsky.app` instead. Decision made by inspecting which DID owns the blob (operator → PDS, anyone else → bsky CDN).

### 7.3 Lightbox component (`src/lib/shell/Lightbox.svelte`)

Single shared component used by feed cards and blog body images. Props: `images: {src, alt, aspectRatio?}[]`, `index: number`, `onClose: ()=>void`. Renders fullscreen overlay, supports keyboard arrows, swipe gestures (touch-action), ESC, click outside to close. Alt text shown at bottom.

---

## 8 · Empty / loading / error states

| Surface | State | Treatment |
|---|---|---|
| Feed empty | No items match | `nothing here yet.` dim mono, centered |
| Feed loading | N/A | Server-rendered, no client loading state needed |
| Feed pagination beyond range | `?page=999` | Render empty stream + page bar showing the requested page disabled; do not redirect |
| Featured missing | No cover-bearing doc | Hide the featured block entirely |
| Blog 404 | Path doesn't match | 404 page (§6.6) |
| Blog body fetch fails | `content.blob` fetch errors | Render whatever inline content is present + small dim notice `[some content failed to load]` |
| Profile fetch fails | DID resolution returns 404 | Cache a tombstone; render `@<truncated-did>` as fallback |
| Image blob fails | `<img>` errors | `--color-edge` border + dim "image unavailable" text in the slot |

No global "loading spinner" anywhere — SSR makes it unnecessary.

---

## 9 · Out of scope (v1 deferrals)

- Internal post permalinks for bsky records
- `/blog/` index page
- Source/kind filters (server already supports `?source=`; UI deferred)
- Inline HLS video player
- Code syntax highlighting in blog body
- Tag-filtered index pages
- Comments / reactions UI (bsky discussion link is the escape hatch)
- Read-time chip
- Avatars in feed cards (intentional — text-only profile cache)
- Engagement counts on feed-form blog cards (only on permalink)

---

## 10 · Open implementation questions

1. **`Pinned` tag value** — confirmed as `"Pinned"` (capital P) per pckt convention. Constant in `feed.ts` so a different convention is a one-line change.
2. **Profile fetch backfill** — should bootstrap pre-warm the profiles cache for all currently-known external DIDs? Probably not in v1 — lazy is fine, the first render after a fresh boot may show truncated DIDs for ~1s.
3. **Pagination cursor vs offset** — spec uses offset for simplicity. If the feed gets large enough to warrant cursor pagination, the existing cursor codec is ready. Defer the decision until volume warrants.
4. **Blog body max-width** — spec says 64ch. If Newsreader at the target size produces a different optical width, may tune to 60-66ch during implementation. Not a spec change.
