import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';
import { execFileSync } from 'node:child_process';
import pkg from './package.json' with { type: 'json' };

const sha = (() => {
	try {
		return execFileSync('git', ['rev-parse', 'HEAD']).toString().trim();
	} catch {
		return '0000000000000000000000000000000000000000';
	}
})();

const trimCaret = (v: string) => v.replace(/^\^/, '');

export default defineConfig({
	plugins: [sveltekit()],
	define: {
		__BUILD_VERSION__: JSON.stringify(pkg.version),
		__BUILD_SHA__: JSON.stringify(sha),
		__SVELTE_VERSION__: JSON.stringify(trimCaret(pkg.devDependencies.svelte)),
		__SVELTEKIT_VERSION__: JSON.stringify(trimCaret(pkg.devDependencies['@sveltejs/kit']))
	},
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
