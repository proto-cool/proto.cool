import { writable, derived, type Readable } from 'svelte/store';
import { sections } from './sections';

const SITE_ORIGIN = new Date('2026-04-24T00:00:00Z');

// Local-time day-of-year (1–366). Operates on calendar fields rather than ms
// arithmetic so DST transitions don't shift the result by a day.
export function dayOfYear(d: Date): number {
	const yr = d.getFullYear();
	const isLeap = (yr % 4 === 0 && yr % 100 !== 0) || yr % 400 === 0;
	const monthDays = isLeap
		? [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
		: [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
	const m = d.getMonth();
	let total = d.getDate();
	for (let i = 0; i < m; i++) total += monthDays[i];
	return total;
}

export const now = writable(new Date());
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

// Both fields use the viewer's local clock — mixing UTC date with local time
// would surface as off-by-a-day in the chrome cluster around midnight.
export const clock: Readable<{ date: string; time: string }> = derived(now, ($n) => {
	const pad = (n: number) => String(n).padStart(2, '0');
	return {
		date: `${$n.getFullYear()}-${pad($n.getMonth() + 1)}-${pad($n.getDate())}`,
		time: `${pad($n.getHours())}:${pad($n.getMinutes())}:${pad($n.getSeconds())}`
	};
});

export const uptime: Readable<string> = derived(now, ($n) => {
	const ms = Math.max(0, $n.getTime() - SITE_ORIGIN.getTime());
	const d = Math.floor(ms / 86_400_000);
	const h = Math.floor((ms % 86_400_000) / 3_600_000);
	const m = Math.floor((ms % 3_600_000) / 60_000);
	return `${d}d ${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`;
});

// Stardate readout: year + day-of-year, derived from `now` so it ticks alongside
// the clock. `doyLabel` is zero-padded to 3 chars (always renders as `D###`).
export const stardate: Readable<{ year: number; doy: number; doyLabel: string }> = derived(
	now,
	($n) => {
		const doy = dayOfYear($n);
		return {
			year: $n.getFullYear(),
			doy,
			doyLabel: String(doy).padStart(3, '0')
		};
	}
);

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
