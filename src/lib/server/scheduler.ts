// src/lib/server/scheduler.ts
//
// Pure tick + setInterval wrapper. The tick takes adapters and a breaker as
// dependencies so tests can drive it deterministically without network or
// timers. The wrapper (`startScheduler`) is added at the bottom of the file.

import type { DB } from './db';
import type { AdapterRegistry } from './adapters/types';
import type { Breaker } from './breaker';
import { TIERS, tierForAge, isDueForRefresh, type Tier } from './tiers';

type EngagementSource = 'bsky' | 'grain';
const ENGAGEMENT_SOURCES: readonly EngagementSource[] = ['bsky', 'grain'];

const PHASE_A_BATCH = 25;       // bsky.fetchRecords batch
const PHASE_B_BATCH = 25;       // engagement batch per source-tier

export type TickResult = {
	enrichedCount: number;
	enrichedDeleted: number;
	refreshed: Array<{ tier: Tier; source: EngagementSource; count: number }>;
	errors: Array<{ phase: 'enrichment' | 'refresh'; source: EngagementSource; message: string }>;
};

export async function tick(
	db: DB,
	adapters: AdapterRegistry,
	breaker: Breaker,
	nowIso: string
): Promise<TickResult> {
	const result: TickResult = {
		enrichedCount: 0,
		enrichedDeleted: 0,
		refreshed: [],
		errors: []
	};

	// PHASE A: external enrichment (bsky-only — both reposts and quote embeds
	// reference app.bsky.feed.post URIs).
	if (!breaker.isOpen('bsky', nowIso)) {
		const pending = db
			.prepare(
				`SELECT uri FROM records WHERE kind = 'external' AND status = 'pending' LIMIT ?`
			)
			.all(PHASE_A_BATCH) as Array<{ uri: string }>;

		if (pending.length > 0) {
			try {
				const { found, notFound } = await adapters.bsky.fetchRecords(
					pending.map((r) => r.uri)
				);
				const update = db.prepare(
					`UPDATE records SET
					   value = ?, created_at = ?, cid = ?, status = 'ok', indexed_at = ?
					 WHERE uri = ?`
				);
				const del = db.prepare(`DELETE FROM records WHERE uri = ?`);
				const tx = db.transaction(() => {
					for (const r of found) {
						update.run(JSON.stringify(r.value), r.createdAt, r.cid, nowIso, r.uri);
					}
					for (const uri of notFound) {
						del.run(uri); // hard-delete; engagement cascades
					}
				});
				tx();
				result.enrichedCount = found.length;
				result.enrichedDeleted = notFound.length;
				breaker.recordSuccess('bsky');
			} catch (err) {
				breaker.recordFailure('bsky', nowIso);
				result.errors.push({
					phase: 'enrichment',
					source: 'bsky',
					message: err instanceof Error ? err.message : String(err)
				});
			}
		}
	}

	// PHASE B: engagement refresh by tier × source.
	for (const tier of TIERS) {
		for (const source of ENGAGEMENT_SOURCES) {
			if (breaker.isOpen(source, nowIso)) continue;

			const due = selectDueUris(db, tier, source, nowIso, PHASE_B_BATCH);
			if (due.length === 0) continue;

			try {
				const { found, notFound } = await adapters[source].fetchEngagement(due);
				const upsert = db.prepare(
					`INSERT INTO engagement
					   (uri, like_count, repost_count, reply_count, reactor_sample, source, last_refreshed_at)
					 VALUES (?, ?, ?, ?, ?, ?, ?)
					 ON CONFLICT (uri) DO UPDATE SET
					   like_count = excluded.like_count,
					   repost_count = excluded.repost_count,
					   reply_count = excluded.reply_count,
					   reactor_sample = excluded.reactor_sample,
					   source = excluded.source,
					   last_refreshed_at = excluded.last_refreshed_at`
				);
				const del = db.prepare(`DELETE FROM records WHERE uri = ? AND kind = 'external'`);
				const tx = db.transaction(() => {
					for (const r of found) {
						upsert.run(
							r.uri,
							r.likeCount,
							r.repostCount,
							r.replyCount,
							JSON.stringify(r.reactorSample),
							source,
							nowIso
						);
					}
					// 404 on owned URI = anomaly, log only (don't delete; firehose owns owned rows).
					// 404 on external URI = hard-delete.
					for (const uri of notFound) {
						del.run(uri);
					}
				});
				tx();

				writeStateKv(db, `cron.${tier}.${source}.last_run`, nowIso);
				breaker.recordSuccess(source);
				result.refreshed.push({ tier, source, count: found.length });
			} catch (err) {
				breaker.recordFailure(source, nowIso);
				result.errors.push({
					phase: 'refresh',
					source,
					message: err instanceof Error ? err.message : String(err)
				});
			}
		}
	}

	return result;
}

