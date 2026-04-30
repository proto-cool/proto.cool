// Re-derive the canonical created_at column for records whose lexicon names
// the timestamp field something other than `createdAt`. Idempotent — only
// updates rows where the recomputed value differs from the stored value.
// Run at bootstrap to fix data inserted before extractCreatedAt landed.

import type { DB } from './db';
import { extractCreatedAt } from './created-at';

export type ReconcileResult = {
	scanned: number;
	updated: number;
};

const COLLECTIONS_TO_RECONCILE = ['site.standard.document'] as const;

export function reconcileCreatedAt(db: DB): ReconcileResult {
	const placeholders = COLLECTIONS_TO_RECONCILE.map(() => '?').join(', ');
	const rows = db
		.prepare(
			`SELECT uri, collection, value, created_at AS storedCreatedAt
			 FROM records
			 WHERE collection IN (${placeholders})
			   AND value IS NOT NULL`
		)
		.all(...COLLECTIONS_TO_RECONCILE) as Array<{
		uri: string;
		collection: string;
		value: string;
		storedCreatedAt: string;
	}>;

	if (rows.length === 0) return { scanned: 0, updated: 0 };

	const update = db.prepare(`UPDATE records SET created_at = ? WHERE uri = ?`);
	let updated = 0;
	const tx = db.transaction(() => {
		for (const row of rows) {
			let value: Record<string, unknown>;
			try {
				value = JSON.parse(row.value) as Record<string, unknown>;
			} catch {
				continue;
			}
			const correct = extractCreatedAt(row.collection, value, row.storedCreatedAt);
			if (correct !== row.storedCreatedAt) {
				update.run(correct, row.uri);
				updated += 1;
			}
		}
	});
	tx();
	return { scanned: rows.length, updated };
}
