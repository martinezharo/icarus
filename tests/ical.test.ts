import { describe, it, expect, vi } from 'vitest';
import { isInvalidDate, parseIcs, serializeIcs } from '../src/lib/ical';
import type { DiaryEntry } from '../src/lib/types';
import { dateKey } from '../src/lib/date';

const sample: DiaryEntry[] = [
  {
    uid: 'a@icarus.diary',
    title: 'Morning pages',
    content: '# Heading\n\nSome *italic* and `code`.\n\n- one\n- two',
    location: 'Kitchen table',
    date: new Date(2026, 5, 8), // 8 June 2026
  },
  {
    uid: 'b@icarus.diary',
    title: 'Evening reflection',
    content: 'A second entry on the **same** day.',
    date: new Date(2026, 5, 8), // same day — the edge case
  },
  {
    uid: 'c@icarus.diary',
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

describe('unparseable DTSTART', () => {
  it('keeps the entry but flags it with the sentinel year instead of rewriting to today', () => {
    // No DTSTART line at all: ical.js returns null and the parser must not
    // quietly default to `new Date()` (which would re-date the entry).
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//test//EN',
      'BEGIN:VEVENT',
      'UID:orphan@icarus.diary',
      'DTSTAMP:20260628T000000Z',
      'SUMMARY:Mystery entry',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const res = parseIcs(ics);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.entries).toHaveLength(1);
    const entry = res.entries[0];
    expect(entry.title).toBe('Mystery entry');
    expect(isInvalidDate(entry.date)).toBe(true);
    // Crucially: the date is NOT "today". It is the sentinel year 1.
    expect(entry.date.getFullYear()).not.toBe(new Date().getFullYear());
  });

  it('round-trips an entry flagged with the sentinel date without silently fixing it', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//test//EN',
      'BEGIN:VEVENT',
      'UID:orphan2@icarus.diary',
      'DTSTAMP:20260628T000000Z',
      'SUMMARY:Still lost',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    const res = parseIcs(ics);
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const written = serializeIcs(res.entries);
    const reparsed = parseIcs(written);
    expect(reparsed.ok).toBe(true);
    if (!reparsed.ok) return;
    expect(reparsed.entries[0].title).toBe('Still lost');
    // The date is still flagged after a round-trip — we never silently healed it.
    expect(isInvalidDate(reparsed.entries[0].date)).toBe(true);
    warn.mockRestore();
  });
});
