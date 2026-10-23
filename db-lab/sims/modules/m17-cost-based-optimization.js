/* ============================================================
   m17-cost-based-optimization.js — ⚡ Interactive Lab: Cost-Based Optimizer.
   Renderer for sims/kernels/optimizer.mjs. Turn the knobs (table sizes,
   selectivity, index, memory) and watch the optimizer enumerate access
   paths and join algorithms, cost each, and pick the cheapest. TEACHING
   cost model — shapes, not any engine's real numbers.
   ============================================================ */
import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { createOptimizer } from '../kernels/optimizer.mjs';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
const src = (id) => (window.DBLab && window.DBLab.source && window.DBLab.source(id)) || null;
const fmt = (n) => Number(n).toLocaleString();

const PRESETS = {
  lookup: { label: 'Selective lookup', p: { outerRows: 20, innerRows: 1000000, selectivity: 0.0001, hasIndexInner: true, memoryPages: 100 } },
  scanjoin: { label: 'Big scan join', p: { outerRows: 2000000, innerRows: 500000, selectivity: 0.4, hasIndexInner: false, memoryPages: 400 } },
  starjoin: { label: 'Star join (indexed)', p: { outerRows: 5000000, innerRows: 50000, selectivity: 0.02, hasIndexInner: true, memoryPages: 200 } },
};

export function mount(host) {
  const shell = createModuleShell(host, {
    tag: '⚡ Interactive Lab · Query Engine',
    title: 'Cost-Based Query Optimization',
    subtitle: "Turn the knobs and watch the optimizer enumerate access paths and join algorithms, cost each in page-I/O units, and pick the cheapest plan. A teaching cost model — it captures the shape of real optimizer decisions, not any engine's exact numbers.",
    tabs: [{ id: 'lab', label: 'Lab' }, { id: 'how', label: 'How it works' }, { id: 'iq', label: 'Interview' }],
  });
  const teardown = initTabs(shell.tabs, shell.body, {
    lab: (panel) => mountLab(panel),
    how: (panel) => { panel.innerHTML = howHTML(); },
    iq: (panel) => { const iq = createIQSection(); panel.appendChild(iq.el); initIQ(iq, IQ); },
  });
  return { destroy() { if (typeof teardown === 'function') teardown(); } };
}

function mountLab(panel) {
  let kernel = createOptimizer({});
  const root = document.createElement('div');
  root.className = 'opt-lab';
  panel.appendChild(root);

  function setp(key, value) { try { kernel.dispatch({ type: 'set', key: key, value: value }); } catch (e) {} render(); }

  root.addEventListener('input', (ev) => {
    const el = ev.target; if (!el.dataset.param) return;
    if (el.type === 'checkbox') setp(el.dataset.param, el.checked);
    else setp(el.dataset.param, Number(el.value));
  });
  root.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-act]'); if (!el) return;
    if (el.dataset.act === 'reset') { kernel = createOptimizer({}); return render(); }
    if (el.dataset.act === 'preset') {
      const p = PRESETS[el.dataset.preset].p;
      kernel = createOptimizer({});
      Object.keys(p).forEach((key) => { try { kernel.dispatch({ type: 'set', key: key, value: p[key] }); } catch (e) {} });
      render();
    }
  });

  function render() { root.innerHTML = labHTML(kernel); }
  render();
}

