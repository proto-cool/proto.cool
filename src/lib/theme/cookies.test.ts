import { describe, it, expect } from 'vitest';
import { parseCookieValue } from './cookies';

describe('parseCookieValue', () => {
	it('returns the value when the named cookie is present', () => {
		expect(parseCookieValue('foo=bar; baz=qux', 'baz')).toBe('qux');
	});

	it('returns undefined when the cookie is missing', () => {
		expect(parseCookieValue('foo=bar', 'missing')).toBeUndefined();
	});

	it('returns undefined for an empty cookie string', () => {
		expect(parseCookieValue('', 'foo')).toBeUndefined();
	});

	it('handles a single cookie with no semicolons', () => {
		expect(parseCookieValue('proto-theme=neon-green', 'proto-theme')).toBe('neon-green');
	});

	it('handles whitespace around delimiters', () => {
		expect(parseCookieValue('a=1;  b=2 ;c=3', 'b')).toBe('2');
	});

	it('does not match cookie name as a prefix of another name', () => {
		expect(parseCookieValue('proto-theme-old=x; proto-theme=neon-green', 'proto-theme')).toBe(
			'neon-green'
		);
	});
});
