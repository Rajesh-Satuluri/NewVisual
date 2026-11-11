// md.js — tiny, dependency-free, XSS-safe Markdown → HTML for Q&A answers.
//
// Why this exists: Q&A answers were injected as raw HTML, so an answer written
// in Markdown (e.g. pasted from an AI) leaked literal **asterisks** and `backticks`.
// This renders a deliberately small, predictable Markdown subset instead.
//
// SECURITY MODEL — the one rule that matters: every piece of literal source text
// is HTML-escaped (`esc`) exactly once, at the moment it is emitted, BEFORE any
// markup is produced. Raw HTML in the source can therefore never reach the DOM —
// only the small set of tags THIS file emits ever appears. Links are additionally
// restricted to http(s) and in-page (#) targets, so `javascript:` URLs cannot slip
// through. This is opt-in (callers pass `md:true`); existing HTML answers are left
// exactly as they are.
//
// Supported: # h1–#### h4, **bold** __bold__, *italic* _italic_, ~~strike~~,
// `inline code`, ```fenced code```, - / * / + bullet lists and 1. ordered lists
// (one level of nesting), > blockquotes, --- horizontal rules, GFM | pipe | tables |,
// [links](https://…) and [anchors](#id), paragraphs and hard line breaks.

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** HTML-escape literal text. Called on every piece of source before markup. */
export function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ESC[c]);
}

