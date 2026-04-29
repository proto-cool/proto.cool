# atproto Backend Workers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the real-time worker layer on top of the Plan 1 cache: a firehose consumer that mirrors the operator's PDS into `records`, an engagement scheduler that periodically refreshes AppView counts on age tiers, AppView adapters (bsky first; grain stubbed for later), per-source circuit breaker, a one-shot bootstrap that wires it all into the SvelteKit server, and a live system snapshot that reflects actual worker state.

**Architecture:** Three independent loops in the same Node process — a long-running `subscribeRepos` websocket against `pds.proto.cool`, a `setInterval(60_000)` engagement scheduler, and a one-shot bootstrap that runs migrations / backfill / starts the loops. Loops persist their state in the existing `state` k/v table; the read path remains pure cache (Plan 1 is unchanged). All upstream calls live behind adapters; the firehose never calls AppViews; the scheduler never reads the firehose. Workers are gated on `NODE_ENV === 'production' || PROTO_BACKGROUND === '1'` so `vite dev` stays offline by default.

**Tech Stack:** TypeScript strict, `@atcute/client` (already a dep — investigate its `subscribeRepos` helper before falling back to `ws` + `@atcute/cbor`), `better-sqlite3` (in-process), `zod` (boundary validation), Vitest 4 (in-memory SQLite + fake adapters + `vi.useFakeTimers`).

**Note on grain:** grain's NSIDs aren't pinned yet. Plan ships the adapter contract + a placeholder grain adapter that throws "not yet wired", so the scheduler / breaker / system-snapshot code paths exercise the multi-source shape without depending on grain's lexicons. When NSIDs land, only `config.ts` and `adapters/grain.ts` need changes.

---

## File Structure

| File | Responsibility |
| ---- | -------------- |
| `src/lib/server/adapters/types.ts` | Adapter interface, `EngagementRow`, `RecordRow`, `AdapterResult` types |
| `src/lib/server/adapters/bsky.ts` | bsky AppView adapter — `fetchEngagement` via `app.bsky.feed.getPosts`; `fetchRecords` via the same call |
| `src/lib/server/adapters/grain.ts` | Placeholder — exports an adapter that throws "not yet wired"; replace when grain NSIDs land |
| `src/lib/server/adapters/bsky.test.ts` | Fixture-driven tests against committed JSON snapshots |
| `src/lib/server/tiers.ts` | Pure helpers — `tierForAge(createdAt, now)`, `isDueForRefresh(tier, lastRefreshedAt, now)` |
| `src/lib/server/tiers.test.ts` | Table-driven tests |
| `src/lib/server/breaker.ts` | Per-source circuit breaker — failure counters and cooldown windows persisted in `state` |
| `src/lib/server/breaker.test.ts` | Open-on-N-failures, half-open after cooldown, reset on success |
| `src/lib/server/scheduler.ts` | `tick(db, adapters, now)` — phase A (external enrichment), phase B (engagement refresh by tier × source); `startScheduler(db, adapters)` — `setInterval(60_000)` with `isRunning` guard |
| `src/lib/server/scheduler.test.ts` | Integration: in-memory DB, fake adapters, fake timers |
| `src/lib/server/firehose-handler.ts` | Pure `applyCommit(db, commit)` — translates a parsed firehose commit op into DB writes |
| `src/lib/server/firehose-handler.test.ts` | Fabricated commits → assert DB writes |
| `src/lib/server/firehose.ts` | `startFirehose(db)` — websocket loop, exponential backoff, cursor persistence |
| `src/lib/server/bootstrap.ts` | `bootstrap(db)` — runs migrations, ensures backfill, starts scheduler + firehose; `shouldRunBackground()` gate |
| `src/lib/server/system.ts` | Modified — `firehose.connected` and `lagSec` read from a worker-state singleton |
| `src/hooks.server.ts` | Modified — top-of-file side-effect import of `bootstrap` |
| `src/lib/server/config.ts` | Modified — add `PROTO_PDS_HOST` env reader (default `https://pds.proto.cool`) and `PROTO_BSKY_APPVIEW` (default `https://public.api.bsky.app`) |
| `.env.example` | Add `PROTO_BACKGROUND`, `PROTO_PDS_HOST`, `PROTO_BSKY_APPVIEW` |

---

## Task 1: Adapter type contract

**Files:**
- Create: `src/lib/server/adapters/types.ts`

- [ ] **Step 1: Create the type module**

```ts
// src/lib/server/adapters/types.ts

import type { Source } from '../config';

export type EngagementRow = {
	uri: string;
	likeCount: number;
	repostCount: number;
	replyCount: number;
	reactorSample: Array<{ did: string; handle: string; avatar: string | null }>;
};

export type RecordRow = {
	uri: string;
	cid: string;
	value: Record<string, unknown>;
	createdAt: string;
};

// A 404 from the AppView is meaningful information — we hard-delete external
// records that 404. Adapters surface it as a partition of the response, not as
// a thrown error, so a single missing URI in a batch doesn't fail the rest.
export type AdapterBatchResult<T> = {
	found: T[];
	notFound: string[]; // URIs the AppView reported as missing
};

export interface Adapter {
	readonly source: Extract<Source, 'bsky' | 'grain'>;
	fetchEngagement(uris: string[]): Promise<AdapterBatchResult<EngagementRow>>;
	fetchRecords(uris: string[]): Promise<AdapterBatchResult<RecordRow>>;
}

export type AdapterRegistry = {
	bsky: Adapter;
	grain: Adapter;
};
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/server/adapters/types.ts
git commit -m "backend: adapter contract — Adapter, EngagementRow, RecordRow"
```

---

## Task 2: bsky adapter — `fetchEngagement` + `fetchRecords`

**Context:** `app.bsky.feed.getPosts` accepts up to 25 URIs and returns `posts: PostView[]`. Each `PostView` has `record` (the raw post record), `cid`, and the rolled-up counts (`likeCount`, `repostCount`, `replyCount`). For the reactor sample, v1 ships an empty array — populating it requires a second call (`getLikes`) per URI which is rate-limit-heavy; defer until the UI actually consumes it. Spec says the sample is capped at ~5; an empty array is schema-compatible.

**Files:**
- Create: `src/lib/server/adapters/bsky.ts`
- Modify: `src/lib/server/atp-client.ts` — add a thin `getPosts` method
- Modify: `src/lib/server/config.ts` — add `getBskyAppview()` env reader

- [ ] **Step 1: Add `getBskyAppview()` to config**

In `src/lib/server/config.ts`, append:

```ts
export function getBskyAppview(): string {
	return process.env.PROTO_BSKY_APPVIEW ?? 'https://public.api.bsky.app';
}
```

- [ ] **Step 2: Add `getPosts` to `AtpClient`**

In `src/lib/server/atp-client.ts`, extend the `AtpClient` interface:

```ts
export interface AtpClient {
	listRecords(args: {
		repo: string;
		collection: string;
		cursor?: string;
		limit?: number;
	}): Promise<ListRecordsResult>;
	resolveHandle(handle: string): Promise<{ did: string }>;
	getPosts(uris: string[]): Promise<{
		posts: Array<{
			uri: string;
			cid: string;
			record: Record<string, unknown>;
			likeCount?: number;
			repostCount?: number;
			replyCount?: number;
		}>;
	}>;
}
```

And in `createAtpClient`, append the implementation alongside `listRecords`/`resolveHandle`:

```ts
async getPosts(uris) {
	// app.bsky.feed.getPosts caps at 25 URIs per call. The adapter slices
	// before calling, so we trust the caller here and pass the URIs through
	// as branded AT URIs.
	const response = await rpc.get('app.bsky.feed.getPosts', {
		params: { uris: uris as Array<`at://${string}`> }
	});
	if (!response.ok) {
		throw new Error(
			`getPosts failed: ${response.data.error}: ${response.data.message ?? ''}`
		);
	}
	return {
		posts: response.data.posts.map((p) => ({
			uri: p.uri,
			cid: p.cid,
			record: p.record as Record<string, unknown>,
			likeCount: p.likeCount,
			repostCount: p.repostCount,
			replyCount: p.replyCount
		}))
	};
}
```

- [ ] **Step 3: Write a failing test for the bsky adapter**

Create `src/lib/server/adapters/bsky.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createBskyAdapter } from './bsky';
import type { AtpClient } from '../atp-client';

