<script lang="ts">
  import { openUrl } from '@tauri-apps/plugin-opener';
  import { renderMarkdown } from '../lib/markdown';
  import { clearHighlights, highlightElement } from '../lib/highlight';

  let {
    source,
    terms = [],
    onhighlight,
  }: {
    source: string;
    terms?: string[];
    onhighlight?: (count: number, first: HTMLElement | null) => void;
  } = $props();

  const html = $derived(renderMarkdown(source));
  let el = $state<HTMLDivElement | null>(null);

  // After the body renders (or the terms change), re-apply highlighting in
  // place and report the match count + first hit back to the parent.
  $effect(() => {
    void html;
    void terms;
    const root = el;
    if (!root) return;
    clearHighlights(root);
    const { count, first } = highlightElement(root, terms);
    onhighlight?.(count, first);
  });

  // Intercept anchor clicks so external URLs open in the system browser via
  // Tauri's opener plugin (not in the app's webview, which would either be
  // blocked by CSP or kick the user out of the app).
  async function onClick(e: MouseEvent) {
    const a = (e.target as HTMLElement | null)?.closest('a');
    if (!a) return;
    const href = a.getAttribute('href') ?? '';
    if (!href || href === '#') return;
    e.preventDefault();
    try {
      await openUrl(href);
    } catch {
      // Opener unavailable (e.g. `pnpm dev` outside Tauri): silently fall
      // back to the default browser behaviour via window.open.
      window.open(href, '_blank', 'noopener,noreferrer');
    }
  }
</script>

<!-- Sanitized in renderMarkdown(); safe to inject. -->
<div
  bind:this={el}
  class="markdown"
  onclick={onClick}
  role="presentation"
>{@html html}</div>
