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

export function renderMarkdown(source: string): string {
  const dirty = md.render(source ?? '');
  return DOMPurify.sanitize(dirty, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['style', 'form', 'input'],
    FORBID_ATTR: ['style', 'onerror', 'onload'],
  });
}
