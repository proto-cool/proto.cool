import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/bootstrap';
import { getFeed } from '$lib/server/feed';
import { buildRssFeed, type RssItem } from '$lib/server/rss';

const CHANNEL = {
	title: 'proto.cool',
	link: 'https://proto.cool',
	description: 'a public log of programming, making, and whatever else catches my eye.',
	owner: 'proto.cool'
};

const TITLE_FALLBACK_LEN = 64;

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
	if (value && typeof value === 'object') {
		const v = value as Record<string, unknown>;
		if (typeof v.deck === 'string') return v.deck;
		if (typeof v.text === 'string') return v.text;
	}
	return '';
}

export const GET: RequestHandler = async () => {
	const db = getDb();
	const { items } = getFeed(db, { limit: 20, order: 'desc' });

	const rssItems: RssItem[] = items.map((it) => ({
		title: itemTitle(it.value),
		link: `${CHANNEL.link}/at/${encodeURIComponent(it.uri)}`,
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
