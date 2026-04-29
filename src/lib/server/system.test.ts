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

	it('treats unparseable firehose.last_seq as null instead of NaN', () => {
		const db = openDatabase(':memory:');
		runMigrations(db);
		db.prepare(
			`INSERT INTO state (key, value, updated_at) VALUES (?, ?, ?)`
		).run('firehose.last_seq', 'not-a-number', '2026-04-01T00:00:00.000Z');

		const snap = getSystemSnapshot(db);
		expect(snap.firehose.lastSeq).toBe(null);
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
