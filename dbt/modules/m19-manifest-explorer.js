// M19 · Manifest & Artifact Explorer
// dbt's artifacts turned browsable. Explore a realistic (abbreviated)
// manifest.json / run_results.json / catalog.json, then pick a node to see its
// parents, children, compiled SQL, and last execution result — the exact things
// lineage, docs, Slim CI and cost analysis read out of these files.
import { createModuleShell, createIQSection } from '../components/module-shell.js';
import { renderJsonTree, initJsonTree } from '../components/json-tree.js';
import { injectCodeEnhancements } from '../components/module-shell.js';

// ── Sample project: a small revenue pipeline ────────────────────────────────
const NODES = {
  'source.acme.raw.orders':       { label: 'raw.orders (source)', kind: 'source', parents: [], children: ['model.acme.stg_orders'] },
  'source.acme.raw.customers':    { label: 'raw.customers (source)', kind: 'source', parents: [], children: ['model.acme.stg_customers'] },
  'model.acme.stg_orders':        { label: 'stg_orders', kind: 'model', materialized: 'view', parents: ['source.acme.raw.orders'], children: ['model.acme.fct_orders'] },
  'model.acme.stg_customers':     { label: 'stg_customers', kind: 'model', materialized: 'view', parents: ['source.acme.raw.customers'], children: ['model.acme.fct_orders'] },
  'model.acme.fct_orders':        { label: 'fct_orders', kind: 'model', materialized: 'incremental', parents: ['model.acme.stg_orders', 'model.acme.stg_customers'], children: ['model.acme.fct_revenue'] },
  'model.acme.fct_revenue':       { label: 'fct_revenue', kind: 'model', materialized: 'table', parents: ['model.acme.fct_orders'], children: ['model.acme.dashboard_revenue'] },
  'model.acme.dashboard_revenue': { label: 'dashboard_revenue', kind: 'model', materialized: 'table', parents: ['model.acme.fct_revenue'], children: [] },
};

const COMPILED = {
  'model.acme.fct_orders': `select o.order_id, o.customer_id, c.segment, o.order_total, o.updated_at
from analytics.staging.stg_orders o
join analytics.staging.stg_customers c using (customer_id)
where o.updated_at > (select max(updated_at) from analytics.marts.fct_orders)`,
  'model.acme.fct_revenue': `select date_trunc('day', order_ts) as day, sum(order_total) as revenue
from analytics.marts.fct_orders
group by 1`,
  'model.acme.dashboard_revenue': `select day, revenue, sum(revenue) over (order by day) as revenue_cumulative
from analytics.marts.fct_revenue`,
  'model.acme.stg_orders': `select id as order_id, cust_id as customer_id, amount as order_total, updated_at
from raw.orders`,
  'model.acme.stg_customers': `select id as customer_id, segment from raw.customers`,
};

const RESULTS = {
  'model.acme.stg_orders':        { status: 'success', execution_time: 0.4, rows_affected: null },
  'model.acme.stg_customers':     { status: 'success', execution_time: 0.3, rows_affected: null },
  'model.acme.fct_orders':        { status: 'success', execution_time: 12.4, rows_affected: 513204 },
  'model.acme.fct_revenue':       { status: 'success', execution_time: 3.1, rows_affected: 365 },
  'model.acme.dashboard_revenue': { status: 'error', execution_time: 0.0, message: 'SQL compilation error: column "order_ts" does not exist' },
};

// ── Abbreviated artifact JSON for the tree view ─────────────────────────────
const MANIFEST = {
  metadata: { dbt_version: '1.8.0', project_name: 'acme', generated_at: '2024-06-01T02:14:11Z' },
  nodes: {
    'model.acme.fct_orders': {
      resource_type: 'model',
      config: { materialized: 'incremental', unique_key: 'order_id' },
      depends_on: { nodes: ['model.acme.stg_orders', 'model.acme.stg_customers'] },
      compiled: true,
    },
    'model.acme.fct_revenue': {
      resource_type: 'model',
      config: { materialized: 'table' },
      depends_on: { nodes: ['model.acme.fct_orders'] },
      compiled: true,
    },
  },
  sources: { 'source.acme.raw.orders': { resource_type: 'source', loaded_at_field: 'updated_at' } },
  parent_map: {
    'model.acme.fct_orders': ['model.acme.stg_orders', 'model.acme.stg_customers'],
    'model.acme.fct_revenue': ['model.acme.fct_orders'],
  },
  child_map: {
    'model.acme.fct_orders': ['model.acme.fct_revenue'],
    'model.acme.stg_orders': ['model.acme.fct_orders'],
  },
};

