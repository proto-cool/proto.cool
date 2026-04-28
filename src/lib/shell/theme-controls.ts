import { writable } from 'svelte/store';
import { themes as registryThemes, DEFAULT_THEME, type ThemeId } from '$lib/theme';

export const themeDropdownOpen = writable(false);

export const LAST_FAMILY_KEY = 'proto-last-family';

type ResolveArgs = {
	prefersDark: boolean;
	lastFamily: string | null;
	/** Override registry — used in tests. Defaults to the live registry. */
	themes?: ReadonlyArray<{ id: string; family: string; variant: 'dark' | 'light' }>;
	/** Override default — used in tests. Defaults to DEFAULT_THEME. */
	defaultThemeId?: string;
};

/**
 * Pure: pick the concrete theme id for "system" mode.
 *
 * Fallback chain:
 *  1. Use lastFamily if it matches a registered family; else use the default theme's family.
 *  2. Within that family, pick the variant matching the OS scheme (prefersDark → 'dark').
 *  3. If that variant isn't registered for the family, return the family's other variant.
 *  4. If the family has no entries at all (shouldn't happen with a valid registry), return defaultThemeId.
 */
export function resolveSysTheme({
	prefersDark,
	lastFamily,
	themes = registryThemes,
	defaultThemeId = DEFAULT_THEME
}: ResolveArgs): string {
	const want: 'dark' | 'light' = prefersDark ? 'dark' : 'light';

	const defaultEntry = themes.find((t) => t.id === defaultThemeId);
	const knownFamily =
		lastFamily && themes.some((t) => t.family === lastFamily) ? lastFamily : null;
	const family = knownFamily ?? defaultEntry?.family;

	if (!family) return defaultThemeId;

	const inFamily = themes.filter((t) => t.family === family);
	const exact = inFamily.find((t) => t.variant === want);
	if (exact) return exact.id;

	const fallback = inFamily[0];
	return fallback?.id ?? defaultThemeId;
}
