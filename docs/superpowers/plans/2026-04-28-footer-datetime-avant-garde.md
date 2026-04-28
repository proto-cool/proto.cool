# Footer date/time + avant-garde terminal zhush — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a stardate-style date/time readout to the StatsPanel footer and refresh its typography toward "avant-garde terminal" (mixed register, italic display accents, alternating separators) without changing the right-side identity.

**Architecture:** Extend `runtime.ts` with a `dayOfYear` helper and a `stardate` derived store (year + DOY). Update `StatsPanel.svelte` markup, drop the `est` / `mode` segments, lowercase keys, swap the build value to italic display, alternate separators between `◆` and `▍`, and insert a bracketed date/time block subscribed to `clock` + `stardate`. Add a 1 Hz colon-blink keyframe gated under `prefers-reduced-motion: no-preference`. Adjust container-query rules so the new block degrades cleanly across breakpoints.

**Tech Stack:** SvelteKit 5 (runes mode, `$store` auto-subscription), TypeScript, Vitest + fake timers for time-dependent tests, CSS container queries (`container chrome`). Fonts: Departure Mono (pixel mono, base) and Lunema Sans (display, italic 400 cut available).

**Spec:** `docs/superpowers/specs/2026-04-28-footer-datetime-avant-garde-design.md`

---

## File Structure

- **Modify** `src/lib/shell/runtime.ts` — add `dayOfYear` helper and `stardate` derived store (additive; existing exports unchanged).
- **Modify** `src/lib/shell/runtime.test.ts` — add tests for the helper and the store.
- **Modify** `src/lib/shell/StatsPanel.svelte` — markup, styles, store subscription, colon-blink keyframe.

No new files. No theme-token changes. No `chrome.ts` changes. The right-side identity (`▷ {user}@{host}`) is untouched.

**Deviation from spec:** The spec asked for a new `stats-panel.test.ts` that renders the component and asserts on its DOM. The project currently has zero component-rendering tests (only pure-logic / store tests in `runtime.test.ts`, `theme-controls.test.ts`, etc.) and no rendering-test setup (`@testing-library/svelte` is not a dependency). Rather than introduce that infrastructure for one component, this plan splits the testable surface into **pure functions and stores** (`dayOfYear`, `stardate`) covered by unit tests in Tasks 1–2, and **visual rendering** covered by a manual-verification pass at four breakpoints in Task 10. This matches the project's existing testing pattern.

---

## Task 1: Add `dayOfYear` helper to runtime

**Files:**
- Modify: `src/lib/shell/runtime.ts`
- Modify: `src/lib/shell/runtime.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/lib/shell/runtime.test.ts`:

```ts
describe('dayOfYear', () => {
	it('returns 1 for January 1', async () => {
		const { dayOfYear } = await import('./runtime');
		expect(dayOfYear(new Date(2026, 0, 1))).toBe(1);
	});

	it('returns 118 for April 28 in a non-leap year (2026)', async () => {
		const { dayOfYear } = await import('./runtime');
		expect(dayOfYear(new Date(2026, 3, 28))).toBe(118);
	});

	it('returns 366 for December 31 in a leap year (2024)', async () => {
		const { dayOfYear } = await import('./runtime');
		expect(dayOfYear(new Date(2024, 11, 31))).toBe(366);
	});

	it('returns 60 for March 1 in a leap year (2024)', async () => {
		const { dayOfYear } = await import('./runtime');
		expect(dayOfYear(new Date(2024, 2, 1))).toBe(61);
	});
});
```

