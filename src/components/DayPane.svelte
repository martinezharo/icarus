<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { app } from '../lib/store.svelte';
  import { keyToDate, longDayLabel } from '../lib/date';
  import MarkdownView from './MarkdownView.svelte';

  const dayDate = $derived(app.selectedKey ? keyToDate(app.selectedKey) : null);
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
    class="absolute right-0 top-0 z-20 flex h-full w-full max-w-xl flex-col border-l border-slate bg-surface shadow-2xl shadow-black/40"
    transition:fly={{ x: 480, duration: 320, easing: cubicOut }}
  >
    <header class="flex items-center justify-between border-b border-slate px-7 py-5">
      <div>
        <p class="text-[0.7rem] font-medium uppercase tracking-wider text-faint">
          {app.selectedEntries.length}
          {app.selectedEntries.length === 1 ? 'entry' : 'entries'}
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

    <div class="min-h-0 flex-1 overflow-y-auto px-7 py-6">
      {#if app.selectedEntries.length === 0}
        <div class="flex h-full flex-col items-center justify-center text-center text-muted">
          <p class="text-sm">No entries on this day yet.</p>
        </div>
      {:else}
        <div class="space-y-10">
          {#each app.selectedEntries as entry (entry.uid)}
            <article>
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
          {/each}
        </div>
      {/if}
    </div>
  </aside>
{/if}
