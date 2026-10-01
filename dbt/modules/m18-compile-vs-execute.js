// M18 · Compilation vs Execution Lab
// Take one templated model and watch it become warehouse SQL, step by step:
// Jinja source → ref resolution → compiled SQL → adapter DDL → execution.
// Switch between a plain view model and an incremental model to see how the
// compiled output diverges. The point: compile ≠ run.
import { createModuleShell, createIQSection } from '../components/module-shell.js';
import { injectCodeEnhancements } from '../components/module-shell.js';

const EXAMPLES = {
  view: {
    label: 'Simple model (view)',
    steps: [
      {
        k: 'You write', t: 'Templated dbt SQL', color: '#8B5CF6',
        body: 'This is what lives in <code>models/marts/fct_orders.sql</code>. It uses <code>ref()</code> instead of a hard-coded table name.',
        code: `-- models/marts/fct_orders.sql
select
  order_id,
  customer_id,
  order_total
from {{ ref('stg_orders') }}
where order_total > 0`,
      },
      {
        k: 'Parse', t: 'ref() detected → edge created', color: '#3B82F6',
        body: 'dbt reads the file and finds <code>ref(\'stg_orders\')</code>. It records a dependency edge <strong>fct_orders → stg_orders</strong> in the manifest. No SQL has run; nothing is rendered to disk yet.',
        code: `# dependency learned at parse time
stg_orders  →  fct_orders

# manifest: "depends_on": { "nodes": ["model.acme.stg_orders"] }`,
      },
      {
        k: 'Compile', t: 'Jinja rendered → compiled SQL', color: '#10B981',
        body: '<code>{{ ref(\'stg_orders\') }}</code> is replaced by the fully-qualified relation for the active target. The result is written to <code>target/compiled/…</code>. <strong>Running <code>dbt compile</code> stops here.</strong>',
        code: `-- target/compiled/acme/models/marts/fct_orders.sql
select
  order_id,
  customer_id,
  order_total
from analytics.staging.stg_orders   -- ref() resolved
where order_total > 0`,
      },
      {
        k: 'Adapter', t: 'Wrapped in materialization DDL', color: '#F59E0B',
        body: 'Materialized as a view, so the adapter wraps the compiled SELECT in <code>CREATE OR REPLACE VIEW</code> targeting the resolved schema.',
        code: `create or replace view analytics.marts.fct_orders as (
  select order_id, customer_id, order_total
  from analytics.staging.stg_orders
  where order_total > 0
);`,
      },
      {
        k: 'Execute', t: 'Warehouse runs it', color: '#EF4444',
        body: 'Only now does the warehouse do work. The view is created. This is the <strong>only</strong> step that spends compute. A failure here is a real SQL/warehouse error, recorded in <code>run_results.json</code>.',
        code: `-- warehouse result
View ANALYTICS.MARTS.FCT_ORDERS created.   ✓
-- run_results.json: { status: "success", execution_time: 0.4 }`,
      },
    ],
  },
  incremental: {
    label: 'Incremental model',
    steps: [
      {
        k: 'You write', t: 'Templated SQL + is_incremental()', color: '#8B5CF6',
        body: 'Same model, now configured incremental with a <code>unique_key</code>. The <code>is_incremental()</code> block only applies on subsequent runs.',
        code: `-- models/marts/fct_orders.sql
{{ config(materialized='incremental', unique_key='order_id') }}

select order_id, customer_id, order_total, updated_at
from {{ ref('stg_orders') }}
{% if is_incremental() %}
  where updated_at > (select max(updated_at) from {{ this }})
{% endif %}`,
      },
      {
        k: 'Parse', t: 'config + refs detected', color: '#3B82F6',
        body: 'dbt records the dependency edge AND the incremental config. <code>{{ this }}</code> and <code>is_incremental()</code> are noted but not evaluated yet.',
        code: `# parsed config
materialized = incremental
unique_key   = order_id
depends_on   = [stg_orders]`,
      },
      {
        k: 'Compile', t: 'Jinja rendered for an incremental run', color: '#10B981',
        body: 'On an incremental run the <code>is_incremental()</code> branch renders TRUE, so the filter is included and <code>{{ this }}</code> resolves to the existing table. On a <code>--full-refresh</code> it would render the branch away.',
        code: `-- target/compiled/.../fct_orders.sql (incremental run)
select order_id, customer_id, order_total, updated_at
from analytics.staging.stg_orders
where updated_at > (select max(updated_at)
                    from analytics.marts.fct_orders)`,
      },
      {
        k: 'Adapter', t: 'Compiled SQL → MERGE', color: '#F59E0B',
        body: 'The adapter turns the incremental model into a <code>MERGE</code> (on Snowflake/BigQuery) keyed on <code>unique_key</code> — new rows insert, matched rows update. This DDL is adapter-specific; you never wrote it.',
        code: `merge into analytics.marts.fct_orders as t
using ( <compiled select> ) as s
  on t.order_id = s.order_id
when matched then update set ...
when not matched then insert ...;`,
      },
      {
        k: 'Execute', t: 'Only new rows processed', color: '#EF4444',
        body: 'The warehouse merges only the rows the filter selected — not the full table. This is the whole point of incremental: bounded compute on each run.',
        code: `-- warehouse result
MERGE: 512,000 rows inserted, 1,204 updated.   ✓
-- vs full refresh: 2,000,000,000 rows scanned`,
      },
    ],
  },
};

