import { describe, expect, it } from 'vitest';
import { vaultFileName } from '../src/lib/storage';

describe('vaultFileName', () => {
  it('extracts the file name from desktop vault paths', () => {
    expect(vaultFileName({ kind: 'file', path: '/home/oli/diary.ics' })).toBe(
      'diary.ics',
    );
    expect(
      vaultFileName({ kind: 'file', path: 'C:\\Users\\oli\\diary.ics' }),
    ).toBe('diary.ics');
  });

  it('returns null for browser and blank vaults', () => {
    expect(vaultFileName({ kind: 'browser' })).toBeNull();
    expect(vaultFileName(null)).toBeNull();
  });
});
