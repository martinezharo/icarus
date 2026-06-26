<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { app } from '../lib/store.svelte';
  import { keyToDate, longDayLabel } from '../lib/date';
  import MarkdownView from './MarkdownView.svelte';

  const dayDate = $derived(app.selectedKey ? keyToDate(app.selectedKey) : null);

  // One entry per page when a day holds several. `page` is kept in range as the
  // selection changes; it resets to the first entry whenever the day changes.
  let page = $state(0);
  const count = $derived(app.selectedEntries.length);
  const safePage = $derived(Math.min(page, Math.max(0, count - 1)));
  const entry = $derived(app.selectedEntries[safePage] ?? null);

  $effect(() => {
    app.selectedKey; // re-run on day change
    page = 0;
  });

  function go(delta: number) {
    page = Math.min(Math.max(safePage + delta, 0), count - 1);
  }
</script>

{#if app.selectedKey && dayDate}
  <!-- Backdrop -->
  <div
    class="absolute inset-0 z-40 bg-ink/50 backdrop-blur-[1px]"
    transition:fade={{ duration: 180 }}
    onclick={() => app.closeDay()}
    role="presentation"
  ></div>

  <!-- Sliding reader pane -->
  <aside
    class="absolute right-0 top-0 z-40 flex h-full w-full max-w-xl flex-col border-l border-slate bg-surface shadow-2xl shadow-black/40"
    transition:fly={{ x: 480, duration: 320, easing: cubicOut }}
  >
    <header class="flex items-center justify-between border-b border-slate px-7 py-5">
      <div>
        <p class="text-[0.7rem] font-medium uppercase tracking-wider text-muted">
          {#if count > 1}
            Entry {safePage + 1} of {count}
          {:else}
            {count}
            {count === 1 ? 'entry' : 'entries'}
          {/if}
        </p>
        <h2 class="mt-0.5 text-base font-semibold tracking-tight text-text">
          {longDayLabel(dayDate)}
        </h2>
      </div>
      <div class="flex items-center gap-1">
        {#if entry}
          <button
            class="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-slate hover:text-text"
            aria-label="Edit entry"
            title="Edit entry"
            onclick={() => entry && app.editEntry(entry)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
          </button>
          <button
            class="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-slate hover:text-text"
            aria-label="View full screen"
            title="View full screen"
            onclick={() => (app.readerFullscreen = true)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3m13-5v3a2 2 0 0 1-2 2h-3"/></svg>
          </button>
        {/if}
        <button
          class="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-slate hover:text-text"
          aria-label="Close"
          onclick={() => app.closeDay()}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>
    </header>

    {#if count > 1}
      <!-- Compact pager: step through the day's entries one at a time. -->
      <div class="flex items-center justify-center gap-3 px-7 py-2.5">
        <button
          class="grid h-6 w-6 place-items-center rounded-md text-muted transition-colors hover:bg-slate hover:text-text disabled:pointer-events-none disabled:opacity-30"
          aria-label="Previous entry"
          disabled={safePage === 0}
          onclick={() => go(-1)}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>

        <div class="flex items-center gap-1.5">
          {#each app.selectedEntries as e, i (e.uid)}
            <button
              class="h-1.5 rounded-full transition-all {i === safePage ? 'w-4 bg-text' : 'w-1.5 bg-faint hover:bg-muted'}"
              aria-label={`Go to entry ${i + 1}`}
              aria-current={i === safePage}
              onclick={() => (page = i)}
            ></button>
          {/each}
        </div>

        <button
          class="grid h-6 w-6 place-items-center rounded-md text-muted transition-colors hover:bg-slate hover:text-text disabled:pointer-events-none disabled:opacity-30"
          aria-label="Next entry"
          disabled={safePage === count - 1}
          onclick={() => go(1)}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
        </button>
      </div>
    {/if}

    <div class="min-h-0 flex-1 overflow-y-auto px-7 py-6">
      {#if !entry}
        <div class="flex h-full flex-col items-center justify-center text-center text-muted">
          <p class="text-sm">No entries on this day yet.</p>
        </div>
      {:else}
        {#key entry.uid}
          <article in:fade={{ duration: 150 }}>
            <h1 class="text-xl font-semibold tracking-tight text-text">
              {entry.title}
            </h1>
            {#if entry.location}
              <p class="mt-1 text-sm text-muted">{entry.location}</p>
            {/if}
            {#if entry.content}
              <div class="mt-4">
                <MarkdownView source={entry.content} />
              </div>
            {/if}
          </article>
        {/key}
      {/if}
    </div>

  </aside>

  <!-- Distraction-free full-screen reader for the current entry. -->
  {#if app.readerFullscreen && entry}
    <div
      class="fixed inset-0 z-50 overflow-y-auto bg-surface"
      transition:fade={{ duration: 180 }}
    >
      <div
        class="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-slate bg-surface/85 px-8 py-4 backdrop-blur"
      >
        <p class="truncate text-sm text-muted">
          {longDayLabel(dayDate)}{#if count > 1} · Entry {safePage + 1} of {count}{/if}
        </p>
        <div class="flex shrink-0 items-center gap-1">
          <button
            class="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-slate hover:text-text"
            aria-label="Edit entry"
            title="Edit entry"
            onclick={() => entry && app.editEntry(entry)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
          </button>
          <button
            class="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-slate hover:text-text"
            aria-label="Exit full screen"
            title="Exit full screen"
            onclick={() => (app.readerFullscreen = false)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3m13-5h-3a2 2 0 0 0-2 2v3"/></svg>
          </button>
        </div>
      </div>

      <div class="mx-auto max-w-3xl px-8 py-12">
        {#key entry.uid}
          <article in:fade={{ duration: 150 }}>
            <h1 class="text-3xl font-semibold tracking-tight text-text">
              {entry.title}
            </h1>
            {#if entry.location}
              <p class="mt-2 text-base text-muted">{entry.location}</p>
            {/if}
            {#if entry.content}
              <div class="mt-6">
                <MarkdownView source={entry.content} />
              </div>
            {/if}
          </article>
        {/key}
      </div>
    </div>
  {/if}
{/if}
