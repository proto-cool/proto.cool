// Resolve atproto blob references to fetchable URLs. Owned blobs go through
// the operator's PDS (no auth required for sync.getBlob); external blobs are
// served via the bsky CDN's image proxy.

export type BlobContext = {
	ownerDid: string;
	pdsHost: string;
};

export function ownedBlobUrl(pdsHost: string, did: string, cid: string): string {
	return `https://${pdsHost}/xrpc/com.atproto.sync.getBlob?did=${did}&cid=${cid}`;
}

export function externalBlobUrl(did: string, cid: string): string {
	return `https://cdn.bsky.app/img/feed_thumbnail/plain/${did}/${cid}@jpeg`;
}

export function blobUrl(ctx: BlobContext, did: string, cid: string): string {
	return did === ctx.ownerDid
		? ownedBlobUrl(ctx.pdsHost, did, cid)
		: externalBlobUrl(did, cid);
}
