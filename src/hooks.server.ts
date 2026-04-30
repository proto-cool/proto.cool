// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit';
import { resolveTheme, resolveMode } from '$lib/theme/resolve';
import { COOKIE_NAMES } from '$lib/theme';
import { bootstrap } from '$lib/server/bootstrap';

// Side-effect: kicks off DB open, migrations, and (if enabled) workers.
// `bootstrap()` is idempotent and resolves on the first call's promise on
// every subsequent call — so awaiting it inside the request handler is safe
// once it has settled.
const bootPromise = bootstrap().catch((err) => {
	console.error('[bootstrap] fatal', err);
	process.exit(1);
});

export const handle: Handle = async ({ event, resolve }) => {
	await bootPromise;

	const theme = resolveTheme(event.cookies.get(COOKIE_NAMES.theme));
	const mode = resolveMode(event.cookies.get(COOKIE_NAMES.mode));

	event.locals.theme = theme;
	event.locals.mode = mode;

	return resolve(event, {
		transformPageChunk: ({ html }) =>
			html.replaceAll('%proto.theme%', theme).replaceAll('%proto.mode%', mode)
	});
};
