// M24 · Production Failure Simulator
// Ten real dbt production incidents. Pick one, then step through it the way an
// on-call data engineer would: symptom → error → investigation → root cause →
// fix → prevention, with the interview follow-up each one tends to trigger.
// This is the operational-depth module — the half of dbt you only learn by
// being paged at 2am.
import { createModuleShell, createIQSection } from '../components/module-shell.js';
import { injectCodeEnhancements } from '../components/module-shell.js';

const SCEN = [
  {
    id: 'source-down', icon: '🔌', title: 'Source table unavailable', sev: 'crit', sevLabel: 'Critical',
    symptom: 'The nightly <code>dbt build</code> fails almost immediately. Staging models that read a source error out; everything downstream is skipped.',
    error: `Database Error in model stg_payments (models/staging/stg_payments.sql)
  002003 (42S02): SQL compilation error:
  Object 'RAW.STRIPE.PAYMENTS' does not exist or not authorized.`,
    investigate: [
      'Confirm the scope: is it one source or all of them? (one → upstream load; all → connection/permissions).',
      'Check the loader (Fivetran/Airbyte/custom EL) — did last night\'s load into <code>raw.stripe</code> run?',
      'Run <code>dbt source freshness</code> to see which sources are stale or missing.',
      'Check warehouse grants — was the role\'s access to <code>raw.stripe</code> revoked?',
    ],
    commands: `dbt source freshness
dbt build --select source:stripe+   # just the affected lineage`,
    cause: 'The upstream ingestion job (Fivetran) failed overnight, so <code>raw.stripe.payments</code> was never created for today\'s partition. dbt is doing exactly what it should: refusing to build on a missing source rather than producing wrong numbers.',
    fix: 'Re-trigger the EL load for the source, confirm the table exists, then re-run only the affected subgraph with <code>dbt build --select source:stripe+</code>. Do <strong>not</strong> patch dbt — the failure is upstream.',
    fixCode: `# after the loader backfills raw.stripe.payments:
dbt build --select source:stripe+`,
    prevention: 'Add <code>source freshness</code> checks with <code>error_after</code> thresholds and run them <em>before</em> the transformation build, so a stale source fails fast with a clear "source is late" signal instead of a confusing mid-pipeline SQL error. Alert on the loader directly.',
    interview: 'Follow-up: "How do you distinguish a source failure from a transformation failure?" — Source failures surface at the staging layer as "object does not exist" / freshness errors and should block the run early; transformation failures are logic/SQL errors in your own models. Separating the two (freshness gate first) is what keeps on-call fast.',
  },
  {
    id: 'dup-pk', icon: '👥', title: 'Duplicate primary key', sev: 'high', sevLabel: 'High',
    symptom: 'Revenue on the exec dashboard is suddenly ~2× expected. No run failed — the numbers are just wrong.',
    error: `Failure in test unique_fct_orders_order_id (models/marts/schema.yml)
  Got 1,241 results, configured to fail if != 0
  -- 1,241 order_ids appear more than once`,
    investigate: [
      'The <code>unique</code> test on <code>order_id</code> is failing — a dup was introduced.',
      'Inspect the compiled test SQL and query the offending keys: which rows duplicated?',
      'Check the most recent change to <code>fct_orders</code> or its parents — a new join is the usual culprit.',
      'Confirm whether the dup is in the source or created by a fan-out join.',
    ],
    commands: `dbt test --select fct_orders
-- then run the compiled test SQL to see the duplicated keys
select order_id, count(*) from analytics.marts.fct_orders
group by 1 having count(*) > 1`,
    cause: 'A join to <code>dim_customers</code> was added, but the customer table has multiple rows per <code>customer_id</code> (SCD history). The join fanned out every order into one row per customer version — doubling revenue.',
    fix: 'Deduplicate the dimension to one row per key before joining (e.g. filter to <code>is_current = true</code>, or join on the surrogate key for the correct version). The <code>unique</code> test is doing its job — it caught the fan-out before the CEO did.',
    fixCode: `-- join to the CURRENT customer row only
join {{ ref('dim_customers') }} c
  on o.customer_id = c.customer_id
  and c.is_current = true`,
    prevention: 'Keep <code>unique</code> + <code>not_null</code> on every primary key, and add a <code>relationships</code> test on the FK. Run <code>dbt build</code> (not <code>run</code>) so the test gates downstream models — a fan-out never reaches the dashboard.',
    interview: 'Follow-up: "A unique test fails in CI — what are your options?" — Fix the data upstream, fix the join (dedupe the dimension), temporarily set <code>severity: warn</code> while investigating, or quarantine bad rows. Naming the warn/quarantine options shows production experience.',
  },
  {
    id: 'schema-change', icon: '🔀', title: 'Upstream schema change', sev: 'high', sevLabel: 'High',
    symptom: 'Staging model fails after a source system deploy. The column your model selects no longer exists.',
    error: `Database Error in model stg_orders
  invalid identifier 'ORDER_AMOUNT'
  -- source renamed order_amount -> gross_amount`,
    investigate: [
      'Read the error: a column reference is now invalid.',
      'Diff the source schema (catalog / information_schema) against what your staging model expects.',
      'Find who/what changed it — a source app release or a loader schema-drift setting.',
      'Assess blast radius: <code>dbt ls --select stg_orders+</code> to list everything downstream.',
    ],
    commands: `dbt ls --select stg_orders+        # downstream blast radius
dbt build --select stg_orders+ --full-refresh   # after the fix`,
    cause: 'The source team renamed <code>order_amount</code> to <code>gross_amount</code> without notice. Staging is the single place that references raw column names, so the break is localized there — exactly why a staging layer exists.',
    fix: 'Update the rename in the <strong>staging model only</strong> (<code>gross_amount as order_total</code>). Because every downstream model refs the staging alias, nothing else changes. Re-run the subgraph.',
    fixCode: `-- models/staging/stg_orders.sql
select
  id as order_id,
  gross_amount as order_total   -- was: order_amount
from {{ source('shop', 'orders') }}`,
    prevention: 'Adopt <strong>model contracts</strong> on the staging layer so an incompatible column type/name fails at build with a clear contract error, and enable loader schema-change alerts. A staging layer that aliases raw columns means one-line fixes instead of project-wide edits.',
    interview: 'Follow-up: "How do you make your project resilient to upstream schema changes?" — A thin staging layer that renames/casts raw columns (one place to fix), model contracts to fail loudly, and source freshness/schema alerts. Never reference raw tables directly from marts.',
  },
  {
    id: 'incremental-missed', icon: '⏳', title: 'Incremental model missed records', sev: 'high', sevLabel: 'High',
    symptom: 'A report is missing some of yesterday\'s orders. No error — the incremental model simply didn\'t pick up late-arriving rows.',
    error: `(no error — silent data loss)
Expected 514,000 orders for 2024-05-31; fct_orders has 511,840.`,
    investigate: [
      'Compare counts in <code>fct_orders</code> vs the source for the date in question.',
      'Read the incremental filter: is it <code>where updated_at > (select max(updated_at) from {{ this }})</code>?',
      'Check if source rows arrived with an <code>updated_at</code> earlier than the last-seen max (late/backdated events).',
      'Confirm no <code>unique_key</code> dedup is masking the issue.',
    ],
    commands: `-- rows that would be skipped by a naive high-watermark filter
select count(*) from raw.orders
where updated_at <= (select max(updated_at) from analytics.marts.fct_orders)
  and order_date = '2024-05-31'`,
    cause: 'The incremental filter uses a strict high-watermark on <code>updated_at</code>. Late-arriving records (ingested today but with yesterday\'s timestamp) fall below the watermark and are never processed — classic late-arriving-data loss.',
    fix: 'Add a lookback window so the filter re-scans a trailing period, and use <code>unique_key</code> so re-processed rows upsert instead of duplicating. Trade a little extra compute for correctness.',
    fixCode: `{{ config(materialized='incremental', unique_key='order_id') }}
{% if is_incremental() %}
  where updated_at > (
    select dateadd('day', -3, max(updated_at)) from {{ this }}
  )   -- 3-day lookback catches late arrivals; unique_key upserts
{% endif %}`,
    prevention: 'Always pair incremental high-watermarks with a <strong>lookback window</strong> sized to your worst-case lateness, and a <code>unique_key</code> for idempotent upserts. Add a reconciliation test comparing source vs model counts per day.',
    interview: 'Follow-up: "How do you handle late-arriving data in an incremental model?" — Lookback window on the incremental predicate + unique_key for idempotent merges, sized from observed lateness. A periodic <code>--full-refresh</code> or a reconciliation test backstops drift.',
  },
  {
    id: 'downstream-fail', icon: '⛓️', title: 'Downstream model failed (cascade)', sev: 'med', sevLabel: 'Medium',
    symptom: 'One mart model errors; several dashboards downstream show "skipped" and go stale. The failure is contained but wide.',
    error: `Database Error in model fct_revenue
  division by zero
  SKIP relation dashboard_revenue (depends on fct_revenue)
  SKIP relation dashboard_margin   (depends on fct_revenue)`,
    investigate: [
      'Identify the first errored node — skips are consequences, not causes.',
      'Read the actual SQL error on <code>fct_revenue</code> (division by zero).',
      'Inspect the compiled SQL to find the unguarded denominator.',
      'List what was skipped: <code>dbt ls --select fct_revenue+</code>.',
    ],
    commands: `dbt build --select fct_revenue+     # rebuild the failed node + children
# inspect the compiled query:
cat target/compiled/acme/models/marts/fct_revenue.sql`,
    cause: 'A new margin calculation divides by <code>units_sold</code>, which was zero for a product with no sales that day. The error aborts <code>fct_revenue</code>, and dbt correctly <em>skips</em> (does not run on stale/absent data) every downstream model.',
    fix: 'Guard the denominator with <code>nullif()</code> so zero yields NULL instead of an error, then rebuild the subgraph. The skip behavior is a feature — it prevented partial/garbage data from reaching dashboards.',
    fixCode: `select revenue / nullif(units_sold, 0) as revenue_per_unit
-- was: revenue / units_sold`,
    prevention: 'Defensive SQL on all divisions/ratios (<code>nullif</code>), plus tests on the inputs. Understand that dbt skipping downstream nodes on an upstream error is <em>intended</em> blast-radius containment, not an extra bug.',
    interview: 'Follow-up: "Why does dbt skip downstream models when one fails?" — To contain the blast radius: running children on missing/stale parent data would produce silently wrong results. You fix the root node and rebuild <code>node+</code>; the skips resolve themselves.',
  },
  {
    id: 'test-fail-ci', icon: '🚦', title: 'Test failure blocks the deploy', sev: 'med', sevLabel: 'Medium',
    symptom: 'A PR\'s CI job is red. The model builds fine, but an <code>accepted_values</code> test fails, blocking merge.',
    error: `Failure in test accepted_values_fct_orders_status (schema.yml)
  Got 1 result, configured to fail if != 0
  -- unexpected status value: 'returned'`,
    investigate: [
      'Read which test failed and the offending value (<code>status = \'returned\'</code>).',
      'Decide: is this a genuine data-quality bug, or a legitimate new business value?',
      'Check with the source/business owner whether "returned" is a new valid status.',
      'If valid, the test is now out of date; if invalid, the data is wrong.',
    ],
    commands: `dbt build --select fct_orders   # reproduce the CI failure locally`,
    cause: 'The orders system introduced a new <code>returned</code> status. The <code>accepted_values</code> test encodes the old enum, so it correctly flags an unmodeled value — the test caught a real change before it silently broke downstream CASE logic.',
    fix: 'If "returned" is valid: add it to the test\'s <code>values</code> list AND handle it in any downstream CASE expressions. If invalid: fix upstream. Don\'t just delete the test.',
    fixCode: `- accepted_values:
    values: ['pending','shipped','delivered','cancelled','returned']  # added`,
    prevention: 'Treat <code>accepted_values</code> as a contract with the source: when the enum legitimately grows, update the test and the downstream logic together in the same PR. Keep tests in CI gating merges — that red X is the system working.',
    interview: 'Follow-up: "A test fails in CI but the value is actually valid — now what?" — Update the test and any downstream logic that assumed the old enum, in one PR. The anti-pattern is deleting/disabling the test to go green, which removes the very guardrail that caught the change.',
  },
  {
    id: 'contract', icon: '📜', title: 'Model contract violation', sev: 'med', sevLabel: 'Medium',
    symptom: 'A build fails before executing SQL: a column\'s type no longer matches the model\'s declared contract.',
    error: `Compilation Error in model dim_customers
  This model has an enforced contract that failed.
  Column signup_date: expected DATE, got TIMESTAMP_NTZ`,
    investigate: [
      'Note this fails at build-time via the contract, not as a warehouse error.',
      'Diff the model\'s declared contract (schema.yml) against the actual produced types.',
      'Find what changed — a cast removed, or an upstream type drift.',
      'Decide whether consumers can accept the new type.',
    ],
    commands: `dbt build --select dim_customers   # contract enforced at build`,
    cause: 'An upstream change made <code>signup_date</code> a <code>TIMESTAMP</code>, but <code>dim_customers</code> has an enforced contract declaring it <code>DATE</code>. Because downstream consumers (and a BI tool) depend on that type, dbt refuses to publish a breaking change.',
    fix: 'Either cast back to the contracted type in the model (<code>cast(signup_date as date)</code>) if DATE is still correct, or — if the type genuinely must change — version the model / coordinate with consumers and update the contract deliberately.',
    fixCode: `select cast(signup_date as date) as signup_date   -- honor the contract`,
    prevention: 'Put contracts on every model that other teams or BI tools consume. A contract turns a silent, downstream-breaking type change into a loud, pre-publish build failure — moving the pain left to the author.',
    interview: 'Follow-up: "What problem do model contracts solve?" — They enforce a model\'s output schema (names, types, constraints) at build time, so a producer can\'t ship a breaking change to consumers unknowingly. Pair with model versioning for intentional breaking changes.',
  },
  {
    id: 'timeout', icon: '⏱️', title: 'Warehouse query timeout', sev: 'high', sevLabel: 'High',
    symptom: 'One model runs for 45 minutes then fails with a statement timeout; the whole nightly job blows its SLA.',
    error: `Database Error in model fct_events_enriched
  Statement reached its statement timeout limit of 3600s`,
    investigate: [
      'Find the slow node from <code>run_results.json</code> (sort by <code>execution_time</code>).',
      'Read the compiled SQL + the warehouse query profile — look for a full scan or exploding join.',
      'Check materialization: is a huge model a <code>view</code> being recomputed, or a full-refresh of an incremental?',
      'Check warehouse sizing and whether partition/cluster keys are used.',
    ],
    commands: `# slowest nodes from the last run
python -c "import json;r=json.load(open('target/run_results.json'));
print(sorted([(x['execution_time'],x['unique_id']) for x in r['results']])[-5:])"`,
    cause: 'A 2-billion-row events model was materialized as a <code>view</code> and joined without a partition filter, so every downstream query re-scanned the full history — eventually exceeding the statement timeout.',
    fix: 'Switch to an <strong>incremental</strong> materialization with a partition/cluster key and an incremental predicate so each run processes only new partitions. Add a date filter so scans are bounded.',
    fixCode: `{{ config(
    materialized='incremental',
    unique_key='event_id',
    cluster_by=['event_date']
) }}
{% if is_incremental() %}
  where event_date >= dateadd('day', -3, current_date)
{% endif %}`,
    prevention: 'Right-size materializations: incremental for big append-heavy tables, clustering/partitioning on the filter columns, and track <code>execution_time</code> from run_results to catch slow models before they hit the timeout.',
    interview: 'Follow-up: "A model keeps timing out — walk me through fixing it." — Find it via run_results, read the query profile for full scans/fan-out, then fix the materialization (view→incremental), add partition/cluster keys and incremental predicates, and only then consider a bigger warehouse. Architecture before brute force.',
  },
  {
    id: 'volume-spike', icon: '📈', title: 'Unexpected data volume spike', sev: 'med', sevLabel: 'Medium',
    symptom: 'The nightly run is 5× slower and warehouse spend spikes. No errors — just way more rows than normal.',
    error: `(no error — cost & latency anomaly)
raw.events row count: 2.1B today vs ~400M typical.`,
    investigate: [
      'Confirm the spike is real (source row counts) vs a duplicate load.',
      'Check whether a backfill, a bot event storm, or a double-ingestion caused it.',
      'Look for a missing incremental predicate causing a full reprocess.',
      'Check if a <code>--full-refresh</code> was triggered accidentally (see next scenario).',
    ],
    commands: `-- is the source genuinely bigger, or double-loaded?
select _loaded_at::date, count(*) from raw.events group by 1 order by 1 desc`,
    cause: 'A source bug double-emitted events for several hours, inflating <code>raw.events</code>. The incremental model dutifully processed them all, spiking both runtime and cost — and would have doubled event metrics downstream.',
    fix: 'Deduplicate in staging (<code>qualify row_number() ... = 1</code> on the natural key), and if the source double-load is confirmed, coordinate a clean re-load. Add a volume-anomaly test so the spike alerts instead of silently costing money.',
    fixCode: `-- staging dedup guards against double-loads
qualify row_number() over (
  partition by event_id order by _loaded_at desc
) = 1`,
    prevention: 'Add a <strong>row-count / volume anomaly test</strong> (e.g. dbt_utils or a singular test asserting today\'s count is within N× the trailing average), dedup in staging, and alert on warehouse spend. Volume anomalies should page you, not surprise you in the invoice.',
    interview: 'Follow-up: "How would you catch a data volume anomaly before it costs you?" — A test comparing today\'s row count to a trailing baseline, staging-level dedup on natural keys, and spend alerts. Defensive dedup means a double-load wastes compute but never corrupts metrics.',
  },
  {
    id: 'full-refresh', icon: '💥', title: 'Accidental full-refresh', sev: 'crit', sevLabel: 'Critical',
    symptom: 'An incremental model that normally takes 2 minutes ran for an hour and rebuilt from scratch; historical rows derived at load time changed.',
    error: `(no error — but fct_orders rebuilt 2B rows and
some derived columns differ from the original load)`,
    investigate: [
      'Check how the job was invoked — was <code>--full-refresh</code> passed, or <code>full_refresh: true</code> set in config?',
      'Confirm the table was dropped & recreated (not merged) from run_results timing.',
      'Assess damage: do any columns depend on load-time logic (e.g. <code>current_timestamp</code>, FX rates at load) that can\'t be reproduced historically?',
      'Check whether raw history is still available to rebuild correctly.',
    ],
    commands: `# the dangerous invocation to audit for:
dbt build --select fct_orders --full-refresh`,
    cause: 'A <code>--full-refresh</code> flag was left in a scheduled job (or a CI command copied into prod). The incremental model dropped and fully rebuilt. Any column computed from load-time context (snapshotted FX rate, ingestion timestamp) was recomputed with <em>today\'s</em> values, corrupting history.',
    fix: 'Restore the table from a warehouse time-travel / backup snapshot if available, then rebuild going forward with the correct incremental logic. Audit scheduled commands and remove the stray flag.',
    fixCode: `-- Snowflake time-travel restore, then resume incremental
create or replace table analytics.marts.fct_orders clone
  analytics.marts.fct_orders before (statement => '<last-good-query-id>');`,
    prevention: 'Never bake <code>--full-refresh</code> into scheduled production jobs. Protect load-time-derived columns by snapshotting the inputs (store the FX rate as a column) so a rebuild is reproducible. Guard prod runs behind reviewed job definitions.',
    interview: 'Follow-up: "Why can an accidental full-refresh be dangerous even with no error?" — Incremental tables can hold rows whose values depended on load-time context; a full rebuild recomputes them with current context, silently changing history. The fix is making rebuilds reproducible (snapshot inputs) and keeping the flag out of prod.',
  },
];

