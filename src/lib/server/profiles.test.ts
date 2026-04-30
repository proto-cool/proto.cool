import { describe, it, expect, beforeEach } from 'vitest';
import { openDatabase, runMigrations, type DB } from './db';
import {
	getCachedProfile,
	upsertProfile,
	resolveProfile,
	isStale,
	PROFILE_TTL_MS,
	PROFILE_TOMBSTONE_TTL_MS,
	type Profile
} from './profiles';
import type { AtpClient } from './atp-client';

function makeDb(): DB {
	const db = openDatabase(':memory:');
	runMigrations(db);
	return db;
}

function fakeAtp(overrides: Partial<AtpClient>): AtpClient {
	return {
		async listRecords() { throw new Error('not used'); },
		async getRecord() { throw new Error('not used'); },
		async resolveHandle() { throw new Error('not used'); },
		async getPosts() { throw new Error('not used'); },
		async getProfile() { throw new Error('not used'); },
		...overrides
	};
}

describe('profiles', () => {
	let db: DB;
	beforeEach(() => { db = makeDb(); });

	it('getCachedProfile returns null when miss', () => {
		expect(getCachedProfile(db, 'did:plc:nope')).toBeNull();
	});

	it('upsert + getCachedProfile round-trips', () => {
		upsertProfile(db, {
			did: 'did:plc:x',
			handle: 'a.bsky.social',
			displayName: 'A',
			fetchedAt: '2026-01-01T00:00:00Z'
		});
		expect(getCachedProfile(db, 'did:plc:x')).toEqual({
			did: 'did:plc:x',
			handle: 'a.bsky.social',
			displayName: 'A',
			fetchedAt: '2026-01-01T00:00:00Z'
		});
	});

	it('isStale uses TTL for live entries', () => {
		const now = Date.parse('2026-01-08T00:00:01Z');
		const ok: Profile = { did: 'd', handle: 'x', displayName: null, fetchedAt: '2026-01-02T00:00:00Z' };
		const stale: Profile = { did: 'd', handle: 'x', displayName: null, fetchedAt: '2025-12-25T00:00:00Z' };
		expect(isStale(ok, now)).toBe(false);
		expect(isStale(stale, now)).toBe(true);
	});

	it('isStale uses tombstone TTL when handle is null', () => {
		const now = Date.parse('2026-01-01T01:00:01Z');
		const fresh: Profile = { did: 'd', handle: null, displayName: null, fetchedAt: '2026-01-01T00:30:00Z' };
		const expired: Profile = { did: 'd', handle: null, displayName: null, fetchedAt: '2026-01-01T00:00:00Z' };
		expect(isStale(fresh, now)).toBe(false);
		expect(isStale(expired, now)).toBe(true);
	});

	it('TTL constants match spec', () => {
		expect(PROFILE_TTL_MS).toBe(7 * 24 * 60 * 60 * 1000);
		expect(PROFILE_TOMBSTONE_TTL_MS).toBe(60 * 60 * 1000);
	});

	it('resolveProfile returns cached on hit', async () => {
		upsertProfile(db, {
			did: 'did:plc:x',
			handle: 'a.bsky.social',
			displayName: null,
			fetchedAt: new Date().toISOString()
		});
		let calls = 0;
		const client = fakeAtp({
			async getProfile() {
				calls++;
				return { did: 'did:plc:x', handle: 'a.bsky.social' };
			}
		});
		const r = await resolveProfile(db, client, 'did:plc:x');
		expect(r?.handle).toBe('a.bsky.social');
		expect(calls).toBe(0);
	});

	it('resolveProfile fetches + caches on miss', async () => {
		const client = fakeAtp({
			async getProfile(did) {
				return { did, handle: 'fetched.bsky.social', displayName: 'F' };
			}
		});
		const r = await resolveProfile(db, client, 'did:plc:y');
		expect(r?.handle).toBe('fetched.bsky.social');
		const cached = getCachedProfile(db, 'did:plc:y');
		expect(cached?.handle).toBe('fetched.bsky.social');
	});

	it('resolveProfile tombstones on fetch failure', async () => {
		const client = fakeAtp({
			async getProfile() { throw new Error('404'); }
		});
		const r = await resolveProfile(db, client, 'did:plc:dead');
		expect(r).toBeNull();
		const cached = getCachedProfile(db, 'did:plc:dead');
		expect(cached?.handle).toBeNull();
	});
});
