// M32 · Command Playground
// An interactive dbt command reference. Pick a command to see its purpose, a
// real example, what happens internally, the production use, and the common
// mistake. Plus the selectors/flags that modify every command.
import { createModuleShell, createIQSection, injectCodeEnhancements } from '../components/module-shell.js';

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
    tag: 'M32 · Reference',
    title: 'Command Playground',
    subtitle: 'Every dbt command — purpose, example, what happens internally, production use, and the common mistake.',
    tabs: [
      { id: 'lab',    label: '⌨️ Commands' },
      { id: 'detail', label: '📋 Selectors & flags' },
      { id: 'iq',     label: '🎯 Interview Q&A' },
    ],
  });
  buildLab(container);
  buildDetail(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
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
        <div class="info-card" style="border-left-color:#10B981"><div class="info-card-title">Free (local only)</div><div class="info-card-body"><code>parse</code>, <code>compile</code>, <code>ls</code>, <code>clean</code>, <code>deps</code>, <code>debug</code> (connection test). Validate and inspect without warehouse cost.</div></div>
        <div class="info-card" style="border-left-color:#EF4444"><div class="info-card-title">Spends warehouse compute</div><div class="info-card-body"><code>run</code>, <code>build</code>, <code>test</code>, <code>seed</code>, <code>snapshot</code>, <code>source freshness</code>, <code>docs generate</code>. These contact the warehouse.</div></div>
      </div>
      <p style="font-size:15px;font-weight:600;color:var(--accent)">Reach for the free commands first — parse/compile/ls answer most "what will this do?" questions before you spend a single credit.</p>
    </div>
  `;
}

function escapeHtml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
