// M32 · Command Playground
// An interactive dbt command reference. Pick a command to see its purpose, a
// real example, what happens internally, the production use, and the common
// mistake. Plus the selectors/flags that modify every command — and a Terminal
// that SIMULATES a command against the sample project, with output derived from
// the real manifest graph (labeled simulated; the IDE does real execution).
import { createModuleShell, createIQSection, injectCodeEnhancements } from '../components/module-shell.js';
import { buildArtifacts } from '../data/manifest-gen.js';

const GROUPS = [
  {
    name: 'Project lifecycle', color: '#3B82F6', cmds: [
      { c: 'dbt init', purpose: 'Scaffold a new dbt project (folders, dbt_project.yml, sample models).', ex: 'dbt init acme', internal: 'Creates the project skeleton and a profiles.yml stub; no warehouse contact.', prod: 'One-time, local. Prod projects live in git from here.', mistake: 'Committing profiles.yml with credentials — it belongs outside the repo / in env vars.' },
      { c: 'dbt debug', purpose: 'Validate the connection, profile, and dependencies.', ex: 'dbt debug --target prod', internal: 'Resolves the target, opens a test connection, checks required packages.', prod: 'First thing to run when a scheduled job can’t connect.', mistake: 'Ignoring it and blaming models when the real issue is a bad target/credential.' },
      { c: 'dbt deps', purpose: 'Install packages from packages.yml (dbt_utils, etc.).', ex: 'dbt deps', internal: 'Clones/downloads packages into dbt_packages/.', prod: 'Runs at the start of every CI/prod job before build.', mistake: 'Forgetting it in CI → “macro not found” errors for package macros.' },
      { c: 'dbt clean', purpose: 'Delete target/ and dbt_packages/ (the configured clean paths).', ex: 'dbt clean', internal: 'Removes generated artifacts/compiled SQL; next run regenerates them.', prod: 'Use to clear stale artifacts when debugging weird compile issues.', mistake: 'Expecting it to touch the warehouse — it only deletes local folders.' },
    ],
  },
  {
    name: 'Build & run', color: '#FF694B', cmds: [
      { c: 'dbt run', purpose: 'Compile and materialize models on the warehouse.', ex: 'dbt run --select fct_orders+', internal: 'Parse → manifest → DAG → compile → adapter → execute. Does NOT run tests/seeds/snapshots.', prod: 'Rarely alone in prod — prefer build so tests gate.', mistake: 'Using run in prod and never running the tests that would catch bad data.' },
      { c: 'dbt build', purpose: 'Run models + tests + seeds + snapshots together in DAG order, gating children on tests.', ex: 'dbt build --select state:modified+', internal: 'Interleaves each model with its tests; a failed test skips that model’s downstream.', prod: 'The production-safe deploy command.', mistake: 'Not realizing a failed test skips downstream — then wondering why models are “missing”.' },
      { c: 'dbt test', purpose: 'Run data tests against materialized models.', ex: 'dbt test --select fct_orders', internal: 'Compiles each test to SQL that returns failing rows; 0 rows = pass.', prod: 'As a separate phase after run, or (better) inline via build.', mistake: 'Running test before the models are built — tests query tables that don’t exist yet.' },
      { c: 'dbt seed', purpose: 'Load CSV files from seeds/ into the warehouse as tables.', ex: 'dbt seed --select country_codes', internal: 'Creates a table from the CSV; types inferred or from config.', prod: 'Small static reference data (lookup tables), NOT large datasets.', mistake: 'Seeding big/changing data — seeds are for small static lookups, use EL for real data.' },
      { c: 'dbt snapshot', purpose: 'Capture SCD Type-2 history of a mutable source/model.', ex: 'dbt snapshot', internal: 'Compares current rows to the snapshot table; closes changed rows and inserts new versions.', prod: 'Scheduled regularly so history isn’t lost between runs.', mistake: 'Running it too infrequently — you only capture changes seen at snapshot time.' },
    ],
  },
  {
    name: 'Inspect & plan', color: '#8B5CF6', cmds: [
      { c: 'dbt parse', purpose: 'Build the manifest from project files (structure only).', ex: 'dbt parse', internal: 'Reads all files, resolves refs into nodes; no Jinja-to-disk, no execution.', prod: 'A fast CI check that the project is structurally valid.', mistake: 'Confusing it with compile — parse doesn’t render model SQL to target/.' },
      { c: 'dbt compile', purpose: 'Render Jinja to pure SQL in target/compiled/ without executing.', ex: 'dbt compile --select fct_orders', internal: 'ref()/macros/config rendered to warehouse-ready SQL. No warehouse contact.', prod: 'Inspect exactly what a model will run; debug macros cheaply.', mistake: 'Thinking compile runs SQL — it never touches the warehouse.' },
      { c: 'dbt ls', purpose: 'List the nodes a selector resolves to (dry-run selection).', ex: 'dbt ls --select state:modified+', internal: 'Applies selection to the graph and prints matching nodes.', prod: 'Check blast radius before a big run; debug a selector.', mistake: 'Guessing what a selector matches instead of running ls to confirm.' },
      { c: 'dbt docs generate', purpose: 'Build the docs site data (manifest + catalog from the warehouse).', ex: 'dbt docs generate && dbt docs serve', internal: 'Queries warehouse metadata to produce catalog.json; combines with manifest for lineage.', prod: 'Run in CI/prod to publish an always-current docs/lineage site.', mistake: 'Expecting column stats without generate — catalog.json comes from this command.' },
      { c: 'dbt source freshness', purpose: 'Check how recently each source was loaded.', ex: 'dbt source freshness', internal: 'Compares loaded_at_field to warn_after/error_after thresholds.', prod: 'A GATE before build — fail fast on late/missing sources.', mistake: 'Running it after build instead of before, so stale data already propagated.' },
    ],
  },
];

