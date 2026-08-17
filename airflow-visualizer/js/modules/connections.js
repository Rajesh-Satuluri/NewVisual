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
      desc: "A connection bundles: <code>conn_id</code>, <code>conn_type</code>, <code>host</code>, <code>port</code>, <code>login</code>, <code>password</code>, <code>schema</code>, and <code>extras</code> (JSON). You can store it in the UI/DB, an environment variable, or a secrets backend."
    },
    {
      nodes: ["operator"], edges: [],
      label: "2 · Operator stores only conn_id",
      desc: "Operators (like <code>PostgresOperator</code>) accept a <code>conn_id</code> string — not the raw credentials. This keeps secrets out of your DAG code and lets you swap environments by changing one connection record."
    },
    {
      nodes: ["hook", "operator"], edges: [["hook", "operator"]],
      label: "3 · Hook resolves the connection at runtime",
      desc: "When the task executes, the operator calls its underlying hook (<code>PostgresHook</code>, <code>S3Hook</code>, etc.). The hook calls <code>BaseHook.get_connection(conn_id)</code> to look up the credentials — never earlier."
    },
    {
      nodes: ["secrets", "hook"], edges: [["secrets", "hook"]],
      label: "4 · Secrets backend checked first",
      desc: "If a secrets backend is configured (HashiCorp Vault, AWS SSM, GCP Secret Manager), <code>get_connection</code> tries it first. This is the recommended production pattern — credentials never touch the metadata DB."
    },
    {
      nodes: ["env_var", "hook"], edges: [["env_var", "hook"]],
      label: "5 · Env var fallback",
      desc: "<code>AIRFLOW_CONN_&lt;CONN_ID_UPPERCASE&gt;</code> is checked next. The value is a URI string (<code>postgres://user:pw@host:5432/db</code>) or a JSON blob. Ideal for CI/CD and container environments."
    },
    {
      nodes: ["db_conn", "hook"], edges: [["db_conn", "hook"]],
      label: "6 · Metadata DB as last fallback",
      desc: "If neither a secrets backend nor env var resolves the conn_id, the hook reads from the <code>connection</code> table in the metadata DB. The UI and REST API both write here. Good for development — less so for production credentials."
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
        detail.innerHTML = '<div class="arch-detail-title">' + s.label + "</div><p>" + s.desc + "</p>";
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
