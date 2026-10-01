// M21 · Incremental Strategies Lab
// m13 introduced "process only new rows". This lab goes deep on HOW: the five
// incremental strategies, the SQL each adapter emits, when to pick which, and
// the pitfalls that cause silent data bugs. Pairs with m24's incident deep-dives.
import { createModuleShell, createIQSection, injectCodeEnhancements } from '../components/module-shell.js';

const STRATEGIES = [
  {
    id: 'append', name: 'append', color: '#3B82F6',
    what: 'Insert new rows only. No update, no dedup — the fastest strategy.',
    when: 'Immutable event/log data that is never updated or re-sent (clickstream, append-only audit logs).',
    key: 'No unique_key needed.',
    support: 'All adapters.',
    sql: `-- adapter emits a plain INSERT
insert into analytics.events (…)
select … from {{ ref('stg_events') }}
where event_ts > (select max(event_ts) from {{ this }})`,
    warn: 'If the source ever re-sends a row, you get duplicates — there is no key to match on.',
    config: `{{ config(materialized='incremental', incremental_strategy='append') }}`,
  },
  {
    id: 'merge', name: 'merge', color: '#FF694B',
    what: 'Upsert: match on unique_key — update matched rows, insert new ones. The default on Snowflake/BigQuery/Databricks.',
    when: 'Mutable records that can change after first load (orders whose status updates, slowly-changing attributes).',
    key: 'Requires unique_key.',
    support: 'Snowflake, BigQuery, Databricks, Redshift (newer).',
    sql: `merge into analytics.fct_orders t
using ( <compiled select> ) s
  on t.order_id = s.order_id
when matched then update set …
when not matched then insert …;`,
    warn: 'A non-unique unique_key makes MERGE ambiguous → duplicates or non-deterministic updates. The key must truly be unique.',
    config: `{{ config(materialized='incremental',
    incremental_strategy='merge', unique_key='order_id') }}`,
  },
  {
    id: 'delete+insert', name: 'delete+insert', color: '#F59E0B',
    what: 'Delete rows matching the incoming keys, then insert the new batch. Two statements instead of a MERGE.',
    when: 'Warehouses/cases where MERGE is slow or unsupported, or when reprocessing whole partitions by key.',
    key: 'Requires unique_key (used for the delete match).',
    support: 'Snowflake, Redshift, Postgres, Spark.',
    sql: `delete from analytics.fct_orders
where order_id in (select order_id from <staged batch>);
insert into analytics.fct_orders select … from <staged batch>;`,
    warn: 'Not atomic on all warehouses — a failure between delete and insert can leave a gap. Prefer merge where MERGE is efficient.',
    config: `{{ config(materialized='incremental',
    incremental_strategy='delete+insert', unique_key='order_id') }}`,
  },
  {
    id: 'insert_overwrite', name: 'insert_overwrite', color: '#8B5CF6',
    what: 'Replace whole partitions: overwrite each partition present in the new batch, leave the rest untouched.',
    when: 'Large partitioned tables (by date) where you reprocess entire days — the most cost-efficient at scale on BigQuery/Spark.',
    key: 'Needs partition config, not necessarily a unique_key.',
    support: 'BigQuery, Spark/Databricks, Athena. (Not Snowflake-native.)',
    sql: `-- BigQuery: overwrite only the partitions in the batch
MERGE … WHEN NOT MATCHED BY SOURCE AND
  partition IN (dates in batch) THEN DELETE …
-- Spark: INSERT OVERWRITE PARTITION (dt)`,
    warn: 'A wrong partition filter can silently wipe or double a day. Always scope the batch to the exact partitions you mean to replace.',
    config: `{{ config(materialized='incremental',
    incremental_strategy='insert_overwrite',
    partition_by={'field':'order_date','data_type':'date'}) }}`,
  },
  {
    id: 'microbatch', name: 'microbatch', color: '#10B981',
    what: 'Split the load into independent time batches (e.g. per day) that dbt runs and can retry individually.',
    when: 'Very large time-series backfills, or when you want per-period retries and parallelism instead of one giant run.',
    key: 'Needs event_time + batch_size + lookback config.',
    support: 'dbt 1.9+ (adapter-dependent).',
    sql: `-- dbt runs one batch per period, each idempotent:
--   2024-05-29, 2024-05-30, 2024-05-31 …
-- a failed day can be re-run without touching the others`,
    warn: 'Newer feature — confirm your adapter supports it and set lookback to cover late arrivals for each batch.',
    config: `{{ config(materialized='incremental',
    incremental_strategy='microbatch',
    event_time='order_ts', batch_size='day', lookback=3) }}`,
  },
];

