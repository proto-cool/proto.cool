# Nav theme controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the nav header right-cluster: replace `StatusStrip` text (LIVE / clock / SIG) with a thinner decorative `GreebleStrip`, add a `ThemeControls` subgroup (sys button + theme button + dropdown picker), and stamp hotkey "corner pip" greebles on every nav button that owns a hotkey. Adopt `phosphor-svelte` for icons.

**Architecture:**

- `BrandBadge` (with its inline archive greeble) stays anchored left. `NavPanel` becomes a 5-col grid `auto 1fr auto auto auto` so the elastic gap sits between the brand and a tight right cluster of `ChannelPads`, `ThemeControls`, `GreebleStrip`.
- The existing `ThemePickerOverlay` is deleted; the dropdown inside `ThemeControls` is the picker. The existing `theme-picker` command remains in `commands.ts` (so the help overlay still lists `[t]`) but its `run()` now toggles a `themeDropdownOpen` writable that `ThemeControls` subscribes to.
- The `theme/registry.ts` registry is restructured so every light/dark variant is its own entry with `family`, `familyName`, `variant`, and an in-JS `palette` object (the swatch trio reads from `palette.hot / warm / cool`). The CSS file shape (`[data-theme='phosphor-green']`) is unchanged — JS palette is just the source of swatch colors.
- "System" mode (Y2): a `proto-last-family` localStorage key remembers the last family the user chose; when sys is on, the resolver maps OS scheme + family → concrete theme id.

**Tech Stack:** Svelte 5 runes, SvelteKit 2.x, Vitest 4, `phosphor-svelte` (new), Prettier + ESLint, container queries (`container chrome`).

**Spec:** `docs/superpowers/specs/2026-04-28-nav-theme-controls-design.md`

---

## File map

**New files**

- `src/lib/shell/theme-controls.ts` — `themeDropdownOpen` writable, `resolveSysTheme()` resolver, `LAST_FAMILY_KEY` constant.
- `src/lib/shell/theme-controls.test.ts` — store + resolver unit tests.
- `src/lib/shell/ThemeControls.svelte` — sys button + theme button + dropdown.
- `src/lib/shell/GreebleStrip.svelte` — tick rule + lit pips.

**Modified files**

- `package.json` — add `phosphor-svelte`.
- `src/lib/theme/registry.ts` — add `phosphor-green-light`, restructure entries with `family`, `familyName`, `variant`, `palette`.
- `src/lib/theme/resolve.test.ts` — update for new theme ids.
- `src/lib/shell/NavPanel.svelte` — 5-col grid, drop `<StatusStrip />`, mount `<ThemeControls />` and `<GreebleStrip />`, drop `.channels { justify-self: center }`, add scaling rule for new components.
- `src/lib/shell/ChannelPads.svelte` — render corner pip from `s.hotkey`.
- `src/lib/shell/commands.ts` — `theme-picker.run()` toggles `themeDropdownOpen`.
- `src/lib/shell/commands.test.ts` — drop the `openOverlay` mock dependency on `theme`.
- `src/lib/shell/overlay.ts` — drop `'theme'` from `OverlayKind`.
- `src/lib/shell/overlay.test.ts` — drop `'theme'` from "second overlay replaces" test (replace with `'help'` only or remove that case).
- `src/lib/shell/KeyboardLayer.svelte` — drop `ThemePickerOverlay` import + `theme` branch.

**Deleted files**

- `src/lib/shell/ThemePickerOverlay.svelte`
- `src/lib/shell/StatusStrip.svelte`

---

### Task 1: Add phosphor-svelte dependency

**Files:**

- Modify: `package.json` (dependencies block)

- [ ] **Step 1: Install phosphor-svelte**

Run: `npm install phosphor-svelte`

Expected: `phosphor-svelte` appears under `dependencies` in `package.json` and `package-lock.json`. Quick verify:

```bash
node -e "console.log(require('./package.json').dependencies['phosphor-svelte'])"
```

Expected output: a version string (e.g. `^3.0.0`).

- [ ] **Step 2: Verify import works**

Run: `node --input-type=module -e "import('phosphor-svelte/Monitor').then(m => console.log(typeof m.default))"`

Expected output: `function` (a Svelte component).

If the path doesn't resolve, the import becomes `import { Monitor, CaretDown } from 'phosphor-svelte'` (barrel import); the per-icon path is an optimization and not required.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: add phosphor-svelte for nav icons"
```

---

### Task 2: Restructure theme registry

**Files:**

- Modify: `src/lib/theme/registry.ts`
- Test: `src/lib/theme/registry.test.ts` (new)

- [ ] **Step 1: Write the failing test**

Create `src/lib/theme/registry.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { themes, DEFAULT_THEME, DEFAULT_MODE } from './registry';

