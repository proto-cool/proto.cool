// DID → handle/displayName cache. Avatars intentionally excluded; resolveProfile
// reads through to the AppView on miss/stale, tombstones (NULL handle, 1h TTL)
// after a fetch failure to avoid hammering bad DIDs.

import type { DB } from './db';
import type { AtpClient } from './atp-client';

export type Profile = {
	did: string;
	handle: string | null;
	displayName: string | null;
	fetchedAt: string;
};

export const PROFILE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const PROFILE_TOMBSTONE_TTL_MS = 60 * 60 * 1000;

export function getCachedProfile(db: DB, did: string): Profile | null {
	const row = db
		.prepare(
			`SELECT did, handle, display_name AS displayName, fetched_at AS fetchedAt
			 FROM profiles WHERE did = ?`
		)
		.get(did) as Profile | undefined;
	return row ?? null;
}

export function upsertProfile(db: DB, p: Profile): void {
	db.prepare(
		`INSERT INTO profiles (did, handle, display_name, fetched_at)
		 VALUES (?, ?, ?, ?)
		 ON CONFLICT(did) DO UPDATE SET
		   handle = excluded.handle,
		   display_name = excluded.display_name,
		   fetched_at = excluded.fetched_at`
	).run(p.did, p.handle, p.displayName, p.fetchedAt);
}

export function isStale(p: Profile, nowMs: number): boolean {
	const ageMs = nowMs - Date.parse(p.fetchedAt);
	const ttl = p.handle === null ? PROFILE_TOMBSTONE_TTL_MS : PROFILE_TTL_MS;
	return ageMs > ttl;
}

export async function resolveProfile(
	db: DB,
	client: AtpClient,
	did: string,
	nowMs: number = Date.now()
): Promise<Profile | null> {
	const cached = getCachedProfile(db, did);
	if (cached && !isStale(cached, nowMs)) {
		return cached.handle ? cached : null;
	}
	try {
		const fetched = await client.getProfile(did);
		const profile: Profile = {
			did: fetched.did,
			handle: fetched.handle,
			displayName: fetched.displayName ?? null,
			fetchedAt: new Date(nowMs).toISOString()
		};
		upsertProfile(db, profile);
		return profile;
	} catch {
		const tombstone: Profile = {
			did,
			handle: null,
			displayName: null,
			fetchedAt: new Date(nowMs).toISOString()
		};
		upsertProfile(db, tombstone);
		return null;
	}
}
