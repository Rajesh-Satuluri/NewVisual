/* modules/solver-components.js — Consumption + Production + WIP (animated) */
(function () {
  "use strict";
  var AV = (window.SolverViz = window.SolverViz || {});
  var W = AV.CATMPN.widgetA;

  var NODES = [
    { id: "upstream", label: "Upstream node", sub: "Supplier X", x: 40, y: 100, w: 160, h: 58, color: "supplier" },
    { id: "cons", label: "Consumption", sub: "what leaves", x: 270, y: 40, w: 170, h: 58, color: "solver" },
    { id: "prod", label: "Production", sub: "what arrives", x: 270, y: 160, w: 170, h: 58, color: "solver" },
    { id: "wip", label: "WIP solver", sub: "intermediate", x: 270, y: 250, w: 170, h: 50, color: "rule" },
    { id: "downstream", label: "Downstream node", sub: "DC-North", x: 520, y: 100, w: 170, h: 58, color: "dc" }
  ];
  var EDGES = [["upstream", "cons"], ["cons", "downstream"], ["upstream", "prod"], ["prod", "downstream"]];
  var STEPS = [
    { active: ["cons"], edges: [["upstream", "cons"]], label: "1 · Consumption Solver", desc: "Models <b>what leaves</b> an upstream node. For Widget-A it decides the " + W.orderUnits + "-unit draw from Supplier X on the ship date — <span class=\"measure-pill\">Dist Cons Qty – BILT(D)(Solver)</span>." },
    { active: ["prod"], edges: [["prod", "downstream"]], label: "2 · Production Solver", desc: "Models <b>what arrives</b> at a downstream node — the " + W.orderUnits + "-unit planned receipt at DC-North in Week 3 — <span class=\"measure-pill\">Dist Prod Qty – BILT(D)</span>." },
    { active: ["wip"], edges: [], label: "3 · WIP component", desc: "Handles intermediate inventory states and <b>infeasibility resolution</b> — the work-in-progress between what left and what arrived." },
    { active: ["cons", "prod", "wip", "upstream", "downstream"], edges: [["upstream", "cons"], ["cons", "downstream"], ["upstream", "prod"], ["prod", "downstream"]], label: "4 · Coupled solve", desc: "The three components are <b>coupled</b> — together they model the full supply-chain flow, not just one side of it. That is the o9 Distribution Planning Solver." }
  ];

  var module = {
    id: "solver-components", title: "Solver Components", fullWidth: true,
    _engine: null, _controls: null, _diagram: null, _off: null,
    render: function (container) {
      container.innerHTML =
        '<div class="module-header animate-fade-in-up">' +
          '<div class="module-eyebrow">Foundations</div>' +
          '<h1 class="module-title gradient-text">Solver Components</h1>' +
          '<p class="module-subtitle">The CATMPN Distribution Planning Solver runs as two coupled components — a Consumption Solver and a Production Solver — plus a WIP component.</p>' +
        "</div>" +
        '<div class="arch-layout"><div class="arch-canvas" id="canvas-host"></div>' +
          '<aside class="arch-detail" id="detail"><h3>Ready — press play</h3><p>See how "what leaves" and "what arrives" are solved together.</p></aside></div>' +
        '<div class="arch-controls" id="controls"></div>' +
        '<section class="section"><h2 class="section-title">The three components</h2>' +
          '<dl class="concept-def">' +
            '<dt>Consumption Solver</dt><dd>Decides what leaves an upstream node (Dist Cons Qty).</dd>' +
            '<dt>Production Solver</dt><dd>Decides what arrives at a downstream node (Dist Prod Qty).</dd>' +
            '<dt>WIP component</dt><dd>Handles intermediate states and infeasibility resolution.</dd>' +
          "</dl>" +
          '<div><span class="measure-pill">Consumption Solver</span><span class="measure-pill">Production Solver</span><span class="measure-pill">WIP Solver</span><span class="measure-pill">BILT(ConsSolver) Graph</span></div>' +
        "</section>";
      var diagram = AV.ArchDiagram.create({ nodes: NODES, edges: EDGES, viewBox: "0 0 740 320", onSelect: function () {} });
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
