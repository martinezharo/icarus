import { describe, it, expect } from 'vitest';
import {
  countMatches,
  hasTerm,
  highlightSegments,
  snippetAround,
  splitTerms,
} from '../src/lib/highlight';

describe('splitTerms', () => {
  it('lowercases, trims, and drops words shorter than 2 chars', () => {
    expect(splitTerms('  Hello WORLD a I  ')).toEqual(['hello', 'world']);
  });

  it('returns an empty array for empty/whitespace input', () => {
    expect(splitTerms('')).toEqual([]);
    expect(splitTerms('   ')).toEqual([]);
  });

  it('collapses runs of whitespace into single separators', () => {
    expect(splitTerms('foo\tbar\nbaz')).toEqual(['foo', 'bar', 'baz']);
  });

  it('handles nullish input safely', () => {
    // @ts-expect-error verifying runtime safety
    expect(splitTerms(null)).toEqual([]);
    // @ts-expect-error verifying runtime safety
    expect(splitTerms(undefined)).toEqual([]);
  });
});

describe('highlightSegments', () => {
  it('returns a single unmatched segment when no terms', () => {
    expect(highlightSegments('hello world', [])).toEqual([
      { text: 'hello world', match: false },
    ]);
  });

  it('marks case-insensitive matches', () => {
    expect(highlightSegments('Hello World', ['hello'])).toEqual([
      { text: 'Hello', match: true },
      { text: ' World', match: false },
    ]);
  });

  it('supports multiple terms (OR semantics)', () => {
    const segs = highlightSegments('the quick brown fox', ['quick', 'fox']);
    const matches = segs.filter((s) => s.match).map((s) => s.text.toLowerCase());
    expect(matches).toEqual(['quick', 'fox']);
  });

  it('treats terms as literal substrings, not regex', () => {
    // Parens / dots should be matched literally, not as regex metachars.
    const segs = highlightSegments('see (note) — version 1.0', ['1.0', '(note)']);
    const matches = segs.filter((s) => s.match).map((s) => s.text);
    expect(matches).toEqual(['(note)', '1.0']);
  });

  it('handles a zero-length match defensively (no infinite loop)', () => {
    // An empty term would otherwise match everywhere with zero width; the
    // implementation must not hang. We don't assert the exact output (it's
    // implementation-defined) — just that the call returns.
    const segs = highlightSegments('abc', ['']);
    expect(Array.isArray(segs)).toBe(true);
    expect(segs.length).toBeGreaterThan(0);
  });

  it('returns an empty array for empty input', () => {
    expect(highlightSegments('', ['foo'])).toEqual([]);
  });
});

describe('countMatches', () => {
  it('counts the number of matched segments', () => {
    expect(countMatches('the cat sat on the mat', ['the'])).toBe(2);
    expect(countMatches('the cat sat on the mat', ['cat', 'mat'])).toBe(2);
    expect(countMatches('nothing here', ['cat'])).toBe(0);
  });
});

describe('hasTerm', () => {
  it('returns true when any term appears literally', () => {
    expect(hasTerm('Hello World', ['world'])).toBe(true);
  });

  it('returns false when no term appears', () => {
    expect(hasTerm('Hello World', ['foo'])).toBe(false);
  });

  it('returns false with no terms', () => {
    expect(hasTerm('anything', [])).toBe(false);
  });

  it('treats nullish text safely', () => {
    // @ts-expect-error verifying runtime safety
    expect(hasTerm(null, ['x'])).toBe(false);
  });
});

describe('snippetAround', () => {
  it('returns the cleaned text when there is no match', () => {
    expect(snippetAround('hello world', [])).toBe('hello world');
  });

  it('truncates long text with an ellipsis when no term matches', () => {
    const long = 'a'.repeat(200);
    const out = snippetAround(long, ['zzz']);
    expect(out.endsWith('…')).toBe(true);
    expect(out.length).toBeLessThanOrEqual(140);
  });

  it('centres the snippet on the first match and pads with ellipses', () => {
    const text = ' '.repeat(100) + 'TARGET' + ' '.repeat(100) + 'rest';
    const out = snippetAround(text, ['target'], 10);
    expect(out).toContain('TARGET');
    expect(out.length).toBeLessThan(text.length);
  });

  it('does not add a leading ellipsis when the match is at the start', () => {
    const out = snippetAround('TARGET in the middle and then more text', ['target'], 5);
    expect(out.startsWith('TARGET')).toBe(true);
    expect(out.endsWith('…')).toBe(true);
  });

  it('collapses whitespace before slicing', () => {
    const out = snippetAround('foo\n\n  bar  baz', ['baz'], 5);
    expect(out).toBe('… bar baz');
  });

  it('returns empty for empty input', () => {
    expect(snippetAround('', ['x'])).toBe('');
  });
});
