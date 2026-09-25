import { afterEach, describe, expect, it, vi } from 'vitest';
import { randomId } from '../src/lib/random';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('randomId', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns distinct v4 UUIDs', () => {
    const first = randomId();
    const second = randomId();
    expect(first).toMatch(UUID_RE);
    expect(second).toMatch(UUID_RE);
    expect(first).not.toBe(second);
  });

  it('falls back to getRandomValues when randomUUID is unavailable', () => {
    // Plain HTTP on the LAN lacks `randomUUID` (secure-context only).
    vi.stubGlobal('crypto', {
      getRandomValues: crypto.getRandomValues.bind(crypto),
    });
    expect(randomId()).toMatch(UUID_RE);
  });
});
