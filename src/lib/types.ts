/** A single diary entry, mapped 1:1 to a VEVENT in the .ics file. */
export interface DiaryEntry {
  /** VEVENT UID — stable identity, used for de-dupe and updates. */
  uid: string;
  /** SUMMARY — the entry title. */
  title: string;
  /** DESCRIPTION — the entry body, authored in Markdown. */
  content: string;
  /** LOCATION — an optional subtitle (user repurposes this field). */
  location?: string;
  /** DTSTART — the day the entry belongs to (date-only; time is ignored). */
  date: Date;
}

/**
 * A draft persisted to disk so half-written entries survive a crash, power
 * loss, or simply closing the app. Many can coexist; `id` is the stable key.
 */
export interface StoredDraft {
  id: string;
  title: string;
  location: string;
  content: string;
  /** ISO `YYYY-MM-DD`. */
  dateKey: string;
  /** Epoch ms of the last edit — used to sort the drafts list. */
  updatedAt: number;
}

/** A typed result so callers can react to parse failures without throwing. */
export type ParseResult =
  | { ok: true; entries: DiaryEntry[] }
  | { ok: false; error: string };

/** Severity levels for user-facing toasts. */
export type ToastLevel = 'info' | 'success' | 'error';

export interface Toast {
  id: number;
  level: ToastLevel;
  message: string;
}
