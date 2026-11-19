// M34 · The dbt Semantic Layer (MetricFlow)
// Define a metric ONCE in YAML; MetricFlow compiles any slice of it into
// warehouse SQL at query time — so every tool gets the same number. This is the
// cure for Module 02's "three teams, three revenue numbers".
//
// The Metric Designer below GENERATES the real semantic_models / metrics YAML and
// the `dbt sl query` command, then shows the SQL MetricFlow would compile. The
// SQL and the tiny result preview are labeled ILLUSTRATIVE — nothing is executed
// here (MetricFlow runs that SQL against your warehouse).
import { createModuleShell, createIQSection, injectCodeEnhancements } from '../components/module-shell.js';

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ── Metrics the designer can build (each maps to a real metric YAML block) ────
const METRICS = [
  {
    id: 'total_revenue', label: 'Total Revenue', type: 'simple',
    agg: 'SUM(o.order_total)', filter: null,
    yaml: `  - name: total_revenue
    label: "Total Revenue"
    type: simple
    type_params:
      measure: revenue`,
  },
  {
    id: 'order_count', label: 'Order Count', type: 'simple',
    agg: 'COUNT(o.order_id)', filter: null,
    yaml: `  - name: order_count
    label: "Order Count"
    type: simple
    type_params:
      measure: orders`,
  },
  {
    id: 'avg_order_value', label: 'Avg Order Value', type: 'ratio',
    agg: 'SUM(o.order_total) / NULLIF(COUNT(o.order_id), 0)', filter: null,
    yaml: `  - name: avg_order_value
    label: "Average Order Value"
    type: ratio
    type_params:
      numerator: revenue
      denominator: orders`,
  },
  {
    id: 'completed_revenue', label: 'Completed Revenue', type: 'simple',
    agg: 'SUM(o.order_total)', filter: "o.status = 'completed'",
    yaml: `  - name: completed_revenue
    label: "Completed Revenue"
    type: simple
    type_params:
      measure: revenue
    filter: "{{ Dimension('order__order_status') }} = 'completed'"`,
  },
];

// ── Ways to slice a metric. "join" dims force MetricFlow to join orders→customers
//    on the shared customer entity — the whole point of declaring entities. ─────
const GROUPBYS = [
  { id: 'none',   label: 'Total (no group)', dim: null,                 groupExpr: null,                              join: false },
  { id: 'month',  label: 'By Month',         dim: 'metric_time__month', groupExpr: "DATE_TRUNC('month', o.order_date)", join: false },
  { id: 'week',   label: 'By Week',          dim: 'metric_time__week',  groupExpr: "DATE_TRUNC('week', o.order_date)",  join: false },
  { id: 'status', label: 'By Order Status',  dim: 'order__order_status',groupExpr: 'o.status',                          join: false },
  { id: 'region', label: 'By Customer Region', dim: 'customer__region', groupExpr: 'c.region',                          join: true  },
];

// Illustrative result rows — SHAPE ONLY (loudly labeled in the UI).
const SAMPLE = {
  none:   [['—']],
  month:  [['2025-09-01'], ['2025-10-01'], ['2025-11-01']],
  week:   [['2025-10-20'], ['2025-10-27'], ['2025-11-03']],
  status: [['completed'], ['pending'], ['cancelled']],
  region: [['North America'], ['EMEA'], ['APAC']],
};
const VALS = {
  total_revenue:     ['$1.84M', '$1.97M', '$2.11M'],
  order_count:       ['41,920', '44,610', '47,305'],
  avg_order_value:   ['$43.90', '$44.17', '$44.62'],
  completed_revenue: ['$1.71M', '$1.86M', '$1.98M'],
};

function buildQuery(metric, gb) {
  const parts = [`dbt sl query --metrics ${metric.id}`];
  if (gb.dim) parts.push(`--group-by ${gb.dim}`);
  if (gb.dim) parts.push(`--order-by ${gb.dim}`);
  return parts.join(' \\\n  ');
}

