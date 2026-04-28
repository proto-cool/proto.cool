<script lang="ts">
	import HeroSection from '$lib/shell/HeroSection.svelte';

	type Entry = {
		id: string;
		date: string;
		kind: 'post' | 'project' | 'note' | 'ephemera';
		title: string;
	};

	const entries: Entry[] = [
		{
			id: 'a1',
			date: '2026·04·23',
			kind: 'note',
			title: 'on the move from a static heap to atproto'
		},
		{ id: 'a2', date: '2026·04·09', kind: 'project', title: 'halogen — phosphor shell, v0.2' },
		{ id: 'a3', date: '2026·03·27', kind: 'post', title: 'building an indexed personal archive' },
		{
			id: 'a4',
			date: '2026·03·14',
			kind: 'ephemera',
			title: 'fragments, working notes, half-built things'
		},
		{ id: 'a5', date: '2026·02·28', kind: 'project', title: 'lunema sans, v.02' },
		{ id: 'a6', date: '2026·02·11', kind: 'note', title: 'shapes of records' }
	];
</script>

<svelte:head>
	<title>content · proto.cool</title>
</svelte:head>

<article class="home">
	<HeroSection
		variant="large"
		line1="a digital"
		emphasis="digital"
		line2="digest"
		ariaLabel="proto.cool — a digital digest"
		avatar="/protocol7_headshot.webp"
		avatarAlt="protocol7"
		avatarLabel="protocol7"
		avatarId="@proto.cool"
	>
		{#snippet deck()}
			i'm <b>protocol7</b>, a creative technologist with 12+ years of full-stack dev experience and
			side obsessions in type, 3d printing, and game design. this site is a working archive — the
			projects, posts, and half-built things that fall out of all of it.
		{/snippet}
	</HeroSection>

	<section class="ledger" aria-labelledby="ledger-heading">
		<header class="ledger-head">
			<p class="kicker">/// recent · index</p>
			<h2 id="ledger-heading" class="ledger-title">posts <em>&amp;</em> projects</h2>
			<span class="rule" aria-hidden="true"></span>
		</header>
		<ol class="entries">
			{#each entries as e (e.id)}
				<li class="entry">
					<time class="entry-date" datetime={e.date.replaceAll('·', '-')}>{e.date}</time>
					<span class="entry-kind" data-kind={e.kind}>{e.kind}</span>
					<a class="entry-title" href="#{e.id}">{e.title}</a>
					<span class="entry-arrow" aria-hidden="true">↗</span>
				</li>
			{/each}
		</ol>
	</section>
</article>

<style>
	.home {
		display: contents;
	}

	.ledger {
		position: relative;
		z-index: 1;
		max-width: 1100px;
		width: 100%;
		margin-inline: auto;
		padding: 12px 32px 96px;
	}
	.ledger-head {
		display: grid;
		grid-template-columns: auto auto 1fr;
		align-items: end;
		gap: 18px;
		margin-bottom: 32px;
	}
	.kicker {
		margin: 0;
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: var(--hal-dim);
	}
	.ledger-title {
		margin: 0;
		font-family: var(--font-display);
		font-weight: 800;
		font-style: normal;
		font-size: 36px;
		line-height: 0.95;
		letter-spacing: -0.025em;
		color: var(--hal-bone);
	}
	.ledger-title em {
		font-style: italic;
		color: var(--hal-warm);
	}
	.rule {
		display: block;
		height: 1px;
		background: linear-gradient(
			90deg,
			rgba(184, 255, 90, 0.25) 0,
			rgba(184, 255, 90, 0.1) 60%,
			transparent 100%
		);
		align-self: end;
		margin-bottom: 8px;
	}

	.entries {
		list-style: none;
		padding: 0;
		margin: 0;
		border-top: 1px solid var(--hal-edge);
	}
	.entry {
		display: grid;
		grid-template-columns: 110px 90px minmax(0, 1fr) auto;
		align-items: center;
		gap: 16px;
		padding: 14px 4px;
		border-bottom: 1px solid var(--hal-edge);
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		letter-spacing: 0.06em;
		transition: background var(--duration-fast, 100ms) var(--ease-out, ease);
	}
	.entry:hover {
		background: rgba(184, 255, 90, 0.04);
	}
	.entry-date {
		color: var(--hal-dim);
		text-transform: uppercase;
		letter-spacing: 0.16em;
	}
	.entry-kind {
		font-size: 10px;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: var(--hal-warm);
		border: 1px solid var(--hal-edge);
		padding: 3px 7px;
		justify-self: start;
	}
	.entry-kind[data-kind='note'] {
		color: var(--hal-cool);
	}
	.entry-kind[data-kind='ephemera'] {
		color: var(--hal-dim);
	}
	.entry-title {
		font-family: var(--font-sans);
		font-size: var(--text-sm);
		letter-spacing: 0;
		color: var(--hal-bone);
		text-decoration: none;
	}
	.entry-title:hover {
		color: var(--hal-ember);
	}
	.entry-arrow {
		color: var(--hal-dim);
		font-family: var(--font-mono);
		font-size: 12px;
	}
	.entry:hover .entry-arrow {
		color: var(--hal-hot);
	}

	@container chrome (max-width: 767px) {
		.ledger {
			padding: 8px 4px 96px;
		}
		.ledger-title {
			font-size: 26px;
		}
		.entry {
			grid-template-columns: 1fr auto;
			gap: 6px 12px;
		}
		.entry-date {
			grid-column: 1;
			grid-row: 1;
		}
		.entry-kind {
			grid-column: 2;
			grid-row: 1;
		}
		.entry-title {
			grid-column: 1 / -1;
			grid-row: 2;
		}
		.entry-arrow {
			display: none;
		}
	}
</style>
