import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { themeDropdownOpen, resolveThemeFor, LAST_FAMILY_KEY } from './theme-controls';

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

describe('resolveThemeFor', () => {
	// --- system mode (OS scheme consulted) ---

	it('system: returns dark variant of last family when OS prefers dark (live registry)', () => {
		const id = resolveThemeFor({ mode: 'system', prefersDark: true, lastFamily: 'phosphor-green' });
		expect(id).toBe('phosphor-green-dark');
	});

	it('system: returns light variant of last family when OS prefers light (live registry)', () => {
		const id = resolveThemeFor({
			mode: 'system',
			prefersDark: false,
			lastFamily: 'phosphor-green'
		});
		expect(id).toBe('phosphor-green-light');
	});

	it('system: falls back to default family when lastFamily is null (live registry)', () => {
		const id = resolveThemeFor({ mode: 'system', prefersDark: true, lastFamily: null });
		expect(id).toBe('phosphor-green-dark');
	});

	it('system: falls back to default family when lastFamily is unknown (live registry)', () => {
		const id = resolveThemeFor({ mode: 'system', prefersDark: true, lastFamily: 'acid-yellow' });
		expect(id).toBe('phosphor-green-dark');
	});

	// --- explicit dark mode ---

	it('dark: returns dark variant regardless of OS scheme', () => {
		const id = resolveThemeFor({
			mode: 'dark',
			prefersDark: false,
			lastFamily: 'phosphor-green'
		});
		expect(id).toBe('phosphor-green-dark');
	});

	it('dark: falls back to default family when lastFamily is null', () => {
		const id = resolveThemeFor({ mode: 'dark', prefersDark: false, lastFamily: null });
		expect(id).toBe('phosphor-green-dark');
	});

	// --- explicit light mode ---

	it('light: returns light variant regardless of OS scheme', () => {
		const id = resolveThemeFor({
			mode: 'light',
			prefersDark: true,
			lastFamily: 'phosphor-green'
		});
		expect(id).toBe('phosphor-green-light');
	});

	it('light: falls back to default family when lastFamily is null', () => {
		const id = resolveThemeFor({ mode: 'light', prefersDark: true, lastFamily: null });
		expect(id).toBe('phosphor-green-light');
	});

	// --- fallback when variant is missing ---

	it("returns the family's other variant when the requested variant is missing", () => {
		const themes = [
			{ id: 'mono-dark', family: 'mono', variant: 'dark' as const },
			{ id: 'duo-dark', family: 'duo', variant: 'dark' as const },
			{ id: 'duo-light', family: 'duo', variant: 'light' as const }
		];
		// mono has only dark; explicit light mode → resolver should fall back to mono-dark.
		const id = resolveThemeFor({
			mode: 'light',
			prefersDark: false,
			lastFamily: 'mono',
			themes,
			defaultThemeId: 'duo-dark'
		});
		expect(id).toBe('mono-dark');
	});

	it('system: falls back when variant missing (fixture)', () => {
		const themes = [
			{ id: 'mono-dark', family: 'mono', variant: 'dark' as const },
			{ id: 'duo-dark', family: 'duo', variant: 'dark' as const },
			{ id: 'duo-light', family: 'duo', variant: 'light' as const }
		];
		// mono has only dark; OS prefers light → resolver should fall back to mono-dark.
		const id = resolveThemeFor({
			mode: 'system',
			prefersDark: false,
			lastFamily: 'mono',
			themes,
			defaultThemeId: 'duo-dark'
		});
		expect(id).toBe('mono-dark');
	});

	// --- defensive case ---

	it('returns defaultThemeId when the registry has no entries (defensive)', () => {
		const id = resolveThemeFor({
			mode: 'system',
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
