// Project Builder IDE — an editable, runnable mini dbt project in the browser.
//
// Edit the model SQL, then:
//   • Compile  — resolve ref()/source(), strip config() (pure JS, runs offline)
//   • Build    — compile every model, order by the ref() DAG, and CREATE each as
//                a view in DuckDB-WASM in dependency order (ACTUAL execution)
//   • Test     — parse schema.yml and run the generic tests as real SQL
//   • Preview  — SELECT * from any built model
//
// Honest labeling: Build and Test run for REAL against DuckDB-WASM (the same
// engine as the Coding Studio); Compile is a focused ref()/source() resolver.
// Nothing is sent anywhere — DuckDB runs sandboxed in a Web Worker in your tab.
import { createModuleShell, createIQSection, injectCodeEnhancements } from '../components/module-shell.js';
import { run, initEngine, engineStatus } from '../components/duckdb-engine.js';
import {
  compileSql, buildGraph, topoSort, layerOf, extractSources, genTestSql, parseSchemaTests,
} from '../components/ide-engine.js';

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ── Starter project — builds green against the Studio seed (raw_* tables) ─────
const STARTER = {
  'dbt_project.yml': { lang: 'yaml', body:
`name: 'jaffle_ide'
version: '1.0.0'
profile: 'jaffle_ide'

models:
  jaffle_ide:
    staging:
      +materialized: view
    marts:
      +materialized: view   # view here so it runs instantly in-browser`,
  },
  'models/staging/_sources.yml': { lang: 'yaml', body:
`version: 2

sources:
  - name: raw
    description: "Raw tables loaded by ingestion (here: the seeded DuckDB)."
    tables:
      - name: customers
      - name: orders
      - name: payments`,
  },
  'models/staging/stg_customers.sql': { lang: 'sql', body:
`{{ config(materialized='view') }}

select
    customer_id,
    name as customer_name,
    country,
    signup_date
from {{ source('raw', 'customers') }}`,
  },
  'models/staging/stg_orders.sql': { lang: 'sql', body:
`{{ config(materialized='view') }}

-- raw_orders double-loaded order 1004. Keep the latest row per order_id so the
-- grain is exactly one row per order (the unique test downstream depends on it).
with deduped as (
    select
        *,
        row_number() over (partition by order_id order by updated_at desc) as rn
    from {{ source('raw', 'orders') }}
)

select
    order_id,
    customer_id,
    status,
    order_date,
    updated_at
from deduped
where rn = 1`,
  },
  'models/marts/fct_orders.sql': { lang: 'sql', body:
`-- One row per order. Payments are rolled up to the order grain FIRST so an order
-- paid in two installments (1001) does not fan out and double-count revenue.
with orders as (
    select * from {{ ref('stg_orders') }}
),

customers as (
    select * from {{ ref('stg_customers') }}
),

payments as (
    select order_id, sum(amount) as amount_paid
    from {{ source('raw', 'payments') }}
    group by order_id
)

select
    o.order_id,
    o.customer_id,
    c.customer_name,
    c.country,
    o.status,
    o.order_date,
    coalesce(p.amount_paid, 0) as amount_paid
from orders o
left join customers c on o.customer_id = c.customer_id
left join payments p on o.order_id = p.order_id`,
  },
  'models/marts/schema.yml': { lang: 'yaml', body:
`version: 2

models:
  - name: fct_orders
    description: "Order fact — one row per order, with customer and amount paid."
    columns:
      - name: order_id
        description: "Primary key — one per order."
        tests:
          - unique
          - not_null
      - name: status
        tests:
          - accepted_values:
              values: ['completed', 'pending', 'cancelled']
      - name: customer_id
        tests:
          - relationships:
              to: ref('stg_customers')
              field: customer_id`,
  },
};

const FILE_ORDER = [
  'dbt_project.yml',
  'models/staging/_sources.yml',
  'models/staging/stg_customers.sql',
  'models/staging/stg_orders.sql',
  'models/marts/fct_orders.sql',
  'models/marts/schema.yml',
];
const ICON = { sql: '🔹', yml: '⚙️', yaml: '⚙️' };

