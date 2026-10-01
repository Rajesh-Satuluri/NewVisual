// M25 · Debugging Decision Tree
// A guided triage walker: start from what you observed and branch to the root
// cause, its classification, and the exact commands to confirm and fix it.
// Teaches the mental model senior engineers use, not a list of errors.
import { createModuleShell, createIQSection, injectCodeEnhancements } from '../components/module-shell.js';

// Tree: branch nodes have {q, options:[{label,next}]}; leaves have {leaf:true,...}
const TREE = {
  start: {
    q: 'Your dbt run failed. What did you actually observe?',
    options: [
      { label: 'An error BEFORE any SQL ran', next: 'preexec' },
      { label: 'A database/SQL error DURING a model', next: 'during' },
      { label: 'A test failed', next: 'test' },
      { label: 'No error — but the data is wrong or stale', next: 'wrong' },
      { label: 'Slow run / timeout / cost spike', next: 'slow' },
    ],
  },
  preexec: {
    q: 'Pre-execution errors are dbt-side (no warehouse credits spent). What does the message say?',
    options: [
      { label: 'Parsing Error / invalid Jinja or YAML', next: 'L_parse' },
      { label: "Compilation Error: ref() to a model that doesn't exist", next: 'L_badref' },
      { label: 'Compilation Error: undefined macro or variable', next: 'L_macro' },
      { label: 'Found a cycle in the DAG', next: 'L_cycle' },
    ],
  },
  during: {
    q: 'A SQL error during a model is usually transformation or warehouse. Which fits?',
    options: [
      { label: 'invalid identifier / column does not exist', next: 'L_column' },
      { label: 'division by zero / type mismatch', next: 'L_logic' },
      { label: 'object does not exist (a source/upstream relation)', next: 'L_source' },
      { label: 'permission denied / insufficient privileges', next: 'L_perm' },
    ],
  },
  test: {
    q: 'A test failed. Is the flagged value actually valid business data?',
    options: [
      { label: 'No — it is genuinely bad (null PK, dup, broken FK)', next: 'L_dataqual' },
      { label: 'Yes — it is a new legitimate value the test did not know about', next: 'L_teststale' },
    ],
  },
  wrong: {
    q: 'Wrong/stale data with no error. What is the shape of the problem?',
    options: [
      { label: 'An incremental model is missing recent/late rows', next: 'L_watermark' },
      { label: 'Numbers doubled / duplicated', next: 'L_fanout' },
      { label: 'A deleted source row still shows downstream', next: 'L_softdelete' },
      { label: 'Everything is stale — source never refreshed', next: 'L_source' },
    ],
  },
  slow: {
    q: 'Performance problem. What changed or stands out?',
    options: [
      { label: 'One model scans the full table every run', next: 'L_fullscan' },
      { label: 'A model times out after a long run', next: 'L_timeout' },
      { label: 'Cost/row-count suddenly spiked', next: 'L_spike' },
    ],
  },

  // ── Leaves ────────────────────────────────────────────────────────────────
  L_parse: leaf('Parsing error', 'parse', 'Malformed Jinja/YAML in a model or schema file — dbt cannot build the node graph.',
    'Read the file + line in the error. Fix the Jinja/YAML. Validate structure fast with parse.',
    'dbt parse\ndbt compile --select the_model'),
  L_badref: leaf('ref() to missing model', 'parse', "A ref() names a model dbt can't find — typo, wrong name, or the model isn't in the project.",
    'Check the exact model name and that the file exists. refs are resolved at parse time — fix is cheap, no warehouse touched.',
    'dbt ls --select the_model\ndbt parse'),
  L_macro: leaf('Compilation error: undefined macro/var', 'compile', 'A macro or var referenced in Jinja is not defined / not installed (missing package).',
    'Run deps if it is a package macro; define the var or pass --vars. Inspect the rendered SQL with compile.',
    'dbt deps\ndbt compile --select the_model\ndbt run --vars \'{"my_var": 1}\''),
  L_cycle: leaf('Cycle in the DAG', 'dependency', 'Two models ref() each other (directly or transitively). dbt refuses to order a cyclic graph.',
    'Trace the cycle in the error, break it by extracting shared logic into an upstream model both can ref.',
    'dbt ls --select +the_model'),
  L_column: leaf('invalid identifier / missing column', 'source|transform', 'A column the model selects does not exist — often an upstream/source schema change, or your own typo.',
    'Inspect the compiled SQL. If a source renamed the column, fix it in the thin staging model only; everything downstream refs the alias.',
    'cat target/compiled/.../the_model.sql\ndbt build --select the_model+'),
  L_logic: leaf('Divide-by-zero / type mismatch', 'transform', 'A logic bug in YOUR model SQL (unguarded denominator, bad cast).',
    'Guard with nullif()/safe casts. Inspect compiled SQL; add a unit test so the logic bug cannot recur.',
    'select x / nullif(y, 0) ...\ndbt build --select the_model'),
  L_source: leaf('Source missing / stale', 'source', 'The source object is absent or far older than allowed — the upstream load failed. dbt is right to refuse.',
    'Run freshness; re-trigger the loader; build only the affected lineage. Put freshness BEFORE build so this fails fast.',
    'dbt source freshness\ndbt build --select source:name+'),
  L_perm: leaf('Permission denied', 'warehouse', 'The dbt role lacks privileges on a schema/table — grants changed or the target is wrong.',
    'Check the active target and the role grants in the warehouse; fix grants or switch target. Not a dbt-logic problem.',
    'dbt debug   # confirms connection + target'),
  L_dataqual: leaf('Data-quality failure', 'data-quality', 'The data genuinely violates an assertion (null PK, duplicate, broken FK). The test did its job.',
    'Fix upstream data or the model (dedupe the fan-out, coalesce). Inspect failing rows with store_failures; keep the test.',
    'dbt test --select the_model\n-- query the compiled test SQL for the bad rows'),
  L_teststale: leaf('Test is out of date', 'data-quality', 'A legitimately new value (e.g. a new status) trips an accepted_values/enum test.',
    'Add the value to the test AND handle it in downstream CASE logic, in the same PR. Never just delete the test to go green.',
    "- accepted_values:\n    values: ['...', 'new_value']"),
  L_watermark: leaf('Incremental missed late data', 'data-quality', 'A strict high-watermark filter skips rows that arrive with older timestamps.',
    'Add a lookback window to the incremental predicate + a unique_key so re-processed rows upsert. See M21/M24.',
    "where updated_at > dateadd('day', -3, (select max(updated_at) from {{ this }}))"),
  L_fanout: leaf('Join fan-out (duplicates)', 'data-quality', 'A join to a non-unique dimension multiplied rows — the unique test on the PK catches it.',
    'Deduplicate the dimension (is_current = true, or the right surrogate key) before joining. Keep unique on the PK.',
    'join dim_customers c on o.customer_id = c.customer_id and c.is_current = true'),
  L_softdelete: leaf('Deleted source row lingers', 'data-quality', 'Incremental only adds/updates — it never removes a row hard-deleted in the source.',
    'Use soft-delete flags, a periodic full-refresh, or delete+insert by key. See M21.',
    'dbt run --select the_model --full-refresh   # resync if small enough'),
  L_fullscan: leaf('Full scan every run', 'performance', 'A big table materialized as a view, or an incremental missing its predicate, re-scans everything.',
    'Switch to incremental with a partition/cluster key and an incremental predicate; bound scans with a date filter. See M26.',
    "{{ config(materialized='incremental', cluster_by=['event_date']) }}"),
  L_timeout: leaf('Statement timeout', 'warehouse|performance', 'A query exceeds the statement timeout — usually a full scan, exploding join, or an under-sized warehouse.',
    'Find it in run_results (slowest node), read the query profile, fix the materialization/joins first, then consider upsizing.',
    "sort run_results.json by execution_time; inspect target/compiled SQL"),
  L_spike: leaf('Volume / cost spike', 'data-quality|performance', 'Row counts jumped — a double-load or a missing incremental predicate reprocessing everything.',
    'Confirm source counts; dedupe in staging; add a volume-anomaly test and spend alerts. See M24/M26.',
    'qualify row_number() over (partition by id order by _loaded_at desc) = 1'),
};

