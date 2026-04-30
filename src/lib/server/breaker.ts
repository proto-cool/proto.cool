// src/lib/server/breaker.ts
//
// Per-source circuit breaker. Persisted in the `state` table so worker
// restarts don't reset accumulated failure context. The cool-down ladder is
// 1m → 5m → 15m → 60m, capped at 60m, indexed by the number of times this
// source has tripped (not raw failure count).

import type { DB } from './db';

type Source = 'bsky' | 'grain';

const FAILURE_THRESHOLD = 5;
const COOLDOWN_LADDER_MS = [60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000];

type BreakerState = {
	consecutiveFailures: number;
	tripCount: number;
	openUntilIso: string | null;
};

function key(source: Source, suffix: string) {
	return `breaker.${source}.${suffix}`;
}

function readState(db: DB, source: Source): BreakerState {
	const rows = db
		.prepare(`SELECT key, value FROM state WHERE key LIKE ?`)
		.all(`breaker.${source}.%`) as Array<{ key: string; value: string }>;
	const map = new Map(rows.map((r) => [r.key, r.value]));
	return {
		consecutiveFailures: Number(map.get(key(source, 'failures')) ?? 0),
		tripCount: Number(map.get(key(source, 'trip_count')) ?? 0),
		openUntilIso: map.get(key(source, 'open_until')) ?? null
	};
}

function writeKv(db: DB, k: string, v: string) {
	db.prepare(
		`INSERT INTO state (key, value, updated_at) VALUES (?, ?, ?)
		 ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
	).run(k, v, new Date().toISOString());
}

function deleteKv(db: DB, k: string) {
	db.prepare(`DELETE FROM state WHERE key = ?`).run(k);
}

export interface Breaker {
	isOpen(source: Source, nowIso: string): boolean;
	recordFailure(source: Source, nowIso: string): void;
	recordSuccess(source: Source): void;
}

export function createBreaker(db: DB): Breaker {
	return {
		isOpen(source, nowIso) {
			const s = readState(db, source);
			if (!s.openUntilIso) return false;
			return new Date(nowIso).getTime() < new Date(s.openUntilIso).getTime();
		},

		recordFailure(source, nowIso) {
			const s = readState(db, source);
			const consecutive = s.consecutiveFailures + 1;
			writeKv(db, key(source, 'failures'), String(consecutive));

			if (consecutive >= FAILURE_THRESHOLD) {
				const tripCount = s.tripCount + 1;
				const cooldownIdx = Math.min(tripCount - 1, COOLDOWN_LADDER_MS.length - 1);
				const cooldownMs = COOLDOWN_LADDER_MS[cooldownIdx];
				const openUntil = new Date(new Date(nowIso).getTime() + cooldownMs).toISOString();
				writeKv(db, key(source, 'trip_count'), String(tripCount));
				writeKv(db, key(source, 'open_until'), openUntil);
				writeKv(db, key(source, 'failures'), '0'); // reset counter; tripCount tracks history
			}
		},

		recordSuccess(source) {
			deleteKv(db, key(source, 'failures'));
			// Successful call → also clear any open_until so a stale window doesn't
			// keep the breaker open past evidence of recovery. Trip count persists
			// (the next trip uses the longer cool-down).
			deleteKv(db, key(source, 'open_until'));
		}
	};
}
