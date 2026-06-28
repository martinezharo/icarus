<script lang="ts">
  import { fly } from 'svelte/transition';
  import type { SearchHit } from '../lib/search';
  import type { DiaryEntry } from '../lib/types';
  import { splitTerms, snippetAround } from '../lib/highlight';
  import { longDayLabel } from '../lib/date';
  import Highlight from './Highlight.svelte';

  let {
    hits,
    activeIndex,
    query,
    onselect,
  }: {
    hits: SearchHit[];
    activeIndex: number;
    query: string;
    onselect: (entry: DiaryEntry) => void;
  } = $props();

  const terms = $derived(splitTerms(query));
</script>

<div
  class="absolute left-1/2 top-full z-50 mt-2 w-full -translate-x-1/2 overflow-hidden rounded-xl border border-slate bg-surface shadow-2xl shadow-black/50"
  transition:fly={{ y: -6, duration: 150 }}
>
  {#if hits.length === 0}
    <div class="px-4 py-6 text-center text-sm text-muted">No matching entries</div>
  {:else}
    <ul class="max-h-[60vh] overflow-y-auto py-1">
      {#each hits as hit, i (hit.entry.uid)}
        <li>
          <button
            class="flex w-full flex-col gap-0.5 px-4 py-2.5 text-left transition-colors
              {i === activeIndex ? 'bg-slate' : 'hover:bg-slate-soft'}"
            onmousedown={(e) => e.preventDefault()}
            onclick={() => onselect(hit.entry)}
          >
            <span class="flex items-baseline justify-between gap-3">
              <span class="truncate text-sm font-medium text-text">
                <Highlight text={hit.entry.title} {terms} />
              </span>
              <span class="shrink-0 text-[0.7rem] text-muted">{longDayLabel(hit.entry.date)}</span>
            </span>
            {#if hit.entry.location}
              <span class="truncate text-xs text-muted">
                <Highlight text={hit.entry.location} {terms} />
              </span>
            {/if}
            {#if hit.entry.content}
              <span class="truncate text-xs text-muted">
                <Highlight text={snippetAround(hit.entry.content, terms)} {terms} />
              </span>
            {/if}
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>
