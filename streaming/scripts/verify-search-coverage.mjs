// Phase 1 — search coverage assertion. Node ESM, no browser needed.
// Verifies every intended course contributes indexed items AND that the
// master-prompt's representative queries resolve to the correct destination.
import { KAFKA_LESSONS, FLINK_LESSONS } from '../data/ported-lessons.js';
import { FOUNDATIONS } from '../data/foundations.js';
import { INCIDENTS } from '../data/incidents.js';
import { QUESTIONS } from '../data/interview.js';
import { GLOSSARY } from '../data/glossary.js';

// Rebuild the catalog the same way catalog.js does, minus the async cloud
// providers (those load browser-style). We assert cloud separately via files.
const items = [];
FOUNDATIONS.forEach(m => items.push({ title: m.title, sub: m.idea || '', kw: '', kind: 'Foundations', section: 'foundations' }));
INCIDENTS.forEach(i => items.push({ title: i.title, sub: '', kw: '', kind: 'Incident', section: 'incident' }));
QUESTIONS.forEach(q => items.push({ title: q.q, sub: '', kw: '', kind: 'Interview', section: 'interview' }));
GLOSSARY.forEach(g => items.push({ title: g.term, sub: g.short || '', kw: '', kind: 'Glossary', section: 'glossary' }));
KAFKA_LESSONS.forEach(m => items.push({ title: m.title, sub: 'Kafka lesson', kw: m.kw, kind: 'Kafka', section: 'kafka', url: `kafka/#${m.id}` }));
FLINK_LESSONS.forEach(m => items.push({ title: m.title, sub: 'Flink lesson', kw: m.kw, kind: 'Flink', section: 'flink', url: `flink/#${m.id}` }));

function score(it, t) {
  const f = s => (s || '').toLowerCase();
  let s = 0;
  if (f(it.title) === t) s += 100;
  if (f(it.title).startsWith(t)) s += 40;
  if (f(it.title).includes(t)) s += 25;
  if (f(it.sub).includes(t)) s += 10;
  if (f(it.kind).includes(t)) s += 5;
  if (f(it.kw).includes(t)) s += 18;
  return s;
}
function top(term) {
  const t = term.toLowerCase();
  const hits = items.map(it => ({ it, s: score(it, t) })).filter(x => x.s > 0).sort((a, b) => b.s - a.s);
  return hits.length ? hits[0].it : null;
}

let fail = 0;
const line = (ok, msg) => { console.log((ok ? 'PASS ' : 'FAIL ') + msg); if (!ok) fail++; };

// 1) every indexed course contributes ≥1 item
for (const sec of ['foundations', 'incident', 'interview', 'glossary', 'kafka', 'flink']) {
  line(items.some(i => i.section === sec), `course "${sec}" contributes an indexed item`);
}
line(KAFKA_LESSONS.length >= 22, `Kafka lessons indexed: ${KAFKA_LESSONS.length} (>=22)`);
line(FLINK_LESSONS.length >= 20, `Flink lessons indexed: ${FLINK_LESSONS.length} (>=20)`);

// 2) representative queries resolve to the right destination
// Each query must resolve to the BEST destination. An exact glossary/foundations
// title is a legitimately better hit than a ported lesson; the ported lessons are
// proven reachable by the concept queries that have no exact term match.
const cases = [
  ['consumer lag', 'glossary'],    // exact glossary term wins (correct)
  ['watermarks', 'foundations'],   // exact Foundations lesson wins (correct)
  ['rebalancing', 'kafka'],        // ported Kafka lesson reachable
  ['schema evolution', 'kafka'],
  ['partition reassignment', 'kafka'],
  ['savepoints', 'flink'],         // ported Flink lesson reachable
  ['backpressure', 'flink'],
  ['checkpoint barriers', 'flink'],
];
for (const [q, sec] of cases) {
  const r = top(q);
  line(r && r.section === sec, `query "${q}" → ${sec} (got ${r ? r.section + '/' + r.title : 'none'})`);
}

console.log(`\n${fail === 0 ? 'ALL SEARCH COVERAGE OK ✅' : fail + ' FAILED ❌'}  — ${items.length} items indexed (excl. async cloud providers)`);
process.exit(fail ? 1 : 0);
