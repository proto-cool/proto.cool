<script lang="ts">
	let {
		thumb,
		duration,
		permalink
	}: { thumb?: string; duration?: number; permalink: string } = $props();

	function fmtDuration(secs: number | undefined): string | null {
		if (typeof secs !== 'number' || !isFinite(secs)) return null;
		const s = Math.floor(secs % 60);
		const m = Math.floor(secs / 60);
		return `${m}:${s.toString().padStart(2, '0')}`;
	}
	let dur = $derived(fmtDuration(duration));
</script>

<a
	class="video"
	href={permalink}
	target="_blank"
	rel="noopener noreferrer"
	onclick={(e) => e.stopPropagation()}
>
	{#if thumb}
		<img src={thumb} alt="" loading="lazy" />
	{/if}
	<div class="play" aria-hidden="true"><span class="play-glyph">▶</span></div>
	{#if dur}
		<span class="dur">{dur}</span>
	{/if}
</a>

<style>
	.video {
		position: relative;
		display: block;
		aspect-ratio: 16 / 9;
		border: 1px solid var(--color-edge);
		background: var(--shell-veil);
		overflow: hidden;
	}
	.video img { width: 100%; height: 100%; object-fit: cover; display: block; }
	.play {
		position: absolute; inset: 0;
		display: flex; align-items: center; justify-content: center;
	}
	.play-glyph {
		display: flex; align-items: center; justify-content: center;
		width: 56px; height: 56px;
		border: 1px solid var(--color-fg);
		background: rgba(10, 14, 10, 0.5);
		color: var(--color-fg);
		font-size: 18px;
	}
	.dur {
		position: absolute;
		bottom: 8px; right: 8px;
		background: rgba(10, 14, 10, 0.85);
		border: 1px solid var(--color-edge);
		color: var(--color-fg);
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.12em;
		padding: 2px 6px;
	}
</style>
