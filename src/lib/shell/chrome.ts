export type ChromeData = {
	identity: { user: string; host: string };
	link: { pds: string };
	system: { build: string; sig: string };
};

// Defaults match the production deployment so a clean checkout renders correctly
// without an .env file. Override locally via .env (see .env.example).
const DEFAULT_USER = 'protocol7';
const DEFAULT_HOST = 'helios';
const DEFAULT_PDS = 'pds.proto.cool';

// Server-only: reads process.env directly. Call from +layout.server.ts, not universal loads.
export function resolveChromeData(): ChromeData {
	return {
		identity: {
			user: process.env.PUBLIC_OWNER_HANDLE || DEFAULT_USER,
			host: process.env.PUBLIC_HOST_LABEL || DEFAULT_HOST
		},
		link: {
			pds: process.env.PUBLIC_PDS_HOST || DEFAULT_PDS
		},
		system: {
			build: __BUILD_VERSION__,
			sig: __BUILD_SHA__.slice(0, 7)
		}
	};
}
