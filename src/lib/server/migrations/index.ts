import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export type Migration = {
	version: number;
	name: string;
	sql: string;
};

const migration001 = readFileSync(join(__dirname, '001_init.sql'), 'utf-8');

export const MIGRATIONS: readonly Migration[] = [
	{ version: 1, name: 'init', sql: migration001 }
];
