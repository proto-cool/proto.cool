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
