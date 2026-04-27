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
			class="ch"
			class:live={active}
			href={s.href}
			aria-current={active ? 'page' : undefined}
		>
			<span class="lamp" aria-hidden="true"></span>
			<span class="label">{s.label}</span>
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
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 7px 12px;
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--hal-dim);
		border: 1px solid var(--hal-edge);
		background: rgba(0, 0, 0, 0.25);
		text-decoration: none;
	}
	.ch:hover {
		color: var(--hal-bone);
	}
	.ch:focus-visible {
		outline: 2px solid var(--hal-hot);
		outline-offset: 2px;
	}
	.lamp {
		width: 6px;
		height: 6px;
		border-radius: 999px;
		background: var(--hal-deep-dim);
		box-shadow: inset 0 0 0 1px #0a0c0a;
	}
	.live {
		color: var(--hal-bone);
		border-color: var(--hal-hot);
		background: linear-gradient(180deg, rgba(184, 255, 90, 0.18), rgba(184, 255, 90, 0.04));
		box-shadow:
			inset 0 0 16px rgba(184, 255, 90, 0.18),
			0 0 8px rgba(184, 255, 90, 0.18);
	}
	.live .lamp {
		background: var(--hal-hot);
		box-shadow:
			0 0 5px var(--hal-hot),
			0 0 12px rgba(130, 227, 75, 0.7);
	}
</style>
