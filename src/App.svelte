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
  import Toasts from './components/Toasts.svelte';

  onMount(() => {
    app.init();

    // Global Escape closes the top-most overlay.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (app.settingsOpen) app.settingsOpen = false;
      else if (app.selectedKey) app.closeDay();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
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

<Toasts />
