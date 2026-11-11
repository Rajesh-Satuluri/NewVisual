// ─────────────────────────────────────────────────────────────────────────
// Global search index — one flat, ranked index across every content type:
// modules, glossary, config settings, advanced topics, interview Q&A,
// decision drills, scenario cases, and the cheat sheet.
// ─────────────────────────────────────────────────────────────────────────
import { MODULES } from '../components/nav.js';
import { TERMS } from '../modules/glossary.js';
import { CARDS } from '../modules/cheatsheet.js';
import { CONFIGS } from './configs.js';
import { ADVANCED_TOPICS } from './advanced-topics.js';
import { IQ_BANK } from './iq-bank.js';
import { DECISIONS } from './decisions.js';
import { INTERVIEW_CASES } from './interview-cases.js';

const strip = s => String(s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const clip = (s, n = 160) => { s = strip(s); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
const titleOf = id => (MODULES.find(m => m.id === id) || {}).title || id;

let INDEX = null;

export function buildIndex() {
  if (INDEX) return INDEX;
  const out = [];

  MODULES.forEach(m => out.push({
    type: 'Module', icon: m.icon, title: m.title,
    snippet: `Module ${m.num}`, hash: m.id, keywords: m.title,
  }));

  TERMS.forEach(([name, cat, def]) => out.push({
    type: 'Glossary', icon: '📖', title: name,
    snippet: clip(def), hash: 'glossary', keywords: `${name} ${cat} ${strip(def)}`,
  }));

  CONFIGS.forEach(c => out.push({
    type: 'Config', icon: '⚙️', title: c.key,
    snippet: `${clip(c.what, 110)} · default ${c.default}`, hash: c.module || 'config-reference',
    keywords: `${c.key} ${c.what} ${c.breaks} ${c.category}`,
  }));

  ADVANCED_TOPICS.forEach(t => out.push({
    type: 'Advanced', icon: t.icon || '🧬', title: t.title,
    snippet: clip(t.summary), hash: 'advanced', keywords: `${t.title} ${t.summary} ${strip(t.body)}`,
  }));

  Object.keys(IQ_BANK).forEach(id => (IQ_BANK[id] || []).forEach(qa => out.push({
    type: 'Interview Q&A', icon: '🎤', title: qa.q,
    snippet: `${titleOf(id)} · ${clip(qa.a, 120)}`, hash: id, keywords: `${qa.q} ${strip(qa.a)}`,
  })));

  Object.keys(DECISIONS).forEach(id => (DECISIONS[id] || []).forEach(d => out.push({
    type: 'Decision', icon: '🧭', title: clip(d.scenario, 90),
    snippet: `${titleOf(id)} · ${clip(d.takeaway, 110)}`, hash: id, keywords: `${strip(d.scenario)} ${strip(d.takeaway)}`,
  })));

  INTERVIEW_CASES.forEach(c => out.push({
    type: 'Scenario', icon: '🎬', title: clip(c.scenario, 90),
    snippet: `${titleOf(c.module)} · ${clip(c.answer, 110)}`, hash: c.module, keywords: `${strip(c.scenario)} ${strip(c.breaks)} ${strip(c.answer)}`,
  }));

  CARDS.forEach(card => card.rows.forEach(([k, v]) => out.push({
    type: 'Cheat Sheet', icon: '📋', title: k,
    snippet: `${card.title} · ${clip(v, 110)}`, hash: 'cheatsheet', keywords: `${k} ${v} ${card.title}`,
  })));

  INDEX = out;
  return INDEX;
}

export const TYPES = ['Module', 'Glossary', 'Config', 'Advanced', 'Interview Q&A', 'Decision', 'Scenario', 'Cheat Sheet'];

// Rank matches. Full-phrase title hits rank highest, then per-token title hits,
// then keyword/body hits.
export function rankMatches(query, { limit = 60, type = 'all' } = {}) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const tokens = q.split(/\s+/).filter(Boolean);
  const idx = buildIndex();
  const scored = [];
  idx.forEach(e => {
    if (type !== 'all' && e.type !== type) return;
    const title = e.title.toLowerCase();
    const kw = e.keywords.toLowerCase();
    let score = 0;
    if (title.includes(q)) score += 20;
    if (kw.includes(q)) score += 6;
    tokens.forEach(t => {
      if (title.includes(t)) score += 4;
      else if (kw.includes(t)) score += 1;
    });
    if (score > 0) scored.push({ e, score });
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(s => s.e);
}

// Type counts for the current query (for filter chips).
export function typeCounts(query) {
  const all = rankMatches(query, { limit: 10000, type: 'all' });
  const counts = {};
  all.forEach(e => { counts[e.type] = (counts[e.type] || 0) + 1; });
  return { total: all.length, counts };
}
