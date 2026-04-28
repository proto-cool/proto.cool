import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { openOverlay, closeOverlay, currentOverlay } from './overlay';

beforeEach(() => closeOverlay());

describe('overlay store', () => {
	it('starts null', () => {
		expect(get(currentOverlay)).toBeNull();
	});

	it('openOverlay sets the kind', () => {
		openOverlay('help');
		expect(get(currentOverlay)).toBe('help');
	});

	it('closeOverlay resets to null', () => {
		openOverlay('help');
		closeOverlay();
		expect(get(currentOverlay)).toBeNull();
	});
});
