// Schema is held as a string constant rather than a `.sql` file so the
// migration registry resolves identically in every runtime: SvelteKit's vite
// bundler (production server build), vitest under the same vite config, and
// the bare `tsx` runtime used by `scripts/backfill.ts`. A `?raw` import would
// require vite plugins; an `fs.readFileSync(import.meta.url)` would break
// when bundled. A plain TS export sidesteps both.

export const sql = `
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
`;
