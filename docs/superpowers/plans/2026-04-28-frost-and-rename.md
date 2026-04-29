# Frost theme + family rename — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the three existing theme families to single-word atmospheric names (Halogen, Outrun, Sodium) and add a fourth family (Frost) — Nordic ice-blue with aurora-green pop. Halogen-dark becomes the new default.

**Architecture:** Each rename is one atomic task that updates the CSS file (renamed via `git mv`), the registry entry, the `app.css` import, and any test references all at once — keeping the test suite green at every commit. Frost is then added as four small tasks following the established pattern (failing test, register, create CSS, wire app.css). Seven tasks total.

**Tech Stack:** Svelte 5, vanilla CSS custom properties, Vitest.

**Spec:** `docs/superpowers/specs/2026-04-28-frost-theme-and-rename-design.md`

---

## File map

| File | Touched by tasks |
| --- | --- |
| `src/lib/theme/themes/phosphor-green.css` → `halogen.css` | Task 1 (rename + internal selector updates) |
| `src/lib/theme/themes/synthwave.css` → `outrun.css` | Task 2 |
| `src/lib/theme/themes/hazardpunk.css` → `sodium.css` | Task 3 |
| `src/lib/theme/themes/frost.css` (new) | Task 6 |
| `src/lib/theme/registry.ts` | Tasks 1, 2, 3 (rename entries), 5 (append frost), implicitly read by 7 |
| `src/app.css` | Tasks 1, 2, 3 (update import paths), 7 (add frost import) |
| `src/lib/theme/registry.test.ts` | Tasks 1, 2, 3 (rename test descriptions + assertions), 4 (add failing frost test) |
| `src/lib/theme/resolve.test.ts` | Task 1 (replace phosphor-green literals) |
| `src/lib/shell/theme-controls.test.ts` | Task 1 (replace phosphor-green literals) |

---

## Task 1: Rename phosphor-green → halogen

This is the most invasive rename — it touches the most test files because phosphor-green is the current default and many tests assert against `phosphor-green-dark` as the fallback id. Do it atomically; the suite must be green at the end.

**Files:**
- Rename: `src/lib/theme/themes/phosphor-green.css` → `src/lib/theme/themes/halogen.css`
- Modify: `src/lib/theme/themes/halogen.css` (after rename — internal selectors + header)
- Modify: `src/lib/theme/registry.ts`
- Modify: `src/app.css`
- Modify: `src/lib/theme/registry.test.ts`
- Modify: `src/lib/theme/resolve.test.ts`
- Modify: `src/lib/shell/theme-controls.test.ts`

- [ ] **Step 1: Rename the CSS file with `git mv` to preserve history**

```bash
git mv src/lib/theme/themes/phosphor-green.css src/lib/theme/themes/halogen.css
```

- [ ] **Step 2: Update internal selectors and header comment in `halogen.css`**

Inside the renamed file, replace exactly four occurrences of `phosphor-green`:

1. The first-line file-path comment: `/* src/lib/theme/themes/phosphor-green.css` → `/* src/lib/theme/themes/halogen.css`
2. The dark variant selector: `[data-theme='phosphor-green-dark']` → `[data-theme='halogen-dark']`
3. The light variant selector: `[data-theme='phosphor-green-light']` → `[data-theme='halogen-light']`
4. The reduced-motion attribute prefix: `[data-theme^='phosphor-green-']` → `[data-theme^='halogen-']`

Easiest: use `Edit` with `replace_all: true` and `old_string: "phosphor-green"`, `new_string: "halogen"` against this single file. There are no other phosphor-green references in the file body, so this is safe.

The token bodies (`--hal-*` palette, glows, dithers, veils) DO NOT change. The `--hal-*` prefix happens to align nicely with "halogen" but that's coincidence — the prefix is the cross-theme contract, not a per-family thing.

- [ ] **Step 3: Update the registry entries and DEFAULT_THEME**

