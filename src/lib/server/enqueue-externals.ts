// One-shot helper that backfills missing external pending rows for any
// owned records that have a subject_uri but whose subject isn't in the DB.
// Idempotent — uses ON CONFLICT DO NOTHING. Safe to run on every boot.

import type { DB } from './db';

export type EnqueueResult = {
	scanned: number;
	inserted: number;
};

export function enqueueMissingExternals(db: DB): EnqueueResult {
	const rows = db
		.prepare(
			`SELECT DISTINCT r.subject_uri AS uri
			 FROM records r
			 WHERE r.subject_uri IS NOT NULL
			   AND NOT EXISTS (SELECT 1 FROM records s WHERE s.uri = r.subject_uri)`
		)
		.all() as Array<{ uri: string }>;

	if (rows.length === 0) return { scanned: 0, inserted: 0 };

	const now = new Date().toISOString();
	const insertPending = db.prepare(
		`INSERT INTO records
		   (uri, did, collection, rkey, cid, kind, status, subject_uri, value, created_at, indexed_at)
		 VALUES (?, ?, ?, ?, '', 'external', 'pending', NULL, NULL, ?, ?)
		 ON CONFLICT (uri) DO NOTHING`
	);

	let inserted = 0;
	const tx = db.transaction(() => {
		for (const { uri } of rows) {
			const parts = uri.split('/');
			const did = parts[2];
			const collection = parts[3];
			const rkey = parts[4];
			if (!did || !collection || !rkey) continue;
			const r = insertPending.run(uri, did, collection, rkey, now, now);
			if (r.changes > 0) inserted += 1;
		}
	});
	tx();
	return { scanned: rows.length, inserted };
}
