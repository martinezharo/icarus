<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { getCurrentWebview } from '@tauri-apps/api/webview';
  import { app } from '../lib/store.svelte';

  let dragHover = $state(false);

  // Native OS file-drop, wired through Tauri's webview drag/drop events.
  onMount(() => {
    let unlisten: (() => void) | undefined;
    getCurrentWebview()
      .onDragDropEvent((event) => {
        const p = event.payload;
        if (p.type === 'enter' || p.type === 'over') {
          dragHover = true;
        } else if (p.type === 'leave') {
          dragHover = false;
        } else if (p.type === 'drop') {
          dragHover = false;
          const path = p.paths?.[0];
          if (path) app.openDroppedPath(path);
        }
      })
      .then((fn) => (unlisten = fn))
      .catch(() => {
        /* drag-drop simply unavailable; the button still works */
      });
    return () => unlisten?.();
  });
</script>

<div class="vignette relative flex h-full w-full flex-col items-center justify-center overflow-hidden px-6">
  <!-- Ambient breathing orb -->
  <div
    class="pointer-events-none absolute -top-40 h-[34rem] w-[34rem] rounded-full bg-slate/20 blur-3xl"
    in:fade={{ duration: 1200 }}
  ></div>

  <main class="relative flex w-full max-w-lg flex-col items-center text-center">
    <div in:fly={{ y: 14, duration: 700, delay: 100, easing: cubicOut }}>
      <div class="mx-auto mb-8 grid h-14 w-14 place-items-center rounded-full border border-faint">
        <span class="h-2.5 w-2.5 rounded-full bg-muted"></span>
      </div>
      <h1 class="text-3xl font-semibold tracking-tight text-text">Icarus Journal</h1>
      <p class="mt-3 text-sm leading-relaxed text-muted">
        A quiet, local-first place for your days.<br />
        Begin by opening an existing journal, or start with a blank canvas.
      </p>
    </div>

    <!-- Drop zone / primary action -->
    <button
      class="group mt-10 flex w-full flex-col items-center gap-4 rounded-2xl border border-dashed px-8 py-10 transition-all duration-300
        {dragHover
          ? 'scale-[1.01] border-muted bg-slate-soft'
          : 'border-faint hover:border-muted hover:bg-slate-soft/60'}"
      onclick={() => app.openVaultDialog()}
      in:fly={{ y: 18, duration: 700, delay: 240, easing: cubicOut }}
    >
      <span
        class="grid h-12 w-12 place-items-center rounded-full border border-faint text-muted transition-all duration-300 group-hover:scale-105 group-hover:text-text"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>
      </span>
      <span class="text-sm font-medium text-text">
        {dragHover ? 'Release to open' : 'Initialize Vault from .ics'}
      </span>
      <span class="text-xs text-faint">Drag &amp; drop a file here, or click to browse</span>
    </button>

    <!-- Subtle skip -->
    <button
      class="mt-7 text-xs text-faint underline-offset-4 transition-colors hover:text-muted hover:underline"
      onclick={() => app.skipToBlank()}
      in:fade={{ duration: 600, delay: 420 }}
    >
      Skip for now, enter blank canvas
    </button>
  </main>
</div>
