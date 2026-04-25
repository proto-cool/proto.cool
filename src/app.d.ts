import type { ThemeId, Mode } from '$lib/theme/registry';
import type { ChromeData } from '$lib/shell/chrome';

declare global {
	namespace App {
		interface Locals {
			theme: ThemeId;
			mode: Mode;
		}
		interface PageData {
			theme: ThemeId;
			mode: Mode;
			chrome: ChromeData;
		}
	}

	const __BUILD_VERSION__: string;
	const __BUILD_SHA__: string;
	const __SVELTE_VERSION__: string;
	const __SVELTEKIT_VERSION__: string;
}

export {};