const FLAGS = [
  ['--select / -s', 'Choose which nodes to run (graph/state/tag/path selectors).'],
  ['--exclude', 'Remove nodes from the selected set.'],
  ['--full-refresh', 'Rebuild incremental models from scratch (CREATE OR REPLACE). Keep OUT of scheduled prod jobs.'],
  ['--state', 'Path to a prior manifest for state:modified comparison (Slim CI).'],
  ['--defer', 'Resolve refs to unbuilt models against the --state environment (Slim CI).'],
  ['--target / -t', 'Choose the profiles.yml output (dev/ci/prod) — where it runs and as whom.'],
  ['--vars', 'Pass variables into compilation, e.g. --vars \'{"start_date":"2024-01-01"}\'.'],
  ['--profiles-dir', 'Where to find profiles.yml (useful in CI containers).'],
  ['--threads', 'Parallelism — how many nodes run at once (warehouse concurrency).'],
  ['--fail-fast', 'Stop the run on the first failure instead of continuing.'],
];

const IQ = [
  {
    q: 'What is the difference between dbt run, dbt test, and dbt build?',
    a: `<ul>
      <li><code>dbt run</code> — compiles and materializes <strong>models only</strong>. No tests, seeds, or snapshots.</li>
      <li><code>dbt test</code> — runs <strong>data tests</strong> against already-built models.</li>
      <li><code>dbt build</code> — runs models, tests, seeds, and snapshots <strong>together in DAG order</strong>, and a model’s failing test <strong>skips its downstream children</strong>.</li>
    </ul>
    Production deploys use <code>build</code> because the test gating contains bad data within a single invocation; <code>run</code> + separate <code>test</code> leaves a window where untested models exist.`,
    tip: 'The clincher: "build gates downstream on tests, so bad data never cascades in one run." That’s why prod uses build, not run.',
  },
  {
    q: 'Walk me through the flags you’d use for a Slim CI build.',
    a: `<code>dbt build --select state:modified+ --defer --state ./prod-artifacts --target ci</code>
    <ul>
      <li><code>state:modified+</code> — build only changed nodes and their downstream (diffed against the prod manifest).</li>
      <li><code>--state ./prod-artifacts</code> — the previous prod manifest to compare against.</li>
      <li><code>--defer</code> — unchanged upstream refs resolve to the prod tables instead of rebuilding.</li>
      <li><code>--target ci</code> — build into an isolated CI schema.</li>
    </ul>
    Together they make CI cost track the size of the change, not the project.`,
    tip: 'Being able to recite the exact Slim CI invocation (and what each flag does) is a strong signal of hands-on CI experience.',
  },
  {
    q: 'Which commands never touch the warehouse, and why does that matter?',
    a: `<code>dbt parse</code>, <code>dbt compile</code>, <code>dbt ls</code>, and <code>dbt clean</code> run entirely locally — no warehouse contact, no credits.
    <br><br>It matters because they let you validate structure, inspect exactly what SQL will run, check selector blast radius, and clear artifacts — all for free, in CI or locally, before spending any compute. The expensive, side-effecting commands (<code>run</code>/<code>build</code>/<code>test</code>/<code>snapshot</code>/<code>seed</code>/<code>docs generate</code>) are the ones that hit the warehouse.`,
    tip: 'Grouping commands by "spends credits vs free" shows you think about cost — exactly the lens a senior role wants.',
  },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M32 · Mastery & Capstone',
    title: 'Command Playground',
    subtitle: 'Every dbt command — purpose, example, what happens internally, production use, and the common mistake.',
    tabs: [
      { id: 'lab',    label: '⌨️ Commands' },
      { id: 'term',   label: '🖥️ Terminal' },
      { id: 'detail', label: '📋 Selectors & flags' },
      { id: 'iq',     label: '🎯 Interview Q&A' },
    ],
  });
  buildLab(container);
  buildTerminal(container);
  buildDetail(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
}

