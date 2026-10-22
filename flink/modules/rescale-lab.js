// Rescaling & Key-Groups Lab — visualise how Flink maps keys → key groups →
// subtasks, and exactly what moves when you rescale. Built on the REAL
// KeyGroupRangeAssignment algorithm (sim/engine.js); deterministic, not simulated.
import { assignKeys, rescale, skewFactor, defaultMaxParallelism } from '../sim/engine.js';

const KEY_COUNT = 2000;
const keys = Array.from({ length: KEY_COUNT }, (_, i) => 'driver-' + i);

const FIELDS = [
  { id: 'parallelism', label: 'Current parallelism', min: 1, max: 24, step: 1, val: 6 },
  { id: 'maxParallelism', label: 'Max parallelism (key groups)', min: 16, max: 1024, step: 16, val: 128 },
  { id: 'target', label: 'Rescale to parallelism', min: 1, max: 24, step: 1, val: 12 },
];

export function mount(container) {
  const v = Object.fromEntries(FIELDS.map(f => [f.id, f.val]));

  container.innerHTML = `
    <div class="module-page">
      <div class="module-hero">
        <div class="module-tag">🧩 Lab · Rescaling & Key Groups</div>
        <h1 class="module-title">Rescaling & Key-Groups Lab</h1>
        <p class="module-subtitle">Flink shards keyed state into a fixed number of <strong>key groups</strong> (= max parallelism, frozen at first run). Rescaling reassigns whole key groups to subtasks. This lab runs the real assignment algorithm over ${KEY_COUNT} driver keys — <strong>deterministic, nothing random</strong>.</p>
      </div>
      <div class="tab-content active">
        <div class="lab-controls" id="rl-controls">
          ${FIELDS.map(f => `
            <label class="lab-field">
              <span class="lab-flabel">${f.label}: <b id="rl-${f.id}-v">${f.val}</b></span>
              <input type="range" data-k="${f.id}" min="${f.min}" max="${f.max}" step="${f.step}" value="${f.val}" aria-label="${f.label}" />
            </label>`).join('')}
          <div class="lab-note" id="rl-maxp-note"></div>
        </div>
        <div id="rl-out"></div>
        <div class="lab-ledger">🔎 <strong>Honesty ledger:</strong> key→group→subtask mapping uses Flink's real <code>KeyGroupRangeAssignment</code> (murmurHash of the key, modulo key groups, then <code>keyGroup · parallelism / maxParallelism</code>). No cluster or network is involved — this is a faithful, deterministic model of the algorithm, not a running job.</div>
      </div>
    </div>`;

  const outEl = container.querySelector('#rl-out');
  const maxpNote = container.querySelector('#rl-maxp-note');

  function bars(bySubtask, p) {
    const counts = [];
    for (let i = 0; i < p; i++) counts.push(bySubtask[i] ? bySubtask[i].length : 0);
    const max = Math.max(1, ...counts);
    return `<div class="rl-bars">${counts.map((c, i) => `
      <div class="rl-bar-col">
        <div class="rl-bar" style="height:${Math.round((c / max) * 100)}%" title="subtask ${i}: ${c} keys"></div>
        <div class="rl-bar-lab">${i}</div>
      </div>`).join('')}</div>`;
  }

  function render() {
    // guard: target & parallelism share the same range
    const cur = assignKeys(keys, v.parallelism, v.maxParallelism);
    const r = rescale(keys, v.parallelism, v.target, v.maxParallelism);
    const skewCur = skewFactor(cur.bySubtask).toFixed(2);
    const skewNew = skewFactor(r.after.bySubtask).toFixed(2);
    const kgPerSubtask = (v.maxParallelism / v.parallelism).toFixed(1);

    maxpNote.innerHTML = `Flink's default for parallelism ${v.parallelism} would be <code>${defaultMaxParallelism(v.parallelism)}</code> key groups. Max parallelism is <strong>fixed for the life of the job</strong> — you can only rescale up to it.`;

    outEl.innerHTML = `
      <div class="rl-grid">
        <div class="rl-panel">
          <div class="rl-panel-head">Now · parallelism ${v.parallelism}</div>
          ${bars(cur.bySubtask, v.parallelism)}
          <div class="rl-metrics"><span>${v.maxParallelism} key groups</span><span>~${kgPerSubtask} groups/subtask</span><span>skew ${skewCur}×</span></div>
        </div>
        <div class="rl-arrow">→</div>
        <div class="rl-panel">
          <div class="rl-panel-head">After rescale · parallelism ${v.target}</div>
          ${bars(r.after.bySubtask, v.target)}
          <div class="rl-metrics"><span>${(r.movedFraction * 100).toFixed(0)}% of keys move</span><span>skew ${skewNew}×</span></div>
        </div>
      </div>
      <div class="lab-insight">
        ${v.target === v.parallelism
          ? 'Same parallelism → nothing moves. Rescaling is only triggered by a change in parallelism.'
          : `Rescaling from ${v.parallelism} to ${v.target} relocates <strong>${(r.movedFraction * 100).toFixed(0)}%</strong> of keys to new subtasks — whole key groups move together, which is why <strong>state can be redistributed without reshuffling individual keys</strong>. Set max parallelism too low and you cap how far you can ever scale; too high and each subtask juggles many tiny key-group shards.`}
      </div>`;
  }

  container.querySelectorAll('#rl-controls input').forEach(el => {
    el.addEventListener('input', () => {
      v[el.dataset.k] = Number(el.value);
      container.querySelector(`#rl-${el.dataset.k}-v`).textContent = el.value;
      render();
    });
  });

  render();
  return () => {};
}
