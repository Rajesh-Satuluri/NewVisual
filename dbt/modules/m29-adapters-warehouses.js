// M29 · Adapters & Warehouses Lab
// The adapter is why one dbt model runs on Snowflake, BigQuery, Databricks,
// Redshift or Postgres. This lab shows what differs per warehouse — incremental
// strategy, partitioning/clustering, materializations, cost model.
import { createModuleShell, createIQSection, injectCodeEnhancements } from '../components/module-shell.js';

const WH = [
  {
    id: 'snowflake', name: 'Snowflake', color: '#29B5E8',
    incr: 'merge (default), delete+insert', part: 'No partitions; CLUSTER BY keys for micro-partition pruning',
    compute: 'Virtual warehouses (separate compute); per-second billing; auto-suspend',
    mats: 'view, table, incremental, materialized view; dynamic tables',
    note: 'The most common dbt warehouse. MERGE-based incrementals; clustering (not partitioning) controls pruning. Time-travel makes rollback easy.',
    cfg: `{{ config(materialized='incremental',
    incremental_strategy='merge',
    unique_key='order_id',
    cluster_by=['order_date']) }}`,
  },
  {
    id: 'bigquery', name: 'BigQuery', color: '#4285F4',
    incr: 'merge, insert_overwrite (partition-level)', part: 'PARTITION BY (date/int range) + CLUSTER BY; partition pruning is the key cost lever',
    compute: 'Serverless; billed by bytes scanned (on-demand) or slots',
    mats: 'view, table, incremental, materialized view',
    note: 'Cost = bytes scanned, so partitioning + pruning dominate. insert_overwrite by date partition is the cheapest incremental pattern at scale.',
    cfg: `{{ config(materialized='incremental',
    incremental_strategy='insert_overwrite',
    partition_by={'field':'order_date','data_type':'date'},
    cluster_by=['customer_id']) }}`,
  },
  {
    id: 'databricks', name: 'Databricks', color: '#FF3621',
    incr: 'merge, insert_overwrite, replace_where', part: 'PARTITIONED BY + Z-ORDER (or Liquid Clustering) on Delta',
    compute: 'Spark clusters / SQL warehouses; Delta Lake storage',
    mats: 'view, table, incremental, materialized view, streaming tables',
    note: 'Lakehouse: dbt builds Delta tables. Z-ORDER/liquid clustering replace classic partitioning for pruning; supports streaming tables.',
    cfg: `{{ config(materialized='incremental',
    incremental_strategy='merge',
    unique_key='order_id',
    file_format='delta',
    partition_by=['order_date']) }}`,
  },
  {
    id: 'redshift', name: 'Redshift', color: '#C925D1',
    incr: 'merge, delete+insert, append', part: 'DISTKEY / SORTKEY (distribution + sort), not partitions',
    compute: 'Provisioned clusters (or Serverless); coupled storage+compute (classic)',
    mats: 'view, table, incremental, materialized view',
    note: 'Performance comes from choosing DISTKEY (co-locate joins) and SORTKEY (range-restrict scans). delete+insert is common where MERGE is slower.',
    cfg: `{{ config(materialized='incremental',
    incremental_strategy='delete+insert',
    unique_key='order_id',
    dist='customer_id', sort='order_date') }}`,
  },
  {
    id: 'postgres', name: 'Postgres', color: '#336791',
    incr: 'delete+insert, append (no native MERGE on older versions)', part: 'Declarative table partitioning + indexes',
    compute: 'Single instance; OLTP engine, not an analytics MPP',
    mats: 'view, table, incremental, materialized view',
    note: 'Great for small/medium data, dev, and dbt learning. Not an MPP warehouse — large analytical scans are slow; indexes matter. Often the default for local dev.',
    cfg: `{{ config(materialized='incremental',
    incremental_strategy='delete+insert',
    unique_key='order_id',
    indexes=[{'columns':['order_date']}]) }}`,
  },
];