/** Convert inline Markdown in a single run of text. Escapes first, then formats. */
function inlineFmt(raw) {
  let s = esc(raw);

  // Protect inline-code spans from every other inline rule.
  const spans = [];
  s = s.replace(/`([^`]+)`/g, (_, c) => `\u0000${spans.push(`<code>${c}</code>`) - 1}\u0000`);

  // Links: [text](href) — only http(s) and in-page (#) targets are allowed through.
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, text, href) => {
    if (/^https?:\/\//i.test(href)) {
      return `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`;
    }
    if (href[0] === '#') return `<a href="${href}">${text}</a>`;
    return text; // disallowed scheme (javascript:, data:, …) → keep link text only, drop the URL
  });

  // Emphasis. Bold before italic so ** / __ win over * / _.
  s = s.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/__([^_]+?)__/g, '<strong>$1</strong>');
  s = s.replace(/~~([^~]+?)~~/g, '<del>$1</del>');
  s = s.replace(/\*([^*\n]+?)\*/g, '<em>$1</em>');
  // Underscore italics only when word-bounded, so snake_case / group_id survive.
  s = s.replace(/(^|[\s(])_([^_\n]+?)_(?=[\s).,;:!?]|$)/g, '$1<em>$2</em>');

  // Restore protected code spans.
  s = s.replace(/\u0000(\d+)\u0000/g, (_, i) => spans[+i]);
  return s;
}

/** Split a GFM table row into trimmed cells, honouring escaped \| pipes. */
function splitRow(row) {
  return row.trim().replace(/^\|/, '').replace(/\|$/, '')
    .split(/(?<!\\)\|/).map(c => c.replace(/\\\|/g, '|').trim());
}

const indentOf = l => (l.match(/^([ \t]*)/)[1] || '').replace(/\t/g, '  ').length;
const ITEM_RE = /^([ \t]*)([-*+]|\d+\.)\s+(.*)$/;

/** Parse one list (and one level of nested lists) starting at `start`. */
function parseList(lines, start) {
  const base = indentOf(lines[start]);
  const ordered = /^\s*\d+\.\s+/.test(lines[start]);
  const items = [];
  let i = start;
  while (i < lines.length) {
    const m = lines[i].match(ITEM_RE);
    if (!m) break;
    const ind = indentOf(lines[i]);
    if (ind < base) break;
    if (ind > base) { // deeper → nested list under the previous item
      const nested = parseList(lines, i);
      if (items.length) items[items.length - 1] += nested.html;
      i = nested.next;
      continue;
    }
    items.push(inlineFmt(m[3]));
    i++;
    // Lazy continuation: indented, non-blank, not a new item.
    while (i < lines.length && lines[i].trim() && !ITEM_RE.test(lines[i]) &&
           indentOf(lines[i]) > base) {
      items[items.length - 1] += ' ' + inlineFmt(lines[i].trim());
      i++;
    }
  }
  const tag = ordered ? 'ol' : 'ul';
  return { html: `<${tag} class="md-list">${items.map(it => `<li>${it}</li>`).join('')}</${tag}>`, next: i };
}

/** Render a Markdown string to safe HTML. Returns '' for empty/nullish input. */
export function renderMarkdown(src) {
  if (src == null || src === '') return '';
  const lines = String(src).replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block.
    const fence = line.match(/^```(\w*)\s*$/);
    if (fence) {
      const buf = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) { buf.push(lines[i]); i++; }
      i++; // consume closing fence
      const cls = fence[1] ? ` class="lang-${esc(fence[1])}"` : '';
      out.push(`<pre class="md-pre"><code${cls}>${esc(buf.join('\n'))}</code></pre>`);
      continue;
    }

    // Blank line.
    if (!line.trim()) { i++; continue; }

    // Heading (# … ####).
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) { const n = h[1].length; out.push(`<h${n} class="md-h">${inlineFmt(h[2].trim())}</h${n}>`); i++; continue; }

    // Horizontal rule (--- *** ___) — but not a bullet like "- item".
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) { out.push('<hr class="md-hr">'); i++; continue; }

    // GFM table: a row with pipes followed by a |---|---| separator.
    if (/\|/.test(line) && i + 1 < lines.length &&
        /^\s*\|?[\s:|-]*-[\s:|-]*$/.test(lines[i + 1]) && /\|/.test(lines[i + 1])) {
      const header = splitRow(line);
      const aligns = splitRow(lines[i + 1]).map(c => {
        const l = c.startsWith(':'), r = c.endsWith(':');
        return l && r ? 'center' : r ? 'right' : l ? 'left' : '';
      });
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].trim() && /\|/.test(lines[i]) && !ITEM_RE.test(lines[i])) {
        rows.push(splitRow(lines[i])); i++;
      }
      const cell = (c, k, tag) =>
        `<${tag}${aligns[k] ? ` style="text-align:${aligns[k]}"` : ''}>${inlineFmt(c || '')}</${tag}>`;
      const thead = `<tr>${header.map((c, k) => cell(c, k, 'th')).join('')}</tr>`;
      const tbody = rows.map(r => `<tr>${header.map((_, k) => cell(r[k], k, 'td')).join('')}</tr>`).join('');
      out.push(`<table class="md-table"><thead>${thead}</thead><tbody>${tbody}</tbody></table>`);
      continue;
    }

    // Blockquote.
    if (/^\s*>\s?/.test(line)) {
      const buf = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) { buf.push(lines[i].replace(/^\s*>\s?/, '')); i++; }
      out.push(`<blockquote class="md-quote">${inlineFmt(buf.join(' '))}</blockquote>`);
      continue;
    }

    // List.
    if (ITEM_RE.test(line)) { const lst = parseList(lines, i); out.push(lst.html); i = lst.next; continue; }

    // Paragraph: gather consecutive non-blank, non-block lines.
    const buf = [line];
    i++;
    while (i < lines.length && lines[i].trim() &&
           !/^(#{1,4})\s+/.test(lines[i]) && !/^```/.test(lines[i]) &&
           !ITEM_RE.test(lines[i]) && !/^\s*>\s?/.test(lines[i]) &&
           !/^\s*([-*_])(\s*\1){2,}\s*$/.test(lines[i])) {
      buf.push(lines[i]); i++;
    }
    out.push(`<p>${buf.map(inlineFmt).join('<br>')}</p>`);
  }

  return out.join('\n');
}
