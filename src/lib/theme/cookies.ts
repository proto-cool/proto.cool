/**
 * Pure cookie-string parser. Works in any environment.
 * Returns the value of the named cookie, or undefined if absent.
 */
export function parseCookieValue(cookieString: string, name: string): string | undefined {
	if (!cookieString) return undefined;
	const parts = cookieString.split(';');
	for (const part of parts) {
		const trimmed = part.trim();
		const eq = trimmed.indexOf('=');
		if (eq === -1) continue;
		const key = trimmed.slice(0, eq);
		if (key === name) return trimmed.slice(eq + 1);
	}
	return undefined;
}

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * Browser-only: write a cookie via document.cookie.
 * Not unit-tested — validated via the dev test route.
 */
export function writeCookie(name: string, value: string): void {
	if (typeof document === 'undefined') return;
	document.cookie = `${name}=${value}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
}