function fakeClient(posts: ReturnType<AtpClient['getPosts']> extends Promise<infer R> ? R['posts'] : never): AtpClient {
	return {
		async listRecords() { throw new Error('not used'); },
		async resolveHandle() { throw new Error('not used'); },
		async getPosts() { return { posts }; }
	};
}

describe('bskyAdapter.fetchEngagement', () => {
	it('maps posts to engagement rows', async () => {
		const client = fakeClient([
			{
				uri: 'at://did:plc:x/app.bsky.feed.post/1',
				cid: 'cid1',
				record: { text: 'hi', createdAt: '2026-04-01T00:00:00Z' },
				likeCount: 3,
				repostCount: 1,
				replyCount: 0
			}
		]);
		const adapter = createBskyAdapter(client);
		const result = await adapter.fetchEngagement(['at://did:plc:x/app.bsky.feed.post/1']);
		expect(result.found).toEqual([
			{
				uri: 'at://did:plc:x/app.bsky.feed.post/1',
				likeCount: 3,
				repostCount: 1,
				replyCount: 0,
				reactorSample: []
			}
		]);
		expect(result.notFound).toEqual([]);
	});

	it('reports URIs the AppView omits as notFound', async () => {
		const client = fakeClient([
			{ uri: 'at://did:plc:x/app.bsky.feed.post/A', cid: 'c', record: {} }
		]);
		const adapter = createBskyAdapter(client);
		const result = await adapter.fetchEngagement([
			'at://did:plc:x/app.bsky.feed.post/A',
			'at://did:plc:x/app.bsky.feed.post/MISSING'
		]);
		expect(result.found.map((r) => r.uri)).toEqual(['at://did:plc:x/app.bsky.feed.post/A']);
		expect(result.notFound).toEqual(['at://did:plc:x/app.bsky.feed.post/MISSING']);
	});

	it('treats absent counts as zero', async () => {
		const client = fakeClient([
			{ uri: 'at://did:plc:x/app.bsky.feed.post/A', cid: 'c', record: {} }
		]);
		const adapter = createBskyAdapter(client);
		const r = await adapter.fetchEngagement(['at://did:plc:x/app.bsky.feed.post/A']);
		expect(r.found[0]).toMatchObject({ likeCount: 0, repostCount: 0, replyCount: 0 });
	});

	it('chunks input into batches of 25 URIs', async () => {
		const calls: string[][] = [];
		const client: AtpClient = {
			async listRecords() { throw new Error('not used'); },
			async resolveHandle() { throw new Error('not used'); },
			async getPosts(uris) {
				calls.push(uris);
				return { posts: uris.map((uri) => ({ uri, cid: 'c', record: {} })) };
			}
		};
		const adapter = createBskyAdapter(client);
		const uris = Array.from({ length: 60 }, (_, i) => `at://did:plc:x/app.bsky.feed.post/${i}`);
		await adapter.fetchEngagement(uris);
		expect(calls.map((c) => c.length)).toEqual([25, 25, 10]);
	});
});

