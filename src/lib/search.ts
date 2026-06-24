/**
 * Local, instant fuzzy search over all entries using Fuse.js. The index is
 * rebuilt whenever entries change (see the store). Everything runs in-process —
 * no network, fully air-gapped.
 */
import Fuse from 'fuse.js';
import type { JournalEntry } from './types';

export interface SearchHit {
  entry: JournalEntry;
  score: number;
}

let fuse: Fuse<JournalEntry> | null = null;

const OPTIONS: import('fuse.js').IFuseOptions<JournalEntry> = {
  keys: [
    { name: 'title', weight: 0.5 },
    { name: 'location', weight: 0.2 },
    { name: 'content', weight: 0.3 },
  ],
  includeScore: true,
  ignoreLocation: true, // match anywhere in long bodies
  threshold: 0.4,
  minMatchCharLength: 2,
};

/** (Re)build the search index from the current entries. */
export function buildSearchIndex(entries: JournalEntry[]): void {
  fuse = new Fuse(entries, OPTIONS);
}

/** Query the index. Returns ranked hits (best first); empty if no query/index. */
export function search(query: string, limit = 12): SearchHit[] {
  const q = query.trim();
  if (!q || !fuse) return [];
  return fuse
    .search(q, { limit })
    .map((r) => ({ entry: r.item, score: r.score ?? 1 }));
}
