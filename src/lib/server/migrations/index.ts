import { sql as migration001 } from './001_init';
import { sql as migration002 } from './002_profiles';

export type Migration = {
	version: number;
	name: string;
	sql: string;
};

export const MIGRATIONS: readonly Migration[] = [
	{ version: 1, name: 'init', sql: migration001 },
	{ version: 2, name: 'profiles', sql: migration002 }
];
