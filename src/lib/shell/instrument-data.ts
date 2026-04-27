import { readable, type Readable } from 'svelte/store';

/**
 * Cosmetic instrument-cluster readouts.
 *
 * These are not real network telemetry — they're decorative typography
 * elements that make the InstrumentCluster panel feel alive. Keep small
 * and colocated. If real telemetry ever lands, replace these in place.
 */

const SPARK_FRAMES = ['▁▂▃▅▇▅▃▂', '▂▃▅▇▅▃▂▁', '▃▅▇▅▃▂▁▂', '▅▇▅▃▂▁▂▃', '▇▅▃▂▁▂▃▅'];

export const signalSparkline: Readable<string> = readable(SPARK_FRAMES[0], (set) => {
	if (typeof window === 'undefined') return;
	let i = 0;
	const id = setInterval(() => set(SPARK_FRAMES[(i = (i + 1) % SPARK_FRAMES.length)]), 600);
	return () => clearInterval(id);
});

export const linkInfo = { rxTx: '12 / 04', conn: 4 } as const;
