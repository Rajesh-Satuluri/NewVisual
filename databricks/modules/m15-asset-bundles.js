import { createModuleShell, createIQSection } from '../components/module-shell.js';

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M15 · Orchestration',
    title: 'Asset Bundles & CI/CD',
    subtitle: 'Databricks Asset Bundles (DAB) — your jobs, pipelines & models as versioned, promotable infrastructure-as-code',
    tabs: [
      { id: 'what',   label: '📦 What DAB Is' },
      { id: 'anatomy',label: '🧱 Bundle Anatomy' },
      { id: 'cicd',   label: '🔁 CI/CD Flow' },
      { id: 'iq',     label: '🎯 Interview Q&A' },
    ]
  });

  container.querySelector('#tab-what').innerHTML = `
    <div class="section-pad">
      <div class="section-header">
        <div class="section-title">Your Databricks resources, as code</div>
        <div class="section-desc">Clicking a job into existence in the UI can't be reviewed, versioned, or reliably promoted from dev to prod. A <strong>Databricks Asset Bundle</strong> declares your jobs, DLT pipelines, notebooks, and models in a <code style="background:var(--bg3);padding:1px 5px;border-radius:4px">databricks.yml</code> file you commit to Git and deploy with the Databricks CLI.</div>
      </div>
      <div class="stats-row">
        <div class="stat-box"><div class="stat-val">YAML</div><div class="stat-label">databricks.yml declares everything</div></div>
        <div class="stat-box"><div class="stat-val">targets</div><div class="stat-label">dev / staging / prod from one source</div></div>
        <div class="stat-box"><div class="stat-val">CLI</div><div class="stat-label">validate → deploy → run</div></div>
        <div class="stat-box"><div class="stat-val">Git</div><div class="stat-label">reviewed, versioned, rollback-able</div></div>
      </div>

      <div class="info-grid" style="margin-top:24px">
        <div class="info-card">
          <div class="info-card-icon">📜</div>
          <div class="info-card-title">Declarative</div>
          <div class="info-card-body">You describe the desired end state (this job, with these tasks, on this schedule, running this notebook). The CLI diffs against the workspace and makes it so — create, update, or delete — instead of you wiring it by hand.</div>
          <div class="info-card-tag">desired state</div>
        </div>
        <div class="info-card">
          <div class="info-card-icon">🎯</div>
          <div class="info-card-title">One source, many targets</div>
          <div class="info-card-body">A single bundle defines <code style="background:var(--bg3);padding:1px 5px;border-radius:4px">targets</code> (dev, prod) that override variables, hosts, run-as identity, and schedules — so the exact same code promotes across environments without copy-paste drift.</div>
          <div class="info-card-tag">dev → prod</div>
        </div>
        <div class="info-card">
          <div class="info-card-icon">🪦</div>
          <div class="info-card-title">Replaces dbx & clicking</div>
          <div class="info-card-body">DAB is the supported successor to the older <code style="background:var(--bg3);padding:1px 5px;border-radius:4px">dbx</code> tool and to hand-built jobs. It's built into the Databricks CLI, so there's one official way to package and ship a project.</div>
          <div class="info-card-tag">official IaC</div>
        </div>
      </div>
    </div>`;

  container.querySelector('#tab-anatomy').innerHTML = `
    <div class="section-pad">
      <div class="section-header">
        <div class="section-title">Inside databricks.yml</div>
        <div class="section-desc">A bundle has a name, the resources it manages, reusable variables, and per-environment targets</div>
      </div>
      <div style="background:var(--bg2);border-radius:10px;padding:18px 20px;max-width:760px">
        <div class="code-block"><span class="kw">bundle</span>:
  <span class="kw">name</span>: orders_pipeline

<span class="kw">variables</span>:
  <span class="kw">catalog</span>:
    <span class="kw">description</span>: Unity Catalog to write into
    <span class="kw">default</span>: dev_catalog

<span class="kw">resources</span>:
  <span class="kw">jobs</span>:
    <span class="kw">orders_etl</span>:
      <span class="kw">name</span>: orders-etl-\${bundle.target}
      <span class="kw">tasks</span>:
        - <span class="kw">task_key</span>: bronze
          <span class="kw">notebook_task</span>:
            <span class="kw">notebook_path</span>: ./src/bronze.py
      <span class="kw">schedule</span>:
        <span class="kw">quartz_cron_expression</span>: <span class="str">"0 0 * * * ?"</span>

<span class="kw">targets</span>:
  <span class="kw">dev</span>:
    <span class="kw">mode</span>: development        <span class="cmt"># prefixes names, pauses schedules</span>
    <span class="kw">default</span>: true
  <span class="kw">prod</span>:
    <span class="kw">mode</span>: production
    <span class="kw">run_as</span>:
      <span class="kw">service_principal_name</span>: etl-sp
    <span class="kw">variables</span>:
      <span class="kw">catalog</span>: prod_catalog</div>
      </div>

      <div class="compare-table-wrap" style="padding:0;margin-top:20px">
        <table class="compare-table">
          <thead><tr><th>Block</th><th>What it does</th></tr></thead>
          <tbody>
            <tr><td><code style="background:var(--bg3);padding:1px 5px;border-radius:4px">bundle</code></td><td>Names the project; the namespace everything deploys under.</td></tr>
            <tr><td><code style="background:var(--bg3);padding:1px 5px;border-radius:4px">resources</code></td><td>The assets DAB manages: jobs, pipelines (DLT), models, experiments, dashboards, schemas, and more.</td></tr>
            <tr><td><code style="background:var(--bg3);padding:1px 5px;border-radius:4px">variables</code></td><td>Reusable, overridable values (catalogs, paths, cluster ids) referenced as <code style="background:var(--bg3);padding:1px 5px;border-radius:4px">\${var.name}</code>.</td></tr>
            <tr><td><code style="background:var(--bg3);padding:1px 5px;border-radius:4px">targets</code></td><td>Environments. <code style="background:var(--bg3);padding:1px 5px;border-radius:4px">development</code> mode prefixes resource names with your user and pauses schedules so dev deploys never collide or fire; <code style="background:var(--bg3);padding:1px 5px;border-radius:4px">production</code> runs real.</td></tr>
            <tr><td><code style="background:var(--bg3);padding:1px 5px;border-radius:4px">run_as</code> / <code style="background:var(--bg3);padding:1px 5px;border-radius:4px">permissions</code></td><td>Who prod jobs run as (a service principal, not a person) and who can manage them.</td></tr>
          </tbody>
        </table>
      </div>
    </div>`;

  container.querySelector('#tab-cicd').innerHTML = `
    <div class="section-pad">
      <div class="section-header">
        <div class="section-title">The deploy loop</div>
        <div class="section-desc">Three CLI verbs do the work, and a CI pipeline runs them on merge</div>
      </div>
      <div style="background:var(--bg2);border-radius:10px;padding:18px 20px;max-width:760px">
        <div class="code-block"><span class="cmt"># validate: type-check the bundle + resolve variables for a target</span>
databricks bundle validate -t dev

<span class="cmt"># deploy: upload files and create/update jobs, pipelines, etc.</span>
databricks bundle deploy -t dev

<span class="cmt"># run: trigger a job/pipeline defined in the bundle</span>
databricks bundle run orders_etl -t dev</div>
      </div>

      <div class="section-header" style="margin-top:28px">
        <div class="section-title" style="font-size:14px">A GitHub Actions promotion flow</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:12px;max-width:760px">
        <div style="background:var(--bg2);border-radius:10px;padding:14px 18px;border-left:4px solid var(--blue)">
          <div style="font-size:12.5px;color:var(--text2);line-height:1.7"><strong style="color:var(--text)">1 · PR opened →</strong> CI runs <code style="background:var(--bg3);padding:1px 5px;border-radius:4px">bundle validate</code> and unit tests. A broken bundle can't merge.</div>
        </div>
        <div style="background:var(--bg2);border-radius:10px;padding:14px 18px;border-left:4px solid var(--blue)">
          <div style="font-size:12.5px;color:var(--text2);line-height:1.7"><strong style="color:var(--text)">2 · Merge to main →</strong> CI runs <code style="background:var(--bg3);padding:1px 5px;border-radius:4px">bundle deploy -t staging</code> as a service principal, then integration tests against staging.</div>
        </div>
        <div style="background:var(--bg2);border-radius:10px;padding:14px 18px;border-left:4px solid var(--green)">
          <div style="font-size:12.5px;color:var(--text2);line-height:1.7"><strong style="color:var(--text)">3 · Tag / approval →</strong> <code style="background:var(--bg3);padding:1px 5px;border-radius:4px">bundle deploy -t prod</code>. Same code, prod target overrides (prod catalog, prod schedule, run-as prod SP). Rollback = redeploy the previous Git tag.</div>
        </div>
      </div>

      <div class="tip" style="max-width:760px;margin-top:20px">
        <strong style="color:var(--text)">Why it matters in interviews:</strong> DAB is the answer to "how do you get a Databricks job reviewed, tested, and promoted dev → prod without clicking?" It brings software-engineering discipline — version control, code review, environment parity, repeatable deploys, and rollback — to data/ML pipelines.
      </div>
    </div>`;

  container.querySelector('#tab-iq').innerHTML = createIQSection([
    {
      q: 'What problem do Databricks Asset Bundles solve, and what did they replace?',
      a: 'They solve the "jobs clicked into the UI can\'t be reviewed, versioned, or reliably promoted" problem. A DAB declares your jobs, DLT pipelines, notebooks, and models in a databricks.yml committed to Git, and the Databricks CLI deploys that desired state to a workspace. One source of truth defines multiple targets (dev/staging/prod) that override variables, run-as identity, and schedules, so the exact same code promotes across environments without drift. DAB is the supported successor to the older dbx tool and to hand-built jobs — it\'s built into the CLI as the official infrastructure-as-code path, bringing code review, environment parity, repeatable deploys, and Git-tag rollback to data/ML pipelines.'
    },
    {
      q: 'What does development mode do in a bundle target, and why does it matter?',
      a: 'A target with mode: development changes two important behaviors: (1) it prefixes deployed resource names with the developer\'s identity (e.g. [dev user] orders-etl), so many engineers can deploy the same bundle to a shared workspace without colliding; and (2) it pauses job schedules and marks resources as development, so a dev deploy never accidentally fires a production-looking job. production mode deploys real, unprefixed, scheduled resources and typically sets run_as to a service principal. This is how DAB gives you safe, isolated dev iteration from the same code that ships to prod.'
    },
    {
      q: 'Walk me through a CI/CD pipeline for Databricks jobs using Asset Bundles.',
      a: 'On a PR, CI runs `databricks bundle validate` (resolves variables, type-checks resources) plus unit tests — a broken bundle can\'t merge. On merge to main, CI authenticates as a service principal and runs `bundle deploy -t staging`, then integration tests against the staging workspace. For production, a tag or manual approval triggers `bundle deploy -t prod`: identical code, with the prod target overriding the catalog, schedule, and run-as identity. Rollback is just redeploying the previous Git tag. The key points to hit: deploys run as a service principal (not a person), environments are the same code with target overrides (no copy-paste), and everything is gated by review + tests before it reaches prod.'
    },
  ]);
}
