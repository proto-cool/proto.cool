<script lang="ts">
	import { page } from '$app/state';
	import { pwdForPath } from './runtime';
	import { commands } from './commands';
	import { openOverlay } from './overlay';

	let pwd = $derived(pwdForPath(page.url.pathname));
</script>

<div class="prompt-bar">
	<button
		type="button"
		class="chip pwd"
		aria-label={`current directory ${pwd}`}
		onclick={() => openOverlay('command-stub')}
	>
		<span aria-hidden="true">$</span>
		<span>{pwd}</span>
	</button>

	<div class="chip search-cmd">
		<button type="button" class="inline-action" onclick={() => openOverlay('search-stub')}>
			<span aria-hidden="true">/</span> search
		</button>
		<span class="sep" aria-hidden="true">·</span>
		<button type="button" class="inline-action" onclick={() => openOverlay('command-stub')}>
			<span aria-hidden="true">:</span> cmd
		</button>
	</div>

	<span class="dock-spacer"></span>

	<ul class="keybind-dock" aria-label="keybinds">
		{#each commands as c (c.id)}
			<li class="kb">
				<button type="button" class="inline-action" onclick={c.run} aria-label={c.label}>
					<span aria-hidden="true">[{c.hotkey}]</span>
				</button>
			</li>
		{/each}
	</ul>
</div>

<style>
	.prompt-bar {
		display: flex;
		align-items: center;
		gap: 8px;
		font-family: var(--font-mono);
		font-size: var(--text-sm);
	}
	.chip {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 4px 10px;
		border: 1px solid color-mix(in srgb, var(--color-accent) 55%, transparent);
		background: color-mix(in srgb, var(--color-bg) 70%, transparent);
		color: var(--color-fg);
		cursor: pointer;
		letter-spacing: var(--tracking-wide);
	}
	.chip.pwd {
		color: var(--color-accent);
	}
	.chip.search-cmd {
		border-color: color-mix(in srgb, var(--color-accent-2) 75%, transparent);
		color: var(--color-accent-2);
	}
	.inline-action {
		background: none;
		border: 0;
		font: inherit;
		color: inherit;
		cursor: pointer;
		padding: 0;
		letter-spacing: inherit;
	}
	.inline-action:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}
	.sep {
		color: var(--color-fg-mute);
	}
	.dock-spacer {
		flex: 1;
	}
	.keybind-dock {
		display: flex;
		gap: 4px;
		list-style: none;
		padding: 0;
		margin: 0;
		color: var(--color-fg-mute);
	}
	.kb .inline-action {
		padding: 2px 6px;
		border: 1px solid var(--color-edge);
	}

	@container chrome (max-width: 767px) {
		.keybind-dock {
			gap: 2px;
		}
	}
</style>
