/* ============================================================
   modules/business-scenario.js — FLAGSHIP
   The CAT Aftermarket Parts Network nightly supply solve.
   Start from a human moment (Buyer opens the workbench at 8 AM),
   then work backward through the solve. Features:
     - multi-view toggle (Business / Planning / Solver-Internals)
       relabelling the SAME shared network diagram
     - animated nightly solve painting per-node states (idx-driven)
     - click-any-node inspector
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.SolverViz = window.SolverViz || {});
  var W = AV.CATMPN.widgetA;

  // Shared node geometry — one diagram, three label sets.
  var GEO = [
    { id: "supplier", x: 40,  y: 150, w: 150, h: 60, color: "supplier" },
    { id: "dc-nat",   x: 250, y: 150, w: 150, h: 60, color: "dc" },
    { id: "dc-north", x: 460, y: 150, w: 150, h: 60, color: "dc" },
    { id: "lc-store", x: 670, y: 150, w: 150, h: 60, color: "lc" },
    { id: "customer", x: 670, y: 40,  w: 150, h: 60, color: "demand" }
  ];
  var EDGES = [
    ["supplier", "dc-nat", { label: "PSO" }],
    ["dc-nat", "dc-north", { label: "STO" }],
    ["dc-north", "lc-store", { label: "STO" }],
    ["customer", "lc-store", { label: "demand" }]
  ];

  // Three views = three label sets over the same geometry.
  var VIEWS = {
    business: {
      supplier: { label: "Supplier X", sub: "Vendor" },
      "dc-nat": { label: "National Hub", sub: "Central stock" },
      "dc-north": { label: "Regional DC", sub: "North region" },
      "lc-store": { label: "Local Store", sub: "Serves customer" },
      customer: { label: "Customer", sub: "Wants Widget-A" }
    },
    planning: {
      supplier: { label: "Supplier X", sub: "Purchase Schedule" },
      "dc-nat": { label: "DC-National", sub: "L3 · DRP source" },
      "dc-north": { label: "DC-North", sub: "L2 · DRP source" },
      "lc-store": { label: "LC-Store-A", sub: "L1 · demand node" },
      customer: { label: "SCS Fcst", sub: "Independent demand" }
    },
    technical: {
      supplier: { label: "BILT lane", sub: "Prod Priority" },
      "dc-nat": { label: "BILT node", sub: "Dist Prod Qty" },
      "dc-north": { label: "BILT node", sub: "Dist Cons Qty" },
      "lc-store": { label: "IL node", sub: "SCS Beginning OH" },
      customer: { label: "CCtILO(D)", sub: "SplitWeek Fcst" }
    }
  };

  // Per-node attributes for the inspector.
  var ATTR = {
    customer: [["Role", "Demand origin"], ["Signal", "SCS Fcst Qty = " + W.forecastPerSlot + "/slot"], ["Measure", "SplitWeek Final Forecast"]],
    "lc-store": [["Echelon", "Level 1 (customer-facing)"], ["On Hand", W.onHand + " units"], ["Safety Stock", W.safetyStock + " units"], ["Role", "Where demand is measured"]],
    "dc-north": [["Echelon", "Level 2 (Regional DC)"], ["Sources from", "DC-National"], ["Planned receipt", W.orderUnits + " units (Wk3)"], ["Measure", "Dist Prod Qty – BILT(D)"]],
    "dc-nat": [["Echelon", "Level 3 (Central DC)"], ["Sources from", "Supplier X"], ["Role", "Consolidates regional demand"]],
    supplier: [["Echelon", "Level 4 (Supplier)"], ["Lead time", W.leadTimeDays + " days"], ["Min / Mult", W.minBoxes + " / " + W.multBoxes + " boxes"], ["Output", "Purchase Schedule = " + W.orderUnits + " units"]]
  };

  // Nightly solve steps — full snapshot per idx (states painted fresh).
  // state map: nodeId -> class ('is-running'|'is-success'|'is-short'|...)
  var STEPS = [
    { label: "1 · Demand staged", active: ["customer"], edges: [],
      states: { customer: "is-running" },
      desc: "Rule engine stages Widget-A's SplitWeek forecast at LC-Store-A: <b>" + W.forecastPerSlot + " units/slot</b>. This is the independent demand the solver must meet on time." },
    { label: "2 · Net requirement", active: ["lc-store"], edges: [["customer", "lc-store"]],
      states: { customer: "is-success", "lc-store": "is-running" },
      desc: "Solver computes net requirement at LC-Store-A: max(0, demand − on-hand + safety stock) = max(0, " + W.demandToWeek3 + " − " + W.onHand + " + " + W.safetyStock + ") = <b>" + W.netRequirementUnits + " units</b>." },
    { label: "3 · Propagate up (DRP)", active: ["dc-north"], edges: [["dc-north", "lc-store"]],
      states: { customer: "is-success", "lc-store": "is-success", "dc-north": "is-running" },
      desc: "The requirement becomes DRP Independent Demand for <b>DC-North</b> (Level 2). Demand propagates upward through the multi-echelon network." },
    { label: "4 · Source to supplier", active: ["dc-nat", "supplier"], edges: [["dc-nat", "dc-north"], ["supplier", "dc-nat"]],
      states: { customer: "is-success", "lc-store": "is-success", "dc-north": "is-success", "dc-nat": "is-running", supplier: "is-running" },
      desc: "DC-North sources DC-National, which sources <b>Supplier X</b>. The cascade reaches the top of the chain, where a purchase decision is needed." },
    { label: "5 · Apply constraints", active: ["supplier"], edges: [],
      states: { customer: "is-success", "lc-store": "is-success", "dc-north": "is-success", "dc-nat": "is-success", supplier: "is-running" },
      desc: W.netRequirementUnits + " units ÷ " + W.unitsPerBox + " = " + W.netRequirementBoxes + " boxes. Min = " + W.minBoxes + " ✓; Mult = " + W.multBoxes + " → round up to <b>" + W.orderBoxes + " boxes (" + W.orderUnits + " units)</b>." },
    { label: "6 · Purchase schedule", active: ["supplier"], edges: [["supplier", "dc-nat"], ["dc-nat", "dc-north"], ["dc-north", "lc-store"]],
      states: { customer: "is-success", "lc-store": "is-success", "dc-north": "is-success", "dc-nat": "is-success", supplier: "is-success" },
      desc: "Solver writes <b>Purchase Schedule = " + W.orderUnits + " units</b> at Supplier X, ship today, deliver Week 3. Ending on-hand = " + W.endingOnHandWk3 + " > safety stock " + W.safetyStock + " → <b>InStock</b>, no exception." }
  ];

  function nodesForView(view) {
    var labels = VIEWS[view];
    return GEO.map(function (g) {
      var l = labels[g.id];
      return { id: g.id, x: g.x, y: g.y, w: g.w, h: g.h, color: g.color, label: l.label, sub: l.sub };
    });
  }

  var module = {
    id: "business-scenario",
    title: "Business Scenario: Nightly Supply Solve",
    fullWidth: true,
    _engine: null, _controls: null, _diagram: null, _off: null, _view: "planning", _onToggle: null,

    render: function (container) {
      var self = this;
      container.innerHTML =
        '<div class="module-header animate-fade-in-up">' +
          '<div class="module-eyebrow">Real-World Scenario · CAT Aftermarket Parts Network</div>' +
          '<h1 class="module-title gradient-text">The 8 AM number, explained backward</h1>' +
          '<p class="module-subtitle">A Buyer opens the Supply Plan Output workbench at 8 AM and sees a ' +
          '<b>' + W.orderUnits + '-unit purchase schedule</b> for Widget-A. Where did it come from? ' +
          'Press play to watch last night\'s solve build that number, one step at a time.</p>' +
        "</div>" +

        '<div class="view-toggle" id="view-toggle" role="tablist" aria-label="Diagram view">' +
          '<button data-view="business">Business view</button>' +
          '<button data-view="planning" class="active">Planning view</button>' +
          '<button data-view="technical">Solver internals</button>' +
        "</div>" +

        '<div class="arch-layout">' +
          '<div class="arch-canvas" id="canvas-host"></div>' +
          '<aside class="arch-detail" id="detail">' +
            '<h3>Ready — press play</h3>' +
            '<p>Watch demand at LC-Store-A propagate up to Supplier X, then a constrained purchase schedule flow back down. Click any node to inspect it.</p>' +
          "</aside>" +
        "</div>" +
        '<div class="arch-controls" id="controls"></div>' +

        '<section class="section">' +
          '<h2 class="section-title">The number on the workbench</h2>' +
          '<div class="kpi-row">' +
            '<div class="kpi"><div class="kpi-num">' + W.demandToWeek3 + '</div><div class="kpi-label">Demand to Wk3 (units)</div></div>' +
            '<div class="kpi"><div class="kpi-num">' + W.onHand + '</div><div class="kpi-label">On hand</div></div>' +
            '<div class="kpi accent"><div class="kpi-num">' + W.netRequirementUnits + '</div><div class="kpi-label">Net requirement</div></div>' +
            '<div class="kpi good"><div class="kpi-num">' + W.orderUnits + '</div><div class="kpi-label">Purchase schedule</div></div>' +
            '<div class="kpi good"><div class="kpi-num">' + W.endingOnHandWk3 + '</div><div class="kpi-label">Ending OH (Wk3)</div></div>' +
          "</div>" +
          '<div class="formula">Net Requirement = <span class="hl">max(0, SCS Fcst Qty − SCS Beginning on Hand + Safety Stock)</span> = max(0, ' + W.demandToWeek3 + ' − ' + W.onHand + ' + ' + W.safetyStock + ') = ' + W.netRequirementUnits + ' units</div>' +
        "</section>" +

        '<section class="section">' +
          '<h2 class="section-title">Underlying solver output (measures)</h2>' +
          '<p>Every number above maps to a real o9 measure written back to the planning model:</p>' +
          '<div>' +
            '<span class="measure-pill">SplitWeek Final Forecast</span>' +
            '<span class="measure-pill">SCS Beginning on Hand</span>' +
            '<span class="measure-pill">Safety Stock Final</span>' +
            '<span class="measure-pill">Dist Prod Qty – BILT(D)</span>' +
            '<span class="measure-pill">Purchase Schedule Qty CM</span>' +
            '<span class="measure-pill">SCS Ending on Hand</span>' +
            '<span class="measure-pill">InvHealth InStock</span>' +
          "</div>" +
        "</section>";

      // ── Build the shared diagram ──
      function mountDiagram() {
        if (self._diagram) self._diagram.destroy();
        var diagram = AV.ArchDiagram.create({
          nodes: nodesForView(self._view), edges: EDGES, viewBox: "0 0 860 240",
          onSelect: function (id) { self._inspect(id); }
        });
        container.querySelector("#canvas-host").appendChild(diagram.el);
        self._diagram = diagram;
        // repaint current step onto the new view
        self._paint(self._engine ? self._engine.currentStep : -1);
      }

      var detail = container.querySelector("#detail");

      this._paint = function (idx) {
        var d = self._diagram;
        if (!d) return;
        // clear all node state classes
        GEO.forEach(function (g) {
          var node = d.el.querySelector('[data-id="' + g.id + '"]');
          if (node) node.classList.remove("is-running", "is-success", "is-short", "is-blocked", "is-skipped", "is-frozen");
        });
        if (idx < 0) { d.clear(); return; }
        var step = STEPS[idx];
        d.setActive(step.active, step.edges);
        Object.keys(step.states).forEach(function (nid) {
          var node = d.el.querySelector('[data-id="' + nid + '"]');
          if (node) node.classList.add(step.states[nid]);
        });
        detail.innerHTML = "<h3>" + step.label + "</h3><p>" + step.desc + "</p>";
      };

      this._inspect = function (id) {
        var rows = ATTR[id];
        if (!rows) return;
        var name = VIEWS[self._view][id].label;
        detail.innerHTML = '<h3>🔍 ' + name + "</h3><dl class=\"concept-def\">" +
          rows.map(function (r) { return "<dt>" + r[0] + "</dt><dd>" + r[1] + "</dd>"; }).join("") +
          "</dl><p style=\"margin-top:8px;color:var(--text-muted);font-size:13px\">Click another node, or press play to resume the solve.</p>";
      };

      mountDiagram();

      // ── Engine + controls ──
      var engine = new AV.AnimationEngine({ steps: STEPS.map(function (s) { return { label: s.label, duration: 2600 }; }), speed: 1 });
      this._engine = engine;
      this._off = engine.on("stepchange", function (idx) { self._paint(idx); });
      var controls = AV.AnimationControls.create(engine, { title: "Ready — press play" });
      container.querySelector("#controls").appendChild(controls.el);
      this._controls = controls;

      // ── View toggle ──
      var toggle = container.querySelector("#view-toggle");
      this._onToggle = function (e) {
        var b = e.target.closest("button[data-view]");
        if (!b) return;
        toggle.querySelectorAll("button").forEach(function (x) { x.classList.remove("active"); });
        b.classList.add("active");
        self._view = b.getAttribute("data-view");
        mountDiagram();
      };
      toggle.addEventListener("click", this._onToggle);

      this._paint(-1);
    },

    destroy: function () {
      if (this._off) { this._off(); this._off = null; }
      if (this._controls) { this._controls.destroy(); this._controls = null; }
      if (this._engine) { this._engine.destroy(); this._engine = null; }
      if (this._diagram) { this._diagram.destroy(); this._diagram = null; }
      this._onToggle = null;
    }
  };

  AV.registerModule(module);
})();
