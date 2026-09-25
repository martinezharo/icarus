/**
 * Diary statistics: pure aggregation over committed entries, shared by the
 * statistics modal. Deliberately free of Svelte and DOM concerns so the maths
 * can be unit-tested and the modal only has to worry about presentation.
 */
import type { DiaryEntry } from './types';
import { dateKey, keyToDate, longDayLabel, monthLabel } from './date';

/** The time windows the statistics modal can show. */
export type StatsPeriod = '30d' | '12m' | 'year' | 'all';

export interface StatsPeriodOption {
  value: StatsPeriod;
  label: string;
}

/** Period choices, in the order they appear in the selector. */
export const STATS_PERIODS: readonly StatsPeriodOption[] = [
  { value: '30d', label: 'Last 30 days' },
  { value: '12m', label: 'Last year' },
  { value: 'year', label: 'This year' },
  { value: 'all', label: 'All time' },
];

/** How a chart bucket groups entries. */
export type BucketUnit = 'day' | 'month' | 'year';

/** Aggregated characters for one calendar day. */
export interface DayStat {
  /** Local `YYYY-MM-DD`. */
  key: string;
  date: Date;
  chars: number;
  entries: number;
}

/** One point of the "characters over time" chart. */
export interface StatsBucket {
  /** Stable bucket id: `YYYY-MM-DD`, `YYYY-MM` or `YYYY`. */
  key: string;
  /** Compact axis label, e.g. "8 Jun" / "Jun" / "2024". */
  label: string;
  /** Readable tooltip label, e.g. "Monday, 8 June 2026". */
  fullLabel: string;
  chars: number;
  entries: number;
}

export interface DiaryStats {
  period: StatsPeriod;
  totalEntries: number;
  totalChars: number;
  /** Day with the most characters in the period (null when there are none). */
  bestDay: DayStat | null;
  /** Up to ten days with the most characters, descending. */
  ranking: DayStat[];
  /** Every bucket of the period, including empty ones, chronological. */
  buckets: StatsBucket[];
}

const MAX_RANKING = 10;
/** Beyond this many months, an all-time chart switches to yearly buckets. */
const MONTHLY_BUCKET_LIMIT = 48;

/**
 * Characters that count towards the statistics: the body of an entry. Titles
 * and locations are ignored so the metric tracks actual writing volume.
 */
export function entryChars(entry: DiaryEntry): number {
  return entry.content.length;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(date: Date, n: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + n, 1);
}

/** Bucket id a given day falls into for the chosen unit. */
function bucketKey(date: Date, unit: BucketUnit): string {
  const key = dateKey(date);
  return unit === 'day' ? key : unit === 'month' ? key.slice(0, 7) : key.slice(0, 4);
}

interface StatsRange {
  unit: BucketUnit;
  /** First bucket start. */
  start: Date;
  /** Last bucket start (inclusive). */
  end: Date;
}

function periodRange(
  period: StatsPeriod,
  entries: readonly DiaryEntry[],
  now: Date,
): StatsRange | null {
  if (period === '30d') {
    const today = startOfDay(now);
    return {
      unit: 'day',
      start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29),
      end: today,
    };
  }
  if (period === '12m') {
    const end = startOfMonth(now);
    return { unit: 'month', start: addMonths(end, -11), end };
  }
  if (period === 'year') {
    return {
      unit: 'month',
      start: new Date(now.getFullYear(), 0, 1),
      end: startOfMonth(now),
    };
  }

  // All time: from the first entry to the latest entry (or today, whichever
  // is later). Nothing to chart when the diary has never been written.
  if (entries.length === 0) return null;
  let first = dateKey(entries[0].date);
  let last = first;
  for (const entry of entries) {
    const key = dateKey(entry.date);
    if (key < first) first = key;
    if (key > last) last = key;
  }
  const start = startOfMonth(keyToDate(first));
  const lastDate = keyToDate(last);
  const end = startOfMonth(lastDate > now ? lastDate : now);
  const months =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth()) +
    1;
  const unit: BucketUnit = months > MONTHLY_BUCKET_LIMIT ? 'year' : 'month';
  return {
    unit,
    start: unit === 'year' ? new Date(start.getFullYear(), 0, 1) : start,
    end,
  };
}

function nextBucket(date: Date, unit: BucketUnit): Date {
  if (unit === 'day') return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
  if (unit === 'month') return new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return new Date(date.getFullYear() + 1, 0, 1);
}

function shortLabel(date: Date, unit: BucketUnit): string {
  if (unit === 'day') {
    return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  }
  if (unit === 'month') return date.toLocaleDateString(undefined, { month: 'short' });
  return String(date.getFullYear());
}

function fullLabel(date: Date, unit: BucketUnit): string {
  if (unit === 'day') return longDayLabel(date);
  if (unit === 'month') return monthLabel(date);
  return String(date.getFullYear());
}

/** Every bucket of the range, empty ones included, in chronological order. */
function listBuckets(range: StatsRange): StatsBucket[] {
  const buckets: StatsBucket[] = [];
  for (
    let cursor = range.start;
    cursor <= range.end;
    cursor = nextBucket(cursor, range.unit)
  ) {
    buckets.push({
      key: bucketKey(cursor, range.unit),
      label: shortLabel(cursor, range.unit),
      fullLabel: fullLabel(cursor, range.unit),
      chars: 0,
      entries: 0,
    });
  }
  return buckets;
}

/** Aggregate `entries` for the given period. */
export function computeStats(
  entries: readonly DiaryEntry[],
  period: StatsPeriod,
  now: Date = new Date(),
): DiaryStats {
  const range = periodRange(period, entries, now);
  const buckets = range ? listBuckets(range) : [];
  const byKey = new Map(buckets.map((bucket) => [bucket.key, bucket]));
  const days = new Map<string, DayStat>();

  let totalEntries = 0;
  let totalChars = 0;
  if (range) {
    for (const entry of entries) {
      const bucket = byKey.get(bucketKey(entry.date, range.unit));
      if (!bucket) continue; // outside the selected period

      const chars = entryChars(entry);
      bucket.chars += chars;
      bucket.entries += 1;

      totalEntries += 1;
      totalChars += chars;

      const key = dateKey(entry.date);
      const day = days.get(key);
      if (day) {
        day.chars += chars;
        day.entries += 1;
      } else {
        days.set(key, { key, date: startOfDay(entry.date), chars, entries: 1 });
      }
    }
  }

  const ranking = [...days.values()]
    .sort((a, b) => b.chars - a.chars || (a.key < b.key ? 1 : -1))
    .slice(0, MAX_RANKING);

  return {
    period,
    totalEntries,
    totalChars,
    bestDay: ranking[0] && ranking[0].chars > 0 ? ranking[0] : null,
    ranking,
    buckets,
  };
}
