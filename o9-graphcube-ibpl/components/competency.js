// competency.js — tracks demonstrated competency separately from "page opened".
// The existing `o9gc-done` set (script.js) stays untouched = "visited". This is
// a parallel store keyed by exercise id, recording correct/attempt counts and
// rolling them up into six competency areas for weak-area detection.

const KEY = 'o9gc-competency';

export const AREAS = {
  concept:   '🧩 Conceptual',
  model:     '🗃️ Model design',
  ibpl:      '⌨️ IBPL syntax & reasoning',
  debug:     '🔧 Debugging',
  business:  '🏭 Business application',
  interview: '🎯 Interview',
};

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); }
  catch (e) { return {}; }
}
function save(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
}

// Record one attempt. area ∈ keys(AREAS). correct: boolean.
export function record(exId, area, correct) {
  const s = load();
  const e = s[exId] || { area, attempts: 0, correct: 0, best: 0 };
  e.area = area || e.area;
  e.attempts += 1;
  if (correct) { e.correct += 1; e.best = 1; }
  e.last = correct ? 'correct' : 'wrong';
  e.ts = Date.now();
  s[exId] = e;
  save(s);
  return e;
}

export function exerciseState(exId) {
  return load()[exId] || null;
}

// Per-area stats: {area:{solved, total, pct}}. `total` counts registered exercises.
export function areaStats(registry) {
  const s = load();
  const out = {};
  for (const key of Object.keys(AREAS)) out[key] = { solved: 0, attempted: 0, total: 0 };
  // total from registry (all known exercises), solved from state
  if (registry) for (const ex of registry) { if (out[ex.area]) out[ex.area].total += 1; }
  for (const id of Object.keys(s)) {
    const e = s[id];
    if (!out[e.area]) continue;
    out[e.area].attempted += 1;
    if (e.best) out[e.area].solved += 1;
  }
  for (const key of Object.keys(out)) {
    const o = out[key];
    o.pct = o.total ? Math.round((o.solved / o.total) * 100) : (o.attempted ? Math.round((o.solved / o.attempted) * 100) : 0);
  }
  return out;
}

// Weakest areas (lowest solved-pct among areas that have exercises).
export function weakAreas(registry, n = 2) {
  const st = areaStats(registry);
  return Object.entries(st)
    .filter(([, o]) => o.total > 0)
    .sort((a, b) => a[1].pct - b[1].pct)
    .slice(0, n)
    .map(([k, o]) => ({ area: k, label: AREAS[k], ...o }));
}

export function totalSolved() {
  const s = load();
  return Object.values(s).filter(e => e.best).length;
}

export function resetCompetency() { save({}); }

// Render a compact competency panel (used on Home). `registry` is the global
// exercise registry so bars reflect "solved / total available".
export function renderCompetencyPanel(registry) {
  const st = areaStats(registry);
  const solved = totalSolved();
  const totalEx = registry ? registry.length : 0;
  const bars = Object.keys(AREAS).map(key => {
    const o = st[key];
    const pct = o.pct;
    return `
      <div class="comp-row">
        <div class="comp-label">${AREAS[key]}</div>
        <div class="comp-track"><div class="comp-fill" style="width:${pct}%"></div></div>
        <div class="comp-num">${o.solved}${o.total ? '/' + o.total : ''}</div>
      </div>`;
  }).join('');
  const weak = weakAreas(registry, 2).filter(w => w.solved < w.total);
  const rec = weak.length
    ? `<div class="comp-rec">📌 Focus next: ${weak.map(w => `<b>${w.label}</b>`).join(' · ')}</div>`
    : (solved > 0 ? `<div class="comp-rec">🏆 Strong across the board — keep it sharp.</div>` : '');
  return `
    <div class="comp-panel">
      <div class="comp-head">
        <div><div class="comp-title">Your competency</div>
        <div class="comp-sub">Demonstrated skill — solved exercises, not pages opened.</div></div>
        <div class="comp-total"><b>${solved}</b><span>/ ${totalEx} solved</span></div>
      </div>
      ${bars}
      ${rec}
    </div>`;
}