const RUN_RESULTS = {
  metadata: { dbt_version: '1.8.0', generated_at: '2024-06-01T02:16:03Z' },
  elapsed_time: 19.2,
  results: [
    { unique_id: 'model.acme.fct_orders', status: 'success', execution_time: 12.4, adapter_response: { rows_affected: 513204 } },
    { unique_id: 'model.acme.fct_revenue', status: 'success', execution_time: 3.1 },
    { unique_id: 'model.acme.dashboard_revenue', status: 'error', message: 'column "order_ts" does not exist' },
  ],
};

const CATALOG = {
  metadata: { dbt_version: '1.8.0', generated_at: '2024-06-01T02:17:40Z' },
  nodes: {
    'model.acme.fct_orders': {
      columns: {
        order_id: { type: 'NUMBER', index: 1 },
        customer_id: { type: 'NUMBER', index: 2 },
        order_total: { type: 'FLOAT', index: 3 },
      },
      stats: { row_count: { value: 513204 }, bytes: { value: 41231872 } },
    },
  },
};

const ARTIFACTS = {
  manifest:    { label: 'manifest.json', data: MANIFEST, open: 2, highlight: ['nodes', 'parent_map', 'child_map', 'depends_on'], blurb: 'The complete project graph. Powers lineage, docs, state comparison and defer.' },
  run_results: { label: 'run_results.json', data: RUN_RESULTS, open: 3, highlight: ['results', 'status', 'execution_time'], blurb: 'Per-node status + timing from the last invocation. Powers observability & cost analysis.' },
  catalog:     { label: 'catalog.json', data: CATALOG, open: 3, highlight: ['columns', 'stats'], blurb: 'Column types & table stats from the warehouse (dbt docs generate). Powers the docs site.' },
};

const IQ = [
  {
    q: 'Name the three main dbt artifacts and what each one is used for.',
    a: `<ul>
      <li><strong>manifest.json</strong> — the serialized project graph (nodes, configs, compiled SQL, parent_map/child_map). Used by lineage, docs, <code>state:modified</code>, and <code>defer</code>.</li>
      <li><strong>run_results.json</strong> — status + timing for every node in the last run. Used for observability, alerting, and finding slow/expensive models.</li>
      <li><strong>catalog.json</strong> — column types and table stats pulled from the warehouse by <code>dbt docs generate</code>. Used to populate the docs site.</li>
    </ul>`,
    tip: 'If you can say which artifact powers which feature, you have shown you understand dbt as a system that produces data about itself.',
  },
  {
    q: 'How would you find your slowest / most expensive models without re-running anything?',
    a: `Parse <code>run_results.json</code> and sort the <code>results[]</code> by <code>execution_time</code> descending. That gives you the slowest nodes from the last run, with zero additional warehouse cost.
    <br><br>For real cost, join each <code>unique_id</code> back to the <strong>manifest</strong> (to get materialization + lineage) and, on Snowflake/BigQuery, to the warehouse\'s query history by query tag. Many teams load run_results into a table on every run and build a dbt-on-dbt observability model on top.`,
    tip: 'Mentioning "we persist run_results into a table and model it" signals you have run dbt in production, not just locally.',
  },
  {
    q: 'A CI job uses `state:modified+`. Mechanically, what is being compared, and against what?',
    a: `<code>state:modified</code> compares the <strong>current</strong> manifest (built from the PR branch) against a <strong>previous</strong> manifest supplied via <code>--state path/to/artifacts</code> (usually the last production run's manifest).
    <br><br>dbt diffs node definitions — raw SQL, config, and dependencies — to compute which nodes changed. The <code>+</code> then expands the selection to those nodes' downstream children. That's Slim CI: build only what changed and what depends on it, defer everything else to prod.`,
    tip: 'The gotcha: the comparison manifest must come from the right environment and be kept fresh. A stale --state manifest makes CI build the wrong set.',
  },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M19 · dbt Internals',
    title: 'Manifest & Artifact Explorer',
    subtitle: 'Browse a real manifest, run_results and catalog — then trace any node through its lineage.',
    tabs: [
      { id: 'explorer', label: '🗂️ Artifact Explorer' },
      { id: 'detail',   label: '📋 What each artifact holds' },
      { id: 'iq',       label: '🎯 Interview Q&A' },
    ],
  });

  buildExplorer(container);
  buildDetail(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
}

