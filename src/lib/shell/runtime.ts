import { writable, derived, type Readable } from 'svelte/store';
import { sections } from './sections';

const SITE_ORIGIN = new Date('2026-04-24T00:00:00Z');

const now = writable(new Date());
let interval: ReturnType<typeof setInterval> | null = null;

export function startRuntimeTicks(): void {
	if (interval) return;
	interval = setInterval(() => now.set(new Date()), 1000);
}

export function stopRuntimeTicks(): void {
	if (interval) {
		clearInterval(interval);
		interval = null;
	}
}

export const clock: Readable<{ date: string; time: string }> = derived(now, ($n) => ({
	date: $n.toISOString().slice(0, 10),
	time: $n.toTimeString().slice(0, 8)
}));

export const uptime: Readable<string> = derived(now, ($n) => {
	const ms = Math.max(0, $n.getTime() - SITE_ORIGIN.getTime());
	const d = Math.floor(ms / 86_400_000);
	const h = Math.floor((ms % 86_400_000) / 3_600_000);
	const m = Math.floor((ms % 3_600_000) / 60_000);
	return `${d}d ${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`;
});

// Derived from sections.ts so the registry stays the single source of truth.
export function pwdForPath(pathname: string): string {
	for (const s of sections) {
		if (s.href === '/') {
			if (pathname === '/') return s.pwd;
			continue;
		}
		if (pathname === s.href || pathname.startsWith(s.href + '/')) return s.pwd;
	}
	return '~' + pathname;
}
