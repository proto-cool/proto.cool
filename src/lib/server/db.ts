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
