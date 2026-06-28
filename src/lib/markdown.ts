/**
 * Markdown → safe HTML. Rendered output is always sanitized with DOMPurify
 * before it reaches the DOM via `{@html}`, so even hand-edited `.ics` files
 * can never inject script into the app.
 */
import MarkdownIt from 'markdown-it';
import DOMPurify from 'dompurify';

const md = new MarkdownIt({
  html: false, // ignore raw HTML in source — sanitizer is belt-and-braces
  linkify: true,
  typographer: true,
  breaks: true, // single newlines become <br>, matching a diarying feel
});

// Harden every generated anchor so a click can never navigate the webview
// away from the app shell: external URLs open in the system browser via the
// `opener` plugin (see MarkdownView) and `rel="noopener noreferrer"` is the
// belt-and-braces fallback for any other rendering path.
const mdLinkOpen =
  md.renderer.rules.link_open ??
  ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));

md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  const href = token.attrGet('href') ?? '';
  token.attrSet('target', '_blank');
  token.attrSet('rel', 'noopener noreferrer');
  // Tauri intercepts `tauri://` etc., but everything else (http/https/mailto)
  // must be opened externally. We only forward the schemes we trust.
  if (!/^(https?:|mailto:|tel:)/i.test(href)) {
    // Strip the href so the click does nothing dangerous in the webview.
    token.attrSet('href', '#');
  }
  return mdLinkOpen(tokens, idx, options, env, self);
};

// Rendering (markdown-it + DOMPurify) is pure for a given source, but it runs
// on every reader re-render — paging through a day, reopening an entry, the
// highlight effect, etc. A small LRU memoises the result keyed by the source
// text itself, so editing an entry naturally invalidates its cache entry (the
// key changes) while the bound size keeps memory in check for large vaults.
const CACHE_LIMIT = 256;
const cache = new Map<string, string>();

export function renderMarkdown(source: string): string {
  const key = source ?? '';

  const hit = cache.get(key);
  if (hit !== undefined) {
    // Touch: re-insert so the most-recently-used key sorts last (LRU order).
    cache.delete(key);
    cache.set(key, hit);
    return hit;
  }

  const dirty = md.render(key);
  const html = DOMPurify.sanitize(dirty, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['style', 'form', 'input'],
    FORBID_ATTR: ['style', 'onerror', 'onload'],
  });

  cache.set(key, html);
  if (cache.size > CACHE_LIMIT) {
    // Evict the least-recently-used entry (first key in insertion order).
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  return html;
}