function buildSQL(metric, gb) {
  const lines = ['SELECT'];
  if (gb.groupExpr) lines.push(`  ${gb.groupExpr} AS ${gb.dim},`);
  lines.push(`  ${metric.agg} AS ${metric.id}`);
  lines.push('FROM analytics.fct_orders o');
  if (gb.join) lines.push('LEFT JOIN analytics.dim_customers c ON o.customer_id = c.customer_id');
  if (metric.filter) lines.push(`WHERE ${metric.filter}`);
  if (gb.groupExpr) { lines.push('GROUP BY 1'); lines.push('ORDER BY 1'); }
  return lines.join('\n');
}

function buildResult(metric, gb) {
  const dimRows = SAMPLE[gb.id] || SAMPLE.none;
  const vals = VALS[metric.id];
  const dimHeader = gb.dim || null;
  // completed_revenue filtered to completed: only that status row is meaningful.
  const rows = dimRows
    .filter(r => !(metric.id === 'completed_revenue' && gb.id === 'status' && r[0] !== 'completed'))
    .map((r, i) => (dimHeader ? [r[0], vals[i % vals.length]] : [vals[1]]));
  return { dimHeader, metricHeader: metric.id, rows };
}

// ── Full definition artifact for the "Semantic Model" tab ─────────────────────
const DEFINITION_YAML = `semantic_models:
  - name: orders
    description: "Order grain — one row per order"
    model: ref('fct_orders')
    defaults:
      agg_time_dimension: order_date

    entities:
      - name: order
        type: primary
        expr: order_id
      - name: customer          # shared key → joins to the customers model
        type: foreign
        expr: customer_id

    dimensions:
      - name: order_date
        type: time
        type_params:
          time_granularity: day
      - name: order_status
        type: categorical
        expr: status

    measures:
      - name: revenue
        description: "Sum of order totals"
        agg: sum
        expr: order_total
      - name: orders
        description: "Count of orders"
        agg: count
        expr: order_id

  - name: customers
    description: "One row per customer"
    model: ref('dim_customers')
    entities:
      - name: customer          # same entity name → MetricFlow can join on it
        type: primary
        expr: customer_id
    dimensions:
      - name: region
        type: categorical

metrics:
  - name: total_revenue
    label: "Total Revenue"
    type: simple
    type_params:
      measure: revenue

  - name: avg_order_value
    label: "Average Order Value"
    type: ratio
    type_params:
      numerator: revenue
      denominator: orders`;

const ANATOMY = [
  ['Entities', 'The join keys. <code>primary</code>/<code>foreign</code>/<code>unique</code>. Two models sharing an entity name (here <code>customer</code>) let MetricFlow <strong>auto-join</strong> them — so you can slice orders by a customer attribute without writing the join.'],
  ['Dimensions', 'How you group/slice. <code>categorical</code> (status, region) or <code>time</code> (with a <code>time_granularity</code>). <code>metric_time</code> is the canonical time axis every metric shares.'],
  ['Measures', 'The aggregatable building blocks — <code>agg: sum/count/average/…</code> over a column <code>expr</code>. Measures are not metrics; they are the pieces metrics are built from.'],
  ['Metrics', 'The queryable number. <code>simple</code> (one measure), <code>ratio</code> (numerator/denominator), <code>derived</code> (expression of other metrics), <code>cumulative</code> (running totals). Defined once, queried every way.'],
];

