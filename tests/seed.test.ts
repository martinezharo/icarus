import { describe, it, expect } from 'vitest';
import { seedEntries } from '../src/lib/seed';
import { dateKey } from '../src/lib/date';

describe('seedEntries', () => {
  const today = new Date(2026, 8, 25);

  it('is deterministic for the same inputs', () => {
    expect(seedEntries(1, today)).toEqual(seedEntries(1, today));
  });

  it('spans the requested years, ends today and leaves gaps', () => {
    const entries = seedEntries(2, today);
    const days = new Set(entries.map((e) => dateKey(e.date)));
    expect(days.has('2026-09-25')).toBe(true);
    expect([...days].sort()[0] <= '2024-10-01').toBe(true);
    expect(days.size).toBeLessThan(2 * 365);
  });

  it('includes days with several entries and unique UIDs', () => {
    const entries = seedEntries(1, today);
    const perDay = new Map<string, number>();
    for (const e of entries) perDay.set(dateKey(e.date), (perDay.get(dateKey(e.date)) ?? 0) + 1);
    expect([...perDay.values()].some((n) => n > 1)).toBe(true);
    expect(new Set(entries.map((e) => e.uid)).size).toBe(entries.length);
  });
});
