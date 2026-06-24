<script lang="ts">
  import { slide } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { app } from '../lib/store.svelte';
  import { dateKey } from '../lib/date';
  import { autogrow, verticalDrag } from '../lib/actions';

  let title = $state('');
  let location = $state('');
  let content = $state('');
  let dateVal = $state(dateKey(new Date()));
  let saving = $state(false);

  function expand() {
    app.dockExpanded = true;
  }
  function collapse() {
    app.dockExpanded = false;
  }
  function reset() {
    title = '';
    location = '';
    content = '';
    dateVal = dateKey(new Date());
  }

  async function commit() {
    if (!title.trim() && !content.trim()) {
      app.toast('info', 'Write something first.');
      return;
    }
    saving = true;
    await app.commit({ title, location, content, dateKey: dateVal });
    saving = false;
    reset();
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
        class="mx-auto w-full border-t border-slate bg-surface/95 shadow-2xl shadow-black/50 backdrop-blur-xl"
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
            bind:value={title}
          />

          <!-- Location / subtitle + date -->
          <div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-slate pb-3">
            <input
              class="min-w-0 flex-1 bg-transparent text-sm text-muted placeholder:text-faint focus:outline-none"
              placeholder="Add a location or subtitle"
              bind:value={location}
            />
            <input
              type="date"
              class="rounded-md bg-slate-soft px-2.5 py-1 text-xs text-muted [color-scheme:dark] focus:outline-none focus:ring-1 focus:ring-faint"
              bind:value={dateVal}
            />
          </div>

          <!-- Body -->
          <textarea
            class="mt-4 max-h-[44vh] min-h-[7rem] w-full resize-none overflow-y-auto bg-transparent font-sans text-[0.95rem] leading-relaxed text-text placeholder:text-faint focus:outline-none"
            placeholder="Write today's chapter… Markdown is welcome."
            bind:value={content}
            use:autogrow
          ></textarea>

          <!-- Actions -->
          <div class="mt-4 flex items-center justify-between">
            <span class="text-xs text-faint">
              <kbd class="font-mono">⌘/Ctrl</kbd> + <kbd class="font-mono">↵</kbd> to commit
            </span>
            <button
              class="rounded-lg bg-text px-4 py-2 text-sm font-medium text-ink transition-opacity hover:opacity-90 disabled:opacity-50"
              onclick={commit}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Commit entry'}
            </button>
          </div>
        </div>
      </div>
    {:else}
      <!-- Collapsed strip: click or drag up to expand -->
      <button
        class="group flex w-full items-center gap-3 border-t border-slate bg-surface/90 px-6 py-3.5 text-left backdrop-blur-xl transition-colors hover:bg-slate-soft"
        onclick={expand}
        use:verticalDrag={{ onResolve: (d) => d === 'up' && expand() }}
      >
        <span class="grid h-6 w-6 place-items-center rounded-md text-muted transition-colors group-hover:text-text">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
        </span>
        <span class="text-sm text-muted transition-colors group-hover:text-text">
          Write today's chapter…
        </span>
      </button>
    {/if}
  </div>
</div>
