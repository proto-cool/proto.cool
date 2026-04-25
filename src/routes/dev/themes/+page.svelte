<!-- src/routes/dev/themes/+page.svelte -->
<script lang="ts">
	import { themes, setTheme, setMode, type ThemeId, type Mode } from '$lib/theme';
	import { FRAME, STATUS, CURSOR, PROMPT } from '$lib/theme/glyphs';

	let { data } = $props();

	// Track active selections locally so the picker reflects clicks immediately.
	// (setTheme/setMode update the dom dataset and write the cookie, but data.theme
	// from the server load doesn't refresh without a reload.)
	let currentTheme = $state<ThemeId>(data.theme);
	let currentMode = $state<Mode>(data.mode);

	function applyTheme(id: ThemeId) {
		setTheme(id);
		currentTheme = id;
	}

	function applyMode(m: Mode) {
		setMode(m);
		currentMode = m;
	}

	const modes: Mode[] = ['dark', 'light', 'system'];

	const colorTokens = [
		'--color-bg',
		'--color-surface',
		'--color-surface-2',
		'--color-edge',
		'--color-fg',
		'--color-fg-dim',
		'--color-fg-mute',
		'--color-accent',
		'--color-accent-2',
		'--color-on-accent',
		'--color-link',
		'--color-link-visited',
		'--color-focus',
		'--color-ok',
		'--color-warn',
		'--color-error',
		'--color-info'
	];

	const textSizes = [
		{ name: 'xs', token: '--text-xs' },
		{ name: 'sm', token: '--text-sm' },
		{ name: 'base', token: '--text-base' },
		{ name: 'md', token: '--text-md' },
		{ name: 'lg', token: '--text-lg' },
		{ name: 'xl', token: '--text-xl' },
		{ name: '2xl', token: '--text-2xl' }
	];

	const displaySizes = [
		{ name: 'sm', token: '--display-sm' },
		{ name: 'md', token: '--display-md' },
		{ name: 'lg', token: '--display-lg' },
		{ name: 'xl', token: '--display-xl' }
	];
</script>

<svelte:head>
	<title>theme test · proto.cool</title>
</svelte:head>