function leaf(title, cls, cause, fix, cmd) {
  return { leaf: true, title, cls, cause, fix, cmd };
}

const CLASS_COLOR = {
  parse: '#3B82F6', compile: '#3B82F6', dependency: '#06B6D4',
  'source': '#F59E0B', 'source|transform': '#F59E0B', transform: '#8B5CF6',
  warehouse: '#EF4444', 'warehouse|performance': '#EF4444',
  'data-quality': '#10B981', performance: '#EC4899', 'data-quality|performance': '#EC4899',
};

const IQ = [
  {
    q: 'Your scheduled dbt job failed overnight. Walk me through your first five minutes.',
    a: `<ol>
      <li><strong>Find the FIRST errored node</strong> in the logs — not the skips, which are downstream consequences.</li>
      <li><strong>Classify</strong> the first error: pre-execution (parse/compile, dbt-side), source (object/freshness), transformation (your SQL), data-quality (a test), or warehouse (timeout/permission).</li>
      <li><strong>Reproduce</strong> locally against the same target: <code>dbt build --select the_node</code>.</li>
      <li><strong>Inspect the compiled SQL</strong> (<code>target/compiled/</code>) — the error is in real SQL, not your Jinja.</li>
      <li><strong>Fix at the right layer</strong> and rebuild just the subgraph (<code>--select node+</code>); add a guard so it can\'t silently recur.</li>
    </ol>`,
    tip: '"First errored node, then classify, then compiled SQL" is the sequence that signals real on-call experience.',
  },
  {
    q: 'How do you tell a dbt-logic error from a warehouse error quickly?',
    a: `Timing in the pipeline and whether credits were spent.
    <ul>
      <li><strong>dbt-logic / pre-execution</strong> (parse, compile, bad ref, undefined macro): fails <em>before</em> any SQL runs — zero warehouse cost. The fix is in your project files.</li>
      <li><strong>Warehouse</strong> (timeout, OOM, permission, SQL compilation error from the DB): happens <em>during</em> execution, reported by the warehouse, recorded in run_results. The fix is grants, sizing, or materialization — not Jinja.</li>
    </ul>
    If it failed with no credits spent, it is dbt-side; if the warehouse complained mid-run, it is execution-side.`,
    tip: 'The "did it cost credits?" heuristic is a crisp, memorable way to bisect the problem — interviewers remember it.',
  },
  {
    q: 'A model is red in prod but you cannot reproduce it locally. What differs?',
    a: `Almost always <strong>environment</strong>: your local target (dev schema, your role, maybe <code>--defer</code> to prod) differs from the scheduled prod target. Check:
    <ul>
      <li><strong>Target/profile</strong>: different database/schema, role, or warehouse size (<code>dbt debug</code>).</li>
      <li><strong>Data</strong>: prod has volume/edge-cases dev doesn\'t; the failing row may not exist locally.</li>
      <li><strong>State</strong>: incremental <code>{{ this }}</code> points at a different existing table in prod.</li>
      <li><strong>Vars/env</strong>: a prod var or env var changes the compiled SQL.</li>
    </ul>
    Reproduce by running against the prod target (read-only) or with the same vars; compare the compiled SQL from each environment.`,
    tip: 'Jumping straight to "what\'s different about the environment and the compiled SQL" shows you understand dbt runs are environment-resolved, not absolute.',
  },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M25 · Production & Debugging',
    title: 'Debugging Decision Tree',
    subtitle: 'Start from what you saw and branch to the root cause, its class, and the commands to fix it.',
    tabs: [
      { id: 'tree',   label: '🌳 Triage Walker' },
      { id: 'detail', label: '📋 Error classes' },
      { id: 'iq',     label: '🎯 Interview Q&A' },
    ],
  });

  buildTree(container);
  buildDetail(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
}

