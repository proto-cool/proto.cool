export const themes = [
	{
		id: 'neon-green',
		name: 'Neon green',
		supportedModes: ['dark', 'light'],
		default: true
	},
	{
		id: 'magenta-vapor',
		name: 'Magenta vapor',
		supportedModes: ['dark', 'light']
	}
] as const;

export type ThemeId = (typeof themes)[number]['id'];
export type Mode = 'dark' | 'light' | 'system';

export const DEFAULT_THEME: ThemeId = 'neon-green';
export const DEFAULT_MODE: Mode = 'system';
