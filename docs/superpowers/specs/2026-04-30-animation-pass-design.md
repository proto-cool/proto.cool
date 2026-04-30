# Animation Pass — Design

Date: 2026-04-30
Scope: Polish existing motion (a), functional feedback motion (b), route transitions (d) + a hero reveal. Signature/brand motion (c) and content tasks are explicitly out of scope.

## Goal

Tighten and extend the site's motion vocabulary so state changes, navigation, and content reveals feel deliberate rather than abrupt. Stay within the existing terminal/phosphor aesthetic — no flashy choreography. Respect `prefers-reduced-motion` everywhere.

## What's in / what's out

In:
- Motion tokens (durations + easings) centralized in `tokens.css`.
- Hover transitions added where new rules from the polish pass left snap-cuts (`.handle`, `.link-card`, sidebar `.cell`).
- Theme switch cross-fade via View Transitions API.
- Reduced-motion guard for the View Transitions root rule plus per-transition overrides.
- Image fade-in (200ms) for `ImageGrid`, `LinkCard`, blog cover.
- Lightbox enter/exit + prev/next swap.
- `LoadMore` spinner using a phosphor `<CircleNotch>` glyph (rotates at 1Hz).
- `FeedError` enter motion (fly-up).
- Retry button press feedback.
- Route-level page transitions via SvelteKit's `onNavigate` + `document.startViewTransition`.
- Hero reveal on first paint — staggered title/deck/avatar fade-up.
- Feed card stagger on `loadMore` (and any client-only insertions).

Out (deferred):
- Mobile/responsive pass.
- Signature/brand motion: halo pulse, scanline reveals, avatar boot sequence.
- `/about` and `/projects` content build-out.

## Design decisions

### 1. Motion tokens

Add to `src/lib/theme/tokens.css`:

```css
--ease-snap: cubic-bezier(0.2, 0, 0, 1);
--dur-fast: 100ms;
--dur-base: 220ms;
--dur-slow: 380ms;
```

Existing transitions stay as-is unless we're already editing the rule. New motion uses tokens by reference.

### 2. Snap-fix hovers

Add `transition: <prop> var(--dur-fast) ease` to three rules introduced (or surfaced) in the polish pass:

- `MicropostCard` `.head .handle` — `color, text-decoration-color`
- `RepostCard` `.handle` — `color, text-decoration-color`
- `LinkCard` `.link-card` — `border-color`
- `Sidebar` `.cell` — `border-color`

### 3. Theme switch cross-fade

`src/lib/shell/theme-controls.ts` exports `setTheme(themeId)`. Wrap the body of that function in `document.startViewTransition(() => { …existing logic… })` when available, fall through to direct mutation otherwise.

The existing `::view-transition-old(root)` / `::view-transition-new(root)` rule in `src/routes/+page.svelte:336-339` (220ms ease) already provides a usable cross-fade. Move that rule into a global stylesheet (`src/app.css`) so theme switches and route transitions both pick it up.

### 4. Reduced-motion guard

In `src/app.css`, after the View Transitions rule, add:

```css
@media (prefers-reduced-motion: reduce) {
  ::view-transition-old(root),
  ::view-transition-new(root) { animation-duration: 0s; }
}
```

Each new transition added in this pass also carries a `@media (prefers-reduced-motion: reduce)` override that zeros the relevant duration / disables the animation.

### 5. Image fade-in

Pattern (same in three components):

```svelte
<img
  class:loaded
  src={…}
  onload={() => (loaded = true)}
/>
```

```css
img { opacity: 0; transition: opacity var(--dur-base) ease; }
img.loaded { opacity: 1; }
@media (prefers-reduced-motion: reduce) { img { opacity: 1; transition: none; } }
```

Apply in:
- `src/lib/feed/ImageGrid.svelte` — `.fg` images. `loaded` is per-image (Map keyed by `key`, mirroring the existing `aspects` pattern).
- `src/lib/feed/LinkCard.svelte` — `.thumb img`.
- `src/routes/blog/[...path]/+page.svelte` — `.hero img` (single image — `let coverLoaded = $state(false);` is enough).

