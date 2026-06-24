<script lang="ts">
  import { renderMarkdown } from '../lib/markdown';

  let { source }: { source: string } = $props();

  const html = $derived(renderMarkdown(source));
</script>

<!-- Sanitized in renderMarkdown(); safe to inject. -->
<div class="markdown">{@html html}</div>
