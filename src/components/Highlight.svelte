<script lang="ts">
  import { highlightSegments } from '../lib/highlight';

  let { text, terms = [] }: { text: string; terms?: string[] } = $props();

  const segments = $derived(highlightSegments(text, terms));
</script>
{#each segments as seg}{#if seg.match}<mark class="search-hl">{seg.text}</mark>{:else}{seg.text}{/if}{/each}
