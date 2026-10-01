// M17 · dbt Internals Visualizer
// The lifecycle of a `dbt run`, stage by stage. Click any stage in the pipeline
// to see what happens, why, its input/output, an example, the common failure,
// and the interview angle. This is the "what actually happens between typing a
// command and SQL hitting the warehouse" module the foundation modules only hint at.
import { createModuleShell, createIQSection, injectCodeEnhancements } from '../components/module-shell.js';
import { renderExplain } from '../components/explain.js';

const STAGES = [
  {
    id: 'invoke', ic: '⌨️', name: 'Invocation', sub: 'dbt run', tag: 'CLI',
    title: 'CLI invocation',
    what: 'You run a command (<code>dbt run</code>, <code>dbt build</code>, <code>dbt test</code>…). dbt resolves which <strong>task</strong> to execute and reads global flags (<code>--select</code>, <code>--target</code>, <code>--vars</code>, <code>--full-refresh</code>).',
    why: 'The command and its selectors decide <em>which nodes</em> enter the graph later. Nothing is compiled or executed yet — this is argument parsing.',
    input: 'Shell command + flags.',
    output: 'A resolved task + a parsed set of flags held in memory.',
    example: 'dbt run --select state:modified+ --target prod --vars \'{"start_date": "2024-01-01"}\'',
    lang: 'bash',
    failure: '<code>Could not find adapter type</code> — the adapter package (e.g. dbt-snowflake) isn\'t installed in the environment.',
    interview: 'Q: Does <code>dbt run</code> read your models at this point? No — it has only parsed CLI arguments. Model files are read in the parse stage.',
  },
  {
    id: 'load', ic: '📂', name: 'Project load', sub: 'config', tag: 'Config',
    title: 'Project & profile loading',
    what: 'dbt reads <code>dbt_project.yml</code> (paths, model configs, vars) and resolves the active <code>profiles.yml</code> target to get warehouse credentials and the target schema/database.',
    why: 'Determines WHERE models will be built (database/schema) and WITH WHAT connection. The same project builds into <code>dev</code> or <code>prod</code> purely by switching target.',
    input: 'dbt_project.yml, profiles.yml, env vars, <code>--target</code>.',
    output: 'A resolved runtime config: connection + per-path materialization defaults.',
    example: '# profiles.yml\nacme:\n  target: dev\n  outputs:\n    dev:  { type: snowflake, schema: dbt_alice, ... }\n    prod: { type: snowflake, schema: analytics, ... }',
    lang: 'yaml',
    failure: '<code>Credentials error / database not found</code> — wrong target, missing env var, or expired key. Caught here, before any SQL runs.',
    interview: 'Q: How does one project deploy to dev and prod safely? Targets in profiles.yml + env vars — the code never changes, only the resolved connection + schema.',
  },
  {
    id: 'parse', ic: '🔎', name: 'Parse', sub: 'read files', tag: 'Parse',
    title: 'Parsing',
    what: 'dbt reads every <code>.sql</code> and <code>.yml</code> under the configured paths, extracts <code>{{ ref() }}</code>, <code>{{ source() }}</code>, <code>{{ config() }}</code> and test definitions <strong>without running the SQL</strong>, and builds an in-memory node for each resource.',
    why: 'This is where dbt learns what resources exist and what they declare. ref()/source() calls found here become the edges of the DAG.',
    input: 'All model / test / seed / snapshot / macro files + schema YAML.',
    output: 'Unlinked nodes (one per resource) with their declared refs and configs.',
    example: '-- models/marts/fct_orders.sql\n{{ config(materialized=\'incremental\', unique_key=\'order_id\') }}\nselect * from {{ ref(\'stg_orders\') }}',
    failure: '<code>Parsing Error / Compilation Error at parse time</code> — a malformed Jinja block, a <code>ref()</code> to a model that doesn\'t exist, or a duplicate model name.',
    interview: 'Q: What is "parse time" vs "run time"? Parse reads files and resolves structure; run executes SQL. A <code>ref</code> to a missing model fails at parse, long before the warehouse is touched.',
  },
  {
    id: 'manifest', ic: '🗂️', name: 'Manifest', sub: 'manifest.json', tag: 'Artifact',
    title: 'Manifest generation',
    what: 'dbt assembles all parsed nodes into <code>target/manifest.json</code> — the complete, serialized representation of your project: every node, its config, its raw + (later) compiled SQL, and the <code>parent_map</code> / <code>child_map</code> adjacency.',
    why: 'The manifest is dbt\'s single source of truth. Lineage, docs, <code>state:modified</code> comparison, and <code>defer</code> all read from it. It is the artifact that makes Slim CI possible.',
    input: 'Parsed nodes from the parse stage.',
    output: '<code>manifest.json</code> (and used to build docs + the lineage graph).',
    example: '// target/manifest.json (abbreviated)\n"model.acme.fct_orders": {\n  "depends_on": { "nodes": ["model.acme.stg_orders"] },\n  "config": { "materialized": "incremental" }\n}',
    lang: 'json',
    failure: 'A stale manifest used for <code>--state</code> comparison can make Slim CI skip or rebuild the wrong nodes — always generate the comparison manifest from the right environment.',
    interview: 'Q: What is the manifest and why does it matter? It is the serialized project graph; <code>--state</code>/<code>defer</code>/docs/lineage all depend on it. Mentioning parent_map/child_map signals real experience.',
  },
  {
    id: 'resolve', ic: '🔗', name: 'Resolve deps', sub: 'ref → edges', tag: 'Graph',
    title: 'Dependency resolution',
    what: 'Each <code>ref()</code> / <code>source()</code> is turned into a concrete edge between nodes. dbt now knows the exact parents and children of every model.',
    why: 'Edges define correctness: a model must never run before the models it reads. This is what lets dbt guarantee order without you hand-writing a schedule.',
    input: 'Nodes + their declared refs (from the manifest).',
    output: 'A directed dependency graph (edges between nodes).',
    example: 'stg_orders → fct_orders → fct_revenue → dashboard_revenue',
    failure: '<code>Found a cycle in the DAG</code> — two models ref() each other (directly or transitively). dbt refuses to run a cyclic graph.',
    interview: 'Q: Why use <code>ref()</code> instead of hard-coding table names? ref() creates the dependency edge AND resolves the right schema per environment. Hard-coding breaks ordering and portability.',
  },
  {
    id: 'dag', ic: '🕸️', name: 'Build DAG', sub: 'topo sort', tag: 'Graph',
    title: 'DAG construction',
    what: 'dbt applies your selection (<code>--select</code>/<code>--exclude</code>) to the graph, then topologically sorts the selected nodes into execution order, grouping independent nodes so they can run in parallel up to <code>threads</code>.',
    why: 'The DAG is the execution plan. Selection happens here, so <code>state:modified+</code> in CI prunes the graph to only what changed and its children.',
    input: 'Dependency graph + selection criteria.',
    output: 'An ordered, parallelizable execution plan.',
    example: 'dbt run --select fct_orders+   # fct_orders and everything downstream',
    lang: 'bash',
    failure: 'An over-broad selector (<code>+model+</code> on a hub node) can rebuild hundreds of models and blow your warehouse budget.',
    interview: 'Q: When is the DAG generated? After parse/manifest, at the start of execution — not while you write SQL. Selection is applied to the DAG, which is why Slim CI is cheap.',
  },
  {
    id: 'compile', ic: '⚙️', name: 'Compile', sub: 'render Jinja', tag: 'Compile',
    title: 'Compilation',
    what: 'For each selected node, dbt renders all Jinja — <code>ref()</code> becomes a fully-qualified <code>database.schema.table</code>, macros expand, <code>config()</code> is applied — producing pure, warehouse-ready SQL in <code>target/compiled/</code>.',
    why: 'Compilation is the translation from templated dbt SQL to the exact SQL the warehouse will run. <code>dbt compile</code> stops here — nothing executes.',
    input: 'Selected nodes + macros + the resolved connection (for relation names).',
    output: 'Compiled SQL files under <code>target/compiled/…</code>.',
    example: '-- compiled: {{ ref(\'stg_orders\') }} became:\nselect * from analytics.staging.stg_orders',
    failure: '<code>Compilation Error</code> — an undefined macro/variable, or a Jinja type error. Still no warehouse involved.',
    interview: 'Q: Does <code>dbt compile</code> run SQL? No. It renders Jinja to SQL and writes it to target/. Use it to inspect exactly what would run. This distinction is a classic interview check.',
  },
  {
    id: 'adapter', ic: '🔌', name: 'Adapter', sub: 'dialect', tag: 'Adapter',
    title: 'Adapter layer',
    what: 'The adapter (dbt-snowflake, dbt-bigquery, …) wraps the compiled SQL in the correct materialization DDL for that warehouse — <code>CREATE OR REPLACE</code>, <code>MERGE</code>, partition/cluster clauses — and manages the connection + transaction.',
    why: 'The adapter is why the same model runs on Snowflake, BigQuery, or Databricks. Warehouse-specific behavior (incremental strategy, clustering) lives here, not in your model.',
    input: 'Compiled SQL + materialization config.',
    output: 'Executable, warehouse-specific DDL/DML sent over the connection.',
    example: '-- incremental model on Snowflake becomes a MERGE;\n-- on BigQuery it may become a MERGE or insert_overwrite by partition.',
    failure: '<code>Adapter does not support strategy X</code> — e.g. requesting <code>insert_overwrite</code> on a warehouse/strategy combo the adapter can\'t express.',
    interview: 'Q: How does dbt stay warehouse-agnostic? The adapter translates one materialization into each warehouse\'s dialect; models stay portable. Name a difference (BigQuery partitions vs Snowflake clustering) to go deeper.',
  },
  {
    id: 'execute', ic: '🏭', name: 'Execute', sub: 'warehouse', tag: 'Run',
    title: 'Warehouse execution',
    what: 'The warehouse actually runs the DDL/DML: it builds or updates each table/view in dependency order, honoring the thread count for parallelism. This is the only stage that consumes compute credits.',
    why: 'This is where models materialize. Everything before this was planning; failures here are real SQL/warehouse errors (not dbt logic errors).',
    input: 'Warehouse-specific DDL/DML from the adapter.',
    output: 'Materialized relations (tables/views) in the target schema.',
    example: 'dbt run    # builds each model; dbt build also runs tests inline',
    lang: 'bash',
    failure: '<code>SQL compilation error / query timeout / out of memory</code> — a real warehouse error: bad SQL, a huge scan, or an undersized warehouse.',
    interview: 'Q: A model failed — how do you tell a dbt problem from a warehouse problem? Parse/compile errors are dbt-side (no credits spent); execution errors come from the warehouse and show up in run_results.json + logs.',
  },
  {
    id: 'test', ic: '🧪', name: 'Tests', sub: 'assertions', tag: 'Quality',
    title: 'Test execution',
    what: 'With <code>dbt build</code>, each model\'s tests run right after it materializes; a model\'s downstream children are skipped if its tests fail. With <code>dbt run</code> + <code>dbt test</code> they run as separate phases.',
    why: 'Tests are the quality gate. <code>build</code> interleaves them so bad data never cascades downstream within a single invocation.',
    input: 'Materialized relations + test definitions.',
    output: 'Pass / warn / fail results per test (feeds run_results).',
    example: 'dbt build --select fct_orders+   # build model, test it, then its children',
    lang: 'bash',
    failure: 'A failing <code>not_null</code>/<code>unique</code> test marks the model errored and skips dependents — by design, to contain the blast radius.',
    interview: 'Q: Difference between <code>dbt run</code> and <code>dbt build</code>? build = run + test + seed + snapshot in DAG order with test gating; run only materializes models. Production deploys use build.',
  },
  {
    id: 'artifacts', ic: '📦', name: 'Artifacts', sub: 'run_results', tag: 'Artifact',
    title: 'Artifacts & results',
    what: 'dbt writes <code>run_results.json</code> (status + timing per node), updates <code>manifest.json</code>, and (with <code>docs generate</code>) <code>catalog.json</code>. These artifacts power observability, docs, and the next run\'s <code>--state</code> comparison.',
    why: 'Artifacts turn a run into data. Orchestrators, cost dashboards, and Slim CI all consume them. This is how you debug <em>after</em> a run without re-running it.',
    input: 'Execution + test results.',
    output: '<code>run_results.json</code>, updated <code>manifest.json</code>, <code>catalog.json</code>.',
    example: '// run_results.json\n{ "unique_id": "model.acme.fct_orders",\n  "status": "success", "execution_time": 12.4 }',
    lang: 'json',
    failure: 'Not persisting artifacts between CI runs breaks <code>state:modified</code> — the comparison has nothing to diff against.',
    interview: 'Q: How would you find your slowest model without re-running? Parse <code>run_results.json</code> → sort nodes by <code>execution_time</code>. Pairing it with the manifest gives slow model + its lineage.',
  },
];

