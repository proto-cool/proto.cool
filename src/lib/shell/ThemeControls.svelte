<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Moon, Sun, Monitor, CaretDown } from 'phosphor-svelte';
	import { themes, setTheme, setMode, resolveTheme, resolveMode, type ThemeId } from '$lib/theme';
	import { themeDropdownOpen, resolveThemeFor, LAST_FAMILY_KEY } from './theme-controls';
	import type { Mode } from '$lib/theme';

	let open = $state(false);
	$effect(() => themeDropdownOpen.subscribe((v) => (open = v)));

	let rootEl: HTMLDivElement;
	let themeButtonEl: HTMLButtonElement;
	let modeButtonEl: HTMLButtonElement | undefined = $state();
	let dropdownEl: HTMLUListElement | undefined = $state();

	let currentThemeId = $state<ThemeId>(
		typeof document !== 'undefined'
			? resolveTheme(document.documentElement.dataset.theme)
			: themes[0].id
	);
	let currentMode = $state<Mode>(
		typeof document !== 'undefined'
			? resolveMode(document.documentElement.dataset.mode)
			: ('dark' as const)
	);

	let mql: MediaQueryList | null = null;

	function readLastFamily(): string | null {
		try {
			return typeof localStorage !== 'undefined' ? localStorage.getItem(LAST_FAMILY_KEY) : null;
		} catch {
			return null;
		}
	}

	function writeLastFamily(family: string) {
		try {
			localStorage.setItem(LAST_FAMILY_KEY, family);
		} catch {
			/* ignore quota / private mode */
		}
	}

	/** Apply a new mode: resolve the effective theme, persist both, update state. */
	function applyMode(nextMode: Mode) {
		const resolved = resolveThemeFor({
			mode: nextMode,
			prefersDark: !!mql?.matches,
			lastFamily: readLastFamily()
		});
		setMode(nextMode);
		setTheme(resolved as ThemeId);
		currentMode = nextMode;
		currentThemeId = resolved as ThemeId;
	}

	/** Apply a new family (without changing mode). */
	function applyFamily(family: string) {
		writeLastFamily(family);
		const resolved = resolveThemeFor({
			mode: currentMode,
			prefersDark: !!mql?.matches,
			lastFamily: family
		});
		setTheme(resolved as ThemeId);
		currentThemeId = resolved as ThemeId;
	}

	function cycleMode(): Mode {
		if (currentMode === 'dark') return 'light';
		if (currentMode === 'light') return 'system';
		return 'dark';
	}

	function closeDropdown({ restoreFocus = false }: { restoreFocus?: boolean } = {}) {
		themeDropdownOpen.set(false);
		if (restoreFocus) themeButtonEl?.focus();
	}

	function toggleDropdown() {
		themeDropdownOpen.update((v) => !v);
	}

	function onDocClick(e: MouseEvent) {
		if (!open) return;
		if (rootEl && !rootEl.contains(e.target as Node)) closeDropdown({ restoreFocus: true });
	}

	function onKeydown(e: KeyboardEvent) {
		if (!open) return;
		if (e.key === 'Escape') {
			e.preventDefault();
			closeDropdown({ restoreFocus: true });
		}
	}

	function onListboxKey(e: KeyboardEvent) {
		if (!dropdownEl) return;
		const buttons = Array.from(dropdownEl.querySelectorAll<HTMLButtonElement>('button.row'));
		const currentIndex = buttons.indexOf(document.activeElement as HTMLButtonElement);

		if (currentIndex === -1 && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
			e.preventDefault();
			buttons[0]?.focus();
			return;
		}

		if (e.key === 'ArrowDown') {
			e.preventDefault();
			const next = buttons[(currentIndex + 1 + buttons.length) % buttons.length];
			next?.focus();
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			const prev = buttons[(currentIndex - 1 + buttons.length) % buttons.length];
			prev?.focus();
		} else if (e.key === 'Tab') {
			e.preventDefault();
			closeDropdown({ restoreFocus: true });
		} else if (e.key === 'Escape') {
			e.preventDefault();
			closeDropdown({ restoreFocus: true });
		}
	}

	// Auto-focus the active family row (or first row) when dropdown opens.
	$effect(() => {
		if (!open) return;
		queueMicrotask(() => {
			if (!dropdownEl) return;
			const buttons = Array.from(dropdownEl.querySelectorAll<HTMLButtonElement>('button.row'));
			const activeIdx = families.findIndex((f) => f.family === currentEntry.family);
			const target = activeIdx >= 0 ? buttons[activeIdx] : buttons[0];
			target?.focus();
		});
	});

	onMount(() => {
		mql = window.matchMedia('(prefers-color-scheme: dark)');
		const onSchemeChange = () => {
			if (currentMode === 'system') applyMode('system');
		};
		mql.addEventListener('change', onSchemeChange);
		document.addEventListener('click', onDocClick);
		document.addEventListener('keydown', onKeydown);

		return () => {
			mql?.removeEventListener('change', onSchemeChange);
			document.removeEventListener('click', onDocClick);
			document.removeEventListener('keydown', onKeydown);
		};
	});

	onDestroy(() => {
		themeDropdownOpen.set(false);
	});

	let currentEntry = $derived(themes.find((t) => t.id === currentThemeId) ?? themes[0]);

	// Deduplicated list of families with a resolved palette for the current mode.
	let families = $derived(
		Array.from(new Map(themes.map((t) => [t.family, t])).values()).map((rep) => {
			// Find the best variant for the current effective mode.
			const effectiveVariant: 'dark' | 'light' =
				currentMode === 'system' ? (mql?.matches ? 'dark' : 'light') : currentMode;
			const best =
				themes.find((t) => t.family === rep.family && t.variant === effectiveVariant) ??
				themes.find((t) => t.family === rep.family);
			return {
				family: rep.family,
				familyName: rep.familyName,
				palette: (best ?? rep).palette
			};
		})
	);

	// aria-label for mode button
	let modeLabelCurrent = $derived(
		currentMode === 'dark' ? 'dark' : currentMode === 'light' ? 'light' : 'system'
	);
	let modeLabelNext = $derived(
		currentMode === 'dark' ? 'light' : currentMode === 'light' ? 'system' : 'dark'
	);
	let modeAriaLabel = $derived(`${modeLabelCurrent} mode (click for ${modeLabelNext})`);
