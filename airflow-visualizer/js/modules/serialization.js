/* ============================================================
   modules/serialization.js — how DAGs are serialized & who reads what
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  var NODES = [
    { id: "file", label: "DAG .py", sub: "Python objects", x: 40, y: 40, w: 165, h: 60, color: "airflow" },
    { id: "ser", label: "Serializer", sub: "→ JSON", x: 255, y: 40, w: 150, h: 60, color: "cyan" },
    { id: "json", label: "serialized_dag", sub: "JSON in the DB", x: 455, y: 40, w: 175, h: 60, color: "purple" },
    { id: "scheduler", label: "Scheduler", sub: "reads JSON", x: 720, y: 40, w: 160, h: 60, color: "green" },
    { id: "ui", label: "API Server / UI", sub: "reads JSON", x: 720, y: 150, w: 160, h: 60, color: "green" },
    { id: "worker", label: "Worker", sub: "imports the .py", x: 255, y: 210, w: 165, h: 60, color: "yellow" }
  ];
  var EDGES = [
    ["file", "ser"], ["ser", "json"], ["json", "scheduler"], ["json", "ui"], ["file", "worker"]
  ];

  var STEPS = [
    { label: "1 · You author Python", nodes: ["file"], edges: [],
      desc: "Your DAG file is rich Python — operator objects, callables, dependencies. But most of Airflow never runs this file." },
    { label: "2 · Serialize to JSON", nodes: ["file", "ser", "json"], edges: [["file", "ser"], ["ser", "json"]],
      desc: "The DAG processor serializes the DAG's <b>structure</b> (tasks, deps, params, schedule) into JSON and writes it to the <code>serialized_dag</code> table." },
    { label: "3 · Scheduler reads JSON", nodes: ["json", "scheduler"], edges: [["json", "scheduler"]],
      desc: "The scheduler reads the <b>serialized JSON</b> every loop — it never imports your <code>.py</code>. That's what keeps the loop fast and isolated from bad DAG code." },
    { label: "4 · UI reads JSON", nodes: ["json", "ui"], edges: [["json", "ui"]],
      desc: "The API server / UI also renders from JSON, so the grid and graph load instantly without importing anything." },
    { label: "5 · Only workers import the file", nodes: ["file", "worker"], edges: [["file", "worker"]],
      desc: "The <b>one</b> place your Python actually executes is the worker, when it runs a task. So your operators must be importable on the worker — and the params JSON-serializable.", warn: true }
  ];

  var JSON_SNIPPET =
    '{\n' +
    '  "dag": {\n' +
    '    "dag_id": "daily_sales_etl",\n' +
    '    "schedule": "0 2 * * *",\n' +
    '    "tasks": [\n' +
    '      {"task_id": "extract_orders", "operator": "PythonOperator"},\n' +
    '      {"task_id": "transform_sales", "operator": "PythonOperator"}\n' +
    '    ],\n' +
    '    "edges": [["extract_orders", "transform_sales"]]\n' +
    '  }\n' +
    '}';

  var module = {
    id: "serialization",
    title: "Serialization",
    fullWidth: true,
    _engine: null, _controls: null, _diagram: null, _off: null,

    render: function (container) {
      container.innerHTML =
        '<div class="module-header animate-fade-in-up">' +
          '<div class="module-eyebrow">Apache Airflow · Internals</div>' +
          '<h1 class="module-title">Serialization: why the scheduler never runs your file</h1>' +
          '<p class="module-subtitle">Airflow stores a JSON representation of every DAG and reads <i>that</i> almost everywhere. ' +
          "Understanding this split explains parsing performance, import errors, and a class of \"why won't my change apply\" bugs.</p>" +
        "</div>" +
        '<div class="arch-layout">' +
          '<div class="arch-canvas" id="sr-canvas"></div>' +
          '<aside class="arch-detail" id="sr-detail"></aside>' +
        "</div>" +
        '<div class="arch-controls" id="sr-controls"></div>' +
        '<section class="section" style="margin-top:var(--space-10)">' +
          '<h2 class="section-title">What the JSON looks like</h2>' +
          '<div id="sr-json"></div>' +
        "</section>" +
        '<section class="section">' +
          '<div class="callout danger"><span class="callout-icon">🧱</span><div class="callout-body">' +
          "<b>Params must be JSON-serializable.</b> A raw connection object or a lambda in <code>default_args</code> can't be " +
          "serialized — you'll get a serialization error, not a runtime one.</div></div>" +
          '<div class="callout info"><span class="badge badge-v3">3.x</span><div class="callout-body">' +
          "<b>DAG versioning:</b> Airflow 3 tracks serialized DAG <b>versions</b>, so the UI can show a run against the exact " +
          "structure it executed with — even after you edit the DAG.</div></div>" +
        "</section>";

      var diagram = AV.ArchDiagram.create({ nodes: NODES, edges: EDGES, viewBox: "0 0 960 300", onSelect: function () {} });
      container.querySelector("#sr-canvas").appendChild(diagram.el);
      this._diagram = diagram;

      var detail = container.querySelector("#sr-detail");
      function defaultDetail() {
        detail.innerHTML =
          '<div class="arch-detail-title">Two audiences, one DAG</div>' +
          "<p>Press play to see who reads the <b>serialized JSON</b> (scheduler, UI) and who imports the actual <b>.py</b> (only workers).</p>" +
          '<div class="callout tip" style="margin-top:var(--space-4)"><span class="callout-icon">⚡</span>' +
          '<div class="callout-body">Serialization is why the scheduler can evaluate hundreds of DAGs per loop without importing a single Python file.</div></div>';
      }
      function showStep(idx) {
        if (idx < 0) { defaultDetail(); return; }
        var s = STEPS[idx];
        detail.innerHTML = '<div class="arch-detail-title">' + s.label + "</div><p>" + s.desc + "</p>" +
          (s.warn ? '<div class="callout warn" style="margin-top:var(--space-3)"><span class="callout-icon">📦</span><div class="callout-body">A custom operator that imports fine locally but not on the worker is a classic “works in dev, fails in prod”.</div></div>' : "");
      }

      container.querySelector("#sr-json").appendChild(AV.CodeViewer.create({ title: "serialized_dag (abridged)", lang: "json", code: JSON_SNIPPET }));

      var engine = new AV.AnimationEngine({ steps: STEPS.map(function (s) { return { label: s.label, duration: 2600 }; }), speed: 1 });
      this._engine = engine;
      this._off = engine.on("stepchange", function (idx) {
        if (idx < 0) { diagram.clear(); showStep(-1); return; }
        var s = STEPS[idx];
        diagram.setActive(s.nodes, s.edges);
        showStep(idx);
      });
      var controls = AV.AnimationControls.create(engine, { title: "Ready — press play" });
      container.querySelector("#sr-controls").appendChild(controls.el);
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
