// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit';
import { resolveTheme, resolveMode } from '$lib/theme/resolve';
import { COOKIE_NAMES } from '$lib/theme';

export const handle: Handle = async ({ event, resolve }) => {
	const theme = resolveTheme(event.cookies.get(COOKIE_NAMES.theme));
	const mode = resolveMode(event.cookies.get(COOKIE_NAMES.mode));

	event.locals.theme = theme;
	event.locals.mode = mode;

	return resolve(event, {
		transformPageChunk: ({ html }) =>
			html.replace('%proto.theme%', theme).replace('%proto.mode%', mode)
	});
};
