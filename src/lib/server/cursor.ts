import { z } from 'zod';

export type Cursor = {
	ts: string;
	uri: string;
	// Populated only when the feed is sorted by popularity. Used as the
	// primary tuple component in the WHERE/ORDER BY of cursor pagination
	// for that sort. Time-based sorts ignore it.
	score?: number;
};

const CursorSchema = z.object({
	ts: z.string().min(1),
	uri: z.string().min(1),
	score: z.number().optional()
});

function toBase64Url(s: string): string {
	return Buffer.from(s, 'utf8')
		.toString('base64')
		.replaceAll('+', '-')
		.replaceAll('/', '_')
		.replaceAll('=', '');
}

function fromBase64Url(s: string): string {
	if (!/^[A-Za-z0-9_-]+$/.test(s)) {
		throw new Error('cursor: not a base64url string');
	}
	const padded = s.replaceAll('-', '+').replaceAll('_', '/') +
		'='.repeat((4 - (s.length % 4)) % 4);
	return Buffer.from(padded, 'base64').toString('utf8');
}

export function encodeCursor(cursor: Cursor): string {
	return toBase64Url(JSON.stringify(cursor));
}

export function decodeCursor(s: string): Cursor {
	const json = fromBase64Url(s);
	let parsed: unknown;
	try {
		parsed = JSON.parse(json);
	} catch {
		throw new Error('cursor: not valid JSON');
	}
	const result = CursorSchema.safeParse(parsed);
	if (!result.success) {
		throw new Error('cursor: missing required fields');
	}
	return result.data;
}
