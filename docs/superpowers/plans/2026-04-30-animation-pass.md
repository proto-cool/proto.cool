# Animation Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the animation pass spec — motion tokens, snap-fix hovers, theme + route View Transitions, image fade-in, lightbox/error/loader motion, hero reveal, and feed card stagger — while respecting `prefers-reduced-motion` everywhere.

**Architecture:** Centralize motion vocabulary in `tokens.css`; reuse the existing View Transitions API (already wired for filter/sort swap) by promoting its root rule to a global stylesheet so theme + route navigation cross-fade for free; add scoped Svelte/CSS transitions per component. A small `prefers-reduced-motion` store backs the JS-driven transitions (Lightbox, FeedError, feed stagger); CSS transitions use `@media (prefers-reduced-motion: reduce)` directly.

**Tech Stack:** SvelteKit (Svelte 5 runes), TypeScript, plain CSS, View Transitions API, phosphor-svelte icons.

**Spec:** `docs/superpowers/specs/2026-04-30-animation-pass-design.md`

---

## File map

New:
- `src/lib/prefers-reduced-motion.ts` — readable store backing `(prefers-reduced-motion: reduce)`.

Modified:
- `src/lib/theme/tokens.css` — motion tokens.
- `src/app.css` — global view-transition root rule + reduced-motion guard.
- `src/routes/+page.svelte` — drop the now-global view-transition rule; add feed stagger; `applyQuery` gates stagger to skip the swap-driven re-mount.
- `src/routes/+layout.svelte` — `onNavigate` route transition wiring.
- `src/routes/blog/[...path]/+page.svelte` — cover image fade-in.
- `src/lib/feed/MicropostCard.svelte` — handle hover transition.
- `src/lib/feed/RepostCard.svelte` — handle hover transition.
- `src/lib/feed/LinkCard.svelte` — border hover transition + thumb fade-in.
- `src/lib/feed/Sidebar.svelte` — cell border transition.
- `src/lib/feed/ImageGrid.svelte` — per-image fade-in.
- `src/lib/feed/Lightbox.svelte` — overlay/image enter, prev/next swap.
- `src/lib/feed/LoadMore.svelte` — spinner glyph + rotate keyframe.
- `src/lib/feed/FeedError.svelte` — fly-in + retry active state.
- `src/lib/shell/HeroSection.svelte` — reveal cascade.
- `src/lib/shell/theme-controls.ts` — wrap `setTheme` in View Transitions.

---

### Task 1: Motion tokens

**Files:**
- Modify: `src/lib/theme/tokens.css`

- [ ] **Step 1: Read `src/lib/theme/tokens.css`**

Confirm the existing structure (the file defines theme-shared tokens inside an `@layer theme` or similar). The new tokens should sit alongside other shared tokens, not inside a theme variant.

- [ ] **Step 2: Add four motion tokens to `:root`**

Locate the `:root { ... }` block (or the equivalent default-tokens block at the top of the file). Insert these four declarations alongside the existing tokens:

```css
--ease-snap: cubic-bezier(0.2, 0, 0, 1);
--dur-fast: 100ms;
--dur-base: 220ms;
--dur-slow: 380ms;
```

If `:root` doesn't exist as a single block (the file may use `@layer` wrappers), put the tokens in whatever block defines `--font-mono`, `--color-fg`, etc. — the place where shared tokens live.

- [ ] **Step 3: Type-check**

Run: `pnpm check`
Expected: 0 errors, 0 warnings.

- [ ] **Step 4: Commit**

```bash
git add src/lib/theme/tokens.css
git commit -m "theme: add motion tokens (--ease-snap, --dur-fast/base/slow)"
```

---

### Task 2: Move view-transition root rule to global + add reduced-motion guard

**Files:**
- Modify: `src/app.css`
- Modify: `src/routes/+page.svelte` (remove the local rule)

- [ ] **Step 1: Read `src/routes/+page.svelte` lines 333–339**

Locate the existing rule:

```css
/* View Transitions: tune the cross-fade. Works only when the browser
   supports startViewTransition; otherwise the @keyframes are unused. */
:global(::view-transition-old(root)),
:global(::view-transition-new(root)) {
    animation-duration: 220ms;
    animation-timing-function: ease;
}
```

