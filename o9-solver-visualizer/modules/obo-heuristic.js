import { createModuleShell } from '../components/module-shell.js';
import { sortDemands } from '../sim/scs-engine.js';

// Illustrative demand lines for the engine-driven sort demo.
const DEMANDS = [
  { key: 'SO-1001', cust: 'Dealer-A', priority: 2, fairShare: 1, dueDate: '2026-02-10', qty: 120 },
  { key: 'SO-1002', cust: 'Dealer-B', priority: 1, fairShare: 1, dueDate: '2026-02-14', qty: 50 },
  { key: 'SO-1003', cust: 'Dealer-C', priority: 1, fairShare: 1, dueDate: '2026-02-09', qty: 80 },
  { key: 'SO-1004', cust: 'Dealer-D', priority: 2, fairShare: 1, dueDate: '2026-02-10', qty: 200 },
  { key: 'SO-1005', cust: 'Dealer-E', priority: 1, fairShare: 2, dueDate: '2026-02-05', qty: 300 },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Meet the Solver',
    title: 'The Order-by-Order Heuristic',
    subtitle: 'The one idea that explains almost everything the solver does: it plans one demand at a time, in strict priority order, backward from customer to supplier. Understand the order and you can predict the plan.',
    tabs: [
      { id: 'concept', label: '💡 Concept', content: conceptTab() },
      { id: 'sort',    label: '↕️ Demand Sort', content: sortTab() },
      { id: 'solve',   label: '🔁 Backward Solve', content: solveTab() },
      { id: 'phases',  label: '⏱️ Three Phases', content: phasesTab() },
    ],
  });
  wireSort(container);
  return null;
}

function conceptTab() {
  const rows = [
    ['Decision model', 'Look at all demand & supply at once, compute the single cheapest feasible plan', 'Sort the demands, then plan them one by one in that order'],
    ['Objective', 'One global cost function', 'The Objective Rank List (ordered soft constraints)'],
    ['Who wins scarce supply', 'Whatever the cost function prefers', 'The higher-priority demand — it is planned first'],
    ['Explainability', 'Hard', 'Every unit traces to a priority and a constraint'],
  ];
  return `
    <div class="compare-table-wrap">
      <div class="section-header"><div class="section-title">Not an optimiser — a disciplined clerk</div><div class="section-desc">What people assume (LP/MIP) vs what SCS actually does (OBO)</div></div>
      <table class="compare-table">
        <thead><tr><th>Dimension</th><th>❌ Assumed (LP / MIP)</th><th>✅ SCS (order-by-order)</th></tr></thead>
        <tbody>${rows.map(([d, a, b]) => `<tr><td style="font-weight:600;color:var(--text)">${d}</td><td>${a}</td><td style="color:var(--green)">${b}</td></tr>`).join('')}</tbody>
      </table>
    </div>
    <div class="scroll-content"><div class="prose">
      <h3>The key insight</h3>
      <p>Because planning is <strong>sequential</strong>, the <strong>Objective Rank List <em>is</em> the objective</strong>. There is no separate cost function overruling the order — change the ranking and you change the plan. Everything else in this tool is a consequence of this one fact.</p>
    </div></div>`;
}

function demandRows(list, ranked) {
  return list.map((d, i) => `
    <tr>
      <td>${ranked ? `<strong>${i + 1}</strong>` : '<span style="color:var(--text3)">—</span>'}</td>
      <td><code>${d.key}</code> <span style="color:var(--text3)">· ${d.cust}</span></td>
      <td><span class="pill ${d.priority === 1 ? 'pill-green' : 'pill-amber'}">${d.priority}</span></td>
      <td>${d.fairShare}</td>
      <td>${d.dueDate}</td>
      <td>${d.qty}</td>
    </tr>`).join('');
}

function sortTab() {
  return `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">Step 1 — Sort the demands</div><div class="section-desc">Sort order: Priority → Fair-Share → Due Date → Quantity → key. The button runs the real, unit-tested engine function <code>sortDemands()</code>.</div></div>
      <div class="table-scroll">
        <table class="compare-table" id="obo-sort-table">
          <thead><tr><th>Rank</th><th>Order</th><th>Priority</th><th>Fair-Share</th><th>Due Date</th><th>Qty</th></tr></thead>
          <tbody id="obo-sort-body">${demandRows(DEMANDS, false)}</tbody>
        </table>
      </div>
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:14px">
        <button class="quiz-btn primary" id="obo-sort-run">▶ Run the engine sort</button>
        <button class="quiz-btn" id="obo-sort-reset" hidden>↺ Reset</button>
        <span id="obo-sort-note" style="color:var(--text2);font-size:13px"></span>
      </div>
    </div>`;
}

