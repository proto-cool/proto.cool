import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { get } from 'svelte/store';

describe('instrument-data', () => {
	it('exposes a static linkInfo with rxTx and conn', async () => {
		const { linkInfo } = await import('./instrument-data');
		expect(linkInfo.rxTx).toMatch(/^\d+ \/ \d+$/);
		expect(typeof linkInfo.conn).toBe('number');
		expect(linkInfo.conn).toBeGreaterThan(0);
	});

	it('signalSparkline starts on the first frame', async () => {
		const { signalSparkline } = await import('./instrument-data');
		const value = get(signalSparkline);
		expect(typeof value).toBe('string');
		expect(value.length).toBeGreaterThan(0);
	});

	describe('signalSparkline ticks (browser only)', () => {
		const originalWindow = globalThis.window;

		beforeEach(() => {
			vi.useFakeTimers();
			(globalThis as { window: object }).window = {} as object;
		});

		afterEach(() => {
			vi.useRealTimers();
			if (originalWindow === undefined) {
				delete (globalThis as { window?: object }).window;
			} else {
				(globalThis as { window: object }).window = originalWindow;
			}
		});

		it('advances frames every 600ms when subscribed', async () => {
			vi.resetModules();
			const { signalSparkline } = await import('./instrument-data');
			const seen: string[] = [];
			const unsub = signalSparkline.subscribe((v) => seen.push(v));
			vi.advanceTimersByTime(1800);
			unsub();
			expect(seen.length).toBeGreaterThan(1);
		});
	});
});