// ── Terminal simulator ───────────────────────────────────────────────────────
// Output is DERIVED from the sample project's manifest graph (data/manifest-gen),
// so selection, ordering and node names are real — but nothing is executed. For
// genuine execution (real DuckDB build + tests) use the Project Builder IDE.
function buildGraph() {
  const { NODES, COMPILED, MANIFEST } = buildArtifacts();
  const byName = {};
  const models = Object.entries(NODES).filter(([, n]) => n.kind === 'model').map(([id, n]) => {
    const name = n.label;
    const schema = name.startsWith('stg_') ? 'main_staging' : 'main_marts';
    byName[name] = { id, name, schema, materialized: n.materialized,
      parents: n.parents.filter(p => NODES[p]?.kind === 'model').map(p => NODES[p].label),
      children: n.children.filter(c => NODES[c]?.kind === 'model').map(c => NODES[c].label),
      path: `models/${name.startsWith('stg_') ? 'staging' : 'marts'}/${name}.sql`,
      compiled: COMPILED[id] };
    return byName[name];
  });
  // Kahn topo order (upstream first)
  const indeg = {}; models.forEach(m => indeg[m.name] = m.parents.length);
  const order = [], q = models.filter(m => indeg[m.name] === 0).map(m => m.name).sort();
  while (q.length) { const n = q.shift(); order.push(n); byName[n].children.sort().forEach(c => { if (--indeg[c] === 0) q.push(c); }); }
  models.forEach(m => { if (!order.includes(m.name)) order.push(m.name); });
  // tests per model, from the derived manifest. A test runs once, grouped under
  // the model it is DEFINED on — depends_on.nodes[0] — even if it also references
  // another model (e.g. a relationships test's `to:` target).
  const testsByModel = {};
  Object.entries(MANIFEST.nodes).filter(([id]) => id.startsWith('test.')).forEach(([id, t]) => {
    const primary = (t.depends_on.nodes || [])[0];
    const mn = NODES[primary]?.label;
    if (mn && byName[mn]) { (testsByModel[mn] = testsByModel[mn] || []).push(id.split('.').slice(2).join('.')); }
  });
  const counts = {
    models: models.length,
    tests: Object.keys(MANIFEST.nodes).filter(id => id.startsWith('test.')).length,
    sources: Object.keys(MANIFEST.sources).length,
    snapshots: Object.keys(MANIFEST.nodes).filter(id => id.startsWith('snapshot.')).length,
  };
  return { byName, order, testsByModel, counts };
}

function ancestors(name, G, acc = new Set()) { (G.byName[name]?.parents || []).forEach(p => { if (!acc.has(p)) { acc.add(p); ancestors(p, G, acc); } }); return acc; }
function descendants(name, G, acc = new Set()) { (G.byName[name]?.children || []).forEach(c => { if (!acc.has(c)) { acc.add(c); descendants(c, G, acc); } }); return acc; }

