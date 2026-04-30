import { describe, it, expect, beforeEach } from 'vitest';
import { openDatabase, runMigrations, type DB } from './db';
import { createBreaker } from './breaker';

const NOW = (s: string) => new Date(s).toISOString();

let db: DB;
beforeEach(() => {
	db = openDatabase(':memory:');
	runMigrations(db);
});

describe('breaker', () => {
	it('is closed by default', () => {
		const b = createBreaker(db);
		expect(b.isOpen('bsky', NOW('2026-04-29T12:00:00Z'))).toBe(false);
	});

	it('opens after 5 consecutive failures', () => {
		const b = createBreaker(db);
		const t = NOW('2026-04-29T12:00:00Z');
		for (let i = 0; i < 4; i++) b.recordFailure('bsky', t);
		expect(b.isOpen('bsky', t)).toBe(false);
		b.recordFailure('bsky', t);
		expect(b.isOpen('bsky', t)).toBe(true);
	});

	it('cool-down starts at 1m on first trip', () => {
		const b = createBreaker(db);
		const t0 = NOW('2026-04-29T12:00:00Z');
		for (let i = 0; i < 5; i++) b.recordFailure('bsky', t0);
		expect(b.isOpen('bsky', NOW('2026-04-29T12:00:30Z'))).toBe(true);   // 30s in
		expect(b.isOpen('bsky', NOW('2026-04-29T12:01:00Z'))).toBe(false);  // 60s elapsed
	});

	it('escalates cool-down on repeat trips: 1m → 5m → 15m → 60m → 60m', () => {
		const b = createBreaker(db);
		// First trip
		for (let i = 0; i < 5; i++) b.recordFailure('bsky', NOW('2026-04-29T12:00:00Z'));
		// Half-open after 1m
		expect(b.isOpen('bsky', NOW('2026-04-29T12:01:01Z'))).toBe(false);
		// Second trip (5 more failures)
		for (let i = 0; i < 5; i++) b.recordFailure('bsky', NOW('2026-04-29T12:01:01Z'));
		expect(b.isOpen('bsky', NOW('2026-04-29T12:05:00Z'))).toBe(true);   // 4m into 5m
		expect(b.isOpen('bsky', NOW('2026-04-29T12:06:01Z'))).toBe(false);  // 5m elapsed
	});

	it('recordSuccess resets the failure counter', () => {
		const b = createBreaker(db);
		const t = NOW('2026-04-29T12:00:00Z');
		for (let i = 0; i < 3; i++) b.recordFailure('bsky', t);
		b.recordSuccess('bsky');
		for (let i = 0; i < 4; i++) b.recordFailure('bsky', t);
		expect(b.isOpen('bsky', t)).toBe(false); // 4 failures, not 5
	});

	it('breaker state is per-source', () => {
		const b = createBreaker(db);
		const t = NOW('2026-04-29T12:00:00Z');
		for (let i = 0; i < 5; i++) b.recordFailure('bsky', t);
		expect(b.isOpen('bsky', t)).toBe(true);
		expect(b.isOpen('grain', t)).toBe(false);
	});

	it('persists across instances (state in DB)', () => {
		const t = NOW('2026-04-29T12:00:00Z');
		const b1 = createBreaker(db);
		for (let i = 0; i < 5; i++) b1.recordFailure('bsky', t);
		const b2 = createBreaker(db);
		expect(b2.isOpen('bsky', NOW('2026-04-29T12:00:30Z'))).toBe(true);
	});
});
