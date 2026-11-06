// Tests for the Q&A Markdown renderer. The security tests are the important
// ones: the renderer is the only place answers turn Markdown into HTML, so it
// must never let raw HTML or dangerous URLs through.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderMarkdown, esc } from './md.js';

test('empty / nullish input renders nothing', () => {
  assert.equal(renderMarkdown(''), '');
  assert.equal(renderMarkdown(null), '');
  assert.equal(renderMarkdown(undefined), '');
});

test('bold, italic, strikethrough', () => {
  assert.match(renderMarkdown('**bold**'), /<strong>bold<\/strong>/);
  assert.match(renderMarkdown('__bold__'), /<strong>bold<\/strong>/);
  assert.match(renderMarkdown('*italic*'), /<em>italic<\/em>/);
  assert.match(renderMarkdown('~~gone~~'), /<del>gone<\/del>/);
});

test('bold wins over italic when nested markers meet', () => {
  const h = renderMarkdown('**really important**');
  assert.match(h, /<strong>really important<\/strong>/);
  assert.doesNotMatch(h, /<em>/);
});

test('snake_case and config.keys are not mangled into italics', () => {
  assert.match(renderMarkdown('set group_id and enable_auto_commit'), /group_id and enable_auto_commit/);
  assert.doesNotMatch(renderMarkdown('group_id here'), /<em>/);
});

test('inline code is escaped and wrapped', () => {
  const h = renderMarkdown('use `enable.idempotence=true`');
  assert.match(h, /<code>enable\.idempotence=true<\/code>/);
});

test('markdown inside inline code is NOT interpreted', () => {
  const h = renderMarkdown('`**not bold**`');
  assert.match(h, /<code>\*\*not bold\*\*<\/code>/);
  assert.doesNotMatch(h, /<strong>/);
});

test('fenced code block preserves content and escapes it', () => {
  const h = renderMarkdown('```js\nconst x = a < b && c > d;\n```');
  assert.match(h, /<pre class="md-pre"><code class="lang-js">/);
  assert.match(h, /const x = a &lt; b &amp;&amp; c &gt; d;/);
});

test('headings h1–h4', () => {
  assert.match(renderMarkdown('# Title'), /<h1 class="md-h">Title<\/h1>/);
  assert.match(renderMarkdown('#### Deep'), /<h4 class="md-h">Deep<\/h4>/);
});

test('unordered and ordered lists', () => {
  const ul = renderMarkdown('- one\n- two');
  assert.match(ul, /<ul class="md-list"><li>one<\/li><li>two<\/li><\/ul>/);
  const ol = renderMarkdown('1. first\n2. second');
  assert.match(ol, /<ol class="md-list"><li>first<\/li><li>second<\/li><\/ol>/);
});

test('nested list nests under its parent item', () => {
  const h = renderMarkdown('- parent\n  - child');
  assert.match(h, /<li>parent<ul class="md-list"><li>child<\/li><\/ul><\/li>/);
});

test('GFM table with alignment', () => {
  const h = renderMarkdown('| A | B |\n|:--|--:|\n| 1 | 2 |');
  assert.match(h, /<table class="md-table">/);
  assert.match(h, /<th style="text-align:left">A<\/th>/);
  assert.match(h, /<th style="text-align:right">B<\/th>/);
  assert.match(h, /<td style="text-align:left">1<\/td><td style="text-align:right">2<\/td>/);
});

test('blockquote and horizontal rule', () => {
  assert.match(renderMarkdown('> note'), /<blockquote class="md-quote">note<\/blockquote>/);
  assert.match(renderMarkdown('---'), /<hr class="md-hr">/);
});

test('"- item" is a list, not a horizontal rule', () => {
  const h = renderMarkdown('- item');
  assert.match(h, /<ul class="md-list">/);
  assert.doesNotMatch(h, /<hr/);
});

test('paragraphs split on blank lines, single newline is a <br>', () => {
  const h = renderMarkdown('line one\nline two\n\nsecond para');
  assert.match(h, /<p>line one<br>line two<\/p>/);
  assert.match(h, /<p>second para<\/p>/);
});

// ── Security ───────────────────────────────────────────────────────────────
test('raw HTML in source is escaped, never emitted live', () => {
  const h = renderMarkdown('<img src=x onerror=alert(1)>');
  assert.doesNotMatch(h, /<img/);
  assert.match(h, /&lt;img/);
});

test('<script> cannot reach the DOM', () => {
  const h = renderMarkdown('hi <script>alert(1)</script>');
  assert.doesNotMatch(h, /<script>/);
  assert.match(h, /&lt;script&gt;/);
});

test('javascript: and data: links are rejected', () => {
  const js = renderMarkdown('[click](javascript:void0)');
  assert.doesNotMatch(js, /<a /);         // no anchor emitted at all
  assert.doesNotMatch(js, /javascript:/); // URL dropped entirely
  assert.match(js, /<p>click<\/p>/);      // only the link text survives
  const data = renderMarkdown('[x](data:text/html,alert)');
  assert.doesNotMatch(data, /<a /);
  assert.doesNotMatch(data, /data:/);
});

test('http(s) and anchor links are allowed, with safe rel on external', () => {
  const ext = renderMarkdown('[Kafka](https://kafka.apache.org)');
  assert.match(ext, /<a href="https:\/\/kafka\.apache\.org" target="_blank" rel="noopener noreferrer">Kafka<\/a>/);
  const anchor = renderMarkdown('[see](#m11)');
  assert.match(anchor, /<a href="#m11">see<\/a>/);
  assert.doesNotMatch(anchor, /target=/);
});

test('esc covers the five HTML-significant characters', () => {
  assert.equal(esc(`<>&"'`), '&lt;&gt;&amp;&quot;&#39;');
});
