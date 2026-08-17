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
      desc: "Airflow doesn't render Jinja in <i>every</i> argument — only those listed in a task's <code>template_fields</code> tuple. Built-in operators already declare which of their args are template fields. For custom operators, you declare them explicitly.",
      extras: []
    },
    {
      label: "2 · Date macros",
      expr: "{{ ds }}",
      rendered: "2024-01-15",
      desc: "The most-used macro. <code>{{ ds }}</code> is the execution date (YYYY-MM-DD) — use it in SQL WHERE clauses, S3 key prefixes, and any date-partitioned path. In Airflow 3 the canonical property is <code>logical_date</code>, but <code>ds</code> still works.",
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
      desc: "<code>{{ ts }}</code> is the full ISO 8601 timestamp. Use it when you need sub-day precision — e.g. an hourly DAG that writes to a log file keyed by minute. <code>{{ run_id }}</code> is the stable, unique run identifier.",
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
      desc: "<code>params</code> are per-run overrides defined in the DAG constructor (or passed at trigger time via the API). They're JSON-serializable, can be validated against a Pydantic schema, and are available in every template field.",
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
      desc: "<code>var.value.KEY</code> reads an Airflow Variable at task-render time. Use it for environment-specific config that doesn't belong in the DAG code itself. <code>var.json.KEY.field</code> parses a JSON Variable and accesses a nested field.",
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
      desc: "<code>conn.CONN_ID.ATTR</code> reads a Connection's attributes (host, port, login, password, schema, extras) at render time. Handy for constructing JDBC URLs or API endpoints in templated bash commands or SQL arguments.",
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
        detail.innerHTML = '<div class="arch-detail-title">' + s.label + "</div><p>" + s.desc + "</p>";
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