</script>

<div class="theme-controls" bind:this={rootEl}>
	<!-- Mode cycle button: dark → light → system → dark -->
	<button
		type="button"
		class="ctrl mode"
		title={modeAriaLabel}
		aria-label={modeAriaLabel}
		bind:this={modeButtonEl}
		onclick={() => applyMode(cycleMode())}
	>
		<span class="icon" aria-hidden="true">
			{#if currentMode === 'dark'}
				<Moon size={14} weight="regular" />
			{:else if currentMode === 'light'}
				<Sun size={14} weight="regular" />
			{:else}
				<Monitor size={14} weight="regular" />
			{/if}
		</span>
	</button>

	<!-- Theme family dropdown trigger -->
	<button
		type="button"
		class="ctrl theme"
		class:live={open}
		aria-haspopup="listbox"
		aria-expanded={open}
		title="color family"
		aria-label="color family"
		onclick={toggleDropdown}
		bind:this={themeButtonEl}
	>
		<span class="swatch" aria-hidden="true">
			<i style="background:{currentEntry.palette.hot}"></i>
			<i style="background:{currentEntry.palette.warm}"></i>
			<i style="background:{currentEntry.palette.cool}"></i>
		</span>
		<span class="caret" aria-hidden="true"><CaretDown size={12} weight="bold" /></span>
		<span class="pip" aria-hidden="true">[t]</span>
	</button>

	{#if open}
		<ul
			class="dropdown"
			role="listbox"
			aria-label="color family"
			bind:this={dropdownEl}
			onkeydown={onListboxKey}
		>
			{#each families as f (f.family)}
				{@const active = f.family === currentEntry.family}
				<li>
					<button
						type="button"
						class="row"
						class:live={active}
						role="option"
						aria-selected={active}
						aria-label={f.familyName}
						onclick={() => {
							applyFamily(f.family);
							closeDropdown();
						}}
					>
						<span class="swatch" aria-hidden="true">
							<i style="background:{f.palette.hot}"></i>
							<i style="background:{f.palette.warm}"></i>
							<i style="background:{f.palette.cool}"></i>
						</span>
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.theme-controls {
		position: relative;
		display: inline-flex;
		align-items: stretch;
		gap: 0;
	}

	.ctrl {
		position: relative;
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 7px 10px;
		font: inherit;
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--hal-dim);
		background: rgba(0, 0, 0, 0.25);
		border: 1px solid var(--hal-edge);
		cursor: pointer;
	}
	.ctrl + .ctrl {
		border-left: none; /* shared edge with sibling — single rule between buttons */
	}
	.ctrl:hover {
		color: var(--hal-bone);
	}
	.ctrl:focus-visible {
		outline: 2px solid var(--hal-hot);
		outline-offset: 2px;
		z-index: 1;
	}
	.ctrl.live {
		color: var(--hal-bone);
		border-color: var(--hal-hot);
		background: linear-gradient(180deg, rgba(184, 255, 90, 0.18), rgba(184, 255, 90, 0.04));
		box-shadow:
			inset 0 0 16px rgba(184, 255, 90, 0.18),
			0 0 8px rgba(184, 255, 90, 0.18);
	}

	.icon {
		display: inline-flex;
		align-items: center;
	}

	.swatch {
		display: inline-flex;
		align-items: center;
		gap: 2px;
	}
	.swatch i {
		display: inline-block;
		width: 8px;
		height: 14px;
		box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.4);
	}

	.caret {
		display: inline-flex;
		align-items: center;
		opacity: 0.7;
	}

	/* pip greeble — floating tag with tether */
	.pip {
		position: absolute;
		top: -14px;
		right: 4px;
		padding: 0;
		background: none;
		border: none;
		font-family: var(--font-mono);
		font-size: 8px;
		line-height: 1;
		letter-spacing: 0.06em;
		color: var(--hal-deep-dim);
		transition: color 220ms ease;
	}
	.pip::after {
		content: '';
		position: absolute;
		top: 100%;
		left: 50%;
		transform: translateX(-50%);
		width: 1px;
		height: 6px;
		background: var(--hal-edge);
		transition: background 220ms ease;
	}
	.ctrl:hover .pip,
	.ctrl:focus-visible .pip,
	.ctrl.live .pip {
		color: var(--hal-warm);
	}
	.ctrl:hover .pip::after,
	.ctrl:focus-visible .pip::after,
	.ctrl.live .pip::after {
		background: var(--hal-warm);
	}
	@media (prefers-reduced-motion: reduce) {
		.pip,
		.pip::after {
			transition: none;
		}
	}

	/* dropdown */
	.dropdown {
		position: absolute;
		top: calc(100% + 8px);
		right: 0;
		margin: 0;
		padding: 6px;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 2px;
		background: rgba(6, 9, 6, 0.94);
		border: 1px solid var(--hal-edge);
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
		z-index: 4;
		-webkit-backdrop-filter: blur(6px) saturate(115%);
		backdrop-filter: blur(6px) saturate(115%);
	}
	.row {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 6px 8px;
		width: 100%;
		font: inherit;
		cursor: pointer;
		background: transparent;
		border: 1px solid transparent;
	}
	.row:hover {
		border-color: var(--hal-edge);
	}
	.row:focus-visible {
		outline: 2px solid var(--hal-hot);
		outline-offset: 2px;
	}
	.row.live {
		border-color: var(--hal-hot);
		background: linear-gradient(180deg, rgba(184, 255, 90, 0.18), rgba(184, 255, 90, 0.04));
		box-shadow: inset 0 0 12px rgba(184, 255, 90, 0.16);
	}
</style>
