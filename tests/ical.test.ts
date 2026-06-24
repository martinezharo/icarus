import { describe, it, expect } from 'vitest';
import { parseIcs, serializeIcs } from '../src/lib/ical';
import type { JournalEntry } from '../src/lib/types';
import { dateKey } from '../src/lib/date';

const sample: JournalEntry[] = [
  {
    uid: 'a@icarus.journal',
    title: 'Morning pages',
    content: '# Heading\n\nSome *italic* and `code`.\n\n- one\n- two',
    location: 'Kitchen table',
    date: new Date(2026, 5, 8), // 8 June 2026
  },
  {
    uid: 'b@icarus.journal',
    title: 'Evening reflection',
    content: 'A second entry on the **same** day.',
    date: new Date(2026, 5, 8), // same day — the edge case
  },
  {
    uid: 'c@icarus.journal',
    title: 'Next day',
    content: 'Plain text.',
    location: 'Park',
    date: new Date(2026, 5, 9),
  },
];

describe('ical roundtrip', () => {
  it('preserves all fields through serialize → parse', () => {
    const ics = serializeIcs(sample);
    const res = parseIcs(ics);

    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.entries).toHaveLength(3);

    for (const original of sample) {
      const found = res.entries.find((e) => e.uid === original.uid);
      expect(found, `entry ${original.uid} survived`).toBeDefined();
      if (!found) continue;
      expect(found.title).toBe(original.title);
      expect(found.content).toBe(original.content);
      expect(found.location).toBe(original.location);
      // Compare by day key — date-only semantics, no timezone drift.
      expect(dateKey(found.date)).toBe(dateKey(original.date));
    }
  });

  it('handles multiple entries on the same date', () => {
    const ics = serializeIcs(sample);
    const res = parseIcs(ics);
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const onJune8 = res.entries.filter(
      (e) => dateKey(e.date) === '2026-06-08',
    );
    expect(onJune8).toHaveLength(2);
  });

  it('produces a valid VCALENDAR wrapper', () => {
    const ics = serializeIcs(sample);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('END:VCALENDAR');
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(3);
  });

  it('treats an empty file as zero entries (not an error)', () => {
    const res = parseIcs('   \n  ');
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.entries).toHaveLength(0);
  });

  it('returns a typed error for corrupt input instead of throwing', () => {
    const res = parseIcs('this is not iCalendar at all {{{');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(typeof res.error).toBe('string');
  });
});
