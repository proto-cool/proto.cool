import { writable } from 'svelte/store';
import { themes, type ThemeId, type Mode, DEFAULT_THEME, DEFAULT_MODE } from './registry';
import { writeCookie } from './cookies';
import { resolveTheme, resolveMode } from './resolve';

export { themes, DEFAULT_THEME, DEFAULT_MODE };
export type { ThemeId, Mode };
export { resolveTheme, resolveMode };

const THEME_COOKIE = 'proto-theme';
const MODE_COOKIE = 'proto-mode';

/**
 * Reactive store for the active theme id. Initialised from
 * document.documentElement.dataset.theme on first read in the browser; falls
 * back to DEFAULT_THEME on the server. setTheme() keeps it in sync.
 */
export const currentTheme = writable<ThemeId>(
	typeof document !== 'undefined'
		? resolveTheme(document.documentElement.dataset.theme)
		: DEFAULT_THEME
);

/**
 * Browser-only: switch to the named theme.
 * Validates against the registry. Persists to cookie + updates the dom.
 * When the View Transitions API is available the swap is wrapped in
 * document.startViewTransition() so the global ::view-transition cross-fade
 * (defined in app.css) plays automatically.
 */
export function setTheme(id: ThemeId): void {
	const apply = () => {
		const resolved = resolveTheme(id);
		writeCookie(THEME_COOKIE, resolved);
		if (typeof document !== 'undefined') {
			document.documentElement.dataset.theme = resolved;
		}
		currentTheme.set(resolved);
	};
	if (typeof document !== 'undefined') {
		const startVT = (
			document as Document & { startViewTransition?: (cb: () => unknown) => unknown }
		).startViewTransition;
		if (typeof startVT === 'function') {
			startVT.call(document, apply);
			return;
		}
	}
	apply();
}

/**
 * Browser-only: switch mode.
 * Validates. Persists to cookie + updates the dom.
 */
export function setMode(mode: Mode): void {
	const resolved = resolveMode(mode);
	writeCookie(MODE_COOKIE, resolved);
	if (typeof document !== 'undefined') {
		document.documentElement.dataset.mode = resolved;
	}
}

export const COOKIE_NAMES = {
	theme: THEME_COOKIE,
	mode: MODE_COOKIE
} as const;
