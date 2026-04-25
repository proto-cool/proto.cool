import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.stubGlobal('__BUILD_VERSION__', '0.7.2');
vi.stubGlobal('__BUILD_SHA__', '7a3f2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a');
vi.stubGlobal('__SVELTE_VERSION__', '5.55.2');
vi.stubGlobal('__SVELTEKIT_VERSION__', '2.57.0');

const env = process.env;
beforeEach(() => {
	process.env = { ...env };
});

describe('resolveChromeData', () => {
	it('returns the expected shape with values from env + build constants', async () => {
		process.env.PUBLIC_OWNER_HANDLE = 'protocol7';
		process.env.PUBLIC_HOST_LABEL = 'helios';
		process.env.PUBLIC_PDS_HOST = 'pds.proto.cool';
		const { resolveChromeData } = await import('./chrome');
		const data = resolveChromeData();
		expect(data).toEqual({
			identity: { user: 'protocol7', host: 'helios' },
			link: { pds: 'pds.proto.cool' },
			system: {
				kernel: 'proto-kit 2.57.0',
				shell: 'svelte 5.55.2',
				build: '0.7.2',
				sig: '7a3f2b1'
			}
		});
	});

	it('falls back to defaults when env vars are missing', async () => {
		delete process.env.PUBLIC_OWNER_HANDLE;
		delete process.env.PUBLIC_HOST_LABEL;
		delete process.env.PUBLIC_PDS_HOST;
		vi.resetModules();
		const { resolveChromeData } = await import('./chrome');
		const data = resolveChromeData();
		expect(data.identity.user).toBe('protocol7');
		expect(data.identity.host).toBe('helios');
		expect(data.link.pds).toBe('pds.proto.cool');
	});

	it('truncates SHA to first 7 chars', async () => {
		vi.resetModules();
		const { resolveChromeData } = await import('./chrome');
		expect(resolveChromeData().system.sig.length).toBe(7);
	});
});
