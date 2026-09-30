#!/usr/bin/env node
/* ============================================================
   DBViz build — bundle the modular site into one self-contained
   HTML file (dist/dbviz.html) for hosting as a single artifact.

   index.html is the single source of truth: this script inlines
   its linked CSS, its head <style> bridge block, and its
   <script src> files (in the exact order they appear), then drops
   the body markup in — minus the <script src> tags.

   Deploy loop:  git pull  →  node build.js  →  republish dist/dbviz.html
   ============================================================ */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');
const TITLE = 'DB Engineering Visualizer — ShopFlow';

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

const html = read('index.html');

/* 1 ─ Linked stylesheets, in document order */
const cssLinks = [...html.matchAll(/<link[^>]+href="([^"]+\.css)"[^>]*>/g)].map(m => m[1]);
if (cssLinks.length === 0) throw new Error('No <link rel="stylesheet"> found in index.html');

/* 2 ─ Head <style> bridge block (first style block in the document) */
const styleMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/);
const bridgeCss = styleMatch ? styleMatch[1] : '';

/* 3 ─ <script src> files, in load order */
const scriptSrcs = [...html.matchAll(/<script[^>]+src="([^"]+\.js)"[^>]*>\s*<\/script>/g)].map(m => m[1]);
if (scriptSrcs.length === 0) throw new Error('No <script src> tags found in index.html');

/* 4 ─ Body markup, with the <script src> tags stripped out */
const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
if (!bodyMatch) throw new Error('No <body> found in index.html');
let body = bodyMatch[1]
  .replace(/<script[^>]+src="[^"]+"[^>]*>\s*<\/script>/g, '')
  .trim();

/* ─ Assemble CSS: linked files first, then the bridge block ─ */
let css = cssLinks.map(f => '/* ===== ' + f + ' ===== */\n' + read(f)).join('\n\n');
css += '\n\n/* ===== bridge styles (index.html head) ===== */\n' + bridgeCss.trim();

/* ─ Assemble scripts: inline each file, guard against premature </script> ─ */
const scripts = scriptSrcs.map(f => {
  const code = read(f);
  if (/<\/script/i.test(code)) throw new Error('Literal </script> found in ' + f + ' — would break inlining');
  return '<!-- ' + f + ' -->\n<script>\n' + code + '\n</script>';
}).join('\n\n');

/* ─ Emit self-contained page body (no <!doctype>/<html>/<head>/<body>:
     the artifact host wraps it) ─ */
const out =
  '<title>' + TITLE + '</title>\n' +
  '<style>\n' + css + '\n</style>\n\n' +
  body + '\n\n' +
  '<!-- ── inlined scripts: data → core → components → modules → app ── -->\n' +
  scripts + '\n';

fs.mkdirSync(DIST, { recursive: true });
const outPath = path.join(DIST, 'dbviz.html');
fs.writeFileSync(outPath, out, 'utf8');

console.log(
  'Built ' + path.relative(ROOT, outPath) +
  '  —  ' + cssLinks.length + ' css + bridge, ' +
  scriptSrcs.length + ' js, ' +
  (out.length / 1024).toFixed(1) + ' KB'
);
