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

	it('contains theme-picker, help, search, command', () => {
		expect(commands.find((c) => c.id === 'theme-picker')).toBeDefined();
		expect(commands.find((c) => c.id === 'help')).toBeDefined();
		expect(commands.find((c) => c.id === 'search')).toBeDefined();
		expect(commands.find((c) => c.id === 'command')).toBeDefined();
	});

	it('every hotkey is unique', () => {
		const keys = commands.map((c) => c.hotkey);
		expect(new Set(keys).size).toBe(keys.length);
	});

	it('every category is one of the four allowed values', () => {
		const allowed = new Set(['navigation', 'theme', 'prompt', 'help']);
		for (const c of commands) expect(allowed.has(c.category)).toBe(true);
	});

	it('has the same hotkey list as section + utility hotkeys plus / and :', () => {
		const expected = new Set([
			...sections.map((s) => s.hotkey),
			...utilities.map((u) => u.hotkey),
			'/',
			':'
		]);
		const actual = new Set(commands.map((c) => c.hotkey));
		expect(actual).toEqual(expected);
	});
});
