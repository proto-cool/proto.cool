#!/usr/bin/env -S node --import=tsx
import { openDatabase, runMigrations } from '../src/lib/server/db.ts';
import { createAtpClient } from '../src/lib/server/atp-client.ts';
import { runBackfill } from '../src/lib/server/backfill.ts';
import { getOwnerDid } from '../src/lib/server/config.ts';

async function main() {
	const dbPath = process.env.PROTO_DB_PATH ?? './data/proto.sqlite';
	const pdsHost = process.env.PUBLIC_PDS_HOST ?? 'pds.proto.cool';
	const handle = process.env.PUBLIC_OWNER_HANDLE ?? 'protocol7';

	const db = openDatabase(dbPath);
	runMigrations(db);

	const client = createAtpClient(`https://${pdsHost}`);

	let did = getOwnerDid();
	if (!did) {
		console.log(`PROTO_OWNER_DID unset — resolving ${handle} via ${pdsHost}…`);
		const resolved = await client.resolveHandle(handle);
		did = resolved.did;
		console.log(`Resolved → ${did}`);
	}

	console.log(`Backfilling repo ${did} from https://${pdsHost}…`);
	const t0 = Date.now();
	const result = await runBackfill(db, client, did);
	const dtMs = Date.now() - t0;

	console.log(`Done in ${dtMs}ms — ${result.totalInserted} records`);
	for (const [collection, count] of Object.entries(result.byCollection)) {
		console.log(`  ${collection}: ${count}`);
	}

	db.close();
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
