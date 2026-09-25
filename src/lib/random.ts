/**
 * UUID v4 generation that also works outside secure contexts.
 *
 * `crypto.randomUUID()` is restricted to HTTPS/localhost, so a browser reached
 * over plain HTTP on the LAN throws. `crypto.getRandomValues()` carries no such
 * restriction, so fall back to assembling a v4 UUID from random bytes.
 */
export function randomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  if (typeof crypto === 'undefined' || typeof crypto.getRandomValues !== 'function') {
    // Degenerate environments without any Web Crypto: good enough for an id.
    return `${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 1
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'));
  return [
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10, 16).join(''),
  ].join('-');
}
