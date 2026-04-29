# Hazardpunk theme — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `hazardpunk` color family (dark + light variants) to the theme registry. Once registered, the existing `ThemeControls.svelte` and `resolveThemeFor` pick it up automatically.

**Architecture:** Mirror the structure used for `phosphor-green` and `synthwave`. Add two registry entries, a new CSS file with `[data-theme='hazardpunk-dark']` and `[data-theme='hazardpunk-light']` selector blocks (plus a reduced-motion rule), and a single `@import` in `src/app.css`. No code changes to controls, resolver, cookies, or modes.

**Tech Stack:** Svelte 5, vanilla CSS custom properties, Vitest.

**Spec:** `docs/superpowers/specs/2026-04-28-hazardpunk-theme-design.md`

---

## File map

| File | Change | Responsibility |
| --- | --- | --- |
| `src/lib/theme/registry.test.ts` | modify | assert both hazardpunk ids exist |
| `src/lib/theme/registry.ts` | modify | add 2 entries (`hazardpunk-dark`, `hazardpunk-light`) |
| `src/lib/theme/themes/hazardpunk.css` | create | both variant token blocks + reduced-motion rule |
| `src/app.css` | modify | import the new theme css under `layer(themes)` |

---

## Task 1: Failing test for hazardpunk registry entries

**Files:**
- Modify: `src/lib/theme/registry.test.ts`

- [ ] **Step 1: Add the failing test**

Insert this `it(...)` block immediately after the existing `'contains both synthwave variants'` test:

```ts
it('contains both hazardpunk variants', () => {
    const ids = themes.map((t) => t.id);
    expect(ids).toContain('hazardpunk-dark');
    expect(ids).toContain('hazardpunk-light');
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `pnpm vitest run src/lib/theme/registry.test.ts`

Expected: the new `'contains both hazardpunk variants'` test FAILS (the first `toContain` throws because the array does not contain `hazardpunk-dark`). All other tests in the file pass.

- [ ] **Step 3: Commit**

```bash
git add src/lib/theme/registry.test.ts
git commit -m "test: assert hazardpunk variants in theme registry"
```

---

## Task 2: Register hazardpunk family entries

**Files:**
- Modify: `src/lib/theme/registry.ts`

- [ ] **Step 1: Append two entries to the `themes` array**

The current `themes` array has four entries (the two phosphor-green and the two synthwave). Append two more entries inside the array, after the synthwave entries, so the array reads:

```ts
{
    id: 'synthwave-light',
    family: 'synthwave',
    familyName: 'Synthwave',
    variant: 'light',
    palette: {
        hot: '#c41a8f',
        warm: '#e0438f',
        cool: '#0e8fa3'
    }
},
{
    id: 'hazardpunk-dark',
    family: 'hazardpunk',
    familyName: 'Hazardpunk',
    variant: 'dark',
    palette: {
        hot: '#ff6b1a',
        warm: '#c2330d',
        cool: '#ffcc00'
    }
},
{
    id: 'hazardpunk-light',
    family: 'hazardpunk',
    familyName: 'Hazardpunk',
    variant: 'light',
    palette: {
        hot: '#cc4400',
        warm: '#8b1c0a',
        cool: '#aa7700'
    }
}
```

(That snippet shows the synthwave-light entry only as an anchor — do NOT modify the existing four entries. Only add the two new objects.)

Do NOT add `default: true` to either hazardpunk entry. `phosphor-green-dark` keeps the default flag.

- [ ] **Step 2: Run the registry tests**

Run: `pnpm vitest run src/lib/theme/registry.test.ts`

Expected: ALL tests pass, including the previously-failing `'contains both hazardpunk variants'` and the structural checks (`'every entry has family, familyName, variant, palette'`, `'exactly one entry is marked default'`, `'every id is unique'`).

- [ ] **Step 3: Run the resolver tests too**

Run: `pnpm vitest run src/lib/theme/resolve.test.ts`

Expected: all tests pass (the resolver iterates the registry; adding entries should be neutral).

- [ ] **Step 4: Type-check**

Run: `pnpm check`

Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/theme/registry.ts
git commit -m "theme: register hazardpunk-dark and hazardpunk-light entries"
```

