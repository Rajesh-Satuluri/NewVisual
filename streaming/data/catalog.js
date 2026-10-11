// Gate 8 — unified catalog of every learnable item, aggregated lazily from the
// existing datasets. Powers search (I74) and the dashboard (I73).
import { FOUNDATIONS } from './foundations.js';
import { getProvider, CLOUD_PROVIDER_IDS } from './cloud-providers.js';
import { INCIDENTS } from './incidents.js';
import { QUESTIONS } from './interview.js';
import { GLOSSARY } from './glossary.js';

const ENGINE_TOOLS = [
  ['eng-graph', 'Concept graph'], ['eng-compare', 'Comparison matrix'], ['eng-trace', 'Trace One Event'],
  ['eng-break', 'Break the Pipeline'], ['eng-builder', 'Architecture Builder'], ['eng-decide', 'Decision Engine'],
  ['eng-capacity', 'Capacity calculator'],
];

let _cache = null;
export async function buildCatalog() {
  if (_cache) return _cache;
  const items = [];
  FOUNDATIONS.forEach(m => items.push({ id: m.id, title: m.title, sub: m.idea, kind: 'Foundations', section: 'foundations' }));
  for (const pid of CLOUD_PROVIDER_IDS) {
    const p = await getProvider(pid);
    if (p) p.modules.forEach(m => items.push({ id: m.id, title: m.title, sub: m.idea, kind: p.name, section: pid }));
  }
  ENGINE_TOOLS.forEach(([id, t]) => items.push({ id, title: t, sub: 'Interactive engine tool', kind: 'Engines', section: 'engines' }));
  INCIDENTS.forEach(i => items.push({ id: i.id, title: i.title, sub: i.severity + ' production incident', kind: 'Incident', section: 'incident' }));
  QUESTIONS.forEach(q => items.push({ id: 'interview', title: q.q, sub: 'Interview question', kind: 'Interview', section: 'interview' }));
  GLOSSARY.forEach(g => items.push({ id: g.see || 'glossary', title: g.term, sub: g.short, kind: 'Glossary', section: 'glossary' }));
  _cache = items;
  return items;
}

// Completable module id lists per section (for the dashboard progress meters).
export async function completables() {
  const out = {};
  out.foundations = FOUNDATIONS.map(m => m.id);
  for (const pid of CLOUD_PROVIDER_IDS) { const p = await getProvider(pid); out[pid] = p ? p.modules.map(m => m.id) : []; }
  out.incident = INCIDENTS.map(i => i.id);
  return out;
}
