/* modules/pegging.js — traceability from demand back to supply */
(function () {
  "use strict";
  var AV = (window.SolverViz = window.SolverViz || {});
  var NODES = [
    { id: "po", label: "Supplier PO", sub: "500 units", x: 40, y: 95, w: 150, h: 54, color: "supplier" },
    { id: "dc-nat", label: "DC-National", sub: "receipt", x: 240, y: 95, w: 150, h: 54, color: "dc" },
    { id: "dc-north", label: "DC-North", sub: "receipt", x: 440, y: 95, w: 150, h: 54, color: "dc" },
    { id: "demand", label: "Customer demand", sub: "Widget-A", x: 620, y: 95, w: 150, h: 54, color: "demand" }
  ];
  var EDGES = [["po", "dc-nat"], ["dc-nat", "dc-north"], ["dc-north", "demand"]];
  var STEPS = [
    { active: ["demand"], edges: [], label: "Start at the demand", desc: "A specific customer demand line for Widget-A needs to be traced to the supply that fulfils it." },
    { active: ["dc-north"], edges: [["dc-north", "demand"]], label: "Peg to nearest supply", desc: "<code>Dist Consumption Pegging (D)(Solver)</code> links the demand to the receipt at DC-North that serves it." },
    { active: ["dc-nat"], edges: [["dc-nat", "dc-north"]], label: "Trace upstream", desc: "<code>Dist Production Pegging (D)(Solver)</code> links DC-North's receipt to DC-National's supply." },
    { active: ["po"], edges: [["po", "dc-nat"]], label: "Back to the PO", desc: "The chain reaches the specific <b>Supplier PO</b> that will ultimately fulfil this customer demand — full traceability." },
    { active: ["po", "dc-nat", "dc-north", "demand"], edges: [["po", "dc-nat"], ["dc-nat", "dc-north"], ["dc-north", "demand"]], label: "End-to-end peg", desc: "Every allocated unit is traceable from customer demand back to the purchase order — supporting promise accuracy and financial reporting." }
  ];
  var module = {
    id: "pegging", title: "Pegging", fullWidth: true,
    _engine: null, _controls: null, _diagram: null, _off: null,
    render: function (container) {
      container.innerHTML =
        '<div class="module-header animate-fade-in-up"><div class="module-eyebrow">Solver Decisions · pegging</div>' +
          '<h1 class="module-title gradient-text">Pegging &amp; Traceability</h1>' +
          '<p class="module-subtitle">Pegging traces which supply units were matched to which demand units — a full audit trail from customer demand back to the supplier order.</p></div>' +
        '<div class="arch-layout"><div class="arch-canvas" id="canvas-host"></div>' +
          '<aside class="arch-detail" id="detail"><h3>Ready — press play</h3><p>Trace one Widget-A demand line back to its PO.</p></aside></div>' +
        '<div class="arch-controls" id="controls"></div>' +
        '<section class="section"><h2 class="section-title">Pegging relationships</h2><dl class="concept-def">' +
          '<dt>Consumption Pegging</dt><dd><code>Dist Consumption Pegging (D)(Solver)</code> — demand ← nearest supply draw.</dd>' +
          '<dt>Production Pegging</dt><dd><code>Dist Production Pegging (D)(Solver)</code> — receipt ← upstream supply.</dd>' +
          '<dt>Root cause</dt><dd><code>MaterialRootCause(Solver)</code> reuses the same graph to explain shortages.</dd></dl></section>';
      var diagram = AV.ArchDiagram.create({ nodes: NODES, edges: EDGES, viewBox: "0 0 790 165", onSelect: function () {} });
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