function selectModels(sel, G, ctx) {
  if (!sel) return G.order.slice();
  if (sel.startsWith('path:')) { const p = sel.slice(5); return G.order.filter(n => G.byName[n].path.startsWith(p)); }
  if (sel.startsWith('tag:')) { ctx.note = 'No tags are defined in the sample project, so this selector matches nothing.'; return []; }
  let name = sel, up = false, down = false;
  if (sel.startsWith('state:')) {
    ctx.note = 'state: diffs against a prior --state manifest. Illustrative here: treating stg_orders as the modified node.';
    name = 'stg_orders'; down = sel.endsWith('+');
  } else {
    if (name.startsWith('+')) { up = true; name = name.slice(1); }
    if (name.endsWith('+')) { down = true; name = name.slice(0, -1); }
  }
  if (!G.byName[name]) { ctx.note = `No node named "${name}" in this project.`; return []; }
  const set = new Set([name]);
  if (up) ancestors(name, G).forEach(x => set.add(x));
  if (down) descendants(name, G).forEach(x => set.add(x));
  return G.order.filter(n => set.has(n));
}

const L = (text, cls = '') => ({ text, cls });
const tFmt = () => (0.1 + Math.random() * 0.5).toFixed(2);

function simulate(cmdStr, G) {
  const raw = cmdStr.trim().replace(/\s+/g, ' ');
  const parts = raw.split(' ');
  if (parts[0] !== 'dbt') return [L('$ ' + raw), L("commands start with `dbt` (e.g. dbt build).", 'err')];
  let verb = parts[1] || '', rest = parts.slice(2);
  if (verb === 'source' && parts[2] === 'freshness') { verb = 'source freshness'; rest = parts.slice(3); }
  if (verb === 'docs') { verb = 'docs ' + (parts[2] || ''); rest = parts.slice(3); }
  let sel = '';
  for (let i = 0; i < rest.length; i++) if (['--select', '-s', '-m', '--models'].includes(rest[i])) { sel = rest[i + 1] || ''; i++; }
  const ctx = {};
  const out = [L('$ ' + raw)];
  const sel2 = () => selectModels(sel, G, ctx);
  const noteLine = () => { if (ctx.note) out.push(L('ℹ ' + ctx.note, 'dim')); };

  switch (verb) {
    case 'run': {
      const ms = sel2(); noteLine();
      if (!ms.length) { out.push(L('Nothing to do. Try a different selector.', 'warn')); break; }
      out.push(L(`Running with dbt=1.9.0 against target 'dev' (duckdb)`, 'dim'));
      out.push(L(`Found ${G.counts.models} models, ${G.counts.tests} tests, ${G.counts.sources} sources, ${G.counts.snapshots} snapshot`, 'dim'), L(''));
      ms.forEach((n, i) => { const m = G.byName[n]; out.push(L(`${i + 1} of ${ms.length} OK created sql ${m.materialized} model ${m.schema}.${n} ${'.'.repeat(Math.max(2, 34 - n.length - m.schema.length))} [OK in ${tFmt()}s]`, 'ok')); });
      out.push(L(''), L(`Finished running ${ms.length} ${ms.length === 1 ? 'model' : 'models'}.`, 'dim'), L('Completed successfully', 'ok'), L(`Done. PASS=${ms.length} WARN=0 ERROR=0 SKIP=0 TOTAL=${ms.length}`, 'ok'));
      break;
    }
    case 'build': {
      const ms = sel2(); noteLine();
      if (!ms.length) { out.push(L('Nothing to do.', 'warn')); break; }
      const tests = ms.flatMap(n => (G.testsByModel[n] || []).map(t => ({ model: n, t })));
      const total = ms.length + tests.length;
      out.push(L(`Found ${G.counts.models} models, ${G.counts.tests} tests, ${G.counts.sources} sources, 1 snapshot`, 'dim'), L(''));
      let idx = 0;
      ms.forEach(n => {
        const m = G.byName[n]; idx++;
        out.push(L(`${idx} of ${total} OK created sql ${m.materialized} model ${m.schema}.${n} ${'.'.repeat(Math.max(2, 30 - n.length))} [OK in ${tFmt()}s]`, 'ok'));
        (G.testsByModel[n] || []).forEach(t => { idx++; out.push(L(`${idx} of ${total} PASS ${t} ${'.'.repeat(Math.max(2, 46 - t.length))} [PASS in ${tFmt()}s]`, 'ok')); });
      });
      out.push(L(''), L('Completed successfully', 'ok'), L(`Done. PASS=${total} WARN=0 ERROR=0 SKIP=0 TOTAL=${total}`, 'ok'));
      break;
    }
    case 'test': {
      const ms = sel2(); noteLine();
      const tests = ms.flatMap(n => (G.testsByModel[n] || []).map(t => ({ model: n, t })));
      if (!tests.length) { out.push(L('No tests selected.', 'warn')); break; }
      out.push(L(`Found ${G.counts.tests} tests across ${G.counts.models} models`, 'dim'), L(''));
      tests.forEach((x, i) => out.push(L(`${i + 1} of ${tests.length} PASS ${x.t} ${'.'.repeat(Math.max(2, 46 - x.t.length))} [PASS in ${tFmt()}s]`, 'ok')));
      out.push(L(''), L('Completed successfully', 'ok'), L(`Done. PASS=${tests.length} WARN=0 ERROR=0 SKIP=0 TOTAL=${tests.length}`, 'ok'));
      break;
    }
    case 'compile': {
      const ms = sel2(); noteLine();
      if (!ms.length) { out.push(L('Nothing to compile.', 'warn')); break; }
      out.push(L(`Compiled ${ms.length} node(s) to target/compiled/jaffle_commerce/`, 'dim'), L(''));
      const show = ms.slice(0, 1)[0];
      out.push(L(`── target/compiled/.../${show}.sql ──`, 'head'));
      (G.byName[show].compiled || '').split('\n').forEach(line => out.push(L(line)));
      if (ms.length > 1) out.push(L(''), L(`(+${ms.length - 1} more compiled — select a single model to see one.)`, 'dim'));
      break;
    }
    case 'ls':
    case 'list': {
      const ms = sel2(); noteLine();
      if (!ms.length) { out.push(L('(no nodes matched)', 'warn')); break; }
      ms.forEach(n => out.push(L(`jaffle_commerce.${n.startsWith('stg_') ? 'staging' : 'marts'}.${n}`)));
      out.push(L(''), L(`${ms.length} of ${G.counts.models} nodes selected`, 'dim'));
      break;
    }
    case 'seed':
      out.push(L('Found 3 seeds', 'dim'), L(''));
      ['raw_customers', 'raw_orders', 'raw_payments'].forEach((s, i) => out.push(L(`${i + 1} of 3 OK loaded seed file main.${s} ${'.'.repeat(10)} [INSERT in ${tFmt()}s]`, 'ok')));
      out.push(L(''), L('Completed successfully', 'ok'), L('Done. PASS=3 WARN=0 ERROR=0 SKIP=0 TOTAL=3', 'ok'));
      break;
    case 'snapshot':
      out.push(L('1 of 1 OK snapshotted snapshots.customers_snapshot ...... [OK in ' + tFmt() + 's]', 'ok'), L(''), L('Completed successfully', 'ok'));
      break;
    case 'source freshness':
      out.push(L('1 of 3 PASS freshness of raw.raw_customers ...... [PASS in ' + tFmt() + 's]', 'ok'));
      out.push(L('2 of 3 PASS freshness of raw.raw_orders ......... [PASS in ' + tFmt() + 's]', 'ok'));
      out.push(L('3 of 3 SKIP freshness of raw.raw_payments (no freshness configured)', 'warn'));
      out.push(L(''), L('Done.', 'dim'));
      break;
    case 'parse':
      out.push(L('Performance info: target/perf_info.json', 'dim'));
      out.push(L(`Found ${G.counts.models} models, ${G.counts.tests} tests, ${G.counts.sources} sources, ${G.counts.snapshots} snapshot, 1 macro`, 'ok'));
      out.push(L('Manifest written to target/manifest.json', 'dim'));
      break;
    case 'debug':
      out.push(L('Connection test:', 'dim'), L('  profiles.yml file [OK found and valid]', 'ok'), L('  dbt_project.yml file [OK found and valid]', 'ok'), L('  connection: [OK connection ok] (duckdb)', 'ok'), L(''), L('All checks passed!', 'ok'));
      break;
    case 'deps':
      out.push(L('Installing dbt-labs/dbt_utils', 'dim'), L('  Installed from version 1.3.0', 'ok'), L('Up to date!', 'ok'));
      break;
    case 'clean':
      out.push(L('Checking target/*', 'dim'), L('  Cleaned target/', 'ok'), L('Checking dbt_packages/*', 'dim'), L('  Cleaned dbt_packages/', 'ok'), L('Finished cleaning all paths.', 'ok'));
      break;
    case 'docs generate':
      out.push(L(`Found ${G.counts.models} models, ${G.counts.tests} tests, ${G.counts.sources} sources`, 'dim'), L('Building catalog', 'dim'), L('Catalog written to target/catalog.json', 'ok'), L('Manifest written to target/manifest.json', 'ok'));
      break;
    case 'docs serve':
      out.push(L('Serving docs at http://localhost:8080', 'ok'), L('Press Ctrl+C to exit.', 'dim'));
      break;
    case 'init':
      out.push(L("Running with dbt=1.9.0", 'dim'), L('Your new dbt project "my_project" was created!', 'ok'));
      break;
    default:
      out.push(L(`Unknown or unsupported command: "${verb}".`, 'err'));
      out.push(L('Try: dbt build · dbt run --select stg_orders+ · dbt ls --select +dim_customers · dbt compile --select fct_orders · dbt source freshness', 'dim'));
  }
  return out;
}

