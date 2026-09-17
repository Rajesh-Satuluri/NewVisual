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
      what: "Airflow offers two separate mechanisms to pass config into tasks at runtime: <b>Variables</b> (a global, persistent key-value store) and <b>Params</b> (per-DAG, per-run configuration).",
      why: "They solve similar problems at <i>different scopes</i>. Confusing them puts config in the wrong place — a per-run value stored globally, or environment config re-entered on every trigger.",
      how: "Variables live in the metadata DB and are read anywhere; Params are declared on the DAG and overridden at trigger time. Both resolve at task runtime, not parse time.",
      when: "Any time a task needs a value that isn't hard-coded — pick the mechanism by scope.",
      mistake: "Reaching for Variables for everything, including values that really vary per run (a date range, a recipient) — that's what Params are for.",
      interview: "“Variables vs Params — when would you use each?” Global/persistent vs per-run/overridable. Getting the scope distinction right is the whole question.",
      example: "ShopKart stores its S3 bucket name as a Variable (same all runs) and its report date-range as a Param (set per trigger)."
    },
    {
      active: "var",
      varHighlight: "scope", paramHighlight: null,
      label: "2 · Variables — global scope",
      what: "<b>Variables</b> live in the metadata DB and are accessible from any DAG, any task, any run — environment-level config.",
      why: "Some config is constant across runs but changes between environments: bucket names, API base URLs, feature flags. A global store is the right home for exactly those.",
      how: "Set them via the UI, CLI, <code>Variable.set()</code>, or a secrets backend, and read them anywhere with <code>Variable.get()</code>. One change propagates to every DAG that reads the key.",
      when: "For values that differ by environment (dev/staging/prod) but not between individual runs.",
      mistake: "Putting per-run values in Variables, so two concurrent runs clobber each other by reading/writing the same global key.",
      interview: "“What kind of config belongs in a Variable?” Environment-level constants shared across DAGs — not anything that changes per run. That distinction is the tell.",
      example: "ShopKart keeps <code>s3_bucket = shopkart-data-prod</code> as a Variable so every DAG writes to the right bucket without hard-coding it."
    },
    {
      active: "param",
      varHighlight: null, paramHighlight: "scope",
      label: "3 · Params — per-run scope",
      what: "<b>Params</b> are declared per-DAG and can be overridden at trigger time via the UI, REST API, or <code>--conf</code> in the CLI — configuration that varies run to run.",
      why: "Some values are decided when you launch a run: which date range, which recipient, which chunk size. Params make those first-class and safely overridable per trigger.",
      how: "Declare <code>params={…}</code> on the DAG with defaults (and optional schema); override at trigger with <code>--conf '{\"period\":\"monthly\"}'</code>. Each run captures its own param values.",
      when: "For “run this for <i>this</i> input” — dates, targets, sizes chosen at trigger time.",
      mistake: "Hard-coding what should be a Param, then editing the DAG every time you need a different date range instead of just overriding at trigger.",
      interview: "“How do you pass per-run input to a DAG?” Params with a trigger-time <code>--conf</code> override (or the UI form). Contrast with Variables' global scope.",
      example: "ShopKart triggers its sales report with <code>--conf '{\"period\":\"monthly\"}'</code> to override the default <code>daily</code> Param for one run."
    },
    {
      active: "var",
      varHighlight: "access", paramHighlight: null,
      label: "4 · Reading Variables",
      what: "In Python: <code>Variable.get('s3_bucket')</code> or <code>Variable.get('limits', deserialize_json=True)</code>. In templates: <code>{{ var.value.s3_bucket }}</code> or <code>{{ var.json.limits.max_rows }}</code>.",
      why: "Variables are read at <b>task runtime</b>, not parse time — so a missing variable raises when the task runs, not when the DAG loads, keeping parsing fast and resilient.",
      how: "Call <code>Variable.get()</code> inside a callable, or use a Jinja template so the lookup happens at render time. JSON variables deserialize with <code>deserialize_json=True</code> or <code>var.json</code>.",
      when: "Inside task callables and templated fields — never at the top level of the DAG file.",
      mistake: "A top-level <code>Variable.get()</code> in the DAG body — it runs on every parse cycle, one DB query per parse per variable, taxing the scheduler.",
      interview: "“Why is a top-level <code>Variable.get()</code> a problem?” It executes at parse time, every cycle — a classic performance smell. Say “move it into the task or a template.”",
      example: "ShopKart reads <code>{{ var.value.s3_bucket }}</code> in a templated path, so the lookup happens per task run, not on every parse."
    },
    {
      active: "param",
      varHighlight: null, paramHighlight: "access",
      label: "5 · Reading Params",
      what: "In Python callables: <code>context['params']['period']</code>. In templates: <code>{{ params.period }}</code>. Params can carry a JSON schema that Airflow validates at trigger time.",
      why: "Schema validation rejects bad input <i>before</i> the first task runs — no waiting for a task to fail mid-run because someone passed <code>chunk_size = -5</code>.",
      how: "Declare <code>Param(default, type=…, enum=…, minimum=…)</code>; Airflow validates overrides against the schema at trigger, then exposes values via <code>context['params']</code> and <code>{{ params.* }}</code>.",
      when: "At trigger time (validation) and task runtime (access).",
      mistake: "Skipping the schema and accepting free-form <code>--conf</code>, so invalid values slip in and blow up deep inside a task.",
      interview: "“How do you validate run input in Airflow?” Params with a JSON schema, validated at trigger time. Mentioning early rejection (before any task) is the senior detail.",
      example: "ShopKart's <code>chunk_size</code> Param has <code>minimum=100</code>, so a fat-fingered <code>--conf '{\"chunk_size\":5}'</code> is rejected at trigger, not mid-load."
    },
    {
      active: "both",
      varHighlight: "secret", paramHighlight: "secret",
      label: "6 · Secrets & encryption",
      what: "<b>Variables</b> can come from a secrets backend and are encrypted at rest when a Fernet key is set. <b>Params</b> ride in the DagRun record — mark sensitive ones <code>hide_ui_value=True</code> (3.x) to redact them.",
      why: "Config often includes secrets (tokens, keys). Variables get proper secret handling; Params don't, so anything sensitive passed as a Param needs redaction — or shouldn't be a Param at all.",
      how: "Store secret Variables in Vault/SSM/GCP SM (or encrypt with Fernet in the DB). For Params, set <code>hide_ui_value=True</code> so the value isn't shown in the UI's run detail.",
      when: "Whenever config values are sensitive.",
      mistake: "Passing an API key as a plain Param, so it's stored and displayed in the DagRun's conf in the UI for anyone to read.",
      interview: "“Where do secret config values go — Variable or Param?” Prefer a secrets-backed Variable; if a Param must carry something sensitive, redact it with <code>hide_ui_value</code>.",
      example: "ShopKart keeps its export API token as a Vault-backed Variable, and marks a rare sensitive Param <code>hide_ui_value=True</code> so it's not shown in run details."
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
        detail.innerHTML = AV.Explain.render(STEPS[idx]);
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