---

## Task 3: Create the hazardpunk token CSS file

**Files:**
- Create: `src/lib/theme/themes/hazardpunk.css`

- [ ] **Step 1: Write the file**

Create `src/lib/theme/themes/hazardpunk.css` with the contents below. The file uses **TAB** indentation to match the sibling files (`phosphor-green.css`, `synthwave.css`). The markdown below renders as 4-space; convert to tabs when writing.

The dither tile data URIs use `%23ff6b1a` (URL-encoded `#ff6b1a`) for the dark variant and `%23cc4400` for the light variant.

```css
/* src/lib/theme/themes/hazardpunk.css
 * Third family. HEV-suit / radiation-sign vibe.
 * Dark variant: hazard orange + blood-rust + caution yellow on
 * warm-tinted black. The trio is ALL-WARM by design — no cool color
 * in the palette, the "cool slot" is caution yellow.
 * Light variant: a daylight reinterpretation — construction-manual
 * ink (deep rust, oxblood, dark amber) on coated cream paper.
 * Glows punch through on paper, like the other light variants.
 */

[data-theme='hazardpunk-dark'] {
    /* ---- halogen palette (orange-dominant, all-warm) ---- */
    --hal-anthra: #0a0604;
    --hal-anthra-2: #120a06;
    --hal-anthra-3: #1a0e07;
    --hal-edge: #3d251a;
    --hal-warm: #c2330d;
    --hal-hot: #ff6b1a;
    --hal-ember: #ff9a4d;
    --hal-bone: #ffe8d0;
    --hal-dim: #a87858;
    --hal-deep-dim: #3d2a1d;
    --hal-cool: #ffcc00;

    /* ---- legacy aliases (so existing color-* consumers keep working) ---- */
    --color-bg: var(--hal-anthra);
    --color-surface: var(--hal-anthra-2);
    --color-surface-2: var(--hal-anthra-3);
    --color-edge: var(--hal-edge);
    --color-fg: var(--hal-bone);
    --color-fg-dim: var(--hal-dim);
    --color-fg-mute: var(--hal-deep-dim);
    --color-accent: var(--hal-hot);
    --color-accent-2: var(--hal-cool);
    --color-on-accent: var(--hal-anthra);
    --color-link: var(--hal-bone);
    --color-link-visited: var(--hal-dim);
    --color-focus: var(--hal-hot);

    /* ---- glow tokens (orange vocabulary) ---- */
    --glow-text:
        0 0 1px rgba(255, 232, 208, 0.95), 0 0 6px rgba(255, 107, 26, 0.55),
        0 0 22px rgba(255, 107, 26, 0.3);
    --glow-edge:
        0 0 0 1px rgba(255, 107, 26, 1), 0 0 12px rgba(255, 107, 26, 0.45),
        0 0 4px rgba(255, 107, 26, 0.55);
    --glow-panel: inset 0 1px 0 rgba(255, 107, 26, 0.1), 0 6px 22px rgba(0, 0, 0, 0.55);
    --glow-pip: 0 0 6px var(--hal-hot), 0 0 16px rgba(194, 51, 13, 0.7);
    --glow-focus:
        0 0 0 1px var(--hal-hot), 0 0 0 3px rgba(255, 107, 26, 0.4),
        0 0 14px rgba(255, 107, 26, 0.55);
    --glow-pulse: pulse-phosphor 2.4s var(--ease-in-out) infinite;

    /* ---- shell veils — translucent backdrops for fixed strips ---- */
    --shell-veil: rgba(10, 6, 4, 0.6);
    --shell-veil-strong: rgba(10, 6, 4, 0.72);

    /* ---- dither tiles — hazard-orange override.
       Defaults in tokens.css are lime, which would bleed through onto
       the orange surfaces in InstrumentCluster and Halo. ---- */
    --dither-sparse: url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4' shape-rendering='crispEdges'%3E%3Crect x='0' y='0' width='1' height='1' fill='%23ff6b1a'/%3E%3Crect x='2' y='2' width='1' height='1' fill='%23ff6b1a'/%3E%3C/svg%3E");
    --dither-medium: url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4' shape-rendering='crispEdges'%3E%3Crect x='0' y='0' width='1' height='1' fill='%23ff6b1a'/%3E%3Crect x='2' y='0' width='1' height='1' fill='%23ff6b1a'/%3E%3Crect x='2' y='2' width='1' height='1' fill='%23ff6b1a'/%3E%3Crect x='0' y='2' width='1' height='1' fill='%23ff6b1a'/%3E%3C/svg%3E");
    --dither-dense: url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4' shape-rendering='crispEdges'%3E%3Crect x='0' y='0' width='1' height='1' fill='%23ff6b1a'/%3E%3Crect x='2' y='0' width='1' height='1' fill='%23ff6b1a'/%3E%3Crect x='1' y='1' width='1' height='1' fill='%23ff6b1a'/%3E%3Crect x='3' y='1' width='1' height='1' fill='%23ff6b1a'/%3E%3Crect x='2' y='2' width='1' height='1' fill='%23ff6b1a'/%3E%3Crect x='0' y='2' width='1' height='1' fill='%23ff6b1a'/%3E%3Crect x='1' y='3' width='1' height='1' fill='%23ff6b1a'/%3E%3Crect x='3' y='3' width='1' height='1' fill='%23ff6b1a'/%3E%3C/svg%3E");
}

[data-theme='hazardpunk-light'] {
    /* ---- daylight hazardpunk — construction-manual ink on coated paper. ---- */
    --hal-anthra: #fff5e8;
    --hal-anthra-2: #ffebd6;
    --hal-anthra-3: #ffe1c4;
    --hal-edge: #d99c6e;
    --hal-warm: #8b1c0a;
    --hal-hot: #cc4400;
    --hal-ember: #7a2200;
    --hal-bone: #2a0e02;
    --hal-dim: #9c5d3a;
    --hal-deep-dim: #d4a78a;
    --hal-cool: #aa7700;

    /* ---- legacy aliases ---- */
    --color-bg: var(--hal-anthra);
    --color-surface: var(--hal-anthra-2);
    --color-surface-2: var(--hal-anthra-3);
    --color-edge: var(--hal-edge);
    --color-fg: var(--hal-bone);
    --color-fg-dim: var(--hal-dim);
    --color-fg-mute: var(--hal-deep-dim);
    --color-accent: var(--hal-hot);
    --color-accent-2: var(--hal-cool);
    --color-on-accent: var(--hal-anthra);
    --color-link: var(--hal-bone);
    --color-link-visited: var(--hal-dim);
    --color-focus: var(--hal-hot);

    /* ---- glow tokens — punch-through, no halos on paper ---- */
    --glow-text: none;
    --glow-edge: 0 0 0 1px var(--hal-hot);
    --glow-panel: 0 1px 0 var(--hal-edge);
    --glow-pip: none;
    --glow-focus: 0 0 0 2px var(--hal-hot), 0 0 0 4px rgba(255, 255, 255, 0.95);
    --glow-pulse: pulse-phosphor 2.4s var(--ease-in-out) infinite;

    /* ---- shell veils — paper, not anthracite ---- */
    --shell-veil: rgba(255, 245, 232, 0.88);
    --shell-veil-strong: rgba(255, 245, 232, 0.94);

    /* ---- dither tiles — deep rust ink for paper (multiply blend) ---- */
    --dither-sparse: url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4' shape-rendering='crispEdges'%3E%3Crect x='0' y='0' width='1' height='1' fill='%23cc4400'/%3E%3Crect x='2' y='2' width='1' height='1' fill='%23cc4400'/%3E%3C/svg%3E");
    --dither-medium: url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4' shape-rendering='crispEdges'%3E%3Crect x='0' y='0' width='1' height='1' fill='%23cc4400'/%3E%3Crect x='2' y='0' width='1' height='1' fill='%23cc4400'/%3E%3Crect x='2' y='2' width='1' height='1' fill='%23cc4400'/%3E%3Crect x='0' y='2' width='1' height='1' fill='%23cc4400'/%3E%3C/svg%3E");
    --dither-dense: url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4' shape-rendering='crispEdges'%3E%3Crect x='0' y='0' width='1' height='1' fill='%23cc4400'/%3E%3Crect x='2' y='0' width='1' height='1' fill='%23cc4400'/%3E%3Crect x='1' y='1' width='1' height='1' fill='%23cc4400'/%3E%3Crect x='3' y='1' width='1' height='1' fill='%23cc4400'/%3E%3Crect x='2' y='2' width='1' height='1' fill='%23cc4400'/%3E%3Crect x='0' y='2' width='1' height='1' fill='%23cc4400'/%3E%3Crect x='1' y='3' width='1' height='1' fill='%23cc4400'/%3E%3Crect x='3' y='3' width='1' height='1' fill='%23cc4400'/%3E%3C/svg%3E");
}

/* Reduced motion — neutralize the pulse for both variants */
@media (prefers-reduced-motion: reduce) {
    [data-theme^='hazardpunk-'] {
        --glow-pulse: none;
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/theme/themes/hazardpunk.css
git commit -m "theme: hazardpunk token css — dark + daylight variants"
```