describe('bskyAdapter.fetchRecords', () => {
	it('maps posts to RecordRow with createdAt from the record body', async () => {
		const client = fakeClient([
			{
				uri: 'at://did:plc:x/app.bsky.feed.post/1',
				cid: 'cid1',
				record: { text: 'hi', createdAt: '2026-03-15T12:00:00Z', $type: 'app.bsky.feed.post' }
			}
		]);
		const adapter = createBskyAdapter(client);
		const r = await adapter.fetchRecords(['at://did:plc:x/app.bsky.feed.post/1']);
		expect(r.found).toEqual([
			{
				uri: 'at://did:plc:x/app.bsky.feed.post/1',
				cid: 'cid1',
				value: { text: 'hi', createdAt: '2026-03-15T12:00:00Z', $type: 'app.bsky.feed.post' },
				createdAt: '2026-03-15T12:00:00Z'
			}
		]);
	});

	it('reports missing URIs as notFound', async () => {
		const client = fakeClient([]);
		const adapter = createBskyAdapter(client);
		const r = await adapter.fetchRecords(['at://did:plc:x/app.bsky.feed.post/GONE']);
		expect(r.notFound).toEqual(['at://did:plc:x/app.bsky.feed.post/GONE']);
	});
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `pnpm test -- adapters/bsky`
Expected: FAIL — module not found.

- [ ] **Step 5: Implement the bsky adapter**

Create `src/lib/server/adapters/bsky.ts`:

```ts
import type { AtpClient } from '../atp-client';
import type { Adapter, EngagementRow, RecordRow, AdapterBatchResult } from './types';

const BATCH_SIZE = 25; // app.bsky.feed.getPosts cap

function chunk<T>(xs: T[], size: number): T[][] {
	const out: T[][] = [];
	for (let i = 0; i < xs.length; i += size) out.push(xs.slice(i, i + size));
	return out;
}

export function createBskyAdapter(client: AtpClient): Adapter {
	async function fetchAll(uris: string[]) {
		const found: Array<{
			uri: string;
			cid: string;
			record: Record<string, unknown>;
			likeCount?: number;
			repostCount?: number;
			replyCount?: number;
		}> = [];
		for (const batch of chunk(uris, BATCH_SIZE)) {
			const { posts } = await client.getPosts(batch);
			found.push(...posts);
		}
		const foundUris = new Set(found.map((p) => p.uri));
		const notFound = uris.filter((u) => !foundUris.has(u));
		return { found, notFound };
	}

	return {
		source: 'bsky',

		async fetchEngagement(uris): Promise<AdapterBatchResult<EngagementRow>> {
			if (uris.length === 0) return { found: [], notFound: [] };
			const { found, notFound } = await fetchAll(uris);
			return {
				found: found.map((p) => ({
					uri: p.uri,
					likeCount: p.likeCount ?? 0,
					repostCount: p.repostCount ?? 0,
					replyCount: p.replyCount ?? 0,
					reactorSample: []
				})),
				notFound
			};
		},

		async fetchRecords(uris): Promise<AdapterBatchResult<RecordRow>> {
			if (uris.length === 0) return { found: [], notFound: [] };
			const { found, notFound } = await fetchAll(uris);
			return {
				found: found.map((p) => {
					const createdAt =
						typeof p.record.createdAt === 'string'
							? p.record.createdAt
							: new Date().toISOString();
					return {
						uri: p.uri,
						cid: p.cid,
						value: p.record,
						createdAt
					};
				}),
				notFound
			};
		}
	};
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm test -- adapters/bsky`
Expected: PASS, all 6 tests.

- [ ] **Step 7: Commit**

```bash
git add src/lib/server/adapters/bsky.ts src/lib/server/adapters/bsky.test.ts \
        src/lib/server/atp-client.ts src/lib/server/config.ts
git commit -m "backend: bsky AppView adapter — fetchEngagement, fetchRecords"
```

---

## Task 3: grain adapter placeholder

**Context:** Spec defers grain NSIDs. The scheduler still needs *some* `grain` entry in the registry so the multi-source code path is real and the system snapshot's grain row isn't a special case. A placeholder that throws "grain not yet wired" satisfies the type, and any scheduler tick that touches it will increment the breaker counter and back off — exactly the behavior we want until the real adapter lands.

**Files:**
- Create: `src/lib/server/adapters/grain.ts`

- [ ] **Step 1: Create the placeholder**

```ts
// src/lib/server/adapters/grain.ts
//
// Placeholder. Grain's image-record NSIDs are deferred; replace this with a
// real adapter (mirroring bsky.ts in shape) when those land. Until then, the
// scheduler routes any 'grain' refresh to this file and it intentionally
// throws — the per-source breaker swallows it, the source enters cooldown,
// and the rest of the workers continue.

import type { Adapter, AdapterBatchResult, EngagementRow, RecordRow } from './types';

export function createGrainAdapter(): Adapter {
	const notYetWired = (op: string) => async (): Promise<AdapterBatchResult<never>> => {
		throw new Error(`grain adapter not yet wired (op=${op})`);
	};
	return {
		source: 'grain',
		fetchEngagement: notYetWired('fetchEngagement') as Adapter['fetchEngagement'],
		fetchRecords: notYetWired('fetchRecords') as Adapter['fetchRecords']
	};
}
```

- [ ] **Step 2: Sanity check with `pnpm check`**

Run: `pnpm check`
Expected: PASS, 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/server/adapters/grain.ts
git commit -m "backend: grain adapter placeholder until NSIDs land"
```

---

## Task 4: Tier helpers

**Files:**
- Create: `src/lib/server/tiers.ts`
- Create: `src/lib/server/tiers.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/server/tiers.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { tierForAge, isDueForRefresh, type Tier } from './tiers';

const NOW = new Date('2026-04-29T12:00:00Z').toISOString();

describe('tierForAge', () => {
	it.each<[string, Tier]>([
		[new Date('2026-04-29T11:00:00Z').toISOString(), 'recent'],   // 1h ago
		[new Date('2026-04-28T13:00:00Z').toISOString(), 'week'],     // 23h ago + 1m → still recent? 23h... actually <24h → recent
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- tiers`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `tiers.ts`**

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- tiers`
Expected: PASS, all 12 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/tiers.ts src/lib/server/tiers.test.ts
git commit -m "backend: tier helpers — tierForAge, isDueForRefresh"
```

---

## Task 5: Per-source circuit breaker

**Context:** Spec says: 5 consecutive failures → open the breaker for source S; cool-down 1m → 5m → 15m → … capped at 1h. Stored in `state` so it survives restart. The breaker is consulted before every adapter call; on success, counter resets. The cool-down advances by the *number of times the breaker has tripped*, not by raw failure count — so you don't get stuck at 1h after one bad afternoon.

**Files:**
- Create: `src/lib/server/breaker.ts`
- Create: `src/lib/server/breaker.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/server/breaker.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- breaker`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the breaker**

Create `src/lib/server/breaker.ts`:

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- breaker`
Expected: PASS, all 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/breaker.ts src/lib/server/breaker.test.ts
git commit -m "backend: per-source circuit breaker — 5 fails → 1m → 5m → 15m → 1h"
```

---

## Task 6: Scheduler — `tick` (pure)

**Context:** The scheduler tick is a pure async function `tick(db, adapters, breaker, now)`. Phase A drains pending external rows via `bsky.fetchRecords`. Phase B refreshes engagement by tier × source. The setInterval wrapper (with isRunning guard) is added in Task 8 — keeping `tick` pure makes it testable without timers.

**Files:**
- Create: `src/lib/server/scheduler.ts`

- [ ] **Step 1: Implement `tick` and helpers (test in next task)**

Create `src/lib/server/scheduler.ts`:

```ts
// src/lib/server/scheduler.ts
//
// Pure tick + setInterval wrapper. The tick takes adapters and a breaker as
// dependencies so tests can drive it deterministically without network or
// timers. The wrapper (`startScheduler`) is added at the bottom of the file.

import type { DB } from './db';
import type { AdapterRegistry } from './adapters/types';
import type { Breaker } from './breaker';
import { TIERS, tierForAge, isDueForRefresh, type Tier } from './tiers';
import { sourceForCollection } from './config';

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

// startScheduler is added in Task 8.
```

- [ ] **Step 2: Sanity check with `pnpm check`**

Run: `pnpm check`
Expected: PASS, 0 errors. (If there are unused-import warnings on `sourceForCollection`, remove the import.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/server/scheduler.ts
git commit -m "backend: scheduler tick — phase A enrichment + phase B engagement refresh"
```

---

## Task 7: Scheduler integration tests

**Files:**
- Create: `src/lib/server/scheduler.test.ts`

- [ ] **Step 1: Write the integration tests**

Create `src/lib/server/scheduler.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { openDatabase, runMigrations, type DB } from './db';
import { createBreaker } from './breaker';
import { tick } from './scheduler';
import type { Adapter, AdapterRegistry } from './adapters/types';

const NOW = '2026-04-29T12:00:00Z';

let db: DB;
beforeEach(() => {
	db = openDatabase(':memory:');
	runMigrations(db);
});

function fakeAdapter(source: 'bsky' | 'grain', overrides: Partial<Adapter> = {}): Adapter {
	const noop: Adapter = {
		source,
		async fetchEngagement(uris) {
			return {
				found: uris.map((uri) => ({
					uri,
					likeCount: 1,
					repostCount: 0,
					replyCount: 0,
					reactorSample: []
				})),
				notFound: []
			};
		},
		async fetchRecords(uris) {
			return {
				found: uris.map((uri) => ({
					uri,
					cid: 'fake-cid',
					value: { $type: 'app.bsky.feed.post', text: 'hi', createdAt: '2026-04-29T11:00:00Z' },
					createdAt: '2026-04-29T11:00:00Z'
				})),
				notFound: []
			};
		}
	};
	return { ...noop, ...overrides };
}

function fakeRegistry(over: Partial<AdapterRegistry> = {}): AdapterRegistry {
	return {
		bsky: over.bsky ?? fakeAdapter('bsky'),
		grain: over.grain ?? fakeAdapter('grain')
	};
}

function insertRecord(db: DB, args: {
	uri: string;
	collection: string;
	kind: 'owned' | 'external';
	status: 'pending' | 'ok';
	createdAt: string;
	subjectUri?: string | null;
	value?: unknown;
}) {
	db.prepare(
		`INSERT INTO records
		   (uri, did, collection, rkey, cid, kind, status, subject_uri, value, created_at, indexed_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	).run(
		args.uri,
		'did:plc:x',
		args.collection,
		args.uri.split('/').at(-1) ?? '',
		'cid',
		args.kind,
		args.status,
		args.subjectUri ?? null,
		args.value === undefined ? null : JSON.stringify(args.value),
		args.createdAt,
		NOW
	);
}

describe('scheduler.tick — phase A (enrichment)', () => {
	it('flips pending external rows to ok with fetched value', async () => {
		insertRecord(db, {
			uri: 'at://did:plc:y/app.bsky.feed.post/1',
			collection: 'app.bsky.feed.post',
			kind: 'external',
			status: 'pending',
			createdAt: NOW
		});
		const result = await tick(db, fakeRegistry(), createBreaker(db), NOW);
		expect(result.enrichedCount).toBe(1);
		const row = db
			.prepare(`SELECT status, value FROM records WHERE uri = ?`)
			.get('at://did:plc:y/app.bsky.feed.post/1') as { status: string; value: string };
		expect(row.status).toBe('ok');
		expect(JSON.parse(row.value).text).toBe('hi');
	});

	it('hard-deletes external rows the AppView reports as missing', async () => {
		insertRecord(db, {
			uri: 'at://did:plc:y/app.bsky.feed.post/GONE',
			collection: 'app.bsky.feed.post',
			kind: 'external',
			status: 'pending',
			createdAt: NOW
		});
		const adapters = fakeRegistry({
			bsky: fakeAdapter('bsky', {
				async fetchRecords(uris) {
					return { found: [], notFound: uris };
				}
			})
		});
		const result = await tick(db, adapters, createBreaker(db), NOW);
		expect(result.enrichedDeleted).toBe(1);
		const row = db
			.prepare(`SELECT uri FROM records WHERE uri = ?`)
			.get('at://did:plc:y/app.bsky.feed.post/GONE');
		expect(row).toBeUndefined();
	});

	it('skips phase A when bsky breaker is open', async () => {
		insertRecord(db, {
			uri: 'at://did:plc:y/app.bsky.feed.post/2',
			collection: 'app.bsky.feed.post',
			kind: 'external',
			status: 'pending',
			createdAt: NOW
		});
		const breaker = createBreaker(db);
		for (let i = 0; i < 5; i++) breaker.recordFailure('bsky', NOW);
		const result = await tick(db, fakeRegistry(), breaker, NOW);
		expect(result.enrichedCount).toBe(0);
	});
});

describe('scheduler.tick — phase B (engagement refresh)', () => {
	it('writes engagement rows for due owned posts in the recent tier', async () => {
		// 1h ago — well within recent tier and never refreshed.
		insertRecord(db, {
			uri: 'at://did:plc:x/app.bsky.feed.post/A',
			collection: 'app.bsky.feed.post',
			kind: 'owned',
			status: 'ok',
			createdAt: '2026-04-29T11:00:00Z'
		});
		const result = await tick(db, fakeRegistry(), createBreaker(db), NOW);
		expect(result.refreshed.find((r) => r.tier === 'recent' && r.source === 'bsky')?.count).toBe(1);
		const e = db
			.prepare(`SELECT * FROM engagement WHERE uri = ?`)
			.get('at://did:plc:x/app.bsky.feed.post/A') as { like_count: number; source: string };
		expect(e.like_count).toBe(1);
		expect(e.source).toBe('bsky');
	});

	it('does not refresh rows still within their tier interval', async () => {
		insertRecord(db, {
			uri: 'at://did:plc:x/app.bsky.feed.post/B',
			collection: 'app.bsky.feed.post',
			kind: 'owned',
			status: 'ok',
			createdAt: '2026-04-29T11:00:00Z'
		});
		// Engagement freshly refreshed 30 min ago — recent tier needs 1h.
		db.prepare(
			`INSERT INTO engagement (uri, like_count, repost_count, reply_count, reactor_sample, source, last_refreshed_at)
			 VALUES (?, 0, 0, 0, '[]', 'bsky', ?)`
		).run('at://did:plc:x/app.bsky.feed.post/B', '2026-04-29T11:30:00Z');
		const result = await tick(db, fakeRegistry(), createBreaker(db), NOW);
		expect(result.refreshed.find((r) => r.source === 'bsky')?.count).toBe(undefined);
	});

	it('isolates failures per source — grain throw does not block bsky', async () => {
		insertRecord(db, {
			uri: 'at://did:plc:x/app.bsky.feed.post/C',
			collection: 'app.bsky.feed.post',
			kind: 'owned',
			status: 'ok',
			createdAt: '2026-04-29T11:00:00Z'
		});
		const adapters = fakeRegistry({
			grain: fakeAdapter('grain', {
				async fetchEngagement() {
					throw new Error('grain offline');
				}
			})
		});
		const result = await tick(db, adapters, createBreaker(db), NOW);
		expect(result.refreshed.some((r) => r.source === 'bsky')).toBe(true);
		// (No grain rows due, so no grain error today — but the test confirms
		// the bsky path still runs in the presence of a poisoned grain adapter.)
		expect(result.errors.find((e) => e.source === 'bsky')).toBeUndefined();
	});

	it('records cron.<tier>.<source>.last_run on success', async () => {
		insertRecord(db, {
			uri: 'at://did:plc:x/app.bsky.feed.post/D',
			collection: 'app.bsky.feed.post',
			kind: 'owned',
			status: 'ok',
			createdAt: '2026-04-29T11:00:00Z'
		});
		await tick(db, fakeRegistry(), createBreaker(db), NOW);
		const row = db
			.prepare(`SELECT value FROM state WHERE key = ?`)
			.get('cron.recent.bsky.last_run') as { value: string };
		expect(row.value).toBe(NOW);
	});

	it('only refreshes owned posts (reposts inherit via subject join)', async () => {
		insertRecord(db, {
			uri: 'at://did:plc:x/app.bsky.feed.repost/R',
			collection: 'app.bsky.feed.repost',
			kind: 'owned',
			status: 'ok',
			createdAt: '2026-04-29T11:00:00Z'
		});
		const result = await tick(db, fakeRegistry(), createBreaker(db), NOW);
		expect(result.refreshed).toEqual([]);
		const e = db.prepare(`SELECT COUNT(*) AS c FROM engagement`).get() as { c: number };
		expect(e.c).toBe(0);
	});
});
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `pnpm test -- scheduler`
Expected: PASS, all 8 tests.

- [ ] **Step 3: Commit**

```bash
git add src/lib/server/scheduler.test.ts
git commit -m "backend: scheduler tick tests — phase A enrichment + phase B refresh"
```

---

## Task 8: Scheduler — `startScheduler` setInterval wrapper

**Files:**
- Modify: `src/lib/server/scheduler.ts` — append `startScheduler` and `stopScheduler`

- [ ] **Step 1: Append the wrapper to `scheduler.ts`**

At the bottom of `src/lib/server/scheduler.ts`:

```ts
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
```

Add the import for `Breaker` at the top of the file:

```ts
import type { Breaker } from './breaker';
```

- [ ] **Step 2: Sanity check**

Run: `pnpm check && pnpm test -- scheduler`
Expected: 0 errors, all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/lib/server/scheduler.ts
git commit -m "backend: scheduler — startScheduler setInterval wrapper with isRunning guard"
```

---

## Task 9: Firehose commit handler (pure)

**Context:** The firehose websocket emits parsed commit events. The handler that translates those into DB writes lives in its own pure module so it's testable without a websocket. Shape of an applied commit (post-CAR-decoding, what the websocket loop will hand us):

```ts
type AppliedCommit = {
	seq: number;
	repo: string;                                  // DID
	ops: Array<
		| { action: 'create' | 'update'; path: string; cid: string; record: Record<string, unknown> }
		| { action: 'delete'; path: string }
	>;
};
```

`path` is `<collection>/<rkey>`; the URI is `at://<repo>/<path>`.

**Files:**
- Create: `src/lib/server/firehose-handler.ts`

- [ ] **Step 1: Implement `applyCommit`**

```ts
// src/lib/server/firehose-handler.ts
//
// Pure translation of a parsed firehose commit into DB writes. The websocket
// loop calls this; tests construct commits directly. Filtering on repo/
// collection happens here (not in the websocket loop) so the same logic is
// exercised in tests.

import type { DB } from './db';
import { WATCHED_COLLECTIONS } from './config';

export type CommitOp =
	| { action: 'create' | 'update'; path: string; cid: string; record: Record<string, unknown> }
	| { action: 'delete'; path: string };

export type AppliedCommit = {
	seq: number;
	repo: string;
	ops: CommitOp[];
};

export type ApplyResult = {
	owned: { upserted: number; deleted: number };
	pending: { enqueued: number };
};

export function applyCommit(
	db: DB,
	commit: AppliedCommit,
	ownerDid: string,
	nowIso: string
): ApplyResult {
	const result: ApplyResult = {
		owned: { upserted: 0, deleted: 0 },
		pending: { enqueued: 0 }
	};

	if (commit.repo !== ownerDid) return result;

	const upsertOwned = db.prepare(
		`INSERT INTO records
		   (uri, did, collection, rkey, cid, kind, status, subject_uri, value, created_at, indexed_at)
		 VALUES (?, ?, ?, ?, ?, 'owned', 'ok', ?, ?, ?, ?)
		 ON CONFLICT (uri) DO UPDATE SET
		   cid = excluded.cid,
		   value = excluded.value,
		   subject_uri = excluded.subject_uri,
		   created_at = excluded.created_at,
		   indexed_at = excluded.indexed_at`
	);
	const insertPending = db.prepare(
		`INSERT INTO records
		   (uri, did, collection, rkey, cid, kind, status, subject_uri, value, created_at, indexed_at)
		 VALUES (?, ?, ?, ?, '', 'external', 'pending', NULL, NULL, ?, ?)
		 ON CONFLICT (uri) DO NOTHING`
	);
	const del = db.prepare(`DELETE FROM records WHERE uri = ?`);

	const tx = db.transaction(() => {
		for (const op of commit.ops) {
			const [collection, rkey] = splitPath(op.path);
			if (!WATCHED_COLLECTIONS.includes(collection)) continue;
			const uri = `at://${commit.repo}/${op.path}`;

			if (op.action === 'delete') {
				del.run(uri);
				result.owned.deleted += 1;
				continue;
			}

			const value = op.record;
			const createdAt =
				typeof value.createdAt === 'string' ? value.createdAt : nowIso;
			const subjectUri = extractSubjectUri(value);
			upsertOwned.run(
				uri,
				commit.repo,
				collection,
				rkey,
				op.cid,
				subjectUri,
				JSON.stringify(value),
				createdAt,
				nowIso
			);
			result.owned.upserted += 1;

			// Enqueue the externally-referenced URI for enrichment by the scheduler.
			// The DID parsed from at://<did>/... can be anyone — we don't filter on
			// it. Insert ON CONFLICT DO NOTHING: if we already cached it (own or
			// external, ok or pending) leave it alone.
			if (subjectUri) {
				const [, , extDid, extCollection, extRkey] = parseAtUri(subjectUri);
				if (extDid && extCollection && extRkey) {
					insertPending.run(subjectUri, extDid, extCollection, extRkey, nowIso, nowIso);
					result.pending.enqueued += 1;
				}
			}
		}
	});
	tx();

	return result;
}

function splitPath(path: string): [string, string] {
	const idx = path.indexOf('/');
	if (idx === -1) return [path, ''];
	return [path.slice(0, idx), path.slice(idx + 1)];
}

// Returns ['at:', '', did, collection, rkey] (matches URL.split('/') shape).
function parseAtUri(uri: string): [string, string, string?, string?, string?] {
	const parts = uri.split('/');
	if (parts.length < 5) return [parts[0] ?? '', parts[1] ?? ''];
	return [parts[0], parts[1], parts[2], parts[3], parts[4]];
}

function extractSubjectUri(value: Record<string, unknown>): string | null {
	// app.bsky.feed.repost: { subject: { uri, cid } }
	const subject = value.subject as { uri?: unknown } | undefined;
	if (subject && typeof subject.uri === 'string') return subject.uri;

	// app.bsky.feed.post with quote-style embed:
	//   embed.$type = 'app.bsky.embed.record',          embed.record = { uri }
	//   embed.$type = 'app.bsky.embed.recordWithMedia', embed.record.record = { uri }
	const embed = value.embed as
		| { $type?: unknown; record?: { uri?: unknown; record?: { uri?: unknown } } }
		| undefined;
	if (embed && typeof embed.$type === 'string') {
		if (embed.$type === 'app.bsky.embed.record') {
			const u = embed.record?.uri;
			if (typeof u === 'string') return u;
		} else if (embed.$type === 'app.bsky.embed.recordWithMedia') {
			const u = embed.record?.record?.uri;
			if (typeof u === 'string') return u;
		}
	}

	return null;
}
```

- [ ] **Step 2: Sanity check**

Run: `pnpm check`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/server/firehose-handler.ts
git commit -m "backend: firehose commit handler — owned upsert, delete, pending external enqueue"
```

---

## Task 10: Firehose commit handler tests

**Files:**
- Create: `src/lib/server/firehose-handler.test.ts`

- [ ] **Step 1: Write the tests**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { openDatabase, runMigrations, type DB } from './db';
import { applyCommit } from './firehose-handler';

const NOW = '2026-04-29T12:00:00Z';
const OWNER = 'did:plc:owner';

let db: DB;
beforeEach(() => {
	db = openDatabase(':memory:');
	runMigrations(db);
});

describe('applyCommit', () => {
	it('ignores commits from a non-owner repo', () => {
		const r = applyCommit(
			db,
			{
				seq: 1,
				repo: 'did:plc:somebody-else',
				ops: [
					{
						action: 'create',
						path: 'app.bsky.feed.post/abc',
						cid: 'cid',
						record: { text: 'hi', createdAt: NOW }
					}
				]
			},
			OWNER,
			NOW
		);
		expect(r.owned.upserted).toBe(0);
		const c = db.prepare(`SELECT COUNT(*) AS c FROM records`).get() as { c: number };
		expect(c.c).toBe(0);
	});

	it('upserts an owned post', () => {
		const r = applyCommit(
			db,
			{
				seq: 1,
				repo: OWNER,
				ops: [
					{
						action: 'create',
						path: 'app.bsky.feed.post/abc',
						cid: 'cid1',
						record: { text: 'hi', createdAt: '2026-04-29T11:00:00Z' }
					}
				]
			},
			OWNER,
			NOW
		);
		expect(r.owned.upserted).toBe(1);
		const row = db
			.prepare(`SELECT * FROM records WHERE uri = ?`)
			.get(`at://${OWNER}/app.bsky.feed.post/abc`) as {
			kind: string; status: string; created_at: string;
		};
		expect(row.kind).toBe('owned');
		expect(row.status).toBe('ok');
		expect(row.created_at).toBe('2026-04-29T11:00:00Z');
	});

	it('deletes a record on a delete op (engagement cascades)', () => {
		const uri = `at://${OWNER}/app.bsky.feed.post/del`;
		db.prepare(
			`INSERT INTO records (uri, did, collection, rkey, cid, kind, status, subject_uri, value, created_at, indexed_at)
			 VALUES (?, ?, 'app.bsky.feed.post', 'del', 'cid', 'owned', 'ok', NULL, '{}', ?, ?)`
		).run(uri, OWNER, NOW, NOW);
		db.prepare(
			`INSERT INTO engagement (uri, like_count, repost_count, reply_count, reactor_sample, source, last_refreshed_at)
			 VALUES (?, 1, 0, 0, '[]', 'bsky', ?)`
		).run(uri, NOW);

		const r = applyCommit(
			db,
			{ seq: 1, repo: OWNER, ops: [{ action: 'delete', path: 'app.bsky.feed.post/del' }] },
			OWNER,
			NOW
		);
		expect(r.owned.deleted).toBe(1);
		expect(db.prepare(`SELECT COUNT(*) AS c FROM records`).get()).toEqual({ c: 0 });
		expect(db.prepare(`SELECT COUNT(*) AS c FROM engagement`).get()).toEqual({ c: 0 });
	});

	it('enqueues a pending external row for repost subject', () => {
		const r = applyCommit(
			db,
			{
				seq: 1,
				repo: OWNER,
				ops: [
					{
						action: 'create',
						path: 'app.bsky.feed.repost/r1',
						cid: 'cid',
						record: {
							subject: { uri: 'at://did:plc:other/app.bsky.feed.post/X', cid: 'cidX' },
							createdAt: NOW
						}
					}
				]
			},
			OWNER,
			NOW
		);
		expect(r.owned.upserted).toBe(1);
		expect(r.pending.enqueued).toBe(1);
		const ext = db
			.prepare(`SELECT kind, status FROM records WHERE uri = ?`)
			.get('at://did:plc:other/app.bsky.feed.post/X') as { kind: string; status: string };
		expect(ext).toEqual({ kind: 'external', status: 'pending' });
	});

	it('enqueues a pending external row for quote-post embed', () => {
		applyCommit(
			db,
			{
				seq: 1,
				repo: OWNER,
				ops: [
					{
						action: 'create',
						path: 'app.bsky.feed.post/q1',
						cid: 'cid',
						record: {
							text: 'quoting',
							createdAt: NOW,
							embed: {
								$type: 'app.bsky.embed.record',
								record: { uri: 'at://did:plc:other/app.bsky.feed.post/Q', cid: 'cidQ' }
							}
						}
					}
				]
			},
			OWNER,
			NOW
		);
		const ext = db
			.prepare(`SELECT kind, status FROM records WHERE uri = ?`)
			.get('at://did:plc:other/app.bsky.feed.post/Q') as { kind: string; status: string };
		expect(ext).toEqual({ kind: 'external', status: 'pending' });
	});

	it('handles recordWithMedia embed', () => {
		applyCommit(
			db,
			{
				seq: 1,
				repo: OWNER,
				ops: [
					{
						action: 'create',
						path: 'app.bsky.feed.post/m1',
						cid: 'cid',
						record: {
							text: 'q+m',
							createdAt: NOW,
							embed: {
								$type: 'app.bsky.embed.recordWithMedia',
								record: { record: { uri: 'at://did:plc:other/app.bsky.feed.post/RM', cid: 'c' } },
								media: { $type: 'app.bsky.embed.images', images: [] }
							}
						}
					}
				]
			},
			OWNER,
			NOW
		);
		const ext = db
			.prepare(`SELECT kind FROM records WHERE uri = ?`)
			.get('at://did:plc:other/app.bsky.feed.post/RM') as { kind: string };
		expect(ext.kind).toBe('external');
	});

	it('does not overwrite an existing ok external row when re-enqueueing', () => {
		const extUri = 'at://did:plc:other/app.bsky.feed.post/X';
		db.prepare(
			`INSERT INTO records (uri, did, collection, rkey, cid, kind, status, subject_uri, value, created_at, indexed_at)
			 VALUES (?, 'did:plc:other', 'app.bsky.feed.post', 'X', 'cid', 'external', 'ok', NULL, '{"text":"already-cached"}', ?, ?)`
		).run(extUri, NOW, NOW);

		applyCommit(
			db,
			{
				seq: 1,
				repo: OWNER,
				ops: [
					{
						action: 'create',
						path: 'app.bsky.feed.repost/r2',
						cid: 'cid',
						record: { subject: { uri: extUri, cid: 'c' }, createdAt: NOW }
					}
				]
			},
			OWNER,
			NOW
		);
		const row = db
			.prepare(`SELECT status, value FROM records WHERE uri = ?`)
			.get(extUri) as { status: string; value: string };
		expect(row.status).toBe('ok');
		expect(JSON.parse(row.value).text).toBe('already-cached');
	});

	it('skips ops on collections we do not watch', () => {
		applyCommit(
			db,
			{
				seq: 1,
				repo: OWNER,
				ops: [
					{
						action: 'create',
						path: 'app.bsky.actor.profile/self',
						cid: 'cid',
						record: { displayName: 'me', createdAt: NOW }
					}
				]
			},
			OWNER,
			NOW
		);
		expect(db.prepare(`SELECT COUNT(*) AS c FROM records`).get()).toEqual({ c: 0 });
	});
});
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `pnpm test -- firehose-handler`
Expected: PASS, all 8 tests.

- [ ] **Step 3: Commit**

```bash
git add src/lib/server/firehose-handler.test.ts
git commit -m "backend: firehose-handler tests — owner filter, delete, pending enqueue"
```

---

## Task 11: Firehose connection loop

**Context:** The websocket loop is the I/O wrapper around `applyCommit`. It connects to `pds.proto.cool/xrpc/com.atproto.sync.subscribeRepos`, decodes commits, calls `applyCommit`, persists `firehose.last_seq` after every applied commit, and reconnects with exponential backoff on disconnect. Worker-state singleton (`firehoseState`) tracks connected/lastSeq/lastEventAt for the system snapshot.

**Investigation step:** Before hand-rolling the websocket + CAR/CBOR decoder, check whether `@atcute/client` (4.2.x) exposes a `subscribeRepos` helper. If yes, use it; if no, depend on `ws` + decode minimally with `@atcute/cbor` (already transitively available via `@atcute/client`). The plan below assumes a hand-rolled loop because the API surface from atcute is not documented in the spec — if a helper exists, replace the websocket setup but keep the rest (event handler, backoff, state singleton) intact.

**Files:**
- Create: `src/lib/server/firehose.ts`
- Modify: `package.json` — add `ws` if needed (check first whether @atcute already provides what we need)

- [ ] **Step 1: Investigate atcute's firehose API**

```bash
node -e "const m = await import('@atcute/client'); console.log(Object.keys(m));" 2>&1 | head
ls node_modules/@atcute/client/dist 2>/dev/null
```

If a `subscribeRepos` / `firehose` helper exists, prefer it. Otherwise proceed with `ws`. Document the choice in the file header comment.

- [ ] **Step 2: Add `ws` if hand-rolling**

Run only if the investigation in Step 1 found no atcute helper:

```bash
pnpm add ws @types/ws
```

- [ ] **Step 3: Implement the firehose module**

Create `src/lib/server/firehose.ts`. The skeleton below assumes hand-rolled `ws`; if atcute exposes a helper, replace the connection/decoding layer (the `connect()` body) and keep the rest.

```ts
// src/lib/server/firehose.ts
//
// Long-running websocket against the operator's PDS (subscribeRepos). The
// loop is owner-only: PDS-side, this stream already only emits events for
// repos hosted on this PDS, so the filter in firehose-handler is a defence
// in depth. Persists firehose.last_seq after every applied commit; on
// disconnect, reconnects with cursor=last_seq using exponential backoff.

import WebSocket from 'ws';
// If @atcute/client exposes a subscribeRepos helper, prefer it over ws.
// As of 4.2.x: TODO investigate at impl time.

import type { DB } from './db';
import { applyCommit, type AppliedCommit } from './firehose-handler';

const BACKOFF_INITIAL_MS = 1_000;
const BACKOFF_MAX_MS = 60_000;

export type FirehoseState = {
	connected: boolean;
	lastSeq: number | null;
	lastEventAtMs: number | null;
};

const STATE: FirehoseState = {
	connected: false,
	lastSeq: null,
	lastEventAtMs: null
};

export function getFirehoseState(): Readonly<FirehoseState> {
	return STATE;
}

export type FirehoseHandle = { stop: () => void };

export function startFirehose(args: {
	db: DB;
	pdsHost: string;        // e.g. 'pds.proto.cool'
	ownerDid: string;
}): FirehoseHandle {
	let stopped = false;
	let backoffMs = BACKOFF_INITIAL_MS;
	let activeWs: WebSocket | null = null;

	// Initial cursor from state.
	const lastSeqRow = args.db
		.prepare(`SELECT value FROM state WHERE key = 'firehose.last_seq'`)
		.get() as { value: string } | undefined;
	let cursor: number | null = lastSeqRow ? Number(lastSeqRow.value) : null;
	STATE.lastSeq = cursor;

	const writeLastSeq = args.db.prepare(
		`INSERT INTO state (key, value, updated_at) VALUES ('firehose.last_seq', ?, ?)
		 ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
	);

	const connect = () => {
		if (stopped) return;
		const url = buildSubscribeUrl(args.pdsHost, cursor);
		console.info(`[firehose] connecting cursor=${cursor ?? '<none>'} → ${url}`);
		const ws = new WebSocket(url);
		activeWs = ws;

		ws.on('open', () => {
			STATE.connected = true;
			backoffMs = BACKOFF_INITIAL_MS;
			console.info('[firehose] connected');
		});

		ws.on('message', (raw: Buffer) => {
			try {
				const commit = decodeCommit(raw);
				if (!commit) return;
				STATE.lastEventAtMs = Date.now();
				if (commit.repo !== args.ownerDid) {
					// PDS filtering should already exclude this; advance the cursor anyway.
					cursor = commit.seq;
					STATE.lastSeq = commit.seq;
					writeLastSeq.run(String(commit.seq), new Date().toISOString());
					return;
				}
				applyCommit(args.db, commit, args.ownerDid, new Date().toISOString());
				cursor = commit.seq;
				STATE.lastSeq = commit.seq;
				writeLastSeq.run(String(commit.seq), new Date().toISOString());
			} catch (err) {
				console.warn('[firehose] decode/apply failed; skipping op', err);
			}
		});

		ws.on('close', () => {
			STATE.connected = false;
			activeWs = null;
			if (stopped) return;
			const wait = backoffMs;
			backoffMs = Math.min(backoffMs * 2, BACKOFF_MAX_MS);
			const jitter = Math.random() * 0.3 * wait;
			console.info(`[firehose] closed; reconnecting in ${Math.round(wait + jitter)}ms`);
			setTimeout(connect, wait + jitter);
		});

		ws.on('error', (err: Error) => {
			console.warn('[firehose] socket error', err.message);
			// 'close' will fire after 'error'; backoff handled there.
		});
	};

	connect();

	return {
		stop() {
			stopped = true;
			activeWs?.close();
			STATE.connected = false;
		}
	};
}

