/* modules/drp-overview.js — Distribution Requirements Planning (animated) */
(function () {
  "use strict";
  var AV = (window.SolverViz = window.SolverViz || {});
  var NODES = [
    { id: "l1", label: "L1 · Customer LC", sub: "SCS Fcst Qty", x: 560, y: 20, w: 200, h: 56, color: "lc" },
    { id: "l2", label: "L2 · Regional DC", sub: "DRP Indep Demand", x: 380, y: 110, w: 200, h: 56, color: "dc" },
    { id: "l3", label: "L3 · Central DC", sub: "Consolidated req", x: 200, y: 200, w: 200, h: 56, color: "dc" },
    { id: "l4", label: "L4 · Supplier", sub: "Purchase Schedule", x: 20, y: 290, w: 200, h: 56, color: "supplier" }
  ];
  var EDGES = [["l1", "l2"], ["l2", "l3"], ["l3", "l4"]];
  var STEPS = [
    { active: ["l1"], edges: [], label: "Level 1 · Customer-facing LCs", desc: "Customer demand (<b>SCS Fcst Qty</b>) at LC-Store-A is the starting point of the whole plan." },
    { active: ["l2"], edges: [["l1", "l2"]], label: "Level 2 · Regional DCs", desc: "Level-1 demand becomes the independent demand signal for the upstream DC — <b>DRP Independent Demand</b> at DC-North." },
    { active: ["l3"], edges: [["l2", "l3"]], label: "Level 3 · Central / National DC", desc: "Consolidated requirements from all Regional DCs flow upward to DC-National." },
    { active: ["l4"], edges: [["l3", "l4"]], label: "Level 4 · Supplier", desc: "Net requirements at the top become <b>Purchase Schedule</b> recommendations to Supplier X." },
    { active: ["l1", "l2", "l3", "l4"], edges: [["l1", "l2"], ["l2", "l3"], ["l3", "l4"]], label: "One integrated solve", desc: "The solver traverses <b>all levels in a single pass</b>, so the supplier purchase schedule is perfectly aligned with customer-facing demand." }
  ];
  var module = {
    id: "drp-overview", title: "DRP Overview", fullWidth: true,
    _engine: null, _controls: null, _diagram: null, _off: null,
    render: function (container) {
      container.innerHTML =
        '<div class="module-header animate-fade-in-up"><div class="module-eyebrow">DRP Framework</div>' +
          '<h1 class="module-title gradient-text">Distribution Requirements Planning</h1>' +
          '<p class="module-subtitle">DRP is the overarching methodology: demand propagates <b>upward</b> through a multi-level supply network, level by level, until it reaches the supplier.</p></div>' +
        '<div class="arch-layout"><div class="arch-canvas" id="canvas-host"></div>' +
          '<aside class="arch-detail" id="detail"><h3>Ready — press play</h3><p>Watch demand climb from the customer LC up to the supplier.</p></aside></div>' +
        '<div class="arch-controls" id="controls"></div>' +
        '<section class="section"><h2 class="section-title">The four DRP levels</h2><dl class="concept-def">' +
          '<dt>Level 1</dt><dd>Customer-facing LCs — customer demand (SCS Fcst Qty) starts here.</dd>' +
          '<dt>Level 2</dt><dd>Regional DCs — Level-1 demand becomes DRP Independent Demand.</dd>' +
          '<dt>Level 3</dt><dd>Central / National DC — consolidates all regional requirements.</dd>' +
          '<dt>Level 4</dt><dd>Supplier — net requirements become Purchase Schedule recommendations.</dd></dl>' +
          '<div><span class="measure-pill">SCS Fcst Qty</span><span class="measure-pill">DRP Independent Demand</span><span class="measure-pill">Purchase Schedule</span></div></section>';
      var diagram = AV.ArchDiagram.create({ nodes: NODES, edges: EDGES, viewBox: "0 0 780 365", onSelect: function () {} });
      container.querySelector("#canvas-host").appendChild(diagram.el);
      this._diagram = diagram;
      var detail = container.querySelector("#detail");
      function show(idx) { if (idx < 0) { diagram.clear(); return; } diagram.setActive(STEPS[idx].active, STEPS[idx].edges); detail.innerHTML = "<h3>" + STEPS[idx].label + "</h3><p>" + STEPS[idx].desc + "</p>"; }
      var engine = new AV.AnimationEngine({ steps: STEPS.map(function (s) { return { label: s.label, duration: 2500 }; }), speed: 1 });
      this._engine = engine; this._off = engine.on("stepchange", function (idx) { show(idx); });
      var controls = AV.AnimationControls.create(engine, { title: "Ready — press play" });
      container.querySelector("#controls").appendChild(controls.el); this._controls = controls; show(-1);
    },
    destroy: function () { if (this._off) { this._off(); this._off = null; } if (this._controls) { this._controls.destroy(); this._controls = null; } if (this._engine) { this._engine.destroy(); this._engine = null; } if (this._diagram) { this._diagram.destroy(); this._diagram = null; } }
  };
  AV.registerModule(module);
})();
