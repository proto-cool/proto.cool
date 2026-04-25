import { describe, it, expect } from 'vitest';
import { FRAME, STATUS, CURSOR, PROMPT } from './glyphs';

describe('glyphs', () => {
	it('exports FRAME with single-line and double-line box-drawing characters', () => {
		expect(FRAME.tl).toBe('┌');
		expect(FRAME.br).toBe('┘');
		expect(FRAME.h).toBe('─');
		expect(FRAME.v).toBe('│');
		expect(FRAME.dTl).toBe('╔');
		expect(FRAME.dH).toBe('═');
	});

	it('exports STATUS indicators', () => {
		expect(STATUS.ok).toBe('[OK]');
		expect(STATUS.warn).toBe('[!]');
		expect(STATUS.err).toBe('[X]');
	});

	it('exports CURSOR variants', () => {
		expect(CURSOR.block).toBe('█');
	});

	it('exports PROMPT variants', () => {
		expect(PROMPT.shell).toBe('$');
	});
});
