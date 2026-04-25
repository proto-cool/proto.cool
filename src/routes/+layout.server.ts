import type { LayoutServerLoad } from './$types';
import { resolveChromeData } from '$lib/shell/chrome';

export const load: LayoutServerLoad = ({ locals }) => ({
	theme: locals.theme,
	mode: locals.mode,
	chrome: resolveChromeData()
});
