/**
 * Search-term highlighting helpers, shared by the reader pane. Two flavours:
 *  - `highlightSegments` splits plain text into matched / unmatched runs for
 *    declarative rendering (used for the title and location).
 *  - `highlightElement` walks the already-rendered Markdown DOM and wraps
 *    matches in `<mark>` in place (the body is injected via `{@html}`, so Svelte
 *    doesn't track its internals — safe to mutate).
 * Matching is a plain case-insensitive substring match per query term; it does
 * not try to mirror Fuse.js fuzziness, only to surface what the user typed.
 */
import { flattenText, truncateText } from './text';

const HL_CLASS = 'search-hl';

export interface Segment {
  text: string;
  match: boolean;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Split a raw query into the individual terms we highlight (drops noise). */
export function splitTerms(query: string): string[] {
  return (query ?? '')
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length >= 2);
}

/** Build a global, case-insensitive regex matching any of the terms. */
function termsRegex(terms: string[]): RegExp | null {
  if (!terms.length) return null;
  const pattern = terms.map(escapeRegExp).join('|');
  return new RegExp(`(${pattern})`, 'gi');
}

/** Break `text` into matched/unmatched segments for declarative highlighting. */
export function highlightSegments(text: string, terms: string[]): Segment[] {
  const re = termsRegex(terms);
  if (!text || !re) return text ? [{ text, match: false }] : [];

  const out: Segment[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ text: text.slice(last, m.index), match: false });
    out.push({ text: m[0], match: true });
    last = m.index + m[0].length;
    if (m.index === re.lastIndex) re.lastIndex++; // guard against zero-length loops
  }
  if (last < text.length) out.push({ text: text.slice(last), match: false });
  return out;
}

/** How many term occurrences appear in `text`. */
export function countMatches(text: string, terms: string[]): number {
  return highlightSegments(text, terms).filter((s) => s.match).length;
}

/** Whether any term appears literally (case-insensitive) in `text`. */
export function hasTerm(text: string, terms: string[]): boolean {
  const re = termsRegex(terms);
  return re ? re.test(text ?? '') : false;
}

/**
 * Extract a compact preview of `text` centred on the first occurrence of any
 * search term, clipped with ellipses where it was cut. This is what surfaces
 * the actual matching text in a result row (vs. always showing the opening
 * lines). Falls back to the start of the text when nothing matches literally.
 */
export function snippetAround(text: string, terms: string[], radius = 70): string {
  const clean = flattenText(text);
  if (!clean) return '';
  const re = termsRegex(terms);
  const m = re ? re.exec(clean) : null;
  if (!m) return truncateText(clean, radius * 2);
  const start = Math.max(0, m.index - radius);
  const end = Math.min(clean.length, m.index + m[0].length + radius);
  return `${start > 0 ? '…' : ''}${clean.slice(start, end)}${end < clean.length ? '…' : ''}`;
}

/** Strip previously injected highlight marks, restoring plain text nodes. */
export function clearHighlights(root: HTMLElement): void {
  root.querySelectorAll(`mark.${HL_CLASS}`).forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) return;
    parent.replaceChild(document.createTextNode(mark.textContent ?? ''), mark);
    parent.normalize();
  });
}

/**
 * Wrap term occurrences inside `root`'s text nodes with `<mark>`. Returns the
 * number of matches and the first mark element (for scroll-into-view).
 */
export function highlightElement(
  root: HTMLElement,
  terms: string[],
): { count: number; first: HTMLElement | null } {
  const re = termsRegex(terms);
  if (!re) return { count: 0, first: null };

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      const p = node.parentElement;
      if (p && (p.tagName === 'SCRIPT' || p.tagName === 'STYLE' || p.classList.contains(HL_CLASS)))
        return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  // Collect first, mutate after — editing the tree mid-walk is unsafe.
  const targets: Text[] = [];
  let node: Node | null;
  while ((node = walker.nextNode())) targets.push(node as Text);

  let count = 0;
  let first: HTMLElement | null = null;

  for (const textNode of targets) {
    const text = textNode.nodeValue ?? '';
    re.lastIndex = 0;
    if (!re.test(text)) continue;

    re.lastIndex = 0;
    const frag = document.createDocumentFragment();
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
      const mark = document.createElement('mark');
      mark.className = HL_CLASS;
      mark.textContent = m[0];
      frag.appendChild(mark);
      if (!first) first = mark;
      count++;
      last = m.index + m[0].length;
      if (m.index === re.lastIndex) re.lastIndex++;
    }
    if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
    textNode.parentNode?.replaceChild(frag, textNode);
  }

  return { count, first };
}
