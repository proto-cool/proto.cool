# Polish Papercuts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land Bucket 1 + 2 of the polish/UX papercut audit — consistent focus rings, inline error/loading states, reactive time, engagement de-emphasis, clickable handles, server-provided image aspect, and fixed blog cover crop.

**Architecture:** Two new Svelte components (`RelativeTime`, `FeedError`); the existing `now` writable in `src/lib/shell/runtime.ts` is exported so reactive time has a single tick source; per-component CSS additions for focus / hover / engagement; `aspect` field added to `ImageGrid`'s `GridImage` type and threaded from the bsky `embed.images[].aspectRatio` lexicon field via the existing client-side `mediaEmbed` derivation.

**Tech Stack:** SvelteKit (Svelte 5 runes), TypeScript, plain CSS, `svelte/store`, phosphor-svelte icons.

**Spec:** `docs/superpowers/specs/2026-04-30-polish-papercuts-design.md`

---

## File map

New:
- `src/lib/feed/RelativeTime.svelte`
- `src/lib/feed/FeedError.svelte`

Modified:
- `src/lib/shell/runtime.ts` — export `now` so `RelativeTime` can subscribe
- `src/lib/feed/MicropostCard.svelte`
- `src/lib/feed/RepostCard.svelte`
- `src/lib/feed/QuotePostCard.svelte`
- `src/lib/feed/BlogCard.svelte`
- `src/lib/feed/Sidebar.svelte`
- `src/lib/feed/EngagementStrip.svelte`
- `src/lib/feed/Lightbox.svelte`
- `src/lib/feed/FacetText.svelte`
- `src/lib/feed/LinkCard.svelte`
- `src/lib/feed/ImageGrid.svelte`
- `src/routes/+page.svelte`
- `src/routes/blog/[...path]/+page.svelte`

---

### Task 1: Export `now` from runtime so reactive time has a single tick source

**Files:**
- Modify: `src/lib/shell/runtime.ts`

- [ ] **Step 1: Modify `src/lib/shell/runtime.ts` to export `now`**

Find the existing line:

```ts
const now = writable(new Date());
```

Change to:

```ts
export const now = writable(new Date());
```

Leave everything else in the file unchanged. The existing `derived(now, ...)` calls in the same file continue to work.

- [ ] **Step 2: Verify nothing broke**