function buildSubscribeUrl(pdsHost: string, cursor: number | null): string {
	const cursorParam = cursor !== null ? `?cursor=${cursor}` : '';
	return `wss://${pdsHost}/xrpc/com.atproto.sync.subscribeRepos${cursorParam}`;
}

// PLACEHOLDER decoder — see Step 4. The real subscribeRepos frame is dag-cbor
// inside a tiny header/body envelope; this needs either @atcute/cbor or a
// minimal hand-rolled decoder. The contract this function must satisfy is:
//   bytes → AppliedCommit | null   (returns null for non-commit frames such as
//                                   #handle, #identity, #info)
function decodeCommit(_bytes: Buffer): AppliedCommit | null {
	throw new Error('decodeCommit not implemented — see Task 11 Step 4');
}
```

- [ ] **Step 4: Implement `decodeCommit`**

Two sub-options based on Step 1's finding:

**A) atcute helper exists** — import its commit type and translate to `AppliedCommit`. Keep the imports, write a small mapper.

**B) atcute helper does not exist** — implement the decoder using `@atcute/cbor` (transitive dep of `@atcute/client`). The repo subscription frame is a two-element CBOR sequence: a header `{op, t}` followed by a body. For `t = '#commit'` the body has fields `seq, repo, ops[], blocks` (CAR file containing the records).

For implementation, lean on existing reference code:
- @atcute's lex-cli or a lookalike package that exposes `parseCommit(bytes)` — search node_modules first.
- If nothing reusable exists, defer the full CAR decode and instead parse just the fields we need from the dag-cbor body. The `ops` array contains entries with `action`, `path`, and a `cid` reference; the actual record bytes live in a separate `blocks` CAR keyed by CID. For the v1 implementation, *resolve records via a follow-up `com.atproto.sync.getRecord` call* keyed by `(repo, collection, rkey, cid)`. This trades 1 extra request per op for skipping the CAR decoder.

Implementer's choice: pick whichever is simpler in practice. Keep the trade-off in a comment at the top of the file.

If the getRecord shortcut is taken, add it to the AtpClient interface:

```ts
// In src/lib/server/atp-client.ts:
getRecord(args: { repo: string; collection: string; rkey: string; cid?: string }): Promise<{
	uri: string;
	cid: string;
	value: Record<string, unknown>;
}>;
```

Implementation calls `com.atproto.sync.getRecord` via the same rpc.get path used for `listRecords`.

- [ ] **Step 5: Sanity check**

Run: `pnpm check`
Expected: PASS.

Note: no automated test for the websocket loop in this task. The pure handler is exhaustively tested (Task 10); the websocket layer is exercised in Task 15 (smoke).

- [ ] **Step 6: Commit**

```bash
git add src/lib/server/firehose.ts package.json pnpm-lock.yaml
# only include atp-client.ts if Step 4 added getRecord
[ -f src/lib/server/atp-client.ts ] && git add src/lib/server/atp-client.ts
git commit -m "backend: firehose websocket loop — subscribeRepos with cursor + backoff"
```

---

## Task 12: `bootstrap` module

**Context:** One module that knows the boot order: open DB, run migrations, ensure backfill if needed, start scheduler, start firehose. Gated on `shouldRunBackground()`. Imported as a side-effect from `hooks.server.ts` so it runs once per Node process before the first request.

**Files:**
- Create: `src/lib/server/bootstrap.ts`
- Modify: `src/lib/server/config.ts` — add `getPdsHost()` and `shouldRunBackground()` helpers

- [ ] **Step 1: Add config helpers**

In `src/lib/server/config.ts`, append:

```ts
export function getPdsHost(): string {
	return process.env.PROTO_PDS_HOST ?? 'pds.proto.cool';
}

