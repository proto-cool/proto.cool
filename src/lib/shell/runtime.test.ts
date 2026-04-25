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
		vi.setSystemTime(new Date('2026-04-25T15:30:45Z'));
	});
	afterEach(() => vi.useRealTimers());

	it('clock formats date and time correctly at request time', async () => {
		vi.resetModules();
		const { clock } = await import('./runtime');
		expect(get(clock).date).toBe('2026-04-25');
		expect(get(clock).time.length).toBe(8); // HH:MM:SS
	});

	it('uptime computes days/hours/minutes from SITE_ORIGIN forward', async () => {
		vi.resetModules();
		const { uptime } = await import('./runtime');
		const value = get(uptime);
		expect(value).toMatch(/^\d+d \d{2}h \d{2}m$/);
	});
});