(Note: 2024-03-01 is Jan(31)+Feb(29)+1 = 61.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/shell/runtime.test.ts`
Expected: FAIL with `dayOfYear is not a function` (or "is not exported").

- [ ] **Step 3: Write minimal implementation**

Add to `src/lib/shell/runtime.ts`, after the existing imports and `SITE_ORIGIN` line:

```ts
// Local-time day-of-year (1–366). Operates on calendar fields rather than ms
// arithmetic so DST transitions don't shift the result by a day.
export function dayOfYear(d: Date): number {
	const monthDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
	const yr = d.getFullYear();
	const isLeap = (yr % 4 === 0 && yr % 100 !== 0) || yr % 400 === 0;
	if (isLeap) monthDays[1] = 29;
	const m = d.getMonth();
	let total = d.getDate();
	for (let i = 0; i < m; i++) total += monthDays[i];
	return total;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/shell/runtime.test.ts`
Expected: PASS — all four `dayOfYear` cases green, prior tests still green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/shell/runtime.ts src/lib/shell/runtime.test.ts
git commit -m "shell: add dayOfYear helper to runtime"
```

---

## Task 2: Add `stardate` derived store

**Files:**
- Modify: `src/lib/shell/runtime.ts`
- Modify: `src/lib/shell/runtime.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/lib/shell/runtime.test.ts`, inside the existing `describe('clock + uptime', ...)` or as a sibling describe — place it after the existing `clock` test so the fake-timer / `vi.setSystemTime` setup carries:

```ts
describe('stardate', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2026, 3, 28, 14, 32, 8));
	});
	afterEach(() => vi.useRealTimers());

	it('exposes year and DOY for the current local time', async () => {
		vi.resetModules();
		const { stardate } = await import('./runtime');
		const value = get(stardate);
		expect(value.year).toBe(2026);
		expect(value.doy).toBe(118);
	});

	it('zero-pads DOY to 3 chars in `doyLabel`', async () => {
		vi.resetModules();
		const { stardate } = await import('./runtime');
		expect(get(stardate).doyLabel).toBe('118');
	});
});
```

Then a second describe block to verify zero-padding for early-year values:

```ts
describe('stardate (early year)', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2026, 0, 5, 0, 0, 0));
	});
	afterEach(() => vi.useRealTimers());

	it('zero-pads single-digit DOY (`5` → `005`)', async () => {
		vi.resetModules();
		const { stardate } = await import('./runtime');
		expect(get(stardate).doy).toBe(5);
		expect(get(stardate).doyLabel).toBe('005');
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/shell/runtime.test.ts`
Expected: FAIL with `stardate is not a function` / not exported.

- [ ] **Step 3: Write minimal implementation**

Add to `src/lib/shell/runtime.ts`, after the existing `uptime` export:

```ts
// Stardate readout: year + day-of-year, derived from `now` so it ticks alongside
// the clock. `doyLabel` is zero-padded to 3 chars (always renders as `D###`).
export const stardate: Readable<{ year: number; doy: number; doyLabel: string }> = derived(
	now,
	($n) => {
		const doy = dayOfYear($n);
		return {
			year: $n.getFullYear(),
			doy,
			doyLabel: String(doy).padStart(3, '0')
		};
	}
);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/shell/runtime.test.ts`
Expected: PASS — three new tests green; clock/uptime/dayOfYear/pwdForPath all still green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/shell/runtime.ts src/lib/shell/runtime.test.ts
git commit -m "shell: add stardate store (year + zero-padded DOY)"
```

---

## Task 3: Drop `est` and `mode` segments

**Files:**
- Modify: `src/lib/shell/StatsPanel.svelte`

- [ ] **Step 1: Open the file and locate the two segments**

In `src/lib/shell/StatsPanel.svelte`, the markup currently contains six `.seg` spans inside `.line`. Find these two lines (currently at the top of `<script>`):

```ts
const VOL = '02';
const ISSUE = '04';
const EST = 'MMXXVI';
const MODE_LABEL = 'ARCHIVE';
```

And these two segments inside the `<span class="line">`:

```svelte
<span class="seg"><span class="k">est</span><span class="v">{EST}</span></span>
```

```svelte
<span class="seg"><span class="k">mode</span><span class="v">{MODE_LABEL}</span></span>
```

- [ ] **Step 2: Remove the two segments and their consts**

Delete the `EST` and `MODE_LABEL` const declarations. Delete both `<span class="seg">…</span>` lines (the est segment and the mode segment).

The `.line` block should now contain four segments in this order: vol, no, net, build.

- [ ] **Step 3: Update the responsive rule that hid segment 6**

In the `<style>` block, find:

```css
@container chrome (max-width: 1023px) {
	/* ... */
	.line .seg:nth-child(n + 6) {
		display: none;
	}
}
```

Now there is no 6th segment. This rule becomes a no-op but is also misleading — replace it. We will reuse this breakpoint later to hide the `build` segment (Task 9). For now, **delete** the `.line .seg:nth-child(n + 6) { display: none; }` block. (It will be re-added with different selectors in Task 9.)

Similarly, find:

```css
@container chrome (max-width: 767px) {
	/* ... */
	.line .seg:nth-child(n + 4) {
		display: none;
	}
}
```

Delete this block too — Task 9 will re-add the narrow-breakpoint behavior with selectors that account for the new structure.

- [ ] **Step 4: Verify type-check passes**

Run: `npm run check`
Expected: no new errors. (If `EST` or `MODE_LABEL` are referenced elsewhere they would error — they aren't.)

- [ ] **Step 5: Commit**

```bash
git add src/lib/shell/StatsPanel.svelte
git commit -m "shell: stats — drop EST and MODE segments"
```

---

## Task 4: Lowercase keys (override panel-level `text-transform`)

**Files:**
- Modify: `src/lib/shell/StatsPanel.svelte`

The key strings in markup (`vol`, `no`, `net`, `build`) are already written lowercase; they only render uppercase because `.stats-panel` sets `text-transform: uppercase` and the rule cascades. We override on `.k`.

- [ ] **Step 1: Edit the `.k` rule**

In the `<style>` block, find:

```css
.k {
	color: var(--hal-dim);
}
```

Replace with:

```css
.k {
	color: var(--hal-dim);
	text-transform: none;
	letter-spacing: 0.16em;
}
```

The `letter-spacing: 0.16em` slightly tightens the lowercase keys vs. the panel default (0.2em uppercase tracking) — lowercase wants less tracking to read at the same density.

- [ ] **Step 2: Verify type-check passes**

Run: `npm run check`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/shell/StatsPanel.svelte
git commit -m "shell: stats — lowercase keys (override panel uppercase)"
```

---

## Task 5: Italic display accent on `build` value

**Files:**
- Modify: `src/lib/shell/StatsPanel.svelte`

- [ ] **Step 1: Add `build-hex` class to the build value span**

Find the build segment:

```svelte
<span class="seg"
	><span class="k">build</span><span class="v"
		>0x{chrome.system.sig.toUpperCase().slice(0, 4)}</span
	></span
>
```

Replace with:

```svelte
<span class="seg"
	><span class="k">build</span><span class="v build-hex"
		>0x{chrome.system.sig.toUpperCase().slice(0, 4)}</span
	></span
>
```

- [ ] **Step 2: Add `.build-hex` styling**

In the `<style>` block, after the `.v.warm` rule, add:

```css
.v.build-hex {
	font-family: var(--font-display);
	font-style: italic;
	font-weight: 400;
	font-size: 12px;
	letter-spacing: 0.02em;
	text-transform: none;
	line-height: 1;
	transform: translateY(-0.5px);
}
```

The font swap from Departure Mono (10px pixel) to Lunema Sans 400 italic at 12px keeps the optical x-height roughly aligned with the surrounding mono. The `translateY(-0.5px)` pulls it back onto the baseline of the row (display italic baselines tend to sit slightly lower than the pixel mono cap-line).

- [ ] **Step 3: Verify type-check passes**

Run: `npm run check`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/shell/StatsPanel.svelte
git commit -m "shell: stats — italic display accent on build hex"
```

---

## Task 6: Alternating separators (◆ / ▍)

**Files:**
- Modify: `src/lib/shell/StatsPanel.svelte`

After Task 3 the segments are: 1=vol, 2=no, 3=net, 4=build. Three separators sit between them. We want `◆ ▍ ◆` (alternating, starting with ◆).

- [ ] **Step 1: Edit the separator rule**

Find the existing rule:

```css
.seg + .seg::before {
	content: '◆';
	color: var(--hal-deep-dim);
	font-size: 7px;
	line-height: 1;
	margin-right: 14px;
	margin-left: -14px;
	align-self: center;
}
```

Append a sibling rule directly after it:

```css
.line .seg + .seg:nth-of-type(odd)::before {
	content: '▍';
	font-size: 9px;
	margin-right: 13px;
	margin-left: -13px;
}
```

How this lands across the four segments:

- seg 2 (no) — even, default rule wins → `◆`
- seg 3 (net) — odd AND has preceding `.seg` → override wins → `▍`
- seg 4 (build) — even, default rule wins → `◆`

Result: `vol ◆ no ▍ net ◆ build`.

- [ ] **Step 2: Verify type-check passes**

Run: `npm run check`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/shell/StatsPanel.svelte
git commit -m "shell: stats — alternate separators between ◆ and ▍"
```

---

## Task 7: Add bracketed date/time block

**Files:**
- Modify: `src/lib/shell/StatsPanel.svelte`

- [ ] **Step 1: Subscribe to the runtime stores**

In the `<script>` block of `StatsPanel.svelte`, the current imports are:

```ts
import { getContext } from 'svelte';
import type { ChromeData } from './chrome';

const chrome = getContext<ChromeData>('chrome');
```

Append:

```ts
import { clock, stardate } from './runtime';
```

(The component will use `$clock` and `$stardate` reactively in the template. Svelte 5 supports `$store` auto-subscription on imported stores in runes mode.)

- [ ] **Step 2: Add the date/time block markup**

Inside `<span class="line">`, immediately after the `build` segment (which is the last `.seg`), add:

```svelte
<span class="dt-block">
	<span class="bracket">⟨</span>
	<span class="dt-year">{$stardate.year}·</span><span class="dt-doy"
		>D{$stardate.doyLabel}</span
	><span class="dt-mid"> · </span><span class="dt-time"
		>{$clock.time.slice(0, 2)}<span class="colon">:</span>{$clock.time.slice(
			3,
			5
		)}<span class="dt-sec"><span class="colon">:</span>{$clock.time.slice(6, 8)}</span></span
	>
	<span class="bracket">⟩</span>
</span>
```

The slicing relies on `$clock.time` always being `HH:MM:SS` (which the existing derivation guarantees — it pads with leading zeros).

- [ ] **Step 3: Add base styles for the block**

In the `<style>` block, after the `.v.build-hex` rule, add:

```css
.dt-block {
	display: inline-flex;
	align-items: center;
	white-space: nowrap;
	gap: 0;
	margin-left: 4px;
	color: var(--hal-bone);
	letter-spacing: 0.16em;
}
.dt-block .bracket {
	font-family: var(--font-display);
	font-style: italic;
	font-weight: 400;
	font-size: 13px;
	line-height: 1;
	color: var(--hal-warm);
	margin: 0 6px;
	transform: translateY(-0.5px);
}
.dt-block .dt-doy {
	color: var(--hal-cool);
}
.dt-block .dt-mid {
	color: var(--hal-deep-dim);
}
.dt-block .colon {
	color: var(--hal-bone);
}
```

- [ ] **Step 4: Verify type-check passes**

Run: `npm run check`
Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/shell/StatsPanel.svelte
git commit -m "shell: stats — bracketed stardate/clock block"
```

---

## Task 8: Colon-blink keyframe (with reduced-motion gate)

**Files:**
- Modify: `src/lib/shell/StatsPanel.svelte`

- [ ] **Step 1: Add the keyframe and the gated animation**

In the `<style>` block (anywhere — keyframes can sit at the bottom), add:

```css
@keyframes dt-colon-blink {
	0%,
	49% {
		opacity: 1;
	}
	50%,
	100% {
		opacity: 0.35;
	}
}

@media (prefers-reduced-motion: no-preference) {
	.dt-block .colon {
		animation: dt-colon-blink 1s steps(1, end) infinite;
	}
}
```

The `steps(1, end)` timing function gives the colon an instantaneous flip rather than a fade — closer to the CRT/terminal feel. Reduced-motion users see a static colon (the `@media` query gates the animation entirely).

- [ ] **Step 2: Verify type-check passes**

Run: `npm run check`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/shell/StatsPanel.svelte
git commit -m "shell: stats — 1Hz colon blink, reduced-motion gated"
```

---

## Task 9: Responsive container-query rules

**Files:**
- Modify: `src/lib/shell/StatsPanel.svelte`

The `.line` now contains four `.seg` (vol, no, net, build) plus one `.dt-block`. We need to:

- ≤1023: hide `build` segment first; keep date/time full.
- ≤767: hide squares (already does), hide vol + no, hide year, hide seconds. Show `net atproto · ⟨D118 · 14:32⟩`.
- ≤479: hide DOY and the `·` between DOY and time, leaving only `⟨14:32⟩`.

`.seg:nth-of-type` is now zero-collisions because the `.dt-block` is not a `.seg`.

- [ ] **Step 1: Update the 1023-and-below container query**

Find the existing block:

```css
@container chrome (max-width: 1023px) {
	.stats-panel {
		padding: 6px 14px;
		gap: 12px;
	}
	.line {
		gap: 12px;
	}
	.seg + .seg::before {
		margin-right: 12px;
		margin-left: -12px;
	}
}
```

Append inside it (after the existing `.seg + .seg::before` rule):

```css
	.line .seg:nth-of-type(4) {
		display: none; /* hide `build` */
	}
```

Also adjust the alternating-separator margins so the override matches:

```css
	.line .seg + .seg:nth-of-type(odd)::before {
		margin-right: 11px;
		margin-left: -11px;
	}
```

- [ ] **Step 2: Update the 767-and-below container query**

Find the existing block:

```css
@container chrome (max-width: 767px) {
	.stats-panel {
		gap: 10px;
		padding: 6px 12px;
	}
	.shapes-l {
		display: none;
	}
	.line {
		justify-content: flex-start;
		gap: 10px;
	}
	.seg + .seg::before {
		margin-right: 10px;
		margin-left: -10px;
	}
	.ident .who {
		display: none;
	}
}
```

Append inside it:

```css
	.line .seg:nth-of-type(1),
	.line .seg:nth-of-type(2) {
		display: none; /* hide `vol` and `no` */
	}
	/* Only `net` remains as a visible .seg here; clear separator content so
	   we don't end up with a dangling `▍` rendered before `net atproto`. */
	.line .seg + .seg::before,
	.line .seg + .seg:nth-of-type(odd)::before {
		content: '';
		margin: 0;
	}
	.dt-block .dt-year,
	.dt-block .dt-sec {
		display: none; /* drop year + seconds */
	}
	.dt-block {
		margin-left: 0;
	}
```

- [ ] **Step 3: Add a new 479-and-below container query**

After the 767 block, add a new block (the project does not yet have a 479 breakpoint inside StatsPanel):

```css
@container chrome (max-width: 479px) {
	.line .seg:nth-of-type(3) {
		display: none; /* hide `net atproto` */
	}
	.dt-block .dt-doy,
	.dt-block .dt-mid {
		display: none; /* drop DOY + middle separator → ⟨14:32⟩ */
	}
}
```

- [ ] **Step 4: Verify type-check + lint**

Run: `npm run check && npm run lint`
Expected: no new errors. (Prettier may reformat the new CSS — that's fine; commit any reformat together.)

- [ ] **Step 5: Commit**

```bash
git add src/lib/shell/StatsPanel.svelte
git commit -m "shell: stats — responsive rules for new structure"
```

---

## Task 10: Manual visual verification

**Files:** none (verification only)

This is the project's substitute for component-rendering tests. Each width gets a quick eyeball check; any layout regression is fixed before claiming complete.

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`
Expected: Vite dev server starts on a localhost port (project default).

- [ ] **Step 2: Verify the wide layout (≥1024px)**

Open the site in a browser at >1024px viewport width.
Confirm visually:

- Left: 5 squares (3 filled lime, 2 empty), unchanged.
- Center: `vol 02 ◆ no 04 ▍ net atproto ◆ build 0x___ ⟨ 2026·D### · HH:MM:SS ⟩`
  - Keys (`vol`, `no`, `net`, `build`) are lowercase and dim.
  - Values are uppercase bone, except `atproto` (cool teal) and `0x____` (italic display, slightly larger optical size).
  - First and third separators are `◆`, middle is `▍`.
  - Brackets `⟨ ⟩` are display italic, warm color.
  - Year prefix and time are bone; DOY (`D###`) is cool; middle separator `·` is dim.
  - Colons in the time blink once per second (toggle visible — not a fade).
- Right: `▷ {user}@{host}` (e.g. `▷ protocol7@helios`). Unchanged.

If any of the above fails, fix it before continuing.

- [ ] **Step 3: Verify the medium layout (768–1023px)**

Resize to ~900px wide.
Confirm:

- Build segment (`build 0x___`) is hidden.
- Strip reads: squares · vol · no · net · `⟨ stardate · clock ⟩` · `▷ identity`.
- Date/time block remains full (year + DOY + seconds visible).

- [ ] **Step 4: Verify the narrow layout (≤767px)**

Resize to ~600px wide.
Confirm:

- Squares are hidden.
- vol and no segments are hidden.
- Strip reads: `net atproto · ⟨ D### · HH:MM ⟩ · ▷` (no who text).
- Year prefix is gone.
- Seconds and the second colon are gone.
- The first colon (between H and M) still blinks.

- [ ] **Step 5: Verify the tiny layout (≤479px)**

Resize to ~380px wide (or use device emulation).
Confirm:

- Strip reads: `⟨ HH:MM ⟩ · ▷`.
- DOY is gone.
- Middle separator `·` is gone.
- net atproto is gone.

- [ ] **Step 6: Verify reduced motion**

In browser devtools, set "Emulate CSS prefers-reduced-motion: reduce" (Chrome: Rendering panel; Firefox: Inspector → Settings).
Confirm:

- Colon does NOT blink. Stays solid.
- All other rendering unchanged.

- [ ] **Step 7: Run the full test + check + lint pass**

Run: `npm test && npm run check && npm run lint`
Expected: all green.

- [ ] **Step 8: Commit (only if visual fixes were needed in steps 2–6)**

If any of the verification steps required code adjustments, commit them now:

```bash
git add src/lib/shell/StatsPanel.svelte
git commit -m "shell: stats — visual fixes from manual verification"
```

If no fixes were needed, skip this step.

---

## Done

All nine implementation tasks plus visual verification complete. The footer strip now carries a stardate/clock readout, the typography mixes lowercase mono keys with two italic display accents (the build hex and the bracket pair), the separator rhythm is broken by alternating glyphs, and the right-side identity is untouched. Reduced-motion users get a static colon. Every breakpoint degrades to a sensible subset of the strip without overflow.