---

## Task 4: Wire the new CSS into the app entry

**Files:**
- Modify: `src/app.css`

- [ ] **Step 1: Add the import**

`src/app.css` currently has these two consecutive lines (lines 3-4):

```css
@import './lib/theme/themes/phosphor-green.css' layer(themes);
@import './lib/theme/themes/synthwave.css' layer(themes);
```

Add a third `@import` line immediately after them (line 5 will become):

```css
@import './lib/theme/themes/hazardpunk.css' layer(themes);
```

So the resulting three consecutive lines should read:

```css
@import './lib/theme/themes/phosphor-green.css' layer(themes);
@import './lib/theme/themes/synthwave.css' layer(themes);
@import './lib/theme/themes/hazardpunk.css' layer(themes);
```

- [ ] **Step 2: Build to confirm CSS parses and the import resolves**

Run: `pnpm build`

Expected: build succeeds with no CSS errors.

- [ ] **Step 3: Commit**

```bash
git add src/app.css
git commit -m "theme: import hazardpunk css into app entry"
```

---

## Task 5: Manual verification in the browser

**No file changes** — this is a smoke test.

- [ ] **Step 1: Start the dev server** (if not already running)

Run: `pnpm dev`

Open the printed local URL.

- [ ] **Step 2: Open the theme dropdown**

