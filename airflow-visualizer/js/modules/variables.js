/* ============================================================
   modules/variables.js — Variables & Params
   Two-panel comparison: global Variables vs per-run Params.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  var STEPS = [
    {
      active: "both",
      varHighlight: null, paramHighlight: null,
      label: "1 · Two tools for runtime config",
      desc: "Airflow provides two separate mechanisms to pass configuration into tasks at runtime: <b>Variables</b> (global, persistent key-value store) and <b>Params</b> (per-DAG, per-run configuration). They solve similar problems but at different scopes."
    },
    {
      active: "var",
      varHighlight: "scope", paramHighlight: null,
      label: "2 · Variables — global scope",
      desc: "<b>Variables</b> live in the metadata DB and are accessible from any DAG, any task, any run. Think of them as environment-level config: S3 bucket names, API base URLs, feature flag values — things that change between environments (dev/staging/prod) but not between individual runs."
    },
    {
      active: "param",
      varHighlight: null, paramHighlight: "scope",
      label: "3 · Params — per-run scope",
      desc: "<b>Params</b> are declared per-DAG and can be overridden at trigger time via the UI, the REST API, or <code>--conf</code> in the CLI. They're the right tool for: 'run this report for <i>this</i> date range', 'send to <i>this</i> recipient', 'process at <i>this</i> chunk size'."
    },
    {
      active: "var",
      varHighlight: "access", paramHighlight: null,
      label: "4 · Reading Variables",
      desc: "In Python: <code>Variable.get('s3_bucket')</code> or <code>Variable.get('limits', deserialize_json=True)</code>. In templates: <code>{{ var.value.s3_bucket }}</code> or <code>{{ var.json.limits.max_rows }}</code>. Variables are read at <b>task runtime</b>, not at parse time — a missing variable raises at execution, not load."
    },
    {
      active: "param",
      varHighlight: null, paramHighlight: "access",
      label: "5 · Reading Params",
      desc: "In Python callables: <code>context['params']['period']</code>. In templates: <code>{{ params.period }}</code>. Params can carry a Pydantic JSON schema — Airflow validates values at trigger time, rejecting bad input before the first task ever runs."
    },
    {
      active: "both",
      varHighlight: "secret", paramHighlight: "secret",
      label: "6 · Secrets & encryption",
      desc: "<b>Variables</b> can be stored via a secrets backend (Vault, SSM, GCP SM) and are encrypted at rest when a Fernet key is configured. <b>Params</b> are stored as part of the DagRun record — mark sensitive params with <code>hide_ui_value=True</code> (3.x) to redact them in the UI."
    }
  ];

  var VAR_PANELS = {
    scope:  { label: "Scope", val: "Global — any DAG, any task, any run" },
    access: { label: "Python access", val: "Variable.get('key')  |  Variable.get('key', deserialize_json=True)" },
    tpl:    { label: "Template", val: "{{ var.value.key }}  |  {{ var.json.key.field }}" },
    secret: { label: "Secrets", val: "Secrets backend + Fernet encryption at rest" },
    set:    { label: "Set via", val: "UI · REST API · Variable.set() · airflow variables set" }
  };
  var PARAM_PANELS = {
    scope:  { label: "Scope", val: "Per-DAG — overridden at trigger time per run" },
    access: { label: "Python access", val: "context['params']['key']" },
    tpl:    { label: "Template", val: "{{ params.key }}" },
    secret: { label: "Secrets", val: "hide_ui_value=True (3.x) to redact in UI" },
    set:    { label: "Set via", val: "UI trigger · REST API · --conf · DAG default_args" }
  };

  var CODE_VAR =
    "from airflow.models import Variable\n" +
    "\n" +
    "# Read a string variable\n" +
    "bucket = Variable.get('s3_bucket')          # 'shopkart-data-prod'\n" +
    "\n" +
    "# Read a JSON variable and deserialize\n" +
    "limits = Variable.get('limits', deserialize_json=True)\n" +
    "max_rows = limits['max_rows']               # 100_000\n" +
    "\n" +
    "# Safe initialization (won't raise if already set)\n" +
    "Variable.setdefault('feature_flags', '{\"v3_checkout\": true}')";

  var CODE_PARAM =
    "from airflow.models.param import Param\n" +
    "\n" +
    "with DAG(\n" +
    "    'daily_sales_etl',\n" +
    "    params={\n" +
    "        'period':       Param('daily', enum=['daily','weekly','monthly']),\n" +
    "        'target_env':   Param('prod',  type='string'),\n" +
    "        'chunk_size':   Param(5000,    type='integer', minimum=100),\n" +
    "    },\n" +
    ") as dag:\n" +
    "\n" +
    "    def export(**context):\n" +
    "        period = context['params']['period']  # 'monthly' if overridden\n" +
    "        ...\n" +
    "\n" +
    "# Trigger with override:\n" +
    "# airflow dags trigger daily_sales_etl --conf '{\"period\": \"monthly\"}'";

  var module = {
    id: "variables",
    title: "Variables & Params",
    fullWidth: true,
    _engine: null, _controls: null, _off: null,

    render: function (container) {
      container.innerHTML =
        '<div class="module-header animate-fade-in-up">' +
          '<div class="module-eyebrow">Apache Airflow · Operations</div>' +
          '<h1 class="module-title">Variables & Params: runtime configuration</h1>' +
          '<p class="module-subtitle">Variables are global key-value pairs accessible across all DAGs. ' +
          "Params are per-DAG configuration that callers override at trigger time. Both are resolved at task runtime — not at parse time.</p>" +
        "</div>" +
        '<div class="arch-layout">' +
          '<div class="arch-canvas" id="vp-canvas"><div class="var-compare" id="vp-viz"></div></div>' +
          '<aside class="arch-detail" id="vp-detail"></aside>' +
        "</div>" +
        '<div class="arch-controls" id="vp-controls"></div>' +
        '<section class="section" style="margin-top:var(--space-10)">' +
          '<div class="two-col-code" id="vp-codes"></div>' +
        "</section>" +
        '<section class="section">' +
          '<div class="callout warn"><span class="callout-icon">⏰</span><div class="callout-body">' +
          "<b>Variables are evaluated at task runtime, not parse time.</b> A top-level <code>Variable.get()</code> call in your DAG file runs on every parse cycle, creating one DB query per parse per variable. Move <code>Variable.get()</code> inside the callable or use a Jinja template instead.</div></div>" +
          '<div class="callout info"><span class="badge badge-v3">3.x</span><div class="callout-body">' +
          "<b>Param schema validation:</b> Airflow 3 validates Param values against their JSON Schema at trigger time, before any task runs. Invalid params are rejected immediately with a clear error — no waiting for a task to fail mid-run.</div></div>" +
        "</section>";

      var viz = container.querySelector("#vp-viz");
      var detail = container.querySelector("#vp-detail");

      function panelRows(panelData, highlightKey) {
        return Object.keys(panelData).map(function (k) {
          var row = panelData[k];
          return '<div class="var-row' + (k === highlightKey ? " var-row-hl" : "") + '">' +
            '<div class="var-row-label">' + row.label + "</div>" +
            '<div class="var-row-val"><code>' + row.val + "</code></div>" +
            "</div>";
        }).join("");
      }

      function renderViz(step) {
        if (!step) {
          viz.innerHTML =
            '<div class="var-panel"><div class="var-panel-label">Variables</div>' +
            '<div class="var-panel-title">Global config</div>' +
            '<p class="var-panel-desc">Persistent key-value store in the metadata DB. Any DAG, any task.</p></div>' +
            '<div class="var-panel"><div class="var-panel-label">Params</div>' +
            '<div class="var-panel-title">Per-run config</div>' +
            '<p class="var-panel-desc">Declared per-DAG, overridden at trigger time per run.</p></div>';
          return;
        }
        var varActive = step.active === "var" || step.active === "both";
        var paramActive = step.active === "param" || step.active === "both";
        viz.innerHTML =
          '<div class="var-panel' + (varActive ? " var-panel-active" : "") + '">' +
            '<div class="var-panel-label">Variables</div>' +
            '<div class="var-panel-title">Global config</div>' +
            panelRows(VAR_PANELS, step.varHighlight) +
          "</div>" +
          '<div class="var-panel' + (paramActive ? " var-panel-active" : "") + '">' +
            '<div class="var-panel-label">Params</div>' +
            '<div class="var-panel-title">Per-run config</div>' +
            panelRows(PARAM_PANELS, step.paramHighlight) +
          "</div>";
      }

      function showStep(idx) {
        if (idx < 0) {
          renderViz(null);
          detail.innerHTML =
            '<div class="arch-detail-title">Global vs per-run</div>' +
            "<p>Press play to compare Variables and Params across scope, access patterns, templating, and secrets handling.</p>";
          return;
        }
        renderViz(STEPS[idx]);
        detail.innerHTML = '<div class="arch-detail-title">' + STEPS[idx].label + "</div><p>" + STEPS[idx].desc + "</p>";
      }

      var codes = container.querySelector("#vp-codes");
      var varSection = document.createElement("div");
      varSection.className = "two-col-code-item";
      varSection.appendChild(AV.CodeViewer.create({ title: "Variables — reading & setting", lang: "python", code: CODE_VAR }));
      var paramSection = document.createElement("div");
      paramSection.className = "two-col-code-item";
      paramSection.appendChild(AV.CodeViewer.create({ title: "Params — declaring & triggering", lang: "python", code: CODE_PARAM }));
      codes.appendChild(varSection);
      codes.appendChild(paramSection);

      var engine = new AV.AnimationEngine({
        steps: STEPS.map(function (s) { return { label: s.label, duration: 2800 }; }), speed: 1
      });
      this._engine = engine;
      this._off = engine.on("stepchange", function (idx) { showStep(idx); });
      var controls = AV.AnimationControls.create(engine, { title: "Ready — press play" });
      container.querySelector("#vp-controls").appendChild(controls.el);
      this._controls = controls;
      showStep(-1);
    },

    destroy: function () {
      if (this._off) { this._off(); this._off = null; }
      if (this._controls) { this._controls.destroy(); this._controls = null; }
      if (this._engine) { this._engine.destroy(); this._engine = null; }
    }
  };

  AV.registerModule(module);
})();