function solveTab() {
  const steps = [
    ['1 · Take the top demand', 'Demands are already sorted. The solver takes <strong>D-High (priority 1)</strong> first and plans it completely before it even looks at D-Low.'],
    ['2 · Net requirement', 'At LC-Store, net requirement = max(0, 50 − 0 + 0) = <strong>50 units</strong>, due Day 5.'],
    ['3 · Consume on-hand (JIT)', 'Backward traversal reaches the DC: <strong>60 on-hand</strong>. Consume 50 → met Just-In-Time, on time. DC on-hand left = <strong>10</strong>.'],
    ['4 · Next demand, what’s left', 'D-High is done. Only now does D-Low (priority 3) start: 50 units due Day 5 — but the DC has just <strong>10</strong> left.'],
    ['5 · Partial + shortfall', 'Consume the last 10 (JIT). Still short <strong>40 units</strong> → traverse upstream to the supplier.'],
    ['6 · Build-Late from supplier', 'New purchase, but lead time 8 days &gt; 5. Earliest arrival Day 8 → <strong>40 units Build-Late</strong> (3 days late).'],
    ['7 · Why the order decided it', 'Same item, same 60 units, same day. <strong>D-High met on time; D-Low 40 late.</strong> The priority sort decided who won the scarce supply.'],
  ];
  return `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">Step 2 — Plan each demand backward, in order</div><div class="section-desc">Two demands want the same 60 units at the DC, same day. Watch priority order decide who is met on time.</div></div>
      <div class="info-grid">
        ${steps.map(([t, b], i) => `<div class="info-card" style="border-left:3px solid ${i === steps.length - 1 ? 'var(--accent)' : 'var(--border)'}"><div class="info-card-title">${t}</div><div class="info-card-body">${b}</div></div>`).join('')}
      </div>
    </div>`;
}

function phasesTab() {
  return `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">The three timing phases</div><div class="section-desc">For each demand the solver tries, in order:</div></div>
      <div class="info-grid">
        <div class="info-card" style="border-left:3px solid var(--green)"><div class="info-card-title">1 · JIT</div><div class="info-card-body">Plan supply to arrive <strong>exactly</strong> when the demand is due. First and best choice.</div></div>
        <div class="info-card" style="border-left:3px solid var(--blue)"><div class="info-card-title">2 · Build-Ahead</div><div class="info-card-body">If JIT can’t be met, build <strong>earlier</strong> and carry it — up to the <strong>Build-Ahead Limit</strong>.</div></div>
        <div class="info-card" style="border-left:3px solid var(--accent)"><div class="info-card-title">3 · Build-Late</div><div class="info-card-body">If still unmet, allow <strong>late</strong> supply up to the <strong>Build-Late Limit</strong>, minimising lateness. Beyond it → a shortage (RCA).</div></div>
      </div>
    </div>`;
}

function wireSort(container) {
  const runBtn = container.querySelector('#obo-sort-run');
  const resetBtn = container.querySelector('#obo-sort-reset');
  const body = container.querySelector('#obo-sort-body');
  const note = container.querySelector('#obo-sort-note');
  if (!runBtn || !body) return;
  runBtn.addEventListener('click', () => {
    const sorted = sortDemands(DEMANDS);
    body.innerHTML = demandRows(sorted, true);
    note.innerHTML = `Sorted by the engine. <strong>${sorted[0].key}</strong> (priority ${sorted[0].priority}) is planned first; <strong>${sorted[sorted.length - 1].key}</strong> last.`;
    runBtn.hidden = true; resetBtn.hidden = false;
  });
  resetBtn.addEventListener('click', () => {
    body.innerHTML = demandRows(DEMANDS, false);
    note.textContent = ''; resetBtn.hidden = true; runBtn.hidden = false;
  });
}
