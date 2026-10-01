// M26 · Performance Lab
// Before/after optimization scenarios. Numbers are illustrative (labeled
// simulated) — the teaching is WHY each change helps, so you can reason about
// cost/latency in an interview rather than memorize benchmarks.
import { createModuleShell, createIQSection, injectCodeEnhancements } from '../components/module-shell.js';

const SCEN = [
  {
    id: 'view2incr', name: 'View → Incremental', color: '#FF694B',
    problem: 'A 2B-row events model is materialized as a view, so every downstream query re-scans the full history.',
    before: { t: '38 min', pct: 100, note: 'full scan of 2B rows every run' },
    after:  { t: '2 min',  pct: 5,   note: 'processes only new rows' },
    why: 'A view recomputes its full SELECT on every read. Switching to an incremental table means each run touches only new/changed rows via the incremental predicate — bounded compute instead of a full scan.',
    change: `{{ config(
    materialized='incremental',
    unique_key='event_id',
    cluster_by=['event_date']
) }}
{% if is_incremental() %}
  where event_date >= dateadd('day', -3, current_date)
{% endif %}`,
  },
  {
    id: 'partition', name: 'Add partition / cluster key', color: '#3B82F6',
    problem: 'A large fact table is filtered by date on every query, but has no partitioning — so the warehouse scans all partitions.',
    before: { t: '12 min', pct: 100, note: 'scans entire table for a 1-day filter' },
    after:  { t: '45 sec', pct: 6,   note: 'prunes to the needed partitions' },
    why: 'Partitioning/clustering on the filter column lets the warehouse prune: it reads only the partitions matching the WHERE clause. On BigQuery that is partition pruning; on Snowflake, clustering improves micro-partition elimination.',
    change: `-- BigQuery
{{ config(partition_by={'field':'order_date','data_type':'date'}) }}
-- Snowflake
{{ config(cluster_by=['order_date']) }}`,
  },
  {
    id: 'fanout', name: 'Fix exploding join', color: '#F59E0B',
    problem: 'A join to an SCD dimension (many rows per key) fans out the fact table, multiplying both rows and work.',
    before: { t: '9 min', pct: 100, note: '1 order → N customer-version rows' },
    after:  { t: '1.5 min', pct: 17, note: 'one row per order again' },
    why: 'The fan-out does not just corrupt numbers — it inflates row count, so every downstream step processes N× the data. Filtering the dimension to the current version (or the right surrogate key) restores grain AND cuts compute.',
    change: `join {{ ref('dim_customers') }} c
  on o.customer_id = c.customer_id
  and c.is_current = true   -- one row per key`,
  },
  {
    id: 'cte2ephemeral', name: 'Over-materialized views → right layer', color: '#8B5CF6',
    problem: 'A chain of 8 staging VIEWS is re-evaluated every time a mart reads them, repeating the same transformations.',
    before: { t: '15 min', pct: 100, note: 'nested views recomputed repeatedly' },
    after:  { t: '4 min',  pct: 27,  note: 'heavy steps materialized once as tables' },
    why: 'Views cost nothing to store but re-run on every read; deeply nested views recompute the same work many times. Materialize the expensive, reused intermediate layers as tables (or ephemeral where you want inlining) so the work happens once.',
    change: `-- the reused, expensive intermediate:
{{ config(materialized='table') }}
-- a light, single-use helper that should inline:
{{ config(materialized='ephemeral') }}`,
  },
  {
    id: 'slimci', name: 'Full CI build → state:modified+', color: '#10B981',
    problem: 'CI rebuilds all 2,000 models on every PR, even a one-line change — slow and expensive.',
    before: { t: '42 min', pct: 100, note: 'rebuilds the entire project' },
    after:  { t: '3 min',  pct: 7,   note: 'builds only changed + downstream' },
    why: 'State selection builds only what changed and its children; --defer resolves unchanged upstream refs to production. A one-model PR builds a handful of nodes instead of the whole warehouse. See M20.',
    change: `dbt build --select state:modified+ \\
  --defer --state prod-artifacts/`,
  },
  {
    id: 'incrpred', name: 'Fix inefficient incremental predicate', color: '#EC4899',
    problem: 'An incremental model\'s predicate does a correlated subquery per row instead of a single bounded range scan.',
    before: { t: '20 min', pct: 100, note: 'per-row max() lookups' },
    after:  { t: '3 min',  pct: 15,  note: 'single range filter + MERGE' },
    why: 'The incremental predicate runs on every incremental build; an inefficient one (row-by-row correlation, or no bound) dominates runtime. A single computed high-watermark with a lookback is one cheap scan.',
    change: `{% if is_incremental() %}
  where updated_at > (select max(updated_at) from {{ this }})
  -- compute the bound ONCE, don't correlate per row
{% endif %}`,
  },
];

