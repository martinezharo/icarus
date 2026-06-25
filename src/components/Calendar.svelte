<script lang="ts">
  import { scale } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { app } from '../lib/store.svelte';
  import { clickOutside } from '../lib/actions';
  import {
    dateKey,
    isSameDay,
    monthGrid,
    monthLabel,
    MONTH_LABELS_SHORT,
    WEEKDAY_LABELS,
  } from '../lib/date';

  const today = new Date();
  const grid = $derived(monthGrid(app.currentMonth));

  // --- month / year picker ------------------------------------------------
  let pickerOpen = $state(false);
  // The year being browsed inside the popover (independent of the live month
  // until the user actually picks one).
  let pickerYear = $state(app.currentMonth.getFullYear());

  function togglePicker() {
    if (!pickerOpen) pickerYear = app.currentMonth.getFullYear();
    pickerOpen = !pickerOpen;
  }
  function pickMonth(month: number) {
    app.goToMonth(pickerYear, month);
    pickerOpen = false;
  }
  function isCurrentMonthCell(month: number): boolean {
    return (
      pickerYear === app.currentMonth.getFullYear() &&
      month === app.currentMonth.getMonth()
    );
  }
  function isThisMonthCell(month: number): boolean {
    return pickerYear === today.getFullYear() && month === today.getMonth();
  }

  function entryCount(d: Date): number {
    return app.entriesByDay.get(dateKey(d))?.length ?? 0;
  }
  function inCurrentMonth(d: Date): boolean {
    return d.getMonth() === app.currentMonth.getMonth();
  }
  function isSelected(d: Date): boolean {
    return app.selectedKey === dateKey(d);
  }
</script>

<section class="flex h-full flex-col px-6 pb-6 pt-3 sm:px-10">
  <!-- Month header -->
  <header class="relative mb-5 flex items-center justify-between">
    <!-- Month navigation: arrows flanking the month/year picker -->
    <div class="flex items-center gap-1">
      <button
        class="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-slate hover:text-text"
        aria-label="Previous month"
        onclick={() => app.navigateMonth(-1)}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
      </button>

      <!-- Month/year label — click to open the picker -->
      <div class="relative">
      <button
        class="group flex items-center gap-1.5 rounded-lg px-2 py-1 text-lg font-semibold tracking-tight text-text transition-colors hover:bg-slate"
        onclick={togglePicker}
        aria-haspopup="dialog"
        aria-expanded={pickerOpen}
      >
        {monthLabel(app.currentMonth)}
        <svg
          class="text-muted transition-transform duration-200 group-hover:text-text {pickerOpen ? 'rotate-180' : ''}"
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
      </button>

      {#if pickerOpen}
        <div
          class="absolute left-0 top-full z-50 mt-2 w-72 origin-top-left rounded-2xl border border-slate bg-surface p-3 shadow-2xl shadow-black/50"
          transition:scale={{ duration: 160, start: 0.95, easing: cubicOut }}
          use:clickOutside={() => (pickerOpen = false)}
          role="dialog"
          aria-label="Select month and year"
        >
          <!-- Year stepper -->
          <div class="mb-3 flex items-center justify-between">
            <button
              class="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-slate hover:text-text"
              aria-label="Previous year"
              onclick={() => (pickerYear -= 1)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <span class="text-sm font-semibold tabular-nums tracking-tight text-text">{pickerYear}</span>
            <button
              class="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-slate hover:text-text"
              aria-label="Next year"
              onclick={() => (pickerYear += 1)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </button>
          </div>

          <!-- Month grid -->
          <div class="grid grid-cols-3 gap-1.5">
            {#each MONTH_LABELS_SHORT as label, month (month)}
              <button
                class="rounded-lg py-2 text-sm font-medium tabular-nums transition-colors
                  {isCurrentMonthCell(month)
                    ? 'bg-text text-ink'
                    : isThisMonthCell(month)
                      ? 'text-text ring-1 ring-inset ring-faint hover:bg-slate'
                      : 'text-muted hover:bg-slate hover:text-text'}"
                onclick={() => pickMonth(month)}
              >
                {label}
              </button>
            {/each}
          </div>
        </div>
      {/if}
      </div>

      <button
        class="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-slate hover:text-text"
        aria-label="Next month"
        onclick={() => app.navigateMonth(1)}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
      </button>
    </div>

    <button
      class="rounded-lg px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-slate hover:text-text"
      onclick={() => app.goToToday()}
    >
      Today
    </button>
  </header>

  <!-- Weekday labels -->
  <div class="mb-2 grid grid-cols-7 gap-px">
    {#each WEEKDAY_LABELS as label}
      <div class="pb-1 text-center text-[0.7rem] font-medium uppercase tracking-wider text-muted">
        {label}
      </div>
    {/each}
  </div>

  <!-- Day grid -->
  <div class="grid min-h-0 flex-1 grid-cols-7 grid-rows-6 gap-px">
    {#each grid as day (day.toISOString())}
      {@const count = entryCount(day)}
      {@const muted = !inCurrentMonth(day)}
      <button
        class="group relative flex flex-col rounded-xl border border-transparent p-2 text-left transition-all duration-200 hover:border-slate hover:bg-slate-soft
          {isSelected(day) ? 'border-faint bg-slate-soft ring-1 ring-faint' : ''}
          {muted ? 'opacity-35' : ''}"
        onclick={() => app.selectDay(dateKey(day))}
      >
        <div class="flex items-center gap-1.5">
          <span
            class="grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm tabular-nums transition-colors
              {isSameDay(day, today)
                ? 'bg-text font-semibold text-ink'
                : 'text-muted group-hover:text-text'}"
          >
            {day.getDate()}
          </span>

          <!-- Entry indicator: one muted dot, or a small cluster for multiples -->
          {#if count > 0}
            <span class="flex items-center gap-1">
              {#each Array(Math.min(count, 3)) as _, i (i)}
                <span class="h-1.5 w-1.5 rounded-full bg-muted"></span>
              {/each}
              {#if count > 3}
                <span class="text-[0.6rem] font-medium leading-none text-muted">+{count - 3}</span>
              {/if}
            </span>
          {/if}
        </div>
      </button>
    {/each}
  </div>
</section>
