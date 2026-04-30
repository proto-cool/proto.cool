import os from 'node:os';
import type { DB } from './db';
import type { Source } from './config';
import { getFirehoseState } from './firehose';

type Tier = 'recent' | 'week' | 'month' | 'archive';

export type CronTierStatus = {
	lastRunAt: string | null;
	failures: number;
};

export type SystemSnapshot = {
	process: {
		uptimeSec: number;
		memRssMb: number;
		loadavg: [number, number, number];
	};
	firehose: {
		connected: boolean;
		lastSeq: number | null;
		lagSec: number | null;
	};
	cron: Record<Tier, Record<Extract<Source, 'bsky' | 'grain'>, CronTierStatus>>;
	db: {
		records: number;
		engagement: number;
		pending: number;
		sizeBytes: number;
	};
	buildSig: string;
};

const TIERS: readonly Tier[] = ['recent', 'week', 'month', 'archive'];
const ENGAGEMENT_SOURCES: ReadonlyArray<'bsky' | 'grain'> = ['bsky', 'grain'];

function readState(db: DB, key: string): string | null {
	const row = db
		.prepare(`SELECT value FROM state WHERE key = ?`)
		.get(key) as { value: string } | undefined;
	return row?.value ?? null;
}

function emptyCronStatus(): SystemSnapshot['cron'] {
	const out = {} as SystemSnapshot['cron'];
	for (const t of TIERS) {
		out[t] = {} as SystemSnapshot['cron'][Tier];
		for (const s of ENGAGEMENT_SOURCES) {
			out[t][s] = { lastRunAt: null, failures: 0 };
		}
	}
	return out;
}

function readCronStatus(db: DB): SystemSnapshot['cron'] {
	const out = emptyCronStatus();
	for (const t of TIERS) {
		for (const s of ENGAGEMENT_SOURCES) {
			out[t][s] = {
				lastRunAt: readState(db, `cron.${t}.${s}.last_run`),
				failures: Number(readState(db, `cron.${s}.failures`) ?? 0)
			};
		}
	}
	return out;
}

declare const __BUILD_SHA__: string;

export function getSystemSnapshot(db: DB): SystemSnapshot {
	const lastSeqRaw = readState(db, 'firehose.last_seq');
	const parsedSeq = lastSeqRaw !== null ? Number(lastSeqRaw) : null;
	const lastSeq = parsedSeq !== null && Number.isFinite(parsedSeq) ? parsedSeq : null;

	const counts = db
		.prepare(
			`SELECT
			  (SELECT COUNT(*) FROM records)                       AS records,
			  (SELECT COUNT(*) FROM engagement)                    AS engagement,
			  (SELECT COUNT(*) FROM records WHERE status='pending') AS pending`
		)
		.get() as { records: number; engagement: number; pending: number };

	const pageSizeRow = db.pragma('page_size', { simple: true }) as number;
	const pageCountRow = db.pragma('page_count', { simple: true }) as number;
	const sizeBytes = pageSizeRow * pageCountRow;

	const memRssMb = process.memoryUsage().rss / (1024 * 1024);
	const [l1, l5, l15] = os.loadavg();

	return {
		process: {
			uptimeSec: process.uptime(),
			memRssMb,
			loadavg: [l1, l5, l15]
		},
		firehose: (() => {
			const fh = getFirehoseState();
			const lagSec =
				fh.lastEventAtMs !== null
					? Math.max(0, (Date.now() - fh.lastEventAtMs) / 1000)
					: null;
			return {
				connected: fh.connected,
				lastSeq: fh.lastSeq ?? lastSeq,
				lagSec
			};
		})(),
		cron: readCronStatus(db),
		db: {
			records: counts.records,
			engagement: counts.engagement,
			pending: counts.pending,
			sizeBytes
		},
		// `__BUILD_SHA__` is defined by vite.config.ts and inlined at build time.
		// Same source as the existing chrome.system.sig — we relocate it here
		// so the system snapshot owns the field going forward.
		buildSig: __BUILD_SHA__.toUpperCase().slice(0, 4)
	};
}
