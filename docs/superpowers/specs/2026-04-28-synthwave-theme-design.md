# Synthwave theme — design

## Goal

Add a second color family, `synthwave`, to the theme registry. Two
variants: `synthwave-dark` (Miami/outrun: hot magenta + electric cyan
on deep indigo) and `synthwave-light` (a *daylight* synthwave — pastel
sherbet on near-white, NOT ink-on-paper inversion). `phosphor-green-dark`
remains the default.

The existing controls (`ThemeControls.svelte`) and resolver
(`resolveThemeFor`) already iterate the registry and group by family,
so adding entries plus a CSS file is the entire surface area — no UI
work required.

## Non-goals

- No changes to controls, resolver, cookies, or the light/dark/system
  mode toggle.
- No new design tokens. Synthwave reuses the existing `--hal-*` and
  `--color-*` and `--glow-*` token namespaces (the prefix is historical
  — these are the cross-theme contract, not a phosphor-only thing).
- No change to `DEFAULT_THEME` or `DEFAULT_MODE`.
- No changes to status colors (`--color-ok` etc.) — those stay shared.

## Files touched

| File | Change |
| --- | --- |
| `src/lib/theme/themes/synthwave.css` | new — mirrors `phosphor-green.css` structure |
| `src/lib/theme/registry.ts` | add 2 entries (`synthwave-dark`, `synthwave-light`) |
| `src/app.css` | add `@import './lib/theme/themes/synthwave.css' layer(themes);` |
| `src/lib/theme/registry.test.ts` | add assertions for both synthwave ids |

## Palette — `synthwave-dark` (Miami / outrun)

Background ladder runs deep indigo to violet; accents are hot magenta
(headline) and electric cyan (secondary). Glow vocabulary keeps the
heavy halogen feel of phosphor-green but in magenta.

```
--hal-anthra:     #0c0420   /* deep indigo, near-black */
--hal-anthra-2:   #140832   /* one step up */
--hal-anthra-3:   #1a0c3d   /* surface-2 */
--hal-edge:       #3a1f6b   /* violet edge */
--hal-warm:       #ff5fa8   /* hot pink — bridge */
--hal-hot:        #ff2bd6   /* hot magenta — headline accent */
--hal-ember:      #ff8fe3   /* lighter magenta for ember states */
--hal-bone:       #f0e6ff   /* pale lavender — body text */
--hal-dim:        #8a6dc7   /* muted violet — secondary text */
--hal-deep-dim:   #3d2a6e   /* near-edge dim */
--hal-cool:       #21f0ff   /* electric cyan — secondary accent */
```

Glow tokens follow the same shape as `phosphor-green-dark`:
- `--glow-text` — magenta halo around text
- `--glow-edge` — magenta edge halo
- `--glow-pip` — magenta pip glow
- `--glow-focus` — magenta focus ring
- `--glow-panel` — soft inset highlight + outer shadow
- `--glow-pulse` — reuse `pulse-phosphor` keyframe (the keyframe name
  is the existing animation; we don't rename it just because the family
  changed)

Shell veils use the same near-black-with-alpha approach but tinted with
the new background:
```
--shell-veil:        rgba(12, 4, 32, 0.6);
--shell-veil-strong: rgba(12, 4, 32, 0.72);
```

Dither tiles must be overridden in the dark variant too. The defaults
in `tokens.css` are lime (`#b8ff5a`); inheriting them would render lime
tiles on top of a magenta surface in `InstrumentCluster.svelte` and
`Halo.svelte`. Override `--dither-sparse / -medium / -dense` to use
the headline magenta `#ff2bd6` (URL-encoded as `%23ff2bd6` in the
inline SVG data URIs, same shape as the existing lime tiles).

## Palette — `synthwave-light` (daylight reinterpretation)

NOT a deep-magenta-on-cream inversion. This is "synthwave at noon" —
sherbet pastels on near-white. The light variant of phosphor-green
went paper-and-ink; this one stays pop/saturated, just dialed for
white-background AA.

```
--hal-anthra:     #fff4f9   /* cream-pink */
--hal-anthra-2:   #ffe9f3
--hal-anthra-3:   #ffdcec
--hal-edge:       #f0a9cc   /* dusty rose edge */
--hal-warm:       #e0438f   /* hot-pink */
--hal-hot:        #c41a8f   /* deep magenta — headline (AA on cream) */
--hal-ember:      #9c1374   /* deeper magenta for emphasis */
--hal-bone:       #3a0a52   /* deep plum — body text */
--hal-dim:        #8a4d8e   /* muted plum */
--hal-deep-dim:   #c896c0   /* near-edge dim */
--hal-cool:       #0e8fa3   /* cool teal — secondary */
```

Glow tokens follow the light-variant convention from phosphor-green:
punch-through, no halos.
- `--glow-text: none`
- `--glow-edge: 0 0 0 1px var(--hal-hot)`
- `--glow-panel: 0 1px 0 var(--hal-edge)`
- `--glow-pip: none`
- `--glow-focus: 0 0 0 2px var(--hal-hot), 0 0 0 4px rgba(255, 255, 255, 0.95)`

Shell veils are paper-toned:
```
--shell-veil:        rgba(255, 244, 249, 0.88);
--shell-veil-strong: rgba(255, 244, 249, 0.94);
```

Dither tiles get recolored to magenta (`#c41a8f`), mirroring how the
phosphor-green light variant overrides them.

## Reduced motion

```
@media (prefers-reduced-motion: reduce) {
    [data-theme^='synthwave-'] {
        --glow-pulse: none;
    }
}
```

## Registry entries

```ts
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
```

`default: true` is NOT set on either — `phosphor-green-dark` keeps it.

## Tests

`registry.test.ts` already has structural assertions that cover any
new entries (palette format, unique ids, exactly-one default,
`DEFAULT_THEME` matches the marked default). Add explicit
existence checks:

```ts
it('contains both synthwave variants', () => {
    const ids = themes.map((t) => t.id);
    expect(ids).toContain('synthwave-dark');
    expect(ids).toContain('synthwave-light');
});
```

The "exactly one default" assertion will catch any accidental duplicate
default flag. No other test changes needed.

## Verification

- `pnpm test` — registry assertions pass.
- Manual smoke: open the dev server, click the theme dropdown, verify:
  - Synthwave appears as a second row with three swatches
  - Selecting it swaps to magenta+cyan in dark mode
  - Toggling the mode button to light produces the pastel daylight variant
  - Toggling back to phosphor-green returns to lime
  - Reload — the chosen family persists (cookie + `LAST_FAMILY_KEY`)
