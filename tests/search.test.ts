import { beforeEach, describe, expect, it } from 'vitest';
import { buildSearchIndex, search } from '../src/lib/search';
import type { DiaryEntry } from '../src/lib/types';

function entry(uid: string, title: string, content = ''): DiaryEntry {
  return {
    uid,
    title,
    content,
    date: new Date(2026, 0, 1),
  };
}

describe('search', () => {
  beforeEach(() => buildSearchIndex([]));

  it('returns every matching entry by default', () => {
    buildSearchIndex(
      Array.from({ length: 120 }, (_, index) =>
        entry(String(index), `Shared memory ${index}`),
      ),
    );

    expect(search('shared')).toHaveLength(120);
  });

  it('still honours an explicit result limit', () => {
    buildSearchIndex(
      Array.from({ length: 30 }, (_, index) => entry(String(index), `Note ${index}`)),
    );

    expect(search('note', 7)).toHaveLength(7);
  });

  it('finds literal matches regardless of case and diacritics', () => {
    buildSearchIndex([
      entry('one', 'Una CANCIÓN', 'El pingüino viajó a München.'),
      entry('two', 'Un día normal'),
    ]);

    expect(search('cancion').map((hit) => hit.entry.uid)).toEqual(['one']);
    expect(search('PINGUINO').map((hit) => hit.entry.uid)).toEqual(['one']);
    expect(search('munchen').map((hit) => hit.entry.uid)).toEqual(['one']);
  });
});