function buildTree(container) {
  const tab = container.querySelector('#tab-tree');
  tab.innerHTML = `
    <p class="lab-intro">Debugging is classification. Answer what you observed and the walker narrows to the root
    cause — the exact reasoning path to rehearse for a "walk me through debugging" question.</p>
    <div class="dtree-path" id="m25-path"></div>
    <div class="stage-panel" id="m25-panel"></div>
    <div class="stage-nav">
      <button class="btn btn-secondary" id="m25-back">← Back</button>
      <button class="btn btn-ghost" id="m25-restart">↺ Start over</button>
    </div>
  `;
  const panel = tab.querySelector('#m25-panel');
  const pathEl = tab.querySelector('#m25-path');
  const backBtn = tab.querySelector('#m25-back');
  let stack = ['start'];

  function render() {
    const id = stack[stack.length - 1];
    const node = TREE[id];
    pathEl.innerHTML = stack.map((s, i) =>
      `<span class="dtree-crumb${i === stack.length - 1 ? ' current' : ''}">${crumbLabel(s)}</span>`).join('<span class="dtree-sep">›</span>');
    backBtn.disabled = stack.length === 1;

    if (node.leaf) {
      const color = CLASS_COLOR[node.cls] || 'var(--accent)';
      panel.style.setProperty('--panelColor', color);
      panel.innerHTML = `
        <div class="stage-panel-head">
          <span class="stage-panel-k" style="color:${color}">diagnosis · ${node.cls}</span>
          <span class="stage-panel-t">${node.title}</span>
        </div>
        <div class="stage-panel-body">
          <div class="mx-grid" style="margin-bottom:12px">
            <div class="mx-cell"><div class="mx-k">Root cause</div><div class="mx-v">${node.cause}</div></div>
            <div class="mx-cell"><div class="mx-k">Fix</div><div class="mx-v">${node.fix}</div></div>
          </div>
          <div class="mx-k" style="margin-bottom:6px">Confirm & fix</div>
          <div class="code-block" data-lang="bash">${escapeHtml(node.cmd)}</div>
        </div>`;
      injectCodeEnhancements(panel);
    } else {
      panel.style.setProperty('--panelColor', 'var(--accent)');
      panel.innerHTML = `
        <div class="stage-panel-head"><span class="stage-panel-t">${node.q}</span></div>
        <div class="lab-picker" style="margin:14px 0 0">
          ${node.options.map(o => `<button class="lab-chip" data-next="${o.next}">${o.label}</button>`).join('')}
        </div>`;
      panel.querySelector('.lab-picker').addEventListener('click', e => {
        const chip = e.target.closest('.lab-chip');
        if (chip) { stack.push(chip.dataset.next); render(); }
      });
    }
  }

  backBtn.addEventListener('click', () => { if (stack.length > 1) { stack.pop(); render(); } });
  tab.querySelector('#m25-restart').addEventListener('click', () => { stack = ['start']; render(); });
  render();
}

