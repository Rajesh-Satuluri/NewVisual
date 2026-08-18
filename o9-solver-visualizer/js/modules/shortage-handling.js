/* modules/shortage-handling.js — HOW shortages are handled (6-step flow) */
(function () {
  "use strict";
  var AV = (window.SolverViz = window.SolverViz || {});
  var NODES = [
    { id: "supplier", label: "Supplier X", sub: "constrained", x: 40, y: 95, w: 150, h: 54, color: "supplier" },
    { id: "dc-north", label: "DC-North", sub: "L2", x: 300, y: 95, w: 150, h: 54, color: "dc" },
    { id: "lc-store", label: "LC-Store-A", sub: "demand", x: 560, y: 95, w: 150, h: 54, color: "lc" },
    { id: "customer", label: "Customer", sub: "priority", x: 560, y: 20, w: 150, h: 54, color: "demand" }
  ];
  var EDGES = [["supplier", "dc-north"], ["dc-north", "lc-store"], ["customer", "lc-store"]];
  var STEPS = [
    { paint: { "lc-store": "is-short" }, ev: ["warn", "Available supply < demand + safety stock for Widget-A at LC-Store-A."], label: "1 · Shortage detection", desc: "On-hand + in-transit + feasible new orders can't cover demand + safety stock." },
    { paint: { customer: "is-running", "lc-store": "is-short" }, ev: ["ok", "Allocate available supply in Demand Priority order."], label: "2 · Priority-based fulfilment", desc: "Higher-priority customers are filled fully before lower-priority customers get anything." },
    { paint: { "lc-store": "is-short" }, ev: ["err", "Short Qty recorded (allocation + customer level)."], label: "3 · Shortage quantity recording", desc: "Unfulfilled demand is written to <code>Short Qty</code> and <code>Short Quantity – CPoCIL</code>. Nothing is hidden." },
    { paint: { "lc-store": "is-short" }, ev: ["warn", "Delivery Plan updated; future buckets tiered 1–10 / 10–30 / 30–45 / 45+ days."], label: "4 · Delivery plan update", desc: "Total Short Qty and Cumulative Total Short Qty are populated across horizon tiers." },
    { paint: { supplier: "is-running", "dc-north": "is-running", "lc-store": "is-short" }, ev: ["warn", "MaterialRootCause(Solver) traces the shortage upstream."], label: "5 · Root-cause pegging", desc: "The graph traces the shortage back to its origin — supplier delay, DC shortage, or demand spike." },
    { paint: { "lc-store": "is-failed" }, ev: ["err", "Short Exception Indicator set → workbench exception + planner alert."], label: "6 · Exception signals", desc: "<code>Short Exception Indicator – BILT(D)</code> and its count drive workbench exceptions and notifications." }
  ];
  var module = {
    id: "shortage-handling", title: "Shortage Handling", fullWidth: true,
    _engine: null, _controls: null, _diagram: null, _off: null,
    render: function (container) {
      var self = this;
      container.innerHTML =
        '<div class="module-header animate-fade-in-up"><div class="module-eyebrow">Solver Decisions · shortages</div>' +
          '<h1 class="module-title gradient-text">How Shortages Are Handled</h1>' +
          '<p class="module-subtitle">When the solver can\'t meet all demand within constraints, it enters shortage-allocation mode — a strict six-step sequence. It never silently hides a shortage.</p></div>' +
        '<div class="arch-layout"><div class="arch-canvas" id="canvas-host"></div>' +
          '<aside class="arch-detail" id="detail"><h3>Ready — press play</h3><p>Red = short, amber = being solved. Watch the event log build.</p></aside></div>' +
        '<div class="arch-controls" id="controls"></div>' +
        '<section class="section"><h2 class="section-title">Event log</h2><div class="event-log" id="log"></div>' +
          '<div style="margin-top:12px"><span class="measure-pill">Short Qty</span><span class="measure-pill">Total Short Qty – CCtILO(D)</span><span class="measure-pill">MaterialRootCause(Solver)</span><span class="measure-pill">Short Exception Indicator – BILT(D)</span></div></section>';
      var diagram = AV.ArchDiagram.create({ nodes: NODES, edges: EDGES, viewBox: "0 0 730 165", onSelect: function () {} });
      container.querySelector("#canvas-host").appendChild(diagram.el);
      this._diagram = diagram;
      var detail = container.querySelector("#detail");
      var log = container.querySelector("#log");
      this._render = function (idx) {
        NODES.forEach(function (n) { var e = diagram.el.querySelector('[data-id="' + n.id + '"]'); if (e) e.classList.remove("is-running", "is-short", "is-failed"); });
        if (idx < 0) { diagram.clear(); log.innerHTML = ""; detail.innerHTML = "<h3>Ready — press play</h3><p>Red = short, amber = being solved.</p>"; return; }
        var s = STEPS[idx];
        diagram.setActive([], []);
        Object.keys(s.paint).forEach(function (nid) { var e = diagram.el.querySelector('[data-id="' + nid + '"]'); if (e) e.classList.add(s.paint[nid]); });
        detail.innerHTML = "<h3>" + s.label + "</h3><p>" + s.desc + "</p>";
        var rows = "";
        for (var i = 0; i <= idx; i++) rows += '<div class="ev ' + STEPS[i].ev[0] + '"><span class="t">' + (i + 1) + '</span>' + STEPS[i].ev[1] + '</div>';
        log.innerHTML = rows;
      };
      var engine = new AV.AnimationEngine({ steps: STEPS.map(function (s) { return { label: s.label, duration: 2500 }; }), speed: 1 });
      this._engine = engine; this._off = engine.on("stepchange", function (idx) { self._render(idx); });
      var controls = AV.AnimationControls.create(engine, { title: "Ready — press play" });
      container.querySelector("#controls").appendChild(controls.el); this._controls = controls; self._render(-1);
    },
    destroy: function () { if (this._off) { this._off(); this._off = null; } if (this._controls) { this._controls.destroy(); this._controls = null; } if (this._engine) { this._engine.destroy(); this._engine = null; } if (this._diagram) { this._diagram.destroy(); this._diagram = null; } }
  };
  AV.registerModule(module);
})();
