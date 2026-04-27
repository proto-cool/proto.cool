export const themes = [
	{
		id: 'phosphor-green',
		name: 'Phosphor green',
		supportedModes: ['dark'],
		default: true
	}
] as const;

export type ThemeId = (typeof themes)[number]['id'];
export type Mode = 'dark' | 'light' | 'system';

export const DEFAULT_THEME: ThemeId = 'phosphor-green';
export const DEFAULT_MODE: Mode = 'dark';
