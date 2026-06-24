<script lang="ts">
  import { flip } from 'svelte/animate';
  import { fly } from 'svelte/transition';
  import { app } from '../lib/store.svelte';

  const dotColor: Record<string, string> = {
    info: 'bg-muted',
    success: 'bg-text',
    error: 'bg-red-400',
  };
</script>

<div class="pointer-events-none fixed inset-x-0 top-20 z-[60] flex flex-col items-center gap-2">
  {#each app.toasts as toast (toast.id)}
    <div
      class="pointer-events-auto flex items-center gap-2.5 rounded-lg border border-slate bg-surface/95 px-4 py-2.5 text-sm text-text shadow-xl shadow-black/40 backdrop-blur-xl"
      transition:fly={{ y: -12, duration: 220 }}
      animate:flip={{ duration: 200 }}
    >
      <span class="h-1.5 w-1.5 rounded-full {dotColor[toast.level]}"></span>
      <span>{toast.message}</span>
    </div>
  {/each}
</div>
