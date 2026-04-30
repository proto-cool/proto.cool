// Lightweight DID → handle/displayName cache. Avatars intentionally omitted
// (no blob proxying / image cache cost). TTL enforced by callers checking
// fetched_at; rows older than the TTL refresh on next reference.

export const sql = `
CREATE TABLE profiles (
  did            TEXT PRIMARY KEY,
  handle         TEXT,
  display_name   TEXT,
  fetched_at     TEXT NOT NULL
);

CREATE INDEX profiles_handle ON profiles (handle);
`;
