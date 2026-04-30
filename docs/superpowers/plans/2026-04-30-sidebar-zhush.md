# Sidebar Zhush Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder sidebar with two purpose-built blocks (`/// pulse` auto-derived stats + `/// elsewhere` 2×3 icon grid), and add a `/feed.xml` RSS endpoint that the elsewhere block links to.

**Architecture:** Pulse data is computed server-side in a new `src/lib/server/pulse.ts` and passed via the home page loader. Sidebar component reads pulse data as a prop and the active theme from a small new `currentTheme` store. Elsewhere block is a static 2×3 grid of `<a>` cells using `phosphor-svelte` icons (already installed) plus the existing custom `BskyIcon` and a Lunema-italic `at://` text glyph for the atproto cell.

**Tech Stack:** SvelteKit (Svelte 5 runes), TypeScript, better-sqlite3, vitest, phosphor-svelte. Spec: `docs/superpowers/specs/2026-04-30-sidebar-zhush-design.md`.

---

## File Structure

**New files:**
- `src/lib/server/pulse.ts` — `getPulseStats(db)` + `PulseStats` type
- `src/lib/server/pulse.test.ts` — vitest unit tests
- `src/routes/feed.xml/+server.ts` — RSS 2.0 endpoint
- `src/routes/feed.xml/feed.test.ts` — vitest unit tests for the RSS builder (pure function)
- `src/lib/feed/Sidebar.elsewhere.svelte` — *not* a separate file; everything lives in `Sidebar.svelte` (kept here for clarity, the grid is a `<section>` inside the same component)

**Modified files:**
- `src/lib/theme/index.ts` — add a `currentTheme` writable store, update `setTheme` to keep it in sync
- `src/lib/feed/Sidebar.svelte` — full rewrite (new content, props, styles)
- `src/routes/+page.server.ts` — call `getPulseStats`, return `pulse`
- `src/routes/+page.svelte` — pass `pulse={data.pulse}` to `<Sidebar>`

**Untouched (verify):**
- `src/lib/relative-time.ts` — used as-is (no changes)
- `src/lib/feed/BskyIcon.svelte` — used as-is

---

## Task 1: Add `currentTheme` reactive store to the theme module

**Files:**
- Modify: `src/lib/theme/index.ts`

**Why:** The pulse block needs to read the active theme name reactively (live-updates when the user flips themes via `ThemeControls`). Today the active theme is stored only on `document.documentElement.dataset.theme`; there's no shared store. Adding a tiny writable in `index.ts` keeps `setTheme()` as the single mutation point.

- [ ] **Step 1: Read the current `src/lib/theme/index.ts` to confirm shape**

Run: `cat src/lib/theme/index.ts`
Expected: A small file with `setTheme(id)` and `setMode(mode)` exports.

- [ ] **Step 2: Add the store and wire `setTheme` to update it**

Replace the contents of `src/lib/theme/index.ts` with:

```ts
import { writable } from 'svelte/store';
import { themes, type ThemeId, type Mode, DEFAULT_THEME, DEFAULT_MODE } from './registry';
import { writeCookie } from './cookies';
import { resolveTheme, resolveMode } from './resolve';

export { themes, DEFAULT_THEME, DEFAULT_MODE };
export type { ThemeId, Mode };
export { resolveTheme, resolveMode };

const THEME_COOKIE = 'proto-theme';
const MODE_COOKIE = 'proto-mode';

/**
 * Reactive store for the active theme id. Initialised from
 * document.documentElement.dataset.theme on first read in the browser; falls
 * back to DEFAULT_THEME on the server. setTheme() keeps it in sync.
 */
export const currentTheme = writable<ThemeId>(
	(typeof document !== 'undefined'
		? resolveTheme(document.documentElement.dataset.theme)
		: DEFAULT_THEME) as ThemeId
);

/**
 * Browser-only: switch to the named theme.
 * Validates against the registry. Persists to cookie + updates the dom.
 */
export function setTheme(id: ThemeId): void {
	const resolved = resolveTheme(id);
	writeCookie(THEME_COOKIE, resolved);
	if (typeof document !== 'undefined') {
		document.documentElement.dataset.theme = resolved;
	}
	currentTheme.set(resolved as ThemeId);
}

/**
 * Browser-only: switch mode.
 * Validates. Persists to cookie + updates the dom.
 */
export function setMode(mode: Mode): void {
	const resolved = resolveMode(mode);
	writeCookie(MODE_COOKIE, resolved);
	if (typeof document !== 'undefined') {
		document.documentElement.dataset.mode = resolved;
	}
}

export const COOKIE_NAMES = {
	theme: THEME_COOKIE,
	mode: MODE_COOKIE
} as const;
```