const IQ = [
  {
    q: 'How does dbt run the same model on Snowflake and BigQuery? What is the adapter\'s job?',
    a: `The <strong>adapter</strong> (dbt-snowflake, dbt-bigquery, …) translates dbt\'s materialization and config into each warehouse\'s dialect and DDL, and manages the connection/transaction.
    <br><br>Your model is portable SQL + config; the adapter decides that an incremental model becomes a <code>MERGE</code> on Snowflake but can become partition <code>insert_overwrite</code> on BigQuery, and that <code>cluster_by</code> maps to Snowflake clustering vs BigQuery CLUSTER BY. Warehouse-specific behavior lives in the adapter, not your model — that is what keeps models portable.`,
    tip: 'One concrete divergence (Snowflake clustering vs BigQuery partition_by) proves you understand the adapter boundary, not just that it exists.',
  },
  {
    q: 'What changes about your incremental strategy choice across Snowflake, BigQuery, and Redshift?',
    a: `<ul>
      <li><strong>Snowflake</strong>: <code>merge</code> by default; cluster keys for pruning. delete+insert where MERGE underperforms.</li>
      <li><strong>BigQuery</strong>: <code>insert_overwrite</code> by date partition is cheapest at scale (cost = bytes scanned, so overwrite only the touched partitions); merge for row-level upserts.</li>
      <li><strong>Redshift</strong>: <code>delete+insert</code> is common; performance is driven by DISTKEY/SORTKEY rather than partitions.</li>
    </ul>
    The strategy is a function of the warehouse\'s physical model and cost basis — there is no single "best" strategy across all adapters.`,
    tip: 'Tie each choice to the warehouse\'s cost/physical model (bytes-scanned → partition overwrite; dist/sort keys → delete+insert). That reasoning is what they are probing.',
  },
  {
    q: 'What stays the same across warehouses, and what must you be careful about when porting?',
    a: `<strong>Same:</strong> the project structure, ref()/source(), tests, docs, lineage, and the overall model SQL for standard transformations — dbt\'s whole value is this portability.
    <br><br><strong>Careful:</strong> SQL dialect differences (date functions, QUALIFY support, type names), incremental strategy availability (insert_overwrite is BigQuery/Spark, not Snowflake-native), partitioning/clustering config, and adapter-specific perf tuning. Isolate dialect-specific bits in macros (or <code>dbt_utils</code>/adapter dispatch) so the port is contained.`,
    tip: 'Mentioning adapter.dispatch / dbt_utils cross-database macros as the way to keep dialect differences contained is the senior move.',
  },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M29 · Platform & Architecture',
    title: 'Adapters & Warehouses Lab',
    subtitle: 'The adapter is why one model runs anywhere. What differs per warehouse — strategy, partitioning, cost.',
    tabs: [
      { id: 'lab',    label: '🔌 Warehouses' },
      { id: 'detail', label: '📋 The adapter layer' },
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
    <p class="lab-intro">Your model stays portable; the <strong>adapter</strong> translates it to each warehouse's
    dialect and physical model. Pick a warehouse to see what changes.</p>
    <div class="lab-picker" id="m29-pick">
      ${WH.map((w, i) => `<button class="lab-chip ${i === 0 ? 'active' : ''}" data-i="${i}">
        <span class="lab-sev" style="background:${w.color}"></span>${w.name}</button>`).join('')}
    </div>
    <div class="stage-panel" id="m29-panel"></div>
  `;
  const panel = tab.querySelector('#m29-panel');

  function render(i) {
    const w = WH[i];
    panel.style.setProperty('--panelColor', w.color);
    panel.innerHTML = `
      <div class="stage-panel-head">
        <span class="stage-panel-k" style="color:${w.color}">adapter · dbt-${w.id}</span>
        <span class="stage-panel-t">${w.name}</span>
      </div>
      <div class="stage-panel-body">
        <p>${w.note}</p>
        <div class="mx-grid" style="margin:14px 0">
          <div class="mx-cell"><div class="mx-k">Incremental strategies</div><div class="mx-v">${w.incr}</div></div>
          <div class="mx-cell"><div class="mx-k">Partition / cluster</div><div class="mx-v">${w.part}</div></div>
          <div class="mx-cell"><div class="mx-k">Compute & cost</div><div class="mx-v">${w.compute}</div></div>
          <div class="mx-cell"><div class="mx-k">Materializations</div><div class="mx-v">${w.mats}</div></div>
        </div>
        <div class="mx-k" style="margin-bottom:6px">Typical incremental config</div>
        <div class="code-block" data-lang="sql">${escapeHtml(w.cfg)}</div>
      </div>`;
    injectCodeEnhancements(panel);
  }

  tab.querySelector('#m29-pick').addEventListener('click', e => {
    const chip = e.target.closest('.lab-chip');
    if (!chip) return;
    tab.querySelectorAll('#m29-pick .lab-chip').forEach(c => c.classList.toggle('active', c === chip));
    render(Number(chip.dataset.i));
  });
  render(0);
}

function buildDetail(container) {
  container.querySelector('#tab-detail').innerHTML = `
    <div class="detail-section">
      <h3>Where the adapter sits</h3>
      <div class="pipe" style="margin-bottom:16px">
        <div class="pipe-stage"><div class="pipe-ic">📝</div><div class="pipe-name">Your model</div><div class="pipe-sub">portable SQL</div></div>
        <div class="pipe-stage"><div class="pipe-ic">⚙️</div><div class="pipe-name">Compiled SQL</div><div class="pipe-sub">Jinja rendered</div></div>
        <div class="pipe-stage"><div class="pipe-ic">🔌</div><div class="pipe-name">Adapter</div><div class="pipe-sub">dialect + DDL</div></div>
        <div class="pipe-stage"><div class="pipe-ic">🏭</div><div class="pipe-name">Warehouse</div><div class="pipe-sub">executes</div></div>
      </div>
      <p>The adapter wraps your compiled SQL in the right materialization DDL for the warehouse (MERGE vs insert_overwrite vs CREATE OR REPLACE), applies partition/cluster/dist clauses, and manages the connection. Swap the adapter, keep the model.</p>
    </div>
    <div class="detail-section">
      <h3>Keep dialect differences contained</h3>
      <div class="code-block" data-lang="sql">-- use cross-database macros instead of warehouse-specific SQL
{{ dbt_utils.date_trunc('day', 'order_ts') }}   -- not raw DATE_TRUNC
{{ dbt.type_timestamp() }}                        -- portable type name
-- adapter.dispatch lets a macro have per-adapter implementations</div>
      <p style="font-size:15px;font-weight:600;color:var(--accent)">dbt's portability is real but not free: standard models port cleanly, but incremental strategy, partitioning, and dialect functions are warehouse-specific. Isolate those in config and cross-database macros.</p>
    </div>
  `;
}

function escapeHtml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