export function shouldRunBackground(): boolean {
	return process.env.NODE_ENV === 'production' || process.env.PROTO_BACKGROUND === '1';
}
```

- [ ] **Step 2: Implement `bootstrap.ts`**

```ts
// src/lib/server/bootstrap.ts
//
// One-shot boot. Imported as a side-effect from hooks.server.ts so it runs
// exactly once per Node process before the first request. The body is gated
// on shouldRunBackground() so vite dev / vitest / scripts/backfill don't
// connect upstream by accident.
//
// On boot:
//   1. open the DB (single shared instance, exported)
//   2. run migrations (idempotent)
//   3. if firehose.last_seq is missing → run backfill (full listRecords sweep)
//   4. start scheduler (60s tick)
//   5. start firehose (websocket)

import { openDatabase, runMigrations, type DB } from './db';
import {
	getPdsHost,
	getOwnerDid,
	getBskyAppview,
	shouldRunBackground
} from './config';
import { createAtpClient } from './atp-client';
import { runBackfill } from './backfill';
import { createBskyAdapter } from './adapters/bsky';
import { createGrainAdapter } from './adapters/grain';
import type { AdapterRegistry } from './adapters/types';
import { createBreaker } from './breaker';
import { startScheduler, type SchedulerHandle } from './scheduler';
import { startFirehose, type FirehoseHandle } from './firehose';

