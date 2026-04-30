import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/bootstrap';
import { getFeed, type FeedItem } from '$lib/server/feed';
import { buildRssFeed, type RssItem } from '$lib/server/rss';

const CHANNEL = {
	title: 'proto.cool',
	link: 'https://proto.cool',
	description: 'a public log of programming, making, and whatever else catches my eye.',
	owner: 'proto.cool',
	selfUrl: 'https://proto.cool/feed.xml'
};

const TITLE_FALLBACK_LEN = 64;
const DESCRIPTION_MAX_LEN = 280;

function itemTitle(value: unknown): string {
	if (value && typeof value === 'object') {
		const v = value as Record<string, unknown>;
		if (typeof v.title === 'string' && v.title.length > 0) return v.title;
		if (typeof v.text === 'string' && v.text.length > 0) {
			const t = v.text.replace(/\s+/g, ' ').trim();
			return t.length > TITLE_FALLBACK_LEN ? t.slice(0, TITLE_FALLBACK_LEN - 1) + '…' : t;
		}
	}
	return '(untitled)';
}

function itemDescription(value: unknown): string {
	let raw = '';
	if (value && typeof value === 'object') {
		const v = value as Record<string, unknown>;
		if (typeof v.deck === 'string') raw = v.deck;
		else if (typeof v.text === 'string') raw = v.text;
	}
	if (raw.length === 0) return '';
	const collapsed = raw.replace(/\s+/g, ' ').trim();
	return collapsed.length > DESCRIPTION_MAX_LEN
		? collapsed.slice(0, DESCRIPTION_MAX_LEN - 1) + '…'
		: collapsed;
}

// at://<did>/<collection>/<rkey>
function parseAtUri(uri: string): { did: string; rkey: string } | null {
	const m = uri.match(/^at:\/\/([^/]+)\/[^/]+\/([^/]+)$/);
	if (!m) return null;
	return { did: m[1], rkey: m[2] };
}

// Build a public-web link for an item, per collection. Blogs land on
// /blog/<path>; bsky posts/quotes link to bsky.app; reposts follow the
// subject (the original record being reposted) since the repost itself
// has no public URL on bsky.app.
function itemLink(item: FeedItem): string {
	if (item.collection === 'site.standard.document') {
		const v = item.value as Record<string, unknown> | null;
		const path = v && typeof v.path === 'string' ? v.path : null;
		if (path) {
			const stripped = path.startsWith('/') ? path.slice(1) : path;
			return `${CHANNEL.link}/blog/${stripped}`;
		}
		return CHANNEL.link;
	}

	if (item.collection === 'app.bsky.feed.repost' && item.subject) {
		const parts = parseAtUri(item.subject.uri);
		if (parts) return `https://bsky.app/profile/${parts.did}/post/${parts.rkey}`;
	}

	const parts = parseAtUri(item.uri);
	if (parts) return `https://bsky.app/profile/${parts.did}/post/${parts.rkey}`;
	return CHANNEL.link;
}

export const GET: RequestHandler = async () => {
	const db = getDb();
	const { items } = getFeed(db, { limit: 20, order: 'desc' });

	const rssItems: RssItem[] = items.map((it) => ({
		title: itemTitle(it.value),
		link: itemLink(it),
		guid: it.uri,
		pubDate: it.createdAt,
		description: itemDescription(it.value)
	}));

	const body = buildRssFeed(rssItems, CHANNEL);

	return new Response(body, {
		headers: {
			'Content-Type': 'application/rss+xml; charset=utf-8',
			'Cache-Control': 'public, max-age=300'
		}
	});
};
