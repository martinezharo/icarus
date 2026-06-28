<script lang="ts">
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import { app } from './lib/store.svelte';
  import Welcome from './components/Welcome.svelte';
  import TopBar from './components/TopBar.svelte';
  import Calendar from './components/Calendar.svelte';
  import DayPane from './components/DayPane.svelte';
  import WritingDock from './components/WritingDock.svelte';
  import SettingsMenu from './components/SettingsMenu.svelte';
  import DraftDeleteDialog from './components/DraftDeleteDialog.svelte';
  import EntryDeleteDialog from './components/EntryDeleteDialog.svelte';
  import Toasts from './components/Toasts.svelte';

  onMount(() => {
    app.init();

    // Global Escape closes the top-most overlay.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (app.settingsOpen) app.settingsOpen = false;
      else if (app.dockExpanded) app.collapseDock();
      else if (app.readerFullscreen) app.readerFullscreen = false;
      else if (app.selectedKey) app.closeDay();
    };
    window.addEventListener('keydown', onKey);

    // Last-chance draft flush when the window is hidden or about to close, so
    // an in-progress entry is never lost to a quit or a power cut.
    const flush = () => void app.flushDraftNow();
    const onVisibility = () => {
      if (document.hidden) flush();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', flush);

    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flush);
      window.removeEventListener('beforeunload', flush);
    };
  });
</script>

{#if !app.ready}
  <!-- Quiet boot splash to avoid a flash of the wrong screen. -->
  <div class="grid h-full place-items-center bg-ink" out:fade={{ duration: 200 }}>
    <span class="h-2 w-2 animate-ping rounded-full bg-muted"></span>
  </div>
{:else if app.view === 'welcome'}
  <Welcome />
{:else}
  <TopBar />
  <!-- Main stage: calendar with the day pane sliding over it. -->
  <main class="relative min-h-0 flex-1 overflow-hidden pb-16">
    <Calendar />
    <DayPane />
  </main>
  <WritingDock />
  <SettingsMenu />
{/if}

<DraftDeleteDialog />
<EntryDeleteDialog />
<Toasts />