In `src/lib/theme/registry.ts`:
- The two phosphor-green entries get updated. Inside each:
  - `id: 'phosphor-green-dark'` → `id: 'halogen-dark'`
  - `id: 'phosphor-green-light'` → `id: 'halogen-light'`
  - `family: 'phosphor-green'` → `family: 'halogen'` (in both)
  - `familyName: 'Phosphor green'` → `familyName: 'Halogen'` (in both)
  - The `default: true` flag stays where it is (on the dark entry).
- The constant `export const DEFAULT_THEME: ThemeId = 'phosphor-green-dark';` becomes `export const DEFAULT_THEME: ThemeId = 'halogen-dark';`.

Do NOT touch the synthwave or hazardpunk entries.

- [ ] **Step 4: Update the import path in `app.css`**

`src/app.css` line 3 currently reads:
```css
@import './lib/theme/themes/phosphor-green.css' layer(themes);
```
Change to:
```css
@import './lib/theme/themes/halogen.css' layer(themes);
```

Leave the other two import lines (synthwave, hazardpunk) alone.

- [ ] **Step 5: Update test references in `src/lib/theme/registry.test.ts`**

Replace `'contains both phosphor-green variants'` with `'contains both halogen variants'`.
Replace `'phosphor-green-dark'` with `'halogen-dark'`.
Replace `'phosphor-green-light'` with `'halogen-light'`.

(Three replacements.)

- [ ] **Step 6: Update test references in `src/lib/theme/resolve.test.ts`**

Use `Edit` with `replace_all: true` on this file:
- `'phosphor-green-dark'` → `'halogen-dark'`
- `'phosphor-green-light'` → `'halogen-light'`

There are five total `phosphor-green-dark` references and one `phosphor-green-light`. Bulk replace.

- [ ] **Step 7: Update test references in `src/lib/shell/theme-controls.test.ts`**

This file references both the family name (`'phosphor-green'`) and several ids (`'phosphor-green-dark'`, `'phosphor-green-light'`). Order matters for bulk replace — do `'phosphor-green-dark'` and `'phosphor-green-light'` FIRST, then `'phosphor-green'` for the bare-family literals. (If you replace bare family first, the id literals would become e.g. `'halogen-dark'` correctly because the `-dark` suffix would still match the longer literal — but doing longer-first avoids any ambiguity.)

Use three `Edit` calls with `replace_all: true`:
1. `'phosphor-green-dark'` → `'halogen-dark'`
2. `'phosphor-green-light'` → `'halogen-light'`
3. `'phosphor-green'` → `'halogen'`

- [ ] **Step 8: Run all theme + shell tests**

```bash
pnpm vitest run src/lib/theme/ src/lib/shell/
```

Expected: ALL tests pass. No `phosphor-green` references remain in the test output.

- [ ] **Step 9: Type-check**

```bash
pnpm check
```

Expected: zero errors.

- [ ] **Step 10: Confirm no stray `phosphor-green` references remain**

```bash
grep -rE 'phosphor-green' src/ --include='*.ts' --include='*.svelte' --include='*.css'
```

