import { describe, it, expect } from 'vitest';
import { encodeCursor, decodeCursor, type Cursor } from './cursor';

describe('cursor', () => {
	it('encodes and decodes round-trip', () => {
		const c: Cursor = {
			ts: '2026-04-01T12:34:56.000Z',
			uri: 'at://did:plc:abc/app.bsky.feed.post/3khrtnf25xs2k'
		};
		const encoded = encodeCursor(c);
		const decoded = decodeCursor(encoded);
		expect(decoded).toEqual(c);
	});

	it('produces a base64url string (no +, /, or = padding)', () => {
		const encoded = encodeCursor({
			ts: '2026-04-01T12:34:56.000Z',
			uri: 'at://did:plc:abc/app.bsky.feed.post/x'
		});
		expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
	});

	it('decodeCursor throws on a non-base64url string', () => {
		expect(() => decodeCursor('!!! not valid !!!')).toThrow();
	});

	it('decodeCursor throws when the decoded JSON is missing required fields', () => {
		// "{\"ts\":\"x\"}" — no uri
		const partial = Buffer.from('{"ts":"x"}', 'utf8')
			.toString('base64')
			.replaceAll('+', '-')
			.replaceAll('/', '_')
			.replaceAll('=', '');
		expect(() => decodeCursor(partial)).toThrow();
	});

	it('decodeCursor throws when payload is not JSON', () => {
		const bad = Buffer.from('not json', 'utf8')
			.toString('base64')
			.replaceAll('+', '-')
			.replaceAll('/', '_')
			.replaceAll('=', '');
		expect(() => decodeCursor(bad)).toThrow();
	});
});
