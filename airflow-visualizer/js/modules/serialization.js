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
      what: "You write a DAG as ordinary Python — operator objects, <code>@task</code> callables, dependencies wired with <code>&gt;&gt;</code>. It's expressive and dynamic.",
      why: "Python gives you loops, config, and helpers to build pipelines. But that richness is exactly what Airflow must <i>not</i> re-run everywhere, or one bad import could take the whole system down.",
      how: "At parse time Airflow runs this file once to discover the DAG object, then discards the live Python and keeps only a serialized description of what it found.",
      when: "Authored once by you; imported by the processor on each parse and by workers at task runtime — but never by the scheduler or UI.",
      mistake: "Assuming the scheduler “runs” your file. Only the processor (to serialize) and the worker (to execute a task) ever import your Python.",
      interview: "Interviewers love the framing “who actually runs your DAG file?” The answer — processor and worker, never scheduler/UI — signals you understand the architecture.",
      example: "ShopKart's <code>daily_sales.py</code> uses a Python loop to declare 12 regional extract tasks; that loop runs at <b>parse</b> time, not on the scheduler." },

    { label: "2 · Serialize to JSON", nodes: ["file", "ser", "json"], edges: [["file", "ser"], ["ser", "json"]],
      what: "The processor converts the DAG's <b>structure</b> — tasks, dependencies, params, schedule — into a JSON document and writes it to the <code>serialized_dag</code> table.",
      why: "A JSON snapshot is portable, fast to read, and safe: no user code runs when someone reads it. That's what lets the scheduler evaluate hundreds of DAGs per loop.",
      how: "Each operator becomes a JSON node (its type and arguments); edges become a list of pairs; the schedule and params ride along. Non-serializable values (a live hook, a lambda) raise a <b>serialization error</b> right here.",
      when: "On every parse where the DAG changed, immediately after it's built in memory.",
      mistake: "Stuffing unserializable objects into <code>default_args</code> or params, then being surprised by an error that looks nothing like a runtime bug.",
      interview: "A sharp answer connects serialization to two symptoms candidates often can't explain: fast scheduling and “why must params be JSON-serializable?”",
      example: "ShopKart's DAG collapses to a compact JSON tree; a teammate who tried to pass a raw DB connection in <code>default_args</code> hit a serialize error on the very next parse." },

    { label: "3 · Scheduler reads JSON", nodes: ["json", "scheduler"], edges: [["json", "scheduler"]],
      what: "The scheduler reads the <b>serialized JSON</b> from the DB every loop to decide what to run — it never imports your <code>.py</code>.",
      why: "Reading a pre-built snapshot keeps the loop fast and insulated: one slow or broken file can't stall scheduling for every other DAG.",
      how: "Each iteration the scheduler loads serialized DAGs, checks timetables, and creates runs and task instances — all from JSON. Turning code into JSON happened earlier, in the processor.",
      when: "Every scheduler loop (default heartbeat 5&nbsp;s), for every active DAG.",
      mistake: "Blaming the scheduler for a code change not applying. It only ever sees the <i>last serialized</i> version; the lag lives in the processor, not the loop.",
      interview: "Tie it together: “why is the Airflow scheduler fast even with thousands of DAGs?” Because it reads JSON, not Python — a classic senior signal.",
      example: "At 02:00 ShopKart's scheduler builds the nightly run purely from the serialized row, untouched by the Python loop that originally generated those 12 tasks." },

    { label: "4 · UI reads JSON", nodes: ["json", "ui"], edges: [["json", "ui"]],
      what: "The API server and web UI also render from the serialized JSON, so the Grid and Graph views draw instantly.",
      why: "If the UI had to import your files to draw a graph, every page load would risk running slow or broken code. Reading JSON makes the UI cheap and safe.",
      how: "When you open a DAG, the API server queries <code>serialized_dag</code> and returns the structure; the browser renders tasks and edges from that. Logs and states come from other tables — still no imports.",
      when: "On every UI/API request for a DAG's structure.",
      mistake: "Expecting the UI to reflect a code edit before the processor re-serializes. The graph shows the serialized version, so a just-saved change can look “missing.”",
      interview: "A tidy way to prove architectural understanding: the UI, like the scheduler, is a <i>reader</i> of serialized state — it owns none of it.",
      example: "ShopKart's on-call opens the Graph view at 03:00 and it loads instantly, because the API server is reading an 8&nbsp;KB JSON row, not importing a pipeline." },

    { label: "5 · Only workers import the file", nodes: ["file", "worker"], edges: [["file", "worker"]], warn: true,
      what: "The <b>one</b> place your Python actually executes is the <b>worker</b>, when it runs a task. It imports your file to reach the operator's real code.",
      why: "Someone has to run the actual logic. Confining that to the worker keeps risky user code off the scheduler and UI while still executing exactly what you wrote.",
      how: "To run a task the worker imports the module, reconstructs the operator, and calls <code>execute()</code>. So your code must be <i>importable on the worker</i> — same packages, same dependencies — even if it imported fine on your laptop.",
      when: "At task runtime, once per attempt, on whichever worker picks up the task.",
      mistake: "A custom operator that imports on your machine but not on the worker — the textbook “works in dev, fails in prod,” caused by a dependency missing from the worker image.",
      interview: "Expect “where does your DAG code actually run?” Answer: only on the worker, at execution time — which is why worker images must carry your imports.",
      example: "ShopKart added a <code>snowflake</code> import to a task; it passed locally but failed on workers until the library was baked into the worker image." }
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
        detail.innerHTML = AV.Explain.render(s) +
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