const IQ = [
  {
    q: 'What problem does the dbt Semantic Layer actually solve?',
    a: `Metric <strong>inconsistency</strong> — the exact pain from Module 02. Without it, "revenue" is re-implemented in every dashboard, notebook and query, so three teams get three numbers. The Semantic Layer lets you define a metric <strong>once</strong> in YAML (on top of your dbt models), and <strong>MetricFlow</strong> compiles any requested slice into warehouse SQL at query time. Every consumer — BI tool, notebook, API — asks the Semantic Layer for <code>total_revenue by month</code> and gets the <em>same</em> definition, so the numbers finally agree.`,
    tip: 'Frame it as "governed metrics as code": one definition, queried consistently across every tool. That one sentence lands the point.',
  },
  {
    q: 'Difference between a semantic model, a measure, and a metric?',
    a: `A <strong>semantic model</strong> sits on top of one dbt model and declares its <code>entities</code> (join keys), <code>dimensions</code> (how to slice), and <code>measures</code> (aggregatable columns). A <strong>measure</strong> is a single aggregation like <code>sum(order_total)</code> — a building block, not something you query directly. A <strong>metric</strong> is the queryable number built from measures: <code>simple</code>, <code>ratio</code>, <code>derived</code>, or <code>cumulative</code>.`,
    tip: 'Measures are ingredients; metrics are the dish. Semantic models are where both are declared.',
  },
  {
    q: 'How does MetricFlow turn a metric request into a number — is it pre-aggregated?',
    a: `No pre-aggregation. At <strong>query time</strong> MetricFlow resolves the metric to its measures, <strong>joins</strong> the needed semantic models on their shared entities, applies the requested dimensions as <code>GROUP BY</code>, applies any filters, and emits <strong>warehouse SQL</strong> that runs on demand. That is why one definition can answer "revenue by month", "revenue by region", or "revenue total" without you building a table for each — the join and grain are resolved dynamically from the entities and dimensions you declared.`,
    tip: 'Say "compiled to SQL at query time by joining on entities" — it shows you know MetricFlow is a query compiler, not a cache.',
  },
  {
    q: 'Why not just build a dbt mart with the metric precomputed?',
    a: `A mart fixes <strong>one grain and one set of slices</strong> at build time. The moment someone wants a new breakdown (by region, by week, filtered to completed) you add another model — a combinatorial explosion of near-duplicate marts, each a chance to diverge. The Semantic Layer keeps <strong>one</strong> governed definition and derives every grain/slice on demand, consistently, across every tool. Marts and the Semantic Layer coexist: marts for the heavy shared transforms, the Semantic Layer for the governed metrics on top.`,
    tip: 'The senior framing: marts answer fixed questions cheaply; the Semantic Layer answers arbitrary questions consistently. Use both.',
  },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M34 · Modern dbt',
    title: 'The Semantic Layer (MetricFlow)',
    subtitle: 'Define a metric once; MetricFlow compiles every slice into SQL at query time — so every tool reports the same number.',
    tabs: [
      { id: 'designer', label: '🧮 Metric Designer' },
      { id: 'model',    label: '📝 Semantic Model' },
      { id: 'iq',       label: '🎯 Interview Q&A' },
    ],
  });

  buildDesigner(container);
  buildModel(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
}

function buildDesigner(container) {
  const tab = container.querySelector('#tab-designer');
  tab.innerHTML = `
    <p class="lab-intro">Pick a <strong>metric</strong> and how to <strong>slice</strong> it. The YAML, the
      <code>dbt sl query</code>, and the SQL MetricFlow compiles all update live — notice how slicing
      <em>by region</em> makes MetricFlow join orders to customers on the shared <code>customer</code> entity,
      with no join written by you.</p>

    <div class="sl-pickgroup">
      <div class="sl-pick-label">Metric</div>
      <div class="lab-picker" id="sl-metric">
        ${METRICS.map((m, i) => `<button class="lab-chip ${i === 0 ? 'active' : ''}" data-i="${i}">${m.label}
          <span class="sl-type">${m.type}</span></button>`).join('')}
      </div>
    </div>
    <div class="sl-pickgroup">
      <div class="sl-pick-label">Group by</div>
      <div class="lab-picker" id="sl-groupby">
        ${GROUPBYS.map((g, i) => `<button class="lab-chip ${i === 0 ? 'active' : ''}" data-i="${i}">${g.label}
          ${g.join ? '<span class="sl-type sl-join">⇄ joins</span>' : ''}</button>`).join('')}
      </div>
    </div>

    <div class="stage-panel" id="sl-panel"></div>
  `;

  const panel = tab.querySelector('#sl-panel');
  let mi = 0, gi = 0;

  function render() {
    const metric = METRICS[mi], gb = GROUPBYS[gi];
    const res = buildResult(metric, gb);
    panel.style.setProperty('--panelColor', 'var(--accent)');
    panel.innerHTML = `
      <div class="stage-panel-head">
        <span class="stage-panel-k" style="color:var(--accent)">${metric.type} metric${gb.join ? ' · auto-joined' : ''}</span>
        <span class="stage-panel-t">${metric.label} ${gb.dim ? '— ' + gb.label.toLowerCase() : '— total'}</span>
      </div>
      <div class="stage-panel-body">
        <div class="sl-step"><span class="sl-step-n">1</span> The metric definition (YAML you write once)</div>
        <div class="code-block" data-lang="yaml">${esc('metrics:\n' + metric.yaml)}</div>

        <div class="sl-step"><span class="sl-step-n">2</span> Query it — same command from any integration</div>
        <div class="code-block" data-lang="bash">${esc(buildQuery(metric, gb))}</div>

        <div class="sl-step"><span class="sl-step-n">3</span> MetricFlow compiles it to warehouse SQL
          <span class="sl-illus">illustrative — not executed here</span></div>
        <div class="code-block" data-lang="sql">${esc(buildSQL(metric, gb))}</div>

        <div class="sl-step"><span class="sl-step-n">4</span> What comes back
          <span class="sl-illus">shape only — MetricFlow runs the SQL above on your warehouse</span></div>
        <table class="sl-result">
          <thead><tr>${res.dimHeader ? `<th>${res.dimHeader}</th>` : ''}<th>${res.metricHeader}</th></tr></thead>
          <tbody>${res.rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>
        </table>
      </div>`;
    injectCodeEnhancements(panel);
  }

  tab.querySelector('#sl-metric').addEventListener('click', e => {
    const chip = e.target.closest('.lab-chip'); if (!chip) return;
    mi = Number(chip.dataset.i);
    tab.querySelectorAll('#sl-metric .lab-chip').forEach(c => c.classList.toggle('active', c === chip));
    render();
  });
  tab.querySelector('#sl-groupby').addEventListener('click', e => {
    const chip = e.target.closest('.lab-chip'); if (!chip) return;
    gi = Number(chip.dataset.i);
    tab.querySelectorAll('#sl-groupby .lab-chip').forEach(c => c.classList.toggle('active', c === chip));
    render();
  });
  render();
}

