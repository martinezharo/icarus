<script lang="ts">
  import { flip } from 'svelte/animate';
  import { fly } from 'svelte/transition';
  import { app } from '../lib/store.svelte';

  const dotColor: Record<string, string> = {
    info: 'bg-muted',
    success: 'bg-text',
    error: 'bg-red-400',
  };

  // Group toasts by announcement priority: errors deserve to interrupt the
  // current speech (`assertive`), everything else can wait politely.
  function ariaProps(level: 'info' | 'success' | 'error') {
    return level === 'error'
      ? { role: 'alert' as const, 'aria-live': 'assertive' as const }
      : { role: 'status' as const, 'aria-live': 'polite' as const };
  }
</script>

<!-- A polite live region for success/info; we render each error with an
     `alert` role so screen readers interrupt instead of waiting. -->
<div
  class="pointer-events-none fixed inset-x-0 top-20 z-[60] flex flex-col items-center gap-2"
  role="region"
  aria-label="Notifications"
>
  {#each app.toasts as toast (toast.id)}
    <div
      class="pointer-events-auto flex items-center gap-2.5 rounded-lg border border-slate bg-surface/95 px-4 py-2.5 text-sm text-text shadow-xl shadow-black/40 backdrop-blur-xl"
      transition:fly={{ y: -12, duration: 220 }}
      animate:flip={{ duration: 200 }}
      {...ariaProps(toast.level)}
    >
      <span class="h-1.5 w-1.5 rounded-full {dotColor[toast.level]}"></span>
      <span>{toast.message}</span>
    </div>
  {/each}
</div>
