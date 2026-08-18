/* modules/planning-engine-stack.js — Rule → Solver → Rule (animated) */
(function () {
  "use strict";
  var AV = (window.SolverViz = window.SolverViz || {});

  var NODES = [
    { id: "rule-before", label: "Rule Engine", sub: "BEFORE solve", x: 40, y: 90, w: 190, h: 70, color: "rule" },
    { id: "solver", label: "The Solver", sub: "decides supply", x: 340, y: 85, w: 180, h: 80, color: "solver" },
    { id: "rule-after", label: "Rule Engine", sub: "AFTER solve", x: 620, y: 90, w: 190, h: 70, color: "rule" }
  ];
  var EDGES = [["rule-before", "solver"], ["solver", "rule-after"]];
  var STEPS = [
    { active: ["rule-before"], edges: [], label: "1 · Rule engine (before)", desc: "IBPL formulas prepare the demand signal (SplitWeek Final Forecast), build the BILT network graphs, calculate inventory positions and populate <b>all solver input parameters</b>." },
    { active: ["solver"], edges: [["rule-before", "solver"]], label: "2 · The solver", desc: "Consumes every prepared input, traverses the network from downstream demand up to upstream sources, respects all constraints, and writes supply plan quantities back to the model." },
    { active: ["rule-after"], edges: [["solver", "rule-after"]], label: "3 · Rule engine (after)", desc: "Reads solver outputs and computes derived values: exception flags, shortage quantities, delivery-plan metrics, cost valuations, <b>pegging results</b> and workbench signals." }
  ];

  var module = {
    id: "planning-engine-stack", title: "Planning Engine Stack", fullWidth: true,
    _engine: null, _controls: null, _diagram: null, _off: null,
    render: function (container) {
      container.innerHTML =
        '<div class="module-header animate-fade-in-up">' +
          '<div class="module-eyebrow">Foundations</div>' +
          '<h1 class="module-title gradient-text">The Planning Engine Stack</h1>' +
          '<p class="module-subtitle">The o9 planning engine has three layers — the solver sits in the middle, framed by the rule engine before and after every solve.</p>' +
        "</div>" +
        '<div class="arch-layout"><div class="arch-canvas" id="canvas-host"></div>' +
          '<aside class="arch-detail" id="detail"><h3>Ready — press play</h3><p>Watch data flow through the three layers of the o9 planning stack.</p></aside></div>' +
        '<div class="arch-controls" id="controls"></div>' +
        '<section class="section"><h2 class="section-title">Three layers, one pipeline</h2>' +
          '<dl class="concept-def">' +
            '<dt>Rule engine (before)</dt><dd>Calculates planning inputs via IBPL formulas — stages everything the solver reads.</dd>' +
            '<dt>Solver</dt><dd>Makes supply decisions using constrained optimization and heuristics.</dd>' +
            '<dt>Rule engine (after)</dt><dd>Formats and exposes results — exceptions, pegging, delivery metrics — to planners.</dd>' +
          "</dl>" +
          '<div class="callout tip"><span class="callout-icon">💡</span><div class="callout-body">Interview soundbite: <i>"The solver doesn\'t work alone — the rule engine feeds it and interprets it. Inputs are staged before the solve; exceptions and pegging are derived after."</i></div></div>' +
        "</section>";
      var diagram = AV.ArchDiagram.create({ nodes: NODES, edges: EDGES, viewBox: "0 0 860 240", onSelect: function () {} });
      container.querySelector("#canvas-host").appendChild(diagram.el);
      this._diagram = diagram;
      var detail = container.querySelector("#detail");
      function show(idx) {
        if (idx < 0) { diagram.clear(); return; }
        diagram.setActive(STEPS[idx].active, STEPS[idx].edges);
        detail.innerHTML = "<h3>" + STEPS[idx].label + "</h3><p>" + STEPS[idx].desc + "</p>";
      }
      var engine = new AV.AnimationEngine({ steps: STEPS.map(function (s) { return { label: s.label, duration: 2600 }; }), speed: 1 });
      this._engine = engine;
      this._off = engine.on("stepchange", function (idx) { show(idx); });
      var controls = AV.AnimationControls.create(engine, { title: "Ready — press play" });
      container.querySelector("#controls").appendChild(controls.el);
      this._controls = controls; show(-1);
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