function buildExplorer(container) {
  const tab = container.querySelector('#tab-explorer');
  tab.innerHTML = `
    <p class="lab-intro">These are dbt's own output files. Switch artifacts to browse the raw JSON, then use the
    <strong>node inspector</strong> to trace any model's parents, children, compiled SQL and last result.</p>
    <div class="lab-picker" id="m19-picker">
      ${Object.entries(ARTIFACTS).map(([k, v], i) =>
        `<button class="lab-chip ${i === 0 ? 'active' : ''}" data-art="${k}">${v.label}</button>`).join('')}
    </div>
    <div class="mx-blurb" id="m19-blurb"></div>
    <div id="m19-tree"></div>

    <div class="mx-inspect">
      <div class="mx-inspect-head">
        <span>🔍 Node inspector</span>
        <select class="study-select" id="m19-node">
          ${Object.entries(NODES).filter(([, n]) => n.kind === 'model')
            .map(([id, n]) => `<option value="${id}">${n.label}</option>`).join('')}
        </select>
      </div>
      <div id="m19-node-detail"></div>
    </div>
  `;

  const blurb = tab.querySelector('#m19-blurb');
  const treeEl = tab.querySelector('#m19-tree');

  function renderArtifact(key) {
    const a = ARTIFACTS[key];
    blurb.innerHTML = `<span class="mx-blurb-dot"></span>${a.blurb}`;
    treeEl.innerHTML = renderJsonTree(a.data, { rootLabel: a.label, open: a.open, highlight: a.highlight });
    initJsonTree(treeEl);
  }

  tab.querySelector('#m19-picker').addEventListener('click', e => {
    const chip = e.target.closest('.lab-chip');
    if (!chip) return;
    tab.querySelectorAll('.lab-chip').forEach(c => c.classList.toggle('active', c === chip));
    renderArtifact(chip.dataset.art);
  });

  const nodeDetail = tab.querySelector('#m19-node-detail');
  function renderNode(id) {
    const n = NODES[id];
    const res = RESULTS[id];
    const chip = (nid) => `<span class="mx-chip mx-${NODES[nid]?.kind || 'model'}">${NODES[nid]?.label || nid}</span>`;
    const resultHtml = res
      ? (res.status === 'success'
          ? `<span class="mx-ok">✓ success</span> · ${res.execution_time}s${res.rows_affected != null ? ` · ${res.rows_affected.toLocaleString()} rows` : ''}`
          : `<span class="mx-err">✗ error</span> · ${res.message}`)
      : '—';
    nodeDetail.innerHTML = `
      <div class="mx-grid">
        <div class="mx-cell"><div class="mx-k">Materialization</div><div class="mx-v">${n.materialized || '—'}</div></div>
        <div class="mx-cell"><div class="mx-k">Last result</div><div class="mx-v">${resultHtml}</div></div>
        <div class="mx-cell"><div class="mx-k">Parents (upstream)</div><div class="mx-v">${n.parents.length ? n.parents.map(chip).join(' ') : '—'}</div></div>
        <div class="mx-cell"><div class="mx-k">Children (downstream)</div><div class="mx-v">${n.children.length ? n.children.map(chip).join(' ') : '—'}</div></div>
      </div>
      ${COMPILED[id] ? `<div class="mx-compiled"><div class="mx-k">Compiled SQL</div>
        <div class="code-block" data-lang="sql">${escapeHtml(COMPILED[id])}</div></div>` : ''}
    `;
    injectCodeEnhancements(nodeDetail);
  }

  tab.querySelector('#m19-node').addEventListener('change', e => renderNode(e.target.value));

  renderArtifact('manifest');
  renderNode('model.acme.fct_orders');
}

function buildDetail(container) {
  container.querySelector('#tab-detail').innerHTML = `
    <div class="detail-section">
      <h3>Three files, written on every run</h3>
      <div class="info-grid">
        <div class="info-card" style="border-left-color:#3B82F6">
          <div class="info-card-title">manifest.json</div>
          <div class="info-card-tag" style="color:#3B82F6;background:#3B82F622">The graph</div>
          <div class="info-card-body">Every node, its config, raw + compiled SQL, and <code>parent_map</code>/<code>child_map</code>. The source of truth for lineage, docs, <code>state:modified</code>, and <code>defer</code>.</div>
        </div>
        <div class="info-card" style="border-left-color:#10B981">
          <div class="info-card-title">run_results.json</div>
          <div class="info-card-tag" style="color:#10B981;background:#10B98122">The outcome</div>
          <div class="info-card-body">Status, timing, and adapter response per node from the last invocation. The raw material for observability, alerting, and cost analysis.</div>
        </div>
        <div class="info-card" style="border-left-color:#8B5CF6">
          <div class="info-card-title">catalog.json</div>
          <div class="info-card-tag" style="color:#8B5CF6;background:#8B5CF622">The shape</div>
          <div class="info-card-body">Column types and table stats read from the warehouse by <code>dbt docs generate</code>. Populates the docs site; not produced by a plain <code>dbt run</code>.</div>
        </div>
      </div>
    </div>
    <div class="detail-section">
      <h3>Why artifacts are the real power feature</h3>
      <p>Lineage graphs, the docs site, Slim CI, <code>defer</code>, and every "dbt observability" dashboard are not separate systems — they are just <strong>readers of these JSON files</strong>. Once you see that a run <em>produces data about itself</em>, the advanced features stop being magic.</p>
      <p style="font-size:15px;font-weight:600;color:var(--accent)">Persist your artifacts between runs. State comparison, trend analysis, and cost tracking all depend on having yesterday's manifest and run_results to diff against.</p>
    </div>
  `;
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