- [ ] **Step 2: Read `src/app.css`**

Confirm structure (it likely imports theme tokens and defines a few base styles).

- [ ] **Step 3: Add the global view-transition rule + reduced-motion guard to `src/app.css`**

Append at the end of the file:

```css
/* View Transitions root cross-fade.
   Used by:
   - SvelteKit page navigation (src/routes/+layout.svelte onNavigate)
   - Theme switch (src/lib/shell/theme-controls.ts setTheme)
   - Filter/sort swap on the home feed (src/routes/+page.svelte applyQuery)
   No-op on browsers without startViewTransition support. */
::view-transition-old(root),
::view-transition-new(root) {
    animation-duration: var(--dur-base);
    animation-timing-function: ease;
}

@media (prefers-reduced-motion: reduce) {
    ::view-transition-old(root),
    ::view-transition-new(root) {
        animation-duration: 0s;
    }
}
```

(Using the new `--dur-base` token from Task 1.)

- [ ] **Step 4: Remove the local rule from `src/routes/+page.svelte`**

Delete lines 333–339 (the comment block and the `:global(::view-transition-old/new(root))` rule). The home page no longer needs its own copy — the rule is global now.

- [ ] **Step 5: Type-check**

Run: `pnpm check`
Expected: passes.

- [ ] **Step 6: Verify visually**

Run: `pnpm dev`. On the home page, click a different source filter (`bsky` → `blog`). Confirm the cross-fade still happens at ~220ms. Toggle the OS reduced-motion setting and re-test — the swap is instant.

- [ ] **Step 7: Commit**

```bash
git add src/app.css src/routes/+page.svelte
git commit -m "ui: hoist view-transition root rule global + reduced-motion guard"
```

---

### Task 3: `prefers-reduced-motion` store

**Files:**
- Create: `src/lib/prefers-reduced-motion.ts`

- [ ] **Step 1: Create the store**

Write `src/lib/prefers-reduced-motion.ts`:

```ts
import { readable, type Readable } from 'svelte/store';
import { browser } from '$app/environment';

const QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Reactive boolean: does the OS request reduced motion?
 * - SSR: defaults to `false` (motion enabled).
 * - Client: tracks the live media query.
 */
export const prefersReducedMotion: Readable<boolean> = readable(false, (set) => {
    if (!browser) return;
    const mql = window.matchMedia(QUERY);
    set(mql.matches);
    const onChange = (e: MediaQueryListEvent) => set(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
});
```

- [ ] **Step 2: Type-check**

Run: `pnpm check`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/lib/prefers-reduced-motion.ts
git commit -m "lib: add prefersReducedMotion store"
```

---

### Task 4: Snap-fix hover transitions

**Files:**
- Modify: `src/lib/feed/MicropostCard.svelte`
- Modify: `src/lib/feed/RepostCard.svelte`
- Modify: `src/lib/feed/LinkCard.svelte`
- Modify: `src/lib/feed/Sidebar.svelte`

- [ ] **Step 1: `MicropostCard.svelte` — add transition to `.head .handle`**

In the `<style>` block, find the `.head .handle` rule (added in the polish pass — looks like):

```css
.head .handle {
    color: var(--color-fg);
    text-decoration: none;
}
```

Append the transition:

```css
.head .handle {
    color: var(--color-fg);
    text-decoration: none;
    transition: color var(--dur-fast) ease, text-decoration-color var(--dur-fast) ease;
}
```

- [ ] **Step 2: `RepostCard.svelte` — add transition to `.handle`**

Find the `.handle` rule (similar structure). Append the same transition:

```css
.handle {
    color: var(--color-fg);
    text-decoration: none;
    transition: color var(--dur-fast) ease, text-decoration-color var(--dur-fast) ease;
}
```

- [ ] **Step 3: `LinkCard.svelte` — add transition to `.link-card`**

In the `<style>` block, find:

```css
.link-card {
    display: grid;
    grid-template-columns: 140px 1fr;
    border: 1px solid var(--color-edge);
    background: var(--shell-veil);
    text-decoration: none;
    color: inherit;
    overflow: hidden;
}
```

Add a `transition: border-color var(--dur-fast) ease;` line at the end of that block.

- [ ] **Step 4: `Sidebar.svelte` — add transition to `.cell`**

Find the `.cell` rule. It currently transitions `color` only. Extend the existing `transition` to include `border-color`:

Replace:

```css
.cell {
    /* ...existing properties... */
    transition: color 100ms ease;
    /* ...rest... */
}
```

with:

```css
.cell {
    /* ...existing properties... */
    transition: color var(--dur-fast) ease, border-color var(--dur-fast) ease;
    /* ...rest... */
}
```

(Use `--dur-fast` for consistency.)

- [ ] **Step 5: Type-check**

Run: `pnpm check`
Expected: passes.

- [ ] **Step 6: Verify**

Run: `pnpm dev`. Hover a handle in a feed post — color fades to warm (not snap). Hover a link card — border eases. Hover a sidebar elsewhere cell — border eases.

- [ ] **Step 7: Commit**

```bash
git add src/lib/feed/MicropostCard.svelte src/lib/feed/RepostCard.svelte \
        src/lib/feed/LinkCard.svelte src/lib/feed/Sidebar.svelte
