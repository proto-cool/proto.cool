<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Moon, Sun, Monitor, CaretDown } from 'phosphor-svelte';
	import { themes, setTheme, setMode, resolveTheme, resolveMode, type ThemeId } from '$lib/theme';
	import {
		themeDropdownOpen,
		cycleModeRequest,
		resolveThemeFor,
		LAST_FAMILY_KEY
	} from './theme-controls';
	import type { Mode } from '$lib/theme';

	let open = $state(false);
	$effect(() => themeDropdownOpen.subscribe((v) => (open = v)));

	// External `m` hotkey pokes the request store; first emission is the
	// store's initial value, so skip it.
	let cycleSubscribed = false;
	$effect(() =>
		cycleModeRequest.subscribe(() => {
			if (!cycleSubscribed) {
				cycleSubscribed = true;
				return;
			}
			applyMode(cycleMode());
		})
	);

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
		class="hud-btn ctrl mode"
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
		<span class="hud-pip" aria-hidden="true">[m]</span>
	</button>

	<!-- Theme family dropdown trigger -->
	<button
		type="button"
		class="hud-btn ctrl theme"
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
		<span class="hud-pip" aria-hidden="true">[t]</span>
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
						<span class="row-name">{f.familyName}</span>
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
		gap: 6px;
		padding: 0 10px;
	}
	.ctrl + .ctrl {
		margin-left: -1px; /* collapse adjacent borders into a single shared rule */
	}
	/* Lift hover/active/focus/live above sibling so the border highlight isn't clipped. */
	.ctrl:hover,
	.ctrl:focus-visible,
	.ctrl:active,
	.ctrl.live {
		z-index: 1;
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
		background: color-mix(in srgb, var(--color-bg) 94%, transparent);
		border: 1px solid var(--color-edge);
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
		z-index: 4;
		-webkit-backdrop-filter: blur(6px) saturate(115%);
		backdrop-filter: blur(6px) saturate(115%);
		transform-origin: top right;
		animation: dropdown-in 140ms cubic-bezier(0.2, 0, 0, 1);
	}
	@keyframes dropdown-in {
		from {
			opacity: 0;
			transform: translateY(-4px) scaleY(0.92);
		}
		to {
			opacity: 1;
			transform: translateY(0) scaleY(1);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.dropdown {
			animation: none;
		}
	}
	.row {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		padding: 6px 8px;
		width: 100%;
		font: inherit;
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-fg-dim);
		cursor: pointer;
		background: transparent;
		border: 1px solid transparent;
		white-space: nowrap;
		transition:
			color 120ms ease,
			border-color 120ms ease,
			background-color 120ms ease,
			box-shadow 120ms ease,
			transform 80ms ease;
	}
	.row-name {
		flex: 1 1 auto;
		text-align: left;
	}
	.row:hover {
		color: var(--color-fg);
		border-color: var(--color-edge);
	}
	.row:active {
		transform: translateY(1px);
		box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.4);
	}
	.row:focus-visible {
		outline: 2px solid var(--color-hot);
		outline-offset: 2px;
	}
	.row.live {
		color: var(--color-fg);
		border-color: var(--color-hot);
		background: linear-gradient(180deg, color-mix(in srgb, var(--color-hot) 18%, transparent), color-mix(in srgb, var(--color-hot) 4%, transparent));
		box-shadow: inset 0 0 12px color-mix(in srgb, var(--color-hot) 16%, transparent);
	}
	@media (prefers-reduced-motion: reduce) {
		.row {
			transition: none;
		}
		.row:active {
			transform: none;
		}
	}

	/* Light mode — punch through. No dark veils, no lime halos. */
	:global([data-theme$='-light']) .swatch i {
		box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.5);
	}
	:global([data-theme$='-light']) .dropdown {
		background: var(--color-bg);
		box-shadow: 0 8px 24px color-mix(in srgb, var(--color-fg) 18%, transparent);
	}
	:global([data-theme$='-light']) .row.live {
		background: var(--color-hot);
		box-shadow: none;
	}
</style>
