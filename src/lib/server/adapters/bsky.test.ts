import { describe, it, expect } from 'vitest';
import { createBskyAdapter } from './bsky';
import type { AtpClient } from '../atp-client';

type PostsPayload = Awaited<ReturnType<AtpClient['getPosts']>>['posts'];

function fakeClient(posts: PostsPayload): AtpClient {
	return {
		async listRecords() { throw new Error('not used'); },
		async resolveHandle() { throw new Error('not used'); },
		async getPosts() { return { posts }; }
	};
}

describe('bskyAdapter.fetchEngagement', () => {
	it('maps posts to engagement rows', async () => {
		const client = fakeClient([
			{
				uri: 'at://did:plc:x/app.bsky.feed.post/1',
				cid: 'cid1',
				record: { text: 'hi', createdAt: '2026-04-01T00:00:00Z' },
				likeCount: 3,
				repostCount: 1,
				replyCount: 0
			}
		]);
		const adapter = createBskyAdapter(client);
		const result = await adapter.fetchEngagement(['at://did:plc:x/app.bsky.feed.post/1']);
		expect(result.found).toEqual([
			{
				uri: 'at://did:plc:x/app.bsky.feed.post/1',
				likeCount: 3,
				repostCount: 1,
				replyCount: 0,
				reactorSample: []
			}
		]);
		expect(result.notFound).toEqual([]);
	});

	it('reports URIs the AppView omits as notFound', async () => {
		const client = fakeClient([
			{ uri: 'at://did:plc:x/app.bsky.feed.post/A', cid: 'c', record: {} }
		]);
		const adapter = createBskyAdapter(client);
		const result = await adapter.fetchEngagement([
			'at://did:plc:x/app.bsky.feed.post/A',
			'at://did:plc:x/app.bsky.feed.post/MISSING'
		]);
		expect(result.found.map((r) => r.uri)).toEqual(['at://did:plc:x/app.bsky.feed.post/A']);
		expect(result.notFound).toEqual(['at://did:plc:x/app.bsky.feed.post/MISSING']);
	});

	it('treats absent counts as zero', async () => {
		const client = fakeClient([
			{ uri: 'at://did:plc:x/app.bsky.feed.post/A', cid: 'c', record: {} }
		]);
		const adapter = createBskyAdapter(client);
		const r = await adapter.fetchEngagement(['at://did:plc:x/app.bsky.feed.post/A']);
		expect(r.found[0]).toMatchObject({ likeCount: 0, repostCount: 0, replyCount: 0 });
	});

	it('chunks input into batches of 25 URIs', async () => {
		const calls: string[][] = [];
		const client: AtpClient = {
			async listRecords() { throw new Error('not used'); },
			async resolveHandle() { throw new Error('not used'); },
			async getPosts(uris) {
				calls.push(uris);
				return { posts: uris.map((uri) => ({ uri, cid: 'c', record: {} })) };
			}
		};
		const adapter = createBskyAdapter(client);
		const uris = Array.from({ length: 60 }, (_, i) => `at://did:plc:x/app.bsky.feed.post/${i}`);
		await adapter.fetchEngagement(uris);
		expect(calls.map((c) => c.length)).toEqual([25, 25, 10]);
	});
});

describe('bskyAdapter.fetchRecords', () => {
	it('maps posts to RecordRow with createdAt from the record body', async () => {
		const client = fakeClient([
			{
				uri: 'at://did:plc:x/app.bsky.feed.post/1',
				cid: 'cid1',
				record: { text: 'hi', createdAt: '2026-03-15T12:00:00Z', $type: 'app.bsky.feed.post' }
			}
		]);
		const adapter = createBskyAdapter(client);
		const r = await adapter.fetchRecords(['at://did:plc:x/app.bsky.feed.post/1']);
		expect(r.found).toEqual([
			{
				uri: 'at://did:plc:x/app.bsky.feed.post/1',
				cid: 'cid1',
				value: { text: 'hi', createdAt: '2026-03-15T12:00:00Z', $type: 'app.bsky.feed.post' },
				createdAt: '2026-03-15T12:00:00Z'
			}
		]);
	});

	it('reports missing URIs as notFound', async () => {
		const client = fakeClient([]);
		const adapter = createBskyAdapter(client);
		const r = await adapter.fetchRecords(['at://did:plc:x/app.bsky.feed.post/GONE']);
		expect(r.notFound).toEqual(['at://did:plc:x/app.bsky.feed.post/GONE']);
	});
});
