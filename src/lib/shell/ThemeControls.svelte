<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Monitor, CaretDown } from 'phosphor-svelte';
	import { themes, setTheme, setMode, resolveTheme, resolveMode, type ThemeId } from '$lib/theme';
	import { themeDropdownOpen, resolveSysTheme, LAST_FAMILY_KEY } from './theme-controls';

	let open = $state(false);
	$effect(() => themeDropdownOpen.subscribe((v) => (open = v)));

	let rootEl: HTMLDivElement;
	let themeButtonEl: HTMLButtonElement;
	let dropdownEl: HTMLUListElement | undefined = $state();

	let currentThemeId = $state<ThemeId>(
		typeof document !== 'undefined'
			? resolveTheme(document.documentElement.dataset.theme)
			: themes[0].id
	);
	let currentMode = $state(
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

	function applyTheme(id: ThemeId, opts: { remember: boolean }) {
		const entry = themes.find((t) => t.id === id);
		if (!entry) return;
		setTheme(id);
		setMode(entry.variant);
		currentThemeId = id;
		currentMode = entry.variant;
		if (opts.remember) writeLastFamily(entry.family);
	}

	function applySys() {
		setMode('system');
		currentMode = 'system';
		const lastFamily = readLastFamily();
		const resolved = resolveSysTheme({
			prefersDark: !!mql?.matches,
			lastFamily
		});
		setTheme(resolved as ThemeId);
		currentThemeId = resolved as ThemeId;
	}

	function closeDropdown({ restoreFocus = false }: { restoreFocus?: boolean } = {}) {
		themeDropdownOpen.set(false);
		if (restoreFocus) themeButtonEl?.focus();
	}

	function pickRow(id: ThemeId) {
		applyTheme(id, { remember: true });
		closeDropdown();
	}

	function toggleSys() {
		if (currentMode === 'system') {
			applyTheme(currentThemeId, { remember: false });
		} else {
			applySys();
		}
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

	$effect(() => {
		if (!open) return;
		queueMicrotask(() => {
			if (!dropdownEl) return;
			const buttons = Array.from(dropdownEl.querySelectorAll<HTMLButtonElement>('button.row'));
			const activeIdx = themes.findIndex(
				(t) => t.id === currentThemeId && currentMode !== 'system'
			);
			const target = activeIdx >= 0 ? buttons[activeIdx] : buttons[0];
			target?.focus();
		});
	});

	onMount(() => {
		mql = window.matchMedia('(prefers-color-scheme: dark)');
		const onSchemeChange = () => {
			if (currentMode === 'system') applySys();
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
		// store-only side-effect: ensure dropdown closes if the component unmounts open
		themeDropdownOpen.set(false);
	});

	let currentEntry = $derived(themes.find((t) => t.id === currentThemeId) ?? themes[0]);
	let sysActive = $derived(currentMode === 'system');
</script>

<div class="theme-controls" bind:this={rootEl}>
	<button
		type="button"
		class="ctrl sys"
		class:live={sysActive}
		aria-pressed={sysActive}
		title="follow OS color scheme"
		aria-label="follow OS color scheme"
		onclick={toggleSys}
	>
		<span class="icon" aria-hidden="true"><Monitor size={14} weight="regular" /></span>
	</button>

	<button
		type="button"
		class="ctrl theme"
		class:live={open}
		aria-haspopup="listbox"
		aria-expanded={open}
		title={currentEntry.familyName + ' · ' + currentEntry.variant}
		aria-label="theme"
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
			aria-label="theme"
			bind:this={dropdownEl}
			onkeydown={onListboxKey}
		>
			{#each themes as t (t.id)}
				{@const active = t.id === currentThemeId && currentMode !== 'system'}
				<li>
					<button
						type="button"
						class="row"
						class:live={active}
						role="option"
						aria-selected={active}
						onclick={() => pickRow(t.id)}
					>
						<span class="swatch" aria-hidden="true">
							<i style="background:{t.palette.hot}"></i>
							<i style="background:{t.palette.warm}"></i>
							<i style="background:{t.palette.cool}"></i>
						</span>
						<span class="name">{t.familyName}</span>
						<span class="tag">· {t.variant === 'dark' ? 'DK' : 'LT'}</span>
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

	/* corner pip — same treatment as ChannelPads */
	.pip {
		position: absolute;
		top: -1px;
		right: -1px;
		padding: 1px 4px;
		font-family: var(--font-mono);
		font-size: 9px;
		line-height: 1;
		letter-spacing: 0.08em;
		color: var(--hal-deep-dim);
		background: rgba(6, 9, 6, 0.7);
		border-left: 1px solid var(--hal-edge);
		border-bottom: 1px solid var(--hal-edge);
		transition:
			color 220ms ease,
			text-shadow 220ms ease;
	}
	.ctrl:hover .pip,
	.ctrl:focus-visible .pip,
	.ctrl.live .pip {
		color: var(--hal-hot);
		text-shadow: 0 0 8px rgba(184, 255, 90, 0.5);
	}
	@media (prefers-reduced-motion: reduce) {
		.pip {
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
		min-width: 100%;
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
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--hal-dim);
		background: transparent;
		border: 1px solid transparent;
		cursor: pointer;
		text-align: left;
	}
	.row:hover {
		color: var(--hal-bone);
		border-color: var(--hal-edge);
	}
	.row:focus-visible {
		outline: 2px solid var(--hal-hot);
		outline-offset: 2px;
	}
	.row.live {
		color: var(--hal-bone);
		border-color: var(--hal-hot);
		background: linear-gradient(180deg, rgba(184, 255, 90, 0.18), rgba(184, 255, 90, 0.04));
		box-shadow: inset 0 0 12px rgba(184, 255, 90, 0.16);
	}
	.row .name {
		color: inherit;
	}
	.row .tag {
		color: var(--hal-cool);
	}
</style>
