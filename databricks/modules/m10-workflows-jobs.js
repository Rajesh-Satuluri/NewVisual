import { createModuleShell, createIQSection } from '../components/module-shell.js';

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M10 · Orchestration',
    title: 'Workflows & Jobs',
    subtitle: 'Multi-task jobs, task dependencies, parameters, retries, alerts',
    tabs: [
      { id: 'dag',    label: '🔀 DAG & Tasks' },
      { id: 'params', label: '🔗 Parameters & Values' },
      { id: 'ops',    label: '⚙️ Reliability & Ops' },
      { id: 'iq',     label: '🎯 Interview Q&A' },
    ]
  });

  /* ─────────────────────────── TAB 1 · DAG & TASKS ─────────────────────────── */
  const node = (label, sub, color) => `
    <div style="background:var(--bg3);border:1px solid ${color};border-top:3px solid ${color};border-radius:8px;padding:8px 12px;min-width:118px;text-align:center">
      <div style="font-size:12px;font-weight:700;color:var(--text)">${label}</div>
      <div style="font-size:10px;color:var(--text3);margin-top:2px">${sub}</div>
    </div>`;
  const arrow = () => `<div style="color:var(--text3);font-size:16px;align-self:center">→</div>`;

  container.querySelector('#tab-dag').innerHTML = `
    <div class="section-pad">
      <div class="section-header">
        <div class="section-title">Multi-Task Jobs — a DAG of Tasks</div>
        <div class="section-desc">A Databricks Job is a directed acyclic graph. Each task declares its upstream dependencies with <code>depends_on</code>; the scheduler runs tasks as soon as all their parents succeed, fanning out and fanning back in.</div>
      </div>
      <div class="stats-row">
        <div class="stat-box"><div class="stat-val">1000</div><div class="stat-label">Max tasks per job</div></div>
        <div class="stat-box"><div class="stat-val">DAG</div><div class="stat-label">No cycles allowed</div></div>
        <div class="stat-box"><div class="stat-val">depends_on</div><div class="stat-label">Dependency edge</div></div>
        <div class="stat-box"><div class="stat-val">Parallel</div><div class="stat-label">Independent tasks run concurrently</div></div>
      </div>

      <div style="margin-top:24px;background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:22px 20px;overflow-x:auto">
        <div style="font-size:13px;font-weight:700;color:var(--accent);margin-bottom:16px">Example DAG — fan-out to Silver, fan-in to Gold</div>
        <div style="display:flex;gap:14px;align-items:stretch;min-width:640px">
          ${node('ingest_bronze', 'notebook', 'var(--blue)')}
          ${arrow()}
          <div style="display:flex;flex-direction:column;gap:12px">
            ${node('clean_orders', 'python_wheel', 'var(--amber)')}
            ${node('clean_customers', 'notebook', 'var(--amber)')}
            ${node('clean_events', 'spark_jar', 'var(--amber)')}
          </div>
          ${arrow()}
          ${node('build_gold', 'sql_task', 'var(--green)')}
          ${arrow()}
          ${node('publish', 'run_job_task', 'var(--accent)')}
        </div>
        <div style="font-size:11px;color:var(--text3);margin-top:14px;line-height:1.6">The three <strong style="color:var(--amber)">clean_*</strong> tasks each <code>depends_on: ingest_bronze</code> — they run in parallel (fan-out). <strong style="color:var(--green)">build_gold</strong> lists all three as dependencies, so it waits for the slowest to finish (fan-in / join). A missing edge = accidental parallelism; a cycle = validation error at job save time.</div>
      </div>

      <div class="section-header" style="margin-top:32px">
        <div class="section-title">Task Types</div>
        <div class="section-desc">A single job can mix task types — each task points at one unit of work</div>
      </div>
      <div class="info-grid" style="padding:0">
        <div class="info-card">
          <div class="info-card-icon">📓</div>
          <div class="info-card-title">Notebook</div>
          <div class="info-card-body">Runs a workspace or Git notebook. Parameters arrive as widgets (<code>dbutils.widgets.get</code>). The most common task type.</div>
        </div>
        <div class="info-card">
          <div class="info-card-icon">🐍</div>
          <div class="info-card-title">Python Script / Wheel</div>
          <div class="info-card-body"><code>spark_python_task</code> runs a <code>.py</code> file from workspace/DBFS/S3/Git. <code>python_wheel_task</code> runs an installed wheel's entry point with <code>parameters</code> or <code>named_parameters</code>.</div>
        </div>
        <div class="info-card">
          <div class="info-card-icon">☕</div>
          <div class="info-card-title">JAR</div>
          <div class="info-card-body"><code>spark_jar_task</code> invokes a <code>main_class_name</code> from an uploaded JAR — for compiled Scala/Java Spark jobs.</div>
        </div>
        <div class="info-card">
          <div class="info-card-icon">🗄️</div>
          <div class="info-card-title">SQL</div>
          <div class="info-card-body"><code>sql_task</code> runs a saved query, dashboard refresh, alert, or <code>.sql</code> file on a <strong>SQL warehouse</strong> (not a job cluster).</div>
        </div>
        <div class="info-card">
          <div class="info-card-icon">🔄</div>
          <div class="info-card-title">Delta Live Tables</div>
          <div class="info-card-body"><code>pipeline_task</code> triggers a DLT pipeline update. The pipeline manages its own clusters and lineage; the job just starts it and waits.</div>
        </div>
        <div class="info-card">
          <div class="info-card-icon">🧱</div>
          <div class="info-card-title">dbt</div>
          <div class="info-card-body"><code>dbt_task</code> runs <code>dbt</code> CLI commands (e.g. <code>dbt run</code>, <code>dbt test</code>) against a SQL warehouse using a dbt project from Git.</div>
        </div>
        <div class="info-card">
          <div class="info-card-icon">📦</div>
          <div class="info-card-title">Run Job</div>
          <div class="info-card-body"><code>run_job_task</code> triggers <em>another</em> job as a task — compose modular jobs and share reusable pipelines across teams.</div>
        </div>
        <div class="info-card">
          <div class="info-card-icon">🔀</div>
          <div class="info-card-title">Control Flow</div>
          <div class="info-card-body"><code>condition_task</code> (if/else branch on a value), <code>for_each_task</code> (fan out over an array), and run-if rules like <em>at least one succeeded</em> / <em>all done</em>.</div>
        </div>
      </div>
    </div>`;

  /* ──────────────────────── TAB 2 · PARAMETERS & VALUES ────────────────────── */
  container.querySelector('#tab-params').innerHTML = `
    <div class="section-pad">
      <div class="section-header">
        <div class="section-title">Parameterization &amp; Passing Data Between Tasks</div>
        <div class="section-desc">Two distinct mechanisms: <strong>job parameters</strong> (set once at launch, read anywhere) and <strong>task values</strong> (computed at runtime, passed downstream)</div>
      </div>

      <div class="info-grid" style="padding:0 0 8px">
        <div class="info-card">
          <div class="info-card-icon">🌐</div>
          <div class="info-card-title">Job Parameters</div>
          <div class="info-card-body">Key/value pairs defined on the job and fixed for the whole run. Referenced with <code>{{job.parameters.run_date}}</code> in any task's arguments. Override per-run via "Run now with different parameters" or the REST API.</div>
          <span class="info-card-tag">Set at launch</span>
        </div>
        <div class="info-card">
          <div class="info-card-icon">📤</div>
          <div class="info-card-title">Task Values</div>
          <div class="info-card-body">A task computes a value and publishes it: <code>dbutils.jobs.taskValues.set(key, value)</code>. Downstream tasks read <code>...get(taskKey, key)</code> or reference <code>{{tasks.t.values.k}}</code>. The proper way to pass a computed path/count/flag along the DAG.</div>
          <span class="info-card-tag">Computed at runtime</span>
        </div>
        <div class="info-card">
          <div class="info-card-icon">⚡</div>
          <div class="info-card-title">Dynamic Value References</div>
          <div class="info-card-body">Built-in <code>{{...}}</code> substitutions resolved by the scheduler: <code>{{job.id}}</code>, <code>{{job.run_id}}</code>, <code>{{job.start_time.iso_date}}</code>, <code>{{task.name}}</code>. No hardcoding run metadata.</div>
          <span class="info-card-tag">Injected by scheduler</span>
        </div>
      </div>

      <div style="margin-top:20px;background:var(--bg2);border-radius:10px;padding:18px 20px;max-width:760px">
        <div style="font-size:13px;font-weight:700;color:var(--accent);margin-bottom:12px">Publishing and consuming a task value</div>
        <div style="font-size:11px;color:var(--text3);margin-bottom:4px">Upstream task <code>ingest_bronze</code> (notebook):</div>
        <div class="code-block"><span class="cmt"># compute where this run wrote data, expose it downstream</span>
out = <span class="str">f"/mnt/silver/orders/{run_date}"</span>
dbutils.jobs.taskValues.<span class="kw">set</span>(key=<span class="str">"silver_path"</span>, value=out)
dbutils.jobs.taskValues.<span class="kw">set</span>(key=<span class="str">"row_count"</span>, value=<span class="num">50000</span>)</div>
        <div style="font-size:11px;color:var(--text3);margin:12px 0 4px">Downstream task <code>build_gold</code> (notebook) — read it in code:</div>
        <div class="code-block">path = dbutils.jobs.taskValues.<span class="kw">get</span>(
    taskKey=<span class="str">"ingest_bronze"</span>, key=<span class="str">"silver_path"</span>,
    default=<span class="str">"/mnt/silver/orders/latest"</span>, debugValue=<span class="str">"/tmp/dev"</span>)</div>
        <div style="font-size:11px;color:var(--text3);margin:12px 0 4px">…or reference it as an argument in the job definition:</div>
        <div class="code-block"><span class="str">"--input"</span>, <span class="str">"{{tasks.ingest_bronze.values.silver_path}}"</span></div>
        <div style="font-size:11px;color:var(--text3);margin-top:10px;line-height:1.6">Task values are JSON-serialized and capped (~48&nbsp;KiB) — pass <strong style="color:var(--text)">pointers</strong> (paths, ids, small scalars), never whole DataFrames. <code>debugValue</code> lets the notebook run interactively outside a job.</div>
      </div>

      <div class="section-header" style="margin-top:32px">
        <div class="section-title">How a reference reaches each task type</div>
      </div>
      <div class="compare-table-wrap" style="padding:0">
        <table class="compare-table">
          <thead><tr><th>Task type</th><th>How the parameter arrives</th><th>Read in code as</th></tr></thead>
          <tbody>
            <tr><td>Notebook</td><td class="tag-good">Widget</td><td><code>dbutils.widgets.get("run_date")</code></td></tr>
            <tr><td>Python script / wheel</td><td class="tag-good">CLI arg</td><td><code>argparse</code> / <code>sys.argv</code></td></tr>
            <tr><td>JAR</td><td class="tag-good">CLI arg</td><td><code>args: Array[String]</code> in main</td></tr>
            <tr><td>SQL</td><td class="tag-warn">Query param</td><td><code>:run_date</code> named marker</td></tr>
            <tr><td>DLT pipeline</td><td class="tag-warn">Pipeline config</td><td><code>spark.conf.get("run_date")</code></td></tr>
          </tbody>
        </table>
      </div>

      <div class="tip" style="max-width:760px">Anti-pattern: passing data by writing a scratch file to a shared S3 path and having the next task read it. It's a hidden dependency the DAG doesn't know about and races under retries. Use <strong>task values</strong> for scalars/pointers and let the <strong>DAG edge</strong> guarantee ordering.</div>
    </div>`;

  /* ─────────────────────── TAB 3 · RELIABILITY & OPS ───────────────────────── */
  container.querySelector('#tab-ops').innerHTML = `
    <div class="section-pad">
      <div class="section-header">
        <div class="section-title">Retries, Scheduling, Alerts &amp; Clusters</div>
        <div class="section-desc">The production surface: what runs it, when it runs, what happens on failure, and who pays</div>
      </div>

      <div class="section-header"><div class="section-title" style="font-size:14px">Retry policy (per task)</div></div>
      <div class="config-grid">
        <div class="config-card">
          <div class="config-name">max_retries</div>
          <div class="config-val">integer · default 0</div>
          <div class="config-desc">How many times to re-run the task after a failure. <code>-1</code> = retry indefinitely. Set to 2–3 for tasks that hit transient cloud/network errors.</div>
          <div class="config-impact impact-high">Impact: reliability</div>
        </div>
        <div class="config-card">
          <div class="config-name">min_retry_interval_millis</div>
          <div class="config-val">integer · default 0</div>
          <div class="config-desc">Minimum wait between attempts. A back-off (e.g. 60000 = 1 min) avoids hammering a downstream API that's rate-limiting you.</div>
          <div class="config-impact impact-medium">Impact: throttling</div>
        </div>
        <div class="config-card">
          <div class="config-name">retry_on_timeout</div>
          <div class="config-val">boolean · default false</div>
          <div class="config-desc">If a task exceeds <code>timeout_seconds</code>, retry it (true) rather than fail immediately. Useful only if timeouts are transient, not a stuck query.</div>
          <div class="config-impact impact-low">Impact: timeout handling</div>
        </div>
      </div>

      <div class="section-header" style="margin-top:28px"><div class="section-title" style="font-size:14px">Triggers &amp; scheduling</div></div>
      <div class="info-grid" style="padding:0">
        <div class="info-card">
          <div class="info-card-icon">⏰</div>
          <div class="info-card-title">Cron Schedule</div>
          <div class="info-card-body">Quartz cron + timezone, e.g. <code>0 0 6 * * ?</code> = 6am daily. Handles DST via the named timezone. Can be paused without deleting.</div>
        </div>
        <div class="info-card">
          <div class="info-card-icon">📥</div>
          <div class="info-card-title">File Arrival</div>
          <div class="info-card-body">Trigger when new files land at a storage location (external/Unity Catalog). Event-driven ingestion without a polling notebook.</div>
        </div>
        <div class="info-card">
          <div class="info-card-icon">🔁</div>
          <div class="info-card-title">Continuous</div>
          <div class="info-card-body">Keep one run always active — as it finishes, the next starts. For low-latency streaming-style jobs.</div>
        </div>
        <div class="info-card">
          <div class="info-card-icon">🚦</div>
          <div class="info-card-title">Concurrency &amp; Queue</div>
          <div class="info-card-body"><code>max_concurrent_runs</code> caps overlap; queueing holds a triggered run instead of dropping it when the job is busy.</div>
        </div>
      </div>

      <div class="section-header" style="margin-top:28px"><div class="section-title" style="font-size:14px">Notifications &amp; alerts</div></div>
      <div class="compare-table-wrap" style="padding:0">
        <table class="compare-table">
          <thead><tr><th>Channel</th><th>Fires on</th><th>Notes</th></tr></thead>
          <tbody>
            <tr><td>Email</td><td>start / success / failure</td><td class="tag-good">Simplest; multiple recipients</td></tr>
            <tr><td>Webhook</td><td>start / success / failure</td><td class="tag-good">POST to Slack / PagerDuty / custom endpoint</td></tr>
            <tr><td>System destination</td><td>same set</td><td class="tag-good">Reusable admin-managed target (Teams, Slack)</td></tr>
            <tr><td>Duration warning</td><td>run exceeds threshold</td><td class="tag-warn">SLA breach — <code>on_duration_warning_threshold_exceeded</code></td></tr>
            <tr><td>Streaming backlog</td><td>backlog thresholds</td><td class="tag-warn">Alert before a streaming task falls behind</td></tr>
          </tbody>
        </table>
      </div>
      <div class="tip" style="max-width:760px">Set notifications at the <strong>job</strong> level for overall outcome and at the <strong>task</strong> level for granular paging. Enable <em>no-alert-on-retry</em> so a task that fails once then succeeds doesn't page on-call.</div>

      <div class="section-header" style="margin-top:28px"><div class="section-title" style="font-size:14px">Job clusters vs all-purpose clusters</div></div>
      <div class="compare-table-wrap" style="padding:0">
        <table class="compare-table">
          <thead><tr><th></th><th>Job cluster</th><th>All-purpose / shared cluster</th></tr></thead>
          <tbody>
            <tr><td>Lifecycle</td><td class="tag-good">Created for the run, terminated after</td><td class="tag-warn">Long-lived, interactive</td></tr>
            <tr><td>Cost (DBU rate)</td><td class="tag-good">Lower "Jobs Compute" rate</td><td class="tag-bad">Higher "All-Purpose" rate</td></tr>
            <tr><td>Isolation</td><td class="tag-good">Fresh, dedicated per run</td><td class="tag-bad">Shared — noisy-neighbor &amp; library conflicts</td></tr>
            <tr><td>Startup</td><td class="tag-warn">~cold start each run (pools mitigate)</td><td class="tag-good">Already warm</td></tr>
            <tr><td>Best for</td><td class="tag-good">Scheduled production jobs</td><td class="tag-warn">Ad-hoc dev / debugging</td></tr>
          </tbody>
        </table>
      </div>
      <div style="font-size:11px;color:var(--text3);margin-top:10px;line-height:1.6;max-width:760px">Multiple tasks in one job can <strong style="color:var(--text)">share a single job cluster</strong> (define it once in <code>job_clusters</code>, reference by <code>job_cluster_key</code>) to avoid paying cold-start per task — or give heavy tasks their own sized cluster. Use <strong style="color:var(--text)">instance pools</strong> to cut startup latency.</div>

      <div class="section-header" style="margin-top:28px"><div class="section-title" style="font-size:14px">Cost attribution via tags</div></div>
      <div class="prose" style="max-width:760px">
        <p>Custom tags on a job cluster propagate to the underlying cloud VMs and to Databricks' billable-usage / system tables. Tag by <code>team</code>, <code>cost_center</code>, <code>pipeline</code>, and <code>env</code> to slice DBU spend in the account console or <code>system.billing.usage</code>. Without tags every job's cost is an undifferentiated lump.</p>
      </div>

      <div style="margin-top:16px;background:var(--bg2);border-radius:10px;padding:18px 20px;max-width:760px">
        <div style="font-size:13px;font-weight:700;color:var(--accent);margin-bottom:12px">Job definition (JSON) — tying it together</div>
        <div class="code-block">{
  <span class="str">"name"</span>: <span class="str">"daily_orders_etl"</span>,
  <span class="str">"parameters"</span>: [{ <span class="str">"name"</span>: <span class="str">"run_date"</span>, <span class="str">"default"</span>: <span class="str">"{{job.start_time.iso_date}}"</span> }],
  <span class="str">"schedule"</span>: { <span class="str">"quartz_cron_expression"</span>: <span class="str">"0 0 6 * * ?"</span>,
                <span class="str">"timezone_id"</span>: <span class="str">"America/New_York"</span> },
  <span class="str">"job_clusters"</span>: [{
    <span class="str">"job_cluster_key"</span>: <span class="str">"etl"</span>,
    <span class="str">"new_cluster"</span>: {
      <span class="str">"spark_version"</span>: <span class="str">"15.4.x-scala2.12"</span>,
      <span class="str">"node_type_id"</span>: <span class="str">"i3.xlarge"</span>, <span class="str">"num_workers"</span>: <span class="num">4</span>,
      <span class="str">"custom_tags"</span>: { <span class="str">"team"</span>: <span class="str">"data-eng"</span>, <span class="str">"cost_center"</span>: <span class="str">"cc-42"</span> }
    }
  }],
  <span class="str">"tasks"</span>: [
    { <span class="str">"task_key"</span>: <span class="str">"ingest_bronze"</span>, <span class="str">"job_cluster_key"</span>: <span class="str">"etl"</span>,
      <span class="str">"notebook_task"</span>: { <span class="str">"notebook_path"</span>: <span class="str">"/etl/bronze"</span> } },
    { <span class="str">"task_key"</span>: <span class="str">"build_gold"</span>, <span class="str">"job_cluster_key"</span>: <span class="str">"etl"</span>,
      <span class="str">"depends_on"</span>: [{ <span class="str">"task_key"</span>: <span class="str">"ingest_bronze"</span> }],
      <span class="str">"max_retries"</span>: <span class="num">2</span>, <span class="str">"min_retry_interval_millis"</span>: <span class="num">60000</span>,
      <span class="str">"retry_on_timeout"</span>: <span class="kw">true</span>, <span class="str">"timeout_seconds"</span>: <span class="num">3600</span>,
      <span class="str">"notebook_task"</span>: { <span class="str">"notebook_path"</span>: <span class="str">"/etl/gold"</span>,
        <span class="str">"base_parameters"</span>: { <span class="str">"date"</span>: <span class="str">"{{job.parameters.run_date}}"</span> } } }
  ],
  <span class="str">"email_notifications"</span>: { <span class="str">"on_failure"</span>: [<span class="str">"oncall@corp.com"</span>] },
  <span class="str">"tags"</span>: { <span class="str">"env"</span>: <span class="str">"prod"</span>, <span class="str">"pipeline"</span>: <span class="str">"orders"</span> }
}</div>
      </div>
    </div>`;

  /* ──────────────────────────── TAB 4 · INTERVIEW Q&A ──────────────────────── */
  container.querySelector('#tab-iq').innerHTML = createIQSection([
    {
      q: 'How do Databricks Workflows compare to Apache Airflow for orchestration?',
      a: 'Databricks Workflows is tightly integrated with the Lakehouse: job clusters spin up automatically, Delta Live Tables pipelines are first-class task types, and Unity Catalog lineage is tracked per job run. No separate orchestration infrastructure to manage. Airflow is more flexible for cross-system orchestration (trigger a Databricks job, then an S3 upload, then an API call) and has a larger operator ecosystem. Common pattern: Airflow for cross-system workflows with a DatabricksSubmitRunOperator to trigger Databricks jobs as subtasks, while Databricks Workflows handles all intra-platform dependencies (Bronze → Silver → Gold pipeline).'
    },
    {
      q: 'How do you pass parameters between tasks in a Databricks multi-task job?',
      a: 'Use task values: in an upstream task, dbutils.jobs.taskValues.set(key="output_path", value="/mnt/silver/orders/2024-01-15"). In a downstream task, dbutils.jobs.taskValues.get(taskKey="bronze_ingest", key="output_path"). Task values are strings serialized to the job\'s run state — available to all downstream tasks. For job-level parameters (e.g., run date), pass them as job parameters ({{job.parameters.run_date}}) at job invocation time. These work in notebook widgets, Python argparse, and SQL queries via {{run_date}}. Avoid using shared S3 paths or notebooks as message passing — task values are the proper mechanism.'
    },
    {
      q: 'A task in your job fails intermittently due to a rate-limited downstream API. How do you make the job resilient without paging on-call every time?',
      a: 'Configure a per-task retry policy: max_retries of 2–3 so transient failures self-heal, plus min_retry_interval_millis (e.g. 60000) to back off and stop hammering the rate-limited API. Set retry_on_timeout only if the timeouts themselves are transient rather than a genuinely stuck query. Then decouple retries from alerting: enable "no alert on retry" so the on_failure notification only fires when the task exhausts all retries and truly fails, not on each intermediate attempt. Keep a task-level timeout_seconds so a hung run is killed and retried rather than blocking the DAG forever. The result: transient blips are absorbed silently, and on-call is paged only for real, terminal failures.'
    },
  ]);
}