- [ ] **Step 3: Run typecheck to verify nothing broke**

Run: `npm run check`
Expected: PASS (no new errors). If existing errors are present, only verify there are no *new* ones introduced by this edit.

- [ ] **Step 4: Run the existing theme tests**

Run: `npm run test:unit -- --run src/lib/theme`
Expected: PASS — registry/resolve tests still green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/theme/index.ts
git commit -m "theme: expose currentTheme as a reactive store"
```

---

## Task 2: `getPulseStats` server function (TDD)

**Files:**
- Create: `src/lib/server/pulse.ts`
- Create: `src/lib/server/pulse.test.ts`

**Why:** Source of truth for the four pulse data points (`lastPost`, `lastBlog`, `posts`, `blogs`). Mirrors the shape of `getFeatured` (small focused module, single export).

- [ ] **Step 1: Write the failing test file**

Create `src/lib/server/pulse.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { openDatabase, runMigrations, type DB } from './db';
import { getPulseStats } from './pulse';

function makeDb(): DB {
	const db = openDatabase(':memory:');
	runMigrations(db);
	return db;
}

function insertRecord(
	db: DB,
	opts: {
		uri: string;
		collection: string;
		createdAt: string;
		kind?: 'owned' | 'external';
		status?: 'ok' | 'pending' | 'error';
	}
) {
	db.prepare(
		`INSERT INTO records (uri, did, collection, rkey, cid, kind, status, value, created_at, indexed_at)
		 VALUES (?, 'did:x', ?, 'k', 'c', ?, ?, '{}', ?, ?)`
	).run(
		opts.uri,
		opts.collection,
		opts.kind ?? 'owned',
		opts.status ?? 'ok',
		opts.createdAt,
		opts.createdAt
	);
}

