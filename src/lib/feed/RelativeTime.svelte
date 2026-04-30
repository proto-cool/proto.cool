<script lang="ts">
	import { now } from '$lib/shell/runtime';
	import { relativeTime } from '$lib/relative-time';

	let { datetime, class: cls = '' }: { datetime: string; class?: string } = $props();

	// Subscribe to the global `now` writable so the displayed value
	// updates as the clock ticks (every 1s — see runtime.ts).
	let label = $derived(relativeTime(datetime, $now.getTime()));

	// Format the absolute timestamp as "YYYY-MM-DD HH:MM UTC" for the
	// native `title` tooltip. Computed once per `datetime` prop change
	// (no need to re-run on every clock tick).
	let absolute = $derived.by(() => {
		const d = new Date(datetime);
		const pad = (n: number) => String(n).padStart(2, '0');
		return (
			`${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
			`${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`
		);
	});
</script>

<time class={cls} {datetime} title={absolute}>{label}</time>
