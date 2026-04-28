export type Variant = 'dark' | 'light';
export type Mode = 'dark' | 'light' | 'system';

export type Palette = {
	hot: string;
	warm: string;
	cool: string;
};

export type ThemeEntry = {
	id: string;
	family: string;
	familyName: string;
	variant: Variant;
	palette: Palette;
	default?: boolean;
};

export const themes = [
	{
		id: 'phosphor-green-dark',
		family: 'phosphor-green',
		familyName: 'Phosphor green',
		variant: 'dark',
		palette: {
			hot: '#b8ff5a',
			warm: '#82e34b',
			cool: '#4ad29c'
		},
		default: true
	},
	{
		id: 'phosphor-green-light',
		family: 'phosphor-green',
		familyName: 'Phosphor green',
		variant: 'light',
		palette: {
			hot: '#3d6614',
			warm: '#5a8a20',
			cool: '#1c8060'
		}
	}
] as const satisfies readonly ThemeEntry[];

export type ThemeId = (typeof themes)[number]['id'];

export const DEFAULT_THEME: ThemeId = 'phosphor-green-dark';
export const DEFAULT_MODE: Mode = 'dark';