function crumbLabel(id) {
  if (id === 'start') return 'Start';
  const n = TREE[id];
  if (n.leaf) return n.title;
  return ({ preexec: 'Pre-exec', during: 'During SQL', test: 'Test fail', wrong: 'Wrong data', slow: 'Slow/cost' })[id] || id;
}

function buildDetail(container) {
  container.querySelector('#tab-detail').innerHTML = `
    <div class="detail-section">
      <h3>The nine error classes</h3>
      <div class="info-grid">
        <div class="info-card" style="border-left-color:#3B82F6"><div class="info-card-title">Parsing error</div><div class="info-card-body">Malformed Jinja/YAML. Pre-execution, dbt-side. <code>dbt parse</code>.</div></div>
        <div class="info-card" style="border-left-color:#3B82F6"><div class="info-card-title">Compilation error</div><div class="info-card-body">Undefined macro/var, bad ref. Pre-execution. <code>dbt compile</code>.</div></div>
        <div class="info-card" style="border-left-color:#06B6D4"><div class="info-card-title">Dependency error</div><div class="info-card-body">Cycle in the DAG, or missing ref target. Fix the graph.</div></div>
        <div class="info-card" style="border-left-color:#F59E0B"><div class="info-card-title">Source error</div><div class="info-card-body">Missing/stale source. Surfaces at staging or freshness. Owner: loader.</div></div>
        <div class="info-card" style="border-left-color:#8B5CF6"><div class="info-card-title">Transformation error</div><div class="info-card-body">Bad SQL/logic in your model. Inspect compiled SQL. Owner: you.</div></div>
        <div class="info-card" style="border-left-color:#10B981"><div class="info-card-title">Data-quality error</div><div class="info-card-body">A test failed. Data built but violates an assertion.</div></div>
        <div class="info-card" style="border-left-color:#EF4444"><div class="info-card-title">Warehouse error</div><div class="info-card-body">Timeout / OOM. Materialization or sizing problem.</div></div>
        <div class="info-card" style="border-left-color:#EF4444"><div class="info-card-title">Permission error</div><div class="info-card-body">Role lacks grants, or wrong target. <code>dbt debug</code>.</div></div>
        <div class="info-card" style="border-left-color:#EC4899"><div class="info-card-title">Performance issue</div><div class="info-card-body">Full scans, fan-out, cost spike. See M26.</div></div>
      </div>
    </div>
    <div class="detail-section">
      <h3>The two heuristics that cut diagnosis time</h3>
      <p style="font-size:15px;font-weight:600;color:var(--accent)">1) Find the FIRST errored node — skips are consequences. 2) Did it cost warehouse credits? No → dbt-side (parse/compile). Yes → execution-side (source/transform/warehouse).</p>
      <p>Classify first, fix second. The class tells you where to look, who owns it, and whether any compute was even spent.</p>
    </div>
  `;
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
