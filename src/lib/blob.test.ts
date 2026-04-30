import { describe, it, expect } from 'vitest';
import { blobUrl, externalBlobUrl, ownedBlobUrl } from './blob';

describe('blob URLs', () => {
	it('ownedBlobUrl uses PDS sync.getBlob', () => {
		expect(ownedBlobUrl('pds.proto.cool', 'did:plc:owner', 'cidA')).toBe(
			'https://pds.proto.cool/xrpc/com.atproto.sync.getBlob?did=did:plc:owner&cid=cidA'
		);
	});

	it('externalBlobUrl uses bsky CDN', () => {
		expect(externalBlobUrl('did:plc:other', 'cidB')).toBe(
			'https://cdn.bsky.app/img/feed_thumbnail/plain/did:plc:other/cidB@jpeg'
		);
	});

	it('blobUrl routes by owner DID', () => {
		const ctx = { ownerDid: 'did:plc:owner', pdsHost: 'pds.proto.cool' };
		expect(blobUrl(ctx, 'did:plc:owner', 'c1')).toContain('pds.proto.cool');
		expect(blobUrl(ctx, 'did:plc:other', 'c2')).toContain('cdn.bsky.app');
	});
});
