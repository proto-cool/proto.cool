export type ChromeData = {
	identity: { user: string; host: string };
	system: { kernel: string; shell: string; build: string; sig: string };
};

const DEFAULT_USER = 'protocol7';
const DEFAULT_HOST = 'cosmos';

export function resolveChromeData(): ChromeData {
	return {
		identity: {
			user: process.env.PUBLIC_OWNER_HANDLE || DEFAULT_USER,
			host: process.env.PUBLIC_HOST_LABEL || DEFAULT_HOST
		},
		system: {
			kernel: `proto-kit ${__SVELTEKIT_VERSION__}`,
			shell: `svelte ${__SVELTE_VERSION__}`,
			build: __BUILD_VERSION__,
			sig: __BUILD_SHA__.slice(0, 7)
		}
	};
}
