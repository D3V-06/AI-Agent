/**
 * Markdown rendering and sanitization utility
 * Uses marked, highlight.js, and DOMPurify for secure, beautiful output.
 */
import { marked } from 'marked';
import hljs from 'highlight.js/lib/common';
import DOMPurify from 'dompurify';

// Configure marked renderer
const renderer = new marked.Renderer();

// Code block renderer with language banner and copy button
renderer.code = function({ text, lang }) {
  const language = (lang && hljs.getLanguage(lang)) ? lang : 'plaintext';
  let highlighted = '';

  try {
    if (lang && hljs.getLanguage(lang)) {
      highlighted = hljs.highlight(text, { language }).value;
    } else {
      highlighted = hljs.highlightAuto(text).value;
    }
  } catch {
    highlighted = DOMPurify.sanitize(text);
  }

  const encodedRaw = encodeURIComponent(text);

  return `
    <div class="code-block-container" data-language="${language}">
      <div class="code-block-header">
        <span class="code-lang-label">${language}</span>
        <button type="button" class="btn-copy-code" data-code="${encodedRaw}" aria-label="Copy code">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          <span class="copy-text">Copy</span>
        </button>
      </div>
      <pre><code class="hljs language-${language}">${highlighted}</code></pre>
    </div>
  `;
};

marked.setOptions({
  renderer,
  gfm: true,
  breaks: true
});

export function renderMarkdown(rawText) {
  if (!rawText) return '';
  let parsedHtml = marked.parse(rawText);

  // Wrap tables in responsive overflow container
  parsedHtml = parsedHtml.replace(/<table>/g, '<div class="table-wrapper"><table>').replace(/<\/table>/g, '</table></div>');

  // Sanitize with DOMPurify while keeping necessary tags & attributes
  return DOMPurify.sanitize(parsedHtml, {
    ADD_ATTR: ['target', 'data-language', 'data-code', 'aria-label'],
    ADD_TAGS: ['svg', 'path', 'rect', 'line', 'polyline', 'circle']
  });
}

