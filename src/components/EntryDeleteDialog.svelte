<script lang="ts">
  import { fade, scale } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { app } from '../lib/store.svelte';

  // Rendered at the app root (outside the day pane) so its `fixed` overlay
  // centres on the real viewport rather than inside a transformed ancestor.
  const entry = $derived(
    app.confirmDeleteUid
      ? (app.entries.find((e) => e.uid === app.confirmDeleteUid) ?? null)
      : null,
  );

  // Close on Escape (capture so it wins over other global handlers).
  $effect(() => {
    if (!app.confirmDeleteUid) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        app.cancelDeleteEntry();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  });
</script>

{#if entry}
  <div
    class="fixed inset-0 z-[70] grid place-items-center bg-ink/70 p-4 backdrop-blur-sm"
    transition:fade={{ duration: 140 }}
    onclick={() => app.cancelDeleteEntry()}
    role="presentation"
  >
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div
      class="w-full max-w-xs rounded-2xl border border-slate bg-surface p-6 shadow-2xl shadow-black/50"
      transition:scale={{ duration: 180, start: 0.96, easing: cubicOut }}
      onclick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      tabindex="-1"
    >
      <div class="mb-3 grid h-10 w-10 place-items-center rounded-full bg-red-400/10 text-red-400">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
      </div>
      <h2 class="text-base font-semibold tracking-tight text-text">Delete entry?</h2>
      <p class="mt-2 text-sm text-muted">
        <span class="text-text">{entry.title.trim() || 'Untitled'}</span>
        will be permanently removed{app.filePath ? ' from your vault' : ''}. This can't be undone.
      </p>
      <div class="mt-5 flex justify-end gap-2">
        <button
          class="rounded-lg px-3.5 py-2 text-sm text-muted transition-colors hover:bg-slate hover:text-text"
          onclick={() => app.cancelDeleteEntry()}
        >
          Cancel
        </button>
        <button
          class="rounded-lg bg-red-500 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500/90"
          onclick={() => app.confirmDeleteEntry()}
        >
          Delete
        </button>
      </div>
    </div>
  </div>
{/if}
