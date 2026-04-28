import { writable, type Readable } from 'svelte/store';

export type OverlayKind = 'help';

const store = writable<OverlayKind | null>(null);

export const currentOverlay: Readable<OverlayKind | null> = { subscribe: store.subscribe };

export function openOverlay(kind: OverlayKind): void {
	store.set(kind);
}

export function closeOverlay(): void {
	store.set(null);
}
