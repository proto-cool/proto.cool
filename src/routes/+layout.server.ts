import type { LayoutServerLoad } from './$types';
import { resolveChromeData } from '$lib/shell/chrome';
import { getDb } from '$lib/server/bootstrap';
import { getSystemSnapshot } from '$lib/server/system';

export const load: LayoutServerLoad = ({ locals }) => ({
	theme: locals.theme,
	mode: locals.mode,
	chrome: resolveChromeData(),
	system: getSystemSnapshot(getDb())
});