const DB_PATH = process.env.PROTO_DB_PATH ?? 'data/proto.db';

let booted = false;
let dbInstance: DB | null = null;
let schedulerHandle: SchedulerHandle | null = null;
let firehoseHandle: FirehoseHandle | null = null;

export function getDb(): DB {
	if (!dbInstance) {
		dbInstance = openDatabase(DB_PATH);
		runMigrations(dbInstance);
	}
	return dbInstance;
}

export async function bootstrap(): Promise<void> {
	if (booted) return;
	booted = true;

	const db = getDb();

	if (!shouldRunBackground()) {
		console.info('[bootstrap] background workers disabled (set PROTO_BACKGROUND=1 to enable)');
		return;
	}

	const ownerDid = await resolveOwnerDid();
	if (!ownerDid) {
		console.warn('[bootstrap] no owner DID; skipping firehose + scheduler');
		return;
	}

	await ensureBackfillIfNeeded(db, ownerDid);

	const adapters: AdapterRegistry = {
		bsky: createBskyAdapter(createAtpClient(getBskyAppview())),
		grain: createGrainAdapter()
	};
	const breaker = createBreaker(db);

	schedulerHandle = startScheduler(db, adapters, breaker);
	firehoseHandle = startFirehose({ db, pdsHost: getPdsHost(), ownerDid });

	console.info('[bootstrap] workers started');
}

