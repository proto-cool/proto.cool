import { describe, it, expect } from 'vitest';
import {
	WATCHED_COLLECTIONS,
	collectionsForSource,
	sourceForCollection,
	type Source
} from './config';

describe('config', () => {
	it('WATCHED_COLLECTIONS contains the v1 social and bsky collections', () => {
		expect(WATCHED_COLLECTIONS).toContain('app.bsky.feed.post');
		expect(WATCHED_COLLECTIONS).toContain('app.bsky.feed.repost');
	});

	it('sourceForCollection maps known NSIDs to their source', () => {
		expect(sourceForCollection('app.bsky.feed.post')).toBe('bsky');
		expect(sourceForCollection('app.bsky.feed.repost')).toBe('bsky');
	});

	it('sourceForCollection returns null for unknown NSIDs', () => {
		expect(sourceForCollection('com.example.unknown')).toBe(null);
	});

	it('collectionsForSource returns the collections for a given source', () => {
		const bsky = collectionsForSource('bsky');
		expect(bsky).toContain('app.bsky.feed.post');
		expect(bsky).toContain('app.bsky.feed.repost');
	});

	it('collectionsForSource returns [] for an unknown source', () => {
		// @ts-expect-error — testing runtime behavior on an invalid input
		expect(collectionsForSource('nope')).toEqual([]);
	});

	it('every WATCHED_COLLECTIONS entry has a source mapping', () => {
		for (const c of WATCHED_COLLECTIONS) {
			const s = sourceForCollection(c);
			expect(s, `no source for ${c}`).not.toBe(null);
		}
	});

	it('Source type accepts the v1 enum values', () => {
		const s: Source[] = ['bsky', 'pckt', 'standard', 'grain'];
		expect(s.length).toBe(4);
	});
});