const IQ = [
  {
    q: 'Walk me through what `dbt run` actually does with your models.',
    a: `dbt <strong>compiles</strong> each model — Jinja like <code>{{ ref('stg_orders') }}</code> and
      <code>{{ source('raw','orders') }}</code> is resolved to real relation names, and <code>config()</code> is
      read as metadata — then builds the <strong>dependency DAG</strong> from those <code>ref()</code>s,
      <strong>topologically orders</strong> it so every model runs after its parents, and executes each as a
      <code>create … as (&lt;compiled sql&gt;)</code> against the warehouse. This IDE does exactly that: Compile
      resolves the Jinja, the DAG is built from your refs, and Build issues the <code>CREATE VIEW</code>s in order
      against DuckDB.`,
    tip: 'Say the four steps in order — compile, build the DAG, topologically sort, execute per node. That sequence is the whole mental model.',
  },
  {
    q: 'Why does `ref()` matter more than just writing the table name?',
    a: `<code>ref()</code> does two jobs at once. It <strong>resolves</strong> to the correct, environment-specific
      relation (so the same code runs in dev, CI and prod), and it <strong>declares a dependency</strong> — that edge
      is what builds the DAG and lets dbt order the run and do state-based selection. Hard-code the table name and dbt
      has no idea one model depends on another, so ordering, lineage and Slim CI all break. In the IDE, deleting a
      <code>ref()</code> literally removes the edge and can make a model build before its parent exists.`,
    tip: 'Two words: resolution + dependency. ref() is simultaneously a pointer and a graph edge.',
  },
  {
    q: 'A `unique` test on `order_id` suddenly fails. How do you reason about it?',
    a: `A failing <code>unique</code> test means the model's <strong>grain</strong> is no longer one row per
      <code>order_id</code> — something duplicated rows. Usual causes: a source was double-loaded (exactly the 1004
      case here — remove the <code>row_number()</code> dedup and watch it fail), or a join <strong>fanned out</strong>
      (joining a table with multiple rows per key without aggregating first — like joining payments before rolling them
      up). You debug it by counting: <code>group by order_id having count(*) > 1</code> — which is precisely the SQL the
      test runs.`,
    tip: 'Map "unique fails" → "grain broke" → "double-load or join fan-out". Then show the group-by-having query.',
  },
  {
    q: 'What is the difference between Compile and Build here, and which is "real"?',
    a: `<strong>Compile</strong> is pure text resolution — it turns your templated SQL into warehouse SQL (resolving
      <code>ref()</code>/<code>source()</code>, stripping <code>config()</code>) and runs entirely in your browser with
      no database. <strong>Build</strong> takes that compiled SQL and <strong>executes</strong> it — real
      <code>CREATE VIEW</code> statements against DuckDB-WASM, in DAG order — and Test runs real SQL against the built
      views. So Compile is deterministic templating; Build/Test are genuine execution. dbt draws the same line:
      <code>dbt compile</code> writes compiled SQL to <code>target/</code> without touching the warehouse;
      <code>dbt run</code> executes it.`,
    tip: 'Compile = templating (no DB). Build/run = execution (hits the warehouse). Naming that boundary is the point of Module 18.',
  },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Practice · Build a Project',
    title: 'Project Builder IDE',
    subtitle: 'Edit a real multi-model dbt project, then Build it for real on DuckDB-WASM and watch the ref() DAG resolve, execute in order, and get tested — all in your browser.',
    tabs: [
      { id: 'ide', label: '🛠️ IDE' },
      { id: 'how', label: '📖 How it works' },
      { id: 'iq',  label: '🎯 Interview Q&A' },
    ],
  });

  buildIDE(container);
  buildHow(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
}

