/**
 * Date helpers. Journal entries are day-granular, so we key everything by a
 * local `YYYY-MM-DD` string and deliberately avoid UTC conversions (which would
 * shift a date across midnight depending on the user's timezone).
 */

/** Local-timezone `YYYY-MM-DD` for a Date. */
export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Parse a `YYYY-MM-DD` key back into a local Date at midnight. */
export function keyToDate(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function isSameDay(a: Date, b: Date): boolean {
  return dateKey(a) === dateKey(b);
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function monthLabel(d: Date): string {
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Long, readable label for a specific day, e.g. "Monday, 8 June 2026". */
export function longDayLabel(d: Date): string {
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * The 6×7 grid of days to render for a month view, including the trailing days
 * of the previous month and leading days of the next so the grid is always full.
 * Week starts on Monday.
 */
export function monthGrid(monthStart: Date): Date[] {
  const firstDow = (monthStart.getDay() + 6) % 7; // 0 = Monday
  const start = new Date(
    monthStart.getFullYear(),
    monthStart.getMonth(),
    1 - firstDow,
  );
  return Array.from({ length: 42 }, (_, i) =>
    new Date(start.getFullYear(), start.getMonth(), start.getDate() + i),
  );
}

export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Short month names, for the compact header month/year picker. */
export const MONTH_LABELS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