Expected: THREE rows appear — Phosphor green (lime swatches), Synthwave (magenta/pink/cyan swatches), Hazardpunk (orange/red/yellow swatches).

- [ ] **Step 3: Click "Hazardpunk"**

Expected: page swaps to warm-black background, hazard-orange accents, blood-rust as bridge, caution-yellow appearing in any `--color-accent-2` consumer. Glows are orange.

- [ ] **Step 4: Click the mode button to cycle to light**

Expected: page swaps to coated cream background, deep rust ink, oxblood for warm bridge, dark amber for the cool slot, no glow halos (punch-through).

- [ ] **Step 5: Inspect `InstrumentCluster` and `Halo` dither layers**

The dither fills should be hazard-orange on hazardpunk-dark (not lime bleed-through from `tokens.css` defaults). On hazardpunk-light, they should be deep-rust orange.

- [ ] **Step 6: Cycle back to other families to confirm they still work**

Toggle between Hazardpunk → Synthwave → Phosphor green via the dropdown, in both dark and light modes. Each family should render correctly.

- [ ] **Step 7: Reload to confirm persistence**

If you left Hazardpunk selected, reload — the family should persist (cookie + `LAST_FAMILY_KEY`).

- [ ] **Step 8: No commit needed** (no file changes)

---

## Done criteria

- All tests in `src/lib/theme/` pass.
- `pnpm build` succeeds.
- Hazardpunk appears as the third row in the theme dropdown alongside the other two families.
- Both hazardpunk variants render correctly (dark = orange + rust + caution-yellow on warm-black with halos; light = deep rust + oxblood + amber on coated cream with punch-through).
- Dither tiles in `InstrumentCluster` and `Halo` are orange on hazardpunk-dark (not lime).
- Phosphor-green and synthwave still work; phosphor-green-dark still loads as default on a fresh browser.
