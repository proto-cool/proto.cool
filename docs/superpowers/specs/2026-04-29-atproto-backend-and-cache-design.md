# atproto backend + persistent cache — design

## Goal

Stand up the data layer for proto.cool's content feed: ingest the
operator's atproto records (across multiple lexicons / source apps)
in real time, periodically refresh third-party engagement metadata,
and serve a filterable, sortable, cursor-paginated feed entirely
from a local persistent cache. No request-time fan-out to PDS or
AppView. Survives reboots without losing state.

A small companion subsystem collects real process / worker metrics
so the technical greeble in the shell (StatsPanel, etc.) can render
actual server values instead of static placeholders.

## Scope of "the feed"

The home feed is a unified stream of records authored by the
operator across several atproto-flavored apps:

| Source        | Lexicon (NSID)                       | Kind     | Engagement |
| ------------- | ------------------------------------ | -------- | ---------- |
| Bluesky       | `app.bsky.feed.post`                 | social   | yes (bsky AppView) |
| Bluesky       | `app.bsky.feed.repost`               | social   | yes (target's engagement) |
| Grain         | `(grain image record NSID — TBD at impl time)` | image | yes (grain AppView) |
| pckt.blog     | `(pckt longform NSID — TBD at impl time)` | longform | no |
| standard.site | `(standard longform NSID — TBD at impl time)` | longform | no |

Specific NSIDs for grain / pckt / standard are deferred to
implementation; they're config, not architecture. The watched
collection list is a small constant in code/env.

**Filter dimensions (v1):** source, date range.
**Sort dimensions (v1):** record `createdAt` ascending or descending.
**Pagination (v1):** keyset / cursor (opaque base64url of
`{ts, uri}`), default limit 20, hard cap 50.

**Excluded from v1 (explicitly):**

- Free-text search (FTS5). The added query-syntax surface, write-time
  index cost, and unproven user need don't justify it for v1.
- Replies (`app.bsky.feed.post` records with a non-null `reply` field).
  The home feed is curated content, not an activity log. Mirrors
  bsky.app's default "Posts" tab.
- Tags, "most-liked" sort, random sort, "has engagement" filter.
- Comment threads on blog posts. (pckt's commenting is itself a
  bsky-backlink convention; revisitable as a future feature where we
  query bsky for posts mentioning a blog URL.)
- Thread / reply / like UI on the site. The atproto social layer
  lives at bsky.app / grain.social — clicking a social card on
  proto.cool links *out* to the source platform. Longform records
  (pckt, standard) are rendered fully on proto.cool.

## Reposts and quote posts

Reposts (`app.bsky.feed.repost`) and quote posts (an
`app.bsky.feed.post` whose embed is `app.bsky.embed.record` or
`app.bsky.embed.recordWithMedia`) reference at:// URIs the operator
does *not* own. To match bsky.app's "Posts" view, both are surfaced
in the feed with the referenced post inlined.

Mechanism: a single "external records" enrichment path. When the
firehose ingests:

- An `app.bsky.feed.repost` → enqueue `record.subject.uri` for
  enrichment.
- An `app.bsky.feed.post` with an embed containing a record reference
  → enqueue the embedded URI for enrichment.

Both produce a `records` row with `kind='external'` and
`status='pending'`. An enrichment task fetches the missing content
via `app.bsky.feed.getPosts`, fills the row, and the row joins the
engagement-refresh tiers. From the read path's perspective, external
rows are queryable just like owned rows (gated by `status='ok'`).

A single `subject_uri` column on `records` is enough — repost
records and quote-post records each reference at most one external
URI. Future quote-of-a-quote or multi-record embeds would extend to
a join table; YAGNI for v1.

## Architecture

Five subsystems, all in the same Node process as the SvelteKit
server (adapter-node). Background workers gated on
`NODE_ENV === 'production' || PROTO_BACKGROUND === '1'` so
`vite dev` doesn't connect a live firehose by default.

1. **Cache** — SQLite (single file, WAL mode), accessed via
   `better-sqlite3` in-process. Two domain tables (`records`,
   `engagement`) plus a tiny `state` k/v table for cursors and
   scheduler bookkeeping. Keyed throughout by at:// URI.
2. **Firehose consumer** — long-running websocket against
   `pds.proto.cool`'s `com.atproto.sync.subscribeRepos`, filtered to
   `repo === ownDid && collection ∈ watched`. Drives writes into
   `records`. Persists `firehose.last_seq` after every applied commit.
3. **Engagement scheduler** — single `setInterval(60_000)` tick that
   selects records due for refresh per their age tier, batches by
   source, dispatches to the per-source AppView adapter, and writes
   into `engagement`. Same scheduler runs the external-record
   enrichment task.
4. **AppView adapters** — one per *social* source (`bsky`, `grain`,
   …). Each implements
   `fetchEngagement(uris: string[]) → EngagementRow[]` and (for
   sources that have it) `fetchRecords(uris: string[]) → RecordRow[]`.
   Adding a new social source = adding a new adapter file. Longform
   sources (pckt, standard) need no adapter — record-only.
5. **System metrics** — `getSystemSnapshot()` returns a cheap
   snapshot of process + worker state for use by the layout loader.

### Boundaries

- The firehose consumer **never calls AppViews**.
- The scheduler **never reads the firehose**.
- The read path (SvelteKit loaders) **never writes**, **never calls
  PDS**, **never calls AppView** — every page render is a pure
  cache read.

These three facts together mean: the site keeps serving fast and
correctly even if the firehose drops, an AppView is degraded, or
both. Visitors see slightly stale data; never errors.

## Data flow

### Pipeline 1 — Firehose ingest (real-time)

```
pds.proto.cool
  └─ subscribeRepos (websocket, cursor=state.firehose.last_seq)
        ↓
   FirehoseConsumer
        ├─ filter: repo === ownDid && collection ∈ watched
        ├─ on commit op:
        │     · create / update                → upsert records.kind='owned'
        │     · delete                         → DELETE FROM records WHERE uri=?
        │                                        (engagement cascades)
        │     · if collection = app.bsky.feed.repost
        │           → upsert pending external row keyed by record.subject.uri
        │     · if collection = app.bsky.feed.post and embed references a record
        │           → upsert pending external row keyed by embedded uri
        └─ persist state.firehose.last_seq after every applied commit
```

### Pipeline 2 — Engagement refresh + external enrichment (scheduled)

```
setInterval(60_000)
  ↓
EngagementScheduler.tick()  (single in-flight; isRunning guard)
  ├─ phase A: external enrichment (bsky only — reposts and quote
  │           embeds both reference app.bsky.feed.post URIs)
  │     SELECT uri FROM records WHERE kind='external' AND status='pending'
  │     bskyAdapter.fetchRecords(uris)
  │     UPDATE records SET value=?, created_at=?, status='ok'
  │     on 404: DELETE FROM records WHERE uri=? (cascade)
  │
  └─ phase B: engagement refresh by age tier
        for each (tier, source):
          SELECT uri FROM records r
            LEFT JOIN engagement e ON e.uri = r.uri
            WHERE r.status='ok'
              AND tierForAge(r.created_at) = tier
              AND tierSource(r.collection)  = source
              AND ( e.last_refreshed_at IS NULL
                 OR isDueForRefresh(tier, e.last_refreshed_at, now) )
          adapter.fetchEngagement(uris) → batched AppView call
          UPSERT engagement
          UPDATE state.cron.<tier>.<source>.last_run = now
```

Tier cadence:

| Tier      | Age range  | Refresh interval |
| --------- | ---------- | ---------------- |
| recent    | < 24h      | 1h               |
| week      | 1–7d       | 6h               |
| month     | 7–30d      | 24h              |
| archive   | > 30d      | 7d               |

### Pipeline 3 — Read (request path)

```
SvelteKit loader
  ├─ parse FeedFilter from URL (sources[], from, to, cursor, limit, order)
  ├─ build keyset SELECT against records LEFT JOIN engagement
  │     WHERE records.status = 'ok'
  │       AND records.collection IN (...for sources...)
  │       AND records.created_at BETWEEN from AND to
  │       AND keyset predicate from cursor
  │     ORDER BY records.created_at <order>, records.uri <order>
  │     LIMIT min(limit, 50)
  ├─ self-join records ON r2.uri = r1.subject_uri to inline subject
  ├─ hydrate rows → FeedItem[]
  ├─ emit nextCursor from the last row
  └─ return { items, nextCursor }
```

The loader never calls upstreams. If the cache is empty for a given
filter, the response is `{ items: [], nextCursor: null }` — never an
error.

## Schema

```sql
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA foreign_keys = ON;

CREATE TABLE records (
  uri          TEXT PRIMARY KEY,           -- at:// URI
  did          TEXT NOT NULL,
  collection   TEXT NOT NULL,              -- NSID
  rkey         TEXT NOT NULL,
  cid          TEXT NOT NULL,
  kind         TEXT NOT NULL
                 CHECK (kind IN ('owned','external')),
  status       TEXT NOT NULL DEFAULT 'ok'
                 CHECK (status IN ('pending','ok')),
  subject_uri  TEXT,                       -- repost target / quoted record
  value        TEXT,                       -- raw record JSON; NULL while pending
  created_at   TEXT NOT NULL,              -- record body createdAt; placeholder for pending
  indexed_at   TEXT NOT NULL               -- when this row was last written
);

CREATE INDEX records_feed       ON records (status, created_at DESC, uri DESC);
CREATE INDEX records_collection ON records (collection, status, created_at DESC);
CREATE INDEX records_pending    ON records (kind, status) WHERE status = 'pending';

CREATE TABLE engagement (
  uri               TEXT PRIMARY KEY REFERENCES records(uri) ON DELETE CASCADE,
  like_count        INTEGER NOT NULL DEFAULT 0,
  repost_count      INTEGER NOT NULL DEFAULT 0,
  reply_count       INTEGER NOT NULL DEFAULT 0,
  reactor_sample    TEXT NOT NULL DEFAULT '[]',  -- JSON array, capped ~5
  source            TEXT NOT NULL,               -- 'bsky', 'grain', ...
  last_refreshed_at TEXT NOT NULL
);

CREATE INDEX engagement_refresh ON engagement (last_refreshed_at);

CREATE TABLE state (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
-- Keys (illustrative):
--   firehose.last_seq
--   cron.<tier>.<source>.last_run
--   cron.<source>.failures
```

### Schema notes

- `value` stores the **raw record JSON** verbatim. Preserves full
  fidelity (facets, langs, alt text, embed details) for any future
  rendering decision without a re-fetch. bsky posts are tiny.
- `created_at` is ISO-8601 `TEXT`. SQLite lex-sorts ISO strings
  correctly; the keyset cursor index works without a real timestamp
  type.
- For `kind='external' AND status='pending'`, `created_at` is
  populated with `indexed_at` as a placeholder; replaced with the
  real `record.createdAt` on enrichment. The feed query filters
  `status='ok'`, so pending rows never leak into the UI.
- External records that 404 from the AppView are **hard-deleted**.
  Engagement cascades. No ghost rows.
- Tombstones from the firehose for owned records are also
  hard-deletes. Engagement cascades.
- Reactor sample is capped at ~5 entries. Going to fuller lists would
  be a schema-compatible expansion (just bigger JSON), not a
  migration.

## Read API surface

`$lib/server/feed.ts`:

```ts
export type FeedFilter = {
  sources?: Array<'bsky' | 'pckt' | 'standard' | 'grain'>;
  from?: string;       // ISO date
  to?: string;         // ISO date
  cursor?: string;     // opaque base64url
  limit?: number;      // default 20, capped 50
  order?: 'desc' | 'asc';
};

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
  value: unknown;                  // parsed record JSON
  engagement?: EngagementSummary;  // omitted for blog sources
  subject?: FeedItem | null;       // resolved via self-join when subject_uri is set
};

export function getFeed(filter: FeedFilter): {
  items: FeedItem[];
  nextCursor: string | null;
};
```

Cursor encoding:

```ts
encodeCursor({ ts, uri }) → base64url(JSON.stringify({ ts, uri }))
decodeCursor(s) → { ts, uri } | throws (caller maps to 400)
```

Source-to-collection mapping is a small constant table inside
`feed.ts`; the loader never accepts raw NSIDs from URL params.

## System metrics surface

`$lib/server/system.ts`:

```ts
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
  cron: Record<
    'recent' | 'week' | 'month' | 'archive',
    Record<'bsky' | 'grain', CronTierStatus>
  >;
  db: {
    records: number;
    engagement: number;
    pending: number;
    sizeBytes: number;
  };
  buildSig: string;  // first 4 chars rendered by StatsPanel
};

export function getSystemSnapshot(): SystemSnapshot;
```

`+layout.server.ts` calls `getSystemSnapshot()` and exposes it under
`data.system`. The Stats panel's `build hex` block migrates from the
static `chrome.system.sig` to `data.system.buildSig`. Other fields
are available for any future greeble that wants real values.

## Error handling & resilience

The site keeps serving cached data through every upstream failure
mode. Concrete behaviors:

### Firehose

- Disconnect / socket error → exponential backoff with jitter
  (1s → 2s → 4s → … capped at ~60s), reconnect with
  `cursor = state.firehose.last_seq`.
- PDS rejects cursor as too old (atproto `FutureCursor` /
  replay-window error) → log "cold restart" event, run the full
  `listRecords` sweep, persist the highest seq observed during the
  sweep, then reconnect from there.
- Inbound commit fails zod validation → log + skip op; advance
  `last_seq` past it after a small retry budget so a single bad
  commit can't wedge the consumer. Skipped commits emit a metric.
- Tombstones → `DELETE FROM records WHERE uri = ?`; engagement
  cascades.

### AppView (per-source breaker)

- Track consecutive failures per source. After 5 consecutive
  failures, pause that source's scheduler tasks for an exponential
  cool-down window (1m → 5m → 15m → … capped at 1h). Other sources
  continue.
- 5xx / network → don't touch `last_refreshed_at`; the URI stays in
  its tier and is retried on the next due tick.
- 429 → respect `Retry-After` if present; otherwise fixed 60s
  cool-down.
- 404 on owned record URI → log and skip (anomalous: AppView lost a
  record we still hold).
- 404 on external record URI → hard-delete (cascade).
- Per-URI validation failure inside a batch → skip that URI; the
  rest of the batch still applies.

### Scheduler

- Single in-flight tick (`isRunning` guard, no `setTimeout` reentry).
  Skipped ticks are fine; the next tick re-derives due-ness from
  timestamps in the DB, not from elapsed wall time.
- Each tier-source pair is wrapped in try/catch. A throw in one pair
  does not poison others. Errors increment the per-source failure
  counter exposed via the system snapshot.

### SQLite

- WAL + `synchronous=NORMAL`: durable across crashes (loses at most
  the last few committed transactions on power loss; acceptable for
  a cache).
- Disk full → fatal log + process exit; systemd / runtime supervisor
  restarts; on restart, the firehose resumes from `last_seq` and the
  scheduler picks up where it left off. No data is permanently lost
  because everything is reconstructible from upstream.

### Validation boundary

Every write into the cache passes through a zod schema at the
boundary:

- Inbound firehose commit ops.
- Inbound AppView responses (per adapter).
- Inbound URL filter parameters in the loader.

The cache itself is trusted; reads do not re-validate.

## Process lifecycle

A small bootstrap module starts the workers:

```ts
// $lib/server/bootstrap.ts — top-of-file side effect, imported once
// from hooks.server.ts. The import-as-side-effect pattern guarantees
// it runs exactly once at server boot, before the first request,
// without polluting the request path. The body is gated on
// shouldRunBackground() so vite dev / tests don't connect upstream.

if (shouldRunBackground()) {
  await runMigrations(db);
  await ensureBackfillIfNeeded(db);   // first-run listRecords sweep
  startFirehose(db);                  // websocket loop
  startScheduler(db);                 // setInterval tick
}
```

`ensureBackfillIfNeeded`:

- If `state.firehose.last_seq` is missing → full `listRecords` sweep
  per watched collection, populate `records` (kind='owned'), then
  start the firehose without a cursor (it will set `last_seq` on its
  first applied commit).
- Otherwise → no-op; firehose resumes from cursor.

Idempotency: every upsert is keyed by at:// URI. Replays are safe.
A backfill that races a live commit converges; the later write
wins on `indexed_at`.

## Files touched / created

| File                                | Change |
| ----------------------------------- | ------ |
| `package.json`                      | add `better-sqlite3`, `zod`, `ws` (or atcute's firehose helpers if available) |
| `src/lib/server/db.ts`              | new — SQLite open + pragmas + migrations runner |
| `src/lib/server/migrations/001_init.sql` | new — schema in this spec |
| `src/lib/server/feed.ts`            | new — `getFeed`, cursor codec, hydrator |
| `src/lib/server/system.ts`          | new — `getSystemSnapshot` |
| `src/lib/server/firehose.ts`        | new — `subscribeRepos` consumer with cursor/backoff |
| `src/lib/server/scheduler.ts`       | new — tick loop, tier logic, in-flight guard |
| `src/lib/server/adapters/bsky.ts`   | new — `fetchEngagement`, `fetchRecords` via bsky AppView |
| `src/lib/server/adapters/grain.ts`  | new — same shape, against grain's AppView |
| `src/lib/server/adapters/types.ts`  | new — `Adapter`, `EngagementRow`, `RecordRow` |
| `src/lib/server/bootstrap.ts`       | new — gate + start workers |
| `src/lib/server/config.ts`          | new — watched-collections, owner DID, source-to-collection map |
| `src/hooks.server.ts`               | import bootstrap (side-effect) so workers start with the server |
| `src/routes/+layout.server.ts`      | call `getSystemSnapshot()` and expose under `data.system` |
| `src/routes/+page.server.ts`        | new — call `getFeed` from the home page loader |
| `src/lib/shell/StatsPanel.svelte`   | switch `build hex` source from `chrome.system.sig` to `data.system.buildSig` |
| `.env.example`                      | document `PROTO_BACKGROUND`, owner DID, PDS host already present |

`src/lib/server/` is a SvelteKit-conventional location: code under
`$lib/server` is guaranteed not to be bundled into client output.
The compiled SQLite binary stays server-side.

## Testing

Vitest is already configured.

### Unit (no I/O)

- Cursor `encode`/`decode` round-trip; reject malformed input.
- `tierForAge`, `isDueForRefresh` table-driven tests.
- zod schemas for firehose commit ops and AppView responses; assert
  parse + targeted reject cases against fixtures.
- Feed query builder: `(FeedFilter) → { sql, params }`; assert
  parameterization and that predicates compose correctly.
- Row hydrator: raw row → `FeedItem`, including subject self-join.

### Integration (in-memory SQLite)

- `better-sqlite3(':memory:')`, run migrations, seed fixtures.
- `getFeed()` across filter combos (sources, date range, asc/desc,
  cursor walk).
- Pagination stability: walk N pages, insert a new row mid-walk,
  assert no dupes / no skips (proves keyset cursor stability).
- Cascade behavior: delete a record, assert engagement row gone.
- External enrichment: insert pending external row, run the
  enrichment task with a fake adapter, assert row populated and
  status flipped.
- Firehose handler: feed fabricated commit objects (create / update
  / delete / repost subject / quote embed), assert correct DB writes
  and `last_seq` advance.
- Scheduler tick: seed records across tier ages, run with fake
  adapters and `vi.useFakeTimers()`, assert correct URIs dispatched
  to correct adapters per tier.

### Adapter contract

Each adapter (bsky, grain) gets fixture-driven tests: given a known
input batch and a recorded AppView response (committed JSON
fixtures), assert produced `EngagementRow[]` / `RecordRow[]`.
Fixtures recorded once against the real AppView and committed; CI
never hits the network.

### Manual / smoke

`PROTO_BACKGROUND=1 pnpm dev` against `pds.proto.cool`: visual
confirmation that records flow in, engagement rolls in on tier
ticks, system snapshot updates on the page. Not in CI.

### Out of scope for this spec's tests

- Live AppViews in CI (flaky, slow, rate-limited).
- Migration paths from a v0 cache (no v0 exists; first deploy is
  this schema).
- Multi-process SQLite contention (single-process by design).

## Non-goals (explicit)

- Free-text search. Defer until there's a clear user need.
- Multi-instance / horizontal scaling of the worker. Single Node
  process serves the site and runs the workers.
- A separate worker process. In-process is the simplest correct
  model for this scale.
- Public write APIs on proto.cool. The site is a reader; all writes
  to the cache come from the firehose or the scheduler.
- A custom AppView. We consume bsky's and grain's; we don't host
  one.
- Replies, threads, like buttons, comment forms on proto.cool. The
  social layer lives at the source apps.
- Quote-of-quote / multi-record embed enrichment beyond a single
  `subject_uri` per row.

## Open questions to resolve at implementation time

- Exact NSIDs for grain image records, pckt longform records,
  standard.site longform records. Drop-in once known.
- Whether to use `@atcute/client`'s firehose helpers vs. `ws` +
  hand-rolled cbor decode. `@atcute/client` is already a dep; if it
  exposes the helper cleanly, prefer it.
- Owner DID: read from env (`PUBLIC_OWNER_DID` or a server-only
  variant) or resolve from `PUBLIC_OWNER_HANDLE` at boot via
  `com.atproto.identity.resolveHandle`. Latter is one extra startup
  call but keeps env DRY.
