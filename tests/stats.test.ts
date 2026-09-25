import { describe, expect, it } from 'vitest';
import {
  computeStats,
  entryChars,
  type StatsPeriod,
} from '../src/lib/stats';
import { keyToDate } from '../src/lib/date';
import type { DiaryEntry } from '../src/lib/types';

let seq = 0;

/** Minimal entry on `day` with the given body. */
function entry(day: string, content: string, title = 'Entry'): DiaryEntry {
  return {
    uid: `test-${seq++}@icarus.diary`,
    title,
    content,
    date: keyToDate(day),
  };
}

const NOW = new Date(2026, 8, 25); // 25 Sep 2026

describe('entryChars', () => {
  it('counts the characters of the entry body', () => {
    expect(entryChars(entry('2026-09-25', 'hello'))).toBe(5);
  });

  it('ignores the title and location', () => {
    const e = entry('2026-09-25', 'body', 'A much longer title indeed');
    expect(entryChars(e)).toBe(4);
  });
});

describe('computeStats — last 30 days', () => {
  const entries = [
    entry('2026-08-26', 'x'.repeat(5)), // 30 days back → outside
    entry('2026-08-27', 'x'.repeat(3)), // 29 days back → first bucket
    entry('2026-09-25', 'x'.repeat(10)), // today
    entry('2026-09-26', 'x'.repeat(99)), // future → outside
  ];

  it('covers exactly the last 30 days, today included', () => {
    const stats = computeStats(entries, '30d', NOW);
    expect(stats.buckets).toHaveLength(30);
    expect(stats.buckets[0].key).toBe('2026-08-27');
    expect(stats.buckets.at(-1)?.key).toBe('2026-09-25');
  });

  it('only totals entries inside the window', () => {
    const stats = computeStats(entries, '30d', NOW);
    expect(stats.totalEntries).toBe(2);
    expect(stats.totalChars).toBe(13);
  });
});

describe('computeStats — this year (calendar year)', () => {
  const entries = [
    entry('2025-12-31', 'old', 'Old'),
    entry('2026-01-01', 'ab', 'New year'),
    entry('2026-09-25', 'abcde', 'Today'),
  ];

  it('runs from January to the current month', () => {
    const stats = computeStats(entries, 'year', NOW);
    expect(stats.buckets.map((b) => b.key)).toEqual([
      '2026-01',
      '2026-02',
      '2026-03',
      '2026-04',
      '2026-05',
      '2026-06',
      '2026-07',
      '2026-08',
      '2026-09',
    ]);
    expect(stats.totalEntries).toBe(2);
    expect(stats.totalChars).toBe(7);
  });

  it('sums characters into the right month', () => {
    const stats = computeStats(entries, 'year', NOW);
    expect(stats.buckets[0].chars).toBe(2);
    expect(stats.buckets.at(-1)?.chars).toBe(5);
  });
});

describe('computeStats — last year (trailing 12 months)', () => {
  it('spans the current month and the eleven before it', () => {
    const entries = [
      entry('2025-10-01', 'aa'),
      entry('2025-12-24', 'bb'),
      entry('2026-09-25', 'cc'),
      entry('2025-09-30', 'excluded'),
    ];
    const stats = computeStats(entries, '12m', NOW);
    expect(stats.buckets).toHaveLength(12);
    expect(stats.buckets[0].key).toBe('2025-10');
    expect(stats.buckets.at(-1)?.key).toBe('2026-09');
    expect(stats.totalEntries).toBe(3);
  });
});