const STAGES = [
  { key: 'symptom',    label: 'Symptom',     color: '#F59E0B' },
  { key: 'error',      label: 'Error',       color: '#EF4444' },
  { key: 'investigate',label: 'Investigate', color: '#3B82F6' },
  { key: 'cause',      label: 'Root cause',  color: '#8B5CF6' },
  { key: 'fix',        label: 'Fix',         color: '#10B981' },
  { key: 'prevention', label: 'Prevent',     color: '#06B6D4' },
];

const IQ = [
  {
    q: 'Walk me through how you triage a failed production dbt run.',
    a: `A structured on-call answer:
    <ol>
      <li><strong>Find the first errored node</strong>, not the skips — downstream skips are consequences. Read <code>run_results.json</code> / logs.</li>
      <li><strong>Classify the failure:</strong> source (object/freshness) vs transformation (SQL/logic) vs test (data quality) vs warehouse (timeout/permission).</li>
      <li><strong>Inspect the compiled SQL</strong> (<code>target/compiled/…</code>) — the error is in real SQL, not your Jinja.</li>
      <li><strong>Fix at the right layer</strong> (upstream source, staging rename, model logic) and rebuild just the subgraph with <code>dbt build --select node+</code>.</li>
      <li><strong>Add a guard</strong> so it can\'t recur silently: a test, a freshness check, a contract, or a lookback window.</li>
    </ol>`,
    tip: 'Leading with "I find the first errored node, because skips are symptoms" immediately signals you\'ve actually been on-call for dbt.',
  },
  {
    q: 'Classify these four and say where each surfaces: source failure, data-quality failure, transformation failure, warehouse failure.',
    a: `<ul>
      <li><strong>Source failure</strong> — missing/stale source object; surfaces at the staging layer or via <code>dbt source freshness</code>. Fix upstream; gate with freshness checks.</li>
      <li><strong>Data-quality failure</strong> — a <code>test</code> fails (unique/not_null/accepted_values/relationships). The data built but is wrong; fix the data or the logic.</li>
      <li><strong>Transformation failure</strong> — a SQL/logic error in your own model (bad column, division by zero). Fix the model; inspect compiled SQL.</li>
      <li><strong>Warehouse failure</strong> — timeout, OOM, permission. Often a materialization/sizing problem, not a dbt-logic problem.</li>
    </ul>`,
    tip: 'The ability to put a given error in the right bucket is exactly what separates a 4-year engineer from a junior in these interviews.',
  },
  {
    q: 'Which of these failures should block the run early, and how do you make that happen?',
    a: `Source problems should block <strong>first</strong>, before any transformation runs, because building on missing/stale data wastes compute and produces confusing downstream errors.
    <br><br>Make it happen by running <code>dbt source freshness</code> as a gate with <code>error_after</code> thresholds <em>before</em> <code>dbt build</code>, and by using <code>dbt build</code> (not <code>run</code>) so model tests gate their own downstream children. Contracts move schema breaks to build-time. The theme: <strong>fail fast, fail cheap, contain the blast radius</strong>.`,
    tip: '"Fail fast, fail cheap, contain blast radius" is a crisp principle to name — it ties freshness gates, build-time contracts, and test gating into one philosophy.',
  },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M24 · Production & Debugging',
    title: 'Production Failure Simulator',
    subtitle: 'Ten real dbt incidents. Pick one and work it like on-call: symptom → root cause → fix → prevention.',
    tabs: [
      { id: 'sim',    label: '🚨 Incident Lab' },
      { id: 'detail', label: '📋 Failure taxonomy' },
      { id: 'iq',     label: '🎯 Interview Q&A' },
    ],
  });

  buildSim(container);
  buildDetail(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
}

