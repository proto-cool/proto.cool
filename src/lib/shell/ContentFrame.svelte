<script lang="ts">
	import { page } from '$app/state';
	import { sections } from './sections';
	import { pwdForPath } from './runtime';

	let { children } = $props();

	let pwd = $derived(pwdForPath(page.url.pathname));
	let stamp = $derived.by(() => {
		const path = page.url.pathname;
		if (path === '/') return 'tail -f';
		if (path.startsWith('/projects')) return 'ls -al';
		if (path.startsWith('/about')) return 'cat readme';
		return 'pwd';
	});
	let entriesLabel = $derived.by(() => {
		const s = sections.find((x) => x.href === page.url.pathname || page.url.pathname.startsWith(x.href + '/'));
		return s ? `index · ${s.label}` : 'index';
	});
</script>

<section class="content-frame">
	<div class="reading-window">
		<header class="crumb-strip" aria-hidden="true">
			<span class="crumb-pwd">{pwd}</span>
			<span class="crumb-meta">— {entriesLabel}</span>
			<span class="crumb-spacer"></span>
			<span class="crumb-stamp">[{stamp}]</span>
		</header>
		<hr class="crumb-divider" />
		<div class="reading-content">
			{@render children()}
		</div>
	</div>
</section>

<style>
	.content-frame {
		flex: 1;
		display: flex;
		flex-direction: column;
		border: 1px solid var(--color-accent);
		background: var(--color-surface);
		box-shadow: var(--glow-edge);
		min-height: 360px;
	}
	.reading-window {
		max-width: 660px;
		width: 100%;
		margin: 0 auto;
		padding: 32px 24px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	@container chrome (max-width: 767px) {
		.reading-window {
			padding: 18px 16px;
		}
	}

	.crumb-strip {
		display: flex;
		align-items: baseline;
		gap: 6px;
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: var(--color-fg-dim);
		letter-spacing: var(--tracking-wide);
	}
	.crumb-pwd {
		color: var(--color-accent);
	}
	.crumb-meta {
		color: var(--color-fg-mute);
	}
	.crumb-spacer {
		flex: 1;
	}
	.crumb-stamp {
		background: var(--color-accent);
		color: var(--color-on-accent);
		padding: 2px 6px;
		letter-spacing: var(--tracking-wide);
	}
	.crumb-divider {
		border: none;
		border-top: 1px solid color-mix(in srgb, var(--color-accent) 30%, transparent);
		margin: 0;
	}

	.reading-content :global(h1) {
		font-family: var(--font-display);
		font-weight: var(--weight-black);
		letter-spacing: var(--tracking-tight);
	}
</style>
