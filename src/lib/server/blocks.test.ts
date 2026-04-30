import { describe, it, expect } from 'vitest';
import { parseContent } from './blocks';

describe('parseContent', () => {
	it('returns inline items when present', async () => {
		const content = {
			items: [{ $type: 'blog.pckt.block.text', plaintext: 'hi' }]
		};
		const fetcher = async () => { throw new Error('should not fetch'); };
		const items = await parseContent(content, fetcher);
		expect(items).toEqual([{ $type: 'blog.pckt.block.text', plaintext: 'hi' }]);
	});

	it('fetches blob when items missing', async () => {
		const content = {
			blob: { ref: { $link: 'cidX' }, mimeType: 'application/json', size: 100 }
		};
		const fetcher = async (cid: string) => {
			expect(cid).toBe('cidX');
			return JSON.stringify({
				items: [{ $type: 'blog.pckt.block.text', plaintext: 'from blob' }]
			});
		};
		const items = await parseContent(content, fetcher);
		expect(items).toEqual([{ $type: 'blog.pckt.block.text', plaintext: 'from blob' }]);
	});

	it('returns [] for missing content', async () => {
		const fetcher = async () => { throw new Error('unused'); };
		expect(await parseContent({}, fetcher)).toEqual([]);
		expect(await parseContent(null, fetcher)).toEqual([]);
		expect(await parseContent(undefined, fetcher)).toEqual([]);
	});

	it('returns [] when blob fetch fails', async () => {
		const fetcher = async () => { throw new Error('fetch failed'); };
		const items = await parseContent(
			{ blob: { ref: { $link: 'cid' } } },
			fetcher
		);
		expect(items).toEqual([]);
	});
});