describe('getPulseStats', () => {
	let db: DB;
	beforeEach(() => {
		db = makeDb();
	});

	it('returns zeros and nulls on an empty db', () => {
		expect(getPulseStats(db)).toEqual({
			lastPost: null,
			lastBlog: null,
			posts: 0,
			blogs: 0
		});
	});

	it('counts owned posts (bsky collections), excludes blogs from the count', () => {
		insertRecord(db, {
			uri: 'at://x/app.bsky.feed.post/a',
			collection: 'app.bsky.feed.post',
			createdAt: '2026-04-30T10:00:00Z'
		});
		insertRecord(db, {
			uri: 'at://x/app.bsky.feed.repost/b',
			collection: 'app.bsky.feed.repost',
			createdAt: '2026-04-29T10:00:00Z'
		});
		insertRecord(db, {
			uri: 'at://x/site.standard.document/c',
			collection: 'site.standard.document',
			createdAt: '2026-04-28T10:00:00Z'
		});

		const stats = getPulseStats(db);
		expect(stats.posts).toBe(2);
		expect(stats.blogs).toBe(1);
	});

	it('reports the newest non-blog timestamp as lastPost', () => {
		insertRecord(db, {
			uri: 'at://x/app.bsky.feed.post/old',
			collection: 'app.bsky.feed.post',
			createdAt: '2026-01-01T00:00:00Z'
		});
		insertRecord(db, {
			uri: 'at://x/app.bsky.feed.post/new',
			collection: 'app.bsky.feed.post',
			createdAt: '2026-04-30T12:00:00Z'
		});
		insertRecord(db, {
			uri: 'at://x/site.standard.document/blog',
			collection: 'site.standard.document',
			createdAt: '2026-04-30T18:00:00Z' // newer but a blog — must not be lastPost
		});

		expect(getPulseStats(db).lastPost).toBe('2026-04-30T12:00:00Z');
	});

	it('reports the newest blog timestamp as lastBlog', () => {
		insertRecord(db, {
			uri: 'at://x/site.standard.document/old',
			collection: 'site.standard.document',
			createdAt: '2026-01-01T00:00:00Z'
		});
		insertRecord(db, {
			uri: 'at://x/site.standard.document/new',
			collection: 'site.standard.document',
			createdAt: '2026-04-30T18:00:00Z'
		});

		expect(getPulseStats(db).lastBlog).toBe('2026-04-30T18:00:00Z');
	});

	it('ignores non-owned records (external subjects of reposts/quotes)', () => {
		insertRecord(db, {
			uri: 'at://other/app.bsky.feed.post/x',
			collection: 'app.bsky.feed.post',
			createdAt: '2026-04-30T20:00:00Z',
			kind: 'external'
		});

		const stats = getPulseStats(db);
		expect(stats.posts).toBe(0);
		expect(stats.lastPost).toBeNull();
	});

	it('ignores non-ok status rows', () => {
		insertRecord(db, {
			uri: 'at://x/app.bsky.feed.post/pending',
			collection: 'app.bsky.feed.post',
			createdAt: '2026-04-30T20:00:00Z',
			status: 'pending'
		});

		expect(getPulseStats(db).posts).toBe(0);
	});
});
```

- [ ] **Step 2: Run tests to verify they fail (module doesn't exist yet)**

Run: `npm run test:unit -- --run src/lib/server/pulse.test.ts`
Expected: FAIL — `Cannot find module './pulse'`.

- [ ] **Step 3: Implement `getPulseStats`**

Create `src/lib/server/pulse.ts`:

```ts
// Auto-derived snapshot for the home sidebar's `/// pulse` block. Counts
// and latest-timestamps of owned records, split into "posts" (bsky-side
// collections) vs "blogs" (standard.site documents). Cheap — four scalar
// queries against the records table, all hitting the (status, kind, ...)
// index. Called once per home-page load.

import { collectionsForSource } from './config';
import type { DB } from './db';

export type PulseStats = {
	lastPost: string | null; // ISO 8601 of newest non-blog owned record
	lastBlog: string | null; // ISO 8601 of newest blog owned record
	posts: number;
	blogs: number;
};

