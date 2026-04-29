import { sql as migration001 } from './001_init';

export type Migration = {
	version: number;
	name: string;
	sql: string;
};

export const MIGRATIONS: readonly Migration[] = [
	{ version: 1, name: 'init', sql: migration001 }
];
