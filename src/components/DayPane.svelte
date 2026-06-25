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
    class="absolute inset-0 z-20 bg-ink/50 backdrop-blur-[1px]"
    transition:fade={{ duration: 180 }}
    onclick={() => app.closeDay()}
    role="presentation"
  ></div>

  <!-- Sliding reader pane -->
  <aside
    class="absolute right-0 top-0 z-20 flex h-full w-full max-w-xl flex-col border-l border-slate bg-surface pb-16 shadow-2xl shadow-black/40"
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
      <button
        class="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-slate hover:text-text"
        aria-label="Close"
        onclick={() => app.closeDay()}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
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
{/if}