function buildIDE(container) {
  const tab = container.querySelector('#tab-ide');
  // deep copy the starter so Reset restores it
  let FILES = structuredClone(STARTER);
  let currentPath = 'models/marts/fct_orders.sql';
  const built = new Map();   // name -> { status, rows, error }

  const modelList = () => Object.keys(FILES)
    .filter(p => /^models\/.*\.sql$/.test(p))
    .map(p => ({ name: p.split('/').pop().replace(/\.sql$/, ''), sql: FILES[p].body, path: p }));

  const paths = () => FILE_ORDER.filter(p => FILES[p]).concat(Object.keys(FILES).filter(p => !FILE_ORDER.includes(p)));

  tab.innerHTML = `
    <div class="ide-banner">
      <span class="ide-exec">▶ Build &amp; Test — actual execution on DuckDB-WASM</span>
      <span class="ide-sep">·</span>
      <span class="ide-compile">⚙ Compile — ref()/source() resolved locally</span>
      <span class="ide-eng" id="ide-eng" data-state="idle">engine: loads on first Build</span>
    </div>

    <div class="ide-grid">
      <aside class="ide-tree" aria-label="Project files" id="ide-tree"></aside>
      <section class="ide-main">
        <div class="ide-editorhead">
          <span class="ide-fname" id="ide-fname"></span>
          <div class="ide-actions">
            <button class="btn btn-ghost" id="ide-compile" type="button" title="Resolve ref()/source() — no database">⚙ Compile</button>
            <button class="btn btn-ghost" id="ide-preview" type="button" title="SELECT * from this model">👁 Preview</button>
            <button class="btn btn-secondary" id="ide-test" type="button">✓ Test</button>
            <button class="btn btn-primary" id="ide-build" type="button">▶ Build</button>
            <button class="btn btn-ghost" id="ide-reset" type="button">↺ Reset</button>
          </div>
        </div>
        <textarea class="ide-editor" id="ide-editor" spellcheck="false" aria-label="Model editor. Press Escape then Tab to move focus out."></textarea>
      </section>
    </div>

    <div class="ide-lineage" id="ide-lineage">
      <div class="ide-lin-empty">Press <strong>▶ Build</strong> to compile the project, resolve the <code>ref()</code> DAG, and run it — the lineage and row counts appear here.</div>
    </div>

    <div class="ide-output" id="ide-output">
      <div class="ide-out-empty">Output appears here. Try <strong>⚙ Compile</strong> (works offline) to see the SQL dbt would run for the open model, then <strong>▶ Build</strong>.</div>
    </div>
  `;

  const $ = s => tab.querySelector(s);
  const treeEl = $('#ide-tree'), fnameEl = $('#ide-fname'), editor = $('#ide-editor');
  const outEl = $('#ide-output'), linEl = $('#ide-lineage'), engEl = $('#ide-eng');

  function setEng() {
    const { status, error } = engineStatus();
    const map = {
      idle: 'engine: loads on first Build',
      loading: 'engine: loading DuckDB-WASM…',
      ready: 'engine: ready ✓ (real DuckDB)',
      error: 'engine: unavailable — ' + (error || 'offline') + '. Compile still works offline.',
    };
    engEl.textContent = map[status] || '';
    engEl.dataset.state = status;
  }

  function renderTree() {
    const byDir = new Map();
    for (const p of paths()) {
      const dir = p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '';
      if (!byDir.has(dir)) byDir.set(dir, []);
      byDir.get(dir).push(p);
    }
    let html = '';
    for (const [dir, files] of byDir) {
      if (dir) html += `<div class="ide-dir">📁 ${esc(dir)}/</div>`;
      html += files.map(p => {
        const name = p.split('/').pop();
        const ext = name.split('.').pop();
        const isModel = /^models\/.*\.sql$/.test(p);
        const b = isModel ? built.get(name.replace(/\.sql$/, '')) : null;
        const dot = b ? `<span class="ide-tdot ide-${b.status}"></span>` : '';
        return `<div class="ide-tfile ${p === currentPath ? 'active' : ''}" data-path="${esc(p)}" role="button" tabindex="0" style="--pad:${dir ? 16 : 6}px">
          <span class="ide-tico">${ICON[ext] || '📄'}</span><span class="ide-tname">${esc(name)}</span>${dot}</div>`;
      }).join('');
    }
    treeEl.innerHTML = html;
  }

  function openFile(p) {
    // persist current edits first (but not on the initial open, where the editor
    // is still empty and currentPath already equals p — that would wipe the file)
    if (FILES[currentPath] && currentPath !== p) FILES[currentPath].body = editor.value;
    currentPath = p;
    fnameEl.textContent = p;
    editor.value = FILES[p].body;
    renderTree();
  }

  function saveEditor() { if (FILES[currentPath]) FILES[currentPath].body = editor.value; }

  // ── Compile (offline) ──────────────────────────────────────────────────────
  function doCompile() {
    saveEditor();
    if (!/^models\/.*\.sql$/.test(currentPath)) {
      outEl.innerHTML = `<div class="ide-out-head">⚙ Compile</div>
        <div class="ide-note">Compile applies to a model (a <code>.sql</code> file under <code>models/</code>). Open one — like <code>fct_orders.sql</code> — to see its compiled SQL.</div>`;
      return;
    }
    const name = currentPath.split('/').pop().replace(/\.sql$/, '');
    const compiled = compileSql(FILES[currentPath].body, name);
    outEl.innerHTML = `<div class="ide-out-head">⚙ Compiled SQL for <code>${esc(name)}</code>
      <span class="ide-tag ide-tag-local">resolved locally — ref()/source() → relations, config() stripped</span></div>
      <div class="code-block" data-lang="sql">${esc(compiled)}</div>`;
    injectCodeEnhancements(outEl);
  }

  // ── Build (real DuckDB) ─────────────────────────────────────────────────────
  async function doBuild() {
    saveEditor();
    const models = modelList();
    built.clear();
    const g = buildGraph(models);
    if (g.unknownRefs.length) {
      outEl.innerHTML = `<div class="ide-out-head">▶ Build — compilation error</div>` +
        g.unknownRefs.map(u => `<div class="ide-err">Model <code>${esc(u.model)}</code> references <code>ref('${esc(u.ref)}')</code>, which is not a model in this project. dbt raises a compilation error here.</div>`).join('');
      renderTree(); return;
    }
    const { order, cycle } = topoSort(models);
    if (cycle.length) {
      outEl.innerHTML = `<div class="ide-out-head">▶ Build — circular dependency</div>
        <div class="ide-err">These models form a <strong>dependency cycle</strong> (each ref()s another, directly or indirectly): ${cycle.map(c => `<code>${esc(c)}</code>`).join(' ↔ ')}. dbt cannot order a cycle — break it.</div>`;
      renderTree(); return;
    }

    outEl.innerHTML = `<div class="ide-out-head">▶ Build — running…</div><div class="ide-running">Loading the engine and executing ${order.length} models in DAG order…</div>`;
    setEng();
    try { await initEngine(); } catch (e) {
      setEng();
      outEl.innerHTML = `<div class="ide-out-head">▶ Build — engine unavailable</div>
        <div class="ide-note">DuckDB-WASM could not load (${esc(engineStatus().error || 'offline')}). Build and Test need it, but <strong>⚙ Compile</strong> still works offline so you can see the resolved SQL.</div>`;
      return;
    }
    // drop prior views so renames/removals don't linger
    for (const m of models) { try { await run(`drop view if exists "${m.name}"`); } catch {} }

    const log = [];
    for (const name of order) {
      const m = models.find(x => x.name === name);
      const ups = [...g.deps.get(name)];
      if (ups.some(u => built.get(u)?.status !== 'built')) {
        built.set(name, { status: 'skipped' });
        log.push({ name, status: 'skipped', detail: `skipped — upstream ${ups.filter(u => built.get(u)?.status !== 'built').map(u => `"${u}"`).join(', ')} did not build` });
        continue;
      }
      const compiled = compileSql(m.sql, name);
      try {
        await run(`create or replace view "${name}" as\n${compiled}`);
        const cnt = await run(`select count(*) as n from "${name}"`);
        const rows = cnt.rows[0][0];
        built.set(name, { status: 'built', rows });
        log.push({ name, status: 'built', detail: `${rows} row${rows === 1 ? '' : 's'}` });
      } catch (err) {
        built.set(name, { status: 'error', error: err.message || String(err) });
        log.push({ name, status: 'error', detail: err.message || String(err) });
      }
    }
    setEng();
    renderTree();
    renderLineage(models);
    const ok = log.filter(l => l.status === 'built').length;
    const bad = log.filter(l => l.status === 'error').length;
    const skip = log.filter(l => l.status === 'skipped').length;
    outEl.innerHTML = `<div class="ide-out-head">▶ Build complete
        <span class="ide-tag ide-tag-exec">actual execution · DuckDB-WASM</span></div>
      <div class="ide-buildsum">${ok} built${bad ? ` · <span class="ide-c-err">${bad} error</span>` : ''}${skip ? ` · ${skip} skipped` : ''}</div>
      <div class="ide-log">${log.map(l => `
        <div class="ide-log-row ide-${l.status}">
          <span class="ide-log-ico"></span>
          <span class="ide-log-name">${esc(l.name)}</span>
          <span class="ide-log-detail">${l.status === 'error' ? esc(l.detail) : l.detail}</span>
        </div>`).join('')}</div>
      <div class="ide-hint">Open any built model and press <strong>👁 Preview</strong> to see its rows, or <strong>✓ Test</strong> to run the schema tests.</div>`;
  }

  // ── Preview (real DuckDB) ───────────────────────────────────────────────────
  async function doPreview() {
    saveEditor();
    if (!/^models\/.*\.sql$/.test(currentPath)) {
      outEl.innerHTML = `<div class="ide-out-head">👁 Preview</div><div class="ide-note">Open a model (<code>.sql</code> under <code>models/</code>) to preview its rows.</div>`;
      return;
    }
    const name = currentPath.split('/').pop().replace(/\.sql$/, '');
    if (built.get(name)?.status !== 'built') {
      outEl.innerHTML = `<div class="ide-out-head">👁 Preview <code>${esc(name)}</code></div><div class="ide-note"><code>${esc(name)}</code> is not built yet. Press <strong>▶ Build</strong> first.</div>`;
      return;
    }
    outEl.innerHTML = `<div class="ide-out-head">👁 Preview <code>${esc(name)}</code> — running…</div>`;
    try {
      const res = await run(`select * from "${name}" limit 100`);
      outEl.innerHTML = `<div class="ide-out-head">👁 <code>${esc(name)}</code>
        <span class="ide-tag ide-tag-exec">${res.rows.length} row${res.rows.length === 1 ? '' : 's'} · live from DuckDB</span></div>${resultTable(res)}`;
    } catch (err) {
      outEl.innerHTML = `<div class="ide-out-head">👁 Preview error</div><div class="ide-err">${esc(err.message || err)}</div>`;
    }
  }

  // ── Test (real DuckDB) ──────────────────────────────────────────────────────
  async function doTest() {
    saveEditor();
    // collect tests from every schema yml
    let tests = [];
    let parseErr = null;
    for (const p of Object.keys(FILES)) {
      if (!/\.ya?ml$/.test(p)) continue;
      if (!/models:/.test(FILES[p].body)) continue;
      const r = parseSchemaTests(FILES[p].body);
      if (r.error) parseErr = `${p}: ${r.error}`;
      tests = tests.concat(r.tests);
    }
    if (parseErr) { outEl.innerHTML = `<div class="ide-out-head">✓ Test — schema.yml parse error</div><div class="ide-err">${esc(parseErr)}</div>`; return; }
    if (!tests.length) { outEl.innerHTML = `<div class="ide-out-head">✓ Test</div><div class="ide-note">No column tests found. Add <code>tests:</code> under a column in <code>schema.yml</code>.</div>`; return; }

    outEl.innerHTML = `<div class="ide-out-head">✓ Test — running ${tests.length}…</div><div class="ide-running">Executing generic tests as SQL against the built models…</div>`;
    setEng();
    try { await initEngine(); } catch (e) {
      setEng();
      outEl.innerHTML = `<div class="ide-out-head">✓ Test — engine unavailable</div><div class="ide-note">Tests execute real SQL and need DuckDB-WASM (${esc(engineStatus().error || 'offline')}).</div>`;
      return;
    }

    const results = [];
    for (const { model, column, test } of tests) {
      const gen = genTestSql(model, column, test);
      if (gen.unsupported) { results.push({ ...gen, model, column, status: 'skip', msg: `test "${gen.kind}" not supported in this IDE` }); continue; }
      if (built.get(model)?.status !== 'built') { results.push({ ...gen, model, column, status: 'error', msg: `model "${model}" is not built — press Build first` }); continue; }
      try {
        const res = await run(gen.sql);
        const failures = Number(res.rows[0][0]) || 0;
        results.push({ ...gen, model, column, status: failures === 0 ? 'pass' : 'fail', failures });
      } catch (err) {
        results.push({ ...gen, model, column, status: 'error', msg: err.message || String(err) });
      }
    }
    setEng();
    const pass = results.filter(r => r.status === 'pass').length;
    const fail = results.filter(r => r.status === 'fail').length;
    const other = results.length - pass - fail;
    outEl.innerHTML = `<div class="ide-out-head">✓ Test complete
        <span class="ide-tag ide-tag-exec">actual execution · DuckDB-WASM</span></div>
      <div class="ide-buildsum">${pass} passed${fail ? ` · <span class="ide-c-err">${fail} failed</span>` : ''}${other ? ` · ${other} skipped/error` : ''}</div>
      <div class="ide-log">${results.map(r => `
        <div class="ide-test-row ide-t-${r.status}">
          <span class="ide-log-ico"></span>
          <span class="ide-log-name">${esc(r.kind)}</span>
          <span class="ide-log-target"><code>${esc(r.model)}.${esc(r.column)}</code></span>
          <span class="ide-log-detail">${r.status === 'pass' ? 'PASS' : r.status === 'fail' ? `FAIL — ${r.failures} failing row${r.failures === 1 ? '' : 's'}` : esc(r.msg || r.status)}</span>
        </div>`).join('')}</div>
      <div class="ide-hint">A test passes when its failing-row query returns 0. Break the model (e.g. remove the dedup in <code>stg_orders</code>) and re-run to watch <code>unique</code> fail.</div>`;
  }

  function resultTable(res) {
    if (!res.columns.length) return '<div class="ide-note">(no columns)</div>';
    const head = res.columns.map(c => `<th>${esc(c)}</th>`).join('');
    const body = res.rows.slice(0, 100).map(r => `<tr>${r.map(c => `<td>${c == null ? '<span class="ide-null">NULL</span>' : esc(c)}</td>`).join('')}</tr>`).join('');
    return `<div class="ide-table-scroll"><table class="ide-result"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
  }

  // ── Lineage strip ───────────────────────────────────────────────────────────
  function renderLineage(models) {
    const layer = layerOf(models);
    const maxL = Math.max(0, ...[...layer.values()]);
    // sources column
    const srcs = new Set();
    for (const m of models) for (const [s, n] of extractSources(m.sql)) srcs.add(`${s}.${n}`);
    const cols = [];
    cols.push(`<div class="ide-lin-col">
      <div class="ide-lin-coltitle">sources</div>
      ${[...srcs].sort().map(s => `<div class="ide-node ide-src"><span class="ide-node-dot"></span><span class="ide-node-name">${esc(s)}</span></div>`).join('') || '<div class="ide-node ide-src">—</div>'}
    </div>`);
    for (let L = 0; L <= maxL; L++) {
      const inLayer = models.filter(m => layer.get(m.name) === L).map(m => m.name).sort();
      cols.push(`<div class="ide-lin-col">
        <div class="ide-lin-coltitle">${L === maxL && maxL > 0 ? 'marts' : (L === 0 ? 'staging' : 'layer ' + L)}</div>
        ${inLayer.map(name => {
          const b = built.get(name) || {};
          const meta = b.status === 'built' ? `${b.rows} rows` : (b.status || '');
          return `<div class="ide-node ide-${b.status || 'pending'}">
            <span class="ide-node-dot"></span>
            <span class="ide-node-name">${esc(name)}</span>
            <span class="ide-node-meta">${esc(meta)}</span></div>`;
        }).join('')}
      </div>`);
    }
    linEl.innerHTML = `<div class="ide-lin-title">Lineage &amp; build status <span class="ide-lin-sub">left → right = ref() dependency order</span></div>
      <div class="ide-lin-flow">${cols.join('<div class="ide-lin-arrow">→</div>')}</div>`;
  }

  // ── wire ────────────────────────────────────────────────────────────────────
  treeEl.addEventListener('click', e => { const f = e.target.closest('.ide-tfile'); if (f) openFile(f.dataset.path); });
  treeEl.addEventListener('keydown', e => { const f = e.target.closest('.ide-tfile'); if (f && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openFile(f.dataset.path); } });
  $('#ide-compile').addEventListener('click', doCompile);
  $('#ide-build').addEventListener('click', doBuild);
  $('#ide-test').addEventListener('click', doTest);
  $('#ide-preview').addEventListener('click', doPreview);
  $('#ide-reset').addEventListener('click', () => {
    FILES = structuredClone(STARTER); built.clear();
    openFile('models/marts/fct_orders.sql');
    linEl.innerHTML = `<div class="ide-lin-empty">Press <strong>▶ Build</strong> to compile the project, resolve the <code>ref()</code> DAG, and run it.</div>`;
    outEl.innerHTML = `<div class="ide-out-empty">Project reset to the starter. Try <strong>⚙ Compile</strong>, then <strong>▶ Build</strong>.</div>`;
  });
  let tabTraps = true;
  editor.addEventListener('focus', () => { tabTraps = true; });
  editor.addEventListener('input', saveEditor);
  editor.addEventListener('keydown', ev => {
    if ((ev.ctrlKey || ev.metaKey) && ev.key === 'Enter') { ev.preventDefault(); doBuild(); return; }
    if (ev.key === 'Escape') { tabTraps = false; return; }
    if (ev.key === 'Tab' && tabTraps) { ev.preventDefault(); const s = editor.selectionStart, en = editor.selectionEnd; editor.value = editor.value.slice(0, s) + '  ' + editor.value.slice(en); editor.selectionStart = editor.selectionEnd = s + 2; }
  });

  // init
  openFile(currentPath);
  setEng();
  initEngine().then(setEng).catch(setEng);   // warm the engine in the background
}

function buildHow(container) {
  container.querySelector('#tab-how').innerHTML = `
    <div class="detail-section">
      <h3>What this IDE does — and what is real</h3>
      <div class="pipe" style="margin-bottom:16px">
        <div class="pipe-stage"><div class="pipe-ic">⚙️</div><div class="pipe-name">Compile</div><div class="pipe-sub">resolve ref()/source(), strip config() — in your browser</div></div>
        <div class="pipe-stage"><div class="pipe-ic">🕸️</div><div class="pipe-name">Build the DAG</div><div class="pipe-sub">edges from each ref()</div></div>
        <div class="pipe-stage"><div class="pipe-ic">🔢</div><div class="pipe-name">Topo-sort</div><div class="pipe-sub">parents before children</div></div>
        <div class="pipe-stage"><div class="pipe-ic">🗄️</div><div class="pipe-name">Execute</div><div class="pipe-sub">CREATE VIEW per node — real DuckDB</div></div>
      </div>
      <div class="mx-grid">
        <div class="mx-cell"><div class="mx-k">Compile — local</div><div class="mx-v">A focused resolver turns <code>{{ ref('stg_orders') }}</code> into the relation <code>stg_orders</code> and <code>{{ source('raw','orders') }}</code> into the seeded <code>raw_orders</code>, and strips <code>{{ config() }}</code>. Pure text, no database — it works even offline.</div></div>
        <div class="mx-cell"><div class="mx-k">Build — real execution</div><div class="mx-v">Every model's refs become DAG edges; the graph is topologically sorted so parents run first; each model is executed as <code>create or replace view … as (&lt;compiled sql&gt;)</code> against <strong>DuckDB-WASM</strong> in a sandboxed Web Worker. Row counts are real.</div></div>
        <div class="mx-cell"><div class="mx-k">Test — real execution</div><div class="mx-v"><code>schema.yml</code> is parsed and each generic test (<code>unique</code>, <code>not_null</code>, <code>accepted_values</code>, <code>relationships</code>) becomes a failing-row SQL query run against the built views. 0 failing rows = pass — exactly dbt's rule.</div></div>
        <div class="mx-cell"><div class="mx-k">Honest boundaries</div><div class="mx-v">This is a <strong>teaching</strong> engine: the Jinja resolver covers <code>ref()</code>/<code>source()</code>/<code>config()</code> (not full macros — see the Config Lab), and the warehouse is DuckDB, not Snowflake. The <em>mechanics</em> — DAG, ordering, execution, tests — are the real ones.</div></div>
      </div>
    </div>

    <div class="detail-section">
      <h3>Experiments that teach the most</h3>
      <div class="cheat-grid">
        <div class="cheat-card"><div class="cheat-head">🧪 Break the grain</div><div class="cheat-body">
          <div class="cheat-row"><div class="cheat-k">Remove the <code>row_number()</code> dedup in <code>stg_orders</code></div><div class="cheat-v">unique(order_id) fails — the double-loaded 1004 returns</div></div>
          <div class="cheat-row"><div class="cheat-k">Join <code>raw_payments</code> without the <code>group by</code></div><div class="cheat-v">order 1001 fans out — revenue double-counts</div></div>
        </div></div>
        <div class="cheat-card"><div class="cheat-head">🔗 Break the DAG</div><div class="cheat-body">
          <div class="cheat-row"><div class="cheat-k">Change a <code>ref()</code> to a name that doesn't exist</div><div class="cheat-v">compilation error — just like dbt parse</div></div>
          <div class="cheat-row"><div class="cheat-k">Make two models <code>ref()</code> each other</div><div class="cheat-v">circular dependency — dbt can't order it</div></div>
        </div></div>
        <div class="cheat-card"><div class="cheat-head">✅ Tighten quality</div><div class="cheat-body">
          <div class="cheat-row"><div class="cheat-k">Add <code>not_null</code> on <code>amount_paid</code></div><div class="cheat-v">passes — coalesce guarantees it</div></div>
          <div class="cheat-row"><div class="cheat-k">Narrow <code>accepted_values</code> for <code>status</code></div><div class="cheat-v">fails when a real status is excluded</div></div>
        </div></div>
      </div>
    </div>

    <div class="detail-section">
      <p style="padding:12px 14px;background:var(--surface-2);border-left:3px solid var(--accent);border-radius:8px;font-size:14px;margin:0">
        <strong>🧠 First principles —</strong> a dbt project is just a set of <code>select</code>s tied together by
        <code>ref()</code>. Everything else — ordering, lineage, Slim CI, tests — falls out of that one graph. This IDE
        makes the graph executable so you can <em>feel</em> it: edit a model, watch the edge move, rebuild, and see the
        test catch what you broke. <a href="#m18" style="color:var(--accent);font-weight:600">Compile vs Execute (M18)</a>
        · <a href="#studio" style="color:var(--accent);font-weight:600">Coding Studio</a>.
      </p>
    </div>
  `;
}
