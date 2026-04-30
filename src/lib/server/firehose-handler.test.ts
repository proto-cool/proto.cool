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
