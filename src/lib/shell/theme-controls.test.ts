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
	it('returns dark variant of last family when OS prefers dark (live registry)', () => {
		const id = resolveSysTheme({ prefersDark: true, lastFamily: 'phosphor-green' });
		expect(id).toBe('phosphor-green-dark');
	});

	it('returns light variant of last family when OS prefers light (live registry)', () => {
		const id = resolveSysTheme({ prefersDark: false, lastFamily: 'phosphor-green' });
		expect(id).toBe('phosphor-green-light');
	});

	it('falls back to default family when lastFamily is null (live registry)', () => {
		const id = resolveSysTheme({ prefersDark: true, lastFamily: null });
		expect(id).toBe('phosphor-green-dark');
	});

	it('falls back to default family when lastFamily is unknown (live registry)', () => {
		const id = resolveSysTheme({ prefersDark: true, lastFamily: 'acid-yellow' });
		expect(id).toBe('phosphor-green-dark');
	});

	it("returns the family's other variant when the requested variant is missing", () => {
		const themes = [
			{ id: 'mono-dark', family: 'mono', variant: 'dark' as const },
			{ id: 'duo-dark', family: 'duo', variant: 'dark' as const },
			{ id: 'duo-light', family: 'duo', variant: 'light' as const }
		];
		// mono has only dark; OS prefers light → resolver should fall back to mono-dark.
		const id = resolveSysTheme({
			prefersDark: false,
			lastFamily: 'mono',
			themes,
			defaultThemeId: 'duo-dark'
		});
		expect(id).toBe('mono-dark');
	});

	it('returns defaultThemeId when the registry has no entries (defensive)', () => {
		const id = resolveSysTheme({
			prefersDark: true,
			lastFamily: null,
			themes: [],
			defaultThemeId: 'phosphor-green-dark'
		});
		expect(id).toBe('phosphor-green-dark');
	});

	it('exposes a stable localStorage key', () => {
		expect(LAST_FAMILY_KEY).toBe('proto-last-family');
	});
});
