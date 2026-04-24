# proto.cool v2 — SvelteKit scaffold

**Date:** 2026-04-24
**Branch:** `feat/move-to-atproto`
**Status:** approved

## Context

proto.cool v2 is a rebuild of the site on top of the AT Protocol. The existing codebase (an Astro site under a different architecture) is being discarded entirely. The new site is served dynamically from the user's own PDS, including longform content — there is no file-based content that would benefit from Astro's content collections. The GitHub repo has been renamed from `proto-cool/proto.cool-frontend` to `proto-cool/proto.cool`.

## Decisions

### Framework: SvelteKit

Chosen over Astro because most of the site is dynamic-from-PDS and all longform content lives in atproto records. SvelteKit's load functions and form actions fit a PDS-driven app better than Astro's islands + server-routes split. The user also has strong Svelte familiarity.

### Rendering: hybrid (default)

Per-route prerendering via `export const prerender = true` on marketing/static routes; SSR for PDS-backed routes.

### Adapter: `@sveltejs/adapter-node`

Target is a self-hosted VPS with Cloudflare in front as CDN/DNS (not Workers). Node adapter emits a standalone server.

### atproto client: `@atcute/client`

Mary's atcute client over the official `@atproto/api`. Smaller, tree-shakable, TypeScript-first API. We're not bundle-constrained on a VPS, but the DX gap still favors atcute. Easy to swap later.

### Styling: plain CSS + Svelte scoped styles

No Tailwind / UnoCSS. User is handling design and fonts directly.

### Dev tooling

- TypeScript, strict mode
- ESLint + Prettier (SvelteKit defaults)
- Vitest for unit tests
- Package manager: pnpm

### Intentionally not included at scaffold time

- Playwright (add when there's something to E2E)
- mdsvex (no file-based content)
- `@sveltejs/enhanced-img` (add when images appear)
- Tailwind / UnoCSS
- Any atproto integration, OAuth flow, or routes

YAGNI — each of these is a later decision.

## Execution steps

1. Write and commit this design doc.
2. `git remote set-url origin https://github.com/proto-cool/proto.cool.git`
3. Delete all working-tree files except `.git/`, `.idea/`, `.vscode/`, and `docs/`.
4. `pnpm dlx sv create .` with: minimal template, TypeScript (strict), add-ons `eslint`, `prettier`, `vitest`, pnpm install on finish.
5. Install `@sveltejs/adapter-node`; wire it into `svelte.config.js`.
6. Set `package.json` name to `proto.cool`.
7. `pnpm add @atcute/client`.
8. `pnpm dev` smoke check.
9. Commit: `scaffold: v2 sveltekit rebuild`.

## Out of scope

Routing structure, atproto client setup, OAuth/session handling, data modeling, design system, fonts. All of that is subsequent work after a clean-context reset.