git commit -m "ui: smooth hover transitions on handles, link cards, sidebar cells"
```

---

### Task 5: Theme switch cross-fade via `setTheme`

**Files:**
- Modify: `src/lib/shell/theme-controls.ts`

- [ ] **Step 1: Read `src/lib/shell/theme-controls.ts`**

Find the `setTheme` function. It currently mutates the document/state directly to apply a theme.

- [ ] **Step 2: Wrap `setTheme`'s body in a View Transitions call**

Find the existing function (likely shaped like):

```ts
export function setTheme(themeId: ThemeId) {
    // ... existing logic mutating <html data-theme> or similar ...
}
```

Refactor so the existing logic is inside a callback passed to `document.startViewTransition` when available:

```ts
export function setTheme(themeId: ThemeId) {
    const apply = () => {
        // ...the existing logic, unchanged...
    };
    const startVT = (
        document as Document & { startViewTransition?: (cb: () => unknown) => unknown }
    ).startViewTransition;
    if (typeof startVT === 'function') {
        startVT.call(document, apply);
    } else {
        apply();
    }
}
```

The exact "existing logic" is whatever was in `setTheme` before — preserve it verbatim inside `apply`.

- [ ] **Step 3: Type-check**

Run: `pnpm check`
Expected: passes.

- [ ] **Step 4: Verify**

Run: `pnpm dev`. Open the theme controls overlay. Switch themes — colors cross-fade over 220ms (same duration as the global rule). Toggle reduced-motion in OS — switch is instant.

- [ ] **Step 5: Run existing theme-controls tests**

Run: `pnpm test src/lib/shell/theme-controls.test.ts`
Expected: pre-existing tests pass (the wrapper shouldn't break them, since `apply()` runs synchronously inside `startViewTransition`'s callback).

- [ ] **Step 6: Commit**

```bash
git add src/lib/shell/theme-controls.ts
git commit -m "theme: cross-fade theme switch via View Transitions"
```

---

### Task 6: Image fade-in (ImageGrid, LinkCard, blog cover)

**Files:**
- Modify: `src/lib/feed/ImageGrid.svelte`
- Modify: `src/lib/feed/LinkCard.svelte`
- Modify: `src/routes/blog/[...path]/+page.svelte`

- [ ] **Step 1: `ImageGrid.svelte` — per-image `loaded` map**

In the `<script>` block, after the existing `let aspects = $state<Record<string, number>>({});` line, add:

```ts
let loaded = $state<Record<string, boolean>>({});
```

Modify `onImgLoad` to also flag the image as loaded (after the existing aspect logic):

Existing function (after Task 10 of polish):

```ts
function onImgLoad(key: string, e: Event, hasServerAspect: boolean) {
    if (hasServerAspect) return;
    const img = e.currentTarget as HTMLImageElement;
    if (img.naturalWidth && img.naturalHeight) {
        aspects[key] = img.naturalWidth / img.naturalHeight;
    }
}
```

Replace with:

```ts
function onImgLoad(key: string, e: Event, hasServerAspect: boolean) {
    loaded[key] = true;
    if (hasServerAspect) return;
    const img = e.currentTarget as HTMLImageElement;
    if (img.naturalWidth && img.naturalHeight) {
        aspects[key] = img.naturalWidth / img.naturalHeight;
    }
}
```

In the markup, add `class:loaded={loaded[key]}` to the foreground image:

```svelte
<img
    class="fg"
    class:loaded={loaded[key]}
    src={img.src}
    alt={img.alt ?? ''}
    loading="lazy"
    onload={(e) => onImgLoad(key, e, img.aspect !== undefined)}
