import { describe, it, expect } from 'vitest';
import { tierForAge, isDueForRefresh, type Tier } from './tiers';

const NOW = new Date('2026-04-29T12:00:00Z').toISOString();

describe('tierForAge', () => {
	it.each<[string, Tier]>([
		[new Date('2026-04-29T11:00:00Z').toISOString(), 'recent'],   // 1h ago
		[new Date('2026-04-28T13:00:00Z').toISOString(), 'recent'],   // 23h ago
	])('%s → %s (boundary table)', (createdAt, expected) => {
		expect(tierForAge(createdAt, NOW)).toBe(expected);
	});

	it('classifies < 24h as recent', () => {
		expect(tierForAge(new Date('2026-04-28T13:00:00Z').toISOString(), NOW)).toBe('recent');
	});
	it('classifies 24h–7d as week', () => {
		expect(tierForAge(new Date('2026-04-25T12:00:00Z').toISOString(), NOW)).toBe('week');
	});
	it('classifies 7d–30d as month', () => {
		expect(tierForAge(new Date('2026-04-15T12:00:00Z').toISOString(), NOW)).toBe('month');
	});
	it('classifies > 30d as archive', () => {
		expect(tierForAge(new Date('2026-01-01T12:00:00Z').toISOString(), NOW)).toBe('archive');
	});

	it('treats exact 24h boundary as week (>=)', () => {
		expect(tierForAge(new Date('2026-04-28T12:00:00Z').toISOString(), NOW)).toBe('week');
	});
	it('treats exact 7d boundary as month (>=)', () => {
		expect(tierForAge(new Date('2026-04-22T12:00:00Z').toISOString(), NOW)).toBe('month');
	});
	it('treats exact 30d boundary as archive (>=)', () => {
		expect(tierForAge(new Date('2026-03-30T12:00:00Z').toISOString(), NOW)).toBe('archive');
	});
});

describe('isDueForRefresh', () => {
	it('returns true when lastRefreshedAt is null', () => {
		expect(isDueForRefresh('recent', null, NOW)).toBe(true);
	});
	it('recent tier: due after 1h', () => {
		const oneHourAgo = new Date('2026-04-29T11:00:00Z').toISOString();
		const fiftyNineMinAgo = new Date('2026-04-29T11:01:00Z').toISOString();
		expect(isDueForRefresh('recent', oneHourAgo, NOW)).toBe(true);
		expect(isDueForRefresh('recent', fiftyNineMinAgo, NOW)).toBe(false);
	});
	it('week tier: due after 6h', () => {
		const sixHoursAgo = new Date('2026-04-29T06:00:00Z').toISOString();
		const fiveHoursAgo = new Date('2026-04-29T07:00:00Z').toISOString();
		expect(isDueForRefresh('week', sixHoursAgo, NOW)).toBe(true);
		expect(isDueForRefresh('week', fiveHoursAgo, NOW)).toBe(false);
	});
	it('month tier: due after 24h', () => {
		const twentyFourHoursAgo = new Date('2026-04-28T12:00:00Z').toISOString();
		const oneHourAgo = new Date('2026-04-29T11:00:00Z').toISOString();
		expect(isDueForRefresh('month', twentyFourHoursAgo, NOW)).toBe(true);
		expect(isDueForRefresh('month', oneHourAgo, NOW)).toBe(false);
	});
	it('archive tier: due after 7d', () => {
		const sevenDaysAgo = new Date('2026-04-22T12:00:00Z').toISOString();
		const sixDaysAgo = new Date('2026-04-23T12:00:00Z').toISOString();
		expect(isDueForRefresh('archive', sevenDaysAgo, NOW)).toBe(true);
		expect(isDueForRefresh('archive', sixDaysAgo, NOW)).toBe(false);
	});
});
