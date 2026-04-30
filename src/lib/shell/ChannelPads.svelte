<script lang="ts">
	import { page } from '$app/state';
	import { sections } from './sections';

	function isActive(href: string, pathname: string): boolean {
		if (href === '/') return pathname === '/';
		return pathname === href || pathname.startsWith(href + '/');
	}
</script>

<nav class="channels" aria-label="sections">
	{#each sections as s (s.id)}
		{@const active = isActive(s.href, page.url.pathname)}
		<a
			class="hud-btn ch"
			class:live={active}
			href={s.href}
			aria-current={active ? 'page' : undefined}
		>
			<span class="lamp" aria-hidden="true"></span>
			<span class="label">{s.label}</span>
			<span class="hud-pip" aria-hidden="true">[{s.hotkey}]</span>
		</a>
	{/each}
</nav>

<style>
	.channels {
		display: inline-flex;
		align-items: stretch;
		gap: 8px;
	}
	.ch {
		gap: 8px;
		padding: 0 12px;
	}
	.lamp {
		width: 6px;
		height: 6px;
		border-radius: 999px;
		background: var(--color-fg-mute);
		box-shadow: inset 0 0 0 1px var(--color-surface);
	}
	.ch.live .lamp {
		background: var(--color-hot);
		box-shadow:
			0 0 5px var(--color-hot),
			0 0 12px color-mix(in srgb, var(--color-warm) 70%, transparent);
	}

	/* Light mode — invert lamp color on the solid-fill active button. */
	:global([data-theme$='-light']) .ch.live .lamp {
		background: var(--color-bg);
		box-shadow: none;
	}
</style>
