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
		id: 'halogen-dark',
		family: 'halogen',
		familyName: 'Halogen',
		variant: 'dark',
		palette: {
			hot: '#b8ff5a',
			warm: '#82e34b',
			cool: '#4ad29c'
		},
		default: true
	},
	{
		id: 'halogen-light',
		family: 'halogen',
		familyName: 'Halogen',
		variant: 'light',
		palette: {
			hot: '#3d6614',
			warm: '#5a8a20',
			cool: '#1c8060'
		}
	},
	{
		id: 'outrun-dark',
		family: 'outrun',
		familyName: 'Outrun',
		variant: 'dark',
		palette: {
			hot: '#ff2bd6',
			warm: '#ff5fa8',
			cool: '#21f0ff'
		}
	},
	{
		id: 'outrun-light',
		family: 'outrun',
		familyName: 'Outrun',
		variant: 'light',
		palette: {
			hot: '#c41a8f',
			warm: '#e0438f',
			cool: '#0e8fa3'
		}
	},
	{
		id: 'sodium-dark',
		family: 'sodium',
		familyName: 'Sodium',
		variant: 'dark',
		palette: {
			hot: '#ff6b1a',
			warm: '#c2330d',
			cool: '#ffcc00'
		}
	},
	{
		id: 'sodium-light',
		family: 'sodium',
		familyName: 'Sodium',
		variant: 'light',
		palette: {
			hot: '#cc4400',
			warm: '#8b1c0a',
			cool: '#aa7700'
		}
	},
	{
		id: 'frost-dark',
		family: 'frost',
		familyName: 'Frost',
		variant: 'dark',
		palette: {
			hot: '#a3d5e8',
			warm: '#5e81ac',
			cool: '#a3be8c'
		}
	},
	{
		id: 'frost-light',
		family: 'frost',
		familyName: 'Frost',
		variant: 'light',
		palette: {
			hot: '#2e4564',
			warm: '#4a6485',
			cool: '#5d7548'
		}
	},
	{
		id: 'mono-dark',
		family: 'mono',
		familyName: 'Mono',
		variant: 'dark',
		palette: {
			hot: '#ffffff',
			warm: '#888888',
			cool: '#b8b8b8'
		}
	},
	{
		id: 'mono-light',
		family: 'mono',
		familyName: 'Mono',
		variant: 'light',
		palette: {
			hot: '#000000',
			warm: '#4a4a4a',
			cool: '#2a2a2a'
		}
	}
] as const satisfies readonly ThemeEntry[];

export type ThemeId = (typeof themes)[number]['id'];

export const DEFAULT_THEME: ThemeId = 'halogen-dark';
export const DEFAULT_MODE: Mode = 'dark';
