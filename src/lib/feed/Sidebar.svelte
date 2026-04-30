<script lang="ts">
	// Placeholder sidebar. Lives next to the feed on the home page. Content
	// is intentionally minimal until the operator decides what belongs here
	// (candidates: a "now" panel, a tag cloud, a vital-stats block, links to
	// the operator's bsky profile, etc).
</script>

<aside class="sidebar" aria-label="sidebar">
	<section class="block">
		<header class="kicker">/// now</header>
		<p class="body">
			currently building <em>proto.cool</em> in public on the at protocol — the
			home page you're reading is the live feed.
		</p>
	</section>

	<section class="block">
		<header class="kicker">/// links</header>
		<ul class="links">
			<li><a href="https://bsky.app/profile/proto.cool" target="_blank" rel="noopener noreferrer">bsky · @proto.cool</a></li>
			<li><a href="https://github.com/" target="_blank" rel="noopener noreferrer">github</a></li>
		</ul>
	</section>
</aside>

<style>
	.sidebar {
		display: flex;
		flex-direction: column;
		gap: 22px;
		position: sticky;
		top: 96px;
		align-self: start;
	}
	.block {
		background: var(--shell-veil);
		border: 1px solid var(--color-edge);
		padding: 16px 18px 18px;
	}
	.kicker {
		font-family: var(--font-mono);
		font-size: 13px;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: var(--color-fg-dim);
		margin: 0 0 14px;
		padding-bottom: 12px;
		border-bottom: 1px solid var(--color-edge);
	}
	.body {
		font-size: var(--text-sm);
		line-height: 1.6;
		color: var(--color-fg);
		margin: 0;
	}
	.body em {
		color: var(--color-warm);
		font-style: italic;
	}
	.links {
		list-style: none;
		padding: 0;
		margin: 0;
		font-family: var(--font-mono);
		font-size: 13px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}
	.links li { padding: 6px 0; }
	.links a {
		color: var(--color-fg-dim);
		text-decoration: none;
	}
	.links a:hover { color: var(--color-warm); }
</style>
