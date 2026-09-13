import { describe, expect, it } from 'vitest';
import {
  createDraftPersistenceQueue,
  findEntryDraft,
  upsertDraft,
} from '../src/lib/drafts';
import type { StoredDraft } from '../src/lib/types';

function draft(
  id: string,
  overrides: Partial<StoredDraft> = {},
): StoredDraft {
  return {
    id,
    title: id,
    location: '',
    content: '',
    dateKey: '2026-09-13',
    updatedAt: 1,
    ...overrides,
  };
}

describe('draft helpers', () => {
  it('keeps only the newest draft for an edited entry', () => {
    const original = draft('old', { editingUid: 'entry-1' });
    const replacement = draft('new', { editingUid: 'entry-1' });
    const unrelated = draft('other');

    expect(upsertDraft([original, unrelated], replacement)).toEqual([
      replacement,
      unrelated,
    ]);
    expect(findEntryDraft([replacement, unrelated], 'entry-1')).toBe(replacement);
  });

  it('keeps independent new-entry drafts', () => {
    const first = draft('first');
    const second = draft('second');
    expect(upsertDraft([first], second)).toEqual([second, first]);
  });

  it('serializes persistence and saves immutable snapshots in order', async () => {
    const events: string[] = [];
    let releaseFirst: (() => void) | undefined;
    const firstGate = new Promise<void>((resolve) => (releaseFirst = resolve));
    const save = createDraftPersistenceQueue(async (drafts) => {
      events.push(`start:${drafts[0].title}`);
      if (drafts[0].title === 'first') await firstGate;
      events.push(`end:${drafts[0].title}`);
    });

    const first = draft('same', { title: 'first' });
    const firstSave = save([first]);
    first.title = 'mutated after enqueue';
    const secondSave = save([draft('same', { title: 'second' })]);

    await Promise.resolve();
    await Promise.resolve();
    expect(events).toEqual(['start:first']);
    releaseFirst?.();
    await Promise.all([firstSave, secondSave]);
    expect(events).toEqual([
      'start:first',
      'end:first',
      'start:second',
      'end:second',
    ]);
  });

  it('continues saving after a failed write', async () => {
    let attempts = 0;
    const save = createDraftPersistenceQueue(async () => {
      attempts++;
      if (attempts === 1) throw new Error('disk unavailable');
    });

    await expect(save([draft('first')])).rejects.toThrow('disk unavailable');
    await expect(save([draft('second')])).resolves.toBeUndefined();
    expect(attempts).toBe(2);
  });
});