const IQ = [
  {
    q: 'Walk me through what happens internally when you run `dbt run`.',
    a: `A senior answer names the stages in order and what each produces:
    <ul>
      <li><strong>Invoke</strong> — parse CLI flags &amp; selectors (no files read yet).</li>
      <li><strong>Load</strong> — read dbt_project.yml + resolve the profiles.yml target (connection + schema).</li>
      <li><strong>Parse</strong> — read every .sql/.yml, extract ref/source/config <em>without executing SQL</em>.</li>
      <li><strong>Manifest</strong> — serialize all nodes to manifest.json with parent_map/child_map.</li>
      <li><strong>Resolve + DAG</strong> — turn refs into edges, apply selection, topologically sort into an execution plan.</li>
      <li><strong>Compile</strong> — render Jinja to warehouse-ready SQL in target/compiled/.</li>
      <li><strong>Adapter → Execute</strong> — wrap in materialization DDL and run it on the warehouse (the only stage that spends credits).</li>
      <li><strong>Tests → Artifacts</strong> — run assertions, write run_results.json.</li>
    </ul>`,
    tip: 'The single most impressive point: "everything before Execute is planning — no warehouse credits are spent until the adapter sends DDL." It shows you understand compile ≠ run.',
  },
  {
    q: 'What exactly is the manifest, and name three things that depend on it.',
    a: `<code>manifest.json</code> is the serialized, complete graph of your project — every node, its config, raw + compiled SQL, and the <code>parent_map</code>/<code>child_map</code> adjacency lists.
    <br><br>Three consumers:
    <ul>
      <li><strong>Lineage &amp; docs</strong> — the DAG you see is read from the manifest.</li>
      <li><strong>State comparison</strong> — <code>--state</code> diffs the current manifest against a previous one to compute <code>state:modified</code> for Slim CI.</li>
      <li><strong>defer</strong> — resolves <code>ref()</code>s for unbuilt models to a previously-built environment using the deferred manifest.</li>
    </ul>`,
    tip: 'If you can say "state:modified and defer both read a prior manifest," you have explained the mechanism behind Slim CI, which is the follow-up they almost always ask next.',
  },
  {
    q: 'At which stage does a `ref()` to a non-existent model fail — and why does that matter?',
    a: `At <strong>parse</strong> time — long before any SQL runs. During parsing dbt extracts every <code>ref()</code> and must resolve it to a known node; an unknown target is a parse/compilation error.
    <br><br>Why it matters: dbt catches a whole class of dependency bugs <em>statically</em>, with zero warehouse cost. Contrast with raw SQL scripts where a bad table name only surfaces at execution, after you\'ve already spent compute. This "fail fast, fail cheap" property is a core reason teams adopt dbt.`,
    tip: 'Tie it back to money: "parse-time failures cost nothing; execution failures cost credits." Interviewers love candidates who connect internals to cost.',
  },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M17 · dbt Internals',
    title: 'dbt Internals Visualizer',
    subtitle: 'What actually happens between typing dbt run and SQL hitting the warehouse. Click any stage.',
    tabs: [
      { id: 'pipeline', label: '🔬 Run Pipeline' },
      { id: 'detail',   label: '📋 Parse vs Compile vs Run' },
      { id: 'iq',       label: '🎯 Interview Q&A' },
    ],
  });

  buildPipeline(container);
  buildDetail(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
}

