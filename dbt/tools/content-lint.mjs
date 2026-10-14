#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// content-lint — automated content-integrity checks for the dbt learning app.
//
//   node tools/content-lint.mjs        (run from the dbt/ directory)
//
// Validates the things that silently rot as content grows:
//   • duplicate module / extra / interview ids
//   • every nav route has a loader, and every loader maps to a nav item
//   • every loader points at a module file that exists on disk
//   • quiz answer indices are in range, options non-trivial, text present
//   • interview-bank entries carry the required schema and a known tier
//   • no stray hard-coded module/question totals in app source
//
// Exit code 0 = clean, 1 = one or more errors. Warnings never fail the build.
// Import-safe: only reads pure-data modules + source text; never touches DOM.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');                       // the dbt/ directory

const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

// ── Load content (pure-data modules are safe to import in Node) ───────────────
const { MODULES, EXTRAS } = await import('../components/nav.js');
const { QUIZ_BANK } = await import('../data/quiz-bank.js');
const { BANK, TIERS } = await import('../data/interview-bank.js');
const registry = await import('../data/registry.js');

const navItems = [...MODULES, ...EXTRAS];
const navIds = navItems.map(n => n.id);
const tierIds = new Set(TIERS.map(t => t.id));

// ── 1. Duplicate ids ─────────────────────────────────────────────────────────
function dupes(list, label) {
  const seen = new Set();
  for (const id of list) {
    if (seen.has(id)) err(`Duplicate ${label} id: "${id}"`);
    seen.add(id);
  }
}
dupes(navIds, 'nav');

// ── 2. Loaders ↔ nav parity (import the shared, import-safe loader map) ───────
const { MODULE_FILES } = await import('../data/loader-map.js');
const loaderIds = new Set();
for (const [id, file] of Object.entries(MODULE_FILES)) {
  loaderIds.add(id);
  if (!existsSync(join(root, 'modules', file))) {
    err(`Loader "${id}" points at modules/${file} which does not exist`);
  }
}
// The router must actually build its LOADERS from this map (guard the refactor).
const scriptSrc = readFileSync(join(root, 'script.js'), 'utf8');
if (!scriptSrc.includes('MODULE_FILES')) {
  err('script.js no longer consumes MODULE_FILES — loader map is bypassed');
}
for (const n of navItems) {
  if (!loaderIds.has(n.id)) err(`Nav item "${n.id}" has no loader in script.js`);
}
for (const id of loaderIds) {
  if (id !== 'home' && !navIds.includes(id)) {
    err(`Loader "${id}" maps to no nav item`);
  }
}

// ── 3. Quizzes ───────────────────────────────────────────────────────────────
for (const [mid, qs] of Object.entries(QUIZ_BANK)) {
  if (!navIds.includes(mid)) err(`Quiz bank has questions for unknown module "${mid}"`);
  qs.forEach((q, i) => {
    const where = `${mid}[${i}]`;
    if (!q.q || !q.q.trim()) err(`Quiz ${where}: empty question text`);
    if (!Array.isArray(q.options) || q.options.length < 2) err(`Quiz ${where}: needs >= 2 options`);
    if (typeof q.answer !== 'number' || q.answer < 0 || q.answer >= (q.options?.length ?? 0)) {
      err(`Quiz ${where}: answer index ${q.answer} out of range`);
    }
    if (!q.explanation || !q.explanation.trim()) warn(`Quiz ${where}: missing explanation`);
  });
}
for (const m of MODULES) {
  if (!QUIZ_BANK[m.id]) warn(`Module "${m.id}" (${m.title}) has no quiz`);
}

// ── 4. Interview bank schema ──────────────────────────────────────────────────
const REQUIRED = ['tier', 'cat', 'q', 'short'];
const seenQ = new Set();
BANK.forEach((item, i) => {
  for (const f of REQUIRED) {
    if (!item[f] || !String(item[f]).trim()) err(`Interview[${i}]: missing "${f}"`);
  }
  if (item.tier && !tierIds.has(item.tier)) err(`Interview[${i}]: unknown tier "${item.tier}"`);
  if (item.q) {
    const key = item.q.trim().toLowerCase();
    if (seenQ.has(key)) warn(`Interview[${i}]: duplicate question text "${item.q.slice(0, 50)}…"`);
    seenQ.add(key);
  }
  if (!item.followup || !item.senior) warn(`Interview[${i}]: missing followup/senior depth`);
});

// ── 5. No stray hard-coded totals in app source ──────────────────────────────
const appFiles = readdirSync(join(root, 'modules')).filter(f => f.endsWith('.js'));
const HARDCODED = /All\s+\d+\s+modules|\b\d+\s+modules complete/i;
for (const f of ['script.js', ...appFiles.map(f => `modules/${f}`)]) {
  const src = readFileSync(join(root, f), 'utf8');
  const m = src.match(HARDCODED);
  if (m) warn(`${f}: possible hard-coded module total — "${m[0]}" (derive from registry instead)`);
}

// ── Report ────────────────────────────────────────────────────────────────────
console.log('content-lint — dbt learning app');
console.log('─'.repeat(52));
console.log(`modules            ${registry.moduleCount}`);
console.log(`reference pages    ${registry.extraCount}`);
console.log(`loaders            ${loaderIds.size} (incl. home)`);
console.log(`quiz modules       ${registry.quizModuleCount}`);
console.log(`quiz questions     ${registry.quizQuestionCount}`);
console.log(`interview Qs       ${registry.interviewCount}`);
console.log('─'.repeat(52));

for (const w of warnings) console.log(`  warn   ${w}`);
for (const e of errors) console.log(`  ERROR  ${e}`);

console.log('─'.repeat(52));
console.log(`${errors.length} error(s), ${warnings.length} warning(s)`);
process.exit(errors.length ? 1 : 0);
