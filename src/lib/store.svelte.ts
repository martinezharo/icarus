/**
 * Global application state, built on Svelte 5 runes. A single instance (`app`)
 * is shared across components. It owns the entries, the current view, the
 * calendar position, and all the side-effecting actions (load / commit /
 * import / export) — each of which keeps the in-memory model and the on-disk
 * `.ics` file in sync via an atomic write.
 */
import type { DiaryEntry, StoredDraft, Toast, ToastLevel } from './types';
import { generateUid, parseIcs, serializeIcs } from './ical';
import { loadDrafts, persistDrafts } from './drafts';
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
  /** The writing dock has two states: a collapsed bar, or fullscreen. */
  dockExpanded = $state(false);
  settingsOpen = $state(false);
  busy = $state(false);
  toasts = $state<Toast[]>([]);

  // --- draft editor state -------------------------------------------------
  // The live contents of the writing dock. Kept here (not in the component) so
  // it can be autosaved and swapped between drafts from one place.
  draftId = $state<string | null>(null); // null = a fresh, unsaved draft
  // True only when the editor was loaded from a previously saved draft (not a
  // brand-new entry that merely got autosaved). Gates the "Discard" action.
  draftOpened = $state(false);
  draftTitle = $state('');
  draftLocation = $state('');
  draftContent = $state('');
  draftDateKey = $state(dateKey(new Date()));

  /** All persisted drafts, newest first. */
  drafts = $state<StoredDraft[]>([]);
  /** Id of the draft awaiting delete confirmation (null = dialog closed). */
  confirmDeleteId = $state<string | null>(null);

  // Debounce handle for autosave (plain field — not reactive).
  private draftSaveTimer: ReturnType<typeof setTimeout> | null = null;

  // --- derived ------------------------------------------------------------
  entriesByDay = $derived.by(() => groupByDay(this.entries));

  selectedEntries = $derived.by<DiaryEntry[]>(() =>
    this.selectedKey ? (this.entriesByDay.get(this.selectedKey) ?? []) : [],
  );

  // --- boot ---------------------------------------------------------------
  /** Decide the initial screen: reopen the saved vault, or show Welcome. */
  async init(): Promise<void> {
    void this.loadDraftsFromDisk();
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
   * Commit the current editor contents as a new entry: update memory, rebuild
   * search, and persist. In blank-canvas mode (no file yet) we prompt for a
   * save location on the first commit so the work is never silently lost.
   * On success the backing draft is removed and the editor is cleared.
   */
  async commit(): Promise<void> {
    const title = this.draftTitle.trim();
    if (!title && !this.draftContent.trim()) {
      this.toast('info', 'Write something first.');
      return;
    }

    const entry: DiaryEntry = {
      uid: generateUid(),
      title: title || 'Untitled',
      content: this.draftContent,
      location: this.draftLocation.trim() || undefined,
      date: keyToDate(this.draftDateKey),
    };
    const targetKey = this.draftDateKey;

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

    // A committed entry must no longer linger as a draft.
    this.cancelDraftSave();
    if (this.draftId) await this.removeDraft(this.draftId);
    this.resetEditor();

    this.selectedKey = targetKey;
    this.currentMonth = startOfMonth(entry.date);
    this.dockExpanded = false;
  }

  // --- drafts -------------------------------------------------------------
  /** Pull persisted drafts into memory on boot (no-op outside Tauri). */
  async loadDraftsFromDisk(): Promise<void> {
    try {
      this.drafts = await loadDrafts();
    } catch {
      // Store plugin unavailable (e.g. plain `vite dev`) — drafts stay empty.
    }
  }

  private hasEditorContent(): boolean {
    return !!(
      this.draftTitle.trim() ||
      this.draftContent.trim() ||
      this.draftLocation.trim()
    );
  }

  /** Clear the editor back to a fresh, unsaved draft. */
  resetEditor(): void {
    this.draftId = null;
    this.draftOpened = false;
    this.draftTitle = '';
    this.draftLocation = '';
    this.draftContent = '';
    this.draftDateKey = dateKey(new Date());
  }

  private cancelDraftSave(): void {
    if (this.draftSaveTimer) {
      clearTimeout(this.draftSaveTimer);
      this.draftSaveTimer = null;
    }
  }

  /** Debounced autosave — called as the user types. */
  scheduleDraftSave(): void {
    this.cancelDraftSave();
    this.draftSaveTimer = setTimeout(() => {
      this.draftSaveTimer = null;
      void this.flushDraft();
    }, 600);
  }

  /**
   * Write the current editor contents into the persisted draft list right now.
   * Creates a draft id on first save so subsequent edits update the same one.
   * Empty editors are ignored so we never persist a blank draft.
   */
  async flushDraft(): Promise<void> {
    if (!this.hasEditorContent()) return;
    if (!this.draftId) this.draftId = crypto.randomUUID();

    const draft: StoredDraft = {
      id: this.draftId,
      title: this.draftTitle,
      location: this.draftLocation,
      content: this.draftContent,
      dateKey: this.draftDateKey,
      updatedAt: Date.now(),
    };

    const rest = this.drafts.filter((d) => d.id !== draft.id);
    this.drafts = [draft, ...rest];
    try {
      await persistDrafts(this.drafts);
    } catch {
      // Persistence unavailable — keep it in memory at least.
    }
  }

  /** Flush immediately (used on collapse / app close). */
  async flushDraftNow(): Promise<void> {
    this.cancelDraftSave();
    await this.flushDraft();
  }

  private async removeDraft(id: string): Promise<void> {
    this.drafts = this.drafts.filter((d) => d.id !== id);
    try {
      await persistDrafts(this.drafts);
    } catch {
      // ignore — list already updated in memory
    }
  }

  /** Load a saved draft into the editor, stashing whatever was being written. */
  async openDraft(id: string): Promise<void> {
    // Don't lose the in-progress work: persist it before swapping.
    await this.flushDraftNow();
    const d = this.drafts.find((x) => x.id === id);
    if (!d) return;
    this.draftId = d.id;
    this.draftOpened = true;
    this.draftTitle = d.title;
    this.draftLocation = d.location;
    this.draftContent = d.content;
    this.draftDateKey = d.dateKey;
    this.dockExpanded = true;
  }

  /** "Save as draft" — stash the current work and start a fresh editor. */
  async saveDraftAndReset(): Promise<void> {
    this.cancelDraftSave();
    if (!this.hasEditorContent()) {
      this.toast('info', 'Write something first.');
      return;
    }
    await this.flushDraft();
    this.resetEditor();
    this.toast('success', 'Saved to drafts');
  }

  /** Open the shared confirmation dialog for deleting/discarding a draft. */
  requestDeleteDraft(id: string): void {
    this.confirmDeleteId = id;
  }
  cancelDeleteDraft(): void {
    this.confirmDeleteId = null;
  }
  /** Carry out the pending deletion (both "Delete" and "Discard" land here). */
  async confirmDeleteDraft(): Promise<void> {
    const id = this.confirmDeleteId;
    this.confirmDeleteId = null;
    if (!id) return;
    await this.deleteDraft(id);
    this.toast('info', 'Draft deleted');
  }

  /** Delete a draft; clears the editor (and pending autosave) if it was open. */
  async deleteDraft(id: string): Promise<void> {
    if (this.draftId === id) this.cancelDraftSave();
    await this.removeDraft(id);
    if (this.draftId === id) this.resetEditor();
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
