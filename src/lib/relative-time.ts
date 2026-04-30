// Relative time formatting: "just now", "5m", "3h", "2d", "Apr 12", "Dec 1 2024".
// Boundaries match what bsky / twitter use; thresholds are deliberately generous
// (e.g. <60s = "just now") so the value doesn't tick visibly when the clock store
// updates every few seconds.

const MONTHS = [
	'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
	'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const SEC = 1000;
const MIN = 60 * SEC;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

export function relativeTime(iso: string, nowMs: number = Date.now()): string {
	const t = Date.parse(iso);
	const diff = nowMs - t;
	if (diff < MIN) return 'just now';
	if (diff < HOUR) return `${Math.floor(diff / MIN)}m`;
	if (diff < DAY) return `${Math.floor(diff / HOUR)}h`;
	if (diff < WEEK) return `${Math.floor(diff / DAY)}d`;
	if (diff < MONTH) return `${Math.floor(diff / WEEK)}w`;
	const d = new Date(t);
	const month = MONTHS[d.getUTCMonth()];
	const day = d.getUTCDate();
	if (diff < YEAR) return `${month} ${day}`;
	return `${month} ${day} ${d.getUTCFullYear()}`;
}
