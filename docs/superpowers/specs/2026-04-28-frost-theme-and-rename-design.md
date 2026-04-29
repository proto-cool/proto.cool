# Frost theme + family rename — design

## Goal

Two coordinated changes shipped as one spec:

1. **Rename** the three existing theme families to single-word
   atmospheric names. The `--hal-*` token prefix already implies
   "halogen" — pulling that all the way through to the family layer
   makes the naming cohere.

   | current id / familyName | new id / familyName |
   | --- | --- |
   | `phosphor-green` / "Phosphor green" | `halogen` / "Halogen" |
   | `synthwave` / "Synthwave" | `outrun` / "Outrun" |
   | `hazardpunk` / "Hazardpunk" | `sodium` / "Sodium" |

2. **Add** a fourth family `frost` / "Frost" — Nordic ice-blue with an
   aurora-green pop in the cool slot. Mirrors the existing pattern.

`halogen-dark` (the renamed phosphor-green) becomes the new default
(`DEFAULT_THEME`).

## Why one spec

The work is logically a single change: a naming overhaul that
introduces the new family with the new convention from day one,
rather than adding "Frost" alongside the legacy names and then
renaming everything in a follow-up. Doing both together keeps the
intermediate state shorter (two tasks of churn vs. four).

## Cookie / data-theme compatibility

The id rename invalidates any saved theme cookies — `resolveTheme()`
already falls back to `DEFAULT_THEME` for unknown ids, so a stale
cookie just resets to `halogen-dark` on first load. This is
acceptable: the project is unshipped, no production users exist.
No migration shim, no deprecated-id alias.

## Non-goals

- No changes to `ThemeControls.svelte`, `resolveThemeFor`, `cookies.ts`,
  or the light/dark/system mode toggle. None of these reference
  family names by string literal.
- No new design tokens. The new family reuses the existing `--hal-*`,
  `--color-*`, `--glow-*`, `--shell-veil*`, `--dither-*` namespaces.
- No change to status colors (`--color-ok` etc.) — those stay shared.
- No backwards-compatibility shim for old ids.

## Files touched

| File | Change |
| --- | --- |
| `src/lib/theme/themes/phosphor-green.css` | rename → `halogen.css`; update internal selectors and header comment |
| `src/lib/theme/themes/synthwave.css` | rename → `outrun.css`; update internal selectors and header comment |
| `src/lib/theme/themes/hazardpunk.css` | rename → `sodium.css`; update internal selectors and header comment |
| `src/lib/theme/themes/frost.css` | new — both variant blocks + reduced-motion rule |
| `src/lib/theme/registry.ts` | rename three families' ids/family/familyName, update `DEFAULT_THEME`, append two `frost-*` entries |
| `src/app.css` | update three import paths, add fourth |
| `src/lib/theme/registry.test.ts` | update three existing `'contains both X variants'` tests, add a fourth for frost |
| `src/lib/theme/resolve.test.ts` | replace `phosphor-green-*` literals with `halogen-*` |
| `src/lib/shell/theme-controls.test.ts` | replace `phosphor-green` and `phosphor-green-*` literals with `halogen` / `halogen-*` |

## Inside each renamed CSS file

Each file gets exactly three classes of edit:

1. The two top-level selectors `[data-theme='<old>-dark']` and
   `[data-theme='<old>-light']` change to use the new family name.
2. The `prefers-reduced-motion` block's `[data-theme^='<old>-']`
   attribute selector changes.
3. The first-line file-path comment and the family-description prose
   in the header comment update to the new name.

The token bodies (palette, glows, dithers, veils) DO NOT change.

## Frost palette — `frost-dark` (fjord-night with aurora pop)

```
--hal-anthra:     #0e1620   /* deep night fjord */
--hal-anthra-2:   #141f2c
--hal-anthra-3:   #1b2838
--hal-edge:       #2c3e52   /* steel slate */
--hal-warm:       #5e81ac   /* fjord steel-blue (Nord10) */
--hal-hot:        #a3d5e8   /* bright frost-ice — headline */
--hal-ember:      #c8e0eb   /* warmer ice for emphasis */
--hal-bone:       #eceff4   /* snow (Nord6) — body text */
--hal-dim:        #6e8093   /* muted slate */
--hal-deep-dim:   #2a3a4d
--hal-cool:       #a3be8c   /* aurora green (Nord14) — secondary pop */
```

