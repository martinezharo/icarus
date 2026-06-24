/**
 * Global application state, built on Svelte 5 runes. A single instance (`app`)
 * is shared across components. It owns the entries, the current view, the
 * calendar position, and all the side-effecting actions (load / commit /
 * import / export) — each of which keeps the in-memory model and the on-disk
 * `.ics` file in sync via an atomic write.
 */
import type { EntryDraft, DiaryEntry, Toast, ToastLevel } from './types';
import { generateUid, parseIcs, serializeIcs } from './ical';
import {
  readIcs,
  writeIcsAtomic,
  exists,
  pickIcsToOpen,
  pickIcsToSave,
} from './fs';
import {
  getSavedIcsPath,
  setSavedIcsPath,
  clearSavedIcsPath,
} from './config';
import { buildSearchIndex } from './search';
import { addMonths, dateKey, keyToDate, startOfMonth } from './date';

type View = 'welcome' | 'main';

function groupByDay(entries: DiaryEntry[]): Map<string, DiaryEntry[]> {
  const map = new Map<string, DiaryEntry[]>();
  for (const e of entries) {
    const key = dateKey(e.date);
    const bucket = map.get(key);
    if (bucket) bucket.push(e);
    else map.set(key, [e]);
  }
  return map;
}

let toastSeq = 0;

class AppStore {
  // --- core reactive state ------------------------------------------------
  entries = $state<DiaryEntry[]>([]);
  filePath = $state<string | null>(null);
  view = $state<View>('welcome');
  ready = $state(false); // finished the initial boot check

  /** `YYYY-MM-DD` of the day pane currently open on the right (or null). */
  selectedKey = $state<string | null>(null);
  currentMonth = $state<Date>(startOfMonth(new Date()));

  searchOpen = $state(false);
  dockExpanded = $state(false);
  settingsOpen = $state(false);
  busy = $state(false);
  toasts = $state<Toast[]>([]);

  // --- derived ------------------------------------------------------------
  entriesByDay = $derived.by(() => groupByDay(this.entries));

  selectedEntries = $derived.by<DiaryEntry[]>(() =>
    this.selectedKey ? (this.entriesByDay.get(this.selectedKey) ?? []) : [],
  );

  // --- boot ---------------------------------------------------------------
  /** Decide the initial screen: reopen the saved vault, or show Welcome. */
  async init(): Promise<void> {
    try {
      const saved = await getSavedIcsPath();
      if (saved && (await exists(saved))) {
        const ok = await this.loadFromPath(saved, { remember: false });
        if (ok) return;
      } else if (saved) {
        // The remembered file moved or was deleted — forget it gracefully.
        await clearSavedIcsPath();
      }
    } catch {
      // Any boot failure simply falls through to the Welcome screen.
    } finally {
      this.ready = true;
    }
    this.view = 'welcome';
  }

  // --- vault loading ------------------------------------------------------
  async loadFromPath(
    path: string,
    opts: { remember?: boolean } = {},
  ): Promise<boolean> {
    this.busy = true;
    try {
      const text = await readIcs(path);
      const res = parseIcs(text);
      if (!res.ok) {
        this.toast('error', `Couldn't read this file — ${res.error}`);
        return false;
      }
      this.entries = res.entries;
      this.filePath = path;
      buildSearchIndex(this.entries);
      if (opts.remember !== false) await setSavedIcsPath(path);
      this.view = 'main';
      this.ready = true;
      return true;
    } catch {
      this.toast('error', 'Could not open that file.');
      return false;
    } finally {
      this.busy = false;
    }
  }

  /** Open the native file dialog and load the chosen vault. */
  async openVaultDialog(): Promise<void> {
    const path = await pickIcsToOpen();
    if (path) await this.loadFromPath(path);
  }

  /** A file dropped onto the welcome zone. */
  async openDroppedPath(path: string): Promise<void> {
    if (!path.toLowerCase().endsWith('.ics')) {
      this.toast('error', 'Please drop an .ics file.');
      return;
    }
    await this.loadFromPath(path);
  }

  /** "Skip for now" — enter the app with an empty, in-memory canvas. */
  skipToBlank(): void {
    this.view = 'main';
    this.ready = true;
  }

