// See https://svelte.dev/docs/kit/types#app.d.ts
import type { ThemeId, Mode } from '$lib/theme/registry';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			theme: ThemeId;
			mode: Mode;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