Expected: empty output. (Documentation files in `docs/` may still reference the old name historically — that's fine, leave them.)

- [ ] **Step 11: Commit**

```bash
git add src/lib/theme/themes/halogen.css src/lib/theme/registry.ts src/app.css \
        src/lib/theme/registry.test.ts src/lib/theme/resolve.test.ts \
        src/lib/shell/theme-controls.test.ts
git commit -m "theme: rename phosphor-green → halogen"
```

(`git mv` already staged the rename; the other files need explicit add.)

---

## Task 2: Rename synthwave → outrun

Smaller scope — synthwave is only referenced in its CSS file, the registry, app.css, and `registry.test.ts`. No `theme-controls.test.ts` or `resolve.test.ts` references.

**Files:**
- Rename: `src/lib/theme/themes/synthwave.css` → `src/lib/theme/themes/outrun.css`
- Modify: `src/lib/theme/themes/outrun.css`
- Modify: `src/lib/theme/registry.ts`
- Modify: `src/app.css`
- Modify: `src/lib/theme/registry.test.ts`

- [ ] **Step 1: Rename the CSS file**

```bash
git mv src/lib/theme/themes/synthwave.css src/lib/theme/themes/outrun.css
```

- [ ] **Step 2: Update internal selectors + header comment in `outrun.css`**

Use `Edit` with `replace_all: true`:
- `synthwave` → `outrun` (single bulk replace).

There are exactly four occurrences (file-path comment, dark selector, light selector, reduced-motion prefix). The body uses the literal word "Synthwave" inside header prose — for the prose, do an additional manual edit:
- `Second family. Miami / outrun energy.` ← **note** — do NOT introduce the word "outrun" into the prose just because we're using bulk replace. The header prose currently reads:

```
/* src/lib/theme/themes/synthwave.css
 * Second family. Miami / outrun energy.
 ...
```

After the bulk `synthwave → outrun` replace the path-comment line becomes `themes/outrun.css` (correct), and the prose line stays as-is (already says "outrun" because the existing comment used that descriptor). Both fine. Verify the file after by reading it.

If the existing prose actually reads "synthwave" anywhere in the comment body, those occurrences also flip to "outrun" by the bulk replace — that's the intended outcome, since the family is now named Outrun.

- [ ] **Step 3: Update registry entries**

In `src/lib/theme/registry.ts`, on the two synthwave entries:
- `id: 'synthwave-dark'` → `id: 'outrun-dark'`
- `id: 'synthwave-light'` → `id: 'outrun-light'`
- `family: 'synthwave'` → `family: 'outrun'` (in both entries)
- `familyName: 'Synthwave'` → `familyName: 'Outrun'` (in both entries)

Don't touch halogen or hazardpunk entries.

- [ ] **Step 4: Update the import path in `app.css`**

```css
@import './lib/theme/themes/synthwave.css' layer(themes);
```
becomes:
```css
@import './lib/theme/themes/outrun.css' layer(themes);
```

- [ ] **Step 5: Update test references in `src/lib/theme/registry.test.ts`**

- `'contains both synthwave variants'` → `'contains both outrun variants'`
- `'synthwave-dark'` → `'outrun-dark'`
- `'synthwave-light'` → `'outrun-light'`

- [ ] **Step 6: Run tests + check**

```bash
pnpm vitest run src/lib/theme/ src/lib/shell/
pnpm check
```

Expected: all pass, zero errors.

- [ ] **Step 7: Confirm no stray `synthwave` references remain**

```bash
grep -rE 'synthwave' src/ --include='*.ts' --include='*.svelte' --include='*.css'
```

Expected: empty.

- [ ] **Step 8: Commit**

```bash
git add src/lib/theme/themes/outrun.css src/lib/theme/registry.ts src/app.css src/lib/theme/registry.test.ts
git commit -m "theme: rename synthwave → outrun"
```

---

## Task 3: Rename hazardpunk → sodium

Same shape as Task 2.

**Files:**
- Rename: `src/lib/theme/themes/hazardpunk.css` → `src/lib/theme/themes/sodium.css`
- Modify: `src/lib/theme/themes/sodium.css`
- Modify: `src/lib/theme/registry.ts`
- Modify: `src/app.css`
- Modify: `src/lib/theme/registry.test.ts`

- [ ] **Step 1: Rename**

```bash
git mv src/lib/theme/themes/hazardpunk.css src/lib/theme/themes/sodium.css
```

- [ ] **Step 2: Bulk-replace `hazardpunk` → `sodium` in `sodium.css`**

Use `Edit` with `replace_all: true`. Same four occurrences (file-path comment, dark selector, light selector, reduced-motion prefix), plus any header-prose mentions.

- [ ] **Step 3: Update registry entries**

In `src/lib/theme/registry.ts`:
- `id: 'hazardpunk-dark'` → `id: 'sodium-dark'`
- `id: 'hazardpunk-light'` → `id: 'sodium-light'`
- `family: 'hazardpunk'` → `family: 'sodium'`
- `familyName: 'Hazardpunk'` → `familyName: 'Sodium'`

- [ ] **Step 4: Update import path in `app.css`**

```css
@import './lib/theme/themes/hazardpunk.css' layer(themes);
```
becomes:
```css
@import './lib/theme/themes/sodium.css' layer(themes);
```

- [ ] **Step 5: Update test references in `src/lib/theme/registry.test.ts`**

- `'contains both hazardpunk variants'` → `'contains both sodium variants'`
- `'hazardpunk-dark'` → `'sodium-dark'`
- `'hazardpunk-light'` → `'sodium-light'`

- [ ] **Step 6: Run tests + check**

```bash
pnpm vitest run src/lib/theme/ src/lib/shell/
pnpm check
```

Expected: all pass.

- [ ] **Step 7: Confirm no stray `hazardpunk` references remain**

```bash
grep -rE 'hazardpunk' src/ --include='*.ts' --include='*.svelte' --include='*.css'
```

Expected: empty.

- [ ] **Step 8: Commit**

```bash
git add src/lib/theme/themes/sodium.css src/lib/theme/registry.ts src/app.css src/lib/theme/registry.test.ts
git commit -m "theme: rename hazardpunk → sodium"
```

---

## Task 4: Failing test for frost registry entries

Now the rename pass is complete. From here, four small tasks add the Frost family using the established pattern.

**Files:**
- Modify: `src/lib/theme/registry.test.ts`

- [ ] **Step 1: Add the failing test**

Insert immediately AFTER the existing `'contains both sodium variants'` test:

```ts
it('contains both frost variants', () => {
    const ids = themes.map((t) => t.id);
    expect(ids).toContain('frost-dark');
    expect(ids).toContain('frost-light');
});
```

- [ ] **Step 2: Confirm it fails**

```bash
pnpm vitest run src/lib/theme/registry.test.ts
```

Expected: the new test FAILS, all others pass.

- [ ] **Step 3: Commit**

```bash
git add src/lib/theme/registry.test.ts
git commit -m "test: assert frost variants in theme registry"
```

---

## Task 5: Register frost family entries

**Files:**
- Modify: `src/lib/theme/registry.ts`

- [ ] **Step 1: Append two entries to the `themes` array**

After the existing `sodium-light` entry (which is now the last entry), append:

```ts
{
    id: 'frost-dark',
    family: 'frost',
    familyName: 'Frost',
    variant: 'dark',
    palette: {
        hot: '#a3d5e8',
        warm: '#5e81ac',
        cool: '#a3be8c'
    }
},
{
    id: 'frost-light',
    family: 'frost',
    familyName: 'Frost',
    variant: 'light',
    palette: {
        hot: '#2e4564',
        warm: '#4a6485',
        cool: '#5d7548'
    }
}
```

NO `default: true` flag — `halogen-dark` keeps it.

- [ ] **Step 2: Run tests**

```bash
pnpm vitest run src/lib/theme/ src/lib/shell/
```

Expected: all pass, including the previously-failing `'contains both frost variants'`.

- [ ] **Step 3: Type-check**

```bash
pnpm check
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/theme/registry.ts
git commit -m "theme: register frost-dark and frost-light entries"
```

---

## Task 6: Create the frost token CSS file

**Files:**
- Create: `src/lib/theme/themes/frost.css`

- [ ] **Step 1: Write the file with TAB indentation** (matching the sibling files; the markdown below renders 4 spaces — convert to tabs)

Dither tile data URIs use `%2388c0d0` (URL-encoded `#88c0d0`) for the dark variant and `%232e4564` for the light variant.

```css
/* src/lib/theme/themes/frost.css
 * Fourth family. Nordic ice-blue with an aurora-green pop.
 * Dark variant: bright frost-ice on deep night fjord; the cool slot
 * is sage aurora green so the trio doesn't blur into a single blue
 * blob in the dropdown.
 * Light variant: snowfield at noon — deep fjord ink on cool off-white,
 * with deeper aurora-sage as the secondary. Glows punch through on
 * paper, like the other light variants.
 */

[data-theme='frost-dark'] {
    /* ---- halogen palette (ice-dominant, aurora-accented) ---- */
    --hal-anthra: #0e1620;
    --hal-anthra-2: #141f2c;
    --hal-anthra-3: #1b2838;
    --hal-edge: #2c3e52;
    --hal-warm: #5e81ac;
    --hal-hot: #a3d5e8;
    --hal-ember: #c8e0eb;
    --hal-bone: #eceff4;
    --hal-dim: #6e8093;
    --hal-deep-dim: #2a3a4d;
    --hal-cool: #a3be8c;

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

    /* ---- glow tokens (ice-blue vocabulary) ---- */
    --glow-text:
        0 0 1px rgba(236, 239, 244, 0.95), 0 0 6px rgba(163, 213, 232, 0.55),
        0 0 22px rgba(163, 213, 232, 0.3);
    --glow-edge:
        0 0 0 1px rgba(163, 213, 232, 1), 0 0 12px rgba(163, 213, 232, 0.45),
        0 0 4px rgba(163, 213, 232, 0.55);
    --glow-panel: inset 0 1px 0 rgba(163, 213, 232, 0.1), 0 6px 22px rgba(0, 0, 0, 0.55);
    --glow-pip: 0 0 6px var(--hal-hot), 0 0 16px rgba(94, 129, 172, 0.7);
    --glow-focus:
        0 0 0 1px var(--hal-hot), 0 0 0 3px rgba(163, 213, 232, 0.4),
        0 0 14px rgba(163, 213, 232, 0.55);
    --glow-pulse: pulse-phosphor 2.4s var(--ease-in-out) infinite;

    /* ---- shell veils — translucent backdrops for fixed strips ---- */
    --shell-veil: rgba(14, 22, 32, 0.6);
    --shell-veil-strong: rgba(14, 22, 32, 0.72);

    /* ---- dither tiles — frost-ice override.
       Defaults in tokens.css are lime, which would bleed through onto
       the ice-blue surfaces in InstrumentCluster and Halo. ---- */
    --dither-sparse: url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4' shape-rendering='crispEdges'%3E%3Crect x='0' y='0' width='1' height='1' fill='%2388c0d0'/%3E%3Crect x='2' y='2' width='1' height='1' fill='%2388c0d0'/%3E%3C/svg%3E");
    --dither-medium: url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4' shape-rendering='crispEdges'%3E%3Crect x='0' y='0' width='1' height='1' fill='%2388c0d0'/%3E%3Crect x='2' y='0' width='1' height='1' fill='%2388c0d0'/%3E%3Crect x='2' y='2' width='1' height='1' fill='%2388c0d0'/%3E%3Crect x='0' y='2' width='1' height='1' fill='%2388c0d0'/%3E%3C/svg%3E");
    --dither-dense: url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4' shape-rendering='crispEdges'%3E%3Crect x='0' y='0' width='1' height='1' fill='%2388c0d0'/%3E%3Crect x='2' y='0' width='1' height='1' fill='%2388c0d0'/%3E%3Crect x='1' y='1' width='1' height='1' fill='%2388c0d0'/%3E%3Crect x='3' y='1' width='1' height='1' fill='%2388c0d0'/%3E%3Crect x='2' y='2' width='1' height='1' fill='%2388c0d0'/%3E%3Crect x='0' y='2' width='1' height='1' fill='%2388c0d0'/%3E%3Crect x='1' y='3' width='1' height='1' fill='%2388c0d0'/%3E%3Crect x='3' y='3' width='1' height='1' fill='%2388c0d0'/%3E%3C/svg%3E");
}

[data-theme='frost-light'] {
    /* ---- snowfield at noon — deep fjord ink on cool off-white. ---- */
    --hal-anthra: #f4f6f9;
    --hal-anthra-2: #e9eef4;
    --hal-anthra-3: #dee5ed;
    --hal-edge: #9aaabd;
    --hal-warm: #4a6485;
    --hal-hot: #2e4564;
    --hal-ember: #1a2940;
    --hal-bone: #0e1a2e;
    --hal-dim: #7a8a9e;
    --hal-deep-dim: #bfcbd9;
    --hal-cool: #5d7548;

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
    --shell-veil: rgba(244, 246, 249, 0.88);
    --shell-veil-strong: rgba(244, 246, 249, 0.94);

    /* ---- dither tiles — deep fjord ink for paper (multiply blend) ---- */
    --dither-sparse: url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4' shape-rendering='crispEdges'%3E%3Crect x='0' y='0' width='1' height='1' fill='%232e4564'/%3E%3Crect x='2' y='2' width='1' height='1' fill='%232e4564'/%3E%3C/svg%3E");
    --dither-medium: url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4' shape-rendering='crispEdges'%3E%3Crect x='0' y='0' width='1' height='1' fill='%232e4564'/%3E%3Crect x='2' y='0' width='1' height='1' fill='%232e4564'/%3E%3Crect x='2' y='2' width='1' height='1' fill='%232e4564'/%3E%3Crect x='0' y='2' width='1' height='1' fill='%232e4564'/%3E%3C/svg%3E");
    --dither-dense: url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4' shape-rendering='crispEdges'%3E%3Crect x='0' y='0' width='1' height='1' fill='%232e4564'/%3E%3Crect x='2' y='0' width='1' height='1' fill='%232e4564'/%3E%3Crect x='1' y='1' width='1' height='1' fill='%232e4564'/%3E%3Crect x='3' y='1' width='1' height='1' fill='%232e4564'/%3E%3Crect x='2' y='2' width='1' height='1' fill='%232e4564'/%3E%3Crect x='0' y='2' width='1' height='1' fill='%232e4564'/%3E%3Crect x='1' y='3' width='1' height='1' fill='%232e4564'/%3E%3Crect x='3' y='3' width='1' height='1' fill='%232e4564'/%3E%3C/svg%3E");
}

/* Reduced motion — neutralize the pulse for both variants */
@media (prefers-reduced-motion: reduce) {
    [data-theme^='frost-'] {
        --glow-pulse: none;
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/theme/themes/frost.css
git commit -m "theme: frost token css — dark + daylight variants"
```

---

## Task 7: Wire frost.css into app.css

**Files:**
- Modify: `src/app.css`

- [ ] **Step 1: Add the import**

After the rename, `src/app.css` lines 3-5 should read:
```css
@import './lib/theme/themes/halogen.css' layer(themes);
@import './lib/theme/themes/outrun.css' layer(themes);
@import './lib/theme/themes/sodium.css' layer(themes);
```

Add a fourth import line immediately after them:
```css
@import './lib/theme/themes/frost.css' layer(themes);
```

So the resulting four lines read:
```css
@import './lib/theme/themes/halogen.css' layer(themes);
@import './lib/theme/themes/outrun.css' layer(themes);
@import './lib/theme/themes/sodium.css' layer(themes);
@import './lib/theme/themes/frost.css' layer(themes);
```

- [ ] **Step 2: Build to confirm CSS parses**

```bash
pnpm build
```

Expected: build succeeds with no CSS errors.

- [ ] **Step 3: Commit**

```bash
git add src/app.css
git commit -m "theme: import frost css into app entry"
```

---

## Done criteria

- All tests in `src/lib/theme/` and `src/lib/shell/` pass.
- `pnpm check` is clean.
- `pnpm build` succeeds.
- No `phosphor-green`, `synthwave`, or `hazardpunk` references remain in `src/` (only in `docs/specs/` and `docs/plans/` historical files).
- The dropdown shows four families: Halogen, Outrun, Sodium, Frost.
- A fresh page load defaults to `halogen-dark` (the new default).
- A stale cookie containing `phosphor-green-dark` falls back to `halogen-dark` cleanly.
- Frost-dark renders ice-blue with sage aurora cool slot and orange-free dither tiles (frost-ice fill).
- Frost-light renders deep fjord ink on cool off-white, punch-through styling.