const IQ = [
  {
    q: 'Does `dbt compile` execute any SQL? What is it actually for?',
    a: `No. <code>dbt compile</code> renders Jinja to pure SQL and writes it to <code>target/compiled/</code> — the warehouse is never touched.
    <br><br>It\'s for <strong>seeing exactly what will run</strong>: debugging a gnarly macro, confirming a <code>ref()</code> resolved to the right schema, or reviewing generated SQL in a PR. Because it spends no credits, it\'s also a cheap CI check that the whole project renders.`,
    tip: 'Say "compile is how I debug macros without burning warehouse credits." That single sentence proves you understand the compile/execute split.',
  },
  {
    q: 'What does `{{ ref(\'stg_orders\') }}` turn into, and when?',
    a: `At <strong>compile time</strong> it is replaced by the fully-qualified relation for the active target — e.g. <code>analytics.staging.stg_orders</code> in prod, <code>dbt_alice.staging.stg_orders</code> in dev.
    <br><br>Two things happen from that one call: (1) at <em>parse</em> time it creates the dependency edge that orders the DAG; (2) at <em>compile</em> time it resolves to the correct physical name for the environment. That dual role is why you must never hard-code table names.`,
    tip: 'The "one ref() does two jobs — ordering AND environment resolution" framing is the senior answer.',
  },
  {
    q: 'On an incremental model, how does the compiled SQL differ between a normal run and `--full-refresh`?',
    a: `The difference is whether the <code>is_incremental()</code> branch renders.
    <ul>
      <li><strong>Normal incremental run:</strong> <code>is_incremental()</code> → TRUE, so the <code>where updated_at > (select max... from {{ this }})</code> filter is compiled in, and the adapter emits a <code>MERGE</code> that touches only new/changed rows.</li>
      <li><strong>--full-refresh:</strong> <code>is_incremental()</code> → FALSE, the filter is compiled away, and the adapter emits <code>CREATE OR REPLACE TABLE</code> — the whole table is rebuilt from scratch.</li>
    </ul>
    So the same source file compiles to two very different queries depending on one flag.`,
    tip: 'Mention that the FIRST ever run of an incremental model also compiles with is_incremental()=FALSE (there is no table yet) — a subtle point that catches people out.',
  },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M18 · dbt Internals',
    title: 'Compilation vs Execution Lab',
    subtitle: 'Watch one templated model become warehouse SQL, one stage at a time. Compile ≠ run.',
    tabs: [
      { id: 'lab',    label: '⚙️ Transform Lab' },
      { id: 'detail', label: '📋 parse · compile · run · build' },
      { id: 'iq',     label: '🎯 Interview Q&A' },
    ],
  });

  buildLab(container);
  buildDetail(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
}

