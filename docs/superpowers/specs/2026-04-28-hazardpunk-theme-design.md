# Hazardpunk theme — design

## Goal

Add a third color family, `hazardpunk`, to the theme registry. Two
variants: `hazardpunk-dark` (HEV-suit / radiation-sign — hazard orange
+ blood-rust + caution yellow on warm-tinted black) and
`hazardpunk-light` (daylight reinterpretation — construction-manual
ink on coated cream paper). `phosphor-green-dark` remains the default.

The trio reads ALL-WARM in the dropdown — orange / red / yellow —
distinct from phosphor-green's lime spread and synthwave's magenta-cyan,
which means the family is identifiable from the swatch alone.

## Non-goals

- No changes to controls, resolver, cookies, or the light/dark/system
  mode toggle.
- No new design tokens. Hazardpunk reuses the existing `--hal-*`,
  `--color-*`, `--glow-*`, `--shell-veil*`, and `--dither-*`
  namespaces — these are the cross-theme contract.
- No change to `DEFAULT_THEME` or `DEFAULT_MODE`.
- No changes to status colors (`--color-ok` etc.) — those stay shared
  across themes.

## Files touched

| File | Change |
| --- | --- |
| `src/lib/theme/themes/hazardpunk.css` | new — mirrors `synthwave.css` structure |
| `src/lib/theme/registry.ts` | add 2 entries (`hazardpunk-dark`, `hazardpunk-light`) |
| `src/app.css` | add `@import './lib/theme/themes/hazardpunk.css' layer(themes);` |
| `src/lib/theme/registry.test.ts` | add assertions for both hazardpunk ids |

## Palette — `hazardpunk-dark` (HEV-suit / radiation-sign)

Background ladder is black with a hint of warmth — not the cool
near-black of phosphor-green or the indigo of synthwave. Accents are
hazard orange (headline), oxidized blood-red (bridge), and caution
yellow (the "cool slot" — there is no actually-cool color in this
family, by design).

```
--hal-anthra:     #0a0604   /* warm-tinted black */
--hal-anthra-2:   #120a06
--hal-anthra-3:   #1a0e07
--hal-edge:       #3d251a   /* oxidized warm grey-brown */
--hal-warm:       #c2330d   /* oxidized red — blood-rust bridge */
--hal-hot:        #ff6b1a   /* hazard orange — headline accent */
--hal-ember:      #ff9a4d   /* amber for emphasis states */
--hal-bone:       #ffe8d0   /* warm placard-cream — body text */
--hal-dim:        #a87858   /* muted ember — secondary text */
--hal-deep-dim:   #3d2a1d
--hal-cool:       #ffcc00   /* SAE caution yellow — secondary accent */
```

Glow tokens follow the same shape as `phosphor-green-dark` and
`synthwave-dark`:
- `--glow-text` — orange halo around text
- `--glow-edge` — orange edge halo
- `--glow-pip` — orange pip glow
- `--glow-focus` — orange focus ring
- `--glow-panel` — soft inset highlight + outer shadow
- `--glow-pulse` — reuse `pulse-phosphor` keyframe

Shell veils tinted with the warm-black background:
```
--shell-veil:        rgba(10, 6, 4, 0.6);
--shell-veil-strong: rgba(10, 6, 4, 0.72);
```

Dither tiles must be overridden — defaults in `tokens.css` are lime
(`#b8ff5a`); inheriting them would render lime tiles on top of an
orange surface in `InstrumentCluster.svelte` and `Halo.svelte`.
Override `--dither-sparse / -medium / -dense` to use the headline
hazard orange `#ff6b1a` (URL-encoded as `%23ff6b1a` in the inline SVG
data URIs, same shape as the existing tiles).

## Palette — `hazardpunk-light` (daylight reinterpretation)

Construction-manual ink on coated cream paper. NOT a deep-rust-on-cream
inversion of the dark variant — the saturation is dialed down enough
to read as a "warning placard at noon" rather than a HEV-suit at night.

```
--hal-anthra:     #fff5e8   /* coated paper cream */
--hal-anthra-2:   #ffebd6
--hal-anthra-3:   #ffe1c4
--hal-edge:       #d99c6e   /* dusty terracotta */
--hal-warm:       #8b1c0a   /* oxblood */
--hal-hot:        #cc4400   /* deep rust orange — headline (AA on cream) */
--hal-ember:      #7a2200   /* deeper rust */
--hal-bone:       #2a0e02   /* deep rust-black — body text */
--hal-dim:        #9c5d3a   /* muted clay */
--hal-deep-dim:   #d4a78a
--hal-cool:       #aa7700   /* dark amber — caution yellow translated */
```

Glow tokens follow the light-variant convention from the other
families: punch-through, no halos.
- `--glow-text: none`
- `--glow-edge: 0 0 0 1px var(--hal-hot)`
- `--glow-panel: 0 1px 0 var(--hal-edge)`
- `--glow-pip: none`
- `--glow-focus: 0 0 0 2px var(--hal-hot), 0 0 0 4px rgba(255, 255, 255, 0.95)`

Shell veils — paper-toned:
```
--shell-veil:        rgba(255, 245, 232, 0.88);
--shell-veil-strong: rgba(255, 245, 232, 0.94);
```

Dither tiles get recolored to deep rust orange (`#cc4400`,
URL-encoded as `%23cc4400`).

## Reduced motion

```
@media (prefers-reduced-motion: reduce) {
    [data-theme^='hazardpunk-'] {
        --glow-pulse: none;
    }
}
```

## Registry entries

```ts
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

`default: true` is NOT set on either — `phosphor-green-dark` keeps it.

## Tests

Add an existence check to `registry.test.ts`:

```ts
it('contains both hazardpunk variants', () => {
    const ids = themes.map((t) => t.id);
    expect(ids).toContain('hazardpunk-dark');
    expect(ids).toContain('hazardpunk-light');
});
```

The existing structural assertions (palette format, unique ids,
exactly-one default) automatically cover the new entries.

## Verification

- `pnpm test` — all theme tests pass.
- `pnpm build` — succeeds.
- Manual smoke: open the dev server, click the theme dropdown, verify:
  - Hazardpunk appears as a third row with three swatches reading orange/red/yellow
  - Selecting it swaps to hazard orange + blood-rust + caution-yellow on warm-black
  - Toggling the mode button to light produces the cream-and-rust daylight variant
  - Toggling back to phosphor-green or synthwave returns to those families
  - Reload — the chosen family persists (cookie + `LAST_FAMILY_KEY`)
  - Dither fills in `InstrumentCluster` minimap and `Halo` are orange (not lime bleed-through) on hazardpunk-dark
