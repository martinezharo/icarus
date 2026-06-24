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

/** Draft shape used by the writing dock before an entry is committed. */
export interface EntryDraft {
  title: string;
  location: string;
  content: string;
  /** ISO `YYYY-MM-DD` from the native date input. */
  dateKey: string;
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