`Lightbox` images do not get this treatment — the lightbox handles its own enter motion (decision 6).

### 6. Lightbox enter/exit + prev/next swap

In `src/lib/feed/Lightbox.svelte`:

- Overlay: `transition:fade={{ duration: 200 }}` (Svelte built-in). Replaces the current instant mount/unmount.
- Image: `transition:scale={{ start: 0.96, opacity: 0.6, duration: 200, easing: cubicOut }}`. Imported from `svelte/easing`.
- Prev/next swap: key the `<img>` by `current.src`, apply `transition:fade={{ duration: 120 }}`. Svelte will cross-fade old → new on each index change.

Reduced motion: bypass transitions entirely (no fade, no scale).

### 7. `LoadMore` spinner

In `src/lib/feed/LoadMore.svelte`:

- Replace the literal `'loading…'` text in the button with `<CircleNotch size={14} weight="regular" /> loading` (icon + label).
- Add `@keyframes rotate { to { transform: rotate(360deg); } }` and apply to the icon when in the loading state: `.btn[disabled] :global(.spin) { animation: rotate 1s linear infinite; }`.
- Reduced motion: drop `:global(.spin)` animation; static glyph stays.

The button keeps its existing focus / hover treatment.

### 8. `FeedError` enter

In `src/lib/feed/FeedError.svelte`:

