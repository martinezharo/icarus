// The spellCheck action mutates DOM properties, so this suite runs in jsdom.
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { spellCheck } from '../src/lib/actions';

describe('spellCheck action', () => {
  it('toggles checking and pins the language to English', () => {
    const el = document.createElement('div');
    const action = spellCheck(el, true);
    expect(el.spellcheck).toBe(true);
    expect(el.lang).toBe('en');

    action.update(false);
    expect(el.spellcheck).toBe(false);
    expect(el.lang).toBe('en');
  });
});
