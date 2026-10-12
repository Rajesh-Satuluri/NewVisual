// ─────────────────────────────────────────────────────────────────────────────
// Content registry — the SINGLE SOURCE OF TRUTH for all counts and coverage.
//
// Nothing in the app should hard-code "33 modules" or "44 questions". Import
// from here instead, so every total is derived from the actual content and can
// never drift from reality. Also consumed by tools/content-lint.mjs (Node) to
// validate content integrity, so this file must stay import-safe in Node:
// it may only import pure-data modules and must not touch `document` at load.
// ─────────────────────────────────────────────────────────────────────────────

import { MODULES, EXTRAS } from '../components/nav.js';
import { QUIZ_BANK } from './quiz-bank.js';
import { BANK, TIERS } from './interview-bank.js';

// ── Derived counts ──────────────────────────────────────────────────────────
export const moduleCount = MODULES.length;
export const extraCount = EXTRAS.length;

export const quizModuleCount = Object.keys(QUIZ_BANK).length;
export const quizQuestionCount = Object.values(QUIZ_BANK)
  .reduce((n, qs) => n + qs.length, 0);

export const interviewCount = BANK.length;

// Interview coverage, grouped two ways (for the competency matrix in Iter 3).
export const interviewByTier = TIERS.map(t => ({
  id: t.id, label: t.label, color: t.color,
  count: BANK.filter(q => q.tier === t.id).length,
}));

export const interviewByCategory = (() => {
  const map = new Map();
  for (const q of BANK) map.set(q.cat, (map.get(q.cat) || 0) + 1);
  return [...map.entries()]
    .map(([cat, count]) => ({ cat, count }))
    .sort((a, b) => b.count - a.count);
})();

// Modules that ship a "Test Yourself" quiz (used for the readiness surface).
export const modulesWithQuiz = MODULES.filter(m => QUIZ_BANK[m.id]).map(m => m.id);

// ── Convenience rollup ───────────────────────────────────────────────────────
export const REGISTRY = {
  moduleCount,
  extraCount,
  quizModuleCount,
  quizQuestionCount,
  interviewCount,
  interviewByTier,
  interviewByCategory,
  modulesWithQuiz,
};

export default REGISTRY;