- The component's outer `<p>` gets `in:fly={{ y: 8, duration: 200 }}` (Svelte built-in).
- No `out:` — when items load successfully, the parent removes the component, instant by design (don't draw attention away from the new content).
- Reduced motion: no fly.

### 9. Retry button press feedback

Add to `.retry` in `FeedError.svelte`:

```css
.retry:active { color: var(--color-hot); }
```

Instant tone bump on press. Provides tactile feedback before the latency of the actual retry kicks in. Pure CSS, no transition needed (active is the press, not a return).

### 10. Route transitions

In `src/routes/+layout.svelte`, add:

```ts
import { onNavigate } from '$app/navigation';

onNavigate((navigation) => {
  if (typeof document === 'undefined' || !('startViewTransition' in document)) return;
  return new Promise((resolve) => {
    (document as Document & { startViewTransition: (cb: () => Promise<void>) => unknown })
      .startViewTransition(async () => {
        resolve();
        await navigation.complete;
      });
  });
});
```

The same global `::view-transition-old/new(root)` rule (decision 3) provides the cross-fade. Browsers without View Transitions support get instant navigation as today.

### 11. Hero reveal

In `src/lib/shell/HeroSection.svelte`:

- Add `let revealed = $state(false);` and `onMount(() => { revealed = true; });`.
- Wrap the title fragments, deck slot, and avatar/identity element in elements that gain a `.revealed` class when the state flips.
- CSS:
  ```css
  .reveal { opacity: 0; transform: translateY(8px); transition: opacity 240ms ease-out, transform 240ms ease-out; }
  .reveal.revealed { opacity: 1; transform: translateY(0); }
  .reveal.delay-1 { transition-delay: 80ms; }
  .reveal.delay-2 { transition-delay: 160ms; }
  ```
- Title gets no delay class, deck gets `delay-1`, avatar/identity gets `delay-2`.
- Reduced motion: `.reveal { opacity: 1; transform: none; transition: none; }`.

This avoids Svelte's `in:` directive because that fires on hydration too — we want the `onMount` flip so the SSR'd HTML is visible immediately and only the *transition* runs once on the client.

(Implementation detail: if SSR already paints the hero with the elements at `opacity: 1`, the client mount will briefly snap them to 0 before the transition starts. Mitigate by adding the initial `opacity: 0` only when JS is available — e.g. set the initial state to `revealed = !browser` so SSR renders with the revealed class, and the client immediately re-evaluates `onMount`. We can refine in implementation; if it's flickery, we accept a one-frame snap or move to `in:fly` with a guard.)

### 12. Feed card stagger

In `src/routes/+page.svelte`, the `<li class="entry">` block gains:

```svelte
<li class="entry" in:fly|local={{ y: 8, duration: 200, delay: Math.min(i, 5) * 40 }}>
```

The `|local` modifier prevents transitions from running when the each block's parent is destroyed/re-mounted (e.g. during a View-Transitions-captured filter swap). New items inserted via `loadMore` fire normally with a per-index delay, capped at 6 staggered slots so even a large append doesn't take too long.

If `|local` semantics turn out to misfire (e.g. filter swap still triggers per-item stagger), fall back to a `staggerFromIndex` state set explicitly in `loadMore`, and gate the `in:` directive accordingly. Implementation can pick the working path; both produce the same visible result.

Reduced motion: Svelte transitions don't auto-respect the OS preference. Gate the `in:fly` directive with a `prefersReducedMotion` derived flag — either a small store (`$lib/shell/runtime.ts`-adjacent) or an inline `matchMedia` check on mount. The same flag short-circuits the Svelte-transition uses in `Lightbox` (decision 6) and `FeedError` (decision 8). The CSS-driven transitions (image fade-in, hover transitions, hero reveal, theme cross-fade) use `@media (prefers-reduced-motion: reduce)` blocks instead.

## Components / files touched

New (possibly):
- `src/lib/prefers-reduced-motion.ts` (or similar) — a tiny store/helper exposing the OS reduced-motion preference for the JS-driven transitions in `Lightbox`, `FeedError`, and the feed stagger. If implementation prefers an inline `matchMedia` check per component, no new file is needed.

Edited:
- `src/lib/theme/tokens.css` — add motion tokens.
- `src/app.css` — global `::view-transition` cross-fade + reduced-motion guard.
- `src/lib/feed/MicropostCard.svelte` — handle hover transition.
- `src/lib/feed/RepostCard.svelte` — handle hover transition.
- `src/lib/feed/LinkCard.svelte` — border hover transition + image fade-in.
- `src/lib/feed/Sidebar.svelte` — cell border transition.
- `src/lib/feed/ImageGrid.svelte` — per-image fade-in.
- `src/lib/feed/Lightbox.svelte` — overlay/image enter, prev/next swap.
- `src/lib/feed/LoadMore.svelte` — spinner glyph + rotate keyframe.
- `src/lib/feed/FeedError.svelte` — fly-in + retry active state.
- `src/lib/shell/HeroSection.svelte` — reveal cascade.
- `src/lib/shell/theme-controls.ts` — wrap `setTheme` in View Transitions.
- `src/routes/+layout.svelte` — `onNavigate` route transition wiring.
- `src/routes/+page.svelte` — feed `<li>` stagger; remove the local view-transition CSS rule (now global in `app.css`).
- `src/routes/blog/[...path]/+page.svelte` — cover image fade-in.

## Testing

Visual / manual:
- Hover the new clickable handles, link card, sidebar cells — colors/borders fade rather than snap.
- Toggle theme — root cross-fades over 220ms (or instant under reduced motion).
- Navigate between /, /about, /projects, /blog/[slug] — same root cross-fade.
- Hard-reload home in DevTools with Cache disabled — hero title/deck/avatar reveal in sequence.
- Throttle network to Slow 3G — image cards/blog cover fade in as bytes arrive (not a hard pop).
- Open the lightbox — overlay fades, image scales up. Click prev/next — image cross-fades. Close — reverse.
- Trigger a feed fetch error in DevTools — `FeedError` flies in. Click retry — color flashes. Resolve — error disappears, content arrives.
- Click `LoadMore` — phosphor spinner rotates at 1Hz. New cards stagger in.
- Toggle the OS reduced-motion setting and re-test — every animation collapses to instant.

No new unit tests required — these are visual/integration concerns. If `setTheme`'s View Transitions wrapper grows non-trivial logic, a small test there.

## Out-of-scope reminders

- Mobile pass owns: hit targets, NavPanel narrow widths, lightbox crowding.
- Content task owns: `/about`, `/projects` build-out.
- Signature/brand motion (halo pulse, scanline, avatar boot) is explicitly deferred.
