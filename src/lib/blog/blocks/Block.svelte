<script lang="ts">
	import type { Block as BlockData } from '$lib/server/blocks';
	import type { BlobContext } from '$lib/blob';
	import TextBlock from './TextBlock.svelte';
	import Heading from './Heading.svelte';
	import ImageBlock from './ImageBlock.svelte';
	import Blockquote from './Blockquote.svelte';
	import CodeBlock from './CodeBlock.svelte';
	import BulletList from './BulletList.svelte';
	import OrderedList from './OrderedList.svelte';
	import ListItem from './ListItem.svelte';
	import Self from './Block.svelte';

	let { block, blobCtx }: { block: BlockData; blobCtx: BlobContext } = $props();

	let inner = $derived((block.content as BlockData[] | undefined) ?? []);
</script>

{#if block.$type === 'blog.pckt.block.text'}
	<TextBlock plaintext={block.plaintext as string} facets={block.facets as any[] | undefined} />
{:else if block.$type === 'blog.pckt.block.heading'}
	<Heading
		level={(block.level as number) ?? 2}
		plaintext={block.plaintext as string}
		facets={block.facets as any[] | undefined}
	/>
{:else if block.$type === 'blog.pckt.block.image'}
	<ImageBlock attrs={block.attrs as any} {blobCtx} />
{:else if block.$type === 'blog.pckt.block.blockquote'}
	<Blockquote>
		{#each inner as child, i (i)}<Self block={child} {blobCtx} />{/each}
	</Blockquote>
{:else if block.$type === 'blog.pckt.block.codeBlock'}
	<CodeBlock plaintext={block.plaintext as string} language={block.language as string | undefined} />
{:else if block.$type === 'blog.pckt.block.bulletList'}
	<BulletList>
		{#each inner as child, i (i)}<Self block={child} {blobCtx} />{/each}
	</BulletList>
{:else if block.$type === 'blog.pckt.block.orderedList'}
	<OrderedList>
		{#each inner as child, i (i)}<Self block={child} {blobCtx} />{/each}
	</OrderedList>
{:else if block.$type === 'blog.pckt.block.listItem'}
	<ListItem>
		{#each inner as child, i (i)}<Self block={child} {blobCtx} />{/each}
	</ListItem>
{:else if block.$type === 'blog.pckt.block.horizontalRule'}
	<hr class="hr" />
{:else if block.$type === 'blog.pckt.block.hardBreak'}
	<br />
{:else}
	<div class="unsupported">[unsupported block: {block.$type}]</div>
{/if}

<style>
	.hr {
		border: 0;
		text-align: center;
		margin: 32px 0;
	}
	.hr::before {
		content: '* * *';
		font-family: var(--font-mono);
		color: var(--color-fg-mute);
		letter-spacing: 0.6em;
	}
	.unsupported {
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--color-fg-mute);
		padding: 8px 12px;
		border: 1px dashed var(--color-edge);
		margin: 16px 0;
	}
</style>