function buildModel(container) {
  container.querySelector('#tab-model').innerHTML = `
    <div class="detail-section">
      <h3>One definition, every tool agrees</h3>
      <div class="pipe" style="margin-bottom:16px">
        <div class="pipe-stage"><div class="pipe-ic">📝</div><div class="pipe-name">semantic_models + metrics</div><div class="pipe-sub">YAML on your dbt models</div></div>
        <div class="pipe-stage"><div class="pipe-ic">⚙️</div><div class="pipe-name">MetricFlow</div><div class="pipe-sub">compiles at query time</div></div>
        <div class="pipe-stage"><div class="pipe-ic">🗄️</div><div class="pipe-name">Warehouse SQL</div><div class="pipe-sub">joins + aggregates</div></div>
        <div class="pipe-stage"><div class="pipe-ic">📊</div><div class="pipe-name">Every consumer</div><div class="pipe-sub">BI · notebook · API — one number</div></div>
      </div>
      <p>Define metrics on top of the models you already have. Because MetricFlow resolves joins and grain from
        the <strong>entities</strong> and <strong>dimensions</strong> you declared, a single definition answers
        every slice — and the <a href="#m02" class="sl-link">three-teams-three-numbers</a> problem goes away.</p>
    </div>

    <div class="detail-section">
      <h3>Anatomy of a semantic model</h3>
      <div class="mx-grid">
        ${ANATOMY.map(a => `<div class="mx-cell"><div class="mx-k">${a[0]}</div><div class="mx-v">${a[1]}</div></div>`).join('')}
      </div>
    </div>

    <div class="detail-section">
      <h3>The full definition</h3>
      <p>Two semantic models sharing the <code>customer</code> entity, plus a <code>simple</code> and a
        <code>ratio</code> metric. This is the entire artifact that powers every query in the designer.</p>
      <div class="code-block" data-lang="yaml">${esc(DEFINITION_YAML)}</div>
      <p style="font-size:15px;font-weight:600;color:var(--accent)">Version note: this is the MetricFlow
        syntax used by current dbt (Core 1.9) — <code>semantic_models:</code> + <code>metrics:</code>,
        queried with <code>dbt sl query</code>. The legacy top-level <code>metrics:</code>-only spec from
        dbt ≤1.5 is deprecated.</p>
    </div>
  `;
}
