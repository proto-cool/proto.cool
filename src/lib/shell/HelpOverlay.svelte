<script lang="ts">
	import Overlay from './Overlay.svelte';
	import { commands, type CommandCategory } from './commands';

	const cats: CommandCategory[] = ['navigation', 'theme', 'prompt', 'help'];
	const grouped = cats.map((cat) => ({
		cat,
		items: commands.filter((c) => c.category === cat)
	}));
</script>

<Overlay title="help — keybinds">
	{#each grouped as g (g.cat)}
		{#if g.items.length}
			<section class="group">
				<h3 class="cat">// {g.cat}</h3>
				<ul class="rows">
					{#each g.items as c (c.id)}
						<li class="row">
							<span class="hk">[{c.hotkey}]</span>
							<span class="lbl">{c.label}</span>
						</li>
					{/each}
				</ul>
			</section>
		{/if}
	{/each}
</Overlay>

<style>
	.group + .group {
		margin-top: 12px;
	}
	.cat {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: var(--color-fg-dim);
		letter-spacing: var(--tracking-wide);
		margin: 0 0 6px;
	}
	.rows {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.row {
		display: grid;
		grid-template-columns: 60px 1fr;
		gap: 12px;
	}
	.hk {
		color: var(--color-accent);
	}
	.lbl {
		color: var(--color-fg);
	}
</style>