Glow vocabulary: ice-blue dominant, same shape as the other dark
variants (text/edge/panel/pip/focus/pulse). Pulse keyframe reused.
Dither tiles override to frost-ice `#88c0d0` (URL-encoded
`%2388c0d0`) — defaults in `tokens.css` are lime and would bleed
through.

Shell veils:
```
--shell-veil:        rgba(14, 22, 32, 0.6);
--shell-veil-strong: rgba(14, 22, 32, 0.72);
```

## Frost palette — `frost-light` (snowfield at noon)

```
--hal-anthra:     #f4f6f9   /* cool off-white */
--hal-anthra-2:   #e9eef4
--hal-anthra-3:   #dee5ed
--hal-edge:       #9aaabd   /* dusty steel */
--hal-warm:       #4a6485   /* steel-slate */
--hal-hot:        #2e4564   /* deep fjord — headline (AA on snow) */
--hal-ember:      #1a2940
--hal-bone:       #0e1a2e   /* deep night — body text */
--hal-dim:        #7a8a9e   /* muted slate */
--hal-deep-dim:   #bfcbd9
--hal-cool:       #5d7548   /* deeper aurora — sage forest dialed for AA */
```

Glow tokens: punch-through, no halos (matches the light-variant
convention from the other families). Dither tiles override to deep
fjord `#2e4564` (URL-encoded `%232e4564`).

Shell veils:
```
--shell-veil:        rgba(244, 246, 249, 0.88);
--shell-veil-strong: rgba(244, 246, 249, 0.94);
```

## Reduced motion

```css
@media (prefers-reduced-motion: reduce) {
    [data-theme^='frost-'] {
        --glow-pulse: none;
    }
}
```

The three renamed families need their existing reduced-motion
selectors updated: `[data-theme^='phosphor-green-']` →
`[data-theme^='halogen-']`, etc.

## Registry shape after the change

Six existing entries get their `id`, `family`, and `familyName`
fields updated. Two new `frost-*` entries get appended. The
`default: true` flag moves to `halogen-dark` (only one default ever
exists). `DEFAULT_THEME` constant becomes `'halogen-dark'`.

```ts
{ id: 'halogen-dark',  family: 'halogen',  familyName: 'Halogen', variant: 'dark',  palette: { ... }, default: true },
{ id: 'halogen-light', family: 'halogen',  familyName: 'Halogen', variant: 'light', palette: { ... } },
{ id: 'outrun-dark',   family: 'outrun',   familyName: 'Outrun',  variant: 'dark',  palette: { ... } },
{ id: 'outrun-light',  family: 'outrun',   familyName: 'Outrun',  variant: 'light', palette: { ... } },
{ id: 'sodium-dark',   family: 'sodium',   familyName: 'Sodium',  variant: 'dark',  palette: { ... } },
{ id: 'sodium-light',  family: 'sodium',   familyName: 'Sodium',  variant: 'light', palette: { ... } },
{ id: 'frost-dark',    family: 'frost',    familyName: 'Frost',   variant: 'dark',
  palette: { hot: '#a3d5e8', warm: '#5e81ac', cool: '#a3be8c' } },
{ id: 'frost-light',   family: 'frost',    familyName: 'Frost',   variant: 'light',
  palette: { hot: '#2e4564', warm: '#4a6485', cool: '#5d7548' } }
```

Palette swatch colors for the renamed families do not change — only
the `id`, `family`, `familyName`, and (for halogen-dark) the
`default` flag move.

## Tests

- `registry.test.ts` — the three existing `'contains both X variants'`
  tests get their X updated; a fourth `'contains both frost variants'`
  is added. Structural assertions still pass without modification.
- `resolve.test.ts` — every `phosphor-green-*` literal becomes
  `halogen-*`. No other changes.
- `shell/theme-controls.test.ts` — every `phosphor-green` (family)
  becomes `halogen`; every `phosphor-green-*` (id) becomes
  `halogen-*`. No other changes.

## Verification

- `pnpm vitest run` — all tests pass.
- `pnpm check` — zero errors.
- `pnpm build` — succeeds, no CSS import errors.
- Manual smoke: dropdown shows four rows (Halogen, Outrun, Sodium,
  Frost). Each family swaps both variants correctly. Dither fills are
  the right family color, not lime defaults. A stale cookie with an
  old id (e.g. `phosphor-green-dark`) loads as `halogen-dark` (the
  new default) without error.
