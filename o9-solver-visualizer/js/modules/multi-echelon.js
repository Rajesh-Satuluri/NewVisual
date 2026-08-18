/* modules/multi-echelon.js — animated upward propagation with state paint */
(function () {
  "use strict";
  var AV = (window.SolverViz = window.SolverViz || {});
  var NODES = [
    { id: "supplier", label: "Supplier X", sub: "L4", x: 40, y: 95, w: 150, h: 54, color: "supplier" },
    { id: "dc-nat", label: "DC-National", sub: "L3", x: 230, y: 95, w: 150, h: 54, color: "dc" },
    { id: "dc-north", label: "DC-North", sub: "L2", x: 420, y: 95, w: 150, h: 54, color: "dc" },
    { id: "lc-store", label: "LC-Store-A", sub: "L1", x: 610, y: 95, w: 150, h: 54, color: "lc" },
    { id: "customer", label: "Customer", sub: "Demand", x: 610, y: 15, w: 150, h: 54, color: "demand" }
  ];
  var EDGES = [["supplier", "dc-nat"], ["dc-nat", "dc-north"], ["dc-north", "lc-store"], ["customer", "lc-store"]];
  // idx-driven: each step supplies a full state snapshot
  var STEPS = [
    { paint: { customer: "is-running" }, edges: [], label: "Demand appears (L1)", desc: "Customer demand for Widget-A lands at LC-Store-A: 400 units to Week 3." },
    { paint: { customer: "is-success", "lc-store": "is-running" }, edges: [["customer", "lc-store"]], label: "Net requirement at L1", desc: "LC-Store-A nets demand against on-hand + safety stock → <b>350 units</b> required." },
    { paint: { customer: "is-success", "lc-store": "is-success", "dc-north": "is-running" }, edges: [["dc-north", "lc-store"]], label: "Propagate to L2", desc: "The 350-unit requirement becomes DRP Independent Demand at <b>DC-North</b>." },
    { paint: { customer: "is-success", "lc-store": "is-success", "dc-north": "is-success", "dc-nat": "is-running" }, edges: [["dc-nat", "dc-north"]], label: "Propagate to L3", desc: "DC-North's requirement flows up to <b>DC-National</b>, consolidating regional demand." },
    { paint: { customer: "is-success", "lc-store": "is-success", "dc-north": "is-success", "dc-nat": "is-success", supplier: "is-running" }, edges: [["supplier", "dc-nat"]], label: "Reach L4 supplier", desc: "DC-National sources <b>Supplier X</b> — a purchase decision is now needed at the top." },
    { paint: { customer: "is-success", "lc-store": "is-success", "dc-north": "is-success", "dc-nat": "is-success", supplier: "is-success" }, edges: [["supplier", "dc-nat"], ["dc-nat", "dc-north"], ["dc-north", "lc-store"]], label: "Cascade replenishment down", desc: "A constrained <b>500-unit</b> purchase schedule flows back down the chain — one aligned plan across all four echelons." }
  ];
  var module = {
    id: "multi-echelon", title: "Multi-Echelon Flow", fullWidth: true,
    _engine: null, _controls: null, _diagram: null, _off: null,
    render: function (container) {
      var self = this;
      container.innerHTML =
        '<div class="module-header animate-fade-in-up"><div class="module-eyebrow">DRP Framework</div>' +
          '<h1 class="module-title gradient-text">Multi-Echelon Flow</h1>' +
          '<p class="module-subtitle">Demand propagates up four echelons and a constrained plan cascades back down — the solver does it all in one integrated solve.</p></div>' +
        '<div class="arch-layout"><div class="arch-canvas" id="canvas-host"></div>' +
          '<aside class="arch-detail" id="detail"><h3>Ready — press play</h3><p>Green = settled, amber = being solved. Scrub back and forth — state is rebuilt from scratch each step.</p></aside></div>' +
        '<div class="arch-controls" id="controls"></div>' +
        '<section class="section"><h2 class="section-title">Why one integrated solve matters</h2>' +
          '<div class="callout tip"><span class="callout-icon">🔗</span><div class="callout-body">Because all four levels are solved together, the supplier purchase schedule is <b>guaranteed consistent</b> with customer demand at the bottom — no level-by-level drift, no manual reconciliation.</div></div></section>';
      var diagram = AV.ArchDiagram.create({ nodes: NODES, edges: EDGES, viewBox: "0 0 780 165", onSelect: function () {} });
      container.querySelector("#canvas-host").appendChild(diagram.el);
      this._diagram = diagram;
      var detail = container.querySelector("#detail");
      this._paint = function (idx) {
        NODES.forEach(function (n) { var e = diagram.el.querySelector('[data-id="' + n.id + '"]'); if (e) e.classList.remove("is-running", "is-success"); });
        if (idx < 0) { diagram.clear(); return; }
        var s = STEPS[idx];
        diagram.setActive([], s.edges);
        Object.keys(s.paint).forEach(function (nid) { var e = diagram.el.querySelector('[data-id="' + nid + '"]'); if (e) e.classList.add(s.paint[nid]); });
        detail.innerHTML = "<h3>" + s.label + "</h3><p>" + s.desc + "</p>";
      };
      var engine = new AV.AnimationEngine({ steps: STEPS.map(function (s) { return { label: s.label, duration: 2400 }; }), speed: 1 });
      this._engine = engine; this._off = engine.on("stepchange", function (idx) { self._paint(idx); });
      var controls = AV.AnimationControls.create(engine, { title: "Ready — press play" });
      container.querySelector("#controls").appendChild(controls.el); this._controls = controls; this._paint(-1);
    },
    destroy: function () { if (this._off) { this._off(); this._off = null; } if (this._controls) { this._controls.destroy(); this._controls = null; } if (this._engine) { this._engine.destroy(); this._engine = null; } if (this._diagram) { this._diagram.destroy(); this._diagram = null; } }
  };
  AV.registerModule(module);
})();