function buildSim(container) {
  const tab = container.querySelector('#tab-sim');
  tab.innerHTML = `
    <p class="lab-intro">Each card is a real production incident. Step through it stage by stage — the way you'd
    actually debug it — and read the interview follow-up it tends to trigger.</p>
    <div class="lab-picker" id="m24-picker">
      ${SCEN.map((s, i) => `
        <button class="lab-chip ${i === 0 ? 'active' : ''}" data-i="${i}" title="${s.sevLabel}">
          <span class="lab-sev sev-${s.sev}"></span>${s.icon} ${s.title}
        </button>`).join('')}
    </div>
    <div class="stepper" id="m24-stepper"></div>
    <div class="stage-panel" id="m24-panel"></div>
    <div class="stage-nav">
      <button class="btn btn-secondary" id="m24-prev">← Back</button>
      <button class="btn btn-primary" id="m24-next">Next →</button>
    </div>
    <div class="ex-interview" id="m24-interview" style="margin-top:20px"></div>
  `;

  let si = 0, stage = 0;
  const stepperEl = tab.querySelector('#m24-stepper');
  const panelEl = tab.querySelector('#m24-panel');
  const ivEl = tab.querySelector('#m24-interview');
  const prevBtn = tab.querySelector('#m24-prev');
  const nextBtn = tab.querySelector('#m24-next');

  function body(s, st) {
    if (st.key === 'investigate') {
      return `<ul>${s.investigate.map(x => `<li>${x}</li>`).join('')}</ul>
        ${s.commands ? `<div class="code-block" data-lang="bash" style="margin-top:12px">${escapeHtml(s.commands)}</div>` : ''}`;
    }
    if (st.key === 'error') {
      return `<div class="code-block" data-lang="text">${escapeHtml(s.error)}</div>`;
    }
    if (st.key === 'fix') {
      return `<p>${s.fix}</p>${s.fixCode ? `<div class="code-block" data-lang="sql" style="margin-top:12px">${escapeHtml(s.fixCode)}</div>` : ''}`;
    }
    return `<p>${s[st.key]}</p>`;
  }

  function render() {
    const s = SCEN[si];
    stage = Math.max(0, Math.min(stage, STAGES.length - 1));
    const st = STAGES[stage];
    stepperEl.innerHTML = STAGES.map((x, i) =>
      `<button class="stepper-dot ${i === stage ? 'current' : (i < stage ? 'done' : '')}" data-i="${i}">
         <span class="stepper-num">${i + 1}</span>${x.label}
       </button>`).join('');
    panelEl.style.setProperty('--panelColor', st.color);
    panelEl.innerHTML = `
      <div class="stage-panel-head">
        <span class="stage-panel-k">${s.icon} ${s.title}</span>
        <span class="stage-panel-t" style="color:${st.color}">${st.label}</span>
      </div>
      <div class="stage-panel-body">${body(s, st)}</div>`;
    injectCodeEnhancements(panelEl);
    ivEl.innerHTML = `<span class="ex-iq-badge">Interview follow-up</span> ${s.interview}`;
    prevBtn.disabled = stage === 0;
    nextBtn.textContent = stage === STAGES.length - 1 ? '↺ Restart incident' : 'Next →';
  }

  tab.querySelector('#m24-picker').addEventListener('click', e => {
    const chip = e.target.closest('.lab-chip');
    if (!chip) return;
    tab.querySelectorAll('.lab-chip').forEach(c => c.classList.toggle('active', c === chip));
    si = Number(chip.dataset.i); stage = 0; render();
  });
  stepperEl.addEventListener('click', e => {
    const dot = e.target.closest('.stepper-dot');
    if (dot) { stage = Number(dot.dataset.i); render(); }
  });
  prevBtn.addEventListener('click', () => { stage--; render(); });
  nextBtn.addEventListener('click', () => {
    stage = stage === STAGES.length - 1 ? 0 : stage + 1; render();
  });

  render();
}

