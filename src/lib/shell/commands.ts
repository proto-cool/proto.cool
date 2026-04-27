import { goto } from '$app/navigation';
import { sections } from './sections';
import { openOverlay } from './overlay';

export type CommandCategory = 'navigation' | 'theme' | 'help';

export type Command = {
	id: string;
	hotkey: string;
	label: string;
	category: CommandCategory;
	run: () => void;
};

const navCommands: Command[] = sections.map((s) => ({
	id: `goto-${s.id}`,
	hotkey: s.hotkey,
	label: `go to ${s.label}`,
	category: 'navigation',
	run: () => goto(s.href)
}));

export const commands: Command[] = [
	...navCommands,
	{
		id: 'theme-picker',
		hotkey: 't',
		label: 'theme picker',
		category: 'theme',
		run: () => openOverlay('theme')
	},
	{
		id: 'help',
		hotkey: '?',
		label: 'help',
		category: 'help',
		run: () => openOverlay('help')
	}
];

export function findCommand(hotkey: string): Command | undefined {
	return commands.find((c) => c.hotkey === hotkey);
}
