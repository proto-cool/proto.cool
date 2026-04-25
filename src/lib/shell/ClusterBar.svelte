<script lang="ts">
	import { getContext } from 'svelte';
	import { page } from '$app/state';
	import Cluster from './Cluster.svelte';
	import { clock, uptime, pwdForPath } from './runtime';
	import { linkInfo, signalSparkline } from './cosmetic';
	import type { ChromeData } from './chrome';

	const chrome = getContext<ChromeData>('chrome');
	let pwd = $derived(pwdForPath(page.url.pathname));
	let identityRows = $derived([
		{ label: 'user', value: chrome.identity.user },
		{ label: 'host', value: chrome.identity.host },
		{ label: 'pwd', value: pwd }
	]);
	let clockRows = $derived([
		{ label: 'date', value: $clock.date },
		{ label: 'time', value: $clock.time },
		{ label: 'up', value: $uptime }
	]);
	let linkRows = $derived([
		{ label: 'pds', value: 'protocol7.computer' },
		{ label: 'rx/tx', value: linkInfo.rxTx },
		{ label: 'conn', value: String(linkInfo.conn) },
		{ label: 'sig', value: $signalSparkline }
	]);
	let systemRows = [
		{ label: 'kernel', value: chrome.system.kernel },
		{ label: 'shell', value: chrome.system.shell },
		{ label: 'build', value: chrome.system.build },
		{ label: 'theme', value: page.data.theme as string }
	];
</script>

<div class="cluster-bar">
	<Cluster id="identity" rows={identityRows} />
	<Cluster id="clock" rows={clockRows} />
	<Cluster id="link" rows={linkRows} />
	<Cluster id="system" rows={systemRows} minWidth={200} />
</div>

<style>
	.cluster-bar {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		flex: 1;
	}
</style>
