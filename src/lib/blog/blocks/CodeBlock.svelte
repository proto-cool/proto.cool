<script lang="ts">
	let {
		plaintext,
		language
	}: { plaintext: string; language?: string } = $props();
</script>

<pre class="code-block" data-lang={language ?? ''}><code>{plaintext}</code></pre>

<style>
	.code-block {
		margin: 24px 0;
		padding: 14px 16px;
		background: var(--shell-veil);
		border: 1px solid var(--color-edge);
		font-family: var(--font-mono);
		font-size: 13px;
		line-height: 1.5;
		overflow-x: auto;
		color: var(--color-fg);
	}
	.code-block code { background: none; padding: 0; border: 0; }
</style>
