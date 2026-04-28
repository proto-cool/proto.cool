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
