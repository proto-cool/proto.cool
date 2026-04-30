// src/lib/server/tiers.ts

export type Tier = 'recent' | 'week' | 'month' | 'archive';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const TIER_BOUNDARIES: Array<{ tier: Tier; maxAgeMs: number }> = [
	{ tier: 'recent', maxAgeMs: 1 * DAY_MS },
	{ tier: 'week', maxAgeMs: 7 * DAY_MS },
	{ tier: 'month', maxAgeMs: 30 * DAY_MS }
];

const REFRESH_INTERVAL_MS: Record<Tier, number> = {
	recent: 1 * HOUR_MS,
	week: 6 * HOUR_MS,
	month: 24 * HOUR_MS,
	archive: 7 * DAY_MS
};

export function tierForAge(createdAt: string, nowIso: string): Tier {
	const ageMs = new Date(nowIso).getTime() - new Date(createdAt).getTime();
	for (const { tier, maxAgeMs } of TIER_BOUNDARIES) {
		if (ageMs < maxAgeMs) return tier;
	}
	return 'archive';
}

export function isDueForRefresh(
	tier: Tier,
	lastRefreshedAt: string | null,
	nowIso: string
): boolean {
	if (lastRefreshedAt === null) return true;
	const sinceMs = new Date(nowIso).getTime() - new Date(lastRefreshedAt).getTime();
	return sinceMs >= REFRESH_INTERVAL_MS[tier];
}

export const TIERS: readonly Tier[] = ['recent', 'week', 'month', 'archive'];
