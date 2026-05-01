import { readable, type Readable } from 'svelte/store';
import { browser } from '$app/environment';

const QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Reactive boolean: does the OS request reduced motion?
 * - SSR: defaults to `false` (motion enabled).
 * - Client: tracks the live media query.
 */
export const prefersReducedMotion: Readable<boolean> = readable(false, (set) => {
    if (!browser) return;
    const mql = window.matchMedia(QUERY);
    set(mql.matches);
    const onChange = (e: MediaQueryListEvent) => set(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
});
