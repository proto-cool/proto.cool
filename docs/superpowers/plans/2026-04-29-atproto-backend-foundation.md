# atproto backend — foundation + read path Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the read-side data layer for proto.cool — a SQLite-backed persistent cache, a `getFeed()` loader, a system-snapshot module, and a one-shot `listRecords` backfill — so the home page renders a real feed from cached PDS records. No real-time workers yet (those are the next plan).

**Architecture:** Single Node process (SvelteKit adapter-node). `better-sqlite3` in-process, WAL mode, file at `data/proto.sqlite`. All server-side modules under `src/lib/server/` (SvelteKit guarantees this won't bundle into the client). Reads never touch upstream — every request is a pure SQL query against the cache. Backfill is a CLI script (`scripts/backfill.ts`) the operator runs on demand to populate the cache from `com.atproto.repo.listRecords`.

**Tech Stack:** SvelteKit 2.x, TypeScript strict, `better-sqlite3` v11, `zod` v3, `@atcute/client` v4 (already a dep), `@atcute/atproto` + `@atcute/bluesky` (new — type registrations for atproto/bsky lexicons), Vitest 4.

---

## Spec coverage

This plan implements the following sections of `docs/superpowers/specs/2026-04-29-atproto-backend-and-cache-design.md`:

- **Schema** (full `records`, `engagement`, `state` tables, all indexes, all PRAGMAs).
- **Read API surface** (`FeedFilter`, `FeedItem`, `EngagementSummary`, `getFeed`, cursor codec).
- **System metrics surface** (`SystemSnapshot`, `getSystemSnapshot`).
- **Pipeline 3 (Read)** end-to-end via `+page.server.ts`.
- **Bootstrap module's backfill branch** (`ensureBackfillIfNeeded`) — implemented as a manual CLI in this plan; the next plan promotes it to an automatic boot-time call.
- **StatsPanel migration** of `build hex` from `chrome.system.sig` to `data.system.buildSig`.

Explicitly **deferred** to the next plan:
- Pipelines 1 & 2 (firehose ingest, scheduler, engagement refresh, external enrichment).
- AppView adapters (`bsky.ts`, `grain.ts`).
- Per-source breaker, scheduler tier logic, scheduler tick.
- Auto-bootstrap on server boot (we use a CLI here so the read path can ship before the workers exist).

The schema in this plan is the **final** schema — Plan 2 adds no migrations, just consumers.

---

## File structure

**New files:**

| Path | Responsibility |
| --- | --- |
| `src/lib/server/db.ts` | Open SQLite with pragmas; run pending migrations; export `Database` type re-export |
| `src/lib/server/migrations/001_init.sql` | Full schema (records, engagement, state, indexes) |
| `src/lib/server/migrations/index.ts` | Migration registry (one entry for v1; future entries appended here) |
| `src/lib/server/config.ts` | `WATCHED_COLLECTIONS`, `Source` type, `sourceForCollection`, `collectionsForSource`, `getOwnerDid` |
| `src/lib/server/cursor.ts` | `encodeCursor`, `decodeCursor`, `Cursor` type |
| `src/lib/server/feed.ts` | `FeedFilter`, `FeedItem`, `EngagementSummary` types; `buildFeedQuery`; `hydrateRow`; `getFeed` |
| `src/lib/server/system.ts` | `SystemSnapshot` type, `getSystemSnapshot(db)` |
| `src/lib/server/atp-client.ts` | `AtpClient` interface + `createAtpClient` factory wrapping `@atcute/client` |
| `src/lib/server/backfill.ts` | `runBackfill(db, client, did)` — listRecords sweep across watched collections |
| `src/lib/server/db.test.ts` | DB open + migration idempotency tests |
| `src/lib/server/config.test.ts` | source ↔ collection mapping tests |
| `src/lib/server/cursor.test.ts` | encode/decode round-trip + invalid-input tests |
| `src/lib/server/feed.test.ts` | query builder, hydrator, and `getFeed` integration tests |
| `src/lib/server/system.test.ts` | system snapshot shape tests |
| `src/lib/server/backfill.test.ts` | backfill sweep tests with mocked client |
| `scripts/backfill.ts` | CLI entry: open DB, build client, call `runBackfill`, log progress |
| `src/routes/+page.server.ts` | Home page loader: parse URL filter, call `getFeed`, return result |
| `data/.gitkeep` | Ensures `data/` exists in fresh checkouts |

**Modified files:**

| Path | Change |
| --- | --- |
| `package.json` | Add `better-sqlite3`, `zod` (deps); `@types/better-sqlite3`, `@atcute/atproto`, `@atcute/bluesky` (devDeps); add `backfill` script |
| `.gitignore` | Add `data/*.sqlite*` |
| `.env.example` | Document `PROTO_DB_PATH`, `PROTO_OWNER_DID` |
| `src/app.d.ts` | Augment `App.PageData` with `system?: SystemSnapshot`; add atcute lexicon `/// <reference>` lines |
| `src/routes/+layout.server.ts` | Call `getSystemSnapshot(db)`; expose under `data.system` |
| `src/lib/shell/StatsPanel.svelte` | Read `buildSig` from `data.system` (passed via props) instead of `chrome.system.sig` |

**Boundaries / interfaces:**

- `db.ts` exports `openDatabase(path: string): Database` and `runMigrations(db): void`. Consumers receive a `Database` instance — no global singleton, so tests can use `:memory:`.
- `feed.ts` exports `getFeed(db: Database, filter: FeedFilter): { items: FeedItem[]; nextCursor: string | null }`. Pure read; no hidden I/O.
- `atp-client.ts` exports an `AtpClient` interface with the operations `backfill.ts` needs. Real impl wraps `@atcute/client`; tests inject a stub.
- All env-var reads happen in two places: `config.ts` (for `PROTO_OWNER_DID`) and the CLI entry / loader (for `PROTO_DB_PATH`). Library modules don't touch `process.env`.

---

## Task 1: Add dependencies and runtime data directory

**Files:**
- Modify: `package.json`
- Modify: `.gitignore`
- Modify: `.env.example`
- Create: `data/.gitkeep`

- [ ] **Step 1: Add the runtime deps**

Edit `package.json` to add the following entries (preserve existing entries):

```json
{
  "scripts": {
    "backfill": "tsx scripts/backfill.ts"
  },
  "dependencies": {
    "@atcute/client": "^4.2.1",
    "better-sqlite3": "^11.5.0",
    "phosphor-svelte": "^3.1.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@atcute/atproto": "^3.1.10",
    "@atcute/bluesky": "^3.2.14",
    "@types/better-sqlite3": "^7.6.11",
    "tsx": "^4.19.2"
  }
}
```

- [ ] **Step 2: Install deps**

Run:
```bash
pnpm install
```

Expected: install completes; `node_modules/better-sqlite3/`, `node_modules/zod/`, `node_modules/@atcute/atproto/`, `node_modules/@atcute/bluesky/`, `node_modules/tsx/`, `node_modules/@types/better-sqlite3/` all exist.

- [ ] **Step 3: Add `data/` to .gitignore and create the directory**

Append to `.gitignore`:

```gitignore

# Runtime cache
/data/*.sqlite
/data/*.sqlite-journal
/data/*.sqlite-wal
/data/*.sqlite-shm
```

Create `data/.gitkeep` as an empty file:

```bash
mkdir -p data && touch data/.gitkeep
```

- [ ] **Step 4: Document new env vars**

Append to `.env.example`:

```
# proto.cool — backend cache + atproto identity
#
# Where the SQLite cache file lives. Defaults to ./data/proto.sqlite.
# PROTO_DB_PATH=./data/proto.sqlite

# The owner DID. The cache and backfill operate over this single repo.
# If unset, backfill resolves it from PUBLIC_OWNER_HANDLE via
# com.atproto.identity.resolveHandle.
# PROTO_OWNER_DID=did:plc:xxxxxxxxxxxxxxxxxxxxxxxx
```

- [ ] **Step 5: Verify the new deps load**

Run:
```bash
node --input-type=module -e "import('better-sqlite3').then(m => console.log(typeof m.default)); import('zod').then(m => console.log(typeof m.z));"
```

Expected output:
```
function
object
```

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml .gitignore .env.example data/.gitkeep
git commit -m "deps: better-sqlite3 + zod + atcute lexicon defs for backend cache"
```

---

## Task 2: Database module + initial schema migration

**Files:**
- Create: `src/lib/server/db.ts`
- Create: `src/lib/server/migrations/001_init.sql`
- Create: `src/lib/server/migrations/index.ts`
- Test: `src/lib/server/db.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/server/db.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { openDatabase, runMigrations } from './db';

describe('db', () => {
	it('openDatabase applies pragmas (journal_mode=WAL, foreign_keys=ON)', () => {
		const db = openDatabase(':memory:');
		const journal = db.pragma('journal_mode', { simple: true });
		const fk = db.pragma('foreign_keys', { simple: true });
		// WAL mode is unsupported on :memory: and falls back to "memory"; both are
		// acceptable — what we assert is "we asked for WAL, the lib accepted it".
		expect(['wal', 'memory']).toContain(journal);
		expect(fk).toBe(1);
	});

	it('runMigrations creates records, engagement, state tables', () => {
		const db = openDatabase(':memory:');
		runMigrations(db);

		const tables = db
			.prepare(
				`SELECT name FROM sqlite_master
				 WHERE type='table' AND name NOT LIKE 'sqlite_%'
				 ORDER BY name`
			)
			.all() as Array<{ name: string }>;

		const names = tables.map((t) => t.name);
		expect(names).toContain('records');
		expect(names).toContain('engagement');
		expect(names).toContain('state');
		expect(names).toContain('schema_migrations');
	});

	it('runMigrations is idempotent', () => {
		const db = openDatabase(':memory:');
		runMigrations(db);
		// Second call must not throw or duplicate-create.
		expect(() => runMigrations(db)).not.toThrow();

		const applied = db
			.prepare(`SELECT version FROM schema_migrations ORDER BY version`)
			.all() as Array<{ version: number }>;
		expect(applied.map((r) => r.version)).toEqual([1]);
	});

	it('records.uri is PRIMARY KEY and engagement.uri cascades on delete', () => {
		const db = openDatabase(':memory:');
		runMigrations(db);

		db.prepare(
			`INSERT INTO records (uri, did, collection, rkey, cid, kind, status, value, created_at, indexed_at)
			 VALUES (?,?,?,?,?,?,?,?,?,?)`
		).run(
			'at://did:plc:abc/app.bsky.feed.post/1',
			'did:plc:abc',
			'app.bsky.feed.post',
			'1',
			'bafyrei',
			'owned',
			'ok',
			'{}',
			'2026-04-01T00:00:00.000Z',
			'2026-04-01T00:00:00.000Z'
		);
		db.prepare(
			`INSERT INTO engagement (uri, like_count, repost_count, reply_count, reactor_sample, source, last_refreshed_at)
			 VALUES (?,?,?,?,?,?,?)`
		).run(
			'at://did:plc:abc/app.bsky.feed.post/1',
			0,
			0,
			0,
			'[]',
			'bsky',
			'2026-04-01T00:00:00.000Z'
		);

		// PK violation
		expect(() =>
			db
				.prepare(
					`INSERT INTO records (uri, did, collection, rkey, cid, kind, status, value, created_at, indexed_at)
					 VALUES (?,?,?,?,?,?,?,?,?,?)`
				)
				.run(
					'at://did:plc:abc/app.bsky.feed.post/1',
					'did:plc:abc',
					'app.bsky.feed.post',
					'1',
					'bafyrei',
					'owned',
					'ok',
					'{}',
					'2026-04-01T00:00:00.000Z',
					'2026-04-01T00:00:00.000Z'
				)
		).toThrow();

		// Cascade
		db.prepare(`DELETE FROM records WHERE uri = ?`).run(
			'at://did:plc:abc/app.bsky.feed.post/1'
		);
		const eng = db
			.prepare(`SELECT COUNT(*) as n FROM engagement`)
			.get() as { n: number };
		expect(eng.n).toBe(0);
	});

	it('status CHECK constraint rejects invalid values', () => {
		const db = openDatabase(':memory:');
		runMigrations(db);

		expect(() =>
			db
				.prepare(
					`INSERT INTO records (uri, did, collection, rkey, cid, kind, status, value, created_at, indexed_at)
					 VALUES (?,?,?,?,?,?,?,?,?,?)`
				)
				.run(
					'at://did:plc:abc/app.bsky.feed.post/2',
					'did:plc:abc',
					'app.bsky.feed.post',
					'2',
					'bafyrei',
					'owned',
					'deleted', // not in {pending, ok}
					'{}',
					'2026-04-01T00:00:00.000Z',
					'2026-04-01T00:00:00.000Z'
				)
		).toThrow();
	});
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:
```bash
pnpm test -- src/lib/server/db.test.ts
```

Expected: FAIL with `Cannot find module './db'`.

- [ ] **Step 3: Write the migration SQL**

Create `src/lib/server/migrations/001_init.sql`:

```sql
PRAGMA foreign_keys = ON;

CREATE TABLE records (
  uri          TEXT PRIMARY KEY,
  did          TEXT NOT NULL,
  collection   TEXT NOT NULL,
  rkey         TEXT NOT NULL,
  cid          TEXT NOT NULL,
  kind         TEXT NOT NULL CHECK (kind IN ('owned','external')),
  status       TEXT NOT NULL DEFAULT 'ok' CHECK (status IN ('pending','ok')),
  subject_uri  TEXT,
  value        TEXT,
  created_at   TEXT NOT NULL,
  indexed_at   TEXT NOT NULL
);

CREATE INDEX records_feed       ON records (status, created_at DESC, uri DESC);
CREATE INDEX records_collection ON records (collection, status, created_at DESC);
CREATE INDEX records_pending    ON records (kind, status) WHERE status = 'pending';

CREATE TABLE engagement (
  uri               TEXT PRIMARY KEY REFERENCES records(uri) ON DELETE CASCADE,
  like_count        INTEGER NOT NULL DEFAULT 0,
  repost_count      INTEGER NOT NULL DEFAULT 0,
  reply_count       INTEGER NOT NULL DEFAULT 0,
  reactor_sample    TEXT NOT NULL DEFAULT '[]',
  source            TEXT NOT NULL,
  last_refreshed_at TEXT NOT NULL
);

CREATE INDEX engagement_refresh ON engagement (last_refreshed_at);

CREATE TABLE state (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

- [ ] **Step 4: Write the migration registry**

Create `src/lib/server/migrations/index.ts`:

```ts
import migration001 from './001_init.sql?raw';

export type Migration = {
	version: number;
	name: string;
	sql: string;
};

export const MIGRATIONS: readonly Migration[] = [
	{ version: 1, name: 'init', sql: migration001 }
];
```

The `?raw` suffix is a Vite/SvelteKit feature — the file content is inlined as a string at build time. Vitest's vite-config integration recognizes it too.

- [ ] **Step 5: Write the DB module**

Create `src/lib/server/db.ts`:

```ts
import Database from 'better-sqlite3';
import type { Database as DatabaseType } from 'better-sqlite3';
import { MIGRATIONS } from './migrations';

export type DB = DatabaseType;

export function openDatabase(path: string): DB {
	const db = new Database(path);
	db.pragma('journal_mode = WAL');
	db.pragma('synchronous = NORMAL');
	db.pragma('foreign_keys = ON');
	return db;
}

export function runMigrations(db: DB): void {
	db.exec(`
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version    INTEGER PRIMARY KEY,
			name       TEXT NOT NULL,
			applied_at TEXT NOT NULL
		);
	`);

	const applied = new Set(
		(
			db.prepare(`SELECT version FROM schema_migrations`).all() as Array<{
				version: number;
			}>
		).map((r) => r.version)
	);

	const insertApplied = db.prepare(
		`INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)`
	);

	const apply = db.transaction((m: (typeof MIGRATIONS)[number]) => {
		db.exec(m.sql);
		insertApplied.run(m.version, m.name, new Date().toISOString());
	});

	for (const m of MIGRATIONS) {
		if (applied.has(m.version)) continue;
		apply(m);
	}
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run:
```bash
pnpm test -- src/lib/server/db.test.ts
```

Expected: 5 tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/server/db.ts src/lib/server/db.test.ts src/lib/server/migrations/
git commit -m "backend: SQLite open + migrations runner + initial schema"
```

---

## Task 3: Config module — watched collections + source mapping + owner DID

**Files:**
- Create: `src/lib/server/config.ts`
- Test: `src/lib/server/config.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/server/config.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
	WATCHED_COLLECTIONS,
	collectionsForSource,
	sourceForCollection,
	type Source
} from './config';

describe('config', () => {
	it('WATCHED_COLLECTIONS contains the v1 social and bsky collections', () => {
		expect(WATCHED_COLLECTIONS).toContain('app.bsky.feed.post');
		expect(WATCHED_COLLECTIONS).toContain('app.bsky.feed.repost');
	});

	it('sourceForCollection maps known NSIDs to their source', () => {
		expect(sourceForCollection('app.bsky.feed.post')).toBe('bsky');
		expect(sourceForCollection('app.bsky.feed.repost')).toBe('bsky');
	});

	it('sourceForCollection returns null for unknown NSIDs', () => {
		expect(sourceForCollection('com.example.unknown')).toBe(null);
	});

	it('collectionsForSource returns the collections for a given source', () => {
		const bsky = collectionsForSource('bsky');
		expect(bsky).toContain('app.bsky.feed.post');
		expect(bsky).toContain('app.bsky.feed.repost');
	});

	it('collectionsForSource returns [] for an unknown source', () => {
		// @ts-expect-error — testing runtime behavior on an invalid input
		expect(collectionsForSource('nope')).toEqual([]);
	});

	it('every WATCHED_COLLECTIONS entry has a source mapping', () => {
		for (const c of WATCHED_COLLECTIONS) {
			const s = sourceForCollection(c);
			expect(s, `no source for ${c}`).not.toBe(null);
		}
	});

	it('Source type accepts the v1 enum values', () => {
		const s: Source[] = ['bsky', 'pckt', 'standard', 'grain'];
		expect(s.length).toBe(4);
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
pnpm test -- src/lib/server/config.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write the config module**

Create `src/lib/server/config.ts`:

```ts
export type Source = 'bsky' | 'pckt' | 'standard' | 'grain';

// NSIDs grain / pckt / standard remain unmapped in v1: their lexicon ids
// are deferred to when we wire them up. Adding them is one entry per source
// in COLLECTIONS_BY_SOURCE and one push to WATCHED_COLLECTIONS.
const COLLECTIONS_BY_SOURCE: Record<Source, readonly string[]> = {
	bsky: ['app.bsky.feed.post', 'app.bsky.feed.repost'],
	pckt: [],
	standard: [],
	grain: []
};

export const WATCHED_COLLECTIONS: readonly string[] = Object.values(
	COLLECTIONS_BY_SOURCE
).flat();

const COLLECTION_TO_SOURCE: ReadonlyMap<string, Source> = new Map(
	(Object.entries(COLLECTIONS_BY_SOURCE) as Array<[Source, readonly string[]]>).flatMap(
		([source, collections]) => collections.map((c) => [c, source] as const)
	)
);

export function sourceForCollection(collection: string): Source | null {
	return COLLECTION_TO_SOURCE.get(collection) ?? null;
}

export function collectionsForSource(source: Source): readonly string[] {
	return COLLECTIONS_BY_SOURCE[source] ?? [];
}

/**
 * Read the operator's DID from the env. Returns null if unset; backfill /
 * bootstrap callers fall back to handle resolution in that case.
 */
export function getOwnerDid(): string | null {
	const v = process.env.PROTO_OWNER_DID;
	return v && v.length > 0 ? v : null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
pnpm test -- src/lib/server/config.test.ts
```

Expected: 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/config.ts src/lib/server/config.test.ts
git commit -m "backend: config — watched collections + source mapping"
```

---

## Task 4: Cursor codec

**Files:**
- Create: `src/lib/server/cursor.ts`
- Test: `src/lib/server/cursor.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/server/cursor.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { encodeCursor, decodeCursor, type Cursor } from './cursor';

describe('cursor', () => {
	it('encodes and decodes round-trip', () => {
		const c: Cursor = {
			ts: '2026-04-01T12:34:56.000Z',
			uri: 'at://did:plc:abc/app.bsky.feed.post/3khrtnf25xs2k'
		};
		const encoded = encodeCursor(c);
		const decoded = decodeCursor(encoded);
		expect(decoded).toEqual(c);
	});

	it('produces a base64url string (no +, /, or = padding)', () => {
		const encoded = encodeCursor({
			ts: '2026-04-01T12:34:56.000Z',
			uri: 'at://did:plc:abc/app.bsky.feed.post/x'
		});
		expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
	});

	it('decodeCursor throws on a non-base64url string', () => {
		expect(() => decodeCursor('!!! not valid !!!')).toThrow();
	});

	it('decodeCursor throws when the decoded JSON is missing required fields', () => {
		// "{\"ts\":\"x\"}" — no uri
		const partial = Buffer.from('{"ts":"x"}', 'utf8')
			.toString('base64')
			.replaceAll('+', '-')
			.replaceAll('/', '_')
			.replaceAll('=', '');
		expect(() => decodeCursor(partial)).toThrow();
	});

	it('decodeCursor throws when payload is not JSON', () => {
		const bad = Buffer.from('not json', 'utf8')
			.toString('base64')
			.replaceAll('+', '-')
			.replaceAll('/', '_')
			.replaceAll('=', '');
		expect(() => decodeCursor(bad)).toThrow();
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
pnpm test -- src/lib/server/cursor.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write the cursor module**

Create `src/lib/server/cursor.ts`:

```ts
import { z } from 'zod';

export type Cursor = {
	ts: string;
	uri: string;
};

const CursorSchema = z.object({
	ts: z.string().min(1),
	uri: z.string().min(1)
});

function toBase64Url(s: string): string {
	return Buffer.from(s, 'utf8')
		.toString('base64')
		.replaceAll('+', '-')
		.replaceAll('/', '_')
		.replaceAll('=', '');
}

function fromBase64Url(s: string): string {
	if (!/^[A-Za-z0-9_-]+$/.test(s)) {
		throw new Error('cursor: not a base64url string');
	}
	const padded = s.replaceAll('-', '+').replaceAll('_', '/') +
		'='.repeat((4 - (s.length % 4)) % 4);
	return Buffer.from(padded, 'base64').toString('utf8');
}

export function encodeCursor(cursor: Cursor): string {
	return toBase64Url(JSON.stringify(cursor));
}

export function decodeCursor(s: string): Cursor {
	const json = fromBase64Url(s);
	let parsed: unknown;
	try {
		parsed = JSON.parse(json);
	} catch {
		throw new Error('cursor: not valid JSON');
	}
	const result = CursorSchema.safeParse(parsed);
	if (!result.success) {
		throw new Error('cursor: missing required fields');
	}
	return result.data;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
pnpm test -- src/lib/server/cursor.test.ts
```

Expected: 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/cursor.ts src/lib/server/cursor.test.ts
git commit -m "backend: cursor codec (base64url JSON)"
```

---

## Task 5: Feed types + query builder

**Files:**
- Create: `src/lib/server/feed.ts` (types + buildFeedQuery only — `getFeed` and `hydrateRow` come in later tasks)
- Test: `src/lib/server/feed.test.ts` (initial tests for buildFeedQuery)

- [ ] **Step 1: Write the failing tests**

Create `src/lib/server/feed.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildFeedQuery, type FeedFilter } from './feed';

describe('buildFeedQuery', () => {
	it('builds a default DESC query with no filters', () => {
		const { sql, params } = buildFeedQuery({});
		expect(sql).toContain("r.status = 'ok'");
		expect(sql).toContain('ORDER BY r.created_at DESC, r.uri DESC');
		expect(sql).toContain('LIMIT ?');
		expect(params).toContain(20);
	});

	it('caps limit at 50', () => {
		const { params } = buildFeedQuery({ limit: 99999 });
		expect(params).toContain(50);
	});

	it('uses the requested limit when within cap', () => {
		const { params } = buildFeedQuery({ limit: 7 });
		expect(params).toContain(7);
	});

	it('rejects non-positive limits by falling back to default', () => {
		const a = buildFeedQuery({ limit: 0 });
		const b = buildFeedQuery({ limit: -5 });
		expect(a.params).toContain(20);
		expect(b.params).toContain(20);
	});

	it('emits ASC order when filter.order = "asc"', () => {
		const { sql } = buildFeedQuery({ order: 'asc' });
		expect(sql).toContain('ORDER BY r.created_at ASC, r.uri ASC');
	});

	it('emits a collection IN (...) clause when sources are provided', () => {
		const { sql, params } = buildFeedQuery({ sources: ['bsky'] });
		expect(sql).toMatch(/r\.collection IN \(\?\s*,\s*\?\)/);
		expect(params).toContain('app.bsky.feed.post');
		expect(params).toContain('app.bsky.feed.repost');
	});

	it('emits no collection clause when sources is empty', () => {
		const { sql } = buildFeedQuery({ sources: [] });
		expect(sql).not.toContain('r.collection IN');
	});

	it('emits date-range BETWEEN when from and to are provided', () => {
		const filter: FeedFilter = {
			from: '2026-01-01T00:00:00.000Z',
			to: '2026-04-01T00:00:00.000Z'
		};
		const { sql, params } = buildFeedQuery(filter);
		expect(sql).toMatch(/r\.created_at\s*>=\s*\?/);
		expect(sql).toMatch(/r\.created_at\s*<\s*\?/);
		expect(params).toContain(filter.from);
		expect(params).toContain(filter.to);
	});

	it('emits a keyset predicate matching DESC order direction', () => {
		const { sql, params } = buildFeedQuery({
			cursor: { ts: '2026-03-01T00:00:00.000Z', uri: 'at://x/y/z' }
		});
		// DESC: walk backwards in time → next page is created_at < cursor.ts (or =/uri<)
		expect(sql).toMatch(/\(r\.created_at, r\.uri\)\s*<\s*\(\?, \?\)/);
		expect(params).toContain('2026-03-01T00:00:00.000Z');
		expect(params).toContain('at://x/y/z');
	});

	it('emits a keyset predicate matching ASC order direction', () => {
		const { sql } = buildFeedQuery({
			order: 'asc',
			cursor: { ts: '2026-03-01T00:00:00.000Z', uri: 'at://x/y/z' }
		});
		expect(sql).toMatch(/\(r\.created_at, r\.uri\)\s*>\s*\(\?, \?\)/);
	});

	it('selects engagement and subject columns via LEFT JOINs', () => {
		const { sql } = buildFeedQuery({});
		expect(sql).toMatch(/LEFT JOIN engagement e ON e\.uri = r\.uri/);
		expect(sql).toMatch(/LEFT JOIN records s ON s\.uri = r\.subject_uri AND s\.status = 'ok'/);
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
pnpm test -- src/lib/server/feed.test.ts
```

Expected: FAIL — `feed` module not found.

- [ ] **Step 3: Write the feed types and query builder**

Create `src/lib/server/feed.ts`:

```ts
import { collectionsForSource, type Source } from './config';
import type { Cursor } from './cursor';

export type EngagementSummary = {
	likeCount: number;
	repostCount: number;
	replyCount: number;
	reactorSample: Array<{ did: string; handle: string; avatar: string | null }>;
};

export type FeedItem = {
	uri: string;
	collection: string;
	kind: 'owned' | 'external';
	subjectUri: string | null;
	createdAt: string;
	value: unknown;
	engagement?: EngagementSummary;
	subject?: FeedItem | null;
};

export type FeedFilter = {
	sources?: Source[];
	from?: string; // ISO
	to?: string;   // ISO
	cursor?: Cursor;
	limit?: number;
	order?: 'desc' | 'asc';
};

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export type BuiltQuery = {
	sql: string;
	params: ReadonlyArray<string | number>;
};

export function buildFeedQuery(filter: FeedFilter): BuiltQuery {
	const order: 'asc' | 'desc' = filter.order === 'asc' ? 'asc' : 'desc';
	const dirSql = order === 'asc' ? 'ASC' : 'DESC';
	const cmpOp = order === 'asc' ? '>' : '<';

	const limit =
		typeof filter.limit === 'number' && filter.limit > 0
			? Math.min(filter.limit, MAX_LIMIT)
			: DEFAULT_LIMIT;

	const wheres: string[] = [`r.status = 'ok'`];
	const params: Array<string | number> = [];

	if (filter.sources && filter.sources.length > 0) {
		const collections = filter.sources.flatMap((s) => collectionsForSource(s));
		if (collections.length > 0) {
			const placeholders = collections.map(() => '?').join(', ');
			wheres.push(`r.collection IN (${placeholders})`);
			params.push(...collections);
		} else {
			// Source provided but it has no collections wired up yet — return zero rows.
			wheres.push(`1 = 0`);
		}
	}

	if (filter.from) {
		wheres.push(`r.created_at >= ?`);
		params.push(filter.from);
	}
	if (filter.to) {
		wheres.push(`r.created_at < ?`);
		params.push(filter.to);
	}
	if (filter.cursor) {
		wheres.push(`(r.created_at, r.uri) ${cmpOp} (?, ?)`);
		params.push(filter.cursor.ts, filter.cursor.uri);
	}

	params.push(limit);

	const sql = `
		SELECT
			r.uri          AS uri,
			r.collection   AS collection,
			r.kind         AS kind,
			r.subject_uri  AS subject_uri,
			r.created_at   AS created_at,
			r.value        AS value,
			e.like_count        AS like_count,
			e.repost_count      AS repost_count,
			e.reply_count       AS reply_count,
			e.reactor_sample    AS reactor_sample,
			e.source            AS engagement_source,
			s.uri          AS subject_uri_resolved,
			s.collection   AS subject_collection,
			s.kind         AS subject_kind,
			s.created_at   AS subject_created_at,
			s.value        AS subject_value,
			se.like_count       AS subject_like_count,
			se.repost_count     AS subject_repost_count,
			se.reply_count      AS subject_reply_count,
			se.reactor_sample   AS subject_reactor_sample,
			se.source           AS subject_engagement_source
		FROM records r
		LEFT JOIN engagement e ON e.uri = r.uri
		LEFT JOIN records s ON s.uri = r.subject_uri AND s.status = 'ok'
		LEFT JOIN engagement se ON se.uri = s.uri
		WHERE ${wheres.join(' AND ')}
		ORDER BY r.created_at ${dirSql}, r.uri ${dirSql}
		LIMIT ?
	`;

	return { sql, params };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
pnpm test -- src/lib/server/feed.test.ts
```

Expected: 11 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/feed.ts src/lib/server/feed.test.ts
git commit -m "backend: feed types + buildFeedQuery"
```

---

## Task 6: Row hydrator

**Files:**
- Modify: `src/lib/server/feed.ts` (add `hydrateRow`)
- Modify: `src/lib/server/feed.test.ts` (add hydrator tests)

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/server/feed.test.ts`:

```ts
import { hydrateRow } from './feed';

describe('hydrateRow', () => {
	it('hydrates an owned bsky post with engagement and no subject', () => {
		const row = {
			uri: 'at://did:plc:abc/app.bsky.feed.post/1',
			collection: 'app.bsky.feed.post',
			kind: 'owned',
			subject_uri: null,
			created_at: '2026-04-01T12:00:00.000Z',
			value: '{"$type":"app.bsky.feed.post","text":"hi","createdAt":"2026-04-01T12:00:00.000Z"}',
			like_count: 5,
			repost_count: 1,
			reply_count: 2,
			reactor_sample: '[{"did":"did:plc:x","handle":"alice.bsky.social","avatar":null}]',
			engagement_source: 'bsky',
			subject_uri_resolved: null,
			subject_collection: null,
			subject_kind: null,
			subject_created_at: null,
			subject_value: null,
			subject_like_count: null,
			subject_repost_count: null,
			subject_reply_count: null,
			subject_reactor_sample: null,
			subject_engagement_source: null
		};

		const item = hydrateRow(row);

		expect(item.uri).toBe(row.uri);
		expect(item.collection).toBe('app.bsky.feed.post');
		expect(item.kind).toBe('owned');
		expect(item.subjectUri).toBe(null);
		expect(item.createdAt).toBe('2026-04-01T12:00:00.000Z');
		expect((item.value as { text: string }).text).toBe('hi');
		expect(item.engagement?.likeCount).toBe(5);
		expect(item.engagement?.repostCount).toBe(1);
		expect(item.engagement?.replyCount).toBe(2);
		expect(item.engagement?.reactorSample).toEqual([
			{ did: 'did:plc:x', handle: 'alice.bsky.social', avatar: null }
		]);
		expect(item.subject).toBe(null);
	});

	it('hydrates a record without engagement (engagement_source NULL)', () => {
		const row = {
			uri: 'at://did:plc:abc/blog.pckt.entry/1',
			collection: 'blog.pckt.entry',
			kind: 'owned',
			subject_uri: null,
			created_at: '2026-04-01T12:00:00.000Z',
			value: '{"$type":"blog.pckt.entry","title":"hi"}',
			like_count: null,
			repost_count: null,
			reply_count: null,
			reactor_sample: null,
			engagement_source: null,
			subject_uri_resolved: null,
			subject_collection: null,
			subject_kind: null,
			subject_created_at: null,
			subject_value: null,
			subject_like_count: null,
			subject_repost_count: null,
			subject_reply_count: null,
			subject_reactor_sample: null,
			subject_engagement_source: null
		};
		const item = hydrateRow(row);
		expect(item.engagement).toBeUndefined();
	});

	it('hydrates a repost with a resolved subject', () => {
		const row = {
			uri: 'at://did:plc:abc/app.bsky.feed.repost/1',
			collection: 'app.bsky.feed.repost',
			kind: 'owned',
			subject_uri: 'at://did:plc:other/app.bsky.feed.post/abc',
			created_at: '2026-04-02T12:00:00.000Z',
			value: '{"$type":"app.bsky.feed.repost","subject":{"uri":"at://did:plc:other/app.bsky.feed.post/abc","cid":"bafy"}}',
			like_count: null,
			repost_count: null,
			reply_count: null,
			reactor_sample: null,
			engagement_source: null,
			subject_uri_resolved: 'at://did:plc:other/app.bsky.feed.post/abc',
			subject_collection: 'app.bsky.feed.post',
			subject_kind: 'external',
			subject_created_at: '2026-04-01T08:00:00.000Z',
			subject_value: '{"$type":"app.bsky.feed.post","text":"original"}',
			subject_like_count: 12,
			subject_repost_count: 3,
			subject_reply_count: 4,
			subject_reactor_sample: '[]',
			subject_engagement_source: 'bsky'
		};
		const item = hydrateRow(row);
		expect(item.subjectUri).toBe('at://did:plc:other/app.bsky.feed.post/abc');
		expect(item.subject).not.toBeNull();
		expect(item.subject?.uri).toBe('at://did:plc:other/app.bsky.feed.post/abc');
		expect(item.subject?.kind).toBe('external');
		expect((item.subject?.value as { text: string }).text).toBe('original');
		expect(item.subject?.engagement?.likeCount).toBe(12);
	});

	it('hydrates a row whose subject_uri is set but subject row is missing (deleted target)', () => {
		const row = {
			uri: 'at://did:plc:abc/app.bsky.feed.repost/2',
			collection: 'app.bsky.feed.repost',
			kind: 'owned',
			subject_uri: 'at://did:plc:other/app.bsky.feed.post/gone',
			created_at: '2026-04-02T12:00:00.000Z',
			value: '{}',
			like_count: null,
			repost_count: null,
			reply_count: null,
			reactor_sample: null,
			engagement_source: null,
			subject_uri_resolved: null,
			subject_collection: null,
			subject_kind: null,
			subject_created_at: null,
			subject_value: null,
			subject_like_count: null,
			subject_repost_count: null,
			subject_reply_count: null,
			subject_reactor_sample: null,
			subject_engagement_source: null
		};
		const item = hydrateRow(row);
		expect(item.subjectUri).toBe('at://did:plc:other/app.bsky.feed.post/gone');
		expect(item.subject).toBe(null);
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
pnpm test -- src/lib/server/feed.test.ts
```

Expected: 4 new tests FAIL (`hydrateRow is not exported`).

- [ ] **Step 3: Implement hydrateRow**

Append to `src/lib/server/feed.ts`:

```ts
type FeedRow = {
	uri: string;
	collection: string;
	kind: 'owned' | 'external';
	subject_uri: string | null;
	created_at: string;
	value: string | null;
	like_count: number | null;
	repost_count: number | null;
	reply_count: number | null;
	reactor_sample: string | null;
	engagement_source: string | null;
	subject_uri_resolved: string | null;
	subject_collection: string | null;
	subject_kind: 'owned' | 'external' | null;
	subject_created_at: string | null;
	subject_value: string | null;
	subject_like_count: number | null;
	subject_repost_count: number | null;
	subject_reply_count: number | null;
	subject_reactor_sample: string | null;
	subject_engagement_source: string | null;
};

function parseEngagement(
	likeCount: number | null,
	repostCount: number | null,
	replyCount: number | null,
	reactorSample: string | null,
	engagementSource: string | null
): EngagementSummary | undefined {
	if (engagementSource === null) return undefined;
	return {
		likeCount: likeCount ?? 0,
		repostCount: repostCount ?? 0,
		replyCount: replyCount ?? 0,
		reactorSample: reactorSample ? JSON.parse(reactorSample) : []
	};
}

function parseValue(raw: string | null): unknown {
	if (raw === null) return null;
	return JSON.parse(raw);
}

export function hydrateRow(row: FeedRow): FeedItem {
	const item: FeedItem = {
		uri: row.uri,
		collection: row.collection,
		kind: row.kind,
		subjectUri: row.subject_uri,
		createdAt: row.created_at,
		value: parseValue(row.value),
		engagement: parseEngagement(
			row.like_count,
			row.repost_count,
			row.reply_count,
			row.reactor_sample,
			row.engagement_source
		)
	};

	if (row.subject_uri) {
		if (row.subject_uri_resolved) {
			item.subject = {
				uri: row.subject_uri_resolved,
				collection: row.subject_collection!,
				kind: row.subject_kind!,
				subjectUri: null,
				createdAt: row.subject_created_at!,
				value: parseValue(row.subject_value),
				engagement: parseEngagement(
					row.subject_like_count,
					row.subject_repost_count,
					row.subject_reply_count,
					row.subject_reactor_sample,
					row.subject_engagement_source
				),
				subject: null
			};
		} else {
			item.subject = null; // referenced but not (yet) cached / deleted
		}
	}

	return item;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
pnpm test -- src/lib/server/feed.test.ts
```

Expected: 15 tests PASS (11 from Task 5 + 4 new).

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/feed.ts src/lib/server/feed.test.ts
git commit -m "backend: hydrateRow for FeedItem (engagement + subject self-join)"
```

---

## Task 7: getFeed integration

**Files:**
- Modify: `src/lib/server/feed.ts` (add `getFeed` + cursor encode for nextCursor)
- Modify: `src/lib/server/feed.test.ts` (add integration tests with in-memory DB)

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/server/feed.test.ts`:

```ts
import { openDatabase, runMigrations, type DB } from './db';
import { getFeed } from './feed';
import { decodeCursor } from './cursor';

function seed(db: DB, rows: Array<Partial<{
	uri: string;
	did: string;
	collection: string;
	rkey: string;
	cid: string;
	kind: 'owned' | 'external';
	status: 'pending' | 'ok';
	subject_uri: string | null;
	value: string | null;
	created_at: string;
	indexed_at: string;
}>>) {
	const stmt = db.prepare(
		`INSERT INTO records (uri, did, collection, rkey, cid, kind, status, subject_uri, value, created_at, indexed_at)
		 VALUES (?,?,?,?,?,?,?,?,?,?,?)`
	);
	for (const r of rows) {
		stmt.run(
			r.uri ?? `at://did:plc:abc/app.bsky.feed.post/${Math.random()}`,
			r.did ?? 'did:plc:abc',
			r.collection ?? 'app.bsky.feed.post',
			r.rkey ?? 'r',
			r.cid ?? 'bafy',
			r.kind ?? 'owned',
			r.status ?? 'ok',
			r.subject_uri ?? null,
			r.value ?? '{}',
			r.created_at ?? '2026-04-01T12:00:00.000Z',
			r.indexed_at ?? '2026-04-01T12:00:00.000Z'
		);
	}
}

describe('getFeed', () => {
	function setup(): DB {
		const db = openDatabase(':memory:');
		runMigrations(db);
		return db;
	}

	it('returns empty result against an empty cache', () => {
		const db = setup();
		const result = getFeed(db, {});
		expect(result.items).toEqual([]);
		expect(result.nextCursor).toBe(null);
	});

	it('returns rows in DESC order by default', () => {
		const db = setup();
		seed(db, [
			{ uri: 'at://x/y/a', created_at: '2026-04-01T00:00:00.000Z' },
			{ uri: 'at://x/y/b', created_at: '2026-04-02T00:00:00.000Z' },
			{ uri: 'at://x/y/c', created_at: '2026-04-03T00:00:00.000Z' }
		]);
		const result = getFeed(db, {});
		expect(result.items.map((i) => i.uri)).toEqual(['at://x/y/c', 'at://x/y/b', 'at://x/y/a']);
	});

	it('respects ASC order', () => {
		const db = setup();
		seed(db, [
			{ uri: 'at://x/y/a', created_at: '2026-04-01T00:00:00.000Z' },
			{ uri: 'at://x/y/b', created_at: '2026-04-02T00:00:00.000Z' }
		]);
		const result = getFeed(db, { order: 'asc' });
		expect(result.items.map((i) => i.uri)).toEqual(['at://x/y/a', 'at://x/y/b']);
	});

	it('filters by source', () => {
		const db = setup();
		seed(db, [
			{ uri: 'at://x/y/a', collection: 'app.bsky.feed.post' },
			{ uri: 'at://x/y/b', collection: 'app.bsky.feed.repost' },
			{ uri: 'at://x/y/c', collection: 'blog.pckt.entry' }
		]);
		const result = getFeed(db, { sources: ['bsky'] });
		const collections = result.items.map((i) => i.collection).sort();
		expect(collections).toEqual(['app.bsky.feed.post', 'app.bsky.feed.repost']);
	});

	it('excludes status="pending" rows', () => {
		const db = setup();
		seed(db, [
			{ uri: 'at://x/y/a', status: 'ok' },
			{ uri: 'at://x/y/b', status: 'pending' }
		]);
		const result = getFeed(db, {});
		expect(result.items.map((i) => i.uri)).toEqual(['at://x/y/a']);
	});

	it('paginates stably across cursor walks (DESC)', () => {
		const db = setup();
		const all = Array.from({ length: 7 }, (_, i) => ({
			uri: `at://x/y/${i}`,
			created_at: `2026-04-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`
		}));
		seed(db, all);

		const page1 = getFeed(db, { limit: 3 });
		expect(page1.items.length).toBe(3);
		expect(page1.nextCursor).not.toBe(null);

		const page2 = getFeed(db, {
			limit: 3,
			cursor: decodeCursor(page1.nextCursor!)
		});
		expect(page2.items.length).toBe(3);

		const page3 = getFeed(db, {
			limit: 3,
			cursor: decodeCursor(page2.nextCursor!)
		});
		expect(page3.items.length).toBe(1);
		expect(page3.nextCursor).toBe(null);

		// Combined uris must equal all uris (no dupes, no skips), reverse-chronological.
		const combined = [...page1.items, ...page2.items, ...page3.items].map((i) => i.uri);
		expect(combined).toEqual(all.map((r) => r.uri).reverse());
	});

	it('cursor walk remains stable when a newer row is inserted mid-walk', () => {
		const db = setup();
		const initial = Array.from({ length: 5 }, (_, i) => ({
			uri: `at://x/y/${i}`,
			created_at: `2026-04-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`
		}));
		seed(db, initial);

		const page1 = getFeed(db, { limit: 2 });
		// Insert a brand-new row that would slip into the front had we used offset.
		seed(db, [
			{
				uri: 'at://x/y/inserted',
				created_at: '2026-04-09T00:00:00.000Z'
			}
		]);
		const page2 = getFeed(db, { limit: 2, cursor: decodeCursor(page1.nextCursor!) });

		// The keyset cursor must skip past the inserted row's anchor — items in
		// page2 are strictly older than page1's last item.
		const lastTsPage1 = page1.items.at(-1)!.createdAt;
		for (const it of page2.items) {
			expect(it.createdAt < lastTsPage1).toBe(true);
		}
	});

	it('emits null nextCursor when fewer than `limit` rows remain', () => {
		const db = setup();
		seed(db, [{ uri: 'at://x/y/only' }]);
		const result = getFeed(db, { limit: 5 });
		expect(result.items.length).toBe(1);
		expect(result.nextCursor).toBe(null);
	});

	it('inlines a resolved subject for a repost', () => {
		const db = setup();
		seed(db, [
			{
				uri: 'at://did:plc:other/app.bsky.feed.post/orig',
				did: 'did:plc:other',
				collection: 'app.bsky.feed.post',
				kind: 'external',
				value: '{"text":"original"}',
				created_at: '2026-04-01T00:00:00.000Z'
			},
			{
				uri: 'at://did:plc:abc/app.bsky.feed.repost/r1',
				collection: 'app.bsky.feed.repost',
				kind: 'owned',
				subject_uri: 'at://did:plc:other/app.bsky.feed.post/orig',
				value: '{"subject":{"uri":"at://did:plc:other/app.bsky.feed.post/orig","cid":"bafy"}}',
				created_at: '2026-04-02T00:00:00.000Z'
			}
		]);
		const result = getFeed(db, {});
		const repost = result.items.find((i) => i.collection === 'app.bsky.feed.repost')!;
		expect(repost.subject).not.toBeNull();
		expect((repost.subject!.value as { text: string }).text).toBe('original');
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
pnpm test -- src/lib/server/feed.test.ts
```

Expected: 9 new tests FAIL — `getFeed` not exported.

- [ ] **Step 3: Implement getFeed**

Append to `src/lib/server/feed.ts`:

```ts
import type { DB } from './db';
import { encodeCursor } from './cursor';

export function getFeed(
	db: DB,
	filter: FeedFilter
): { items: FeedItem[]; nextCursor: string | null } {
	const { sql, params } = buildFeedQuery(filter);
	const rows = db.prepare(sql).all(...params) as FeedRow[];
	const items = rows.map(hydrateRow);

	const requested =
		typeof filter.limit === 'number' && filter.limit > 0
			? Math.min(filter.limit, MAX_LIMIT)
			: DEFAULT_LIMIT;

	let nextCursor: string | null = null;
	if (items.length === requested && items.length > 0) {
		const last = items.at(-1)!;
		nextCursor = encodeCursor({ ts: last.createdAt, uri: last.uri });
	}

	return { items, nextCursor };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
pnpm test -- src/lib/server/feed.test.ts
```

Expected: all 24 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/feed.ts src/lib/server/feed.test.ts
git commit -m "backend: getFeed end-to-end (in-memory SQLite integration tests)"
```

---

## Task 8: System snapshot

**Files:**
- Create: `src/lib/server/system.ts`
- Test: `src/lib/server/system.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/server/system.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { openDatabase, runMigrations } from './db';
import { getSystemSnapshot } from './system';

describe('getSystemSnapshot', () => {
	it('returns process metrics with sane shape', () => {
		const db = openDatabase(':memory:');
		runMigrations(db);
		const snap = getSystemSnapshot(db);

		expect(typeof snap.process.uptimeSec).toBe('number');
		expect(snap.process.uptimeSec).toBeGreaterThanOrEqual(0);
		expect(typeof snap.process.memRssMb).toBe('number');
		expect(snap.process.memRssMb).toBeGreaterThan(0);
		expect(snap.process.loadavg).toHaveLength(3);
	});

	it('reports firehose disconnected with no last seq when state is empty', () => {
		const db = openDatabase(':memory:');
		runMigrations(db);
		const snap = getSystemSnapshot(db);

		expect(snap.firehose.connected).toBe(false);
		expect(snap.firehose.lastSeq).toBe(null);
		expect(snap.firehose.lagSec).toBe(null);
	});

	it('reports a numeric lastSeq when state.firehose.last_seq is populated', () => {
		const db = openDatabase(':memory:');
		runMigrations(db);
		db.prepare(
			`INSERT INTO state (key, value, updated_at) VALUES (?, ?, ?)`
		).run('firehose.last_seq', '12345', '2026-04-01T00:00:00.000Z');

		const snap = getSystemSnapshot(db);
		expect(snap.firehose.lastSeq).toBe(12345);
	});

	it('reports DB row counts and pending count', () => {
		const db = openDatabase(':memory:');
		runMigrations(db);
		db.prepare(
			`INSERT INTO records (uri, did, collection, rkey, cid, kind, status, value, created_at, indexed_at)
			 VALUES (?,?,?,?,?,?,?,?,?,?)`
		).run('at://x/y/1', 'did:plc:abc', 'app.bsky.feed.post', '1', 'bafy', 'owned', 'ok', '{}', '2026-04-01', '2026-04-01');
		db.prepare(
			`INSERT INTO records (uri, did, collection, rkey, cid, kind, status, value, created_at, indexed_at)
			 VALUES (?,?,?,?,?,?,?,?,?,?)`
		).run('at://x/y/2', 'did:plc:abc', 'app.bsky.feed.post', '2', 'bafy', 'external', 'pending', null, '2026-04-01', '2026-04-01');

		const snap = getSystemSnapshot(db);
		expect(snap.db.records).toBe(2);
		expect(snap.db.pending).toBe(1);
	});

	it('exposes a buildSig of length 4', () => {
		const db = openDatabase(':memory:');
		runMigrations(db);
		const snap = getSystemSnapshot(db);
		expect(snap.buildSig).toHaveLength(4);
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
pnpm test -- src/lib/server/system.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write the system module**

Create `src/lib/server/system.ts`:

```ts
import os from 'node:os';
import type { DB } from './db';
import type { Source } from './config';

type Tier = 'recent' | 'week' | 'month' | 'archive';

export type CronTierStatus = {
	lastRunAt: string | null;
	failures: number;
};

export type SystemSnapshot = {
	process: {
		uptimeSec: number;
		memRssMb: number;
		loadavg: [number, number, number];
	};
	firehose: {
		connected: boolean;
		lastSeq: number | null;
		lagSec: number | null;
	};
	cron: Record<Tier, Record<Extract<Source, 'bsky' | 'grain'>, CronTierStatus>>;
	db: {
		records: number;
		engagement: number;
		pending: number;
		sizeBytes: number;
	};
	buildSig: string;
};

const TIERS: readonly Tier[] = ['recent', 'week', 'month', 'archive'];
const ENGAGEMENT_SOURCES: ReadonlyArray<'bsky' | 'grain'> = ['bsky', 'grain'];

function readState(db: DB, key: string): string | null {
	const row = db
		.prepare(`SELECT value FROM state WHERE key = ?`)
		.get(key) as { value: string } | undefined;
	return row?.value ?? null;
}

function emptyCronStatus(): SystemSnapshot['cron'] {
	const out = {} as SystemSnapshot['cron'];
	for (const t of TIERS) {
		out[t] = {} as SystemSnapshot['cron'][Tier];
		for (const s of ENGAGEMENT_SOURCES) {
			out[t][s] = { lastRunAt: null, failures: 0 };
		}
	}
	return out;
}

function readCronStatus(db: DB): SystemSnapshot['cron'] {
	const out = emptyCronStatus();
	for (const t of TIERS) {
		for (const s of ENGAGEMENT_SOURCES) {
			out[t][s] = {
				lastRunAt: readState(db, `cron.${t}.${s}.last_run`),
				failures: Number(readState(db, `cron.${s}.failures`) ?? 0)
			};
		}
	}
	return out;
}

declare const __BUILD_SHA__: string;

export function getSystemSnapshot(db: DB): SystemSnapshot {
	const lastSeqRaw = readState(db, 'firehose.last_seq');
	const lastSeq = lastSeqRaw !== null ? Number(lastSeqRaw) : null;

	const counts = db
		.prepare(
			`SELECT
			  (SELECT COUNT(*) FROM records)                       AS records,
			  (SELECT COUNT(*) FROM engagement)                    AS engagement,
			  (SELECT COUNT(*) FROM records WHERE status='pending') AS pending`
		)
		.get() as { records: number; engagement: number; pending: number };

	const pageSizeRow = db.pragma('page_size', { simple: true }) as number;
	const pageCountRow = db.pragma('page_count', { simple: true }) as number;
	const sizeBytes = pageSizeRow * pageCountRow;

	const memRssMb = process.memoryUsage().rss / (1024 * 1024);
	const [l1, l5, l15] = os.loadavg();

	return {
		process: {
			uptimeSec: process.uptime(),
			memRssMb,
			loadavg: [l1, l5, l15]
		},
		firehose: {
			connected: false, // Plan 2 makes this dynamic.
			lastSeq,
			lagSec: null
		},
		cron: readCronStatus(db),
		db: {
			records: counts.records,
			engagement: counts.engagement,
			pending: counts.pending,
			sizeBytes
		},
		// `__BUILD_SHA__` is defined by vite.config.ts and inlined at build time.
		// Same source as the existing chrome.system.sig — we relocate it here
		// so the system snapshot owns the field going forward.
		buildSig: __BUILD_SHA__.toUpperCase().slice(0, 4)
	};
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
pnpm test -- src/lib/server/system.test.ts
```

Expected: 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/system.ts src/lib/server/system.test.ts
git commit -m "backend: getSystemSnapshot (process + db + cron status)"
```

---

## Task 9: AtpClient wrapper

**Files:**
- Create: `src/lib/server/atp-client.ts`

This task has no tests — `atp-client.ts` is a thin factory wrapping `@atcute/client`. The interface is exercised in Task 10's tests via a mock; Task 14's smoke test exercises the real implementation. We avoid mocking `fetch` here because it adds noise without catching anything `@atcute/client`'s own tests don't already catch.

- [ ] **Step 1: Write the wrapper**

Create `src/lib/server/atp-client.ts`:

```ts
import { Client, simpleFetchHandler } from '@atcute/client';
import type {} from '@atcute/atproto';
import type {} from '@atcute/bluesky';

export type ListRecordsResult = {
	records: Array<{
		uri: string;
		cid: string;
		value: Record<string, unknown>;
	}>;
	cursor: string | null;
};

export interface AtpClient {
	listRecords(args: {
		repo: string;
		collection: string;
		cursor?: string;
		limit?: number;
	}): Promise<ListRecordsResult>;
	resolveHandle(handle: string): Promise<{ did: string }>;
}

export function createAtpClient(service: string): AtpClient {
	const rpc = new Client({ handler: simpleFetchHandler({ service }) });

	return {
		async listRecords({ repo, collection, cursor, limit }) {
			const response = await rpc.get('com.atproto.repo.listRecords', {
				params: { repo, collection, cursor, limit: limit ?? 100 }
			});
			if (!response.ok) {
				throw new Error(
					`listRecords failed: ${response.data.error}: ${response.data.message ?? ''}`
				);
			}
			return {
				records: response.data.records.map((r) => ({
					uri: r.uri,
					cid: r.cid,
					value: r.value as Record<string, unknown>
				})),
				cursor: response.data.cursor ?? null
			};
		},

		async resolveHandle(handle) {
			const response = await rpc.get('com.atproto.identity.resolveHandle', {
				params: { handle }
			});
			if (!response.ok) {
				throw new Error(
					`resolveHandle failed: ${response.data.error}: ${response.data.message ?? ''}`
				);
			}
			return { did: response.data.did };
		}
	};
}
```

- [ ] **Step 2: Verify the file type-checks**

Run:
```bash
pnpm check
```

Expected: 0 errors related to `src/lib/server/atp-client.ts`. (Pre-existing errors in the project are out of scope.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/server/atp-client.ts
git commit -m "backend: AtpClient wrapper (listRecords + resolveHandle)"
```

---

## Task 10: Backfill — listRecords sweep

**Files:**
- Create: `src/lib/server/backfill.ts`
- Test: `src/lib/server/backfill.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/server/backfill.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { openDatabase, runMigrations } from './db';
import { runBackfill } from './backfill';
import type { AtpClient, ListRecordsResult } from './atp-client';

function makeMockClient(
	pages: Record<string, ListRecordsResult[]>
): AtpClient {
	const cursors: Record<string, number> = {};
	return {
		async listRecords({ collection, cursor }) {
			const list = pages[collection] ?? [];
			if (list.length === 0) return { records: [], cursor: null };
			// Find the page index given the cursor (we use page index as cursor).
			let idx = 0;
			if (cursor !== undefined) idx = Number(cursor);
			cursors[collection] = idx;
			const page = list[idx] ?? { records: [], cursor: null };
			return page;
		},
		async resolveHandle() {
			throw new Error('not used');
		}
	};
}

describe('runBackfill', () => {
	const did = 'did:plc:abc';

	it('inserts records from a single-page listRecords response', async () => {
		const db = openDatabase(':memory:');
		runMigrations(db);

		const client = makeMockClient({
			'app.bsky.feed.post': [
				{
					records: [
						{
							uri: `at://${did}/app.bsky.feed.post/1`,
							cid: 'bafy1',
							value: {
								$type: 'app.bsky.feed.post',
								text: 'one',
								createdAt: '2026-04-01T00:00:00.000Z'
							}
						},
						{
							uri: `at://${did}/app.bsky.feed.post/2`,
							cid: 'bafy2',
							value: {
								$type: 'app.bsky.feed.post',
								text: 'two',
								createdAt: '2026-04-02T00:00:00.000Z'
							}
						}
					],
					cursor: null
				}
			],
			'app.bsky.feed.repost': [{ records: [], cursor: null }]
		});

		const result = await runBackfill(db, client, did);

		expect(result.totalInserted).toBe(2);
		const rows = db
			.prepare(`SELECT uri, kind, status, did, collection FROM records ORDER BY uri`)
			.all() as Array<{
				uri: string;
				kind: string;
				status: string;
				did: string;
				collection: string;
			}>;
		expect(rows.length).toBe(2);
		expect(rows[0].kind).toBe('owned');
		expect(rows[0].status).toBe('ok');
		expect(rows[0].did).toBe(did);
		expect(rows[0].collection).toBe('app.bsky.feed.post');
	});

	it('paginates until cursor is null', async () => {
		const db = openDatabase(':memory:');
		runMigrations(db);

		const client = makeMockClient({
			'app.bsky.feed.post': [
				{
					records: [
						{
							uri: `at://${did}/app.bsky.feed.post/1`,
							cid: 'bafy',
							value: { $type: 'app.bsky.feed.post', createdAt: '2026-04-01' }
						}
					],
					cursor: '1'
				},
				{
					records: [
						{
							uri: `at://${did}/app.bsky.feed.post/2`,
							cid: 'bafy',
							value: { $type: 'app.bsky.feed.post', createdAt: '2026-04-02' }
						}
					],
					cursor: '2'
				},
				{
					records: [
						{
							uri: `at://${did}/app.bsky.feed.post/3`,
							cid: 'bafy',
							value: { $type: 'app.bsky.feed.post', createdAt: '2026-04-03' }
						}
					],
					cursor: null
				}
			],
			'app.bsky.feed.repost': [{ records: [], cursor: null }]
		});

		const result = await runBackfill(db, client, did);
		expect(result.totalInserted).toBe(3);
	});

	it('extracts createdAt from record.value when present', async () => {
		const db = openDatabase(':memory:');
		runMigrations(db);
		const client = makeMockClient({
			'app.bsky.feed.post': [
				{
					records: [
						{
							uri: `at://${did}/app.bsky.feed.post/1`,
							cid: 'bafy',
							value: {
								$type: 'app.bsky.feed.post',
								text: 'hi',
								createdAt: '2026-04-15T08:30:00.000Z'
							}
						}
					],
					cursor: null
				}
			],
			'app.bsky.feed.repost': [{ records: [], cursor: null }]
		});
		await runBackfill(db, client, did);
		const row = db
			.prepare(`SELECT created_at FROM records`)
			.get() as { created_at: string };
		expect(row.created_at).toBe('2026-04-15T08:30:00.000Z');
	});

	it('falls back to indexed_at as created_at if record.value.createdAt is missing', async () => {
		const db = openDatabase(':memory:');
		runMigrations(db);
		const client = makeMockClient({
			'app.bsky.feed.post': [
				{
					records: [
						{
							uri: `at://${did}/app.bsky.feed.post/1`,
							cid: 'bafy',
							value: { $type: 'app.bsky.feed.post', text: 'hi' } // no createdAt
						}
					],
					cursor: null
				}
			],
			'app.bsky.feed.repost': [{ records: [], cursor: null }]
		});
		await runBackfill(db, client, did);
		const row = db
			.prepare(`SELECT created_at, indexed_at FROM records`)
			.get() as { created_at: string; indexed_at: string };
		expect(row.created_at).toBe(row.indexed_at);
	});

	it('is idempotent — running twice yields the same row count', async () => {
		const db = openDatabase(':memory:');
		runMigrations(db);
		const client = makeMockClient({
			'app.bsky.feed.post': [
				{
					records: [
						{
							uri: `at://${did}/app.bsky.feed.post/1`,
							cid: 'bafy',
							value: { $type: 'app.bsky.feed.post', createdAt: '2026-04-01' }
						}
					],
					cursor: null
				}
			],
			'app.bsky.feed.repost': [{ records: [], cursor: null }]
		});
		await runBackfill(db, client, did);
		await runBackfill(db, client, did);
		const count = db.prepare(`SELECT COUNT(*) as n FROM records`).get() as { n: number };
		expect(count.n).toBe(1);
	});

	it('writes to records.kind = "owned"', async () => {
		const db = openDatabase(':memory:');
		runMigrations(db);
		const client = makeMockClient({
			'app.bsky.feed.post': [
				{
					records: [
						{
							uri: `at://${did}/app.bsky.feed.post/1`,
							cid: 'bafy',
							value: { createdAt: '2026-04-01' }
						}
					],
					cursor: null
				}
			],
			'app.bsky.feed.repost': [{ records: [], cursor: null }]
		});
		await runBackfill(db, client, did);
		const row = db.prepare(`SELECT kind FROM records`).get() as { kind: string };
		expect(row.kind).toBe('owned');
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
pnpm test -- src/lib/server/backfill.test.ts
```

Expected: FAIL — `backfill` module not found.

- [ ] **Step 3: Implement runBackfill**

Create `src/lib/server/backfill.ts`:

```ts
import type { DB } from './db';
import type { AtpClient } from './atp-client';
import { WATCHED_COLLECTIONS } from './config';

export type BackfillResult = {
	totalInserted: number;
	byCollection: Record<string, number>;
};

const PAGE_SIZE = 100;

export async function runBackfill(
	db: DB,
	client: AtpClient,
	did: string
): Promise<BackfillResult> {
	const upsert = db.prepare(
		`INSERT INTO records
		   (uri, did, collection, rkey, cid, kind, status, subject_uri, value, created_at, indexed_at)
		 VALUES (?, ?, ?, ?, ?, 'owned', 'ok', ?, ?, ?, ?)
		 ON CONFLICT (uri) DO UPDATE SET
		   cid = excluded.cid,
		   value = excluded.value,
		   subject_uri = excluded.subject_uri,
		   indexed_at = excluded.indexed_at`
	);

	const result: BackfillResult = { totalInserted: 0, byCollection: {} };

	for (const collection of WATCHED_COLLECTIONS) {
		result.byCollection[collection] = 0;
		let cursor: string | undefined = undefined;

		while (true) {
			const page = await client.listRecords({
				repo: did,
				collection,
				cursor,
				limit: PAGE_SIZE
			});

			const now = new Date().toISOString();
			const insertMany = db.transaction((records: typeof page.records) => {
				for (const r of records) {
					const rkey = r.uri.split('/').at(-1) ?? '';
					const value = r.value;
					const createdAt =
						typeof value.createdAt === 'string' ? value.createdAt : now;
					const subjectUri = extractSubjectUri(value);
					upsert.run(
						r.uri,
						did,
						collection,
						rkey,
						r.cid,
						subjectUri,
						JSON.stringify(value),
						createdAt,
						now
					);
				}
			});
			insertMany(page.records);

			result.byCollection[collection] += page.records.length;
			result.totalInserted += page.records.length;

			if (!page.cursor) break;
			cursor = page.cursor;
		}
	}

	return result;
}

function extractSubjectUri(value: Record<string, unknown>): string | null {
	// app.bsky.feed.repost: { subject: { uri, cid } }
	const subject = value.subject as { uri?: unknown } | undefined;
	if (subject && typeof subject.uri === 'string') return subject.uri;

	// app.bsky.feed.post with quote-style embed:
	//   embed.$type = 'app.bsky.embed.record',          embed.record = { uri }
	//   embed.$type = 'app.bsky.embed.recordWithMedia', embed.record.record = { uri }
	const embed = value.embed as
		| {
				$type?: unknown;
				record?: { uri?: unknown; record?: { uri?: unknown } };
		  }
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

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
pnpm test -- src/lib/server/backfill.test.ts
```

Expected: 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/backfill.ts src/lib/server/backfill.test.ts
git commit -m "backend: runBackfill (listRecords sweep + subject_uri extraction)"
```

---

## Task 11: Backfill CLI script

**Files:**
- Create: `scripts/backfill.ts`

This task has no automated tests — it's an executable wiring up real env + real PDS. It's exercised manually in Task 14.

- [ ] **Step 1: Write the CLI**

Create `scripts/backfill.ts`:

```ts
#!/usr/bin/env -S node --import=tsx
import { openDatabase, runMigrations } from '../src/lib/server/db.ts';
import { createAtpClient } from '../src/lib/server/atp-client.ts';
import { runBackfill } from '../src/lib/server/backfill.ts';
import { getOwnerDid } from '../src/lib/server/config.ts';

async function main() {
	const dbPath = process.env.PROTO_DB_PATH ?? './data/proto.sqlite';
	const pdsHost = process.env.PUBLIC_PDS_HOST ?? 'pds.proto.cool';
	const handle = process.env.PUBLIC_OWNER_HANDLE ?? 'protocol7';

	const db = openDatabase(dbPath);
	runMigrations(db);

	const client = createAtpClient(`https://${pdsHost}`);

	let did = getOwnerDid();
	if (!did) {
		console.log(`PROTO_OWNER_DID unset — resolving ${handle} via ${pdsHost}…`);
		const resolved = await client.resolveHandle(handle);
		did = resolved.did;
		console.log(`Resolved → ${did}`);
	}

	console.log(`Backfilling repo ${did} from https://${pdsHost}…`);
	const t0 = Date.now();
	const result = await runBackfill(db, client, did);
	const dtMs = Date.now() - t0;

	console.log(`Done in ${dtMs}ms — ${result.totalInserted} records`);
	for (const [collection, count] of Object.entries(result.byCollection)) {
		console.log(`  ${collection}: ${count}`);
	}

	db.close();
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
```

- [ ] **Step 2: Verify the script is invokable**

Run (with `--help`-equivalent dry check, no network call yet):
```bash
node --import=tsx -e "import('./scripts/backfill.ts').then(() => {}).catch(e => { console.error('parse error:', e.message); process.exit(1); })" 2>&1 | head -3
```

Expected: no parse errors. (The script will start running `main()` due to the side effect; it will fail at the network step if you don't have a `data/` dir or the PDS is unreachable. That's fine for this verification — we only care that the imports/types resolve.)

- [ ] **Step 3: Commit**

```bash
git add scripts/backfill.ts
git commit -m "scripts: backfill CLI — resolve DID + sweep listRecords"
```

---

## Task 12: SvelteKit wiring — `+page.server.ts` + `+layout.server.ts` + `app.d.ts`

**Files:**
- Create: `src/routes/+page.server.ts`
- Modify: `src/routes/+layout.server.ts`
- Modify: `src/app.d.ts`

- [ ] **Step 1: Update `src/app.d.ts` with the new PageData shape**

Replace the contents of `src/app.d.ts`:

```ts
/// <reference types="@atcute/atproto" />
/// <reference types="@atcute/bluesky" />

import type { ThemeId, Mode } from '$lib/theme/registry';
import type { ChromeData } from '$lib/shell/chrome';
import type { SystemSnapshot } from '$lib/server/system';
import type { FeedItem } from '$lib/server/feed';

declare global {
	namespace App {
		interface Locals {
			theme: ThemeId;
			mode: Mode;
		}
		interface PageData {
			theme: ThemeId;
			mode: Mode;
			chrome: ChromeData;
			system?: SystemSnapshot;
			feed?: {
				items: FeedItem[];
				nextCursor: string | null;
			};
		}
	}

	const __BUILD_VERSION__: string;
	const __BUILD_SHA__: string;
	const __SVELTE_VERSION__: string;
	const __SVELTEKIT_VERSION__: string;
}

export {};
```

- [ ] **Step 2: Modify `+layout.server.ts` to expose the system snapshot**

Replace the contents of `src/routes/+layout.server.ts`:

```ts
import type { LayoutServerLoad } from './$types';
import { resolveChromeData } from '$lib/shell/chrome';
import { openDatabase, runMigrations } from '$lib/server/db';
import { getSystemSnapshot } from '$lib/server/system';

const dbPath = process.env.PROTO_DB_PATH ?? './data/proto.sqlite';
const db = openDatabase(dbPath);
runMigrations(db);

export const load: LayoutServerLoad = ({ locals }) => ({
	theme: locals.theme,
	mode: locals.mode,
	chrome: resolveChromeData(),
	system: getSystemSnapshot(db)
});
```

The `db` constant is created once at module-load time and reused across requests — module-level singletons are how you cache process-wide state in SvelteKit server modules. The same `db` will be reused by `+page.server.ts` via the same pattern.

- [ ] **Step 3: Create `+page.server.ts`**

Create `src/routes/+page.server.ts`:

```ts
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { z } from 'zod';
import { openDatabase, runMigrations } from '$lib/server/db';
import { getFeed, type FeedFilter } from '$lib/server/feed';
import { decodeCursor } from '$lib/server/cursor';

const dbPath = process.env.PROTO_DB_PATH ?? './data/proto.sqlite';
const db = openDatabase(dbPath);
runMigrations(db);

const SourceSchema = z.enum(['bsky', 'pckt', 'standard', 'grain']);
const OrderSchema = z.enum(['asc', 'desc']);

const QuerySchema = z.object({
	source: z.array(SourceSchema).optional(),
	from: z.string().datetime().optional(),
	to: z.string().datetime().optional(),
	cursor: z.string().min(1).optional(),
	limit: z.coerce.number().int().positive().max(50).optional(),
	order: OrderSchema.optional()
});

export const load: PageServerLoad = ({ url }) => {
	const raw = {
		source: url.searchParams.getAll('source'),
		from: url.searchParams.get('from') ?? undefined,
		to: url.searchParams.get('to') ?? undefined,
		cursor: url.searchParams.get('cursor') ?? undefined,
		limit: url.searchParams.get('limit') ?? undefined,
		order: url.searchParams.get('order') ?? undefined
	};
	// `source` may be [] when no source params present — treat as omitted.
	const normalized = {
		...raw,
		source: raw.source.length > 0 ? raw.source : undefined
	};

	const parsed = QuerySchema.safeParse(normalized);
	if (!parsed.success) {
		throw error(400, parsed.error.message);
	}

	const filter: FeedFilter = {
		sources: parsed.data.source,
		from: parsed.data.from,
		to: parsed.data.to,
		limit: parsed.data.limit,
		order: parsed.data.order
	};

	if (parsed.data.cursor) {
		try {
			filter.cursor = decodeCursor(parsed.data.cursor);
		} catch {
			throw error(400, 'invalid cursor');
		}
	}

	return { feed: getFeed(db, filter) };
};
```

- [ ] **Step 4: Verify type-check still passes**

Run:
```bash
pnpm check
```

Expected: 0 errors in the new files. Pre-existing errors elsewhere are out of scope.

- [ ] **Step 5: Run all tests to verify nothing broke**

Run:
```bash
pnpm test
```

Expected: all tests pass (tests from Tasks 2, 3, 4, 5, 6, 7, 8, 10).

- [ ] **Step 6: Commit**

```bash
git add src/app.d.ts src/routes/+layout.server.ts src/routes/+page.server.ts
git commit -m "backend: wire getFeed + getSystemSnapshot into SvelteKit loaders"
```

---

## Task 13: Migrate StatsPanel `build hex` to `data.system.buildSig`

**Files:**
- Modify: `src/lib/shell/StatsPanel.svelte`

The `build hex` block currently reads `chrome.system.sig`. Per the spec, it now reads from `data.system.buildSig` so the system snapshot owns the field going forward (and other greebles can pick up real runtime values from the same surface).

- [ ] **Step 1: Read the current StatsPanel header**

Read `src/lib/shell/StatsPanel.svelte` (focus on the imports + script section, plus the line containing `build-hex`).

- [ ] **Step 2: Add the `system` prop and use it in the build-hex span**

Modify the script block at the top of `src/lib/shell/StatsPanel.svelte`. Replace:

```svelte
<script lang="ts">
	import { getContext } from 'svelte';
	import type { ChromeData } from './chrome';
	import { clock, stardate } from './runtime';

	const chrome = getContext<ChromeData>('chrome');
```

with:

```svelte
<script lang="ts">
	import { getContext } from 'svelte';
	import type { ChromeData } from './chrome';
	import type { SystemSnapshot } from '$lib/server/system';
	import { clock, stardate } from './runtime';

	const chrome = getContext<ChromeData>('chrome');
	const system = getContext<SystemSnapshot | undefined>('system');
```

Then, in the same file, replace the `build hex` segment:

```svelte
		<span class="seg"
			><span class="k">build</span><span class="v build-hex"
				>0x{chrome.system.sig.toUpperCase().slice(0, 4)}</span
			></span
		>
```

with:

```svelte
		<span class="seg"
			><span class="k">build</span><span class="v build-hex"
				>0x{system?.buildSig ?? chrome.system.sig.toUpperCase().slice(0, 4)}</span
			></span
		>
```

The `?? chrome.system.sig…` fallback covers the case where the layout has not (yet) provided the system snapshot — e.g., in tests that mount StatsPanel in isolation.

- [ ] **Step 3: Provide `system` via context from the layout**

Modify `src/routes/+layout.svelte`. Add to the `<script>` block (preserving existing imports):

```svelte
<script lang="ts">
	import { setContext } from 'svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: () => unknown } = $props();

	setContext('chrome', data.chrome);
	setContext('system', data.system);
</script>
```

If `+layout.svelte` already calls `setContext('chrome', data.chrome)`, only add the `setContext('system', data.system)` line. Read the file first to confirm the current shape — only the `system` line is new.

- [ ] **Step 4: Verify type-check + tests still pass**

Run in parallel:
```bash
pnpm check
pnpm test
```

Expected: type-check clean for new/modified files; all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/shell/StatsPanel.svelte src/routes/+layout.svelte
git commit -m "shell: stats build-hex reads from data.system.buildSig"
```

---

## Task 14: End-to-end smoke verification

This is a manual step — there's no automated E2E in this plan. The point is to confirm the cache + read path actually serves a real feed against the operator's PDS.

- [ ] **Step 1: Pick an env**

Set up a `.env` (copy from `.env.example`) with at minimum:

```
PUBLIC_OWNER_HANDLE=protocol7
PUBLIC_HOST_LABEL=helios
PUBLIC_PDS_HOST=pds.proto.cool
```

(Leave `PROTO_OWNER_DID` and `PROTO_DB_PATH` unset to use defaults.)

- [ ] **Step 2: Run the backfill against the live PDS**

Run:
```bash
pnpm backfill
```

Expected output (illustrative — counts vary):
```
PROTO_OWNER_DID unset — resolving protocol7 via pds.proto.cool…
Resolved → did:plc:xxxxxxxxxxxxxxxxxxxxxxxx
Backfilling repo did:plc:xxxxxxxxxxxxxxxxxxxxxxxx from https://pds.proto.cool…
Done in 1234ms — 87 records
  app.bsky.feed.post: 71
  app.bsky.feed.repost: 16
```

If this fails: verify `pds.proto.cool` is reachable and that `PUBLIC_OWNER_HANDLE` is correct. The cache file is at `./data/proto.sqlite` and is safe to delete and retry.

- [ ] **Step 3: Inspect the SQLite file directly**

Run:
```bash
sqlite3 ./data/proto.sqlite "SELECT collection, COUNT(*) FROM records GROUP BY collection;"
```

Expected: counts matching the backfill summary.

- [ ] **Step 4: Run the dev server and load the home page**

Run (do not use `&` — leave it foreground; use a separate terminal for verification):
```bash
pnpm dev
```

In another terminal:
```bash
curl -s http://localhost:5173/__data.json?x-sveltekit-invalidated=01 | head -c 2000
```

Expected: JSON containing a `feed.items` array with at least the URI of one record from the backfill, and `system.process.uptimeSec` as a positive number.

Then open `http://localhost:5173` in a browser and confirm:
- The `build hex` value in the stats panel matches `__BUILD_SHA__.slice(0, 4).toUpperCase()` (it's the same source as before, just routed through the system snapshot).
- The page renders without server errors.

- [ ] **Step 5: Confirm and document**

If everything looks good, this plan is complete. If anything is wrong, file the failing case as a note, fix it, and re-run from Step 2.

No commit for this task — this is verification, not change.

---

## Self-review notes

Coverage check against the spec sections:

| Spec section | Tasks |
| --- | --- |
| Schema | 2 |
| Read API surface (FeedFilter, FeedItem, EngagementSummary, getFeed, cursor codec) | 4, 5, 6, 7 |
| System metrics surface | 8 |
| Pipeline 3 (Read) request path | 12 |
| Bootstrap module's listRecords sweep branch | 9, 10, 11 |
| Watched-collections / source mapping | 3 |
| StatsPanel migration | 13 |
| Schema notes (raw JSON value, ISO created_at, hard delete cascade) | 2 (cascade test); 10 (raw value insert) |
| Validation boundary (URL filter parameters in loader) | 12 (zod schema in `+page.server.ts`) |

Out of scope for this plan (next plan): Pipelines 1 & 2, AppView adapters, scheduler tier logic, per-source breaker, auto-bootstrap of firehose + scheduler.