function buildLab(container) {
  const tab = container.querySelector('#tab-lab');
  tab.innerHTML = `
    <p class="lab-intro">Pick a model, then step through the pipeline. Notice that the warehouse does
    <strong>nothing</strong> until the final <em>Execute</em> step.</p>
    <div class="lab-picker" id="m18-picker">
      ${Object.entries(EXAMPLES).map(([k, v], i) =>
        `<button class="lab-chip ${i === 0 ? 'active' : ''}" data-ex="${k}">${v.label}</button>`).join('')}
    </div>
    <div class="stepper" id="m18-stepper"></div>
    <div class="stage-panel" id="m18-panel"></div>
    <div class="stage-nav">
      <button class="btn btn-secondary" id="m18-prev">← Back</button>
      <button class="btn btn-primary" id="m18-next">Next stage →</button>
    </div>
  `;

  let exKey = 'view';
  let idx = 0;

  const stepperEl = tab.querySelector('#m18-stepper');
  const panelEl = tab.querySelector('#m18-panel');
  const prevBtn = tab.querySelector('#m18-prev');
  const nextBtn = tab.querySelector('#m18-next');

  function render() {
    const steps = EXAMPLES[exKey].steps;
    idx = Math.max(0, Math.min(idx, steps.length - 1));
    stepperEl.innerHTML = steps.map((s, i) =>
      `<button class="stepper-dot ${i === idx ? 'current' : (i < idx ? 'done' : '')}" data-i="${i}">
         <span class="stepper-num">${i + 1}</span>${s.k}
       </button>`).join('');
    const s = steps[idx];
    panelEl.style.setProperty('--panelColor', s.color);
    panelEl.innerHTML = `
      <div class="stage-panel-head">
        <span class="stage-panel-k">Stage ${idx + 1} / ${steps.length}</span>
        <span class="stage-panel-t">${s.t}</span>
      </div>
      <div class="stage-panel-body">${s.body}</div>
      <div class="code-block" data-lang="sql" style="margin-top:14px">${escapeHtml(s.code)}</div>
    `;
    injectCodeEnhancements(panelEl);
    prevBtn.disabled = idx === 0;
    nextBtn.textContent = idx === steps.length - 1 ? '↺ Restart' : 'Next stage →';
  }

  tab.querySelector('#m18-picker').addEventListener('click', e => {
    const chip = e.target.closest('.lab-chip');
    if (!chip) return;
    tab.querySelectorAll('.lab-chip').forEach(c => c.classList.toggle('active', c === chip));
    exKey = chip.dataset.ex; idx = 0; render();
  });
  stepperEl.addEventListener('click', e => {
    const dot = e.target.closest('.stepper-dot');
    if (dot) { idx = Number(dot.dataset.i); render(); }
  });
  prevBtn.addEventListener('click', () => { idx--; render(); });
  nextBtn.addEventListener('click', () => {
    const n = EXAMPLES[exKey].steps.length;
    idx = idx === n - 1 ? 0 : idx + 1; render();
  });

  render();
}

function buildDetail(container) {
  container.querySelector('#tab-detail').innerHTML = `
    <div class="detail-section">
      <h3>What each command does — and does NOT do</h3>
      <div class="compare-table-wrap">
      <table class="compare-table">
        <thead><tr><th>Command</th><th>Renders Jinja</th><th>Writes compiled SQL</th><th>Runs on warehouse</th><th>Runs tests</th></tr></thead>
        <tbody>
          <tr><td><code>dbt parse</code></td><td class="bad">structure only</td><td class="bad">no</td><td class="bad">no</td><td class="bad">no</td></tr>
          <tr><td><code>dbt compile</code></td><td class="good">yes</td><td class="good">yes</td><td class="bad">no</td><td class="bad">no</td></tr>
          <tr><td><code>dbt run</code></td><td class="good">yes</td><td class="good">yes</td><td class="good">yes</td><td class="bad">no</td></tr>
          <tr><td><code>dbt test</code></td><td class="good">yes</td><td class="good">yes</td><td class="good">yes (tests)</td><td class="good">yes</td></tr>
          <tr><td><code>dbt build</code></td><td class="good">yes</td><td class="good">yes</td><td class="good">yes</td><td class="good">yes (gates children)</td></tr>
        </tbody>
      </table>
      </div>
    </div>
    <div class="detail-section">
      <h3>Why the split exists</h3>
      <p>dbt separates <strong>planning</strong> (parse + compile) from <strong>execution</strong> on purpose. Planning is free and deterministic, so you can validate an entire project in CI, review generated SQL in a PR, and catch dependency bugs — all without spending a single warehouse credit. Execution is the only expensive, side-effecting step, and it happens last, in dependency order.</p>
      <p style="font-size:15px;font-weight:600;color:var(--accent)">Compile answers "what SQL will run?" — Execute answers "run it." Keeping them separate is what makes dbt cheap to test and safe to deploy.</p>
    </div>
  `;
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
