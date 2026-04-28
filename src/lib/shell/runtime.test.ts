import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { get } from 'svelte/store';

describe('pwdForPath', () => {
	it('maps known section paths to their pwd', async () => {
		const { pwdForPath } = await import('./runtime');
		expect(pwdForPath('/')).toBe('~/content');
		expect(pwdForPath('/projects')).toBe('~/projects');
		expect(pwdForPath('/projects/some-thing')).toBe('~/projects');
		expect(pwdForPath('/about')).toBe('~/about');
	});

	it('falls back to "~" + pathname for unknown routes', async () => {
		const { pwdForPath } = await import('./runtime');
		expect(pwdForPath('/foo')).toBe('~/foo');
		expect(pwdForPath('/foo/bar')).toBe('~/foo/bar');
	});
});

describe('clock + uptime', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		// Local-time constructor — keeps the assertion tz-stable across CI machines.
		vi.setSystemTime(new Date(2026, 3, 25, 15, 30, 45));
	});
	afterEach(() => vi.useRealTimers());

	it('clock formats date and time in local time', async () => {
		vi.resetModules();
		const { clock } = await import('./runtime');
		expect(get(clock).date).toBe('2026-04-25');
		expect(get(clock).time).toBe('15:30:45');
	});

	it('uptime computes days/hours/minutes from SITE_ORIGIN forward', async () => {
		vi.resetModules();
		const { uptime } = await import('./runtime');
		const value = get(uptime);
		expect(value).toMatch(/^\d+d \d{2}h \d{2}m$/);
	});
});

describe('dayOfYear', () => {
	it('returns 1 for January 1', async () => {
		const { dayOfYear } = await import('./runtime');
		expect(dayOfYear(new Date(2026, 0, 1))).toBe(1);
	});

	it('returns 118 for April 28 in a non-leap year (2026)', async () => {
		const { dayOfYear } = await import('./runtime');
		expect(dayOfYear(new Date(2026, 3, 28))).toBe(118);
	});

	it('returns 366 for December 31 in a leap year (2024)', async () => {
		const { dayOfYear } = await import('./runtime');
		expect(dayOfYear(new Date(2024, 11, 31))).toBe(366);
	});

	it('returns 60 for March 1 in a leap year (2024)', async () => {
		const { dayOfYear } = await import('./runtime');
		expect(dayOfYear(new Date(2024, 2, 1))).toBe(61);
	});
});
