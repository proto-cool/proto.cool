import { describe, it, expect } from 'vitest';
import { relativeTime } from './relative-time';

const NOW = Date.parse('2026-04-29T18:00:00Z');

describe('relativeTime', () => {
	it('shows "just now" for <60s', () => {
		expect(relativeTime('2026-04-29T17:59:30Z', NOW)).toBe('just now');
	});
	it('shows minutes', () => {
		expect(relativeTime('2026-04-29T17:55:00Z', NOW)).toBe('5m');
	});
	it('shows hours', () => {
		expect(relativeTime('2026-04-29T15:00:00Z', NOW)).toBe('3h');
	});
	it('shows days under a week', () => {
		expect(relativeTime('2026-04-26T18:00:00Z', NOW)).toBe('3d');
	});
	it('shows weeks under a month', () => {
		expect(relativeTime('2026-04-15T18:00:00Z', NOW)).toBe('2w');
	});
	it('shows month-day for >30d in same year', () => {
		expect(relativeTime('2026-02-12T18:00:00Z', NOW)).toBe('Feb 12');
	});
	it('shows month-day-year for >365d', () => {
		expect(relativeTime('2024-12-01T18:00:00Z', NOW)).toBe('Dec 1 2024');
	});
});
