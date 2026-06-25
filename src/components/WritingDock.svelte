<script lang="ts">
  import { slide } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { app } from '../lib/store.svelte';
  import { autogrow, verticalDrag } from '../lib/actions';
  import DraftsMenu from './DraftsMenu.svelte';
  import DatePicker from './DatePicker.svelte';

  let saving = $state(false);

  function askDiscard() {
    if (app.draftId) app.requestDeleteDraft(app.draftId);
  }

  // Is there anything worth saving / discarding right now?
  const hasContent = $derived(
    !!(
      app.draftTitle.trim() ||
      app.draftContent.trim() ||
      app.draftLocation.trim()
    ),
  );

  // Autosave: whenever the editor fields change, schedule a debounced write to
  // the persisted draft store. This is what makes an unsaved entry survive a
  // crash, a power cut, or quitting the app mid-sentence.
  $effect(() => {
    // Track every field so the effect re-runs on any edit.
    void app.draftTitle;
    void app.draftLocation;
    void app.draftContent;
    void app.draftDateKey;
    app.scheduleDraftSave();
  });

  function expand() {
    app.dockExpanded = true;
  }
  function collapse() {
    // Flush before hiding so nothing is lost if the app closes while collapsed.
    void app.flushDraftNow();
    app.dockExpanded = false;
  }

  async function commit() {
    saving = true;
    await app.commit();
    saving = false;
  }

  function onKeydown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Escape') {
      collapse();
    }
  }
</script>

<div class="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center">
  <div class="pointer-events-auto w-full">
    {#if app.dockExpanded}
      <!-- Keydown is delegated from the inputs within (Cmd+Enter / Escape). -->
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <div
        class="mx-auto w-full border-t border-slate bg-surface shadow-2xl shadow-black/50"
        transition:slide={{ duration: 320, easing: cubicOut }}
        onkeydown={onKeydown}
        role="form"
        tabindex="-1"
      >
        <!-- Grab handle: drag down (or click) to collapse -->
        <button
          class="group flex w-full cursor-grab justify-center py-2 active:cursor-grabbing"
          aria-label="Collapse"
          onclick={collapse}
          use:verticalDrag={{ onResolve: (d) => d === 'down' && collapse() }}
        >
          <span class="h-1 w-10 rounded-full bg-faint transition-colors group-hover:bg-muted"></span>
        </button>

        <div class="mx-auto max-w-3xl px-6 pb-6">
          <!-- Title -->
          <input
            class="w-full bg-transparent text-2xl font-semibold tracking-tight text-text placeholder:text-faint focus:outline-none"
            placeholder="Title"
            bind:value={app.draftTitle}
          />

          <!-- Location / subtitle + date -->
          <div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-slate pb-3">
            <input
              class="min-w-0 flex-1 bg-transparent text-sm text-muted placeholder:text-faint focus:outline-none"
              placeholder="Add a location or subtitle"
              bind:value={app.draftLocation}
            />
            <DatePicker bind:value={app.draftDateKey} />
          </div>

          <!-- Body -->
          <textarea
            class="mt-4 max-h-[44vh] min-h-[7rem] w-full resize-none overflow-y-auto bg-transparent font-sans text-[0.95rem] leading-relaxed text-text placeholder:text-faint focus:outline-none"
            placeholder="Write today's chapter… Markdown is welcome."
            bind:value={app.draftContent}
            use:autogrow
          ></textarea>

          <!-- Actions -->
          <div class="mt-4 flex items-center justify-between gap-3">
            <div class="flex items-center gap-2">
              <DraftsMenu align="left" />
              {#if app.draftOpened}
                <button
                  class="rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-red-400/10 hover:text-red-400"
                  onclick={askDiscard}
                >
                  Discard
                </button>
              {/if}
            </div>

            <div class="flex items-center gap-2">
              <button
                class="rounded-lg border border-slate px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-slate hover:text-text disabled:opacity-50"
                onclick={() => app.saveDraftAndReset()}
                disabled={saving}
              >
                Save as draft
              </button>
              <button
                class="flex items-center gap-2 rounded-lg bg-text px-4 py-2 text-sm font-medium text-ink transition-opacity hover:opacity-90 disabled:opacity-50"
                onclick={commit}
                disabled={saving}
              >
                <span>{saving ? 'Saving…' : 'Commit entry'}</span>
                <span class="hidden items-center gap-1 text-ink/60 sm:flex">
                  <kbd class="font-mono text-xs">⌘/Ctrl</kbd>
                  <kbd class="font-mono text-xs">↵</kbd>
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    {:else}
      <!-- Collapsed strip: expand to write, plus quick access to drafts -->
      <div
        class="mx-auto flex w-full items-center gap-2 border-t border-slate bg-surface px-6 py-3"
      >
        <button
          class="group flex flex-1 items-center gap-3 text-left"
          onclick={expand}
          use:verticalDrag={{ onResolve: (d) => d === 'up' && expand() }}
        >
          <span class="grid h-6 w-6 place-items-center rounded-md text-muted transition-colors group-hover:text-text">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
          </span>
          <span class="text-sm text-muted transition-colors group-hover:text-text">
            {app.draftId || hasContent ? 'Continue your draft…' : "Write today's chapter…"}
          </span>
        </button>

        <DraftsMenu align="right" />
      </div>
    {/if}
  </div>
</div>