/>
```

In the `<style>` block, replace the existing `.slot .fg` rule. Old:

```css
.slot .fg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
}
```

New:

```css
.slot .fg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
    opacity: 0;
    transition: opacity var(--dur-base) ease;
}
.slot .fg.loaded { opacity: 1; }
@media (prefers-reduced-motion: reduce) {
    .slot .fg { opacity: 1; transition: none; }
}
```

- [ ] **Step 2: `LinkCard.svelte` — thumb fade-in**

In the `<script>` block, add:

```ts
let thumbLoaded = $state(false);
```

In the markup, the existing thumb branch:

```svelte
{#if thumb}
    <div class="thumb"><img src={thumb} alt="" loading="lazy" /></div>
{:else}
    <div class="thumb thumb-empty" aria-hidden="true">↗</div>
{/if}
```

becomes:

```svelte
{#if thumb}
    <div class="thumb">
        <img
            src={thumb}
            alt=""
            loading="lazy"
            class:loaded={thumbLoaded}
            onload={() => (thumbLoaded = true)}
        />
    </div>
{:else}
    <div class="thumb thumb-empty" aria-hidden="true">↗</div>
{/if}
```

In the `<style>` block, replace `.thumb img`:

Old:

```css
.thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
```

New:

```css
.thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    opacity: 0;
    transition: opacity var(--dur-base) ease;
}
.thumb img.loaded { opacity: 1; }
@media (prefers-reduced-motion: reduce) {
    .thumb img { opacity: 1; transition: none; }
}
```

- [ ] **Step 3: Blog cover — fade-in**

In `src/routes/blog/[...path]/+page.svelte`, add to the `<script>` block:

```ts
let coverLoaded = $state(false);
```

The existing markup:

```svelte
{#if coverUrl}
    <div class="hero"><img src={coverUrl} alt="" /></div>
{/if}
```

becomes:

```svelte
{#if coverUrl}
    <div class="hero">
        <img
            src={coverUrl}
            alt=""
            class:loaded={coverLoaded}
            onload={() => (coverLoaded = true)}
        />
    </div>
{/if}
```

In the `<style>` block, replace the existing `.hero img` rule (after the polish-pass change in Task 8 it looks like `display: block; width: 100%; height: auto; max-height: 60vh; object-fit: contain;`). Add fade-in properties:

```css
.hero img {
    display: block;
    width: 100%;
    height: auto;
    max-height: 60vh;
    object-fit: contain;
    opacity: 0;
    transition: opacity var(--dur-base) ease;
}
.hero img.loaded { opacity: 1; }
@media (prefers-reduced-motion: reduce) {
    .hero img { opacity: 1; transition: none; }
}
```

- [ ] **Step 4: Type-check**

Run: `pnpm check`
Expected: passes.

- [ ] **Step 5: Verify**

Run: `pnpm dev`. Throttle Network to "Slow 3G" in DevTools. Hard-reload home — feed images fade in as bytes arrive (no hard pop). Open a link card with a thumb — thumb fades. Open a blog post with a cover — cover fades.

- [ ] **Step 6: Commit**

```bash
git add src/lib/feed/ImageGrid.svelte src/lib/feed/LinkCard.svelte \
        src/routes/blog/'[...path]'/+page.svelte
git commit -m "feed: fade-in images on load (grid, link cards, blog cover)"
```

---

### Task 7: Lightbox enter/exit + prev/next swap

**Files:**
- Modify: `src/lib/feed/Lightbox.svelte`

- [ ] **Step 1: Add imports**

In the `<script>` block, add:

```ts
import { fade, scale } from 'svelte/transition';
import { cubicOut } from 'svelte/easing';
import { prefersReducedMotion } from '$lib/prefers-reduced-motion';
```

- [ ] **Step 2: Apply enter/exit transitions to overlay + image**

The existing markup root is:

```svelte
<div class="overlay" role="dialog" ...>
    <button class="close" ...>×</button>
    {#if images.length > 1}
        <button class="nav prev" ...>‹</button>
        <button class="nav next" ...>›</button>
        <div class="counter">{index + 1} / {images.length}</div>
    {/if}
    <img src={current.src} alt={current.alt ?? ''} />
    {#if current.alt}
        <p class="alt">{current.alt}</p>
    {/if}
</div>
```

Replace the `<div class="overlay" ...>` opening tag to add `transition:fade`:

```svelte
<div
    class="overlay"
    role="dialog"
    aria-modal="true"
    aria-label="image viewer"
    tabindex="-1"
    onclick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    onkeydown={(e) => { if (e.key === 'Escape') onClose(); }}
    transition:fade={{ duration: $prefersReducedMotion ? 0 : 200 }}
>
```

Replace the `<img ... />` line. To get the prev/next cross-fade as well, key the image by `current.src` and use both `in:` and `out:` fades plus a scale on the initial enter:

```svelte
{#key current.src}
    <img
        src={current.src}
        alt={current.alt ?? ''}
        in:fade={{ duration: $prefersReducedMotion ? 0 : 120 }}
        out:fade={{ duration: $prefersReducedMotion ? 0 : 120 }}
    />
{/key}
```

(The opening overlay-level `transition:fade` handles the open/close fade. The keyed `<img>` cross-fades on every index change. We dropped the scale-on-open in favor of the simpler keyed-image cross-fade — the initial fade reads as a scale-in already because the image grows from a slot click visual context.)

- [ ] **Step 3: Verify CSS still works**

The existing `.overlay`, `img`, `.close`, `.nav`, `.alt`, `.counter` rules in `<style>` are unchanged. Confirm they're still present and untouched.

- [ ] **Step 4: Type-check**

Run: `pnpm check`
Expected: passes.

- [ ] **Step 5: Verify**

Run: `pnpm dev`. Open a multi-image feed post and click an image — overlay fades in, image fades in. Click prev/next — image cross-fades. Press Escape — overlay fades out. Toggle OS reduced-motion — all transitions become instant.

- [ ] **Step 6: Commit**

```bash
git add src/lib/feed/Lightbox.svelte
git commit -m "lightbox: fade enter/exit + cross-fade on prev/next swap"
```

---

### Task 8: LoadMore spinner

**Files:**
- Modify: `src/lib/feed/LoadMore.svelte`

- [ ] **Step 1: Replace the loading text with a spinner glyph**

In the `<script>` block, add the import:

```ts
import { CircleNotch } from 'phosphor-svelte';
```

Existing markup:

```svelte
<button bind:this={btnRef} class="btn" type="button" disabled={loading} onclick={onload}>
    {loading ? 'loading…' : 'load more →'}
</button>
```

Replace with:

```svelte
<button bind:this={btnRef} class="btn" type="button" disabled={loading} onclick={onload}>
    {#if loading}
        <CircleNotch size={14} weight="regular" class="spin" />
        <span class="lbl">loading</span>
    {:else}
        load more →
    {/if}
</button>
```

- [ ] **Step 2: Add the spin keyframe + glyph styles**

In the `<style>` block, after the existing `.btn:disabled` rule, append:

```css
.btn :global(.spin) {
    vertical-align: -2px;
    margin-right: 8px;
    animation: rotate 1s linear infinite;
}
.lbl { vertical-align: baseline; }
@keyframes rotate {
    to { transform: rotate(360deg); }
}
@media (prefers-reduced-motion: reduce) {
    .btn :global(.spin) { animation: none; }
}
```

- [ ] **Step 3: Type-check**

Run: `pnpm check`
Expected: passes.

- [ ] **Step 4: Verify**

Run: `pnpm dev`. On the home feed, click "load more →". The button shows a rotating spinner + "loading" text while the request is in flight. Toggle OS reduced-motion — the glyph is static.

- [ ] **Step 5: Commit**

```bash
git add src/lib/feed/LoadMore.svelte
git commit -m "feed: LoadMore — phosphor spinner glyph in flight"
```

---

### Task 9: FeedError fly-in + retry press feedback

**Files:**
- Modify: `src/lib/feed/FeedError.svelte`

- [ ] **Step 1: Add imports**

At the top of the `<script>` block:

```ts
import { fly } from 'svelte/transition';
import { prefersReducedMotion } from '$lib/prefers-reduced-motion';
```

- [ ] **Step 2: Apply `in:fly` to the outer `<p>`**

The existing markup:

```svelte
<p class="err" role="status" aria-live="polite">
    <span class="msg">{message}</span>
    <span class="sep" aria-hidden="true">·</span>
    <button type="button" class="retry" onclick={onretry}>retry →</button>
</p>
```

becomes:

```svelte
<p
    class="err"
    role="status"
    aria-live="polite"
    in:fly={{ y: 8, duration: $prefersReducedMotion ? 0 : 200 }}
>
    <span class="msg">{message}</span>
    <span class="sep" aria-hidden="true">·</span>
    <button type="button" class="retry" onclick={onretry}>retry →</button>
</p>
```

(No `out:` — when items resolve and the parent removes the component, instant exit is intentional.)

- [ ] **Step 3: Add retry `:active` flash**

In the `<style>` block, find the existing `.retry:hover` rule and add an `:active` rule right after it:

```css
.retry:hover { color: var(--color-hot); }
.retry:active { color: var(--color-hot); }
```

(The hover-state already brightens to `--color-hot`; `:active` matches it so the press registers as the same brighter tone even when the user holds without hover — like on touch.)

- [ ] **Step 4: Type-check**

Run: `pnpm check`
Expected: passes.

- [ ] **Step 5: Verify**

Run: `pnpm dev`. In DevTools Network, set "Offline". Click a different feed filter — `FeedError` flies up into view. Click `retry →` and watch the press flash. Set Network back to online and click retry — items load, error disappears.

- [ ] **Step 6: Commit**

```bash
git add src/lib/feed/FeedError.svelte
git commit -m "feed: FeedError — fly-in entry, retry press feedback"
```

---

### Task 10: Route transitions via `onNavigate`

**Files:**
- Modify: `src/routes/+layout.svelte`

- [ ] **Step 1: Read `src/routes/+layout.svelte`**

Confirm it has a `<script lang="ts">` block. The current top imports are: `'../app.css'`, `getContext`, `onMount`, `untrack`, `favicon`, `Shell`, `KeyboardLayer`, runtime ticks.

- [ ] **Step 2: Add the `onNavigate` import + handler**

Add to the imports:

```ts
import { onNavigate } from '$app/navigation';
```

Below the existing `onMount` block, add:

```ts
onNavigate((navigation) => {
    if (typeof document === 'undefined') return;
    const startVT = (
        document as Document & { startViewTransition?: (cb: () => Promise<void>) => unknown }
    ).startViewTransition;
    if (typeof startVT !== 'function') return;
    return new Promise<void>((resolve) => {
        startVT.call(document, async () => {
            resolve();
            await navigation.complete;
        });
    });
});
```

- [ ] **Step 3: Type-check**

Run: `pnpm check`
Expected: passes.

- [ ] **Step 4: Verify**

Run: `pnpm dev`. Navigate between `/`, `/about`, `/projects`, and a blog post. Each transition cross-fades root over 220ms (same duration as filter swap and theme switch). Toggle reduced-motion — instant.

- [ ] **Step 5: Commit**

```bash
git add src/routes/+layout.svelte
git commit -m "layout: cross-fade route navigation via View Transitions"
```

---

### Task 11: Hero reveal cascade

**Files:**
- Modify: `src/lib/shell/HeroSection.svelte`

- [ ] **Step 1: Read `src/lib/shell/HeroSection.svelte`**

The component is large (~500 lines). Locate the markup section and identify the three regions to reveal-cascade: the headline (line1 + emphasis + line2), the deck slot, and the avatar/identity element. Their wrapping elements vary — they should already be the natural mount points for `class:revealed`.

- [ ] **Step 2: Add `revealed` state + `onMount` flip**

Add (or extend) the imports in `<script lang="ts">`:

```ts
import { onMount } from 'svelte';
```

Below the existing prop declarations, add:

```ts
let revealed = $state(false);
onMount(() => {
    // rAF avoids the inserted-then-snapped-to-hidden one-frame flicker:
    // the browser paints once with `revealed === false` styles applied,
    // then we flip — and the transition fires from the hidden state.
    requestAnimationFrame(() => (revealed = true));
});
```

- [ ] **Step 3: Apply reveal classes in markup**

Find the headline element (the wrapper around line1 + emphasis + line2). Add `class="reveal" class:revealed`:

```svelte
<h1 class="title reveal" class:revealed>...</h1>
```

(The exact class name on the headline is already in place — we're *adding* `reveal` and the `revealed` toggle to the existing element.)

Find the deck slot wrapper. Add `class="reveal delay-1" class:revealed`:

```svelte
<p class="deck reveal delay-1" class:revealed>{@render deck?.()}</p>
```

Find the avatar/identity element (the `<a>` or `<div>` wrapping `avatar`, `avatarLabel`, `avatarId`). Add `class="reveal delay-2" class:revealed`:

```svelte
<a class="identity reveal delay-2" class:revealed ...>
    ...
</a>
```

(The exact existing class names — `title`, `deck`, `identity` etc. — should be preserved. Only `reveal`, `delay-1` / `delay-2`, and the toggle are new.)

- [ ] **Step 4: Add reveal CSS**

In the `<style>` block, append:

```css
.reveal {
    opacity: 0;
    transform: translateY(8px);
    transition: opacity 240ms ease-out, transform 240ms ease-out;
}
.reveal.revealed {
    opacity: 1;
    transform: translateY(0);
}
.reveal.delay-1 { transition-delay: 80ms; }
.reveal.delay-2 { transition-delay: 160ms; }

@media (prefers-reduced-motion: reduce) {
    .reveal,
    .reveal.revealed {
        opacity: 1;
        transform: none;
        transition: none;
    }
}
```

- [ ] **Step 5: Type-check**

Run: `pnpm check`
Expected: passes.

- [ ] **Step 6: Verify**

Run: `pnpm dev`. Hard-reload `/` (or `/about`, `/projects`, any blog post — all use HeroSection). Title fades up first; deck follows ~80ms later; avatar/identity ~160ms later. Total ~400ms.

If a one-frame flicker appears (hero visible before snapping to hidden), the `requestAnimationFrame` mitigation isn't enough; fall back to extracting the initial `opacity: 0` into a separate class set in JS only:

```svelte
let armed = $state(false);
onMount(() => { armed = true; requestAnimationFrame(() => (revealed = true)); });
```

```svelte
<h1 class="title reveal" class:armed class:revealed>...</h1>
```

```css
.reveal { /* default visible */ }
.reveal.armed:not(.revealed) { opacity: 0; transform: translateY(8px); }
.reveal.armed { transition: opacity 240ms ease-out, transform 240ms ease-out; }
.reveal.revealed { opacity: 1; transform: translateY(0); }
```

This makes pre-JS / SSR paint the hero at default visibility; only client-side does it transiently hide → reveal. Implementation can switch to this if the simpler approach flickers.

- [ ] **Step 7: Toggle OS reduced-motion and re-verify**

Hero appears instantly. No transition.

- [ ] **Step 8: Commit**

```bash
git add src/lib/shell/HeroSection.svelte
git commit -m "hero: staggered reveal cascade on first paint"
```

---

### Task 12: Feed card stagger

**Files:**
- Modify: `src/routes/+page.svelte`

- [ ] **Step 1: Add imports**

In the `<script lang="ts">` block, add:

```ts
import { fly } from 'svelte/transition';
import { prefersReducedMotion } from '$lib/prefers-reduced-motion';
```

- [ ] **Step 2: Track stagger origin index**

Below the existing `let lastFailedOp = ...;` line (or co-located with the other `$state` declarations), add:

```ts
let staggerFromIndex = $state<number>(Number.POSITIVE_INFINITY);
```

This index gates which `<li>` items run the `in:fly` transition. `Infinity` means none.

- [ ] **Step 3: Set the stagger origin in `loadMore`**

Find the success-path branch in `loadMore` (after the `if (!body)` failure branch, where `override = { items: [...items, ...novel], ... }` is set). Just before that `override = ...` assignment, add:

```ts
staggerFromIndex = items.length;
```

(`items.length` is the *old* length before append — captured by reading the derived value before mutation.)

- [ ] **Step 4: Disable stagger during `applyQuery`**

Find the success-path of `applyQuery` (after `if (!body)` failure). Just before the `swap()` call (or the View Transitions wrapper), add:

```ts
staggerFromIndex = Number.POSITIVE_INFINITY;
```

This ensures the View-Transitions-driven swap doesn't double-animate per item.

- [ ] **Step 5: Apply `in:fly` with index-aware delay**

Find the existing `<li class="entry">` block in the markup:

```svelte
<li class="entry">
    <Card {item} {ownerHandle} blobCtx={data.blobCtx} />
</li>
```

Replace with:

```svelte
<li
    class="entry"
    in:fly={{
        y: 8,
        duration: $prefersReducedMotion ? 0 : 200,
        delay: i >= staggerFromIndex
            ? Math.min(i - staggerFromIndex, 5) * 40
            : 0
    }}
>
    <Card {item} {ownerHandle} blobCtx={data.blobCtx} />
</li>
```

Note: the `each` block needs to expose the index `i`. The current form is `{#each items as item (item.uri)}`. Update it to `{#each items as item, i (item.uri)}` so we can use `i`.

- [ ] **Step 6: Type-check**

Run: `pnpm check`
Expected: passes.

- [ ] **Step 7: Verify**

Run: `pnpm dev`. Hard-reload home — initial items appear instantly (Svelte `in:` doesn't fire on hydrated content; no stagger on SSR'd cards). Click `load more →` — newly appended cards fade up with a 40ms staggered delay. Switch source filter (`bsky` → `blog`) — root cross-fade fires, no per-item stagger. Toggle reduced-motion — appended cards appear instantly.

- [ ] **Step 8: Commit**

```bash
git add src/routes/+page.svelte
git commit -m "feed: stagger fly-up on appended cards (loadMore)"
```

---

## Final verification

After Task 12:

- [ ] **Run the full test suite**

Run: `pnpm test`
Expected: all 31 test files / 229 tests pass. No new tests added in this plan.

- [ ] **Run the type checker**

Run: `pnpm check`
Expected: 0 errors, 0 warnings.

- [ ] **Manual full-pass smoke test**

Walk through every motion landing point:

1. Hover handles, link cards, sidebar cells — all fade rather than snap.
2. Toggle theme — root cross-fades.
3. Navigate `/` ↔ `/about` ↔ `/projects` ↔ `/blog/<post>` — all routes cross-fade.
4. Hard-reload any page with a hero — title/deck/avatar reveal in sequence.
5. Throttle to Slow 3G; reload `/` — feed images and link card thumbs fade in as bytes arrive. Open a blog post with a cover — cover fades.
6. Open the lightbox — overlay fades, image fades. Click prev/next — cross-fade. Close — fade out.
7. Go offline; click a different feed filter — `FeedError` flies up. Click `retry →` — flash. Go online; click retry — items return.
8. Click `load more →` — phosphor spinner rotates while in flight. New cards stagger in.
9. Toggle the OS `prefers-reduced-motion` — repeat all of the above. Every animation collapses to instant. Hero is visible instantly. Spinner glyph is static.
