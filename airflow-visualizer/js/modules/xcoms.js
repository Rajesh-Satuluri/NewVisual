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
      desc: "<code>extract_orders</code> finishes and <b>returns</b> a value (or calls <code>xcom_push</code>). Returning from a TaskFlow <code>@task</code> pushes to XCom automatically." },
    { label: "2 · Push to XCom", nodes: ["a", "xcom"], edges: [["a", "xcom"]],
      desc: "The value is stored as an <b>XCom</b> row — keyed by dag_id, task_id, run_id, and key (default <code>return_value</code>). By default it lives in the <b>metadata DB</b>." },
    { label: "3 · Task B pulls", nodes: ["xcom", "b"], edges: [["xcom", "b"]],
      desc: "<code>transform_sales</code> pulls the XCom (explicitly via <code>xcom_pull</code>, or implicitly by taking A's output as an argument in TaskFlow)." },
    { label: "4 · Dependency + data", nodes: ["a", "xcom", "b"], edges: [["a", "xcom"], ["xcom", "b"]],
      desc: "Passing the value also <b>creates the dependency</b> A → B. XCom moves <i>small</i> data + wires the graph in one move." }
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
        detail.innerHTML = '<div class="arch-detail-title">' + STEPS[idx].label + "</div><p>" + STEPS[idx].desc + "</p>";
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
