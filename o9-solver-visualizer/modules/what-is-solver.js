import { createModuleShell, createIQSection } from '../components/module-shell.js';

export const IQ = [
  {
    q: 'What is the o9 Supply Chain Solver, architecturally?',
    a: 'It is a heuristic planning engine packaged as a plugin inside the o9 GraphCube server (<code>o9.GraphCube.Plugins</code>, hosted in the LiveServer). It reads the planning model (demand, supply, network, constraints), plans time-phased supply, and writes results back as measures. It is not a separate product or an external optimiser — it runs in-process against the in-memory cube.',
    tip: 'Say “it’s a GraphCube server plugin, not an LP solver” — it signals you know where it runs and what it is.'
  },
  {
    q: 'Why is SCS a heuristic rather than a cost-minimising optimiser?',
    a: 'Because it plans order-by-order against a ranked list of objectives (the Objective Rank List) instead of solving one global cost function. This is fast and predictable at the scale of a real network (millions of order/lane/day combinations), and it is explainable: every decision traces to a priority and a constraint. The trade-off is that it finds a good, rule-consistent plan — not a provably optimal one.',
    tip: 'Mention explainability and scale as the reasons a heuristic is chosen over an LP/MIP in practice.'
  },
  {
    q: 'Where does the solver sit in the o9 planning stack?',
    a: 'Rule Engine → Solver → Rule Engine. The rule engine stages inputs (e.g. splitting forecast into the solver’s demand buckets, computing safety stock), the solver plans supply on the Supply Plan, and the rule engine post-processes outputs (pegging rollups, exception flags, collaboration measures). The solver consumes prepared measures and emits planned measures.',
    tip: 'Drawing the three-layer stack on a whiteboard is a strong, simple way to answer “how does o9 plan?”.'
  },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Meet the Solver',
    title: 'What is the o9 Solver?',
    subtitle: 'A heuristic planning engine that lives inside the GraphCube server — it turns demand into time-phased, constraint-aware supply decisions.',
    tabs: [
      { id: 'overview', label: '🧠 Overview', content: overviewTab() },
      { id: 'stack',    label: '🧱 Planning Stack', content: stackTab() },
      { id: 'notlp',    label: '⚖️ Not an LP', content: notlpTab() },
      { id: 'iq',       label: '🎯 Interview Q&A', content: createIQSection(IQ) },
    ],
  });
  return null;
}

function overviewTab() {
  return `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">The one-paragraph version</div></div>
      <div class="prose">
        <p>The <strong>o9 Supply Chain Solver (SCS)</strong> is a <strong>heuristic</strong> engine, packaged as a plugin inside the o9 <strong>GraphCube</strong> server. Given demand, on-hand inventory, in-flight supply, the network, and constraints, it produces a <strong>time-phased supply plan</strong>: what to make, move, or buy, where, and when — plus a full <strong>pegging</strong> trace and a <strong>root cause</strong> for anything it can’t fulfil.</p>
        <p>It does this by planning <strong>one demand at a time</strong>, in priority order, working <em>backward</em> from the customer toward the supplier — the order-by-order heuristic.</p>
      </div>
      <div class="info-grid">
        <div class="info-card"><div class="info-card-title">⚙️ What it is</div><div class="info-card-body">A GraphCube server plugin (<code>o9.GraphCube.Plugins</code>) running in-process on the planning cube.</div></div>
        <div class="info-card"><div class="info-card-title">📥 What it reads</div><div class="info-card-body">Demand with priority, on-hand buckets, POs/STOs/ASNs, network lanes, lead times, lot sizes, capacity, calendars.</div></div>
        <div class="info-card"><div class="info-card-title">📤 What it writes</div><div class="info-card-body">Flow / inventory / delivery plans, pegging (from→to), and RCA with suggested available dates.</div></div>
      </div>
    </div>`;
}

function stackTab() {
  return `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">Rule Engine → Solver → Rule Engine</div><div class="section-desc">The solver never works alone — rules prepare its inputs and process its outputs.</div></div>
      <div class="info-grid">
        <div class="info-card" style="border-left:3px solid var(--blue)"><div class="info-card-title">1 · Rule Engine (before)</div><div class="info-card-body">Stages inputs: split forecast into demand buckets, compute safety stock, resolve lead times, prepare network validity.</div></div>
        <div class="info-card" style="border-left:3px solid var(--accent)"><div class="info-card-title">2 · Solver</div><div class="info-card-body">Plans supply order-by-order on the <strong>Supply Plan</strong>, honouring hard constraints and the Objective Rank List.</div></div>
        <div class="info-card" style="border-left:3px solid var(--green)"><div class="info-card-title">3 · Rule Engine (after)</div><div class="info-card-body">Post-processes: pegging rollups, exception/alert flags, collaboration and reporting measures.</div></div>
      </div>
      <div class="prose"><p>This is why “the solver did X” is usually really “the staged inputs told the solver to do X.” Debugging a plan almost always starts one layer up, in the inputs the rule engine prepared.</p></div>
    </div>`;
}

function notlpTab() {
  const rows = [
    ['Decision model', 'One global objective, solved simultaneously', 'Many ordered decisions, one demand at a time'],
    ['Objective', 'A single cost/profit function', 'The Objective Rank List (ordered soft constraints)'],
    ['Optimality', 'Provably optimal (within the model)', 'Good, rule-consistent — not provably optimal'],
    ['Explainability', 'Hard (shadow prices)', 'Easy — every decision traces to priority + constraint'],
    ['Scale behaviour', 'Can blow up combinatorially', 'Near-linear in demands × lanes × days'],
    ['When it changes', 'Re-tune the cost function', 'Re-order the rank list / change priorities'],
  ];
  return `
    <div class="compare-table-wrap">
      <div class="section-header"><div class="section-title">SCS heuristic vs an LP / MIP optimiser</div></div>
      <table class="compare-table">
        <thead><tr><th>Dimension</th><th>LP / MIP optimiser</th><th>o9 SCS (heuristic)</th></tr></thead>
        <tbody>
          ${rows.map(([d, l, s]) => `<tr><td style="font-weight:600;color:var(--text)">${d}</td><td>${l}</td><td style="color:var(--green)">${s}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>
    <div class="scroll-content"><div class="prose">
      <p>The practical punchline: <strong>the Objective Rank List is the objective.</strong> There is no separate cost model quietly overruling the priorities — change the ranking and you change the plan. That is what makes the solver predictable and auditable in production.</p>
    </div></div>`;
}
