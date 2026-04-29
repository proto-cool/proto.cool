/// <reference types="@atcute/atproto" />
/// <reference types="@atcute/bluesky" />

import type { ThemeId, Mode } from '$lib/theme/registry';
import type { ChromeData } from '$lib/shell/chrome';
import type { SystemSnapshot } from '$lib/server/system';
import type { FeedItem } from '$lib/server/feed';

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
			system?: SystemSnapshot;
			feed?: {
				items: FeedItem[];
				nextCursor: string | null;
			};
		}
	}

	const __BUILD_VERSION__: string;
	const __BUILD_SHA__: string;
	const __SVELTE_VERSION__: string;
	const __SVELTEKIT_VERSION__: string;
}

export {};