export function getPulseStats(db: DB): PulseStats {
	const blogCollections = collectionsForSource('standard');
	if (blogCollections.length === 0) {
		// Should never happen with the current config — guard anyway so the
		// IN clause stays valid.
		return { lastPost: null, lastBlog: null, posts: 0, blogs: 0 };
	}
	const blogPlaceholders = blogCollections.map(() => '?').join(', ');

	const lastPostRow = db
		.prepare(
			`SELECT MAX(created_at) AS ts FROM records
			 WHERE kind = 'owned' AND status = 'ok'
			   AND collection NOT IN (${blogPlaceholders})`
		)
		.get(...blogCollections) as { ts: string | null };

	const lastBlogRow = db
		.prepare(
			`SELECT MAX(created_at) AS ts FROM records
			 WHERE kind = 'owned' AND status = 'ok'
			   AND collection IN (${blogPlaceholders})`
		)
		.get(...blogCollections) as { ts: string | null };

	const postsRow = db
		.prepare(
			`SELECT COUNT(*) AS n FROM records
			 WHERE kind = 'owned' AND status = 'ok'
			   AND collection NOT IN (${blogPlaceholders})`
		)
		.get(...blogCollections) as { n: number };

	const blogsRow = db
		.prepare(
			`SELECT COUNT(*) AS n FROM records
			 WHERE kind = 'owned' AND status = 'ok'
			   AND collection IN (${blogPlaceholders})`
		)
		.get(...blogCollections) as { n: number };

	return {
		lastPost: lastPostRow.ts,
		lastBlog: lastBlogRow.ts,
		posts: postsRow.n,
		blogs: blogsRow.n
	};
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit -- --run src/lib/server/pulse.test.ts`
Expected: PASS — all six tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/pulse.ts src/lib/server/pulse.test.ts
git commit -m "server: add getPulseStats for the home sidebar"
```

---

## Task 3: Wire pulse data into the home loader

**Files:**
- Modify: `src/routes/+page.server.ts`

- [ ] **Step 1: Add the import and call**

Edit `src/routes/+page.server.ts`. Add `import { getPulseStats } from '$lib/server/pulse';` near the other server imports, and update the `load` function to compute + return `pulse`:

```ts
import type { PageServerLoad } from './$types';
import { getDb } from '$lib/server/bootstrap';
import { getFeedPage } from '$lib/server/feed';
import { getFeatured } from '$lib/server/featured';
import { getPulseStats } from '$lib/server/pulse';
import { parseFeedQuery, feedQueryToInput } from '$lib/server/feed-params';
import { hydrateSubjectHandles } from '$lib/server/hydrate-handles';
import { getOwnerDidFromState, getPdsHost } from '$lib/server/config';

export const load: PageServerLoad = async ({ url }) => {
	const db = getDb();
	const q = parseFeedQuery(url.searchParams);

	// Featured is pinned content — stays visible across every filter so
	// changing source/sort doesn't yank an item out from the top of the
	// page. Always exclude its URI from the stream so the row never
	// appears twice and offsets stay aligned across pages.
	const featuredForExclude = getFeatured(db);
	const featured = q.page === 1 ? featuredForExclude : null;

	const stream = getFeedPage(
		db,
		feedQueryToInput(q, {
			exclude: featuredForExclude ? [featuredForExclude.uri] : []
		})
	);
	hydrateSubjectHandles(db, stream.items);

	const ownerDid = getOwnerDidFromState(db) ?? '';
	const blobCtx = { ownerDid, pdsHost: getPdsHost() };

	const pulse = getPulseStats(db);

	return { featured, stream, blobCtx, query: q, pulse };
};
```

- [ ] **Step 2: Typecheck**

Run: `npm run check`
Expected: PASS — `data.pulse` is now a `PulseStats` on the page.

- [ ] **Step 3: Commit**

```bash
git add src/routes/+page.server.ts
git commit -m "loader: surface pulse stats on home page"
```

---

## Task 4: Rewrite Sidebar component — `/// pulse` block

**Files:**
- Modify: `src/lib/feed/Sidebar.svelte`
- Modify: `src/routes/+page.svelte` (pass `pulse` prop)

**Note:** Task 4 introduces the new component shape and the pulse block. Task 5 adds the elsewhere block to the same file.

- [ ] **Step 1: Replace `Sidebar.svelte` with the pulse-only version**

Overwrite `src/lib/feed/Sidebar.svelte` with:

```svelte
<script lang="ts">
	import { currentTheme } from '$lib/theme';
	import { relativeTime } from '$lib/relative-time';
	import type { PulseStats } from '$lib/server/pulse';

	let { pulse }: { pulse: PulseStats } = $props();

	// `relativeTime` returns an absolute date for old entries; for the pulse
	// block's tight rhythm we want a uniformly short value. Fall back to '—'
	// when missing.
	function fmt(ts: string | null): string {
		if (!ts) return '—';
		return relativeTime(ts);
	}
</script>

<aside class="sidebar" aria-label="sidebar">
	<section class="block">
		<header class="kicker">/// pulse</header>
		<dl class="pulse">
			<dt>last post</dt>
			<dd>{fmt(pulse.lastPost)}</dd>

			<dt>last blog</dt>
			<dd>{fmt(pulse.lastBlog)}</dd>

			<dt>posts</dt>
			<dd>{pulse.posts}</dd>

			<dt>blogs</dt>
			<dd>{pulse.blogs}</dd>

			<dt>theme</dt>
			<dd>{$currentTheme}</dd>
		</dl>
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

	.pulse {
		display: grid;
		grid-template-columns: 8ch 1fr;
		gap: 7px 14px;
		margin: 0;
		font-family: var(--font-mono);
	}
	.pulse dt {
		font-size: 11px;
		letter-spacing: 0.16em;
		text-transform: lowercase;
		color: var(--color-fg-dim);
		align-self: baseline;
	}
	.pulse dd {
		margin: 0;
		font-size: 13px;
		color: var(--color-fg);
		align-self: baseline;
	}
</style>
```

- [ ] **Step 2: Pass `pulse` from the home page**

Edit `src/routes/+page.svelte`. Find the `<Sidebar />` line at the bottom of the `<div class="layout">` block and change it to:

```svelte
<Sidebar pulse={data.pulse} />
```

- [ ] **Step 3: Typecheck**

Run: `npm run check`
Expected: PASS — pulse prop matches `PulseStats`.

- [ ] **Step 4: Visual smoke-test in dev server**

Run: `npm run dev` (background)
Open: `http://localhost:5173/`
Expected: Sidebar shows a `/// pulse` block with five rows. `last post` / `last blog` show short relative times (e.g. `2h`, `3d`), `posts` / `blogs` show integers, `theme` shows the active theme id (e.g. `halogen-dark`). Flip themes via `ThemeControls` — `theme` row updates live.

- [ ] **Step 5: Commit**

```bash
git add src/lib/feed/Sidebar.svelte src/routes/+page.svelte
git commit -m "sidebar: replace placeholder with /// pulse readout"
```

---

## Task 5: Add `/// elsewhere` 2×3 icon grid to Sidebar

**Files:**
- Modify: `src/lib/feed/Sidebar.svelte`

- [ ] **Step 1: Add the elsewhere block markup, imports, and styles**

Edit `src/lib/feed/Sidebar.svelte`. Update the `<script lang="ts">` block to add the icon imports:

```svelte
<script lang="ts">
	import { currentTheme } from '$lib/theme';
	import { relativeTime } from '$lib/relative-time';
	import type { PulseStats } from '$lib/server/pulse';
	import {
		GithubLogo,
		RssSimple,
		EnvelopeSimple,
		SteamLogo
	} from 'phosphor-svelte';
	import BskyIcon from './BskyIcon.svelte';

	let { pulse }: { pulse: PulseStats } = $props();

	function fmt(ts: string | null): string {
		if (!ts) return '—';
		return relativeTime(ts);
	}
</script>
```

Add a second `<section class="block">` after the existing pulse one, inside `<aside>`:

```svelte
	<section class="block">
		<header class="kicker">/// elsewhere</header>
		<div class="grid" role="list">
			<a class="cell" role="listitem" href="https://bsky.app/profile/proto.cool" target="_blank" rel="noopener noreferrer">
				<span class="icon"><BskyIcon /></span>
				<span class="label">bsky</span>
			</a>
			<a class="cell" role="listitem" href="https://github.com/proto-cool" target="_blank" rel="noopener noreferrer">
				<span class="icon"><GithubLogo size={24} weight="regular" /></span>
				<span class="label">gh</span>
			</a>
			<a class="cell" role="listitem" href="https://atproto-browser.vercel.app/at/proto.cool" target="_blank" rel="noopener noreferrer">
				<span class="icon icon-text">at://</span>
				<span class="label">atp</span>
			</a>
			<a class="cell" role="listitem" href="/feed.xml">
				<span class="icon"><RssSimple size={24} weight="regular" /></span>
				<span class="label">rss</span>
			</a>
			<a class="cell" role="listitem" href="mailto:nduncan@fastmail.com">
				<span class="icon"><EnvelopeSimple size={24} weight="regular" /></span>
				<span class="label">mail</span>
			</a>
			<a class="cell" role="listitem" href="https://steamcommunity.com/id/Protocol7/" target="_blank" rel="noopener noreferrer">
				<span class="icon"><SteamLogo size={24} weight="regular" /></span>
				<span class="label">steam</span>
			</a>
		</div>
	</section>
```

Append to the `<style>` block:

```css
	/* Collapsed-border control panel: each cell carries its own 1px border.
	   Negative gap on the grid + matching outer border on .grid would also
	   work; this is simpler and reads cleanly on hover. */
	.grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0;
	}
	.cell {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 14px 8px;
		border: 1px solid var(--color-edge);
		text-decoration: none;
		color: inherit;
		transition: color 100ms ease;
		/* Avoid the doubled-border effect by collapsing shared edges. */
		margin: -0.5px 0 0 -0.5px;
	}
	.cell:focus-visible {
		outline: 2px solid var(--color-cool);
		outline-offset: -2px;
	}
	.cell .icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 24px;
		color: var(--color-fg-dim);
		transition: color 100ms ease;
	}
	.cell .icon-text {
		font-family: var(--font-display);
		font-style: italic;
		font-size: 22px;
		line-height: 1;
	}
	.cell .label {
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.16em;
		text-transform: lowercase;
		color: var(--color-fg-dim);
		transition: color 100ms ease;
	}
	.cell:hover .icon { color: var(--color-warm); }
	.cell:hover .label { color: var(--color-fg); }
```

- [ ] **Step 2: Typecheck**

Run: `npm run check`
Expected: PASS.

- [ ] **Step 3: Visual smoke-test in dev server**

Run: `npm run dev` (background — reuse from Task 4 if still running)
Open: `http://localhost:5173/`
Verify:
- `/// elsewhere` block renders below `/// pulse`
- 2 rows × 3 columns, square-ish cells, single 1px border between cells (no doubled lines)
- Hover any cell: icon → warm color, label → bright fg
- Tab to a cell: visible cool-colored focus ring
- Click `bsky` → opens bsky in new tab
- Click `rss` → 404 (expected; `/feed.xml` is Task 6)
- `at://` cell shows in Lunema italic, sized to match adjacent icons

- [ ] **Step 4: Cross-theme smoke-test**

Cycle through all themes via `ThemeControls` (halogen, frost, mono, sodium, outrun) and confirm:
- Borders, fg-dim, warm, cool all read correctly per theme
- No theme leaves the icons invisible on its background

- [ ] **Step 5: Commit**

```bash
git add src/lib/feed/Sidebar.svelte
git commit -m "sidebar: add /// elsewhere icon grid"
```

---

## Task 6: `/feed.xml` RSS endpoint (TDD)

**Files:**
- Create: `src/routes/feed.xml/+server.ts`
- Create: `src/lib/server/rss.ts` — pure function `buildRssFeed(items, opts)` so the XML build can be unit-tested without a SvelteKit harness
- Create: `src/lib/server/rss.test.ts`

**Why:** The elsewhere block links to `/feed.xml`. Splitting the XML builder into a pure module keeps the route handler thin and the logic testable.

- [ ] **Step 1: Write failing tests for `buildRssFeed`**

Create `src/lib/server/rss.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildRssFeed, type RssItem } from './rss';

const SITE = {
	title: 'proto.cool',
	link: 'https://proto.cool',
	description: 'a public log',
	owner: 'proto.cool'
};

describe('buildRssFeed', () => {
	it('emits an XML document with channel metadata', () => {
		const xml = buildRssFeed([], SITE);
		expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
		expect(xml).toContain('<rss version="2.0">');
		expect(xml).toContain('<title>proto.cool</title>');
		expect(xml).toContain('<link>https://proto.cool</link>');
		expect(xml).toContain('<description>a public log</description>');
	});

	it('includes one <item> per input', () => {
		const items: RssItem[] = [
			{
				title: 'a',
				link: 'https://proto.cool/p/a',
				guid: 'at://x/app.bsky.feed.post/a',
				pubDate: '2026-04-30T10:00:00Z',
				description: 'first'
			},
			{
				title: 'b',
				link: 'https://proto.cool/p/b',
				guid: 'at://x/app.bsky.feed.post/b',
				pubDate: '2026-04-29T10:00:00Z',
				description: 'second'
			}
		];
		const xml = buildRssFeed(items, SITE);
		expect(xml.match(/<item>/g)?.length).toBe(2);
		expect(xml).toContain('<title>a</title>');
		expect(xml).toContain('<title>b</title>');
	});

	it('escapes XML-unsafe characters in item content', () => {
		const items: RssItem[] = [
			{
				title: 'foo & bar <baz>',
				link: 'https://proto.cool/p/x',
				guid: 'at://x/app.bsky.feed.post/x',
				pubDate: '2026-04-30T10:00:00Z',
				description: 'a "quoted" thing'
			}
		];
		const xml = buildRssFeed(items, SITE);
		expect(xml).toContain('foo &amp; bar &lt;baz&gt;');
		expect(xml).not.toContain('<baz>'); // raw form must not appear
		expect(xml).toContain('&quot;quoted&quot;');
	});

	it('formats pubDate as RFC 822', () => {
		const items: RssItem[] = [
			{
				title: 't',
				link: 'https://proto.cool/p/t',
				guid: 'g',
				pubDate: '2026-04-30T10:00:00Z',
				description: 'd'
			}
		];
		const xml = buildRssFeed(items, SITE);
		// new Date('2026-04-30T10:00:00Z').toUTCString() ===
		// 'Thu, 30 Apr 2026 10:00:00 GMT'
		expect(xml).toContain('<pubDate>Thu, 30 Apr 2026 10:00:00 GMT</pubDate>');
	});
});
```

- [ ] **Step 2: Run tests to verify they fail (module doesn't exist)**

Run: `npm run test:unit -- --run src/lib/server/rss.test.ts`
Expected: FAIL — `Cannot find module './rss'`.

- [ ] **Step 3: Implement `buildRssFeed`**

Create `src/lib/server/rss.ts`:

```ts
// RSS 2.0 builder. Pure function — takes pre-shaped items and channel
// metadata, returns an XML string. The route handler at /feed.xml does
// the records-table → RssItem mapping.

export type RssItem = {
	title: string;
	link: string;
	guid: string;
	pubDate: string; // ISO 8601 in, RFC 822 out
	description: string;
};

export type RssChannel = {
	title: string;
	link: string;
	description: string;
	owner: string;
};

function escapeXml(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

function rfc822(iso: string): string {
	return new Date(iso).toUTCString();
}

export function buildRssFeed(items: RssItem[], channel: RssChannel): string {
	const itemXml = items
		.map(
			(it) => `
		<item>
			<title>${escapeXml(it.title)}</title>
			<link>${escapeXml(it.link)}</link>
			<guid isPermaLink="false">${escapeXml(it.guid)}</guid>
			<pubDate>${rfc822(it.pubDate)}</pubDate>
			<description>${escapeXml(it.description)}</description>
		</item>`
		)
		.join('');

	return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
	<channel>
		<title>${escapeXml(channel.title)}</title>
		<link>${escapeXml(channel.link)}</link>
		<description>${escapeXml(channel.description)}</description>
		<language>en</language>${itemXml}
	</channel>
</rss>
`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit -- --run src/lib/server/rss.test.ts`
Expected: PASS — all four tests green.

- [ ] **Step 5: Implement the `/feed.xml` route handler**

Create `src/routes/feed.xml/+server.ts`:

```ts
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/bootstrap';
import { getFeed } from '$lib/server/feed';
import { buildRssFeed, type RssItem } from '$lib/server/rss';

const CHANNEL = {
	title: 'proto.cool',
	link: 'https://proto.cool',
	description: 'a public log of programming, making, and whatever else catches my eye.',
	owner: 'proto.cool'
};

const TITLE_FALLBACK_LEN = 64;

function itemTitle(value: unknown): string {
	if (value && typeof value === 'object') {
		const v = value as Record<string, unknown>;
		if (typeof v.title === 'string' && v.title.length > 0) return v.title;
		if (typeof v.text === 'string' && v.text.length > 0) {
			const t = v.text.replace(/\s+/g, ' ').trim();
			return t.length > TITLE_FALLBACK_LEN ? t.slice(0, TITLE_FALLBACK_LEN - 1) + '…' : t;
		}
	}
	return '(untitled)';
}

function itemDescription(value: unknown): string {
	if (value && typeof value === 'object') {
		const v = value as Record<string, unknown>;
		if (typeof v.deck === 'string') return v.deck;
		if (typeof v.text === 'string') return v.text;
	}
	return '';
}

export const GET: RequestHandler = async () => {
	const db = getDb();
	const { items } = getFeed(db, { limit: 20, order: 'desc' });

	const rssItems: RssItem[] = items.map((it) => ({
		title: itemTitle(it.value),
		link: `${CHANNEL.link}/at/${encodeURIComponent(it.uri)}`,
		guid: it.uri,
		pubDate: it.createdAt,
		description: itemDescription(it.value)
	}));

	const body = buildRssFeed(rssItems, CHANNEL);

	return new Response(body, {
		headers: {
			'Content-Type': 'application/rss+xml; charset=utf-8',
			'Cache-Control': 'public, max-age=300'
		}
	});
};
```

- [ ] **Step 6: Smoke-test the route**

Run: `npm run dev` (background — reuse existing if still running)
Open: `http://localhost:5173/feed.xml` in a browser
Expected: Browser displays valid RSS XML (or downloads it). The document contains a `<channel>` block with the proto.cool title and up to 20 `<item>` entries.

Or via curl:
Run: `curl -s http://localhost:5173/feed.xml | head -30`
Expected: XML beginning with `<?xml version="1.0" encoding="UTF-8"?>` followed by `<rss version="2.0">` and a channel.

- [ ] **Step 7: Click the rss cell from the sidebar**

Open: `http://localhost:5173/`
Click the `rss` cell in the elsewhere block.
Expected: Browser navigates to `/feed.xml` and shows the feed.

- [ ] **Step 8: Commit**

```bash
git add src/lib/server/rss.ts src/lib/server/rss.test.ts src/routes/feed.xml/+server.ts
git commit -m "feed: add /feed.xml RSS endpoint"
```

---

## Final verification

- [ ] **Step 1: Full test suite**

Run: `npm run test:unit -- --run`
Expected: All tests pass — pulse, rss, theme, and existing tests are green.

- [ ] **Step 2: Typecheck and lint**

Run: `npm run check && npm run lint`
Expected: Both pass.

- [ ] **Step 3: End-to-end visual sanity check**

Run: `npm run dev` (background)
Open: `http://localhost:5173/`
Confirm the full picture:
- Hero unchanged
- Feed unchanged
- Sidebar shows `/// pulse` block (5 rows of stats) followed by `/// elsewhere` (2×3 icon grid)
- Theme row updates live when flipping themes
- All 6 elsewhere cells navigate to the right destinations
- Cross-theme: switch through halogen / frost / mono / sodium / outrun — sidebar reads correctly in each

- [ ] **Step 4: Stop dev server**

Stop the background `npm run dev` task.

---

## Notes for the implementer

- Don't add cleanup or refactoring beyond what each task says. The spec is intentionally tight on scope.
- If `npm run check` shows pre-existing errors unrelated to this work, note them and continue — only block on errors *introduced* by your changes.
- If a step's expected output is wrong (e.g. test passes when it should fail), stop and re-read the previous step — likely a missed substitution.
- Browser smoke-tests in Tasks 4–6 are required, not optional. Type-checking proves correctness; only the dev server proves *feature* correctness.
