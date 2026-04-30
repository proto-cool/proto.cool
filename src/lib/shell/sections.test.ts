import { describe, it, expect } from 'vitest';
import { sections, utilities } from './sections';

describe('sections', () => {
	it('exposes content, projects, about with hotkeys 1/2/3', () => {
		expect(sections.map((s) => s.id)).toEqual(['content', 'projects', 'about']);
		expect(sections.map((s) => s.hotkey)).toEqual(['1', '2', '3']);
	});

	it('every section has a unique href', () => {
		const hrefs = sections.map((s) => s.href);
		expect(new Set(hrefs).size).toBe(hrefs.length);
	});

	it('every section has pwd starting with ~/', () => {
		for (const s of sections) expect(s.pwd.startsWith('~/')).toBe(true);
	});
});

describe('utilities', () => {
	it('exposes themes (t), mode (m), and help (?)', () => {
		expect(utilities.map((u) => u.id)).toEqual(['themes', 'mode', 'help']);
		expect(utilities.map((u) => u.hotkey)).toEqual(['t', 'm', '?']);
	});
});

describe('hotkey collisions', () => {
	it('section + utility hotkeys are all unique', () => {
		const all = [...sections.map((s) => s.hotkey), ...utilities.map((u) => u.hotkey)];
		expect(new Set(all).size).toBe(all.length);
	});
});
