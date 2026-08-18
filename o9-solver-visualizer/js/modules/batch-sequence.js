/* modules/batch-sequence.js — the nightly batch pipeline (animated) */
(function () {
  "use strict";
  var AV = (window.SolverViz = window.SolverViz || {});
  var NODES = [
    { id: "ingest", label: "Data ingestion", sub: "loads", x: 20, y: 100, w: 140, h: 54, color: "rule" },
    { id: "rule-b", label: "Rule engine", sub: "stage inputs", x: 200, y: 100, w: 140, h: 54, color: "rule" },
    { id: "solve", label: "SOLVER", sub: "decide supply", x: 380, y: 95, w: 150, h: 64, color: "solver" },
    { id: "rule-a", label: "Rule engine", sub: "derive", x: 570, y: 100, w: 140, h: 54, color: "rule" },
    { id: "outputs", label: "Outputs", sub: "workbench", x: 750, y: 100, w: 120, h: 54, color: "lc" }
  ];
  var EDGES = [["ingest", "rule-b"], ["rule-b", "solve"], ["solve", "rule-a"], ["rule-a", "outputs"]];
  var STEPS = [
    { active: ["ingest"], edges: [], label: "1 · Data ingestion", desc: "Overnight loads bring demand, inventory, orders and master data into the o9 model." },
    { active: ["rule-b"], edges: [["ingest", "rule-b"]], label: "2 · Rule engine (pre-solve)", desc: "IBPL formulas stage the SplitWeek forecast, build BILT graphs, and populate every solver input." },
    { active: ["solve"], edges: [["rule-b", "solve"]], label: "3 · The solve", desc: "The DRP solver traverses the network and writes supply plan quantities back to the model." },
    { active: ["rule-a"], edges: [["solve", "rule-a"]], label: "4 · Rule engine (post-solve)", desc: "Reads solver outputs to compute exceptions, shortage quantities, delivery metrics, cost and pegging." },
    { active: ["outputs"], edges: [["rule-a", "outputs"]], label: "5 · Outputs exposed", desc: "Supply / Inventory / Delivery plans and exceptions land in workbooks — the Buyer sees them at 8 AM." }
  ];
  var module = {
    id: "batch-sequence", title: "Batch Sequence", fullWidth: true,
    _engine: null, _controls: null, _diagram: null, _off: null,
    render: function (container) {
      container.innerHTML =
        '<div class="module-header animate-fade-in-up"><div class="module-eyebrow">Execution &amp; Outputs</div>' +
          '<h1 class="module-title gradient-text">The Nightly Batch Sequence</h1>' +
          '<p class="module-subtitle">The solver runs inside a larger automated batch — from data ingestion all the way to workbench-ready supply plan outputs.</p></div>' +
        '<div class="arch-layout"><div class="arch-canvas" id="canvas-host"></div>' +
          '<aside class="arch-detail" id="detail"><h3>Ready — press play</h3><p>Follow one nightly run end to end.</p></aside></div>' +
        '<div class="arch-controls" id="controls"></div>' +
        '<section class="section"><h2 class="section-title">Where the solve sits</h2>' +
          '<div class="callout info"><span class="callout-icon">🌙</span><div class="callout-body">The solve is a single stage in a fully automated daily cycle. Because it runs every 24 hours, any demand change, inventory correction or supplier delay is re-optimised across the whole network without human intervention.</div></div></section>';
      var diagram = AV.ArchDiagram.create({ nodes: NODES, edges: EDGES, viewBox: "0 0 890 175", onSelect: function () {} });
      container.querySelector("#canvas-host").appendChild(diagram.el);
      this._diagram = diagram;
      var detail = container.querySelector("#detail");
      function show(idx) { if (idx < 0) { diagram.clear(); return; } diagram.setActive(STEPS[idx].active, STEPS[idx].edges); detail.innerHTML = "<h3>" + STEPS[idx].label + "</h3><p>" + STEPS[idx].desc + "</p>"; }
      var engine = new AV.AnimationEngine({ steps: STEPS.map(function (s) { return { label: s.label, duration: 2400 }; }), speed: 1 });
      this._engine = engine; this._off = engine.on("stepchange", function (idx) { show(idx); });
      var controls = AV.AnimationControls.create(engine, { title: "Ready — press play" });
      container.querySelector("#controls").appendChild(controls.el); this._controls = controls; show(-1);
    },
    destroy: function () { if (this._off) { this._off(); this._off = null; } if (this._controls) { this._controls.destroy(); this._controls = null; } if (this._engine) { this._engine.destroy(); this._engine = null; } if (this._diagram) { this._diagram.destroy(); this._diagram = null; } }
  };
  AV.registerModule(module);
})();
