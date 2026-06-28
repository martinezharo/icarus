/**
 * The iCalendar layer. All `.ics` reading/writing goes through here so the rest
 * of the app only ever deals with the clean {@link DiaryEntry} model.
 *
 * Uses `ical.js` (per spec). Parsing is fully defensive: a corrupt or partial
 * file yields a typed error rather than throwing, so the UI can stay alive and
 * keep whatever data is already in memory.
 */
import ICAL from 'ical.js';
import type { DiaryEntry, ParseResult } from './types';

const PRODID = '-//Icarus Diary//Local-First Diary//EN';

/** Generate a stable, iCal-style UID for a new entry. */
export function generateUid(): string {
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
  return `${id}@icarus.diary`;
}

/** Coerce an ical.js property value to a trimmed string (or undefined). */
function str(value: unknown): string | undefined {
  if (value == null) return undefined;
  const s = String(value).trim();
  return s.length ? s : undefined;
}

/**
 * Read the calendar date off a DTSTART value. We pull the literal calendar
 * components (year/month/day) rather than `toJSDate()` to avoid any timezone
 * drift across midnight — the diary is day-granular by design.
 *
 * Returns `null` if the value is missing or unparseable. Callers MUST handle
 * that case explicitly (we never want to silently re-date a corrupt entry to
 * "today" — the original day would be lost the next time we persist).
 */
function dtToDate(value: unknown): Date | null {
  const t = value as { year?: number; month?: number; day?: number } | null;
  if (t && typeof t === 'object' && typeof t.year === 'number') {
    return new Date(t.year, (t.month ?? 1) - 1, t.day ?? 1);
  }
  return null;
}

/**
 * Parse raw `.ics` text into entries. Never throws — returns a typed result.
 */
export function parseIcs(text: string): ParseResult {
  // An empty / whitespace-only file is a valid "no entries yet" state.
  if (!text || !text.trim()) return { ok: true, entries: [] };

  try {
    const jcal = ICAL.parse(text);
    const root = new ICAL.Component(jcal);
    const vevents = root.getAllSubcomponents('vevent');

    let invalidDates = 0;
    const entries: DiaryEntry[] = vevents.map((ve) => {
      const parsed = dtToDate(ve.getFirstPropertyValue('dtstart'));
      if (parsed) {
        return {
          uid: str(ve.getFirstPropertyValue('uid')) ?? generateUid(),
          title: str(ve.getFirstPropertyValue('summary')) ?? 'Untitled',
          content: str(ve.getFirstPropertyValue('description')) ?? '',
          location: str(ve.getFirstPropertyValue('location')),
          date: parsed,
        };
      }
      // Unreadable DTSTART: keep the entry (so the user doesn't lose its
      // title/content) but flag it with a sentinel date and bump a counter.
      // `serializeIcs` writes the sentinel back out as-is rather than
      // silently rewriting it to "today" on the next save.
      invalidDates++;
      return {
        uid: str(ve.getFirstPropertyValue('uid')) ?? generateUid(),
        title: str(ve.getFirstPropertyValue('summary')) ?? 'Untitled',
        content: str(ve.getFirstPropertyValue('description')) ?? '',
        location: str(ve.getFirstPropertyValue('location')),
        date: new Date(INVALID_DATE_SENTINEL),
      };
    });

    if (invalidDates > 0) {
      // Surface the warning on the console so the operator can see it; the
      // app itself stays alive and the entries are not silently lost.
      console.warn(
        `[ical] ${invalidDates} entr${invalidDates === 1 ? 'y has' : 'ies have'} an unparseable DTSTART — kept with placeholder date.`,
      );
    }

    return { ok: true, entries };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown parse error';
    return { ok: false, error: message };
  }
}

/**
 * Sentinel year used to mark entries whose DTSTART could not be parsed.
 *
 * Year 9999 is used because (a) it round-trips cleanly through the
 * iCalendar serialization used here, and (b) it is so far outside the range
 * of any real diary entry that we can detect it deterministically without
 * any extra metadata on the entry. JS Date handles it (with a UTC offset in
 * the printed string) and ical.js writes `VALUE=DATE:99990101` and reads it
 * back identically.
 */
export const INVALID_DATE_SENTINEL_YEAR = 9999;
const INVALID_DATE_SENTINEL = new Date(INVALID_DATE_SENTINEL_YEAR, 0, 1).getTime();

/** Whether `date` is the placeholder used for unparseable DTSTARTs. */
export function isInvalidDate(date: Date): boolean {
  return date.getFullYear() === INVALID_DATE_SENTINEL_YEAR;
}

/**
 * Serialize entries to valid `.ics` text. DTSTART is written as a date-only
 * value (VALUE=DATE) since entries belong to a day, not a moment.
 */
export function serializeIcs(entries: DiaryEntry[]): string {
  const vcal = new ICAL.Component(['vcalendar', [], []]);
  vcal.updatePropertyWithValue('version', '2.0');
  vcal.updatePropertyWithValue('prodid', PRODID);
  vcal.updatePropertyWithValue('calscale', 'GREGORIAN');

  for (const e of entries) {
    const ve = new ICAL.Component('vevent');
    ve.updatePropertyWithValue('uid', e.uid);
    ve.updatePropertyWithValue('dtstamp', ICAL.Time.now());

    const dt = ICAL.Time.fromData({
      year: e.date.getFullYear(),
      month: e.date.getMonth() + 1,
      day: e.date.getDate(),
      isDate: true,
    });
    ve.updatePropertyWithValue('dtstart', dt);

    ve.updatePropertyWithValue('summary', e.title);
    if (e.content) ve.updatePropertyWithValue('description', e.content);
    if (e.location) ve.updatePropertyWithValue('location', e.location);

    vcal.addSubcomponent(ve);
  }

  return vcal.toString();
}
