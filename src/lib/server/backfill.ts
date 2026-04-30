import type { DB } from './db';
import type { AtpClient } from './atp-client';
import { WATCHED_COLLECTIONS } from './config';
import { extractCreatedAt } from './created-at';

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
	const insertPending = db.prepare(
		`INSERT INTO records
		   (uri, did, collection, rkey, cid, kind, status, subject_uri, value, created_at, indexed_at)
		 VALUES (?, ?, ?, ?, '', 'external', 'pending', NULL, NULL, ?, ?)
		 ON CONFLICT (uri) DO NOTHING`
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
					const createdAt = extractCreatedAt(collection, value, now);
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
					if (subjectUri) {
						const parts = subjectUri.split('/');
						const extDid = parts[2];
						const extCollection = parts[3];
						const extRkey = parts[4];
						if (extDid && extCollection && extRkey) {
							insertPending.run(subjectUri, extDid, extCollection, extRkey, now, now);
						}
					}
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