const QUICK = [
  'dbt build',
  'dbt run --select stg_orders+',
  'dbt build --select fct_orders+',
  'dbt test --select fct_orders',
  'dbt compile --select fct_orders',
  'dbt ls --select +dim_customers',
  'dbt ls --select state:modified+',
  'dbt source freshness',
  'dbt docs generate',
  'dbt seed',
  'dbt deps',
  'dbt parse',
];

function buildTerminal(container) {
  const tab = container.querySelector('#tab-term');
  const G = buildGraph();
  tab.innerHTML = `
    <p class="lab-intro">Type a dbt command (or pick one) and run it against the
      <a href="#project-explorer" style="color:var(--accent);font-weight:600">jaffle_commerce</a> sample project. The
      output is <strong>derived from the real manifest graph</strong> — selection, ordering and node names are genuine —
      but <strong>nothing is executed</strong>. For real execution (DuckDB build + tests), use the
      <a href="#project-ide" style="color:var(--accent);font-weight:600">Project Builder IDE</a>.</p>

    <div class="term-quick" id="term-quick">
      ${QUICK.map(q => `<button class="lab-chip term-chip" data-q="${q}">${q}</button>`).join('')}
    </div>

    <div class="term-inputrow">
      <span class="term-prompt">$</span>
      <input class="term-input" id="term-input" spellcheck="false" value="dbt build" aria-label="dbt command">
      <button class="btn btn-primary" id="term-go" type="button">▶ Run (simulated)</button>
    </div>

    <div class="term-screen" id="term-screen"></div>
    <p class="term-foot">🖥️ <strong>Simulated output</strong> — illustrative, derived from the sample project's graph. No warehouse, no dbt, nothing executed here.</p>
  `;

  const input = tab.querySelector('#term-input');
  const screen = tab.querySelector('#term-screen');
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  function run() {
    const lines = simulate(input.value, G);
    screen.innerHTML = lines.map(l => `<div class="term-line ${l.cls ? 'term-' + l.cls : ''}">${esc(l.text) || '&nbsp;'}</div>`).join('');
  }

  tab.querySelector('#term-go').addEventListener('click', run);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); run(); } });
  tab.querySelector('#term-quick').addEventListener('click', e => {
    const chip = e.target.closest('.term-chip'); if (!chip) return;
    input.value = chip.dataset.q; run();
  });
  run();
}

