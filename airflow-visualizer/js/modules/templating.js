/* ============================================================
   modules/templating.js — Jinja2 templating in Airflow
   Animated before→after showcase of each macro category.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  var STEPS = [
    {
      label: "1 · template_fields",
      expr: "template_fields = ('bucket', 'key_prefix', 'query')",
      rendered: "only listed fields get Jinja rendered",
      what: "Airflow doesn't render Jinja in <i>every</i> argument — only those a task lists in its <code>template_fields</code> tuple. Built-in operators already declare theirs; for a custom operator you declare them yourself.",
      why: "Rendering every argument would be slow and unsafe (imagine templating a password by accident). An explicit allow-list keeps templating predictable and opt-in.",
      how: "Set <code>template_fields = ('bucket', 'key_prefix', 'query')</code> on the operator class. Just before <code>execute()</code>, Airflow walks those attributes and renders any Jinja it finds.",
      when: "Whenever you write a custom operator whose arguments should accept <code>{{ }}</code> expressions.",
      mistake: "Putting <code>{{ ds }}</code> in an argument that <i>isn't</i> a template field, then wondering why the literal string <code>{{ ds }}</code> reaches your code un-rendered.",
      interview: "“Why did my Jinja not render in a custom operator?” The argument wasn't in <code>template_fields</code>. Rendering is opt-in per field, not automatic on every kwarg.",
      example: "ShopKart's custom <code>S3Operator</code> lists <code>bucket</code>, <code>key_prefix</code>, and <code>query</code> as template fields so each can carry a run-date expression.",
      extras: []
    },
    {
      label: "2 · Date macros",
      expr: "{{ ds }}",
      rendered: "2024-01-15",
      what: "The workhorse macro. <code>{{ ds }}</code> is the run's logical date as <code>YYYY-MM-DD</code> — drop it into SQL <code>WHERE</code> clauses, S3 key prefixes, and any date-partitioned path.",
      why: "Idempotent, backfillable pipelines key work to the <i>run's</i> date, not <code>today()</code>. <code>{{ ds }}</code> gives each run a stable date, so re-running three weeks back reprocesses that day, not now.",
      how: "Airflow injects date macros into the render context. Variants like <code>{{ ds_nodash }}</code> (20240115) and <code>{{ prev_ds }}</code> cover common formatting and adjacent intervals.",
      when: "Every date-partitioned read or write — which is most batch ETL.",
      mistake: "Calling <code>datetime.now()</code> in task code instead of <code>{{ ds }}</code>. That breaks backfills — every historical run would stamp today's date.",
      interview: "“How do you make a task process the right day during a backfill?” Template on <code>{{ ds }}</code> (the logical date), never <code>now()</code>. This is <i>the</i> idempotency question.",
      example: "ShopKart's export writes to <code>orders/{{ ds_nodash }}/</code>, so a backfill of Jan 3 lands in <code>orders/20240103/</code> — not today's folder.",
      extras: [
        ["{{ ds }}", "2024-01-15"],
        ["{{ ds_nodash }}", "20240115"],
        ["{{ next_ds }}", "2024-01-16"],
        ["{{ prev_ds }}", "2024-01-14"]
      ]
    },
    {
      label: "3 · Timestamp macros",
      expr: "{{ ts }}",
      rendered: "2024-01-15T02:00:00+00:00",
      what: "<code>{{ ts }}</code> is the run's full ISO-8601 timestamp. Use it when you need sub-day precision — an hourly DAG keying a file by the minute — while <code>{{ run_id }}</code> gives a stable, unique run identifier.",
      why: "Some pipelines partition finer than a day. A timestamp (or the run_id) uniquely labels a run, so concurrent or hourly runs never collide on the same output path.",
      how: "<code>{{ ts }}</code>, <code>{{ ts_nodash }}</code>, and <code>{{ run_id }}</code> all come from the run context. Pick the one whose format matches your storage layout.",
      when: "Sub-daily schedules, or any output that must be uniquely named per run.",
      mistake: "Using <code>{{ ds }}</code> (day granularity) as a filename in an hourly DAG — every hour's run overwrites the same file.",
      interview: "“Your hourly runs keep clobbering each other's output — why?” The path is keyed to <code>{{ ds }}</code>, not <code>{{ ts_nodash }}</code>/<code>run_id</code>. A granularity mismatch.",
      example: "ShopKart's hourly clickstream job writes <code>events/{{ ts_nodash }}.parquet</code>, so the 02:00 and 03:00 runs land in distinct files.",
      extras: [
        ["{{ ts }}", "2024-01-15T02:00:00+00:00"],
        ["{{ ts_nodash }}", "20240115T020000"],
        ["{{ run_id }}", "scheduled__2024-01-15T02:00:00+00:00"],
        ["{{ logical_date }}", "2024-01-15 02:00:00+00:00"]
      ]
    },
    {
      label: "4 · Params",
      expr: "{{ params.period }}",
      rendered: "monthly",
      what: "<code>params</code> are per-run overrides declared in the DAG constructor (or passed at trigger time via the API/UI). They're JSON-serializable and available in every template field as <code>{{ params.KEY }}</code>.",
      why: "Params let one DAG cover many cases without code changes — the same pipeline runs “monthly” or “weekly”, “prod” or “staging”, chosen at trigger time.",
      how: "Define <code>params={'period': 'monthly'}</code> on the DAG and override at trigger. In Airflow 2.6+ you can validate them against a schema so a bad trigger is rejected early.",
      when: "Any DAG a human or system triggers with run-specific options.",
      mistake: "Reaching for a Variable (global, shared) when you want a <i>per-run</i> input. Params are scoped to the run; Variables are cluster-wide state.",
      interview: "“How do you pass an argument when manually triggering a DAG?” <code>params</code> (or the run <code>conf</code>), read via <code>{{ params.x }}</code>. Contrast with a Variable's global scope.",
      example: "ShopKart's report DAG takes <code>params.period</code>; analysts trigger it with <code>monthly</code> at quarter-end without touching the code.",
      extras: [
        ["{{ params.period }}", "monthly"],
        ["{{ params.target_env }}", "prod"],
        ["{{ params.chunk_size }}", "5000"],
        ["{{ params.report_email }}", "analytics@shopkart.com"]
      ]
    },
    {
      label: "5 · Variables",
      expr: "{{ var.value.s3_bucket }}",
      rendered: "shopkart-data-prod",
      what: "<code>{{ var.value.KEY }}</code> reads an Airflow <b>Variable</b> at render time; <code>{{ var.json.KEY.field }}</code> parses a JSON Variable and pulls a nested field. Use it for config that shouldn't be hard-coded in the DAG.",
      why: "Keeping bucket names, row limits, and feature flags in Variables lets you re-point a pipeline between environments (or flip a flag) without editing and redeploying DAG code.",
      how: "Reference <code>var.value</code>/<code>var.json</code> inside a template field. Airflow fetches the Variable from the metadata DB during rendering, just before the task runs.",
      when: "Config that changes by environment or over time but not per-run — bucket names, thresholds, flags.",
      mistake: "Calling <code>Variable.get()</code> at the <i>top level</i> of a DAG file. That hits the DB on every parse; template with <code>{{ var.value.x }}</code> so the read happens at run time.",
      interview: "“Why is <code>Variable.get()</code> at module top level a problem?” It runs on every DAG-parse, hammering the DB. Read Variables in templates or inside tasks, not at import.",
      example: "ShopKart templates <code>{{ var.value.s3_bucket }}</code> so the same DAG writes to <code>shopkart-data-prod</code> or <code>-staging</code> depending on the environment's Variable.",
      extras: [
        ["{{ var.value.s3_bucket }}", "shopkart-data-prod"],
        ["{{ var.value.env }}", "production"],
        ["{{ var.json.limits.max_rows }}", "100000"],
        ["{{ var.json.feature_flags.v3_checkout }}", "true"]
      ]
    },
    {
      label: "6 · Connections",
      expr: "{{ conn.warehouse.host }}",
      rendered: "wh.shopkart.internal",
      what: "<code>{{ conn.CONN_ID.ATTR }}</code> reads a <b>Connection</b>'s attributes — host, port, login, password, schema, extras — at render time. Handy for building JDBC URLs or API endpoints inside templated commands.",
      why: "Connections centralize (and secret-manage) where and how to reach a system. Templating from <code>conn</code> keeps hostnames and ports out of your DAG code and out of source control.",
      how: "Reference <code>conn.warehouse.host</code> and friends in a template field; Airflow resolves the Connection (and its secrets backend) during rendering.",
      when: "Constructing connection strings or endpoints for a templated Bash/SQL argument.",
      mistake: "Pasting a host, port, or password directly into DAG code instead of a Connection — leaking credentials into git and breaking environment portability.",
      interview: "“Where should database hosts and credentials live?” In a <b>Connection</b> (ideally a secrets backend), read via hooks or <code>{{ conn.x }}</code> — never hard-coded in the DAG.",
      example: "ShopKart builds its warehouse URL from <code>{{ conn.warehouse.host }}:{{ conn.warehouse.port }}</code>, so rotating the host is a Connection edit, not a code change.",
      extras: [
        ["{{ conn.warehouse.host }}", "wh.shopkart.internal"],
        ["{{ conn.warehouse.port }}", "5439"],
        ["{{ conn.warehouse.login }}", "etl_user"],
        ["{{ conn.warehouse.schema }}", "shopkart_prod"]
      ]
    }
  ];

  var CODE_FIELDS =
    "class ShopKartS3Operator(BaseOperator):\n" +
    "    # Jinja is rendered only for fields listed here\n" +
    "    template_fields = ('bucket', 'key_prefix', 'query')\n" +
    "    template_fields_renderers = {'query': 'sql'}  # UI syntax hint\n" +
    "\n" +
    "    def __init__(self, bucket, key_prefix, query, **kwargs):\n" +
    "        super().__init__(**kwargs)\n" +
    "        self.bucket     = bucket\n" +
    "        self.key_prefix = key_prefix\n" +
    "        self.query      = query\n" +
    "\n" +
    "# Usage — expressions are rendered right before execute() is called:\n" +
    "ShopKartS3Operator(\n" +
    "    task_id='export_orders',\n" +
    "    bucket='{{ var.value.s3_bucket }}',\n" +
    "    key_prefix='orders/{{ ds_nodash }}/',\n" +
    "    query=\"SELECT * FROM orders WHERE date = '{{ ds }}'\",\n" +
    ")";

  var module = {
    id: "templating",
    title: "Templating & Jinja",
    fullWidth: true,
    _engine: null, _controls: null, _off: null,

    render: function (container) {
      container.innerHTML =
        '<div class="module-header animate-fade-in-up">' +
          '<div class="module-eyebrow">Apache Airflow · Internals</div>' +
          '<h1 class="module-title">Templating & Jinja: runtime context in task args</h1>' +
          '<p class="module-subtitle">Airflow renders Jinja2 expressions in <code>template_fields</code> right before a task runs, ' +
          "giving you access to execution dates, run IDs, params, Variables, and Connections — no Python imports required.</p>" +
        "</div>" +
        '<div class="arch-layout">' +
          '<div class="arch-canvas" id="tpl-canvas"><div class="tpl-showcase" id="tpl-viz"></div></div>' +
          '<aside class="arch-detail" id="tpl-detail"></aside>' +
        "</div>" +
        '<div class="arch-controls" id="tpl-controls"></div>' +
        '<section class="section" style="margin-top:var(--space-10)">' +
          '<h2 class="section-title">Declaring template_fields in a custom operator</h2>' +
          '<div id="tpl-code"></div>' +
        "</section>" +
        '<section class="section">' +
          '<div class="callout warn"><span class="callout-icon">⏰</span><div class="callout-body">' +
          "<b>Templates are rendered at runtime, not parse time.</b> A Variable or Connection that doesn't exist yet won't error " +
          "until the task runs — not when the DAG loads. Use <code>airflow tasks render DAG_ID TASK_ID DS</code> to test rendering locally.</div></div>" +
          '<div class="callout tip"><span class="callout-icon">🔑</span><div class="callout-body">' +
          "<b>Jinja2 filters work too:</b> <code>{{ ds | replace('-', '/') }}</code>, <code>{{ params.name | upper }}</code>. " +
          "Any built-in Jinja2 filter applies inside template fields, including <code>tojson</code>, <code>trim</code>, and custom filters you register.</div></div>" +
        "</section>";

      var viz = container.querySelector("#tpl-viz");
      var detail = container.querySelector("#tpl-detail");

      function renderViz(step) {
        if (!step) {
          viz.innerHTML =
            '<div class="tpl-intro">' +
              '<div class="tpl-intro-label">Template expression</div>' +
              '<div class="tpl-arrow-row">' +
                '<span class="tpl-intro-expr">{{ macro }}</span>' +
                '<span class="tpl-arrow">&#8594;</span>' +
                '<span class="tpl-intro-val">rendered value</span>' +
              "</div>" +
              '<div class="tpl-intro-sub">Press play to walk through the macro categories.</div>' +
            "</div>";
          return;
        }
        var extrasHtml = "";
        if (step.extras && step.extras.length) {
          extrasHtml =
            '<div class="tpl-extras">' +
              step.extras.map(function (e) {
                return '<div class="tpl-extra-row">' +
                  '<code class="tpl-extra-expr">' + e[0] + "</code>" +
                  '<span class="tpl-extra-arrow">&#8594;</span>' +
                  '<code class="tpl-extra-val">' + e[1] + "</code>" +
                "</div>";
              }).join("") +
            "</div>";
        }
        viz.innerHTML =
          '<div class="tpl-demo">' +
            '<div class="tpl-side tpl-side-before">' +
              '<div class="tpl-side-label">Template expression</div>' +
              '<div class="tpl-expr">' + step.expr + "</div>" +
            "</div>" +
            '<div class="tpl-divider">&#8594;</div>' +
            '<div class="tpl-side">' +
              '<div class="tpl-side-label">Rendered (2024-01-15 run)</div>' +
              '<div class="tpl-value">' + step.rendered + "</div>" +
            "</div>" +
          "</div>" +
          extrasHtml;
      }

      function showStep(idx) {
        if (idx < 0) {
          renderViz(null);
          detail.innerHTML =
            '<div class="arch-detail-title">Jinja at runtime</div>' +
            "<p>Press play to explore each macro category — dates, timestamps, params, Variables, and Connections.</p>";
          return;
        }
        var s = STEPS[idx];
        renderViz(s);
        detail.innerHTML = AV.Explain.render(s);
      }

      container.querySelector("#tpl-code").appendChild(AV.CodeViewer.create({
        title: "custom operator + usage",
        lang: "python",
        code: CODE_FIELDS,
        highlights: [3, 15, 16, 17]
      }));

      var engine = new AV.AnimationEngine({
        steps: STEPS.map(function (s) { return { label: s.label, duration: 2800 }; }), speed: 1
      });
      this._engine = engine;
      this._off = engine.on("stepchange", function (idx) { showStep(idx); });
      var controls = AV.AnimationControls.create(engine, { title: "Ready — press play" });
      container.querySelector("#tpl-controls").appendChild(controls.el);
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
