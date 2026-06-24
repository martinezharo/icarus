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
  breaks: true, // single newlines become <br>, matching a journaling feel
});

// Open links in the same webview but never let them navigate away from the app
// shell; Tauri intercepts external schemes. We strip target to keep it simple.
export function renderMarkdown(source: string): string {
  const dirty = md.render(source ?? '');
  return DOMPurify.sanitize(dirty, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['style', 'form', 'input'],
    FORBID_ATTR: ['style', 'onerror', 'onload'],
  });
}

/** Plain-text excerpt for compact previews (search results, list rows). */
export function excerpt(source: string, max = 140): string {
  const text = (source ?? '')
    .replace(/[#>*_`~\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
