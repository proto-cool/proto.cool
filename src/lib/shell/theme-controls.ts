import { writable } from 'svelte/store';
import { themes, DEFAULT_THEME, type ThemeId } from '$lib/theme';

export const themeDropdownOpen = writable(false);

export const LAST_FAMILY_KEY = 'proto-last-family';

type ResolveArgs = {
	prefersDark: boolean;
	lastFamily: string | null;
};

/**
 * Pure: pick the concrete theme id for "system" mode.
 *
 * - Find the family — last user-picked family, or the default family if missing/unknown.
 * - Pick the variant matching the OS scheme.
 * - If that exact variant isn't registered for the family, return the family's other variant.
 */
export function resolveSysTheme({ prefersDark, lastFamily }: ResolveArgs): ThemeId {
	const want: 'dark' | 'light' = prefersDark ? 'dark' : 'light';

	const defaultFamily = themes.find((t) => t.id === DEFAULT_THEME)?.family;
	const family =
		(lastFamily && themes.some((t) => t.family === lastFamily) ? lastFamily : defaultFamily) ?? '';

	const inFamily = themes.filter((t) => t.family === family);
	const exact = inFamily.find((t) => t.variant === want);
	if (exact) return exact.id as ThemeId;

	const fallback = inFamily[0];
	return (fallback?.id ?? DEFAULT_THEME) as ThemeId;
}
