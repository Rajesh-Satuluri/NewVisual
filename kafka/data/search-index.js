// Global search index — flattens every content source into one searchable
// list so a learner can find anything (a concept, a config, an interview
// question, an incident) from one box. The static part builds synchronously;
// interview Q&A is loaded lazily and appended.
import { MODULES } from '../components/nav.js';
import { TERMS } from '../modules/glossary.js';
import { CONFIG_GROUPS } from './configs.js';
import { ADVANCED_TOPICS } from './advanced-topics.js';
import { DECISIONS } from './decisions.js';
import { INCIDENTS } from './incidents.js';
import { TIERED } from './tiered.js';
import { loadAllIQ } from './iq-aggregate.js';

const strip = html => String(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const clip = (s, n = 160) => { s = strip(s); return s.length > n ? s.slice(0, n - 1) + '…' : s; };

// Each entry: { type, typeClass, title, snippet, hash, text(lowercased blob) }
export function buildStaticIndex() {
  const out = [];

  MODULES.forEach(m => out.push({
    type: 'Module', typeClass: 'mod', title: `${m.label}`, icon: m.icon,
    snippet: m.desc, hash: '#' + m.id, group: m.group,
    text: `${m.id} ${m.label} ${m.group} ${m.desc}`.toLowerCase(),
  }));

  TERMS.forEach(t => out.push({
    type: 'Glossary', typeClass: 'glo', title: t.t, icon: '📖',
    snippet: clip(t.d), hash: '#glossary',
    text: `${t.t} ${t.d}`.toLowerCase(),
  }));

  CONFIG_GROUPS.forEach(g => g.items.forEach(it => out.push({
    type: 'Config', typeClass: 'cfg', title: it.name, icon: '⚙️',
    snippet: `default ${it.default} · typical ${it.typical} — ${clip(it.breaks, 110)}`,
    hash: '#config-reference',
    text: `${it.name} ${it.default} ${it.typical} ${it.breaks}`.toLowerCase(),
  })));

  ADVANCED_TOPICS.forEach(t => out.push({
    type: 'Advanced', typeClass: 'adv', title: t.title, icon: t.icon,
    snippet: clip(t.body), hash: '#advanced',
    text: `${t.title} ${t.tag} ${strip(t.body)} ${strip(t.interview)}`.toLowerCase(),
  }));

  DECISIONS.forEach(d => out.push({
    type: 'Decision', typeClass: 'dec', title: d.title, icon: '🧭',
    snippet: clip(d.requirement), hash: '#decisions',
    text: `${d.title} ${d.topic} ${strip(d.requirement)}`.toLowerCase(),
  }));

  INCIDENTS.forEach(i => out.push({
    type: 'Incident', typeClass: 'inc', title: i.title, icon: i.icon || '🚑',
    snippet: clip(i.symptom), hash: '#troubleshoot',
    text: `${i.title} ${strip(i.symptom)} ${strip(i.rootCause)}`.toLowerCase(),
  }));

  TIERED.forEach(t => out.push({
    type: 'Interview', typeClass: 'iq', title: t.question, icon: '🎯',
    snippet: `Weak / Good / Senior answer — ${t.topic}`, hash: '#answers',
    text: `${t.question} ${t.topic} ${strip(t.whySenior)}`.toLowerCase(),
  }));

  return out;
}

let _full = null;
export async function loadFullIndex() {
  if (_full) return _full;
  const base = buildStaticIndex();
  try {
    const iq = await loadAllIQ();
    iq.forEach(q => base.push({
      type: 'Interview Q', typeClass: 'iq', title: q.q, icon: '🎯',
      snippet: clip(q.a), hash: '#' + q.moduleId, group: q.moduleTitle,
      text: `${q.q} ${strip(q.a)} ${q.moduleTitle}`.toLowerCase(),
    }));
  } catch (e) { /* IQ enrichment is best-effort */ }
  _full = base;
  return _full;
}

// Simple relevance: exact substring in title beats title word-start beats body.
export function rankMatches(index, query, typeFilter) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const terms = q.split(/\s+/).filter(Boolean);
  const scored = [];
  for (const e of index) {
    if (typeFilter && e.type !== typeFilter) continue;
    if (!terms.every(t => e.text.includes(t))) continue;
    const title = e.title.toLowerCase();
    let score = 0;
    if (title.includes(q)) score += 100;
    if (title.startsWith(q)) score += 50;
    terms.forEach(t => { if (title.includes(t)) score += 10; });
    score -= title.length * 0.01; // prefer tighter titles
    scored.push({ e, score });
  }
  return scored.sort((a, b) => b.score - a.score).map(s => s.e);
}
