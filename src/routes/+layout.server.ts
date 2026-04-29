import type { LayoutServerLoad } from './$types';
import { resolveChromeData } from '$lib/shell/chrome';
import { openDatabase, runMigrations } from '$lib/server/db';
import { getSystemSnapshot } from '$lib/server/system';

const dbPath = process.env.PROTO_DB_PATH ?? './data/proto.sqlite';
const db = openDatabase(dbPath);
runMigrations(db);

export const load: LayoutServerLoad = ({ locals }) => ({
	theme: locals.theme,
	mode: locals.mode,
	chrome: resolveChromeData(),
	system: getSystemSnapshot(db)
});
