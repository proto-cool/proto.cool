<script lang="ts">
	import { page } from '$app/state';
	import { sections, utilities } from './sections';
	import { openOverlay } from './overlay';
	import type { OverlayKind } from './overlay';

	const utilityOverlay: Record<string, OverlayKind> = {
		themes: 'theme',
		help: 'help'
	};

	function isActive(href: string): boolean {
		if (href === '/') return page.url.pathname === '/';
		return page.url.pathname === href || page.url.pathname.startsWith(href + '/');
	}
</script>

<nav class="nav-tabs" aria-label="primary">
	<div class="tabs">
		{#each sections as s (s.id)}
			{@const active = isActive(s.href)}
			<a
				class="tab"
				class:active
				href={s.href}
				aria-current={active ? 'page' : undefined}
				data-id={s.id}
			>
				<span class="hk" aria-hidden="true">[{s.hotkey}]</span>
				<span class="label">{s.label}</span>
				{#if active}<span class="active-dot" aria-hidden="true">*</span>{/if}
			</a>
		{/each}

		<span class="spacer"></span>

		{#each utilities as u (u.id)}
			<button
				type="button"
				class="tab utility"
				onclick={() => openOverlay(utilityOverlay[u.id])}
				data-id={u.id}
				aria-haspopup="dialog"
			>
				<span class="hk" aria-hidden="true">[{u.hotkey}]</span>
				<span class="label">{u.label}</span>
			</button>
		{/each}
	</div>
</nav>

<style>
	.nav-tabs {
		display: block;
	}
	.tabs {
		display: flex;
		align-items: end;
		gap: 4px;
	}
	.spacer {
		flex: 1;
	}
	.tab {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 6px 12px;
		font-family: var(--font-mono);
		font-size: var(--text-sm);
		color: var(--color-fg-dim);
		background: color-mix(in srgb, var(--color-accent) 10%, transparent);
		border: 1px solid color-mix(in srgb, var(--color-accent) 35%, transparent);
		border-bottom: none;
		text-decoration: none;
		cursor: pointer;
		letter-spacing: var(--tracking-wide);
		position: relative;
		top: 1px;
	}
	.tab.active {
		background: var(--color-bg);
		color: var(--color-fg);
		border-color: var(--color-accent);
		top: 0;
	}
	.tab.utility {
		background: transparent;
	}
	.tab:hover {
		color: var(--color-fg);
	}
	.tab:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}
	.hk {
		color: var(--color-fg-mute);
	}
	.active-dot {
		color: var(--color-accent-2);
		text-shadow: var(--glow-text);
	}

	@container chrome (max-width: 767px) {
		.hk {
			display: none;
		}
	}
</style>