function buildPipeline(container) {
  const tab = container.querySelector('#tab-pipeline');
  tab.innerHTML = `
    <p class="lab-intro">A <code>dbt run</code> is a pipeline of stages. Only the <strong>Execute</strong> stage touches the
    warehouse — everything before it is planning. Click a stage to inspect it.</p>
    <div class="pipe">
      ${STAGES.map((s, i) => `
        <button class="pipe-stage ${i === 0 ? 'active' : ''}" data-i="${i}">
          <div class="pipe-ic">${s.ic}</div>
          <div class="pipe-name">${s.name}</div>
          <div class="pipe-sub">${s.sub}</div>
        </button>`).join('')}
    </div>
    <div id="m17-detail"></div>
  `;

  const detail = tab.querySelector('#m17-detail');
  const render = i => {
    detail.innerHTML = renderExplain({ ...STAGES[i], icon: STAGES[i].ic });
    tab.querySelectorAll('.pipe-stage').forEach((b, j) => b.classList.toggle('active', j === i));
    injectCodeEnhancements(detail); // code blocks in the swapped-in card
  };
  tab.querySelectorAll('.pipe-stage').forEach(btn => {
    btn.addEventListener('click', () => render(Number(btn.dataset.i)));
  });
  render(0);
}

function buildDetail(container) {
  container.querySelector('#tab-detail').innerHTML = `
    <div class="detail-section">
      <h3>The four commands people confuse</h3>
      <div class="info-grid">
        <div class="info-card" style="border-left-color:#8B5CF6">
          <div class="info-card-title">dbt parse</div>
          <div class="info-card-tag" style="color:#8B5CF6;background:#8B5CF622">Structure only</div>
          <div class="info-card-body">Reads files, builds the manifest. No Jinja rendering of model SQL to disk, no execution. Fastest way to validate project structure in CI.</div>
        </div>
        <div class="info-card" style="border-left-color:#3B82F6">
          <div class="info-card-title">dbt compile</div>
          <div class="info-card-tag" style="color:#3B82F6;background:#3B82F622">Jinja → SQL</div>
          <div class="info-card-body">Renders Jinja to pure SQL in <code>target/compiled/</code>. <strong>Nothing runs on the warehouse.</strong> Use it to see exactly what a model will execute.</div>
        </div>
        <div class="info-card" style="border-left-color:#10B981">
          <div class="info-card-title">dbt run</div>
          <div class="info-card-tag" style="color:#10B981;background:#10B98122">Materialize</div>
          <div class="info-card-body">Compiles then executes models on the warehouse in DAG order. Does <em>not</em> run tests, seeds, or snapshots.</div>
        </div>
        <div class="info-card" style="border-left-color:#FF694B">
          <div class="info-card-title">dbt build</div>
          <div class="info-card-tag" style="color:#FF694B;background:#FF694B22">Run + test + gate</div>
          <div class="info-card-body">Runs models, tests, seeds, and snapshots together in DAG order, gating children on a model's tests. The production-safe command.</div>
        </div>
      </div>
    </div>
    <div class="detail-section">
      <h3>The one mental model to keep</h3>
      <p style="font-size:15px;font-weight:600;color:var(--accent)">Parse builds the graph. Compile turns Jinja into SQL. Execute is the only stage that spends warehouse credits. Artifacts turn the run into data you can debug and diff later.</p>
      <p>Every advanced dbt feature — Slim CI, <code>defer</code>, lineage, docs, cost analysis — is just something reading the artifacts produced by this pipeline.</p>
    </div>
  `;
}
