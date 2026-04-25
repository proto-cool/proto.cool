import { readable } from 'svelte/store';

const SPARK_FRAMES = ['▁▂▃▅▇▅▃▂', '▂▃▅▇▅▃▂▁', '▃▅▇▅▃▂▁▂', '▅▇▅▃▂▁▂▃', '▇▅▃▂▁▂▃▅'];

export const signalSparkline = readable(SPARK_FRAMES[0], (set) => {
	if (typeof window === 'undefined') return;
	let i = 0;
	const id = setInterval(() => set(SPARK_FRAMES[(i = (i + 1) % SPARK_FRAMES.length)]), 600);
	return () => clearInterval(id);
});

export const cursorCoords = readable('1,1');
export const editorMode = readable('normal');

export const linkInfo = { rxTx: '42 / 07', conn: 3 } as const;

export const recTimer = readable('0:42:11', (set) => {
	if (typeof window === 'undefined') return;
	const start = Date.now();
	const id = setInterval(() => {
		const s = Math.floor((Date.now() - start) / 1000);
		const h = Math.floor(s / 3600);
		const m = String(Math.floor(s / 60) % 60).padStart(2, '0');
		const ss = String(s % 60).padStart(2, '0');
		set(`${h}:${m}:${ss}`);
	}, 1000);
	return () => clearInterval(id);
});