<div class="page">
	<header class="picker">
		<div class="picker-row">
			<span class="picker-label">THEME</span>
			{#each themes as t (t.id)}
				<button
					class="picker-btn"
					class:active={currentTheme === t.id}
					onclick={() => applyTheme(t.id as ThemeId)}>{t.name}</button
				>
			{/each}
		</div>
		<div class="picker-row">
			<span class="picker-label">MODE</span>
			{#each modes as m (m)}
				<button class="picker-btn" class:active={currentMode === m} onclick={() => applyMode(m)}
					>{m}</button
				>
			{/each}
		</div>
		<div class="picker-row">
			<span class="picker-label">CURRENT</span>
			<code>{currentTheme} / {currentMode}</code>
		</div>
	</header>

	<section class="block">
		<h2>Logomark</h2>
		<div class="logomark">
			<span class="logo-prompt">{PROMPT.shell}</span>
			<span class="logo-mark">proto.cool</span>
			<span class="logo-cursor"></span>
		</div>
	</section>

	<section class="block">
		<h2>Frame chrome panel</h2>
		<pre class="frame">
{FRAME.tl}{FRAME.h.repeat(2)} TELEMETRY {FRAME.h.repeat(20)}{FRAME.tr}
{FRAME.v}  STATUS    <span class="ok">{STATUS.ok}</span> nominal       {FRAME.v}
{FRAME.v}  UPLINK    <span class="ok">{STATUS.ok}</span> stable        {FRAME.v}
{FRAME.v}  AT-PROTO  <span class="ok">{STATUS.ok}</span> connected     {FRAME.v}
{FRAME.v}  CACHE     <span class="warn">{STATUS.warn}</span>  warming       {FRAME.v}
{FRAME.bl}{FRAME.h.repeat(33)}{FRAME.br}</pre>
	</section>

	<section class="block">
		<h2>Buttons</h2>
		<div class="row">
			<button class="btn-knockout">[ RUN ]</button>
			<button class="btn-ghost">[ FOCUS ME ]</button>
			<button class="btn-idle">[ IDLE ]</button>
		</div>
	</section>

	<section class="block">
		<h2>Body text</h2>
		<p>
			Streaming from <a href="#">at://protocol7.computer/cool.proto.post/3kdj…</a> — last update
			<span class="accent">14s</span> ago<span class="cursor-blink">{CURSOR.block}</span>
		</p>
		<p class="dim">Secondary text in <code>--color-fg-dim</code>.</p>
		<p class="mute">Tertiary text in <code>--color-fg-mute</code> — UI only.</p>
	</section>

	<section class="block">
		<h2>Type scale — body/UI tier</h2>
		{#each textSizes as t (t.token)}
			<div class="type-row" style="font-size: var({t.token})">
				{t.name} — The quick brown fox jumps over the lazy dog
			</div>
		{/each}
	</section>

	<section class="block">
		<h2>Type scale — display tier</h2>
		{#each displaySizes as t (t.token)}
			<div class="display-row" style="font-size: var({t.token})">
				display-{t.name}
			</div>
		{/each}
	</section>

	<section class="block">
		<h2>Status indicators</h2>
		<div class="row mono">
			<span class="ok">{STATUS.ok}</span>
			<span class="warn">{STATUS.warn}</span>
			<span class="err">{STATUS.err}</span>
			<span class="info">{STATUS.info}</span>
			<span class="accent">{STATUS.dot}</span>
		</div>
	</section>

	<section class="block">
		<h2>Color tokens</h2>
		<div class="swatches">
			{#each colorTokens as token (token)}
				<div class="swatch">
					<div class="swatch-chip" style="background: var({token})"></div>
					<code>{token}</code>
				</div>
			{/each}
		</div>
	</section>

	<section class="block">
		<h2>Glow tokens applied</h2>
		<div class="row">
			<span class="glow-text-sample">--glow-text on accent text</span>
		</div>
		<div class="row">
			<div class="glow-edge-sample">--glow-edge on a panel</div>
		</div>
	</section>

	<section class="block bg-scanline" style="--scanline-opacity: 0.04">
		<h2>.bg-scanline utility</h2>
		<p>Scanlines visible at 4% opacity for demonstration. Default is 1.2%.</p>
	</section>

	<section class="block">
		<h2>Character cell calibration</h2>
		<p>
			A row of 30 monospace characters should align to 30 cell widths. If the green grid and the
			chars don't match exactly, adjust <code>--cell-w</code> in
			<code>tokens.css</code>.
		</p>
		<div class="cell-calib">
			<div class="cell-grid"></div>
			<div class="cell-mono">123456789012345678901234567890</div>
		</div>
	</section>
</div>

<style>
	.page {
		max-width: 920px;
		margin: 0 auto;
		padding: var(--space-8);
		font-family: var(--font-sans);
		font-size: var(--text-base);
		line-height: var(--leading-body);
	}

	.picker {
		position: sticky;
		top: 0;
		background: var(--color-surface);
		padding: var(--space-4);
		margin-bottom: var(--space-8);
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		/* Border keeps the picker framed in light mode where --glow-edge is none */
		border-bottom: 1px solid var(--color-edge);
		box-shadow: var(--glow-edge);
		z-index: var(--z-raised);
	}
	.picker-row {
		display: flex;
		gap: var(--space-3);
		align-items: center;
		font-family: var(--font-mono);
		font-size: var(--text-sm);
	}
	.picker-label {
		color: var(--color-fg-mute);
		min-width: 80px;
		letter-spacing: var(--tracking-wide);
	}
	.picker-btn {
		font-family: var(--font-mono);
		font-size: var(--text-sm);
		padding: var(--space-1) var(--space-3);
		background: transparent;
		color: var(--color-fg);
		border: 1px solid var(--color-edge);
		cursor: pointer;
		letter-spacing: var(--tracking-wide);
	}
	.picker-btn.active {
		background: var(--color-accent);
		color: var(--color-on-accent);
		border-color: var(--color-accent);
	}

	.block {
		margin-bottom: var(--space-12);
		padding-top: var(--space-4);
		border-top: 1px solid var(--color-edge);
	}
	.block h2 {
		font-family: var(--font-mono);
		font-size: var(--text-sm);
		color: var(--color-fg-dim);
		letter-spacing: var(--tracking-wide);
		text-transform: uppercase;
		margin-bottom: var(--space-4);
	}

	.row {
		display: flex;
		gap: var(--space-4);
		align-items: center;
		flex-wrap: wrap;
	}
	.row.mono {
		font-family: var(--font-mono);
		font-size: var(--text-base);
	}

	.logomark {
		display: inline-flex;
		align-items: center;
		gap: var(--space-3);
	}
	.logo-prompt {
		font-family: var(--font-mono);
		color: var(--color-accent);
		font-size: var(--text-2xl);
		line-height: 1;
		text-shadow: var(--glow-text);
	}
	.logo-mark {
		background: var(--color-accent);
		color: var(--color-on-accent);
		font-family: var(--font-display);
		font-weight: var(--weight-black);
		font-size: var(--text-xl);
		padding: var(--space-2) var(--space-3);
		letter-spacing: var(--tracking-tight);
		line-height: 1;
		box-shadow: var(--glow-edge);
	}
	.logo-cursor {
		display: inline-block;
		background: var(--color-accent);
		width: 14px;
		height: var(--text-2xl);
		box-shadow: var(--glow-edge);
		animation: var(--glow-pulse);
	}

	.frame {
		font-family: var(--font-mono);
		font-size: var(--text-sm);
		color: var(--color-accent);
		line-height: 1.4;
		margin: 0;
		text-shadow: var(--glow-text);
	}

	.btn-knockout {
		font-family: var(--font-mono);
		font-weight: var(--weight-bold);
		font-size: var(--text-sm);
		background: var(--color-accent);
		color: var(--color-on-accent);
		border: 0;
		padding: var(--space-2) var(--space-4);
		letter-spacing: var(--tracking-wide);
		box-shadow: var(--glow-edge);
		cursor: pointer;
	}
	.btn-ghost {
		font-family: var(--font-mono);
		font-weight: var(--weight-bold);
		font-size: var(--text-sm);
		background: transparent;
		color: var(--color-accent);
		border: 1px solid var(--color-accent);
		padding: var(--space-2) var(--space-4);
		letter-spacing: var(--tracking-wide);
		cursor: pointer;
	}
	.btn-idle {
		font-family: var(--font-mono);
		font-weight: var(--weight-bold);
		font-size: var(--text-sm);
		background: transparent;
		color: var(--color-fg-mute);
		border: 1px solid var(--color-edge);
		padding: var(--space-2) var(--space-4);
		letter-spacing: var(--tracking-wide);
		cursor: pointer;
	}

	.accent {
		color: var(--color-accent);
		text-shadow: var(--glow-text);
	}
	.dim {
		color: var(--color-fg-dim);
	}
	.mute {
		color: var(--color-fg-mute);
	}
	.ok {
		color: var(--color-ok);
	}
	.warn {
		color: var(--color-warn);
	}
	.err {
		color: var(--color-error);
	}
	.info {
		color: var(--color-info);
	}

	.cursor-blink {
		display: inline-block;
		color: var(--color-accent);
		animation: var(--glow-pulse);
		margin-left: 2px;
	}

	.type-row {
		font-family: var(--font-sans);
		margin-bottom: var(--space-2);
		line-height: var(--leading-snug);
	}
	.display-row {
		font-family: var(--font-display);
		font-weight: var(--weight-black);
		line-height: var(--leading-tight);
		letter-spacing: var(--tracking-tight);
		margin-bottom: var(--space-4);
	}

	.swatches {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
		gap: var(--space-3);
	}
	.swatch {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}
	.swatch-chip {
		aspect-ratio: 2 / 1;
		border: 1px solid var(--color-edge);
	}
	.swatch code {
		font-size: var(--text-xs);
	}

	.glow-text-sample {
		font-family: var(--font-display);
		font-weight: var(--weight-black);
		font-size: var(--text-xl);
		color: var(--color-accent);
		text-shadow: var(--glow-text);
	}
	.glow-edge-sample {
		padding: var(--space-4);
		background: var(--color-surface);
		color: var(--color-fg);
		font-family: var(--font-mono);
		box-shadow: var(--glow-edge);
	}

	.cell-calib {
		position: relative;
		display: inline-block;
	}
	.cell-grid {
		position: absolute;
		inset: 0;
		background-image: repeating-linear-gradient(
			90deg,
			rgba(91, 250, 91, 0.2) 0,
			rgba(91, 250, 91, 0.2) 1px,
			transparent 1px,
			transparent var(--cell-w)
		);
	}
	.cell-mono {
		font-family: var(--font-mono);
		font-size: 16px;
		color: var(--color-fg);
		white-space: pre;
	}
</style>
