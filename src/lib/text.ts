/**
 * Plain-text helpers shared by the search snippet, the drafts list preview, and
 * anywhere else that needs to turn a multi-line body into a compact one-liner.
 * Centralised so the "flatten whitespace, then clip with an ellipsis" logic
 * lives in exactly one place.
 */

/** Collapse every run of whitespace to a single space and trim the ends. */
export function flattenText(text: string): string {
  return (text ?? '').replace(/\s+/g, ' ').trim();
}

/**
 * Flatten `text` and clip it to at most `max` characters, appending an ellipsis
 * where it was cut. Already-flat input is fine — flattening is idempotent.
 */
export function truncateText(text: string, max: number): string {
  const flat = flattenText(text);
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}
