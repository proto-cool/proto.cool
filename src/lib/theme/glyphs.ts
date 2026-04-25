export const FRAME = {
	// single-line
	tl: '┌',
	tr: '┐',
	bl: '└',
	br: '┘',
	h: '─',
	v: '│',
	cross: '┼',
	tDown: '┬',
	tUp: '┴',
	tRight: '├',
	tLeft: '┤',
	// double-line variants for emphasis
	dTl: '╔',
	dTr: '╗',
	dBl: '╚',
	dBr: '╝',
	dH: '═',
	dV: '║'
} as const;

export const STATUS = {
	ok: '[OK]',
	warn: '[!]',
	err: '[X]',
	info: '[?]',
	dot: '[●]',
	empty: '[ ]'
} as const;

export const CURSOR = {
	block: '█',
	bar: '▎',
	under: '▁'
} as const;

export const PROMPT = {
	shell: '$',
	arrow: '>',
	bracket: '>>'
} as const;