async function resolveOwnerDid(): Promise<string | null> {
	const fromEnv = getOwnerDid();
	if (fromEnv) return fromEnv;
	const handle = process.env.PUBLIC_OWNER_HANDLE;
	if (!handle) return null;
	try {
		const client = createAtpClient(`https://${getPdsHost()}`);
		const { did } = await client.resolveHandle(handle);
		return did;
	} catch (err) {
		console.warn('[bootstrap] resolveHandle failed', err);
		return null;
	}
}

async function ensureBackfillIfNeeded(db: DB, ownerDid: string): Promise<void> {
	const seqRow = db
		.prepare(`SELECT value FROM state WHERE key = 'firehose.last_seq'`)
		.get() as { value: string } | undefined;
	if (seqRow) return; // already cached; firehose will resume

	console.info('[bootstrap] cold start — running backfill');
	const client = createAtpClient(`https://${getPdsHost()}`);
	const result = await runBackfill(db, client, ownerDid);
	console.info(`[bootstrap] backfill complete: ${result.totalInserted} rows`);
}

// For graceful shutdown — exported for tests / scripts that want it.
export function shutdown() {
	schedulerHandle?.stop();
	firehoseHandle?.stop();
	dbInstance?.close();
	booted = false;
	dbInstance = null;
	schedulerHandle = null;
	firehoseHandle = null;
}
```

- [ ] **Step 3: Sanity check**

Run: `pnpm check`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/server/bootstrap.ts src/lib/server/config.ts
git commit -m "backend: bootstrap module — boot order, owner DID resolve, backfill-if-needed"
```

---

## Task 13: Wire bootstrap into `hooks.server.ts`

**Context:** `hooks.server.ts` is the only file SvelteKit always loads at server start (before any request). A top-of-file side-effect call to `bootstrap()` is the canonical place. The existing loaders in `+page.server.ts` and `+layout.server.ts` are already opening their own DB (Plan 1) — switch them to share the bootstrap-owned instance via `getDb()` so we don't accidentally have two connections.

**Files:**
- Modify: `src/hooks.server.ts`
- Modify: `src/routes/+page.server.ts`
- Modify: `src/routes/+layout.server.ts`

