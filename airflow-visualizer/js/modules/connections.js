/* ============================================================
   modules/connections.js — Connections & Hooks
   Arch diagram: 3 backend sources → Hook resolution → Operator.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  var NODES = [
    { id: "secrets",  label: "Secrets Backend",    sub: "Vault / SSM / GCP SM",   x: 20,  y: 30,  w: 185, h: 60, color: "purple" },
    { id: "env_var",  label: "Env Variable",       sub: "AIRFLOW_CONN_*",          x: 255, y: 30,  w: 185, h: 60, color: "cyan"   },
    { id: "db_conn",  label: "Metadata DB",        sub: "connection table (UI)",   x: 490, y: 30,  w: 185, h: 60, color: "airflow"},
    { id: "hook",     label: "Hook",               sub: "BaseHook.get_connection()",x: 215, y: 160, w: 265, h: 65, color: "yellow" },
    { id: "operator", label: "Operator",           sub: "uses hook internally",    x: 255, y: 295, w: 185, h: 60, color: "green"  }
  ];

  var EDGES = [
    ["secrets", "hook"], ["env_var", "hook"], ["db_conn", "hook"], ["hook", "operator"]
  ];

  var STEPS = [
    {
      nodes: ["secrets", "env_var", "db_conn"], edges: [],
      label: "1 · Three ways to define a connection",
      what: "A connection bundles <code>conn_id</code>, <code>conn_type</code>, <code>host</code>, <code>port</code>, <code>login</code>, <code>password</code>, <code>schema</code>, and JSON <code>extras</code>. You can store it in the UI/DB, an environment variable, or a secrets backend.",
      why: "Centralizing credentials behind a named <code>conn_id</code> keeps secrets out of DAG code and lets you swap environments (dev/staging/prod) by changing one record, not editing pipelines.",
      how: "Define the same <code>conn_id</code> in whichever store you choose. Airflow resolves it at runtime from the highest-priority source that has it — secrets backend, then env var, then DB.",
      when: "Whenever a task must reach an external system (database, API, cloud service).",
      mistake: "Hard-coding host/user/password directly in a DAG or operator call, scattering secrets across your codebase.",
      interview: "“What's in an Airflow connection, and where can it live?” Listing the fields plus the three stores (DB, env var, secrets backend) is a clean, complete answer.",
      example: "ShopKart defines a <code>warehouse</code> connection once; dev points it at a sandbox Postgres and prod at the real cluster — same DAG code, different record."
    },
    {
      nodes: ["operator"], edges: [],
      label: "2 · Operator stores only conn_id",
      what: "Operators (like <code>PostgresOperator</code>) accept a <code>conn_id</code> string — not raw credentials. Your DAG references the <i>name</i> of a connection, never its secret.",
      why: "Keeping only the <code>conn_id</code> in code means secrets never live in your repo, and rotating a password is a one-place change with zero DAG edits.",
      how: "You pass <code>postgres_conn_id='warehouse'</code>; the operator holds just that string and defers the actual lookup to its hook at execution time.",
      when: "In every operator that touches an external system.",
      mistake: "Passing a full connection URI or password as an operator argument, defeating the whole point of the <code>conn_id</code> indirection.",
      interview: "“How do you keep DB passwords out of your DAGs?” Operators reference a <code>conn_id</code>; credentials resolve at runtime from a store. Simple, and it's what interviewers want to hear.",
      example: "ShopKart's <code>aggregate_daily_sales</code> task carries only <code>postgres_conn_id='warehouse'</code> — the password lives in Vault, not the DAG."
    },
    {
      nodes: ["hook", "operator"], edges: [["hook", "operator"]],
      label: "3 · Hook resolves the connection at runtime",
      what: "When the task executes, the operator calls its underlying hook (<code>PostgresHook</code>, <code>S3Hook</code>, …), which calls <code>BaseHook.get_connection(conn_id)</code> to fetch the credentials — never earlier.",
      why: "Resolving at runtime (not parse time) means secrets are fetched only on the worker that needs them, and a missing connection fails the task, not the whole parse.",
      how: "The hook wraps the resolved connection into a ready-to-use client (a psycopg2 connection, a boto3 session). Operators use hooks internally; you can also call a hook directly in a callable.",
      when: "At task execution, once per task that needs the connection.",
      mistake: "Calling <code>BaseHook.get_connection()</code> at the top level of a DAG file — it then runs every parse, hammering your secrets backend.",
      interview: "“What's the difference between a connection and a hook?” A connection is the stored credentials; a hook resolves them and gives you a usable client. Knowing the split is the point.",
      example: "ShopKart's <code>export_to_s3</code> callable builds a <code>PostgresHook('warehouse')</code> at runtime to pull a DataFrame — the credential lookup happens right then."
    },
    {
      nodes: ["secrets", "hook"], edges: [["secrets", "hook"]],
      label: "4 · Secrets backend checked first",
      what: "If a secrets backend is configured (HashiCorp Vault, AWS SSM, GCP Secret Manager), <code>get_connection</code> tries it <b>first</b>. This is the recommended production pattern.",
      why: "A dedicated secrets store gives you rotation, audit, and access control, and keeps credentials out of the metadata DB entirely — the strongest posture for production.",
      how: "Configure <code>[secrets] backend</code>; on lookup Airflow queries it by a path convention (e.g. <code>airflow/connections/warehouse</code>). A hit there wins over env vars and the DB.",
      when: "In any environment where credentials must be centrally managed and rotated.",
      mistake: "Configuring a secrets backend but leaving a stale copy of the same <code>conn_id</code> in the DB — confusing, since the backend silently wins.",
      interview: "“Where should production credentials live?” A secrets backend, checked first — never the metadata DB. Naming Vault/SSM/GCP SM shows real-world familiarity.",
      example: "ShopKart stores the <code>warehouse</code> password in Vault; the hook fetches it at runtime and it never touches Postgres."
    },
    {
      nodes: ["env_var", "hook"], edges: [["env_var", "hook"]],
      label: "5 · Env var fallback",
      what: "<code>AIRFLOW_CONN_&lt;CONN_ID_UPPERCASE&gt;</code> is checked next. Its value is a URI (<code>postgres://user:pw@host:5432/db</code>) or a JSON blob.",
      why: "Env vars are ideal for CI/CD and containers — no DB write, no UI click, just an environment variable injected at deploy time. They're also great for ephemeral test runs.",
      how: "Export <code>AIRFLOW_CONN_WAREHOUSE=postgresql://…</code>; Airflow parses the URI into a connection object when a hook requests that <code>conn_id</code>, if no secrets backend resolved it first.",
      when: "In containerized/CI environments, or to override a connection for a single deployment.",
      mistake: "Committing an <code>AIRFLOW_CONN_*</code> value with a real password into a Dockerfile or CI YAML — it's still a secret, even as an env var.",
      interview: "“How do you inject a connection in CI without a DB or UI?” The <code>AIRFLOW_CONN_*</code> env var in URI form. It's the pattern for reproducible, code-driven config.",
      example: "ShopKart's CI sets <code>AIRFLOW_CONN_WAREHOUSE</code> to a throwaway Postgres so integration tests run without touching production connections."
    },
    {
      nodes: ["db_conn", "hook"], edges: [["db_conn", "hook"]],
      label: "6 · Metadata DB as last fallback",
      what: "If neither a secrets backend nor an env var resolves the <code>conn_id</code>, the hook reads from the <code>connection</code> table in the metadata DB. The UI and REST API both write here.",
      why: "The DB store is convenient for development and for connections you manage through the UI, but it's the weakest option for production secrets unless encryption is on.",
      how: "The hook queries the <code>connection</code> table; the password is encrypted at rest only if a <b>Fernet key</b> is configured. First match across the three sources wins, and the DB is last.",
      when: "For development, or for non-sensitive connections managed via the UI.",
      mistake: "Storing production passwords in the DB without a Fernet key — they sit in <i>plaintext</i>, readable by anyone with DB access.",
      interview: "“What's the resolution order for a connection?” Secrets backend → env var → metadata DB, first match wins. Add “DB needs Fernet to encrypt” for extra credit.",
      example: "ShopKart keeps a dev-only <code>warehouse</code> connection in the UI/DB for quick local testing, while production resolves the same <code>conn_id</code> from Vault."
    }
  ];

  var CODE =
    "from airflow.providers.postgres.hooks.postgres import PostgresHook\n" +
    "from airflow.providers.postgres.operators.postgres import PostgresOperator\n" +
    "\n" +
    "# Operator — stores only the conn_id string\n" +
    "run_query = PostgresOperator(\n" +
    "    task_id='aggregate_daily_sales',\n" +
    "    postgres_conn_id='warehouse',        # references a connection\n" +
    "    sql='SELECT date_trunc(...)',\n" +
    ")\n" +
    "\n" +
    "# Hook — when you need the connection object directly\n" +
    "def export_to_s3(**context):\n" +
    "    hook = PostgresHook(postgres_conn_id='warehouse')\n" +
    "    df = hook.get_pandas_df('SELECT * FROM orders WHERE ...')\n" +
    "    df.to_parquet(f's3://shopkart-data/{context[\"ds\"]}/orders.parquet')\n" +
    "\n" +
    "# Override with env var (URI format):\n" +
    "# AIRFLOW_CONN_WAREHOUSE=postgresql://etl:secret@wh.shopkart.internal:5439/prod";

  var BACKENDS = [
    ["HashiCorp Vault",     "airflow.providers.hashicorp.secrets.vault",      "VaultBackend"],
    ["AWS SSM / SecretsManager", "airflow.providers.amazon.aws.secrets.systems_manager", "SystemsManagerParameterStoreBackend"],
    ["GCP Secret Manager",  "airflow.providers.google.cloud.secrets.secret_manager", "CloudSecretManagerBackend"],
    ["Environment Variable","airflow.secrets.environment_variables",          "EnvironmentVariablesBackend"]
  ];

  var module = {
    id: "connections",
    title: "Connections & Hooks",
    fullWidth: true,
    _engine: null, _controls: null, _diagram: null, _off: null,

    render: function (container) {
      container.innerHTML =
        '<div class="module-header animate-fade-in-up">' +
          '<div class="module-eyebrow">Apache Airflow · Operations</div>' +
          '<h1 class="module-title">Connections & Hooks: managing credentials</h1>' +
          '<p class="module-subtitle">A <b>Connection</b> bundles credentials under a named <code>conn_id</code>. ' +
          "A <b>Hook</b> wraps it into a usable client. Operators call hooks internally — your DAG code only ever stores the connection name.</p>" +
        "</div>" +
        '<div class="arch-layout">' +
          '<div class="arch-canvas" id="cn-canvas"></div>' +
          '<aside class="arch-detail" id="cn-detail"></aside>' +
        "</div>" +
        '<div class="arch-controls" id="cn-controls"></div>' +
        '<section class="section" style="margin-top:var(--space-10)">' +
          '<h2 class="section-title">Operator vs Hook usage</h2>' +
          '<div id="cn-code"></div>' +
        "</section>" +
        '<section class="section">' +
          '<h2 class="section-title">Secrets backend providers</h2>' +
          '<div class="table-wrap"><table class="cmp-table" id="cn-table"></table></div>' +
        "</section>" +
        '<section class="section">' +
          '<div class="callout warn"><span class="callout-icon">🔒</span><div class="callout-body">' +
          "<b>Never hard-code credentials.</b> Even in <code>extras</code>, the password field is stored in plain text in the metadata DB unless you enable the Fernet key (<code>AIRFLOW__CORE__FERNET_KEY</code>). Use a secrets backend for production.</div></div>" +
          '<div class="callout info"><span class="badge badge-v3">3.x</span><div class="callout-body">' +
          "<b>Connection testing:</b> Airflow 3's UI adds a <i>Test Connection</i> button that calls the hook's <code>test_connection()</code> method — handy for verifying credentials before running a DAG.</div></div>" +
        "</section>";

      var diagram = AV.ArchDiagram.create({
        nodes: NODES, edges: EDGES, viewBox: "0 0 700 400", onSelect: function () {}
      });
      container.querySelector("#cn-canvas").appendChild(diagram.el);
      this._diagram = diagram;

      var detail = container.querySelector("#cn-detail");
      function defaultDetail() {
        detail.innerHTML =
          '<div class="arch-detail-title">conn_id → Hook → credentials</div>' +
          "<p>Press play to trace how a <code>conn_id</code> string becomes a live database connection at task runtime — and in what order Airflow searches for it.</p>" +
          '<div class="callout tip" style="margin-top:var(--space-4)"><span class="callout-icon">🔑</span>' +
          '<div class="callout-body">Resolution order: <b>Secrets Backend → Env Var → Metadata DB</b>. First match wins.</div></div>';
      }
      function showStep(idx) {
        if (idx < 0) { defaultDetail(); return; }
        var s = STEPS[idx];
        detail.innerHTML = AV.Explain.render(s);
      }

      container.querySelector("#cn-code").appendChild(AV.CodeViewer.create({
        title: "warehouse connection — operator & hook usage",
        lang: "python",
        code: CODE,
        highlights: [7, 13]
      }));

      var thead = "<thead><tr><th>Backend</th><th>Provider class</th><th>Class name</th></tr></thead>";
      container.querySelector("#cn-table").innerHTML = thead + "<tbody>" +
        BACKENDS.map(function (r) {
          return "<tr><td class='cmp-dim'>" + r[0] + "</td><td><code>" + r[1] + "</code></td><td><code>" + r[2] + "</code></td></tr>";
        }).join("") + "</tbody>";

      var engine = new AV.AnimationEngine({
        steps: STEPS.map(function (s) { return { label: s.label, duration: 2600 }; }), speed: 1
      });
      this._engine = engine;
      this._off = engine.on("stepchange", function (idx) {
        if (idx < 0) { diagram.clear(); showStep(-1); return; }
        diagram.setActive(STEPS[idx].nodes, STEPS[idx].edges);
        showStep(idx);
      });
      var controls = AV.AnimationControls.create(engine, { title: "Ready — press play" });
      container.querySelector("#cn-controls").appendChild(controls.el);
      this._controls = controls;
      defaultDetail();
    },

    destroy: function () {
      if (this._off) { this._off(); this._off = null; }
      if (this._controls) { this._controls.destroy(); this._controls = null; }
      if (this._engine) { this._engine.destroy(); this._engine = null; }
      if (this._diagram) { this._diagram.destroy(); this._diagram = null; }
    }
  };

  AV.registerModule(module);
})();