function buildLab(container) {
  const tab = container.querySelector('#tab-lab');
  const flat = GROUPS.flatMap(g => g.cmds.map(c => ({ ...c, color: g.color, group: g.name })));
  tab.innerHTML = `
    <p class="lab-intro">Pick a command to see what it does, a real example, what happens under the hood, its
    production use, and the mistake people make with it.</p>
    ${GROUPS.map(g => `
      <div class="cmd-group-label" style="color:${g.color}">${g.name}</div>
      <div class="lab-picker">
        ${g.cmds.map(c => `<button class="lab-chip" data-c="${c.c}"><span class="lab-sev" style="background:${g.color}"></span>${c.c}</button>`).join('')}
      </div>`).join('')}
    <div class="stage-panel" id="m32-panel" style="margin-top:16px"></div>
  `;
  const panel = tab.querySelector('#m32-panel');

  function render(cmd) {
    const c = flat.find(x => x.c === cmd) || flat[0];
    panel.style.setProperty('--panelColor', c.color);
    panel.innerHTML = `
      <div class="stage-panel-head">
        <span class="stage-panel-k" style="color:${c.color}">${c.group}</span>
        <span class="stage-panel-t" style="font-family:var(--font-mono)">${c.c}</span>
      </div>
      <div class="stage-panel-body">
        <p>${c.purpose}</p>
        <div class="code-block" data-lang="bash" style="margin:12px 0">${escapeHtml(c.ex)}</div>
        <div class="mx-grid">
          <div class="mx-cell"><div class="mx-k">What happens internally</div><div class="mx-v">${c.internal}</div></div>
          <div class="mx-cell"><div class="mx-k">Production use</div><div class="mx-v">${c.prod}</div></div>
        </div>
        <div class="ex-interview" style="border-left-color:${c.color};background:${c.color}18;margin-top:12px">
          <span class="ex-iq-badge" style="color:${c.color}">Common mistake</span> ${c.mistake}</div>
      </div>`;
    injectCodeEnhancements(panel);
  }

  tab.addEventListener('click', e => {
    const chip = e.target.closest('.lab-chip');
    if (!chip) return;
    tab.querySelectorAll('.lab-chip').forEach(x => x.classList.toggle('active', x === chip));
    render(chip.dataset.c);
  });
  tab.querySelector('.lab-chip').classList.add('active');
  render(flat[0].c);
}

