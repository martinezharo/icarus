<script lang="ts">
  import { onMount } from 'svelte';
  import { app } from '../lib/store.svelte';
  import { search, type SearchHit } from '../lib/search';
  import type { JournalEntry } from '../lib/types';
  import SearchOverlay from './SearchOverlay.svelte';

  let query = $state('');
  let focused = $state(false);
  let activeIndex = $state(0);
  let inputEl = $state<HTMLInputElement | null>(null);

  const hits = $derived<SearchHit[]>(search(query));
  const open = $derived(focused && query.trim().length > 0);

  // Keep the active row in range as results change.
  $effect(() => {
    void hits;
    if (activeIndex >= hits.length) activeIndex = 0;
  });

  function choose(entry: JournalEntry) {
    app.jumpToEntry(entry);
    query = '';
    inputEl?.blur();
  }

  function onKeydown(e: KeyboardEvent) {
    if (!open) {
      if (e.key === 'Escape') inputEl?.blur();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndex = Math.min(activeIndex + 1, hits.length - 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const hit = hits[activeIndex];
      if (hit) choose(hit.entry);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      query = '';
      inputEl?.blur();
    }
  }

  // Global Cmd/Ctrl+K to focus search from anywhere.
  onMount(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputEl?.focus();
        inputEl?.select();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });
</script>

<header
  class="relative z-40 flex h-14 shrink-0 items-center gap-4 border-b border-slate px-4 sm:px-6"
>
  <!-- Brand -->
  <div class="flex shrink-0 items-center gap-2 text-sm font-semibold tracking-tight text-text">
    <span class="grid h-6 w-6 place-items-center rounded-full border border-faint">
      <span class="h-1.5 w-1.5 rounded-full bg-muted"></span>
    </span>
    <span class="hidden sm:inline">Icarus</span>
  </div>

  <!-- Centered search -->
  <div class="relative mx-auto w-full max-w-md">
    <div
      class="flex items-center gap-2 rounded-lg border border-slate bg-slate-soft px-3 py-1.5 transition-colors focus-within:border-faint"
    >
      <svg class="shrink-0 text-faint" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
      <input
        bind:this={inputEl}
        bind:value={query}
        onfocus={() => (focused = true)}
        onblur={() => setTimeout(() => (focused = false), 120)}
        onkeydown={onKeydown}
        type="text"
        placeholder="Search entries…"
        class="w-full bg-transparent text-sm text-text placeholder:text-faint focus:outline-none"
        spellcheck="false"
      />
      <kbd class="hidden shrink-0 rounded border border-slate px-1.5 py-0.5 font-mono text-[0.65rem] text-faint sm:block">
        ⌘K
      </kbd>
    </div>

    {#if open}
      <SearchOverlay {hits} {activeIndex} onselect={choose} />
    {/if}
  </div>

  <!-- Settings -->
  <button
    class="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-slate hover:text-text"
    aria-label="Settings"
    onclick={() => (app.settingsOpen = true)}
  >
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
  </button>
</header>