const PITFALLS = [
  ['Duplicate unique_key', 'The unique_key is not actually unique, so MERGE updates/inserts ambiguously. Fix: pick a truly unique key or build a surrogate key; add a unique test.'],
  ['Late-arriving data missed', 'A strict high-watermark skips rows that arrive with an older timestamp. Fix: add a lookback window on the incremental predicate + unique_key for idempotent upserts.'],
  ['Deleted source rows linger', 'Incremental only adds/updates — hard deletes in the source never remove the row downstream. Fix: soft-delete flags, periodic full-refresh, or delete+insert by key.'],
  ['Schema change breaks the merge', 'A new/renamed column mismatches the existing table. Fix: on_schema_change config (append_new_columns / sync_all_columns), or a planned full-refresh.'],
  ['Incorrect incremental filter', 'A wrong is_incremental() predicate silently processes too few or too many rows. Fix: test the filter; reconcile source-vs-model counts per period.'],
  ['Accidental full-refresh', 'A stray --full-refresh rebuilds history, recomputing load-time-derived columns with today\'s values. Fix: keep the flag out of prod jobs; snapshot load-time inputs.'],
];

const IQ = [
  {
    q: 'Compare merge vs insert_overwrite. When would you pick each?',
    a: `<strong>merge</strong> upserts row-by-row on a <code>unique_key</code> — update matched, insert new. Ideal for mutable records (orders whose status changes) where individual rows update. Default on Snowflake.
    <br><br><strong>insert_overwrite</strong> replaces whole <strong>partitions</strong> (usually by date). Ideal for large partitioned tables where you reprocess entire days — far cheaper at scale on BigQuery/Spark because it rewrites partitions instead of scanning for key matches.
    <br><br>Rule of thumb: row-level mutability → merge; partition-level reprocessing of big time-series → insert_overwrite.`,
    tip: 'Tie it to cost: "on a 2B-row BigQuery table, insert_overwrite rewrites just the affected date partitions; a merge would scan far more." Cost-awareness reads as senior.',
  },
  {
    q: 'How do you handle late-arriving data in an incremental model?',
    a: `A naive filter <code>where updated_at > (select max(updated_at) from {{ this }})</code> permanently skips any row that arrives with a timestamp below the current max.
    <br><br>Fix with two things together:
    <ul>
      <li><strong>Lookback window</strong>: <code>where updated_at > dateadd('day', -3, (select max(updated_at) from {{ this }}))</code> — re-scan a trailing period sized to your worst-case lateness.</li>
      <li><strong>unique_key</strong> (merge): reprocessed rows upsert instead of duplicating.</li>
    </ul>
    Microbatch with a lookback does this per batch. Back it with a reconciliation test comparing source vs model counts.`,
    tip: 'The key insight: lookback alone would duplicate rows — it only works safely WITH a unique_key for idempotent upserts. State both.',
  },
  {
    q: 'A source row was hard-deleted. Why does your incremental model still show it, and what do you do?',
    a: `Incremental strategies only <strong>add or update</strong> rows the filter selects — they never see a row that no longer exists in the source, so a hard delete is invisible and the stale row persists downstream.
    <br><br>Options: (1) ask the source for <strong>soft deletes</strong> (an <code>is_deleted</code> flag) and filter on it; (2) <strong>delete+insert</strong> by key if you reprocess whole partitions that would omit the deleted key; (3) a periodic <strong>full-refresh</strong> to resync; (4) a <strong>snapshot</strong> if you need the deletion history. Soft deletes are the clean long-term answer.`,
    tip: 'Naming "incremental is add/update only, it has no concept of a disappeared row" shows you understand the model, not just the config.',
  },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M21 · Selection & Incrementals',
    title: 'Incremental Strategies Lab',
    subtitle: 'The five strategies, the SQL each emits, when to pick which — and the pitfalls that cause silent data bugs.',
    tabs: [
      { id: 'strat',  label: '⏩ Strategies' },
      { id: 'detail', label: '📋 Full vs incremental · pitfalls' },
      { id: 'iq',     label: '🎯 Interview Q&A' },
    ],
  });

  buildStrategies(container);
  buildDetail(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
}

