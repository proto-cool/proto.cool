export const sections = [
	{ id: 'content', label: 'content', href: '/', hotkey: '1', pwd: '~/content' },
	{ id: 'projects', label: 'projects', href: '/projects', hotkey: '2', pwd: '~/projects' },
	{ id: 'about', label: 'about', href: '/about', hotkey: '3', pwd: '~/about' }
] as const;

export const utilities = [
	{ id: 'themes', label: 'themes', hotkey: 't' },
	{ id: 'mode', label: 'mode', hotkey: 'm' },
	{ id: 'help', label: 'help', hotkey: '?' }
] as const;

export type Section = (typeof sections)[number];
export type Utility = (typeof utilities)[number];