const IQ = [
  {
    q: 'A model takes 40 minutes and keeps timing out. Walk me through optimizing it.',
    a: `Diagnose before changing anything:
    <ol>
      <li><strong>Find it</strong>: slowest node in <code>run_results.json</code> by <code>execution_time</code>.</li>
      <li><strong>Read the query profile</strong> + compiled SQL: full scan? exploding join? no partition pruning?</li>
      <li><strong>Fix the architecture first</strong>: view → incremental; add partition/cluster keys on the filter columns; fix fan-out joins; materialize reused intermediates as tables.</li>
      <li><strong>Only then</strong> consider a bigger warehouse — compute is the brute-force last resort, not the first move.</li>
    </ol>
    The theme: reduce the <em>work</em> (rows scanned, times recomputed) before you buy more compute.`,
    tip: '"Architecture before compute" is the line that separates a senior answer from "just upsize the warehouse."',
  },
  {
    q: 'When should a model be a view, a table, incremental, or ephemeral?',
    a: `<ul>
      <li><strong>view</strong> — cheap to store, recomputed on read. Good for light staging/transforms queried infrequently.</li>
      <li><strong>table</strong> — materialized once per run. Good for expensive logic reused by many downstream models (stop recomputing it).</li>
      <li><strong>incremental</strong> — table that processes only new/changed rows. Good for large, append/update-heavy facts where a full rebuild is too slow/costly.</li>
      <li><strong>ephemeral</strong> — not materialized at all; inlined as a CTE into its consumers. Good for small, single-use helpers you don\'t want cluttering the warehouse.</li>
    </ul>
    The decision is a cost trade-off: storage + build time vs recompute-on-read + query time.`,
    tip: 'Framing materialization as "where do you want to pay the cost — at build or at read?" shows you understand the trade-off, not just the keywords.',
  },
  {
    q: 'How do you find and control dbt/warehouse cost without guessing?',
    a: `Measure from artifacts, then target the top offenders:
    <ul>
      <li><strong>Per-model timing</strong>: persist <code>run_results.json</code> each run; sort by <code>execution_time</code>; model it (dbt-on-dbt) for trends.</li>
      <li><strong>Warehouse attribution</strong>: tag queries (query_tag / labels) by model so you can join dbt runs to warehouse cost/credit history.</li>
      <li><strong>Target the expensive few</strong>: a handful of models usually dominate cost — fix those (materialization, partitioning, incremental) rather than micro-optimizing everything.</li>
      <li><strong>Guard</strong>: Slim CI to avoid full rebuilds; volume-anomaly tests + spend alerts to catch spikes.</li>
    </ul>`,
    tip: 'Mentioning "persist run_results and build a dbt model on top of it" signals you have actually run cost analysis in production.',
  },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M26 · Production & Debugging',
    title: 'Performance Lab',
    subtitle: 'Before/after optimizations — and why each one helps. (Numbers are illustrative, not benchmarks.)',
    tabs: [
      { id: 'lab',    label: '🚀 Optimizations' },
      { id: 'detail', label: '📋 Performance principles' },
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
    <p class="lab-intro">Each card is a common dbt bottleneck with a before/after. Focus on the <strong>why</strong> —
    the numbers are illustrative examples, not real benchmarks.</p>
    <div class="lab-picker" id="m26-pick">
      ${SCEN.map((s, i) => `<button class="lab-chip ${i === 0 ? 'active' : ''}" data-i="${i}">
        <span class="lab-sev" style="background:${s.color}"></span>${s.name}</button>`).join('')}
    </div>
    <div class="stage-panel" id="m26-panel"></div>
  `;
  const panel = tab.querySelector('#m26-panel');

  function render(i) {
    const s = SCEN[i];
    panel.style.setProperty('--panelColor', s.color);
    panel.innerHTML = `
      <div class="stage-panel-head">
        <span class="stage-panel-k" style="color:${s.color}">optimization</span>
        <span class="stage-panel-t">${s.name}</span>
      </div>
      <div class="stage-panel-body">
        <p><strong>Problem:</strong> ${s.problem}</p>
        <div class="cmp-bars" style="margin:14px 0">
          <div class="cmp-bar">
            <div class="cmp-bar-label">Before — ${s.before.t}</div>
            <div class="cmp-bar-track"><div class="cmp-bar-fill" style="width:${s.before.pct}%;background:var(--error)">${s.before.t}</div></div>
            <div class="cmp-bar-sub">${s.before.note}</div>
          </div>
          <div class="cmp-bar">
            <div class="cmp-bar-label">After — ${s.after.t}</div>
            <div class="cmp-bar-track"><div class="cmp-bar-fill" style="width:${Math.max(s.after.pct,4)}%;background:var(--success)">${s.after.t}</div></div>
            <div class="cmp-bar-sub">${s.after.note} <em>(simulated example)</em></div>
          </div>
        </div>
        <div class="mx-k" style="margin-bottom:6px">Why it improves</div>
        <p style="margin-bottom:12px">${s.why}</p>
        <div class="mx-k" style="margin-bottom:6px">The change</div>
        <div class="code-block" data-lang="sql">${escapeHtml(s.change)}</div>
      </div>`;
    injectCodeEnhancements(panel);
  }

  tab.querySelector('#m26-pick').addEventListener('click', e => {
    const chip = e.target.closest('.lab-chip');
    if (!chip) return;
    tab.querySelectorAll('#m26-pick .lab-chip').forEach(c => c.classList.toggle('active', c === chip));
    render(Number(chip.dataset.i));
  });
  render(0);
}

function buildDetail(container) {
  container.querySelector('#tab-detail').innerHTML = `
    <div class="detail-section">
      <h3>Reduce the work before you buy compute</h3>
      <div class="info-grid">
        <div class="info-card" style="border-left-color:#FF694B"><div class="info-card-title">Right materialization</div><div class="info-card-body">view (recompute on read) vs table (compute once) vs incremental (only new rows) vs ephemeral (inline). Pick where to pay the cost.</div></div>
        <div class="info-card" style="border-left-color:#3B82F6"><div class="info-card-title">Partition & cluster</div><div class="info-card-body">On the columns you filter/join by, so the warehouse prunes instead of full-scanning.</div></div>
        <div class="info-card" style="border-left-color:#F59E0B"><div class="info-card-title">Fix the grain</div><div class="info-card-body">Fan-out joins inflate rows and compute. Dedupe dimensions; keep one row per key.</div></div>
        <div class="info-card" style="border-left-color:#10B981"><div class="info-card-title">Build less (Slim CI)</div><div class="info-card-body">state:modified+ --defer builds only what changed; don't rebuild 2,000 models for a one-line PR.</div></div>
        <div class="info-card" style="border-left-color:#EC4899"><div class="info-card-title">Efficient incremental predicate</div><div class="info-card-body">Compute the high-watermark once; avoid per-row correlated subqueries; bound the scan.</div></div>
        <div class="info-card" style="border-left-color:#8B5CF6"><div class="info-card-title">Measure from artifacts</div><div class="info-card-body">Sort run_results by execution_time; target the expensive few; tag queries to warehouse cost.</div></div>
      </div>
    </div>
    <div class="detail-section">
      <h3>The principle</h3>
      <p style="font-size:15px;font-weight:600;color:var(--accent)">Optimize the amount of work (rows scanned, times recomputed) before you optimize the compute you throw at it. A bigger warehouse hides the problem; better materialization and pruning remove it.</p>
      <p>Always diagnose from <code>run_results.json</code> and the query profile first — never guess which model is slow. See M19 for reading run_results and M20 for Slim CI.</p>
    </div>
  `;
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
