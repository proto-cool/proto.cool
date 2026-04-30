// RSS 2.0 builder. Pure function — takes pre-shaped items and channel
// metadata, returns an XML string. The route handler at /feed.xml does
// the records-table → RssItem mapping.

export type RssItem = {
	title: string;
	link: string;
	guid: string;
	pubDate: string; // ISO 8601 in, RFC 822 out
	description: string;
};

export type RssChannel = {
	title: string;
	link: string;
	description: string;
	owner: string;
};

function escapeXml(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

function rfc822(iso: string): string {
	return new Date(iso).toUTCString();
}

export function buildRssFeed(items: RssItem[], channel: RssChannel): string {
	const itemXml = items
		.map(
			(it) => `
		<item>
			<title>${escapeXml(it.title)}</title>
			<link>${escapeXml(it.link)}</link>
			<guid isPermaLink="false">${escapeXml(it.guid)}</guid>
			<pubDate>${rfc822(it.pubDate)}</pubDate>
			<description>${escapeXml(it.description)}</description>
		</item>`
		)
		.join('');

	return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
	<channel>
		<title>${escapeXml(channel.title)}</title>
		<link>${escapeXml(channel.link)}</link>
		<description>${escapeXml(channel.description)}</description>
		<language>en</language>${itemXml}
	</channel>
</rss>
`;
}