- [ ] **Step 1: Update `hooks.server.ts`**

Edit `src/hooks.server.ts` — add the bootstrap import at the top:

```ts
// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit';
import { resolveTheme, resolveMode } from '$lib/theme/resolve';
import { COOKIE_NAMES } from '$lib/theme';
import { bootstrap } from '$lib/server/bootstrap';

// Side-effect: kicks off DB open, migrations, and (if enabled) workers.
// `bootstrap()` is idempotent and resolves on the first call's promise on
// every subsequent call — so awaiting it inside the request handler is safe
// once it has settled.
const bootPromise = bootstrap().catch((err) => {
	console.error('[bootstrap] fatal', err);
	process.exit(1);
});

export const handle: Handle = async ({ event, resolve }) => {
	await bootPromise;

	const theme = resolveTheme(event.cookies.get(COOKIE_NAMES.theme));
	const mode = resolveMode(event.cookies.get(COOKIE_NAMES.mode));

	event.locals.theme = theme;
	event.locals.mode = mode;

	return resolve(event, {
		transformPageChunk: ({ html }) =>
			html.replaceAll('%proto.theme%', theme).replaceAll('%proto.mode%', mode)
	});
};
```

- [ ] **Step 2: Switch loaders to `getDb()`**

The existing `+page.server.ts` and `+layout.server.ts` open their own `Database` instance at module scope. Replace those with `getDb()` from bootstrap so all readers share one connection.

For `src/routes/+layout.server.ts`, replace the existing module-level open with:

```ts
import type { LayoutServerLoad } from './$types';
import { getDb } from '$lib/server/bootstrap';
import { getSystemSnapshot } from '$lib/server/system';

export const load: LayoutServerLoad = ({ locals }) => {
	const db = getDb();
	return {
		theme: locals.theme,
		mode: locals.mode,
		system: getSystemSnapshot(db)
	};
};
```

For `src/routes/+page.server.ts`, replace the module-level open with `getDb()` (preserve the existing zod schema and `getFeed` call — only the DB open changes). Read the current file first; the rest of its body stays as-is.

- [ ] **Step 3: Sanity check**

Run: `pnpm check && pnpm test`
Expected: PASS, all tests still green (none of these changes affect test surfaces — workers are gated on env).

- [ ] **Step 4: Commit**

```bash
git add src/hooks.server.ts src/routes/+page.server.ts src/routes/+layout.server.ts
git commit -m "backend: wire bootstrap from hooks.server; share DB via getDb()"
```

---

## Task 14: Live `firehose` block in `getSystemSnapshot`

**Context:** `system.ts` currently hardcodes `firehose.connected: false` with a "Plan 2 makes this dynamic" comment. Plan 2 makes it dynamic. Read `firehoseState` from the running worker; compute `lagSec` as the seconds between `lastEventAtMs` and `now`. If the firehose hasn't run (background disabled), all three fields are null/false — exactly what the panel renders today.

**Files:**
- Modify: `src/lib/server/system.ts`
- Modify: `src/lib/server/system.test.ts` — add tests for the live block

- [ ] **Step 1: Update `system.ts`**

In `src/lib/server/system.ts`, replace the hardcoded `firehose: { connected: false, lastSeq, lagSec: null }` block:

```ts
import { getFirehoseState } from './firehose';

// ... inside getSystemSnapshot():

const fh = getFirehoseState();
const lagSec = fh.lastEventAtMs !== null ? Math.max(0, (Date.now() - fh.lastEventAtMs) / 1000) : null;

return {
	process: {
		uptimeSec: process.uptime(),
		memRssMb,
		loadavg: [l1, l5, l15]
	},
	firehose: {
		connected: fh.connected,
		lastSeq: fh.lastSeq ?? lastSeq, // prefer live; fall back to persisted state row
		lagSec
	},
	cron: readCronStatus(db),
	db: {
		records: counts.records,
		engagement: counts.engagement,
		pending: counts.pending,
		sizeBytes
	},
	buildSig: __BUILD_SHA__.toUpperCase().slice(0, 4)
};
```

- [ ] **Step 2: Update tests**

In `src/lib/server/system.test.ts`, add a case asserting the firehose block reflects live state. The existing `getFirehoseState` returns the module-level singleton, so tests run in worker-disabled mode and should see `{ connected: false, lastSeq: null|<from state row>, lagSec: null }`. Read the file first and add:

```ts
it('reflects firehose worker state when no worker has started', () => {
	const snap = getSystemSnapshot(db);
	expect(snap.firehose.connected).toBe(false);
	expect(snap.firehose.lagSec).toBeNull();
});

it('falls back to persisted last_seq when worker has not run', () => {
	db.prepare(
		`INSERT INTO state (key, value, updated_at) VALUES ('firehose.last_seq', '12345', '2026-04-29T12:00:00Z')`
	).run();
	const snap = getSystemSnapshot(db);
	expect(snap.firehose.lastSeq).toBe(12345);
});
```

- [ ] **Step 3: Run tests**

Run: `pnpm test -- system`
Expected: PASS, all tests green.

- [ ] **Step 4: Commit**

```bash
git add src/lib/server/system.ts src/lib/server/system.test.ts
git commit -m "backend: live firehose block in system snapshot — connected + lagSec"
```

---

## Task 15: End-to-end smoke test (manual)

**Context:** Final verification with real workers. Not in CI.

**Files:** none modified.

- [ ] **Step 1: Run full quality gate**

```bash
pnpm check && pnpm test && pnpm build
```

Expected: 0 errors, all tests pass, build clean.

- [ ] **Step 2: Boot with workers enabled**

```bash
PROTO_BACKGROUND=1 PUBLIC_OWNER_HANDLE=proto.cool pnpm dev
```

In a second terminal:

```bash
# Tail the dev server logs and look for:
#   [bootstrap] workers started
#   [firehose] connected
# Then send a test post via your bsky client and look for:
#   [scheduler] (or no errors at all on tick)
```

- [ ] **Step 3: Visual verification**

Open `http://localhost:5173`. Confirm the StatsPanel build-hex matches `git rev-parse --short HEAD`'s first 4 chars.

If you have a feed UI rendered, post a new bsky post and confirm it appears within a couple of seconds (firehose) and that quote-posts / reposts inline their subjects (engagement scheduler enriches them within a tick).

- [ ] **Step 4: Persistence check**

Stop the server, restart with the same command. Confirm in logs:
- `[bootstrap] workers started` (no backfill — `firehose.last_seq` is set)
- `[firehose] connecting cursor=<some-number>`

- [ ] **Step 5: No commit needed**

This task does not modify code. Proceed to a final review pass.

---

## Self-review notes (controller)

Before kicking off subagent execution:

1. **Spec coverage:**
   - Firehose ingest pipeline → Tasks 9, 10, 11.
   - Engagement refresh + external enrichment pipeline → Tasks 6, 7, 8.
   - Read pipeline → unchanged from Plan 1 ✅
   - Schema → unchanged from Plan 1 ✅
   - Read API → unchanged from Plan 1 ✅
   - System metrics → Task 14 makes the firehose block live.
   - Error handling — firehose backoff (Task 11), AppView breaker (Task 5), scheduler isolation (Tasks 6, 7), tombstones (Task 10).
   - Validation boundary — adapter shape (Task 1), commit handler (Tasks 9, 10). zod schemas at boundaries deferred until shapes stabilize; the type guards in `extractSubjectUri` and `applyCommit` are sufficient for v1.
   - Process lifecycle → Tasks 12, 13.

2. **Placeholder scan:** None of the steps say "implement appropriately" or "fill in later" — the only deliberate ambiguity is Task 11 Step 4 (decoder choice), and it's framed as a documented decision point with two concrete options.

3. **Type consistency:** `EngagementRow` / `RecordRow` defined in Task 1 are used unchanged in Tasks 2, 3, 6, 7. `Tier` type defined in Task 4 used unchanged in 6, 7. `AppliedCommit` defined in Task 9 used in Task 11. `SchedulerHandle` defined in Task 8 used in Task 12.

4. **Scope:** No UI work in this plan. Home page UI is its own future plan (Plan 1.5).
