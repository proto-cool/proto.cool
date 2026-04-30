import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getDb } from '$lib/server/bootstrap';
import { hydrateRow, type FeedItem } from '$lib/server/feed';
import { parseContent, type Block } from '$lib/server/blocks';
import { getOwnerDidFromState, getPdsHost } from '$lib/server/config';
import { ownedBlobUrl } from '$lib/blob';

type DocRow = {
	uri: string;
	collection: string;
	kind: 'owned' | 'external';
	subject_uri: string | null;
	created_at: string;
	value: string | null;
	like_count: number | null;
	repost_count: number | null;
	reply_count: number | null;
	reactor_sample: string | null;
	engagement_source: string | null;
	subject_uri_resolved: null;
	subject_collection: null;
	subject_kind: null;
	subject_created_at: null;
	subject_value: null;
	subject_like_count: null;
	subject_repost_count: null;
	subject_reply_count: null;
	subject_reactor_sample: null;
	subject_engagement_source: null;
};

export const load: PageServerLoad = async ({ params, fetch }) => {
	const db = getDb();
	const path = '/' + params.path;

	const row = db
		.prepare(
			`SELECT
				r.uri AS uri, r.collection AS collection, r.kind AS kind,
				r.subject_uri AS subject_uri, r.created_at AS created_at, r.value AS value,
				e.like_count AS like_count, e.repost_count AS repost_count,
				e.reply_count AS reply_count, e.reactor_sample AS reactor_sample,
				e.source AS engagement_source,
				NULL AS subject_uri_resolved, NULL AS subject_collection,
				NULL AS subject_kind, NULL AS subject_created_at, NULL AS subject_value,
				NULL AS subject_like_count, NULL AS subject_repost_count,
				NULL AS subject_reply_count, NULL AS subject_reactor_sample,
				NULL AS subject_engagement_source
			FROM records r
			LEFT JOIN engagement e ON e.uri = r.uri
			WHERE r.collection = 'site.standard.document'
			  AND r.status = 'ok'
			  AND json_extract(r.value, '$.path') = ?
			LIMIT 1`
		)
		.get(path) as DocRow | undefined;

	if (!row) throw error(404, 'doc not found');

	const item: FeedItem = hydrateRow(row);
	const ownerDid = getOwnerDidFromState(db) ?? '';
	const pdsHost = getPdsHost();

	const blocks: Block[] = await parseContent(
		(item.value as { content?: any })?.content ?? null,
		async (cid: string) => {
			const url = ownedBlobUrl(pdsHost, ownerDid, cid);
			const res = await fetch(url);
			if (!res.ok) throw new Error(`blob ${cid} fetch failed: ${res.status}`);
			return res.text();
		}
	);

	return {
		doc: item,
		blocks,
		blobCtx: { ownerDid, pdsHost }
	};
};