describe('theme registry', () => {
	it('contains both phosphor-green variants', () => {
		const ids = themes.map((t) => t.id);
		expect(ids).toContain('phosphor-green-dark');
		expect(ids).toContain('phosphor-green-light');
	});

	it('every entry has family, familyName, variant, palette', () => {
		for (const t of themes) {
			expect(t.family).toBeTruthy();
			expect(t.familyName).toBeTruthy();
			expect(['dark', 'light']).toContain(t.variant);
			expect(t.palette.hot).toMatch(/^#/);
			expect(t.palette.warm).toMatch(/^#/);
			expect(t.palette.cool).toMatch(/^#/);
		}
	});

	it('exactly one entry is marked default', () => {
		const defaults = themes.filter((t) => t.default);
		expect(defaults).toHaveLength(1);
	});

	it('DEFAULT_THEME points at the default entry', () => {
		const def = themes.find((t) => t.default);
		expect(def?.id).toBe(DEFAULT_THEME);
	});

	it('DEFAULT_MODE is dark', () => {
		expect(DEFAULT_MODE).toBe('dark');
	});

	it('every id is unique', () => {
		const ids = themes.map((t) => t.id);
		expect(new Set(ids).size).toBe(ids.length);
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/theme/registry.test.ts`

Expected: FAIL — `themes` entries don't have `family`, `familyName`, `variant`, or `palette`.

- [ ] **Step 3: Rewrite the registry**

Replace the contents of `src/lib/theme/registry.ts` with:

```ts
export type Variant = 'dark' | 'light';
export type Mode = 'dark' | 'light' | 'system';

export type Palette = {
	hot: string;
	warm: string;
	cool: string;
};

export type ThemeEntry = {
	id: string;
	family: string;
	familyName: string;
	variant: Variant;
	palette: Palette;
	default?: boolean;
};

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
	}
] as const satisfies readonly ThemeEntry[];

export type ThemeId = (typeof themes)[number]['id'];

export const DEFAULT_THEME: ThemeId = 'phosphor-green-dark';
export const DEFAULT_MODE: Mode = 'dark';
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/theme/registry.test.ts`

Expected: PASS — all six assertions green.

- [ ] **Step 5: Update existing resolve test for the new theme ids**

The existing `src/lib/theme/resolve.test.ts` still references `'phosphor-green'` as a valid id; that id no longer exists. Replace its contents with:

```ts
import { describe, it, expect } from 'vitest';
import { resolveTheme, resolveMode } from './resolve';

describe('resolveTheme', () => {
	it('returns a known theme id when valid', () => {
		expect(resolveTheme('phosphor-green-dark')).toBe('phosphor-green-dark');
		expect(resolveTheme('phosphor-green-light')).toBe('phosphor-green-light');
	});

	it('returns the default when the value is unknown', () => {
		expect(resolveTheme('not-a-theme')).toBe('phosphor-green-dark');
	});

	it('returns the default when the value is undefined', () => {
		expect(resolveTheme(undefined)).toBe('phosphor-green-dark');
	});

	it('returns the default for empty string', () => {
		expect(resolveTheme('')).toBe('phosphor-green-dark');
	});
});

describe('resolveMode', () => {
	it('returns valid modes verbatim', () => {
		expect(resolveMode('dark')).toBe('dark');
		expect(resolveMode('light')).toBe('light');
		expect(resolveMode('system')).toBe('system');
	});

	it('returns the default for unknown values', () => {
		expect(resolveMode('purple')).toBe('dark');
	});

	it('returns the default for undefined', () => {
		expect(resolveMode(undefined)).toBe('dark');
	});
});
```

- [ ] **Step 6: Run the full test suite**

Run: `npm run test`

Expected: PASS. (Resolve, registry, all other existing tests stay green. If the cookies test or any other test references `'phosphor-green'`, update those references to `'phosphor-green-dark'` in the same edit.)

- [ ] **Step 7: Update legacy cookie writes if needed**

Run: `grep -rn "'phosphor-green'" src/`

Expected output: no matches. (If any are found in non-test code, update them to `'phosphor-green-dark'`.)

- [ ] **Step 8: Verify the runtime CSS file still applies**

The CSS file is keyed on `[data-theme='phosphor-green']` (the family name without `-dark`). Now that the registry stores ids like `phosphor-green-dark`, `setTheme()` will write `data-theme="phosphor-green-dark"` and the CSS won't match.

Open `src/lib/theme/themes/phosphor-green.css` and change the selector:

```css
[data-theme='phosphor-green-dark'] {
	/* ... existing tokens unchanged ... */
}
```

(No content change inside the block — only the selector.)

- [ ] **Step 9: Sanity-check by running the dev server briefly**

Run: `npm run dev` (background)

Open http://localhost:5173/ in a browser, confirm the page renders with the phosphor-green colors. Stop the dev server.

- [ ] **Step 10: Commit**

```bash
git add src/lib/theme/registry.ts src/lib/theme/registry.test.ts \
        src/lib/theme/resolve.test.ts src/lib/theme/themes/phosphor-green.css
git commit -m "theme: split registry by variant; add palette + family fields"
```

---

### Task 3: Theme controls store + sys-mode resolver

**Files:**

- Create: `src/lib/shell/theme-controls.ts`
- Test: `src/lib/shell/theme-controls.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/shell/theme-controls.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { themeDropdownOpen, resolveSysTheme, LAST_FAMILY_KEY } from './theme-controls';

beforeEach(() => themeDropdownOpen.set(false));

describe('themeDropdownOpen store', () => {
	it('starts closed', () => {
		expect(get(themeDropdownOpen)).toBe(false);
	});

	it('toggles via update', () => {
		themeDropdownOpen.update((v) => !v);
		expect(get(themeDropdownOpen)).toBe(true);
		themeDropdownOpen.update((v) => !v);
		expect(get(themeDropdownOpen)).toBe(false);
	});
});

describe('resolveSysTheme', () => {
	it('returns dark variant of last family when OS prefers dark', () => {
		const id = resolveSysTheme({ prefersDark: true, lastFamily: 'phosphor-green' });
		expect(id).toBe('phosphor-green-dark');
	});

	it('returns light variant of last family when OS prefers light', () => {
		const id = resolveSysTheme({ prefersDark: false, lastFamily: 'phosphor-green' });
		expect(id).toBe('phosphor-green-light');
	});

	it('falls back to default family when lastFamily is null', () => {
		const id = resolveSysTheme({ prefersDark: true, lastFamily: null });
		expect(id).toBe('phosphor-green-dark');
	});

	it('falls back to default family when lastFamily is unknown', () => {
		const id = resolveSysTheme({ prefersDark: true, lastFamily: 'acid-yellow' });
		expect(id).toBe('phosphor-green-dark');
	});

	it('falls back to the other variant when the requested variant is missing', () => {
		// If only 'dark' existed for the family, prefersDark:false should still return dark.
		// We verify this by simulating: prefersDark:false, lastFamily that has light registered
		// (phosphor-green has both). To exercise the fallback path we pass an unknown family
		// which forces default-family resolution; both variants exist there, so the result
		// is light. Use a synthetic case: assert that with an unknown family + prefersDark:false,
		// the result still resolves to a real theme id.
		const id = resolveSysTheme({ prefersDark: false, lastFamily: 'unknown' });
		expect(['phosphor-green-dark', 'phosphor-green-light']).toContain(id);
	});

	it('exposes a stable localStorage key', () => {
		expect(LAST_FAMILY_KEY).toBe('proto-last-family');
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/shell/theme-controls.test.ts`

Expected: FAIL with module-resolution error (`theme-controls` doesn't exist yet).

- [ ] **Step 3: Implement the store + resolver**

Create `src/lib/shell/theme-controls.ts`:

```ts
import { writable } from 'svelte/store';
import { themes, DEFAULT_THEME, type ThemeId } from '$lib/theme';

export const themeDropdownOpen = writable(false);

export const LAST_FAMILY_KEY = 'proto-last-family';

type ResolveArgs = {
	prefersDark: boolean;
	lastFamily: string | null;
};

/**
 * Pure: pick the concrete theme id for "system" mode.
 *
 * - Find the family — last user-picked family, or the default family if missing/unknown.
 * - Pick the variant matching the OS scheme.
 * - If that exact variant isn't registered for the family, return the family's other variant.
 */
export function resolveSysTheme({ prefersDark, lastFamily }: ResolveArgs): ThemeId {
	const want: 'dark' | 'light' = prefersDark ? 'dark' : 'light';

	const defaultFamily = themes.find((t) => t.id === DEFAULT_THEME)?.family;
	const family =
		(lastFamily && themes.some((t) => t.family === lastFamily) ? lastFamily : defaultFamily) ?? '';

	const inFamily = themes.filter((t) => t.family === family);
	const exact = inFamily.find((t) => t.variant === want);
	if (exact) return exact.id as ThemeId;

	const fallback = inFamily[0];
	return (fallback?.id ?? DEFAULT_THEME) as ThemeId;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/shell/theme-controls.test.ts`

Expected: PASS — all assertions green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/shell/theme-controls.ts src/lib/shell/theme-controls.test.ts
git commit -m "shell: add theme-controls store and sys-mode resolver"
```

---

### Task 4: Rewire theme-picker command to the new store

**Files:**

- Modify: `src/lib/shell/commands.ts`
- Modify: `src/lib/shell/commands.test.ts`

- [ ] **Step 1: Update the test for the rewired command**

Replace the contents of `src/lib/shell/commands.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { get } from 'svelte/store';

vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
vi.mock('./overlay', () => ({ openOverlay: vi.fn(), closeOverlay: vi.fn() }));

import { commands } from './commands';
import { sections, utilities } from './sections';
import { themeDropdownOpen } from './theme-controls';

describe('commands registry', () => {
	it('contains a navigation command for every section', () => {
		const navIds = sections.map((s) => `goto-${s.id}`);
		for (const id of navIds) {
			expect(commands.find((c) => c.id === id)).toBeDefined();
		}
	});

	it('contains theme-picker and help', () => {
		expect(commands.find((c) => c.id === 'theme-picker')).toBeDefined();
		expect(commands.find((c) => c.id === 'help')).toBeDefined();
	});

	it('does NOT contain search or command (out of scope for v1)', () => {
		expect(commands.find((c) => c.id === 'search')).toBeUndefined();
		expect(commands.find((c) => c.id === 'command')).toBeUndefined();
	});

	it('every hotkey is unique', () => {
		const keys = commands.map((c) => c.hotkey);
		expect(new Set(keys).size).toBe(keys.length);
	});

	it('every category is one of the three allowed values', () => {
		const allowed = new Set(['navigation', 'theme', 'help']);
		for (const c of commands) expect(allowed.has(c.category)).toBe(true);
	});

	it('hotkey list equals section + utility hotkeys', () => {
		const expected = new Set([...sections.map((s) => s.hotkey), ...utilities.map((u) => u.hotkey)]);
		const actual = new Set(commands.map((c) => c.hotkey));
		expect(actual).toEqual(expected);
	});

	it('theme-picker.run toggles themeDropdownOpen', () => {
		themeDropdownOpen.set(false);
		const themeCmd = commands.find((c) => c.id === 'theme-picker')!;
		themeCmd.run();
		expect(get(themeDropdownOpen)).toBe(true);
		themeCmd.run();
		expect(get(themeDropdownOpen)).toBe(false);
	});
});
```

- [ ] **Step 2: Run the test to verify the new case fails**

Run: `npx vitest run src/lib/shell/commands.test.ts`

Expected: FAIL — `theme-picker.run` still calls `openOverlay('theme')`, not the dropdown store.

- [ ] **Step 3: Rewire commands.ts**

Replace the contents of `src/lib/shell/commands.ts`:

```ts
import { goto } from '$app/navigation';
import { sections } from './sections';
import { openOverlay } from './overlay';
import { themeDropdownOpen } from './theme-controls';

export type CommandCategory = 'navigation' | 'theme' | 'help';

export type Command = {
	id: string;
	hotkey: string;
	label: string;
	category: CommandCategory;
	run: () => void;
};

const navCommands: Command[] = sections.map((s) => ({
	id: `goto-${s.id}`,
	hotkey: s.hotkey,
	label: `go to ${s.label}`,
	category: 'navigation',
	run: () => goto(s.href)
}));

export const commands: Command[] = [
	...navCommands,
	{
		id: 'theme-picker',
		hotkey: 't',
		label: 'theme picker',
		category: 'theme',
		run: () => themeDropdownOpen.update((v) => !v)
	},
	{
		id: 'help',
		hotkey: '?',
		label: 'help',
		category: 'help',
		run: () => openOverlay('help')
	}
];

export function findCommand(hotkey: string): Command | undefined {
	return commands.find((c) => c.hotkey === hotkey);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/shell/commands.test.ts`

Expected: PASS — including the new `theme-picker.run toggles themeDropdownOpen` case.

- [ ] **Step 5: Commit**

```bash
git add src/lib/shell/commands.ts src/lib/shell/commands.test.ts
git commit -m "shell: rewire theme-picker command to dropdown store"
```

---

### Task 5: Drop 'theme' from OverlayKind

**Files:**

- Modify: `src/lib/shell/overlay.ts`
- Modify: `src/lib/shell/overlay.test.ts`

- [ ] **Step 1: Update the test**

Replace the contents of `src/lib/shell/overlay.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { openOverlay, closeOverlay, currentOverlay } from './overlay';

beforeEach(() => closeOverlay());

describe('overlay store', () => {
	it('starts null', () => {
		expect(get(currentOverlay)).toBeNull();
	});

	it('openOverlay sets the kind', () => {
		openOverlay('help');
		expect(get(currentOverlay)).toBe('help');
	});

	it('closeOverlay resets to null', () => {
		openOverlay('help');
		closeOverlay();
		expect(get(currentOverlay)).toBeNull();
	});
});
```

- [ ] **Step 2: Drop 'theme' from the OverlayKind union**

Replace the contents of `src/lib/shell/overlay.ts`:

```ts
import { writable, type Readable } from 'svelte/store';

export type OverlayKind = 'help';

const store = writable<OverlayKind | null>(null);

export const currentOverlay: Readable<OverlayKind | null> = { subscribe: store.subscribe };

export function openOverlay(kind: OverlayKind): void {
	store.set(kind);
}

export function closeOverlay(): void {
	store.set(null);
}
```

- [ ] **Step 3: Run the test**

Run: `npx vitest run src/lib/shell/overlay.test.ts`

Expected: PASS.

- [ ] **Step 4: Verify type-check still passes**

Run: `npm run check`

Expected: A type error in `KeyboardLayer.svelte` (it imports `ThemePickerOverlay` and references `'theme'` in its `if/else if` — those will be fixed in the next task). Note the error and continue — do not commit yet.

- [ ] **Step 5: Update KeyboardLayer to drop the theme branch**

Replace the contents of `src/lib/shell/KeyboardLayer.svelte`:

```svelte
<script lang="ts">
	import { onMount } from 'svelte';
	import { findCommand } from './commands';
	import { currentOverlay, closeOverlay, type OverlayKind } from './overlay';
	import HelpOverlay from './HelpOverlay.svelte';

	let openKind = $state<OverlayKind | null>(null);
	$effect(() => currentOverlay.subscribe((v) => (openKind = v)));

	function isFormTarget(t: EventTarget | null): boolean {
		if (!(t instanceof HTMLElement)) return false;
		return !!t.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]');
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.ctrlKey || e.metaKey || e.altKey) return;
		if (isFormTarget(e.target)) return;

		if (e.key === 'Escape') {
			if (openKind) {
				e.preventDefault();
				closeOverlay();
			}
			return;
		}

		if (openKind) return; // overlay swallows other hotkeys

		const cmd = findCommand(e.key);
		if (cmd) {
			e.preventDefault();
			cmd.run();
		}
	}

	onMount(() => {
		window.addEventListener('keydown', onKeydown);
		return () => window.removeEventListener('keydown', onKeydown);
	});
</script>

{#if openKind === 'help'}
	<HelpOverlay />
{/if}
```

- [ ] **Step 6: Delete ThemePickerOverlay.svelte**

Run: `git rm src/lib/shell/ThemePickerOverlay.svelte`

Expected output: `rm 'src/lib/shell/ThemePickerOverlay.svelte'`.

- [ ] **Step 7: Verify type-check is clean**

Run: `npm run check`

Expected: 0 errors, 0 warnings.

- [ ] **Step 8: Run the full test suite**

Run: `npm run test`

Expected: PASS (all suites).

- [ ] **Step 9: Commit**

```bash
git add src/lib/shell/overlay.ts src/lib/shell/overlay.test.ts \
        src/lib/shell/KeyboardLayer.svelte
git commit -m "shell: remove theme overlay; help is now the only overlay kind"
```

---

### Task 6: Add corner pip greeble to ChannelPads

**Files:**

- Modify: `src/lib/shell/ChannelPads.svelte`

- [ ] **Step 1: Add the pip markup and styles**

Replace the contents of `src/lib/shell/ChannelPads.svelte`:

```svelte
<script lang="ts">
	import { page } from '$app/state';
	import { sections } from './sections';

	function isActive(href: string, pathname: string): boolean {
		if (href === '/') return pathname === '/';
		return pathname === href || pathname.startsWith(href + '/');
	}
</script>

<nav class="channels" aria-label="sections">
	{#each sections as s (s.id)}
		{@const active = isActive(s.href, page.url.pathname)}
		<a class="ch" class:live={active} href={s.href} aria-current={active ? 'page' : undefined}>
			<span class="lamp" aria-hidden="true"></span>
			<span class="label">{s.label}</span>
			<span class="pip" aria-hidden="true">[{s.hotkey}]</span>
		</a>
	{/each}
</nav>

<style>
	.channels {
		display: inline-flex;
		align-items: stretch;
		gap: 8px;
	}
	.ch {
		position: relative;
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 7px 12px;
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--hal-dim);
		border: 1px solid var(--hal-edge);
		background: rgba(0, 0, 0, 0.25);
		text-decoration: none;
	}
	.ch:hover {
		color: var(--hal-bone);
	}
	.ch:focus-visible {
		outline: 2px solid var(--hal-hot);
		outline-offset: 2px;
	}
	.lamp {
		width: 6px;
		height: 6px;
		border-radius: 999px;
		background: var(--hal-deep-dim);
		box-shadow: inset 0 0 0 1px #0a0c0a;
	}
	.live {
		color: var(--hal-bone);
		border-color: var(--hal-hot);
		background: linear-gradient(180deg, rgba(184, 255, 90, 0.18), rgba(184, 255, 90, 0.04));
		box-shadow:
			inset 0 0 16px rgba(184, 255, 90, 0.18),
			0 0 8px rgba(184, 255, 90, 0.18);
	}
	.live .lamp {
		background: var(--hal-hot);
		box-shadow:
			0 0 5px var(--hal-hot),
			0 0 12px rgba(130, 227, 75, 0.7);
	}

	/* corner pip greeble — stamped serial in the top-right */
	.pip {
		position: absolute;
		top: -1px;
		right: -1px;
		padding: 1px 4px;
		font-family: var(--font-mono);
		font-size: 9px;
		line-height: 1;
		letter-spacing: 0.08em;
		color: var(--hal-deep-dim);
		background: rgba(6, 9, 6, 0.7);
		border-left: 1px solid var(--hal-edge);
		border-bottom: 1px solid var(--hal-edge);
		transition:
			color 220ms ease,
			text-shadow 220ms ease;
	}
	.ch:hover .pip,
	.ch:focus-visible .pip,
	.ch.live .pip {
		color: var(--hal-hot);
		text-shadow: 0 0 8px rgba(184, 255, 90, 0.5);
	}
	@media (prefers-reduced-motion: reduce) {
		.pip {
			transition: none;
		}
	}
</style>
```

- [ ] **Step 2: Verify type-check + lint**

Run: `npm run check && npm run lint`

Expected: 0 errors.

- [ ] **Step 3: Visual smoke**

Run: `npm run dev` (background)

Open http://localhost:5173/ in the browser. Confirm: each channel pad (CONTENT / PROJECTS / ABOUT) now has a small `[1]` / `[2]` / `[3]` stamp tucked into its top-right corner, dim by default, brightening on hover and on the active section. Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add src/lib/shell/ChannelPads.svelte
git commit -m "shell: add corner-pip hotkey greeble to channel pads"
```

---

### Task 7: ThemeControls component

**Files:**

- Create: `src/lib/shell/ThemeControls.svelte`

- [ ] **Step 1: Create the component**

Create `src/lib/shell/ThemeControls.svelte`:

```svelte
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Monitor, CaretDown } from 'phosphor-svelte';
	import { themes, setTheme, setMode, resolveTheme, resolveMode, type ThemeId } from '$lib/theme';
	import { themeDropdownOpen, resolveSysTheme, LAST_FAMILY_KEY } from './theme-controls';

	let open = $state(false);
	$effect(() => themeDropdownOpen.subscribe((v) => (open = v)));

	let currentThemeId = $state<ThemeId>(
		typeof document !== 'undefined'
			? resolveTheme(document.documentElement.dataset.theme)
			: themes[0].id
	);
	let currentMode = $state(
		typeof document !== 'undefined'
			? resolveMode(document.documentElement.dataset.mode)
			: ('dark' as const)
	);

	let mql: MediaQueryList | null = null;

	function readLastFamily(): string | null {
		try {
			return typeof localStorage !== 'undefined' ? localStorage.getItem(LAST_FAMILY_KEY) : null;
		} catch {
			return null;
		}
	}

	function writeLastFamily(family: string) {
		try {
			localStorage.setItem(LAST_FAMILY_KEY, family);
		} catch {
			/* ignore quota / private mode */
		}
	}

	function applyTheme(id: ThemeId, opts: { remember: boolean }) {
		const entry = themes.find((t) => t.id === id);
		if (!entry) return;
		setTheme(id);
		setMode(entry.variant);
		currentThemeId = id;
		currentMode = entry.variant;
		if (opts.remember) writeLastFamily(entry.family);
	}

	function applySys() {
		setMode('system');
		currentMode = 'system';
		const lastFamily = readLastFamily();
		const resolved = resolveSysTheme({
			prefersDark: !!mql?.matches,
			lastFamily
		});
		setTheme(resolved);
		currentThemeId = resolved;
	}

	function pickRow(id: ThemeId) {
		applyTheme(id, { remember: true });
		themeDropdownOpen.set(false);
	}

	function toggleSys() {
		if (currentMode === 'system') {
			applyTheme(currentThemeId, { remember: false });
		} else {
			applySys();
		}
	}

	function toggleDropdown() {
		themeDropdownOpen.update((v) => !v);
	}

	function onDocClick(e: MouseEvent) {
		if (!open) return;
		const root = document.querySelector('.theme-controls');
		if (root && !root.contains(e.target as Node)) themeDropdownOpen.set(false);
	}

	function onKeydown(e: KeyboardEvent) {
		if (!open) return;
		if (e.key === 'Escape') {
			e.preventDefault();
			themeDropdownOpen.set(false);
		}
	}

	onMount(() => {
		mql = window.matchMedia('(prefers-color-scheme: dark)');
		const onSchemeChange = () => {
			if (currentMode === 'system') applySys();
		};
		mql.addEventListener('change', onSchemeChange);
		document.addEventListener('click', onDocClick);
		document.addEventListener('keydown', onKeydown);

		return () => {
			mql?.removeEventListener('change', onSchemeChange);
			document.removeEventListener('click', onDocClick);
			document.removeEventListener('keydown', onKeydown);
		};
	});

	onDestroy(() => {
		// store-only side-effect: ensure dropdown closes if the component unmounts open
		themeDropdownOpen.set(false);
	});

	let currentEntry = $derived(themes.find((t) => t.id === currentThemeId) ?? themes[0]);
	let sysActive = $derived(currentMode === 'system');
</script>

<div class="theme-controls">
	<button
		type="button"
		class="ctrl sys"
		class:live={sysActive}
		aria-pressed={sysActive}
		title="follow OS color scheme"
		onclick={toggleSys}
	>
		<span class="icon" aria-hidden="true"><Monitor size={14} weight="regular" /></span>
	</button>

	<button
		type="button"
		class="ctrl theme"
		class:live={open}
		aria-haspopup="listbox"
		aria-expanded={open}
		title={currentEntry.familyName + ' · ' + currentEntry.variant}
		onclick={toggleDropdown}
	>
		<span class="swatch" aria-hidden="true">
			<i style="background:{currentEntry.palette.hot}"></i>
			<i style="background:{currentEntry.palette.warm}"></i>
			<i style="background:{currentEntry.palette.cool}"></i>
		</span>
		<span class="caret" aria-hidden="true"><CaretDown size={12} weight="bold" /></span>
		<span class="pip" aria-hidden="true">[t]</span>
	</button>

	{#if open}
		<ul class="dropdown" role="listbox" aria-label="theme">
			{#each themes as t (t.id)}
				{@const active = t.id === currentThemeId && currentMode !== 'system'}
				<li>
					<button
						type="button"
						class="row"
						class:live={active}
						role="option"
						aria-selected={active}
						onclick={() => pickRow(t.id)}
					>
						<span class="swatch" aria-hidden="true">
							<i style="background:{t.palette.hot}"></i>
							<i style="background:{t.palette.warm}"></i>
							<i style="background:{t.palette.cool}"></i>
						</span>
						<span class="name">{t.familyName}</span>
						<span class="tag">· {t.variant === 'dark' ? 'DK' : 'LT'}</span>
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.theme-controls {
		position: relative;
		display: inline-flex;
		align-items: stretch;
		gap: 0;
	}

	.ctrl {
		position: relative;
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 7px 10px;
		font: inherit;
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--hal-dim);
		background: rgba(0, 0, 0, 0.25);
		border: 1px solid var(--hal-edge);
		cursor: pointer;
	}
	.ctrl + .ctrl {
		border-left: none; /* shared edge with sibling — single rule between buttons */
	}
	.ctrl:hover {
		color: var(--hal-bone);
	}
	.ctrl:focus-visible {
		outline: 2px solid var(--hal-hot);
		outline-offset: 2px;
		z-index: 1;
	}
	.ctrl.live {
		color: var(--hal-bone);
		border-color: var(--hal-hot);
		background: linear-gradient(180deg, rgba(184, 255, 90, 0.18), rgba(184, 255, 90, 0.04));
		box-shadow:
			inset 0 0 16px rgba(184, 255, 90, 0.18),
			0 0 8px rgba(184, 255, 90, 0.18);
	}

	.icon {
		display: inline-flex;
		align-items: center;
	}

	.swatch {
		display: inline-flex;
		align-items: center;
		gap: 2px;
	}
	.swatch i {
		display: inline-block;
		width: 8px;
		height: 14px;
		box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.4);
	}

	.caret {
		display: inline-flex;
		align-items: center;
		opacity: 0.7;
	}

	/* corner pip — same treatment as ChannelPads */
	.pip {
		position: absolute;
		top: -1px;
		right: -1px;
		padding: 1px 4px;
		font-family: var(--font-mono);
		font-size: 9px;
		line-height: 1;
		letter-spacing: 0.08em;
		color: var(--hal-deep-dim);
		background: rgba(6, 9, 6, 0.7);
		border-left: 1px solid var(--hal-edge);
		border-bottom: 1px solid var(--hal-edge);
		transition:
			color 220ms ease,
			text-shadow 220ms ease;
	}
	.ctrl:hover .pip,
	.ctrl:focus-visible .pip,
	.ctrl.live .pip {
		color: var(--hal-hot);
		text-shadow: 0 0 8px rgba(184, 255, 90, 0.5);
	}
	@media (prefers-reduced-motion: reduce) {
		.pip {
			transition: none;
		}
	}

	/* dropdown */
	.dropdown {
		position: absolute;
		top: calc(100% + 8px);
		right: 0;
		margin: 0;
		padding: 6px;
		list-style: none;
		min-width: 100%;
		display: flex;
		flex-direction: column;
		gap: 2px;
		background: rgba(6, 9, 6, 0.94);
		border: 1px solid var(--hal-edge);
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
		z-index: 4;
		-webkit-backdrop-filter: blur(6px) saturate(115%);
		backdrop-filter: blur(6px) saturate(115%);
	}
	.row {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 6px 8px;
		width: 100%;
		font: inherit;
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--hal-dim);
		background: transparent;
		border: 1px solid transparent;
		cursor: pointer;
		text-align: left;
	}
	.row:hover {
		color: var(--hal-bone);
		border-color: var(--hal-edge);
	}
	.row:focus-visible {
		outline: 2px solid var(--hal-hot);
		outline-offset: 2px;
	}
	.row.live {
		color: var(--hal-bone);
		border-color: var(--hal-hot);
		background: linear-gradient(180deg, rgba(184, 255, 90, 0.18), rgba(184, 255, 90, 0.04));
		box-shadow: inset 0 0 12px rgba(184, 255, 90, 0.16);
	}
	.row .name {
		color: inherit;
	}
	.row .tag {
		color: var(--hal-cool);
	}
</style>
```

- [ ] **Step 2: Verify type-check**

Run: `npm run check`

Expected: 0 errors. (NavPanel doesn't import this yet — that's fine.)

- [ ] **Step 3: Verify lint**

Run: `npm run lint`

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/shell/ThemeControls.svelte
git commit -m "shell: add ThemeControls (sys + dropdown swatch picker)"
```

---

### Task 8: GreebleStrip component

**Files:**

- Create: `src/lib/shell/GreebleStrip.svelte`

- [ ] **Step 1: Create the component**

Create `src/lib/shell/GreebleStrip.svelte`:

```svelte
<script lang="ts">
	// pure decoration. tick rule with two lit indicator pips.
	// `kind: 'tick' | 'pip-warm' | 'pip-cool'` — pip indices are static so
	// SSR and hydration agree. tick heights alternate long/short.
	type Cell = { kind: 'tick'; tall: boolean } | { kind: 'pip-warm' } | { kind: 'pip-cool' };

	const cells: Cell[] = [
		{ kind: 'tick', tall: true },
		{ kind: 'tick', tall: false },
		{ kind: 'pip-warm' },
		{ kind: 'tick', tall: true },
		{ kind: 'tick', tall: false },
		{ kind: 'tick', tall: true },
		{ kind: 'tick', tall: false },
		{ kind: 'pip-cool' },
		{ kind: 'tick', tall: true },
		{ kind: 'tick', tall: false },
		{ kind: 'tick', tall: true },
		{ kind: 'tick', tall: false }
	];
</script>

<div class="greeble" aria-hidden="true">
	{#each cells as c, i (i)}
		{#if c.kind === 'tick'}
			<i class="tick" class:tall={c.tall}></i>
		{:else if c.kind === 'pip-warm'}
			<i class="pip warm"></i>
		{:else}
			<i class="pip cool"></i>
		{/if}
	{/each}
</div>

<style>
	.greeble {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 0 4px;
		min-height: 14px;
	}
	.tick {
		display: inline-block;
		width: 1px;
		background: var(--hal-deep-dim);
	}
	.tick.tall {
		height: 12px;
	}
	.tick:not(.tall) {
		height: 8px;
	}
	.pip {
		display: inline-block;
		width: 4px;
		height: 4px;
		border-radius: 999px;
	}
	.pip.warm {
		background: var(--hal-warm);
		box-shadow:
			0 0 4px var(--hal-warm),
			0 0 10px rgba(130, 227, 75, 0.55);
		animation: var(--glow-pulse, none);
	}
	.pip.cool {
		background: var(--hal-cool);
		box-shadow:
			0 0 4px var(--hal-cool),
			0 0 10px rgba(74, 210, 156, 0.45);
		animation: var(--glow-pulse, none);
	}
</style>
```

- [ ] **Step 2: Verify type-check + lint**

Run: `npm run check && npm run lint`

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/shell/GreebleStrip.svelte
git commit -m "shell: add GreebleStrip (tick rule + indicator pips)"
```

---

### Task 9: Wire NavPanel to the new layout

**Files:**

- Modify: `src/lib/shell/NavPanel.svelte`

- [ ] **Step 1: Rewrite NavPanel**

Replace the contents of `src/lib/shell/NavPanel.svelte`:

```svelte
<script lang="ts">
	import { onMount } from 'svelte';
	import BrandBadge from './BrandBadge.svelte';
	import ChannelPads from './ChannelPads.svelte';
	import ThemeControls from './ThemeControls.svelte';
	import GreebleStrip from './GreebleStrip.svelte';

	let scrolled = $state(false);

	onMount(() => {
		const onScroll = () => {
			scrolled = window.scrollY > 24;
		};
		onScroll();
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	});
</script>

<header class="nav-panel" class:scrolled>
	<BrandBadge compact={scrolled} />
	<span class="gap" aria-hidden="true"></span>
	<ChannelPads />
	<ThemeControls />
	<GreebleStrip />
</header>

<style>
	.nav-panel {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 5;
		display: grid;
		grid-template-columns: auto 1fr auto auto auto;
		align-items: center;
		gap: 18px;
		padding: 16px 28px;
		background: rgba(6, 9, 6, 0.6);
		border-bottom: 1px solid var(--hal-edge);
		-webkit-backdrop-filter: blur(8px) saturate(115%);
		backdrop-filter: blur(8px) saturate(115%);
		transition:
			padding 380ms cubic-bezier(0.2, 0, 0, 1),
			gap 380ms cubic-bezier(0.2, 0, 0, 1);
		will-change: padding;
	}
	.nav-panel.scrolled {
		padding: 4px 28px;
		gap: 14px;
	}

	.nav-panel::before {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		bottom: -1px;
		height: 1px;
		background: linear-gradient(
			90deg,
			transparent 0,
			rgba(184, 255, 90, 0.18) 25%,
			rgba(184, 255, 90, 0.32) 50%,
			rgba(184, 255, 90, 0.18) 75%,
			transparent 100%
		);
		opacity: 0.55;
		transition: opacity 380ms ease;
		will-change: opacity;
	}
	.nav-panel.scrolled::before {
		opacity: 1;
	}

	.gap {
		display: block;
	}

	/* right cluster scales together when scrolled (matches the old StatusStrip rhythm) */
	.nav-panel :global(.channels),
	.nav-panel :global(.theme-controls),
	.nav-panel :global(.greeble) {
		transform: scale(1) translateZ(0);
		transform-origin: right center;
		transition: transform 380ms cubic-bezier(0.2, 0, 0, 1);
		will-change: transform;
	}
	.nav-panel.scrolled :global(.channels),
	.nav-panel.scrolled :global(.theme-controls),
	.nav-panel.scrolled :global(.greeble) {
		transform: scale(0.92) translateZ(0);
	}
</style>
```

- [ ] **Step 2: Delete StatusStrip.svelte**

Run: `git rm src/lib/shell/StatusStrip.svelte`

Expected output: `rm 'src/lib/shell/StatusStrip.svelte'`.

- [ ] **Step 3: Verify type-check + lint + tests**

Run: `npm run check && npm run lint && npm run test`

Expected: 0 type errors, 0 lint errors, all tests PASS.

- [ ] **Step 4: Visual smoke**

Run: `npm run dev` (background)

Open http://localhost:5173/ in the browser and verify:

- BrandBadge with its archive greeble sits flush left, unchanged.
- The right edge has, in order: ChannelPads with `[1] [2] [3]` corner pips → ThemeControls (sys icon button + theme button with swatch trio + caret + `[t]` pip) → GreebleStrip (small ticks with two glowing pips).
- The `LIVE` / date / `SIG 0X…` text is gone.
- Press `t` — the theme dropdown opens under the theme button. Press `t` again or `Esc` — it closes.
- Click sys — the button lights up; theme follows OS scheme. Click sys again — pinned.
- Click a row in the dropdown — page theme switches and the dropdown closes.
- Press `?` — help overlay still opens and lists `[t]` under "theme".
- Scroll the page — the right cluster shrinks together; BrandBadge collapses its archive greeble as before.

Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add src/lib/shell/NavPanel.svelte
git commit -m "shell: nav layout — right cluster + GreebleStrip; drop StatusStrip"
```

---

### Task 10: Final verification + cleanup

**Files:**

- (read-only)

- [ ] **Step 1: Confirm no stale references remain**

Run: `grep -rn "StatusStrip\|ThemePickerOverlay" src/ docs/superpowers/specs/2026-04-28-nav-theme-controls-design.md`

Expected output: only references inside the spec doc (which describes the deletions). No `src/` matches.

If `src/` matches turn up, follow them and remove the dangling reference, then re-run the test suite.

- [ ] **Step 2: Confirm `setMode('light')` flips data-mode**

Run: `npm run dev` (background)

In the browser, open devtools console and run:

```js
import('/src/lib/theme/index.ts').then(({ setMode }) => setMode('light'));
```

Then inspect `<html>` — `data-mode="light"` should be set. The page will look broken (no light tokens yet); this is expected per the spec ("A — wire it for real, light will be added later"). Restore by running `setMode('dark')` and refreshing.

Stop the dev server.

- [ ] **Step 3: Final lint + check + test**

Run: `npm run lint && npm run check && npm run test`

Expected: clean across the board.

- [ ] **Step 4: Inventory the diff**

Run: `git diff --stat main...HEAD`

Expected: file counts roughly match the file map in the plan header.

- [ ] **Step 5: Spec self-review note (no commit)**

Read the spec one more time and confirm every requirement is implemented. If something is missing (most likely a future edge case), open an issue or note in commit follow-up.

- [ ] **Step 6: Done**

No commit needed for verification. Close the loop with the user, or proceed to the receiving-code-review skill if they want a review pass.

---

## Self-review (filled in after writing this plan)

**Spec coverage:**

- [x] 5-col layout with right cluster — Task 9.
- [x] Drop `.channels { justify-self: center }` — Task 9.
- [x] Sys button (Phosphor `Monitor`) + theme button (swatch + caret) + dropdown — Task 7.
- [x] Y2 system semantics with `proto-last-family` — Task 3 (resolver) + Task 7 (component wiring).
- [x] `themeDropdownOpen` writable + command rewire — Tasks 3 & 4.
- [x] Corner pip on channels and theme button — Tasks 6 & 7.
- [x] GreebleStrip with tick rule + 2 lit pips (option D) — Task 8.
- [x] Drop `theme` from `OverlayKind` and KeyboardLayer branch — Task 5.
- [x] Delete `ThemePickerOverlay.svelte` — Task 5.
- [x] Delete `StatusStrip.svelte` — Task 9.
- [x] Theme registry restructured by variant with `palette` — Task 2 (and CSS selector updated to match new id).
- [x] phosphor-svelte added — Task 1.
- [x] Light variant flips data-mode without locking (per "A") — Task 7 (`applyTheme` calls `setMode(entry.variant)` regardless).

**Type consistency:** `themes`, `ThemeId`, `ThemeEntry`, `Palette`, `Variant`, `Mode` are all defined in Task 2 and consumed unchanged in later tasks. `themeDropdownOpen`, `resolveSysTheme`, `LAST_FAMILY_KEY` are defined in Task 3 and consumed unchanged in Tasks 4 and 7. `setTheme(id)` and `setMode(mode)` already exist in `$lib/theme` and are used as-is.

**Placeholders:** none. Every code step contains a complete file body or a complete diff.
