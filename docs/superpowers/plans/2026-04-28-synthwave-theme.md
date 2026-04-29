# Synthwave theme — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `synthwave` color family (dark + light variants) to the theme registry. Once registered, the existing `ThemeControls.svelte` and `resolveThemeFor` pick it up automatically.

**Architecture:** Mirror the existing `phosphor-green` family. Add two registry entries, a new CSS file with `[data-theme='synthwave-dark']` and `[data-theme='synthwave-light']` selector blocks (plus a reduced-motion rule), and a single `@import` in `src/app.css`. No code changes to controls, resolver, cookies, or modes.

**Tech Stack:** Svelte 5, vanilla CSS custom properties, Vitest.

**Spec:** `docs/superpowers/specs/2026-04-28-synthwave-theme-design.md`

---

## File map

| File | Change | Responsibility |
| --- | --- | --- |
| `src/lib/theme/registry.test.ts` | modify | assert both synthwave ids exist |
| `src/lib/theme/registry.ts` | modify | add 2 entries (`synthwave-dark`, `synthwave-light`) |
| `src/lib/theme/themes/synthwave.css` | create | both variant token blocks + reduced-motion rule |
| `src/app.css` | modify | import the new theme css under `layer(themes)` |

---

## Task 1: Failing test for synthwave registry entries

**Files:**
- Modify: `src/lib/theme/registry.test.ts`

- [ ] **Step 1: Add the failing test**

Insert this `it(...)` block immediately after the existing `'contains both phosphor-green variants'` test (around line 9):

```ts
it('contains both synthwave variants', () => {
    const ids = themes.map((t) => t.id);
    expect(ids).toContain('synthwave-dark');
    expect(ids).toContain('synthwave-light');
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `pnpm vitest run src/lib/theme/registry.test.ts`

Expected: the new `'contains both synthwave variants'` test FAILS with both `toContain` assertions reporting the id is missing. Other tests in the file pass.

- [ ] **Step 3: Commit**

```bash
git add src/lib/theme/registry.test.ts
git commit -m "test: assert synthwave variants in theme registry"
```

---

## Task 2: Register synthwave family entries

**Files:**
- Modify: `src/lib/theme/registry.ts`

- [ ] **Step 1: Add the two entries to the `themes` array**

In `src/lib/theme/registry.ts`, the `themes` array currently ends at the closing `}` of the `phosphor-green-light` entry (around line 42), followed by `] as const satisfies readonly ThemeEntry[];`. Replace the closing bracket region so the array now contains four entries:

```ts
export const themes = [
    {
        id: 'phosphor-green-dark',
        family: 'phosphor-green',
        familyName: 'Phosphor green',
        variant: 'dark',
        palette: {
            hot: '#b8ff5a',
            warm: '#82e34b',
            cool: '#4ad29c'
        },
        default: true
    },
    {
        id: 'phosphor-green-light',
        family: 'phosphor-green',
        familyName: 'Phosphor green',
        variant: 'light',
        palette: {
            hot: '#3d6614',
            warm: '#5a8a20',
            cool: '#1c8060'
        }
    },
    {
        id: 'synthwave-dark',
        family: 'synthwave',
        familyName: 'Synthwave',
        variant: 'dark',
        palette: {
            hot: '#ff2bd6',
            warm: '#ff5fa8',
            cool: '#21f0ff'
        }
    },
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
    }
] as const satisfies readonly ThemeEntry[];
```

Do NOT add `default: true` to either synthwave entry. `phosphor-green-dark` keeps the default. The "exactly one default" structural test in `registry.test.ts` will catch any accidental duplicate.

- [ ] **Step 2: Run the registry tests and confirm they all pass**

Run: `pnpm vitest run src/lib/theme/registry.test.ts`

Expected: all tests in the file PASS, including `'contains both synthwave variants'`, `'every entry has family, familyName, variant, palette'`, `'exactly one entry is marked default'`, and `'every id is unique'`.

- [ ] **Step 3: Run the resolver tests too — they iterate the registry**

Run: `pnpm vitest run src/lib/theme/resolve.test.ts`

Expected: all tests PASS (the resolver doesn't hard-code family names; adding entries should be neutral).

- [ ] **Step 4: Type-check**

Run: `pnpm exec svelte-check --tsconfig ./tsconfig.json --output human` (or whatever the project's check script is — try `pnpm check` first if it exists).

Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/theme/registry.ts
git commit -m "theme: register synthwave-dark and synthwave-light entries"
```

---

## Task 3: Create the synthwave token CSS file

**Files:**
- Create: `src/lib/theme/themes/synthwave.css`

- [ ] **Step 1: Write the file**

Create `src/lib/theme/themes/synthwave.css` with the following exact contents. Note the dither tile data URIs use `%23ff2bd6` (URL-encoded `#ff2bd6`) for the dark variant and `%23c41a8f` for the light variant.

