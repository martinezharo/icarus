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
 */
function dtToDate(value: unknown): Date {
  const t = value as { year?: number; month?: number; day?: number } | null;
  if (t && typeof t === 'object' && typeof t.year === 'number') {
    return new Date(t.year, (t.month ?? 1) - 1, t.day ?? 1);
  }
  return new Date();
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

    const entries: DiaryEntry[] = vevents.map((ve) => {
      const dtstart = ve.getFirstPropertyValue('dtstart');
      return {
        uid: str(ve.getFirstPropertyValue('uid')) ?? generateUid(),
        title: str(ve.getFirstPropertyValue('summary')) ?? 'Untitled',
        content: str(ve.getFirstPropertyValue('description')) ?? '',
        location: str(ve.getFirstPropertyValue('location')),
        date: dtToDate(dtstart),
      };
    });

    return { ok: true, entries };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown parse error';
    return { ok: false, error: message };
  }
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
