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
