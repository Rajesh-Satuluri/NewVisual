import { createModuleShell, createIQSection } from '../components/module-shell.js';

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M11 · Orchestration',
    title: 'MLflow & Model Serving',
    subtitle: 'Experiment tracking, model registry, real-time serving endpoints',
    tabs: [
      { id: 'tracking', label: '🧪 Tracking' },
      { id: 'registry', label: '📚 Registry (UC)' },
      { id: 'serving',  label: '⚡ Model Serving' },
      { id: 'features', label: '🧮 Feature Store' },
      { id: 'iq',       label: '🎯 Interview Q&A' },
    ]
  });

  /* ── TAB 1 · MLflow Tracking ─────────────────────────────────────────── */
  container.querySelector('#tab-tracking').innerHTML = `
    <div class="section-pad">
      <div class="section-header">
        <div class="section-title">MLflow Tracking</div>
        <div class="section-desc">Every model-building attempt is captured as a run inside an experiment — reproducible, comparable, queryable</div>
      </div>
      <div class="stats-row">
        <div class="stat-box"><div class="stat-val">Experiment</div><div class="stat-label">Groups related runs</div></div>
        <div class="stat-box"><div class="stat-val">Run</div><div class="stat-label">One execution</div></div>
        <div class="stat-box"><div class="stat-val">4</div><div class="stat-label">Params · Metrics · Artifacts · Tags</div></div>
        <div class="stat-box"><div class="stat-val">1 line</div><div class="stat-label">Autologging</div></div>
      </div>

      <div class="info-grid" style="margin-top:20px">
        <div class="info-card">
          <div class="info-card-icon">⚙️</div>
          <div class="info-card-title">Params</div>
          <div class="info-card-body">Input configuration logged once per run — hyperparameters like <code>learning_rate</code>, <code>max_depth</code>, feature set version. Immutable after logging.</div>
          <span class="info-card-tag">log_param</span>
        </div>
        <div class="info-card">
          <div class="info-card-icon">📈</div>
          <div class="info-card-title">Metrics</div>
          <div class="info-card-body">Numeric outputs that can be logged repeatedly with a step index — <code>train_loss</code> per epoch, final <code>auc</code>, <code>rmse</code>. MLflow stores the full time-series for curve plots.</div>
          <span class="info-card-tag">log_metric</span>
        </div>
        <div class="info-card">
          <div class="info-card-icon">📦</div>
          <div class="info-card-title">Artifacts</div>
          <div class="info-card-body">Files: the serialized model, feature importance plots, confusion matrices, requirements.txt, sample input. Stored in the run's artifact root (DBFS / cloud object storage).</div>
          <span class="info-card-tag">log_artifact</span>
        </div>
        <div class="info-card">
          <div class="info-card-icon">🏷️</div>
          <div class="info-card-title">Tags</div>
          <div class="info-card-body">Free-form key/value metadata — git commit SHA, cluster ID, dataset version, <code>mlflow.source.name</code>. Used to filter and group runs in the UI and via search.</div>
          <span class="info-card-tag">set_tag</span>
        </div>
      </div>

      <div style="padding:0 40px 8px">
        <div style="font-size:13px;font-weight:700;color:var(--accent);margin-bottom:2px">Autologging — instrument without touching training code</div>
        <div style="font-size:12px;color:var(--text2);line-height:1.7;max-width:760px">A single <code style="background:var(--bg3);padding:1px 5px;border-radius:4px;color:var(--accent)">mlflow.sklearn.autolog()</code> (also xgboost, pytorch, tensorflow, spark) patches the framework's <code>fit()</code> to automatically capture params, evaluation metrics, the model signature, an input example, and the model artifact. Databricks also autologs at the notebook level so every run is tracked even before you add explicit calls.</div>
      </div>

      <div style="padding:8px 40px 0;max-width:820px">
        <div class="code-block"><span class="cmt"># Track a training run — experiment → run → params/metrics/artifacts</span>
<span class="kw">import</span> mlflow
<span class="kw">from</span> sklearn.ensemble <span class="kw">import</span> GradientBoostingClassifier

mlflow.set_experiment(<span class="str">"/Users/ml/churn"</span>)
mlflow.sklearn.autolog()          <span class="cmt"># auto params + metrics + model</span>

<span class="kw">with</span> mlflow.start_run(run_name=<span class="str">"gbt-v3"</span>) <span class="kw">as</span> run:
    mlflow.log_param(<span class="str">"feature_set"</span>, <span class="str">"v12"</span>)
    model = GradientBoostingClassifier(max_depth=<span class="num">4</span>, learning_rate=<span class="num">0.05</span>)
    model.fit(X_train, y_train)
    mlflow.log_metric(<span class="str">"val_auc"</span>, <span class="num">0.912</span>)
    mlflow.set_tag(<span class="str">"git_sha"</span>, <span class="str">"a1b2c3d"</span>)

    <span class="cmt"># run.info.run_id is the immutable handle used to register the model</span>
    print(run.info.run_id)</div>
      </div>

      <div class="section-pad" style="padding-top:8px">
        <div class="tip"><strong>Reproducibility:</strong> because the run captures the git SHA, params, dataset version, and the exact environment (conda/pip), any teammate can reconstruct the model months later — the run ID is the single source of truth linking data, code, and result.</div>
      </div>
    </div>`;

  /* ── TAB 2 · Model Registry in Unity Catalog ─────────────────────────── */
  container.querySelector('#tab-registry').innerHTML = `
    <div class="section-pad">
      <div class="section-header">
        <div class="section-title">Model Registry in Unity Catalog</div>
        <div class="section-desc">Models are first-class UC objects — <code>catalog.schema.model</code> — governed by the same GRANTs and lineage as tables</div>
      </div>
      <div class="stats-row">
        <div class="stat-box"><div class="stat-val">3-level</div><div class="stat-label">catalog.schema.model</div></div>
        <div class="stat-box"><div class="stat-val">Versions</div><div class="stat-label">Immutable, auto-incrementing</div></div>
        <div class="stat-box"><div class="stat-val">@alias</div><div class="stat-label">Mutable named pointers</div></div>
        <div class="stat-box"><div class="stat-val">GRANT</div><div class="stat-label">Table-grade governance</div></div>
      </div>

      <div style="padding:20px 40px 0;max-width:760px">
        <div style="background:var(--bg2);border-radius:10px;padding:18px 20px">
          <div style="font-size:13px;font-weight:700;color:var(--accent);margin-bottom:10px">Aliases replace legacy Stages</div>
          <div style="font-size:12px;color:var(--text2);line-height:1.7">The old workspace registry used fixed stages — <code>None → Staging → Production → Archived</code>. The UC registry drops stages entirely in favor of <strong style="color:var(--text)">aliases</strong>: arbitrary, mutable named pointers to a specific version. Convention: <code style="background:var(--bg3);padding:1px 5px;border-radius:4px;color:var(--green)">@champion</code> = live production, <code style="background:var(--bg3);padding:1px 5px;border-radius:4px;color:var(--amber)">@challenger</code> = being evaluated. Promotion is just re-pointing the alias; rollback is instant and requires no endpoint reconfiguration.</div>
        </div>
      </div>

      <div class="compare-table-wrap">
        <table class="compare-table">
          <thead><tr><th>Concept</th><th>Legacy Workspace Registry</th><th>Unity Catalog Registry</th></tr></thead>
          <tbody>
            <tr><td>Namespace</td><td class="tag-warn">Flat, workspace-scoped name</td><td class="tag-good">catalog.schema.model (cross-workspace)</td></tr>
            <tr><td>Promotion model</td><td class="tag-warn">Fixed Stages (Staging/Production)</td><td class="tag-good">Flexible @aliases (champion/challenger)</td></tr>
            <tr><td>Access control</td><td class="tag-warn">Registry ACLs, separate system</td><td class="tag-good">UC GRANT (same as tables/volumes)</td></tr>
            <tr><td>Lineage</td><td class="tag-bad">Not linked to data</td><td class="tag-good">Model ↔ training table ↔ features in UC graph</td></tr>
            <tr><td>Governance scope</td><td class="tag-warn">Per-workspace</td><td class="tag-good">Account-wide metastore</td></tr>
          </tbody>
        </table>
      </div>

      <div style="padding:0 40px;max-width:820px">
        <div class="code-block"><span class="cmt"># Register the run's model into Unity Catalog, then set an alias</span>
<span class="kw">import</span> mlflow
mlflow.set_registry_uri(<span class="str">"databricks-uc"</span>)

<span class="cmt"># Creates version N under catalog.schema.model</span>
mv = mlflow.register_model(
    model_uri=<span class="str">f"runs:/{run_id}/model"</span>,
    name=<span class="str">"prod.ml.churn_gbt"</span>)

<span class="kw">from</span> mlflow <span class="kw">import</span> MlflowClient
client = MlflowClient()
client.set_registered_model_alias(<span class="str">"prod.ml.churn_gbt"</span>, <span class="str">"champion"</span>, mv.version)

<span class="cmt"># Load whatever @champion points to — no version number hard-coded</span>
model = mlflow.pyfunc.load_model(<span class="str">"models:/prod.ml.churn_gbt@champion"</span>)</div>
      </div>

      <div class="info-grid" style="padding-top:12px">
        <div class="info-card">
          <div class="info-card-icon">🔗</div>
          <div class="info-card-title">Lineage &amp; Governance</div>
          <div class="info-card-body">Because the model lives in UC, the metastore records the full graph: which Delta tables and feature tables trained it, which notebook/job produced it, and which endpoints serve it. <code>GRANT EXECUTE</code> controls who can load or deploy it.</div>
        </div>
        <div class="info-card">
          <div class="info-card-icon">🧬</div>
          <div class="info-card-title">Immutable Versions</div>
          <div class="info-card-body">Every <code>register_model</code> mints a new version with frozen metadata — source run ID, signature, dependencies. Versions never change; only the alias pointers move.</div>
        </div>
        <div class="info-card">
          <div class="info-card-icon">↩️</div>
          <div class="info-card-title">Instant Rollback</div>
          <div class="info-card-body">A bad deploy? Re-point <code>@champion</code> back to the prior version. Endpoints referencing the alias pick up the change with no config edit — mean-time-to-recovery is seconds.</div>
        </div>
      </div>
    </div>`;

  /* ── TAB 3 · Model Serving ───────────────────────────────────────────── */
  container.querySelector('#tab-serving').innerHTML = `
    <div class="section-pad">
      <div class="section-header">
        <div class="section-title">Model Serving Endpoints</div>
        <div class="section-desc">Serverless REST endpoints that autoscale, scale-to-zero, and split traffic across served model versions</div>
      </div>
      <div class="stats-row">
        <div class="stat-box"><div class="stat-val">Serverless</div><div class="stat-label">No cluster to manage</div></div>
        <div class="stat-box"><div class="stat-val">Scale→0</div><div class="stat-label">Idle endpoints cost nothing</div></div>
        <div class="stat-box"><div class="stat-val">&lt;100ms</div><div class="stat-label">Typical warm latency</div></div>
        <div class="stat-box"><div class="stat-val">REST</div><div class="stat-label">/serving-endpoints/../invocations</div></div>
      </div>

      <div class="info-grid" style="margin-top:20px">
        <div class="info-card">
          <div class="info-card-icon">⚡</div>
          <div class="info-card-title">Custom Model Serving</div>
          <div class="info-card-body">Serve any UC-registered model (sklearn, XGBoost, PyTorch, pyfunc) as a real-time endpoint. Databricks provisions serverless compute, loads the model, and exposes a scored REST API. Autoscales on request volume; scales to zero when idle.</div>
          <span class="info-card-tag">real-time</span>
        </div>
        <div class="info-card">
          <div class="info-card-icon">🪙</div>
          <div class="info-card-title">Foundation Model APIs — Pay-per-token</div>
          <div class="info-card-body">Shared, ready-to-use LLM endpoints billed per token (input+output). Zero setup, elastic. Ideal for spiky or exploratory GenAI workloads where you don't want dedicated capacity.</div>
          <span class="info-card-tag">pay-per-token</span>
        </div>
        <div class="info-card">
          <div class="info-card-icon">🚀</div>
          <div class="info-card-title">Provisioned Throughput</div>
          <div class="info-card-body">Dedicated GPU capacity for LLMs with guaranteed tokens/second and stable latency under load. Billed per hour of provisioned throughput — used for production GenAI with SLAs.</div>
          <span class="info-card-tag">LLM · SLA</span>
        </div>
        <div class="info-card">
          <div class="info-card-icon">🌡️</div>
          <div class="info-card-title">Cold Start Trade-off</div>
          <div class="info-card-body">Scale-to-zero saves cost but the first request after idle incurs a cold-start (model load) penalty. Keep <code>min_provisioned</code> &gt; 0 for latency-critical paths; allow zero for bursty internal tools.</div>
        </div>
      </div>

      <div class="compare-table-wrap">
        <table class="compare-table">
          <thead><tr><th>Serving mode</th><th>Billing</th><th>Latency profile</th><th>Best for</th></tr></thead>
          <tbody>
            <tr><td>Custom model (serverless)</td><td>Compute-hours (scale-to-zero)</td><td class="tag-good">Low when warm, cold-start when idle</td><td>Classic ML real-time inference</td></tr>
            <tr><td>Foundation Model — pay-per-token</td><td class="tag-good">Per input+output token</td><td class="tag-warn">Shared capacity, variable</td><td>Bursty / exploratory GenAI</td></tr>
            <tr><td>Foundation Model — provisioned throughput</td><td class="tag-warn">Per hour of reserved throughput</td><td class="tag-good">Guaranteed tokens/sec, stable</td><td>Production LLMs with SLAs</td></tr>
            <tr><td>External model (proxy)</td><td>Passthrough to provider</td><td>Provider-dependent</td><td>Governing OpenAI/Anthropic behind UC</td></tr>
          </tbody>
        </table>
      </div>

      <div class="section-header" style="padding:8px 40px 0;margin-bottom:8px">
        <div class="section-title">A/B Testing &amp; Canary via Traffic Splitting</div>
        <div class="section-desc">One endpoint can host multiple served entities; the config assigns each a traffic percentage</div>
      </div>
      <div style="padding:0 40px 0;max-width:760px">
        <div style="font-size:12px;color:var(--text2);line-height:1.7">An endpoint's config lists several <strong style="color:var(--text)">served entities</strong> (e.g. <code>@champion</code> and <code>@challenger</code>) and a <code>traffic_config</code> that routes a percentage of live requests to each. A <strong style="color:var(--text)">canary</strong> release sends 10% to the new version, watches metrics/inference-table logs, then ramps to 100% — or rolls back instantly by zeroing its weight. Because served entities point at aliases, promoting the challenger is a registry alias move, not a redeploy.</div>
      </div>

      <div style="padding:12px 40px 0;max-width:820px">
        <div class="code-block"><span class="cmt"># Endpoint hosting two versions with a 90/10 canary split</span>
<span class="kw">from</span> mlflow.deployments <span class="kw">import</span> get_deploy_client
client = get_deploy_client(<span class="str">"databricks"</span>)

client.update_endpoint(<span class="str">"churn-serving"</span>, config={
  <span class="str">"served_entities"</span>: [
    {<span class="str">"name"</span>: <span class="str">"champion"</span>,
     <span class="str">"entity_name"</span>: <span class="str">"prod.ml.churn_gbt"</span>, <span class="str">"entity_version"</span>: <span class="str">"12"</span>,
     <span class="str">"workload_size"</span>: <span class="str">"Small"</span>, <span class="str">"scale_to_zero_enabled"</span>: <span class="kw">False</span>},
    {<span class="str">"name"</span>: <span class="str">"challenger"</span>,
     <span class="str">"entity_name"</span>: <span class="str">"prod.ml.churn_gbt"</span>, <span class="str">"entity_version"</span>: <span class="str">"13"</span>,
     <span class="str">"workload_size"</span>: <span class="str">"Small"</span>, <span class="str">"scale_to_zero_enabled"</span>: <span class="kw">True</span>},
  ],
  <span class="str">"traffic_config"</span>: {<span class="str">"routes"</span>: [
    {<span class="str">"served_model_name"</span>: <span class="str">"champion"</span>,   <span class="str">"traffic_percentage"</span>: <span class="num">90</span>},
    {<span class="str">"served_model_name"</span>: <span class="str">"challenger"</span>, <span class="str">"traffic_percentage"</span>: <span class="num">10</span>},
  ]},
)</div>
      </div>

      <div class="section-pad" style="padding-top:8px">
        <div class="tip"><strong>Inference tables:</strong> enable request/response logging so every prediction from both champion and challenger lands in a Delta table — the ground truth for offline A/B analysis and drift monitoring.</div>
      </div>
    </div>`;

  /* ── TAB 4 · Feature Store / Feature Engineering in UC ────────────────── */
  container.querySelector('#tab-features').innerHTML = `
    <div class="section-pad">
      <div class="section-header">
        <div class="section-title">Feature Engineering in Unity Catalog</div>
        <div class="section-desc">Define a feature once, use the same code for training and serving — eliminating training-serving skew</div>
      </div>
      <div class="stats-row">
        <div class="stat-box"><div class="stat-val">Offline</div><div class="stat-label">Delta feature tables</div></div>
        <div class="stat-box"><div class="stat-val">Online</div><div class="stat-label">Low-latency lookup tables</div></div>
        <div class="stat-box"><div class="stat-val">PIT join</div><div class="stat-label">Point-in-time correctness</div></div>
        <div class="stat-box"><div class="stat-val">Packaged</div><div class="stat-label">Lookup logic baked into model</div></div>
      </div>

      <div class="info-grid" style="margin-top:20px">
        <div class="info-card">
          <div class="info-card-icon">🧊</div>
          <div class="info-card-title">Offline Store (Delta)</div>
          <div class="info-card-body">A feature table is a UC Delta table with a primary key. Batch pipelines compute features (e.g. 30-day spend) and write them here. Used to build training sets via lookups.</div>
        </div>
        <div class="info-card">
          <div class="info-card-icon">⏱️</div>
          <div class="info-card-title">Point-in-Time Joins</div>
          <div class="info-card-body">Training labels have timestamps. A PIT join fetches each feature <em>as it was</em> at the label's event time — never leaking future values. This is what makes offline training honest and prevents label leakage.</div>
        </div>
        <div class="info-card">
          <div class="info-card-icon">🌐</div>
          <div class="info-card-title">Online Tables</div>
          <div class="info-card-body">A synced, serverless, low-latency replica of a feature table. At inference the serving endpoint looks up fresh feature values here by primary key in single-digit milliseconds.</div>
        </div>
        <div class="info-card">
          <div class="info-card-icon">📎</div>
          <div class="info-card-title">Features Packaged with the Model</div>
          <div class="info-card-body">Training with <code>FeatureEngineeringClient.create_training_set</code> + <code>log_model</code> embeds the feature <em>lookup metadata</em> in the artifact — so the serving endpoint auto-retrieves features. Callers pass only the primary key.</div>
        </div>
      </div>

      <div style="padding:0 40px;max-width:820px">
        <div class="code-block"><span class="cmt"># One definition → training set (PIT) and packaged model</span>
<span class="kw">from</span> databricks.feature_engineering <span class="kw">import</span> FeatureEngineeringClient, FeatureLookup
fe = FeatureEngineeringClient()

lookups = [FeatureLookup(
    table_name=<span class="str">"prod.ml.customer_features"</span>,
    lookup_key=<span class="str">"customer_id"</span>,
    timestamp_lookup_key=<span class="str">"event_ts"</span>)]        <span class="cmt"># point-in-time correct</span>

training_set = fe.create_training_set(
    df=labels, feature_lookups=lookups, label=<span class="str">"churned"</span>)

<span class="cmt"># log_model records the lookups; serving resolves them from the online table</span>
fe.log_model(model=model, artifact_path=<span class="str">"model"</span>,
             flavor=mlflow.sklearn, training_set=training_set,
             registered_model_name=<span class="str">"prod.ml.churn_gbt"</span>)

<span class="cmt"># At inference the caller sends only the key — features fetched automatically</span>
<span class="cmt"># POST /serving-endpoints/churn/invocations  {"customer_id": 8842}</span></div>
      </div>

      <div class="section-pad" style="padding-top:8px">
        <div class="tip"><strong>Why it matters:</strong> the same <code>customer_features</code> definition feeds both the PIT-joined training set and the online lookup at serving time. There is no second implementation to drift — the model computes on identical feature logic in both worlds.</div>
      </div>
    </div>`;

  /* ── TAB 5 · Interview Q&A (preserved verbatim) ──────────────────────── */
  container.querySelector('#tab-iq').innerHTML = createIQSection([
    {
      q: 'What is the training-serving skew problem and how does Databricks Feature Store solve it?',
      a: 'Training-serving skew: the feature computation logic used during model training diverges from what\'s computed at inference time — causing silent accuracy degradation in production. Feature Store solves this by defining features once as Python functions, storing precomputed values in a Delta table (offline store), and using the same function definition to compute features at inference time (online store lookup or real-time computation). The model is trained with Feature Store\'s log_model which embeds the feature lookup logic in the model artifact — at serving time, the endpoint automatically retrieves the right features using the same code. One definition, two uses.'
    },
    {
      q: 'How does MLflow Model Registry\'s alias system work in production deployments?',
      a: 'Model Registry stores every logged model version with immutable metadata (run ID, training date, metrics). Aliases are mutable pointers to versions: @champion points to v12 (current production), @challenger points to v13 (being tested). Serving endpoints reference an alias, not a version number — so you can promote v13 to @champion without changing the endpoint configuration. Rollback is instant: point @champion back to v12. In Unity Catalog-integrated registry, models live in catalog.schema.model_name, and GRANT on the model controls who can promote or serve it — the same governance model as tables.'
    },
    {
      q: 'When would you choose provisioned throughput over pay-per-token for serving an LLM?',
      a: 'Both are Foundation Model APIs, but they trade cost against guarantees. Pay-per-token runs on shared capacity billed per input+output token — zero setup, elastic, and cheapest for spiky or low-volume workloads; the downside is variable latency and no throughput guarantee. Provisioned throughput reserves dedicated capacity with a committed tokens-per-second floor and stable latency under load, billed per hour of reserved throughput regardless of utilization. Choose provisioned throughput when you have a production SLA, steady high volume, or latency-sensitive user-facing traffic where a shared endpoint\'s tail latency is unacceptable; choose pay-per-token for prototyping, internal tools, and bursty demand where paying for idle reserved capacity would be wasteful.'
    },
  ]);
}
