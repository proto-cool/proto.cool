import { themes, DEFAULT_THEME, DEFAULT_MODE, type ThemeId, type Mode } from './registry';

const VALID_THEME_IDS = new Set<string>(themes.map((t) => t.id));
const VALID_MODES = new Set<Mode>(['dark', 'light', 'system']);

/**
 * Pure: validate a string against the theme registry.
 * Returns the input if it's a known theme id, otherwise the default.
 */
export function resolveTheme(value: string | undefined): ThemeId {
	if (value && VALID_THEME_IDS.has(value)) return value as ThemeId;
	return DEFAULT_THEME;
}

/**
 * Pure: validate a string against the allowed modes.
 * Returns the input if valid, otherwise the default.
 */
export function resolveMode(value: string | undefined): Mode {
	if (value && VALID_MODES.has(value as Mode)) return value as Mode;
	return DEFAULT_MODE;
}