function buildDetail(container) {
  container.querySelector('#tab-detail').innerHTML = `
    <div class="detail-section">
      <h3>Flags & selectors that modify every command</h3>
      <div class="cheat-grid">
        <div class="cheat-card"><div class="cheat-head">🚩 Common flags</div><div class="cheat-body">
          ${FLAGS.map(([k,v]) => `<div class="cheat-row"><div class="cheat-v">${escapeHtml(k)}</div><div class="cheat-k">${v}</div></div>`).join('')}
        </div></div>
        <div class="cheat-card"><div class="cheat-head">🎯 Selector methods</div><div class="cheat-body">
          <div class="cheat-row"><div class="cheat-k">Graph up/down</div><div class="cheat-v">+model / model+ / @model</div></div>
          <div class="cheat-row"><div class="cheat-k">State</div><div class="cheat-v">state:modified / state:new / result:fail</div></div>
          <div class="cheat-row"><div class="cheat-k">Tag / path / config</div><div class="cheat-v">tag:nightly / path:models/marts / config.materialized:incremental</div></div>
          <div class="cheat-row"><div class="cheat-k">Resource type</div><div class="cheat-v">resource_type:source / test / snapshot</div></div>
          <div class="cheat-row"><div class="cheat-k">Intersection (AND)</div><div class="cheat-v">tag:nightly,config.materialized:table</div></div>
        </div></div>
      </div>
    </div>
    <div class="detail-section">
      <h3>Spends credits vs free</h3>
      <div class="info-grid">
        <div class="info-card" style="border-left-color:var(--success)"><div class="info-card-title">Free (local only)</div><div class="info-card-body"><code>parse</code>, <code>compile</code>, <code>ls</code>, <code>clean</code>, <code>deps</code>, <code>debug</code> (connection test). Validate and inspect without warehouse cost.</div></div>
        <div class="info-card" style="border-left-color:var(--error)"><div class="info-card-title">Spends warehouse compute</div><div class="info-card-body"><code>run</code>, <code>build</code>, <code>test</code>, <code>seed</code>, <code>snapshot</code>, <code>source freshness</code>, <code>docs generate</code>. These contact the warehouse.</div></div>
      </div>
      <p style="font-size:15px;font-weight:600;color:var(--accent)">Reach for the free commands first — parse/compile/ls answer most "what will this do?" questions before you spend a single credit.</p>
    </div>
    <div class="detail-section">
      <p style="padding:12px 14px;background:var(--surface-2);border-left:3px solid var(--accent);border-radius:8px;font-size:14px;margin:0">
        <strong>🧠 First principles —</strong> the free/paid split is the compile boundary: <code>parse</code> and <code>compile</code> turn your project into SQL with no warehouse (dbt is a compiler); <code>run</code>/<code>build</code>/<code>test</code> execute that SQL against the warehouse. That is why you debug <code>target/compiled/</code>, not your Jinja. <a href="#concepts" style="color:var(--accent);font-weight:600">Core Concepts → Execution Lifecycle</a>.
      </p>
    </div>
  `;
}

function escapeHtml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