function buildDetail(container) {
  container.querySelector('#tab-detail').innerHTML = `
    <div class="detail-section">
      <h3>Every dbt failure fits one of four buckets</h3>
      <p>The fastest on-call engineers classify first, then fix. The bucket tells you <em>where</em> to look and <em>who</em> owns the fix.</p>
      <div class="info-grid">
        <div class="info-card" style="border-left-color:#3B82F6">
          <div class="info-card-title">Source failure</div>
          <div class="info-card-tag" style="color:#3B82F6;background:#3B82F622">Upstream</div>
          <div class="info-card-body">Missing/stale/zero-row source. Surfaces at staging or via <code>source freshness</code>. Owner: the loader / source team. Gate it early.</div>
        </div>
        <div class="info-card" style="border-left-color:#10B981">
          <div class="info-card-title">Data-quality failure</div>
          <div class="info-card-tag" style="color:#10B981;background:#10B98122">A test fails</div>
          <div class="info-card-body">Data built but is wrong (dup PK, bad enum, broken FK). Caught by tests. Fix the data or the logic — don't disable the test.</div>
        </div>
        <div class="info-card" style="border-left-color:#8B5CF6">
          <div class="info-card-title">Transformation failure</div>
          <div class="info-card-tag" style="color:#8B5CF6;background:#8B5CF622">Your SQL</div>
          <div class="info-card-body">Logic/SQL error in your model (bad column, divide-by-zero). Inspect compiled SQL. Owner: you.</div>
        </div>
        <div class="info-card" style="border-left-color:#EF4444">
          <div class="info-card-title">Warehouse failure</div>
          <div class="info-card-tag" style="color:#EF4444;background:#EF444422">Infra</div>
          <div class="info-card-body">Timeout, OOM, permission. Usually a materialization/sizing problem. Fix architecture before upsizing compute.</div>
        </div>
      </div>
    </div>
    <div class="detail-section">
      <h3>The operating principle</h3>
      <p style="font-size:15px;font-weight:600;color:var(--accent)">Fail fast, fail cheap, contain the blast radius.</p>
      <p>Freshness gates stop a run before it wastes compute on missing data. <code>dbt build</code> gates downstream models on tests. Contracts move schema breaks to build-time. Skipping downstream nodes on an error is intentional containment. Every prevention in these ten incidents is one of these ideas.</p>
    </div>
  `;
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