```css
/* src/lib/theme/themes/synthwave.css
 * Second family. Miami / outrun energy.
 * Dark variant: hot magenta + electric cyan on deep indigo.
 * Light variant: a daylight reinterpretation — sherbet pastels on
 * near-white, NOT a magenta-on-paper inversion. Glows punch through
 * on paper, like phosphor-green's light variant.
 */

[data-theme='synthwave-dark'] {
    /* ---- halogen palette (magenta-dominant) ---- */
    --hal-anthra: #0c0420;
    --hal-anthra-2: #140832;
    --hal-anthra-3: #1a0c3d;
    --hal-edge: #3a1f6b;
    --hal-warm: #ff5fa8;
    --hal-hot: #ff2bd6;
    --hal-ember: #ff8fe3;
    --hal-bone: #f0e6ff;
    --hal-dim: #8a6dc7;
    --hal-deep-dim: #3d2a6e;
    --hal-cool: #21f0ff;

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

    /* ---- glow tokens (magenta vocabulary) ---- */
    --glow-text:
        0 0 1px rgba(240, 230, 255, 0.95), 0 0 6px rgba(255, 43, 214, 0.55),
        0 0 22px rgba(255, 43, 214, 0.3);
    --glow-edge:
        0 0 0 1px rgba(255, 43, 214, 1), 0 0 12px rgba(255, 43, 214, 0.45),
        0 0 4px rgba(255, 43, 214, 0.55);
    --glow-panel: inset 0 1px 0 rgba(255, 43, 214, 0.1), 0 6px 22px rgba(0, 0, 0, 0.55);
    --glow-pip: 0 0 6px var(--hal-hot), 0 0 16px rgba(255, 95, 168, 0.7);
    --glow-focus:
        0 0 0 1px var(--hal-hot), 0 0 0 3px rgba(255, 43, 214, 0.4),
        0 0 14px rgba(255, 43, 214, 0.55);
    --glow-pulse: pulse-phosphor 2.4s var(--ease-in-out) infinite;

    /* ---- shell veils — translucent backdrops for fixed strips ---- */
    --shell-veil: rgba(12, 4, 32, 0.6);
    --shell-veil-strong: rgba(12, 4, 32, 0.72);

    /* ---- dither tiles — magenta override.
       Defaults in tokens.css are lime, which would bleed through onto
       the magenta surfaces in InstrumentCluster and Halo. ---- */
    --dither-sparse: url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4' shape-rendering='crispEdges'%3E%3Crect x='0' y='0' width='1' height='1' fill='%23ff2bd6'/%3E%3Crect x='2' y='2' width='1' height='1' fill='%23ff2bd6'/%3E%3C/svg%3E");
    --dither-medium: url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4' shape-rendering='crispEdges'%3E%3Crect x='0' y='0' width='1' height='1' fill='%23ff2bd6'/%3E%3Crect x='2' y='0' width='1' height='1' fill='%23ff2bd6'/%3E%3Crect x='2' y='2' width='1' height='1' fill='%23ff2bd6'/%3E%3Crect x='0' y='2' width='1' height='1' fill='%23ff2bd6'/%3E%3C/svg%3E");
    --dither-dense: url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4' shape-rendering='crispEdges'%3E%3Crect x='0' y='0' width='1' height='1' fill='%23ff2bd6'/%3E%3Crect x='2' y='0' width='1' height='1' fill='%23ff2bd6'/%3E%3Crect x='1' y='1' width='1' height='1' fill='%23ff2bd6'/%3E%3Crect x='3' y='1' width='1' height='1' fill='%23ff2bd6'/%3E%3Crect x='2' y='2' width='1' height='1' fill='%23ff2bd6'/%3E%3Crect x='0' y='2' width='1' height='1' fill='%23ff2bd6'/%3E%3Crect x='1' y='3' width='1' height='1' fill='%23ff2bd6'/%3E%3Crect x='3' y='3' width='1' height='1' fill='%23ff2bd6'/%3E%3C/svg%3E");
}

[data-theme='synthwave-light'] {
    /* ---- daylight synthwave — sherbet pastels on near-white. ---- */
    --hal-anthra: #fff4f9;
    --hal-anthra-2: #ffe9f3;
    --hal-anthra-3: #ffdcec;
    --hal-edge: #f0a9cc;
    --hal-warm: #e0438f;
    --hal-hot: #c41a8f;
    --hal-ember: #9c1374;
    --hal-bone: #3a0a52;
    --hal-dim: #8a4d8e;
    --hal-deep-dim: #c896c0;
    --hal-cool: #0e8fa3;

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
    --shell-veil: rgba(255, 244, 249, 0.88);
    --shell-veil-strong: rgba(255, 244, 249, 0.94);

    /* ---- dither tiles — deep magenta ink for paper (multiply blend) ---- */
    --dither-sparse: url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4' shape-rendering='crispEdges'%3E%3Crect x='0' y='0' width='1' height='1' fill='%23c41a8f'/%3E%3Crect x='2' y='2' width='1' height='1' fill='%23c41a8f'/%3E%3C/svg%3E");
    --dither-medium: url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4' shape-rendering='crispEdges'%3E%3Crect x='0' y='0' width='1' height='1' fill='%23c41a8f'/%3E%3Crect x='2' y='0' width='1' height='1' fill='%23c41a8f'/%3E%3Crect x='2' y='2' width='1' height='1' fill='%23c41a8f'/%3E%3Crect x='0' y='2' width='1' height='1' fill='%23c41a8f'/%3E%3C/svg%3E");
    --dither-dense: url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4' shape-rendering='crispEdges'%3E%3Crect x='0' y='0' width='1' height='1' fill='%23c41a8f'/%3E%3Crect x='2' y='0' width='1' height='1' fill='%23c41a8f'/%3E%3Crect x='1' y='1' width='1' height='1' fill='%23c41a8f'/%3E%3Crect x='3' y='1' width='1' height='1' fill='%23c41a8f'/%3E%3Crect x='2' y='2' width='1' height='1' fill='%23c41a8f'/%3E%3Crect x='0' y='2' width='1' height='1' fill='%23c41a8f'/%3E%3Crect x='1' y='3' width='1' height='1' fill='%23c41a8f'/%3E%3Crect x='3' y='3' width='1' height='1' fill='%23c41a8f'/%3E%3C/svg%3E");
}

/* Reduced motion — neutralize the pulse for both variants */
@media (prefers-reduced-motion: reduce) {
    [data-theme^='synthwave-'] {
        --glow-pulse: none;
    }
}
```

