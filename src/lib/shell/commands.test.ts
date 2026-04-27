import { describe, it, expect, vi } from 'vitest';

vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
vi.mock('./overlay', () => ({ openOverlay: vi.fn(), closeOverlay: vi.fn() }));

import { commands } from './commands';
import { sections, utilities } from './sections';

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
		const expected = new Set([
			...sections.map((s) => s.hotkey),
			...utilities.map((u) => u.hotkey)
		]);
		const actual = new Set(commands.map((c) => c.hotkey));
		expect(actual).toEqual(expected);
	});
});
