import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { z } from 'zod';
import { getDb } from '$lib/server/bootstrap';
import { getFeed, type FeedFilter } from '$lib/server/feed';
import { decodeCursor } from '$lib/server/cursor';

const SourceSchema = z.enum(['bsky', 'pckt', 'standard', 'grain']);
const OrderSchema = z.enum(['asc', 'desc']);

const QuerySchema = z.object({
	source: z.array(SourceSchema).optional(),
	from: z.string().datetime().optional(),
	to: z.string().datetime().optional(),
	cursor: z.string().min(1).optional(),
	limit: z.coerce.number().int().positive().max(50).optional(),
	order: OrderSchema.optional()
});

export const load: PageServerLoad = ({ url }) => {
	const db = getDb();

	const raw = {
		source: url.searchParams.getAll('source'),
		from: url.searchParams.get('from') ?? undefined,
		to: url.searchParams.get('to') ?? undefined,
		cursor: url.searchParams.get('cursor') ?? undefined,
		limit: url.searchParams.get('limit') ?? undefined,
		order: url.searchParams.get('order') ?? undefined
	};
	// `source` may be [] when no source params present — treat as omitted.
	const normalized = {
		...raw,
		source: raw.source.length > 0 ? raw.source : undefined
	};

	const parsed = QuerySchema.safeParse(normalized);
	if (!parsed.success) {
		throw error(400, parsed.error.message);
	}

	const filter: FeedFilter = {
		sources: parsed.data.source,
		from: parsed.data.from,
		to: parsed.data.to,
		limit: parsed.data.limit,
		order: parsed.data.order
	};

	if (parsed.data.cursor) {
		try {
			filter.cursor = decodeCursor(parsed.data.cursor);
		} catch {
			throw error(400, 'invalid cursor');
		}
	}

	return { feed: getFeed(db, filter) };
};
