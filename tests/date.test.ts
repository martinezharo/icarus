import { describe, it, expect } from 'vitest';
import {
  addMonths,
  dateKey,
  isSameDay,
  keyToDate,
  longDayLabel,
  monthGrid,
  monthLabel,
  startOfMonth,
  WEEKDAY_LABELS,
  MONTH_LABELS_SHORT,
} from '../src/lib/date';

describe('dateKey', () => {
  it('formats a Date as YYYY-MM-DD using local time', () => {
    const d = new Date(2026, 5, 8); // 8 June 2026
    expect(dateKey(d)).toBe('2026-06-08');
  });

  it('zero-pads single-digit months and days', () => {
    expect(dateKey(new Date(2026, 0, 3))).toBe('2026-01-03');
    expect(dateKey(new Date(2026, 8, 30))).toBe('2026-09-30');
  });
});

describe('keyToDate', () => {
  it('parses a YYYY-MM-DD string into a local Date at midnight', () => {
    const d = keyToDate('2026-06-08');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(5);
    expect(d.getDate()).toBe(8);
    expect(d.getHours()).toBe(0);
  });

  it('round-trips with dateKey', () => {
    const original = new Date(2026, 11, 31);
    expect(dateKey(keyToDate(dateKey(original)))).toBe('2026-12-31');
  });
});

describe('isSameDay', () => {
  it('returns true for the same calendar day regardless of time', () => {
    const morning = new Date(2026, 5, 8, 7, 0);
    const evening = new Date(2026, 5, 8, 22, 30);
    expect(isSameDay(morning, evening)).toBe(true);
  });

  it('returns false across midnight', () => {
    const a = new Date(2026, 5, 8, 23, 59);
    const b = new Date(2026, 5, 9, 0, 1);
    expect(isSameDay(a, b)).toBe(false);
  });
});

describe('startOfMonth', () => {
  it('returns the first day of the month at midnight', () => {
    const d = startOfMonth(new Date(2026, 5, 8));
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(5);
    expect(d.getDate()).toBe(1);
    expect(d.getHours()).toBe(0);
  });
});

describe('addMonths', () => {
  it('adds months within a year', () => {
    const d = new Date(2026, 5, 8);
    expect(addMonths(d, 1)).toEqual(new Date(2026, 6, 1));
  });

  it('crosses a year boundary forward', () => {
    const d = new Date(2026, 11, 15);
    expect(addMonths(d, 1)).toEqual(new Date(2027, 0, 1));
  });

  it('crosses a year boundary backward', () => {
    const d = new Date(2026, 0, 15);
    expect(addMonths(d, -1)).toEqual(new Date(2025, 11, 1));
  });

  it('returns the first of the month (no carryover of the original day)', () => {
    expect(addMonths(new Date(2026, 0, 31), 1).getDate()).toBe(1);
  });
});

describe('monthLabel', () => {
  it('returns "<Month> <year>" in English', () => {
    expect(monthLabel(new Date(2026, 0, 1))).toBe('January 2026');
    expect(monthLabel(new Date(2026, 11, 1))).toBe('December 2026');
  });
});

describe('longDayLabel', () => {
  it('returns a localised long label for the given day', () => {
    const label = longDayLabel(new Date(2026, 5, 8)); // Monday
    // Locale-agnostic check: the year and the day-of-month must appear.
    expect(label).toContain('2026');
    expect(label).toContain('8');
    // The label is non-empty.
    expect(label.length).toBeGreaterThan(0);
  });
});

describe('monthGrid', () => {
  it('always returns 42 days (6 weeks × 7 days)', () => {
    const grid = monthGrid(new Date(2026, 5, 1));
    expect(grid).toHaveLength(42);
  });

  it('starts on a Monday', () => {
    const grid = monthGrid(new Date(2026, 5, 1)); // June 2026
    // 1 June 2026 is a Monday, so the grid starts on 1 June.
    expect(grid[0].getDay()).toBe(1);
  });

  it('is contiguous (each day is +1 from the previous)', () => {
    const grid = monthGrid(new Date(2026, 5, 1));
    for (let i = 1; i < grid.length; i++) {
      const diff = grid[i].getTime() - grid[i - 1].getTime();
      expect(diff).toBe(24 * 60 * 60 * 1000);
    }
  });

  it('always contains every day of the requested month', () => {
    const grid = monthGrid(new Date(2026, 1, 1)); // February (28 days in 2026)
    const inMonth = grid.filter((d) => d.getMonth() === 1);
    expect(inMonth).toHaveLength(28);
  });

  it('pads with trailing/leading days from neighbouring months', () => {
    const grid = monthGrid(new Date(2026, 0, 1)); // January 2026
    const inMonth = grid.filter((d) => d.getMonth() === 0);
    expect(inMonth).toHaveLength(31);
    // The remaining 11 cells are 0 from December 2025 + a few from February.
    const before = grid.filter((d) => d.getMonth() === 11 && d.getFullYear() === 2025);
    const after = grid.filter((d) => d.getMonth() === 1);
    expect(before.length + after.length).toBe(11);
  });
});

describe('WEEKDAY_LABELS / MONTH_LABELS_SHORT', () => {
  it('exposes 7 English weekday labels starting on Monday', () => {
    expect(WEEKDAY_LABELS).toHaveLength(7);
    expect(WEEKDAY_LABELS[0]).toBe('Mon');
    expect(WEEKDAY_LABELS[6]).toBe('Sun');
  });

  it('exposes 12 English short month labels', () => {
    expect(MONTH_LABELS_SHORT).toHaveLength(12);
    expect(MONTH_LABELS_SHORT[0]).toBe('Jan');
    expect(MONTH_LABELS_SHORT[11]).toBe('Dec');
  });
});
