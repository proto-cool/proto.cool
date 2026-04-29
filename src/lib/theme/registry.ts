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
	},
	{
		id: 'synthwave-dark',
		family: 'synthwave',
		familyName: 'Synthwave',
		variant: 'dark',
		palette: {
			hot: '#ff2bd6',
			warm: '#ff5fa8',
			cool: '#21f0ff'
		}
	},
	{
		id: 'synthwave-light',
		family: 'synthwave',
		familyName: 'Synthwave',
		variant: 'light',
		palette: {
			hot: '#c41a8f',
			warm: '#e0438f',
			cool: '#0e8fa3'
		}
	},
	{
		id: 'hazardpunk-dark',
		family: 'hazardpunk',
		familyName: 'Hazardpunk',
		variant: 'dark',
		palette: {
			hot: '#ff6b1a',
			warm: '#c2330d',
			cool: '#ffcc00'
		}
	},
	{
		id: 'hazardpunk-light',
		family: 'hazardpunk',
		familyName: 'Hazardpunk',
		variant: 'light',
		palette: {
			hot: '#cc4400',
			warm: '#8b1c0a',
			cool: '#aa7700'
		}
	}
] as const satisfies readonly ThemeEntry[];

export type ThemeId = (typeof themes)[number]['id'];

export const DEFAULT_THEME: ThemeId = 'phosphor-green-dark';
export const DEFAULT_MODE: Mode = 'dark';