describe('computeStats — all time', () => {
  it('uses monthly buckets for a few years of history', () => {
    const entries = [entry('2025-01-10', 'a'), entry('2026-09-25', 'bb')];
    const stats = computeStats(entries, 'all', NOW);
    expect(stats.buckets[0].key).toBe('2025-01');
    expect(stats.buckets.at(-1)?.key).toBe('2026-09');
    expect(stats.buckets).toHaveLength(21);
  });

  it('keeps monthly buckets up to four years, then goes yearly', () => {
    const monthly = computeStats(
      [entry('2022-10-01', 'a'), entry('2026-09-25', 'b')],
      'all',
      NOW,
    );
    expect(monthly.buckets).toHaveLength(48);
    expect(monthly.buckets[0].key).toBe('2022-10');

    const yearly = computeStats(
      [entry('2022-09-30', 'a'), entry('2026-09-25', 'b')],
      'all',
      NOW,
    );
    expect(yearly.buckets[0].key).toBe('2022');
    expect(yearly.buckets).toHaveLength(5);
  });

  it('switches to yearly buckets for long histories', () => {
    const entries = [entry('2020-01-10', 'a'), entry('2026-09-25', 'bb')];
    const stats = computeStats(entries, 'all', NOW);
    expect(stats.buckets.map((b) => b.key)).toEqual([
      '2020',
      '2021',
      '2022',
      '2023',
      '2024',
      '2025',
      '2026',
    ]);
    expect(stats.totalChars).toBe(3);
  });

  it('extends to a future-dated entry rather than cutting it off', () => {
    const entries = [entry('2026-09-25', 'a'), entry('2026-11-02', 'bbb')];
    const stats = computeStats(entries, 'all', NOW);
    expect(stats.buckets.at(-1)?.key).toBe('2026-11');
    expect(stats.totalChars).toBe(4);
  });

  it('ignores entries with an unparseable-date placeholder', () => {
    const placeholder: DiaryEntry = {
      uid: 'sentinel@icarus.diary',
      title: 'Broken date',
      content: 'x'.repeat(1000),
      date: new Date(9999, 0, 1),
    };
    const stats = computeStats([entry('2026-09-25', 'aaa'), placeholder], 'all', NOW);
    expect(stats.buckets.at(-1)?.key).toBe('2026-09');
    expect(stats.buckets.some((b) => b.key.startsWith('9999'))).toBe(false);
    expect(stats.totalEntries).toBe(1);
    expect(stats.totalChars).toBe(3);
    expect(stats.bestDay?.chars).toBe(3);
  });

  it('has nothing to chart when every date is a placeholder', () => {
    const placeholder: DiaryEntry = {
      uid: 'sentinel@icarus.diary',
      title: 'Broken date',
      content: 'text',
      date: new Date(9999, 0, 1),
    };
    const stats = computeStats([placeholder], 'all', NOW);
    expect(stats.buckets).toEqual([]);
    expect(stats.totalEntries).toBe(0);
    expect(stats.bestDay).toBeNull();
  });

  it('keeps real history when one date is absurdly far in the future', () => {
    const stats = computeStats(
      [
        entry('2025-06-01', 'aaa'),
        entry('2026-09-25', 'bb'),
        entry('3000-01-01', 'x'.repeat(50)),
      ],
      'all',
      NOW,
    );
    expect(stats.totalEntries).toBe(2);
    expect(stats.totalChars).toBe(5);
    expect(stats.buckets[0].key).toBe('2025-06');
    expect(stats.buckets.at(-1)?.key).toBe('2026-09');
  });

  it('keeps modern history when one date is absurdly far in the past', () => {
    const stats = computeStats(
      [entry('0300-01-01', 'ancient'), entry('2026-09-25', 'bb')],
      'all',
      NOW,
    );
    expect(stats.totalEntries).toBe(1);
    expect(stats.totalChars).toBe(2);
    expect(stats.buckets.map((b) => b.key)).toEqual(['2026-09']);
  });
});

describe('computeStats — day ranking', () => {
  it('sums all entries of a day before ranking', () => {
    const entries = [
      entry('2026-09-20', 'x'.repeat(10)),
      entry('2026-09-20', 'x'.repeat(5)),
      entry('2026-09-21', 'x'.repeat(12)),
    ];
    const stats = computeStats(entries, 'all', NOW);
    expect(stats.ranking[0].key).toBe('2026-09-20');
    expect(stats.ranking[0].chars).toBe(15);
    expect(stats.ranking[0].entries).toBe(2);
    expect(stats.bestDay?.key).toBe('2026-09-20');
  });

  it('breaks ties by most recent day', () => {
    const entries = [
      entry('2026-09-10', 'x'.repeat(20)),
      entry('2026-09-12', 'x'.repeat(20)),
    ];
    const stats = computeStats(entries, 'all', NOW);
    expect(stats.ranking.map((d) => d.key)).toEqual(['2026-09-12', '2026-09-10']);
  });

  it('keeps only the ten best days', () => {
    const entries = Array.from({ length: 14 }, (_, i) =>
      entry(`2026-08-${String(i + 1).padStart(2, '0')}`, 'x'.repeat(i + 1)),
    );
    const stats = computeStats(entries, 'all', NOW);
    expect(stats.ranking).toHaveLength(10);
    expect(stats.ranking[0].chars).toBe(14);
    expect(stats.ranking.at(-1)?.chars).toBe(5);
  });

  it('ignores days outside the selected period', () => {
    const entries = [
      entry('2025-01-01', 'x'.repeat(100)),
      entry('2026-09-25', 'x'),
    ];
    const stats = computeStats(entries, '30d', NOW);
    expect(stats.ranking.map((d) => d.key)).toEqual(['2026-09-25']);
  });
});

describe('computeStats — empty diary', () => {
  const periods: StatsPeriod[] = ['30d', '12m', 'year', 'all'];

  it('returns zeros without any entries', () => {
    for (const period of periods) {
      const stats = computeStats([], period, NOW);
      expect(stats.totalEntries).toBe(0);
      expect(stats.totalChars).toBe(0);
      expect(stats.bestDay).toBeNull();
      expect(stats.ranking).toEqual([]);
    }
  });

  it('still charts the fixed windows when the diary is empty', () => {
    expect(computeStats([], '30d', NOW).buckets).toHaveLength(30);
    expect(computeStats([], '12m', NOW).buckets).toHaveLength(12);
    expect(computeStats([], 'all', NOW).buckets).toEqual([]);
  });

  it('has no best day when every entry is an empty body', () => {
    const stats = computeStats([entry('2026-09-25', '', 'Title only')], 'all', NOW);
    expect(stats.totalEntries).toBe(1);
    expect(stats.totalChars).toBe(0);
    expect(stats.bestDay).toBeNull();
    expect(stats.ranking.map((d) => d.key)).toEqual(['2026-09-25']);
  });
});
