import { describe, it, expect } from 'vitest';
import { buildRssFeed, type RssItem } from './rss';

const SITE = {
	title: 'proto.cool',
	link: 'https://proto.cool',
	description: 'a public log',
	owner: 'proto.cool',
	selfUrl: 'https://proto.cool/feed.xml'
};

describe('buildRssFeed', () => {
	it('emits an XML document with channel metadata', () => {
		const xml = buildRssFeed([], SITE);
		expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
		expect(xml).toContain('<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">');
		expect(xml).toContain('<title>proto.cool</title>');
		expect(xml).toContain('<link>https://proto.cool</link>');
		expect(xml).toContain('<description>a public log</description>');
	});

	it('emits an atom:link rel="self" pointing at the feed URL', () => {
		const xml = buildRssFeed([], SITE);
		expect(xml).toContain(
			'<atom:link href="https://proto.cool/feed.xml" rel="self" type="application/rss+xml" />'
		);
	});

	it('includes one <item> per input', () => {
		const items: RssItem[] = [
			{
				title: 'a',
				link: 'https://proto.cool/p/a',
				guid: 'at://x/app.bsky.feed.post/a',
				pubDate: '2026-04-30T10:00:00Z',
				description: 'first'
			},
			{
				title: 'b',
				link: 'https://proto.cool/p/b',
				guid: 'at://x/app.bsky.feed.post/b',
				pubDate: '2026-04-29T10:00:00Z',
				description: 'second'
			}
		];
		const xml = buildRssFeed(items, SITE);
		expect(xml.match(/<item>/g)?.length).toBe(2);
		expect(xml).toContain('<title>a</title>');
		expect(xml).toContain('<title>b</title>');
	});

	it('escapes XML-unsafe characters in item content', () => {
		const items: RssItem[] = [
			{
				title: 'foo & bar <baz>',
				link: 'https://proto.cool/p/x',
				guid: 'at://x/app.bsky.feed.post/x',
				pubDate: '2026-04-30T10:00:00Z',
				description: 'a "quoted" thing'
			}
		];
		const xml = buildRssFeed(items, SITE);
		expect(xml).toContain('foo &amp; bar &lt;baz&gt;');
		expect(xml).not.toContain('<baz>'); // raw form must not appear
		expect(xml).toContain('&quot;quoted&quot;');
	});

	it('formats pubDate as RFC 822', () => {
		const items: RssItem[] = [
			{
				title: 't',
				link: 'https://proto.cool/p/t',
				guid: 'g',
				pubDate: '2026-04-30T10:00:00Z',
				description: 'd'
			}
		];
		const xml = buildRssFeed(items, SITE);
		// new Date('2026-04-30T10:00:00Z').toUTCString() ===
		// 'Thu, 30 Apr 2026 10:00:00 GMT'
		expect(xml).toContain('<pubDate>Thu, 30 Apr 2026 10:00:00 GMT</pubDate>');
	});
});