function buildStrategies(container) {
  const tab = container.querySelector('#tab-strat');
  tab.innerHTML = `
    <p class="lab-intro">Every incremental model picks a <strong>strategy</strong> — how new data is merged into the
    existing table. Choose one to see how it works, when to use it, and the SQL the adapter emits.</p>
    <div class="lab-picker" id="m21-pick">
      ${STRATEGIES.map((s, i) => `<button class="lab-chip ${i === 0 ? 'active' : ''}" data-i="${i}">
        <span class="lab-sev" style="background:${s.color}"></span>${s.name}</button>`).join('')}
    </div>
    <div class="stage-panel" id="m21-panel"></div>
  `;
  const panel = tab.querySelector('#m21-panel');

  function render(i) {
    const s = STRATEGIES[i];
    panel.style.setProperty('--panelColor', s.color);
    panel.innerHTML = `
      <div class="stage-panel-head">
        <span class="stage-panel-k" style="color:${s.color}">incremental_strategy</span>
        <span class="stage-panel-t">${s.name}</span>
      </div>
      <div class="stage-panel-body">
        <p>${s.what}</p>
        <div class="mx-grid" style="margin:14px 0">
          <div class="mx-cell"><div class="mx-k">When to use</div><div class="mx-v">${s.when}</div></div>
          <div class="mx-cell"><div class="mx-k">Unique key</div><div class="mx-v">${s.key}</div></div>
          <div class="mx-cell"><div class="mx-k">Adapter support</div><div class="mx-v">${s.support}</div></div>
        </div>
        <div class="mx-k" style="margin-bottom:6px">Config</div>
        <div class="code-block" data-lang="sql">${escapeHtml(s.config)}</div>
        <div class="mx-k" style="margin:12px 0 6px">SQL the adapter emits</div>
        <div class="code-block" data-lang="sql">${escapeHtml(s.sql)}</div>
        <div class="ex-interview" style="border-left-color:${s.color};background:${s.color}18;margin-top:14px">
          <span class="ex-iq-badge" style="color:${s.color}">Pitfall</span> ${s.warn}</div>
      </div>`;
    injectCodeEnhancements(panel);
  }

  tab.querySelector('#m21-pick').addEventListener('click', e => {
    const chip = e.target.closest('.lab-chip');
    if (!chip) return;
    tab.querySelectorAll('#m21-pick .lab-chip').forEach(c => c.classList.toggle('active', c === chip));
    render(Number(chip.dataset.i));
  });
  render(0);
}

function buildDetail(container) {
  container.querySelector('#tab-detail').innerHTML = `
    <div class="detail-section">
      <h3>Full refresh vs incremental — the whole point</h3>
      <div class="cmp-bars">
        <div class="cmp-bar">
          <div class="cmp-bar-label">Full refresh — reprocess everything</div>
          <div class="cmp-bar-track"><div class="cmp-bar-fill" style="width:100%;background:var(--error)">2,000,000,000 rows scanned</div></div>
          <div class="cmp-bar-sub">~40 min · full warehouse cost every run</div>
        </div>
        <div class="cmp-bar">
          <div class="cmp-bar-label">Incremental — process only new/changed</div>
          <div class="cmp-bar-track"><div class="cmp-bar-fill" style="width:4%;background:var(--success)">512K</div></div>
          <div class="cmp-bar-sub">~2 min · bounded cost per run <em>(simulated example)</em></div>
        </div>
      </div>
      <p>The first run (or <code>--full-refresh</code>) builds the whole table. Every run after processes only the slice the incremental predicate selects. The trade-off you manage is <strong>correctness vs cost</strong>: too tight a filter loses late data; too loose wastes compute.</p>
    </div>
    <div class="detail-section">
      <h3>The six incremental pitfalls</h3>
      <div class="info-grid">
        ${PITFALLS.map(([t, d]) => `
          <div class="info-card" style="border-left-color:#F59E0B">
            <div class="info-card-title">${t}</div>
            <div class="info-card-body">${d}</div>
          </div>`).join('')}
      </div>
      <p style="margin-top:14px">See <strong>M24 · Production Failure Simulator</strong> for full incident walkthroughs of the late-arriving and accidental-full-refresh cases.</p>
    </div>
    <div class="detail-section">
      <h3>on_schema_change — handling new columns</h3>
      <div class="code-block" data-lang="sql">{{ config(
    materialized='incremental',
    unique_key='order_id',
    on_schema_change='append_new_columns'  -- also: ignore | fail | sync_all_columns
) }}</div>
      <p style="font-size:15px;font-weight:600;color:var(--accent)">Incremental is a cost optimization, not a different result. If a run ever produces different numbers than a full refresh would, the incremental logic has a bug — reconcile with a periodic full-refresh or a count test.</p>
    </div>
  `;
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