function selectDueUris(
	db: DB,
	tier: Tier,
	source: EngagementSource,
	nowIso: string,
	limit: number
): string[] {
	// Tier filtering is done in JS rather than SQL: SQLite's date math on ISO
	// strings would work but the boundary table lives in tiers.ts and we don't
	// want it duplicated. The candidate pool is bounded — we pull a wider
	// candidate slice and filter by tier + due-ness in process. For v1 cache
	// sizes (<10k owned rows) this is fine; revisit if it ever isn't.
	const collections = collectionsForEngagementSource(source);
	if (collections.length === 0) return [];
	const placeholders = collections.map(() => '?').join(',');
	const rows = db
		.prepare(
			`SELECT r.uri, r.created_at, e.last_refreshed_at
			 FROM records r
			 LEFT JOIN engagement e ON e.uri = r.uri
			 WHERE r.status = 'ok' AND r.collection IN (${placeholders})
			 ORDER BY COALESCE(e.last_refreshed_at, '') ASC, r.created_at DESC
			 LIMIT ?`
		)
		.all(...collections, limit * 4) as Array<{
		uri: string;
		created_at: string;
		last_refreshed_at: string | null;
	}>;
	const due: string[] = [];
	for (const row of rows) {
		if (tierForAge(row.created_at, nowIso) !== tier) continue;
		if (!isDueForRefresh(tier, row.last_refreshed_at, nowIso)) continue;
		due.push(row.uri);
		if (due.length >= limit) break;
	}
	return due;
}

function collectionsForEngagementSource(source: EngagementSource): string[] {
	// Engagement is rolled up against the *post* URI, not the repost URI — so
	// we only refresh app.bsky.feed.post (and grain's image record once wired).
	// Reposts inherit their displayed engagement via the subject join in
	// feed.ts, no separate refresh needed.
	if (source === 'bsky') return ['app.bsky.feed.post'];
	if (source === 'grain') return []; // updated when grain NSIDs land
	return [];
}

function writeStateKv(db: DB, k: string, v: string) {
	db.prepare(
		`INSERT INTO state (key, value, updated_at) VALUES (?, ?, ?)
		 ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
	).run(k, v, new Date().toISOString());
}

const TICK_INTERVAL_MS = 60_000;

export type SchedulerHandle = {
	stop: () => void;
};

export function startScheduler(
	db: DB,
	adapters: AdapterRegistry,
	breaker: Breaker
): SchedulerHandle {
	let isRunning = false;
	let stopped = false;

	const runOnce = async () => {
		if (isRunning || stopped) return;
		isRunning = true;
		try {
			const result = await tick(db, adapters, breaker, new Date().toISOString());
			if (result.errors.length > 0) {
				for (const e of result.errors) {
					console.warn(`[scheduler] ${e.phase}/${e.source}: ${e.message}`);
				}
			}
		} catch (err) {
			console.error('[scheduler] tick threw — investigate', err);
		} finally {
			isRunning = false;
		}
	};

	// Fire one immediately on boot so the system snapshot reflects activity
	// without waiting a full minute, then settle into the cadence.
	void runOnce();
	const handle = setInterval(runOnce, TICK_INTERVAL_MS);

	return {
		stop() {
			stopped = true;
			clearInterval(handle);
		}
	};
}
