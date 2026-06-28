// DOMPurify needs a DOM, so this suite runs in jsdom rather than the default
// Node environment used by the other unit tests.
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderMarkdown } from '../src/lib/markdown';

// These assertions guard the end-to-end safety of the render pipeline
// (markdown-it with `html:false` + DOMPurify). They're a regression net: if the
// renderer is ever reconfigured to pass raw HTML through, DOMPurify must still
// keep these dangerous constructs out of the output.
describe('renderMarkdown — sanitization', () => {
  it('renders basic Markdown to HTML', () => {
    const html = renderMarkdown('# Title\n\nHello **world**');
    expect(html).toContain('<h1>');
    expect(html).toContain('<strong>world</strong>');
  });

  it('never emits a live <script> element', () => {
    const html = renderMarkdown('hi\n\n<script>alert(1)</script>');
    // The raw HTML is escaped to inert text, not a real element.
    expect(html.toLowerCase()).not.toContain('<script');
    expect(html).toContain('&lt;script&gt;');
  });

  it('never emits a raw <img> with an inline event handler', () => {
    const html = renderMarkdown('<img src=x onerror="alert(1)">');
    // The raw tag is escaped to inert text — there's no real <img> to fire on.
    expect(html.toLowerCase()).not.toContain('<img');
    expect(html).toContain('&lt;img');
  });

  it('does not turn a javascript: URL into a link', () => {
    const html = renderMarkdown('[click](javascript:alert(1))');
    const lower = html.toLowerCase();
    expect(lower).not.toContain('<a');
    expect(lower).not.toContain('href="javascript');
  });

  it('keeps safe links and hardens them with rel="noopener noreferrer"', () => {
    const html = renderMarkdown('[home](https://example.com)');
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it('does not emit an href for disallowed schemes', () => {
    // Whether markdown-it rejects it outright or the link_open rule rewrites it
    // to "#", the unsafe scheme must never survive as an href.
    const html = renderMarkdown('[f](ftp://example.com/secret)');
    expect(html.toLowerCase()).not.toContain('href="ftp:');
  });

  it('strips disallowed tags such as <style>, <form> and <input>', () => {
    const html = renderMarkdown(
      '<style>body{}</style><form><input></form>text',
    );
    const lower = html.toLowerCase();
    expect(lower).not.toContain('<style');
    expect(lower).not.toContain('<form');
    expect(lower).not.toContain('<input');
  });

  it('returns an empty string for empty/nullish input', () => {
    expect(renderMarkdown('')).toBe('');
    // @ts-expect-error verifying runtime safety
    expect(renderMarkdown(undefined)).toBe('');
  });
});