  // --- writing ------------------------------------------------------------
  /**
   * Commit a draft as a new entry: update memory, rebuild search, and persist.
   * In blank-canvas mode (no file yet) we prompt for a save location on the
   * first commit so the work is never silently lost.
   */
  async commit(draft: EntryDraft): Promise<void> {
    const entry: DiaryEntry = {
      uid: generateUid(),
      title: draft.title.trim() || 'Untitled',
      content: draft.content,
      location: draft.location.trim() || undefined,
      date: keyToDate(draft.dateKey),
    };

    this.entries = [...this.entries, entry];
    buildSearchIndex(this.entries);

    if (!this.filePath) {
      const created = await this.chooseVaultLocation();
      if (!created) {
        this.toast(
          'info',
          'Saved in memory only — set a vault file to keep it.',
        );
      }
    } else {
      await this.persist();
    }

    this.selectedKey = draft.dateKey;
    this.currentMonth = startOfMonth(entry.date);
    this.dockExpanded = false;
  }

  /** Write current entries to `filePath` atomically. Toasts on failure. */
  private async persist(): Promise<void> {
    if (!this.filePath) return;
    this.busy = true;
    try {
      await writeIcsAtomic(this.filePath, serializeIcs(this.entries));
      this.toast('success', 'Saved to vault');
    } catch {
      this.toast('error', 'Write failed — your changes are still in memory.');
    } finally {
      this.busy = false;
    }
  }

  /** Pick a brand-new vault file and persist current entries into it. */
  async chooseVaultLocation(): Promise<boolean> {
    const path = await pickIcsToSave();
    if (!path) return false;
    this.filePath = path;
    await setSavedIcsPath(path);
    await this.persist();
    return true;
  }

  // --- import / export ----------------------------------------------------
  async importVault(): Promise<void> {
    this.settingsOpen = false;
    await this.openVaultDialog();
  }

  /**
   * Forget the current vault: drop the remembered path and the in-memory
   * entries, then return to the Welcome screen. The `.ics` file on disk is
   * left untouched — only the link to it is removed.
   */
  async forgetVault(): Promise<void> {
    await clearSavedIcsPath();
    this.entries = [];
    buildSearchIndex(this.entries);
    this.filePath = null;
    this.selectedKey = null;
    this.settingsOpen = false;
    this.view = 'welcome';
  }

  /** Export a clean backup copy to any location (USB drive, etc.). */
  async exportVault(): Promise<void> {
    const path = await pickIcsToSave('icarus-diary-backup.ics');
    if (!path) return;
    this.busy = true;
    try {
      await writeIcsAtomic(path, serializeIcs(this.entries));
      this.toast('success', 'Backup exported.');
      this.settingsOpen = false;
    } catch {
      this.toast('error', 'Export failed.');
    } finally {
      this.busy = false;
    }
  }

  // --- navigation ---------------------------------------------------------
  selectDay(key: string): void {
    this.selectedKey = key;
  }
  closeDay(): void {
    this.selectedKey = null;
  }
  navigateMonth(delta: number): void {
    this.currentMonth = addMonths(this.currentMonth, delta);
  }
  /** Jump straight to a given month/year (used by the header picker). */
  goToMonth(year: number, month: number): void {
    this.currentMonth = new Date(year, month, 1);
  }
  goToToday(): void {
    this.currentMonth = startOfMonth(new Date());
    this.selectedKey = dateKey(new Date());
  }

  /** Jump from a search hit straight to its day. */
  jumpToEntry(entry: DiaryEntry): void {
    this.currentMonth = startOfMonth(entry.date);
    this.selectedKey = dateKey(entry.date);
    this.searchOpen = false;
  }

  // --- toasts -------------------------------------------------------------
  toast(level: ToastLevel, message: string): void {
    const id = ++toastSeq;
    this.toasts = [...this.toasts, { id, level, message }];
    setTimeout(() => this.dismiss(id), 3600);
  }
  dismiss(id: number): void {
    this.toasts = this.toasts.filter((t) => t.id !== id);
  }
}

export const app = new AppStore();
