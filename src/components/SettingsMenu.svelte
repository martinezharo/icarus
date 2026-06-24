<script lang="ts">
  import { fade, scale } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { app } from '../lib/store.svelte';

  // Show only the file name in the chip, but keep the full path as a tooltip.
  const fileName = $derived(
    app.filePath ? app.filePath.split(/[\\/]/).pop() : null,
  );

  // Local confirmation step for the destructive "Forget vault" action.
  let confirmForget = $state(false);

  async function forget() {
    await app.forgetVault();
    confirmForget = false;
  }
</script>

{#if app.settingsOpen}
  <div
    class="absolute inset-0 z-50 grid place-items-center bg-ink/60 backdrop-blur-sm"
    transition:fade={{ duration: 160 }}
    onclick={() => (app.settingsOpen = false)}
    role="presentation"
  >
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div
      class="w-full max-w-sm rounded-2xl border border-slate bg-surface p-6 shadow-2xl shadow-black/50"
      transition:scale={{ duration: 200, start: 0.96, easing: cubicOut }}
      onclick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      tabindex="-1"
    >
      <div class="mb-5 flex items-center justify-between">
        <h2 class="text-base font-semibold tracking-tight text-text">Vault</h2>
        <button
          class="grid h-7 w-7 place-items-center rounded-lg text-muted transition-colors hover:bg-slate hover:text-text"
          aria-label="Close"
          onclick={() => (app.settingsOpen = false)}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>

      <!-- Current file -->
      <div class="mb-5 rounded-lg border border-slate bg-slate-soft px-3.5 py-3">
        <p class="text-[0.7rem] font-medium uppercase tracking-wider text-faint">
          Current file
        </p>
        {#if fileName}
          <p class="mt-1 truncate text-sm text-text" title={app.filePath}>{fileName}</p>
        {:else}
          <p class="mt-1 text-sm text-muted">Blank canvas — not yet saved to a file</p>
        {/if}
        <p class="mt-1 text-xs text-faint">
          {app.entries.length}
          {app.entries.length === 1 ? 'entry' : 'entries'}
        </p>
      </div>

      <!-- Actions -->
      <div class="space-y-2">
        <button
          class="flex w-full items-center gap-3 rounded-lg border border-slate px-3.5 py-3 text-left text-sm text-text transition-colors hover:bg-slate"
          onclick={() => app.importVault()}
          disabled={app.busy}
        >
          <svg class="text-muted" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>
          <span>
            <span class="block font-medium">Import .ics</span>
            <span class="block text-xs text-muted">Open a different diary file</span>
          </span>
        </button>

        <button
          class="flex w-full items-center gap-3 rounded-lg border border-slate px-3.5 py-3 text-left text-sm text-text transition-colors hover:bg-slate"
          onclick={() => app.exportVault()}
          disabled={app.busy}
        >
          <svg class="text-muted" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 9l5-5 5 5"/><path d="M12 4v12"/></svg>
          <span>
            <span class="block font-medium">Export backup</span>
            <span class="block text-xs text-muted">Save a copy to any folder or USB drive</span>
          </span>
        </button>

        {#if app.filePath}
          <button
            class="flex w-full items-center gap-3 rounded-lg border border-red-400/40 px-3.5 py-3 text-left text-sm text-red-400 transition-colors hover:bg-red-400/10"
            onclick={() => (confirmForget = true)}
            disabled={app.busy}
          >
            <svg class="text-red-400/80" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18.36 6.64A9 9 0 1 1 5.64 6.64"/><path d="M12 2v10"/></svg>
            <span>
              <span class="block font-medium">Forget vault</span>
              <span class="block text-xs text-red-400/70">Unlink this file — your .ics is not deleted</span>
            </span>
          </button>
        {/if}
      </div>
    </div>
  </div>

  {#if confirmForget}
    <div
      class="absolute inset-0 z-[60] grid place-items-center bg-ink/70 backdrop-blur-sm"
      transition:fade={{ duration: 140 }}
      onclick={() => (confirmForget = false)}
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
        <h2 class="text-base font-semibold tracking-tight text-text">Forget this vault?</h2>
        <p class="mt-2 text-sm text-muted">
          Icarus will stop opening
          {#if fileName}<span class="text-text">{fileName}</span>{:else}this file{/if}
          and return to the welcome screen. Your <code class="text-text">.ics</code> file stays on disk — nothing is deleted.
        </p>
        <div class="mt-5 flex justify-end gap-2">
          <button
            class="rounded-lg px-3.5 py-2 text-sm text-muted transition-colors hover:bg-slate hover:text-text"
            onclick={() => (confirmForget = false)}
          >
            Cancel
          </button>
          <button
            class="rounded-lg bg-red-500 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500/90 disabled:opacity-60"
            onclick={forget}
            disabled={app.busy}
          >
            Forget vault
          </button>
        </div>
      </div>
    </div>
  {/if}
{/if}
