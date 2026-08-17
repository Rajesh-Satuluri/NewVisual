/* ============================================================
   modules/scheduler.js — the scheduler loop
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  // Five nodes arranged around a loop (pentagon).
  var NODES = [
    { id: "parse",   label: "Parse DAGs",   sub: "read serialized bag", x: 285, y: 24,  w: 150, h: 58, color: "cyan" },
    { id: "create",  label: "Create runs",  sub: "timetable due?",      x: 500, y: 150, w: 150, h: 58, color: "airflow" },
    { id: "examine", label: "Examine TIs",  sub: "deps satisfied?",     x: 415, y: 372, w: 150, h: 58, color: "airflow" },
    { id: "enqueue", label: "Enqueue",      sub: "hand to executor",    x: 155, y: 372, w: 150, h: 58, color: "green" },
    { id: "collect", label: "Collect state",sub: "executor events",     x: 70,  y: 150, w: 150, h: 58, color: "purple" }
  ];
  var EDGES = [["parse", "create"], ["create", "examine"], ["examine", "enqueue"], ["enqueue", "collect"], ["collect", "parse"]];

  var STEPS = [
    { label: "1 · Parse serialized DAGs", nodes: ["parse"], edges: [["collect", "parse"]],
      desc: "Each loop the scheduler refreshes the <b>serialized DAGs</b> from the DB (parsing itself happens in the separate DAG processor in 3.x)." },
    { label: "2 · Create DAG runs", nodes: ["create"], edges: [["parse", "create"]],
      desc: "For every DAG whose <b>timetable</b> says a run is due, it creates a <b>DAG run</b> and the task instances in state <span class='state-chip scheduled'>scheduled</span>." },
    { label: "3 · Examine task instances", nodes: ["examine"], edges: [["create", "examine"]],
      desc: "It checks each scheduled TI: are <b>upstream deps</b> met, is there a free <b>pool slot</b>, is concurrency under the cap? Eligible TIs are selected." },
    { label: "4 · Enqueue to the executor", nodes: ["enqueue"], edges: [["examine", "enqueue"]],
      desc: "Runnable TIs are handed to the <b>executor</b> and move to <span class='state-chip queued'>queued</span>. The scheduler does <b>not</b> run tasks itself." },
    { label: "5 · Collect state & repeat", nodes: ["collect"], edges: [["enqueue", "collect"]],
      desc: "It reaps finished tasks from the executor, writes their final state, then loops again — every <b>scheduler_heartbeat_sec</b> (default 5&nbsp;s)." }
  ];

  var KNOBS = [
    { k: "scheduler_heartbeat_sec", v: "5 s", d: "How often the scheduler loop runs." },
    { k: "max_dagruns_to_create_per_loop", v: "10", d: "Cap on new DAG runs created per loop." },
    { k: "max_tis_per_query", v: "16", d: "Batch size when examining task instances." },
    { k: "parsing_processes", v: "2", d: "Processes dedicated to DAG parsing." }
  ];

  var CLI =
    "# Run the scheduler (one or many — it's HA-safe)\n" +
    "airflow scheduler\n" +
    "\n" +
    "# Airflow 3.x: parsing is its own process\n" +
    "airflow dag-processor";

  var module = {
    id: "scheduler",
    title: "Scheduler Internals",
    fullWidth: true,
    _engine: null, _controls: null, _diagram: null, _off: null,

    render: function (container) {
      container.innerHTML =
        '<div class="module-header animate-fade-in-up">' +
          '<div class="module-eyebrow">Apache Airflow · The Heart</div>' +
          '<h1 class="module-title">The scheduler loop</h1>' +
          '<p class="module-subtitle">The scheduler never runs your tasks — it decides <i>what</i> should run and hands ' +
          "it off. It spins this loop continuously; step through one full revolution below.</p>" +
        "</div>" +
        '<div class="arch-layout">' +
          '<div class="arch-canvas" id="sc-canvas"></div>' +
          '<aside class="arch-detail" id="sc-detail"></aside>' +
        "</div>" +
        '<div class="arch-controls" id="sc-controls"></div>' +
        '<section class="section" style="margin-top:var(--space-10)">' +
          '<h2 class="section-title">High availability</h2>' +
          '<div class="callout tip"><span class="callout-icon">💡</span><div class="callout-body">' +
          "Since Airflow 2.0 you can run <b>multiple active schedulers</b>. They coordinate through " +
          "<b>row-level locks</b> (<code>SELECT ... FOR UPDATE SKIP LOCKED</code>) on the metadata DB — no leader election, " +
          "just the database as the arbiter. More schedulers → higher task throughput.</div></div>" +
          '<div class="two-col" id="sc-code" style="margin-top:var(--space-4)"></div>' +
        "</section>" +
        '<section class="section">' +
          '<h2 class="section-title">Loop knobs</h2>' +
          '<div class="card-grid" id="sc-knobs"></div>' +
        "</section>";

      var diagram = AV.ArchDiagram.create({
        nodes: NODES, edges: EDGES, viewBox: "0 0 720 470",
        onSelect: function () {}
      });
      container.querySelector("#sc-canvas").appendChild(diagram.el);
      this._diagram = diagram;

      var detail = container.querySelector("#sc-detail");
      function defaultDetail() {
        detail.innerHTML =
          '<div class="arch-detail-title">One revolution</div>' +
          "<p>The scheduler repeats this five-stage loop forever. Press play to walk it once; " +
          "each stage lights up in the diagram.</p>" +
          '<div class="callout info" style="margin-top:var(--space-4)"><span class="callout-icon">🔒</span>' +
          '<div class="callout-body">Everything is coordinated through the metadata DB, which is why a slow DB is the ' +
          "#1 scheduler bottleneck.</div></div>";
      }
      function showStep(idx) {
        if (idx < 0) { defaultDetail(); return; }
        var s = STEPS[idx];
        detail.innerHTML = '<div class="arch-detail-title">' + s.label + "</div><p>" + s.desc + "</p>";
      }

      var code = AV.CodeViewer.create({ title: "start the scheduler", lang: "bash", code: CLI });
      var knobNote = AV.CodeViewer.create({
        title: "check it's alive", lang: "bash",
        code: "airflow jobs check --job-type SchedulerJob --hostname \"$(hostname)\""
      });
      var cc = container.querySelector("#sc-code");
      cc.appendChild(code);
      cc.appendChild(knobNote);

      container.querySelector("#sc-knobs").innerHTML = KNOBS.map(function (n) {
        return '<div class="card"><div class="card-title"><code>' + n.k + "</code></div>" +
          '<div class="knob-default">default <b>' + n.v + "</b></div><p>" + n.d + "</p></div>";
      }).join("");

      var engine = new AV.AnimationEngine({ steps: STEPS.map(function (s) { return { label: s.label, duration: 2600 }; }), speed: 1 });
      this._engine = engine;
      this._off = engine.on("stepchange", function (idx) {
        if (idx < 0) { diagram.clear(); showStep(-1); return; }
        var s = STEPS[idx];
        diagram.setActive(s.nodes, s.edges);
        showStep(idx);
      });
      var controls = AV.AnimationControls.create(engine, { title: "Ready — press play" });
      container.querySelector("#sc-controls").appendChild(controls.el);
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