Run: `pnpm exec tsc --noEmit` (or `pnpm check` if that script exists — see `package.json scripts`)
Expected: type-check passes with no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/shell/runtime.ts
git commit -m "runtime: export \`now\` for reactive time consumers"
```

---

### Task 2: Create `RelativeTime` component

**Files:**
- Create: `src/lib/feed/RelativeTime.svelte`

- [ ] **Step 1: Create `src/lib/feed/RelativeTime.svelte`**

```svelte
<script lang="ts">
	import { now } from '$lib/shell/runtime';
	import { relativeTime } from '$lib/relative-time';

	let { datetime, class: cls = '' }: { datetime: string; class?: string } = $props();

	// Subscribe to the global `now` writable so the displayed value
	// updates as the clock ticks (every 1s — see runtime.ts).
	let label = $derived(relativeTime(datetime, $now.getTime()));

	// Format the absolute timestamp as "YYYY-MM-DD HH:MM UTC" for the
	// native `title` tooltip. Computed once per `datetime` prop change
	// (no need to re-run on every clock tick).
	let absolute = $derived.by(() => {
		const d = new Date(datetime);
		const pad = (n: number) => String(n).padStart(2, '0');
		return (
			`${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
			`${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`
		);
	});
</script>

<time class={cls} {datetime} title={absolute}>{label}</time>
```

- [ ] **Step 2: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/lib/feed/RelativeTime.svelte
git commit -m "feed: add RelativeTime — reactive <time> with absolute tooltip"
```

---

### Task 3: Replace inline `relativeTime(...)` calls with `<RelativeTime>`

**Files:**
- Modify: `src/lib/feed/MicropostCard.svelte`
- Modify: `src/lib/feed/RepostCard.svelte`
- Modify: `src/lib/feed/QuotePostCard.svelte`
- Modify: `src/lib/feed/BlogCard.svelte`
- Modify: `src/lib/feed/Sidebar.svelte`

- [ ] **Step 1: `MicropostCard.svelte`**

Replace the import:

```svelte
import { relativeTime } from '$lib/relative-time';
```

with:

```svelte
import RelativeTime from './RelativeTime.svelte';
```

Replace the use site in the header:

```svelte
<span class="head-left"><span class="handle">@{ownerHandle}</span> · <span class="time">{relativeTime(item.createdAt)}</span></span>
```

with:

```svelte
<span class="head-left"><span class="handle">@{ownerHandle}</span> · <RelativeTime class="time" datetime={item.createdAt} /></span>
```

- [ ] **Step 2: `RepostCard.svelte`**

Replace the import the same way, then update the two use sites:

`<span class="repost-line">↻ reposted · {relativeTime(item.createdAt)}</span>`

becomes:

```svelte
<span class="repost-line">↻ reposted · <RelativeTime datetime={item.createdAt} /></span>
```

And:

`<span class="time">{relativeTime(subject.createdAt)}</span>`

becomes:

```svelte
<RelativeTime class="time" datetime={subject.createdAt} />
```

- [ ] **Step 3: `QuotePostCard.svelte`**

Replace the import. Then replace:

`<span class="time">{relativeTime(createdAt)}</span>`

with:

```svelte
<RelativeTime class="time" datetime={createdAt} />
```

- [ ] **Step 4: `BlogCard.svelte`**

Replace the import. Then replace:

`<span>{relativeTime(item.createdAt)}</span>`

with:

```svelte
<RelativeTime datetime={item.createdAt} />
```

- [ ] **Step 5: `Sidebar.svelte` — pulse rows**

The `fmt(ts)` helper currently calls `relativeTime(ts)` once. Keep `fmt` for the null-fallback ('—'), but render the result through `<RelativeTime>` only when `ts` is non-null.

Replace the import line `import { relativeTime } from '$lib/relative-time';` with `import RelativeTime from './RelativeTime.svelte';`. Drop the now-unused `fmt` helper. In the markup, replace each:

```svelte
<dd>{fmt(pulse.lastPost)}</dd>
```

with:

```svelte
<dd>{#if pulse.lastPost}<RelativeTime datetime={pulse.lastPost} />{:else}—{/if}</dd>
```

Repeat for `pulse.lastBlog`.

- [ ] **Step 6: Verify**

Run: `pnpm dev`
- Open `/` and confirm timestamps render.
- Hover any timestamp — native tooltip shows `YYYY-MM-DD HH:MM UTC`.
- Leave the page open ~70 seconds and watch a recent post's "just now" → "1m" transition without reload.

- [ ] **Step 7: Commit**

```bash
git add src/lib/feed/MicropostCard.svelte src/lib/feed/RepostCard.svelte \
        src/lib/feed/QuotePostCard.svelte src/lib/feed/BlogCard.svelte \
        src/lib/feed/Sidebar.svelte
git commit -m "feed: route timestamps through RelativeTime"
```

---

### Task 4: Create `FeedError` component

**Files:**
- Create: `src/lib/feed/FeedError.svelte`

- [ ] **Step 1: Create `src/lib/feed/FeedError.svelte`**

```svelte
<script lang="ts">
	let { message = 'couldn’t load', onretry }: { message?: string; onretry: () => void } = $props();
</script>

<p class="err" role="status" aria-live="polite">
	<span class="msg">{message}</span>
	<span class="sep" aria-hidden="true">·</span>
	<button type="button" class="retry" onclick={onretry}>retry →</button>
</p>

<style>
	.err {
		text-align: center;
		font-family: var(--font-mono);
		font-size: 12px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--color-fg-mute);
		margin: 32px 0 8px;
		display: flex;
		justify-content: center;
		align-items: baseline;
		gap: 10px;
	}
	.msg { color: var(--color-fg-dim); }
	.sep { color: var(--color-fg-mute); }
	.retry {
		background: transparent;
		border: none;
		padding: 0;
		font: inherit;
		letter-spacing: inherit;
		text-transform: inherit;
		color: var(--color-warm);
		cursor: pointer;
	}
	.retry:hover { color: var(--color-hot); }
	.retry:focus-visible {
		outline: 2px solid var(--color-warm);
		outline-offset: 2px;
	}
</style>
```

- [ ] **Step 2: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/lib/feed/FeedError.svelte
git commit -m "feed: add FeedError — inline retry caption"
```

---

### Task 5: Wire error state + filter/sort loading caption into the home page

**Files:**
- Modify: `src/routes/+page.svelte`

- [ ] **Step 1: Add the import**

In the `<script>` block, add (alphabetized roughly to match existing imports):

```svelte
import FeedError from '$lib/feed/FeedError.svelte';
```

- [ ] **Step 2: Add error state and update fetch handlers**

Below the existing `let loading = $state(false);` line:

```ts
let error = $state<string | null>(null);
let lastFailedOp = $state<null | (() => Promise<void>)>(null);
```

In `applyQuery`, after `if (next.source === source && next.sort === sort) return;`, add:

```ts
const op = () => applyQuery(next);
```

Then change the existing `if (!body) { loading = false; return; }` block to:

```ts
if (!body) {
    loading = false;
    error = 'couldn’t load';
    lastFailedOp = op;
    return;
}
error = null;
lastFailedOp = null;
```

In `loadMore`, wrap the body equivalently. After `loading = true;`, define the op:

```ts
const op = () => loadMore();
```

In the `try` block, replace `if (!body) return;` with:

```ts
if (!body) {
    error = 'couldn’t load';
    lastFailedOp = op;
    return;
}
error = null;
lastFailedOp = null;
```

- [ ] **Step 3: Render the error + loading caption in the markup**

Replace the existing `<div class="filter-row">` and `<div class="entries-wrap" ...>` blocks in the `feed-region` section.

Old:

```svelte
<div class="filter-row">
    <FeedToolbar {source} {sort} onchange={applyQuery} />
    <AutoLoadToggle bind:auto />
</div>

<div class="entries-wrap" class:loading aria-busy={loading}>
    {#if items.length === 0}
        <p class="empty">nothing here yet.</p>
    {:else}
        <ol class="entries">
            {#each items as item (item.uri)}
                <li class="entry">
                    <Card {item} {ownerHandle} blobCtx={data.blobCtx} />
                </li>
            {/each}
        </ol>
        <LoadMore {hasMore} {loading} {auto} onload={loadMore} />
    {/if}
</div>
```

New:

```svelte
<div class="filter-row">
    <FeedToolbar {source} {sort} onchange={applyQuery} />
    <div class="filter-end">
        {#if loading}<span class="loading-caption">loading…</span>{/if}
        <AutoLoadToggle bind:auto />
    </div>
</div>

<div class="entries-wrap" class:loading aria-busy={loading}>
    {#if items.length === 0 && error && lastFailedOp}
        <FeedError message={error} onretry={lastFailedOp} />
    {:else if items.length === 0}
        <p class="empty">nothing here yet.</p>
    {:else}
        <ol class="entries">
            {#each items as item (item.uri)}
                <li class="entry">
                    <Card {item} {ownerHandle} blobCtx={data.blobCtx} />
                </li>
            {/each}
        </ol>
        {#if error && lastFailedOp}
            <FeedError message={error} onretry={lastFailedOp} />
        {:else}
            <LoadMore {hasMore} {loading} {auto} onload={loadMore} />
        {/if}
    {/if}
</div>
```

- [ ] **Step 4: Add styles for the new caption**

Inside the `<style>` block, alongside `.filter-row`:

```css
.filter-end {
    display: flex;
    align-items: baseline;
    gap: 14px;
}
.loading-caption {
    font-family: var(--font-mono);
    font-size: 12px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--color-fg-mute);
}
```

- [ ] **Step 5: Verify**

Run: `pnpm dev`
- In Chrome DevTools Network tab, set throttling to "Offline".
- Click a different source filter (`bsky` → `blog`). Caption "loading…" appears briefly. Inline `couldn't load · retry →` replaces the LoadMore footer (or the empty state).
- Set throttling back to "No throttling". Click `retry →`. Items load. The error clears.
- Throttle to Slow 3G; click another filter. Caption stays visible during the in-flight fetch, hides on success.

- [ ] **Step 6: Commit**

```bash
git add src/routes/+page.svelte
git commit -m "feed: inline error + loading caption on home"
```

---

### Task 6: Add focus rings to the missing interactive elements

**Files:**
- Modify: `src/lib/feed/Lightbox.svelte`
- Modify: `src/lib/feed/FacetText.svelte`
- Modify: `src/lib/feed/LinkCard.svelte`
- Modify: `src/lib/feed/ImageGrid.svelte`
- Modify: `src/routes/blog/[...path]/+page.svelte`

All rings use `--color-warm` (the primary tone per the spec's tone-coded scheme).

- [ ] **Step 1: `Lightbox.svelte`**

Inside the `<style>` block, after the existing `.nav:disabled` rule, add:

```css
.close:focus-visible,
.nav:focus-visible {
    outline: 2px solid var(--color-warm);
    outline-offset: 2px;
}
```

- [ ] **Step 2: `FacetText.svelte`**

Inside the `<style>` block, after the existing `a:hover` rule, add:

```css
a:focus-visible {
    outline: 2px solid var(--color-warm);
    outline-offset: 2px;
}
```

- [ ] **Step 3: `LinkCard.svelte`**

Inside the `<style>` block, before the `@container` query, add:

```css
.link-card:hover { border-color: var(--color-fg-dim); }
.link-card:focus-visible {
    outline: 2px solid var(--color-warm);
    outline-offset: 2px;
}
```

- [ ] **Step 4: `ImageGrid.svelte`**

Inside the `<style>` block, after the `.slot { ... }` rule, add:

```css
.slot:focus-visible {
    outline: 2px solid var(--color-warm);
    outline-offset: 2px;
}
```

- [ ] **Step 5: `src/routes/blog/[...path]/+page.svelte`**

Inside the `<style>` block, add (place near the `.breadcrumb a` rule):

```css
.breadcrumb a:focus-visible,
.discuss-cta:focus-visible,
.back a:focus-visible {
    outline: 2px solid var(--color-warm);
    outline-offset: 2px;
}
```

- [ ] **Step 6: Verify**

Run: `pnpm dev`
- Tab through the home page — focus moves through nav, toolbar, feed cards, sidebar. Every focus ring is the tone-correct color (warm for these new ones).
- Open the lightbox by clicking an image. Tab — close, prev, next all show warm rings.
- Open a blog post. Tab through breadcrumb / cta / back link. Warm rings.

- [ ] **Step 7: Commit**

```bash
git add src/lib/feed/Lightbox.svelte src/lib/feed/FacetText.svelte \
        src/lib/feed/LinkCard.svelte src/lib/feed/ImageGrid.svelte \
        src/routes/blog/[...path]/+page.svelte
git commit -m "ui: focus-visible coverage on lightbox, facet text, link cards, image grid, blog links"
```

---

### Task 7: Engagement strip de-emphasis

**Files:**
- Modify: `src/lib/feed/EngagementStrip.svelte`

- [ ] **Step 1: Reduce icon size**

In the markup, change all three `size={18}` to `size={14}`:

```svelte
<ChatCircle size={14} weight="regular" class="ic" />
<Repeat size={14} weight="regular" class="ic" />
<Heart size={14} weight="regular" class="ic" />
```

- [ ] **Step 2: Update colors and gap**

In the `<style>` block, replace the `.engagement` rule's `gap: 22px;` with `gap: 18px;`. Replace the `.n` color and `.stat.zero .n` color rules:

```css
.n { color: var(--color-fg-dim); line-height: 1; }
.stat.zero .n { color: var(--color-fg-mute); }
```

(`.stat :global(.ic) { color: var(--color-fg-mute); ... }` stays — icons were already muted.)

- [ ] **Step 3: Verify**

Run: `pnpm dev`. Open `/`. Engagement strip looks lighter / smaller — reads as stats, not buttons. Trailing `BskyLink` still pops as the interactive element.

- [ ] **Step 4: Commit**

```bash
git add src/lib/feed/EngagementStrip.svelte
git commit -m "feed: de-emphasize engagement strip — smaller icons, dimmer text"
```

---

### Task 8: Blog cover image — drop forced 21:9 crop

**Files:**
- Modify: `src/routes/blog/[...path]/+page.svelte`

- [ ] **Step 1: Update the `.hero` and `.hero img` rules**

Replace the existing rules:

```css
.hero {
    aspect-ratio: 21 / 9;
    margin-bottom: 32px;
    border: 1px solid var(--color-edge);
    overflow: hidden;
}
.hero img { width: 100%; height: 100%; object-fit: cover; display: block; }
```

with:

```css
.hero {
    margin-bottom: 32px;
}
.hero img {
    display: block;
    width: 100%;
    height: auto;
    max-height: 60vh;
    object-fit: contain;
}
```

- [ ] **Step 2: Verify**

Run: `pnpm dev`. Open a blog post with a portrait cover (or a landscape one) and confirm the image renders at natural aspect, not cropped, capped at 60vh on tall covers.

- [ ] **Step 3: Commit**

```bash
git add src/routes/blog/[...path]/+page.svelte
git commit -m "blog: cover image keeps natural aspect, capped at 60vh"
```

---

### Task 9: Clickable handles in cards

**Files:**
- Modify: `src/lib/feed/MicropostCard.svelte`
- Modify: `src/lib/feed/RepostCard.svelte`

`QuotePostCard` is intentionally skipped — its outer element is already an `<a>` to the post permalink, and nesting `<a>` tags is invalid HTML.

- [ ] **Step 1: `MicropostCard.svelte` — handle becomes a profile link**

Replace the `<header class="head">` block:

```svelte
<header class="head">
    <span class="head-left"><span class="handle">@{ownerHandle}</span> · <RelativeTime class="time" datetime={item.createdAt} /></span>
    <BskyChip />
</header>
```

with:

```svelte
<header class="head">
    <span class="head-left">
        <a
            class="handle"
            href="https://bsky.app/profile/{blobCtx.ownerDid}"
            target="_blank"
            rel="noopener noreferrer"
            onclick={(e) => e.stopPropagation()}
        >@{ownerHandle}</a>
        ·
        <RelativeTime class="time" datetime={item.createdAt} />
    </span>
    <BskyChip />
</header>
```

In the `<style>` block, replace the `.head .handle { color: var(--color-fg); }` rule with:

```css
.head .handle {
    color: var(--color-fg);
    text-decoration: none;
}
.head .handle:hover {
    color: var(--color-warm);
    text-decoration: underline;
}
.head .handle:focus-visible {
    outline: 2px solid var(--color-warm);
    outline-offset: 2px;
}
```

- [ ] **Step 2: `RepostCard.svelte` — quoted-subject handle becomes a profile link**

Replace the `<header class="subject-head">` block:

```svelte
<header class="subject-head">
    <span class="handle">@{subjectHandle ?? `${subjectDid.slice(0, 12)}…`}</span>
    <RelativeTime class="time" datetime={subject.createdAt} />
</header>
```

with:

```svelte
<header class="subject-head">
    <a
        class="handle"
        href="https://bsky.app/profile/{subjectDid}"
        target="_blank"
        rel="noopener noreferrer"
        onclick={(e) => e.stopPropagation()}
    >@{subjectHandle ?? `${subjectDid.slice(0, 12)}…`}</a>
    <RelativeTime class="time" datetime={subject.createdAt} />
</header>
```

In the `<style>` block, replace `.handle { color: var(--color-fg); }` with:

```css
.handle {
    color: var(--color-fg);
    text-decoration: none;
}
.handle:hover {
    color: var(--color-warm);
    text-decoration: underline;
}
.handle:focus-visible {
    outline: 2px solid var(--color-warm);
    outline-offset: 2px;
}
```

- [ ] **Step 3: Verify**

Run: `pnpm dev`. Hover any handle — it underlines and turns warm. Click — opens the bsky profile in a new tab. Tab to it — warm focus ring.

- [ ] **Step 4: Commit**

```bash
git add src/lib/feed/MicropostCard.svelte src/lib/feed/RepostCard.svelte
git commit -m "feed: handles link to bsky profile (DID-based)"
```

---

### Task 10: Surface bsky `aspectRatio` to ImageGrid to remove image layout shift

**Files:**
- Modify: `src/lib/feed/ImageGrid.svelte`
- Modify: `src/lib/feed/MicropostCard.svelte`
- Modify: `src/lib/feed/RepostCard.svelte`

- [ ] **Step 1: Extend `GridImage` and consume the aspect**

In `src/lib/feed/ImageGrid.svelte`, replace the existing `GridImage` type and `singleSlotStyle` block.

Old:

```ts
export type GridImage = { src: string; alt?: string };
```

New:

```ts
export type GridImage = { src: string; alt?: string; aspect?: number };
```

In the same `<script>`, after the existing `function singleSlotStyle(key: string)` definition, replace its body so server-provided aspect wins over the on-load measurement:

```ts
function singleSlotStyle(key: string, serverAspect: number | undefined): string | null {
    const a = serverAspect ?? aspects[key];
    if (a === undefined) return null;
    const widthPct = a >= 1 ? 100 : Math.max(50, a * 100);
    return `aspect-ratio: ${a}; width: ${widthPct}%;`;
}
```

In the markup, update the `style={...}` attribute on the slot button:

```svelte
style={layout === 'one' ? singleSlotStyle(key, img.aspect) : null}
```

Inside the `onImgLoad` function, only update `aspects[key]` when no `serverAspect` is present, to avoid pointless reactivity:

```ts
function onImgLoad(key: string, e: Event, hasServerAspect: boolean) {
    if (hasServerAspect) return;
    const img = e.currentTarget as HTMLImageElement;
    if (img.naturalWidth && img.naturalHeight) {
        aspects[key] = img.naturalWidth / img.naturalHeight;
    }
}
```

And update the `<img>` in the each block to pass `hasServerAspect`:

```svelte
<img
    class="fg"
    src={img.src}
    alt={img.alt ?? ''}
    loading="lazy"
    onload={(e) => onImgLoad(key, e, img.aspect !== undefined)}
/>
```

- [ ] **Step 2: Thread `aspect` through `MicropostCard.svelte`'s `mediaEmbed`**

In the `mediaEmbed` `$derived.by(...)` block, locate the images branch:

```ts
if (Array.isArray(images)) {
    return {
        kind: 'images' as const,
        images: images.map((i: { image: { ref: any }; alt?: string }) => ({
            src: blobUrl(blobCtx, blobCtx.ownerDid, cidOf(i.image.ref)),
            alt: i.alt
        }))
    };
}
```

Replace with (note the type adds `aspectRatio`):

```ts
if (Array.isArray(images)) {
    return {
        kind: 'images' as const,
        images: images.map(
            (i: {
                image: { ref: any };
                alt?: string;
                aspectRatio?: { width: number; height: number };
            }) => ({
                src: blobUrl(blobCtx, blobCtx.ownerDid, cidOf(i.image.ref)),
                alt: i.alt,
                aspect:
                    i.aspectRatio && i.aspectRatio.height > 0
                        ? i.aspectRatio.width / i.aspectRatio.height
                        : undefined
            })
        )
    };
}
```

- [ ] **Step 3: Thread `aspect` through `RepostCard.svelte`'s `images`**

Replace the existing `images` `$derived.by(...)` block:

```ts
let images = $derived.by(() => {
    if (!subjectValue) return [];
    const e = subjectValue.embed as any;
    const list = e?.images ?? e?.media?.images;
    if (Array.isArray(list)) {
        return list.map((i: { image: { ref: any }; alt?: string }) => ({
            src: blobUrl(blobCtx, subjectDid, cidOf(i.image.ref)),
            alt: i.alt
        }));
    }
    return [];
});
```

with:

```ts
let images = $derived.by(() => {
    if (!subjectValue) return [];
    const e = subjectValue.embed as any;
    const list = e?.images ?? e?.media?.images;
    if (Array.isArray(list)) {
        return list.map(
            (i: {
                image: { ref: any };
                alt?: string;
                aspectRatio?: { width: number; height: number };
            }) => ({
                src: blobUrl(blobCtx, subjectDid, cidOf(i.image.ref)),
                alt: i.alt,
                aspect:
                    i.aspectRatio && i.aspectRatio.height > 0
                        ? i.aspectRatio.width / i.aspectRatio.height
                        : undefined
            })
        );
    }
    return [];
});
```

- [ ] **Step 4: Verify**

Run: `pnpm dev`. Open `/` in Chrome with DevTools Performance recording started. Hard-reload. The recording should show no significant layout shift on image-bearing posts that have `aspectRatio` set (most modern bsky posts). Posts without it fall back to the JS-on-load behavior — no regression.

Alternatively, throttle network to Slow 3G and watch a feed reload — image slots reserve their final size before the image bytes arrive when `aspectRatio` is present.

- [ ] **Step 5: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: passes.

- [ ] **Step 6: Commit**

```bash
git add src/lib/feed/ImageGrid.svelte src/lib/feed/MicropostCard.svelte src/lib/feed/RepostCard.svelte
git commit -m "feed: use bsky aspectRatio to reserve image slot size on first paint"
```

---

## Final verification

After Task 10:

- [ ] **Run the test suite**

Run: `pnpm test` (vitest)
Expected: existing tests pass, no regressions. No new tests are added in this plan — the changes are visual / integration concerns and the spec deferred testing to manual verification.

- [ ] **Run the type checker**

Run: `pnpm exec tsc --noEmit`
Expected: passes.

- [ ] **Manual smoke test**

In a fresh browser tab, walk through:
- Home: tab through every interactive surface; warm rings on new ones, existing tones unchanged. Throttle network, force a 500 from `/api/feed`; inline error + retry works. Filter/sort transitions show "loading…" caption.
- A feed post: hover handle → underline + warm. Click → bsky profile in new tab. Engagement icons read as stats, not buttons. Image with `aspectRatio` reserves space immediately.
- Lightbox: warm rings on close + prev/next; arrow keys still work.
- Blog post: focus rings on breadcrumb / discuss / back; cover image at natural aspect, capped 60vh. Time elements have `title` tooltips.