function labHTML(k) {
  const s = k.state, p = s.params, pl = s.plan, m = k.metrics(), inv = k.invariants();
  const maxJoin = Math.max.apply(null, pl.join.map((j) => j.cost));
  const maxAcc = Math.max.apply(null, pl.access.map((a) => a.cost));

  const slider = (key, label, min, max, step, val, suffix) =>
    `<div class="opt-knob"><label class="bp-lbl">${label}</label>
      <input type="range" data-param="${key}" min="${min}" max="${max}" step="${step}" value="${val}" class="opt-range"/>
      <span class="opt-kv">${fmt(val)}${suffix || ''}</span></div>`;

  const planRow = (pl2, chosen, maxc, kind) => pl2.map((x) => `
    <div class="opt-plan ${x === chosen ? 'chosen' : ''}">
      <div class="opt-plan-head"><span class="opt-plan-name">${x === chosen ? '★ ' : ''}${esc(x.name)}</span><span class="opt-plan-cost">${fmt(x.cost)}</span></div>
      <div class="opt-bar"><div class="opt-bar-fill ${x === chosen ? 'win' : ''}" style="width:${maxc ? (x.cost / maxc * 100).toFixed(1) : 0}%"></div></div>
      <div class="opt-plan-note">${esc(x.note)}</div>
    </div>`).join('');

  return `
  <div class="opt-controls">
    <div class="opt-knobs">
      ${slider('outerRows', 'outer rows', 10, 10000000, 10, p.outerRows, '')}
      ${slider('innerRows', 'inner rows', 10, 10000000, 10, p.innerRows, '')}
      ${slider('selectivity', 'predicate selectivity', 0, 1, 0.0005, p.selectivity, '')}
      ${slider('memoryPages', 'memory (pages)', 1, 5000, 1, p.memoryPages, '')}
    </div>
    <div class="bp-row">
      <label class="opt-check"><input type="checkbox" data-param="hasIndexInner" ${p.hasIndexInner ? 'checked' : ''}/> index on inner join/filter key</label>
      <span class="bp-sep"></span>
      ${Object.keys(PRESETS).map((id) => `<button class="bp-chip" data-act="preset" data-preset="${id}">${esc(PRESETS[id].label)}</button>`).join('')}
      <button class="bp-btn" data-act="reset">Reset</button>
    </div>
  </div>

  <div class="opt-query">
    <code>SELECT * FROM outer JOIN inner ON outer.fk = inner.id WHERE inner.pred</code>
    <span class="opt-card">est. result ≈ <b>${fmt(pl.estRows)}</b> rows &nbsp;·&nbsp; outer ${fmt(pl.Opg)} pg · inner ${fmt(pl.Ipg)} pg · ${pl.fits ? 'inner fits memory' : 'inner spills'}</span>
  </div>

  <div class="opt-grid">
    <div class="wal-panel"><div class="wal-panel-h">Access path (filter inner)</div><div class="opt-plans">${planRow(pl.access, pl.chosenAccess, maxAcc)}</div></div>
    <div class="wal-panel"><div class="wal-panel-h">Join algorithm</div><div class="opt-plans">${planRow(pl.join, pl.chosenJoin, maxJoin)}</div></div>
  </div>

  <div class="bp-metrics">
    ${metric('Chosen join I/O', fmt(m.chosenJoinCost))}
    ${metric('Worst plan I/O', fmt(m.worstJoinCost))}
    ${metric('Speedup', m.speedup.toFixed(1) + '×')}
    ${metric('Est. rows', fmt(m.estRows))}
    ${metric('Access I/O', fmt(m.accessCost))}
  </div>
  <div class="wal-invariants">${inv.map((c) => `<span class="wal-inv ${c.ok ? 'ok' : 'bad'}" title="${esc(c.detail)}">${c.ok ? '✓' : '✗'} ${esc(c.name)}</span>`).join('')}</div>
  <div class="bp-explain"><span>▸</span> ${esc(s.note)}</div>
  <details class="wal-disc"><summary>Teaching model — what's simplified</summary>
    <ul>
      <li>Costs are abstract page-I/O units, not milliseconds; a real optimizer blends CPU, random-vs-sequential I/O and buffer effects.</li>
      <li>FK→PK join, so result ≈ selectivity × outer rows. General joins need histograms and multi-column correlation.</li>
      <li>Hash "fits memory" is a single threshold; real engines model partitions, grace hashing and skew.</li>
    </ul>
  </details>`;
}

function metric(l, v) { return `<div class="bp-metric"><div class="bp-metric-v">${esc(v)}</div><div class="bp-metric-l">${esc(l)}</div></div>`; }

function howHTML() {
  const cmu = src('cmu-15445');
  const cite = cmu ? ` <a class="wal-cite" href="${cmu.url}" target="_blank" rel="noopener">CMU 15-445↗</a>` : '';
  return `<div class="wal-how">
    <h3>What a cost-based optimizer does</h3>
    <p>For a given query it enumerates equivalent physical plans — different access paths and join algorithms — estimates each plan's cost from table statistics, and executes the cheapest. It never runs the slow ones; it predicts them.${cite}</p>
    <h3>Cardinality first</h3>
    <p>Everything hinges on estimating how many rows flow between operators. A wrong row estimate (bad selectivity, correlated columns) is the usual cause of a catastrophic plan — the optimizer confidently picks a nested loop for what turns out to be millions of rows.</p>
    <h3>The crossovers to feel</h3>
    <ul>
      <li><b>Seq vs Index scan:</b> an index wins only when the filter is selective enough that fetching matches beats reading every page. Slide selectivity up and watch it flip to Seq Scan.</li>
      <li><b>Nested loop vs Hash vs Merge:</b> indexed nested loop shines for a small outer with an inner index; hash join dominates large unsorted equi-joins that fit memory; merge join wins when inputs are already sorted (or memory is tight).</li>
      <li><b>Memory:</b> shrink memory and watch the hash join spill (×2) and merge/other plans overtake it.</li>
    </ul>
  </div>`;
}

const IQ = [
  { q: 'Why is cardinality (row-count) estimation the heart of query optimization?',
    a: 'Plan cost is driven by how many rows each operator processes. If the optimizer mis-estimates selectivity, it picks the wrong join order and algorithm — e.g., a nested loop that is great for 10 rows but disastrous for 10 million. Good statistics and histograms matter more than the cost constants.',
    tip: 'Say "garbage estimates → garbage plans" and cite correlated columns as a classic failure.' },
  { q: 'When does an index scan lose to a sequential scan?',
    a: 'When the predicate is not selective: fetching a large fraction of rows through the index means many random I/Os plus the index traversal, which costs more than streaming every page sequentially once. Past a crossover selectivity (often a few percent), seq scan wins.',
    tip: 'Mention random vs sequential I/O and the few-percent crossover.' },
  { q: 'Compare nested-loop, hash and merge joins — when is each best?',
    a: 'Indexed nested loop: small outer with an index on the inner join key. Hash join: large, unsorted equi-joins that fit (or partition into) memory — no ordering needed. Merge join: inputs already sorted on the join key (e.g., from an index or a prior sort), or when memory is too tight for a hash table.',
    tip: 'Tie each to a precondition: index+small outer, in-memory equi-join, pre-sorted inputs.' },
  { q: 'What happens to a hash join when the build side exceeds memory?',
    a: 'It spills: the build and probe inputs are partitioned to disk and processed partition-by-partition (grace/hybrid hash), adding extra I/O passes. The lab models this as a ×2 cost once the inner no longer fits — enough to let merge or indexed plans overtake it.',
    tip: 'Name grace/hybrid hash and the extra I/O passes.' },
];