- [ ] **Step 2: Verify the file is well-formed CSS**

Run: `pnpm exec stylelint src/lib/theme/themes/synthwave.css` if stylelint is configured. Otherwise skip — the build in Task 4 will catch parse errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/theme/themes/synthwave.css
git commit -m "theme: synthwave token css — dark + daylight variants"
```

---

## Task 4: Wire the new CSS into the app entry

**Files:**
- Modify: `src/app.css`

- [ ] **Step 1: Add the import**

`src/app.css` line 3 currently reads:

```css
@import './lib/theme/themes/phosphor-green.css' layer(themes);
```

Add a second `@import` line immediately after it:

```css
@import './lib/theme/themes/phosphor-green.css' layer(themes);
@import './lib/theme/themes/synthwave.css' layer(themes);
```

- [ ] **Step 2: Build to confirm CSS parses and the import resolves**

Run: `pnpm build`

Expected: build succeeds with no CSS errors.

- [ ] **Step 3: Commit**

```bash
git add src/app.css
git commit -m "theme: import synthwave css into app entry"
```

---

## Task 5: Manual verification in the browser

**No file changes** — this is a smoke test to verify the family renders correctly across both variants.

- [ ] **Step 1: Start the dev server**

Run: `pnpm dev`

Open the printed local URL.

- [ ] **Step 2: Open the theme dropdown (top-right `[t]` control)**

Expected: TWO rows appear. "Phosphor green" with green/lime swatches, "Synthwave" with magenta/pink/cyan swatches.

- [ ] **Step 3: Click "Synthwave"**

Expected: page swaps to deep indigo background, magenta accents, cyan secondary. Glows are magenta. Pulse animations still pulse (unless OS reduced-motion is set).

- [ ] **Step 4: Click the mode button (sun/moon `[m]` control) to cycle to light**

Expected: page swaps to cream-pink background, deep magenta text, no glow halos (punch-through). Toggle once more for system; toggle back to dark to confirm the dark variant returns.

- [ ] **Step 5: Toggle back to "Phosphor green" via the dropdown**

Expected: returns to the original lime theme. Family selection persisted.

- [ ] **Step 6: Reload the page**

Expected: synthwave persists if you left it selected (cookie + `LAST_FAMILY_KEY`).

- [ ] **Step 7: Inspect `InstrumentCluster` and `Halo`**

Specifically look at the minimap dither fills in `InstrumentCluster` and the dither layer in `Halo`. They should be magenta on synthwave-dark, not lime. If they're lime, the dither overrides in `synthwave.css` are wrong.

- [ ] **Step 8: If everything looks right, no commit needed (no file changes).**

If something looks off, treat it as a bug — capture the issue, decide whether it needs a palette adjustment (modify Task 3's CSS) or a missing override, and patch in a follow-up commit.

---

## Done criteria

- All tests in `src/lib/theme/` pass.
- `pnpm build` succeeds.
- Synthwave appears in the theme dropdown alongside phosphor-green.
- Both synthwave variants render correctly (dark = magenta + cyan on indigo with halos; light = pastel pinks on cream with punch-through).
- Dither tiles in `InstrumentCluster` and `Halo` are magenta on synthwave-dark (not lime bleed-through).
- Phosphor-green still works and is still the default on a fresh load.
