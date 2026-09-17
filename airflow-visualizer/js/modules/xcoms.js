/* ============================================================
   modules/xcoms.js — cross-communication between tasks
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  var NODES = [
    { id: "a",    label: "extract_orders", sub: "returns a value", x: 40,  y: 90, w: 200, h: 66, color: "airflow" },
    { id: "xcom", label: "XCom",           sub: "metadata DB",     x: 380, y: 90, w: 200, h: 66, color: "purple" },
    { id: "b",    label: "transform_sales",sub: "receives arg",    x: 720, y: 90, w: 200, h: 66, color: "green" }
  ];
  var EDGES = [["a", "xcom"], ["xcom", "b"]];

  var STEPS = [
    { label: "1 · Task A produces a value", nodes: ["a"], edges: [],
      what: "<code>extract_orders</code> finishes and <b>returns</b> a value. In TaskFlow, returning from an <code>@task</code> pushes it to <b>XCom</b> automatically; in the classic API you call <code>ti.xcom_push()</code> explicitly.",
      why: "Tasks run as separate processes — often on different machines — so they share no memory. XCom is Airflow's built-in channel for handing a <i>small</i> result from one task to the next.",
      how: "The returned (or pushed) value is serialized and written to an XCom record at task completion, under the default key <code>return_value</code>.",
      when: "Any time a downstream task needs a small fact a previous task computed — an ID, a count, an S3 key.",
      mistake: "Returning a big object (a DataFrame, a file's contents) from a task. XCom is for <i>pointers and scalars</i>, not payloads — the metadata DB is not a data lake.",
      interview: "“Why can't two Airflow tasks just share a Python variable?” They're isolated processes, possibly on different hosts — no shared memory. XCom bridges them through the DB.",
      example: "ShopKart's <code>extract_orders</code> returns the row count and the S3 key it wrote — small facts the next task needs, not the order data itself." },
    { label: "2 · Push to XCom", nodes: ["a", "xcom"], edges: [["a", "xcom"]],
      what: "The value is stored as an <b>XCom row</b>, keyed by <code>dag_id</code>, <code>task_id</code>, <code>run_id</code>, and <code>key</code> (default <code>return_value</code>). By default it lives in the <b>metadata database</b>.",
      why: "Keying by run_id scopes the value to <i>this</i> DAG run, so today's extract can't accidentally read yesterday's number — each run gets an isolated hand-off.",
      how: "Airflow serializes the value (JSON by default) and inserts the row. A custom <code>xcom_backend</code> can redirect large values to S3/GCS while keeping a reference in the DB.",
      when: "On every push — implicit (a TaskFlow return) or explicit (<code>xcom_push</code>).",
      mistake: "Assuming XCom values are global. They're scoped per run and per key — a pull in a different run won't see them unless you deliberately widen the lookup.",
      interview: "“Where do XComs live by default, and what's the risk?” The metadata DB — so large XComs bloat it and slow the scheduler. Custom backends spill big values to object storage.",
      example: "ShopKart's row lands in Postgres keyed to <code>daily_sales_etl / extract_orders / scheduled__2024-01-15</code>, invisible to any other run." },
    { label: "3 · Task B pulls", nodes: ["xcom", "b"], edges: [["xcom", "b"]],
      what: "<code>transform_sales</code> <b>pulls</b> the XCom — explicitly via <code>xcom_pull(task_ids='extract_orders')</code>, or implicitly by taking A's output as a function argument in TaskFlow.",
      why: "The pull is how the consumer reads the producer's result. TaskFlow's implicit pull removes the boilerplate — you just call the function with the upstream's return value.",
      how: "<code>xcom_pull</code> looks up the row by task_ids + key and deserializes it. TaskFlow wires this automatically when you pass one task's output into another.",
      when: "Whenever a task needs a value an upstream task produced in the same run.",
      mistake: "Pulling from the wrong <code>task_ids</code> or <code>key</code> and silently getting <code>None</code>. A typo doesn't raise — it returns nothing, and the bug surfaces downstream.",
      interview: "“How does one task read another's output?” <code>xcom_pull</code> by task_ids/key, or implicitly via TaskFlow arguments. Mention the silent-<code>None</code> footgun.",
      example: "ShopKart's <code>transform_sales</code> pulls the S3 key from <code>extract_orders</code> and loads exactly the file that run wrote — no hard-coded path." },
    { label: "4 · Dependency + data", nodes: ["a", "xcom", "b"], edges: [["a", "xcom"], ["xcom", "b"]],
      what: "Passing the value also <b>creates the dependency</b> A → B. In TaskFlow, wiring an output into an input sets <i>both</i> the data hand-off and the execution order in one move.",
      why: "One expression meaning both “B needs A's data” and “B runs after A” is what lets TaskFlow read like ordinary Python while still building a correct DAG.",
      how: "<code>transform_sales(extract_orders())</code> both pulls the XCom and adds the edge. In the classic API you wire <code>extract &gt;&gt; transform</code> separately and pull by hand.",
      when: "Every TaskFlow pipeline where one task consumes another's result.",
      mistake: "In the classic API, pulling a value but forgetting the explicit <code>&gt;&gt;</code> dependency — B may run before A and pull a stale or missing XCom.",
      interview: "“In TaskFlow, do you still set dependencies manually?” Passing outputs to inputs sets them for you; you add explicit edges only for order-without-data relationships.",
      example: "ShopKart writes <code>transform_sales(extract_orders())</code> — the extract-then-transform order and the data hand-off are declared together, in one line." }
  ];

  var TASKFLOW =
    "@task\n" +
    "def extract_orders():\n" +
    "    return fetch()          # pushed to XCom\n" +
    "\n" +
    "@task\n" +
    "def transform_sales(orders): # pulled from XCom\n" +
    "    return build_kpis(orders)\n" +
    "\n" +
    "transform_sales(extract_orders())";
  var CLASSIC =
    "def _extract(**ctx):\n" +
    "    ctx[\"ti\"].xcom_push(key=\"orders\", value=fetch())\n" +
    "\n" +
    "def _transform(**ctx):\n" +
    "    orders = ctx[\"ti\"].xcom_pull(\n" +
    "        task_ids=\"extract\", key=\"orders\")";

  var module = {
    id: "xcoms",
    title: "XCom",
    fullWidth: true,
    _engine: null, _controls: null, _diagram: null, _off: null,

    render: function (container) {
      container.innerHTML =
        '<div class="module-header animate-fade-in-up">' +
          '<div class="module-eyebrow">Apache Airflow · Execution</div>' +
          '<h1 class="module-title">XCom: passing data between tasks</h1>' +
          '<p class="module-subtitle">Tasks are isolated processes, so they can\'t share memory. XCom (“cross-communication”) ' +
          "lets one task hand a <i>small</i> value to another through the metadata DB.</p>" +
        "</div>" +
        '<div class="arch-layout">' +
          '<div class="arch-canvas" id="xc-canvas"></div>' +
          '<aside class="arch-detail" id="xc-detail"></aside>' +
        "</div>" +
        '<div class="arch-controls" id="xc-controls"></div>' +
        '<section class="section" style="margin-top:var(--space-10)">' +
          '<h2 class="section-title">TaskFlow vs classic</h2>' +
          '<div class="two-col" id="xc-code"></div>' +
        "</section>" +
        '<section class="section">' +
          '<div class="callout danger"><span class="callout-icon">🚫</span><div class="callout-body">' +
          "<b>Don’t ship big data through XCom.</b> Values are serialized into the metadata DB — a few KB is fine, " +
          "a DataFrame is not. Pass a <b>pointer</b> (an S3 key, a table name) and let the next task fetch it.</div></div>" +
          '<div class="callout info"><span class="callout-icon">🗄️</span><div class="callout-body">' +
          "<b>Custom XCom backends</b> let large XComs spill to S3/GCS while keeping a reference in the DB — " +
          "configure via <code>xcom_backend</code>.</div></div>" +
        "</section>";

      var diagram = AV.ArchDiagram.create({ nodes: NODES, edges: EDGES, viewBox: "0 0 960 240", onSelect: function () {} });
      container.querySelector("#xc-canvas").appendChild(diagram.el);
      this._diagram = diagram;

      var detail = container.querySelector("#xc-detail");
      function defaultDetail() {
        detail.innerHTML =
          '<div class="arch-detail-title">Push, store, pull</div>' +
          "<p>Press play to watch a value travel from <code>extract_orders</code> to <code>transform_sales</code> via an XCom row.</p>" +
          '<div class="callout tip" style="margin-top:var(--space-4)"><span class="callout-icon">🔗</span>' +
          '<div class="callout-body">In TaskFlow, wiring outputs to inputs sets <b>both</b> the data hand-off and the task dependency.</div></div>';
      }
      function showStep(idx) {
        if (idx < 0) { defaultDetail(); return; }
        detail.innerHTML = AV.Explain.render(STEPS[idx]);
      }

      var cw = container.querySelector("#xc-code");
      cw.appendChild(AV.CodeViewer.create({ title: "TaskFlow — implicit", lang: "python", code: TASKFLOW, highlights: [3, 6, 9] }));
      cw.appendChild(AV.CodeViewer.create({ title: "classic — explicit", lang: "python", code: CLASSIC }));

      var engine = new AV.AnimationEngine({ steps: STEPS.map(function (s) { return { label: s.label, duration: 2600 }; }), speed: 1 });
      this._engine = engine;
      this._off = engine.on("stepchange", function (idx) {
        if (idx < 0) { diagram.clear(); showStep(-1); return; }
        var s = STEPS[idx];
        diagram.setActive(s.nodes, s.edges);
        showStep(idx);
      });
      var controls = AV.AnimationControls.create(engine, { title: "Ready — press play" });
      container.querySelector("#xc-controls").appendChild(controls.el);
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
