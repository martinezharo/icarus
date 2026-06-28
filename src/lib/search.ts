/**
 * Local, instant fuzzy search over all entries using Fuse.js. The index is
 * rebuilt whenever entries change (see the store). Everything runs in-process —
 * no network, fully air-gapped.
 */
import Fuse from 'fuse.js';
import type { DiaryEntry } from './types';
import { splitTerms, hasTerm } from './highlight';

export interface SearchHit {
  entry: DiaryEntry;
  score: number;
}

let fuse: Fuse<DiaryEntry> | null = null;

const OPTIONS: import('fuse.js').IFuseOptions<DiaryEntry> = {
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

/** (Re)build the search index from scratch — used on vault load / forget. */
export function buildSearchIndex(entries: DiaryEntry[]): void {
  fuse = new Fuse(entries, OPTIONS);
}

/**
 * Incremental index maintenance. Fuse can add/remove single records, which is
 * far cheaper than rebuilding the whole index on every commit, edit, or delete.
 * These are no-ops if the index hasn't been built yet (the next `buildSearchIndex`
 * will pick up the current entries anyway).
 */
export function indexAddEntry(entry: DiaryEntry): void {
  fuse?.add(entry);
}

export function indexRemoveEntry(uid: string): void {
  fuse?.remove((doc) => doc.uid === uid);
}

/** Update an entry in place: drop the stale record, then add the new one. */
export function indexUpdateEntry(entry: DiaryEntry): void {
  if (!fuse) return;
  fuse.remove((doc) => doc.uid === entry.uid);
  fuse.add(entry);
}

/** Query the index. Returns ranked hits (best first); empty if no query/index. */
export function search(query: string, limit = 12): SearchHit[] {
  const q = query.trim();
  if (!q || !fuse) return [];

  // Over-fetch so we can drop the noisiest fuzzy hits and still fill `limit`.
  const hits = fuse
    .search(q, { limit: limit * 4 })
    .map((r) => ({ entry: r.item, score: r.score ?? 1 }));

  // Fuse is intentionally fuzzy, which surfaces entries that don't literally
  // contain what the user typed — confusing, because the result shows no
  // visible match. Keep only hits where a term actually appears in some field.
  const terms = splitTerms(q);
  const filtered = terms.length
    ? hits.filter(
        ({ entry }) =>
          hasTerm(entry.title, terms) ||
          hasTerm(entry.location ?? '', terms) ||
          hasTerm(entry.content, terms),
      )
    : hits;

  return filtered.slice(0, limit);
}
