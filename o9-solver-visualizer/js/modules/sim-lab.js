/* modules/sim-lab.js — Solver Behavior Lab: fire disruptions, watch the solver react */
(function () {
  "use strict";
  var AV = (window.SolverViz = window.SolverViz || {});
  var GEO = [
    { id: "supplier", label: "Supplier X", sub: "source", x: 40, y: 95, w: 150, h: 54, color: "supplier" },
    { id: "dc-nat", label: "DC-National", sub: "L3", x: 230, y: 95, w: 150, h: 54, color: "dc" },
    { id: "dc-north", label: "DC-North", sub: "L2", x: 420, y: 95, w: 150, h: 54, color: "dc" },
    { id: "lc-store", label: "LC-Store-A", sub: "L1", x: 610, y: 95, w: 150, h: 54, color: "lc" },
    { id: "customer", label: "Customer", sub: "demand", x: 610, y: 15, w: 150, h: 54, color: "demand" },
    { id: "supplierB", label: "Supplier Y", sub: "alt", x: 40, y: 20, w: 150, h: 54, color: "supplier" }
  ];
  var EDGES = [["supplier", "dc-nat"], ["dc-nat", "dc-north"], ["dc-north", "lc-store"], ["customer", "lc-store"], ["supplierB", "dc-nat"]];

  // Each scenario = steps (paint + event) and an outcome KPI row.
  var SCEN = {
    normal: { name: "Normal solve", dot: "ok",
      steps: [
        { paint: { customer: "is-success", "lc-store": "is-running" }, ev: ["ok", "Net requirement 350 units at LC-Store-A."] },
        { paint: { customer: "is-success", "lc-store": "is-success", "dc-north": "is-success", supplier: "is-running" }, ev: ["ok", "Sourced to Supplier X; constraints applied → 500 units."] },
        { paint: { customer: "is-success", "lc-store": "is-success", "dc-north": "is-success", "dc-nat": "is-success", supplier: "is-success" }, ev: ["ok", "Purchase Schedule 500 units, ship today, deliver Wk3."] }
      ],
      kpi: [["Order", "500", "good"], ["Ending OH", "300", "good"], ["Health", "InStock", "good"]],
      why: "Baseline: demand met on time, ending on-hand above safety stock, no exception." },
    "sup-holi": { name: "Supplier production holiday", dot: "warn",
      steps: [
        { paint: { supplier: "is-blocked" }, ev: ["warn", "Dist Supplier Prod Holiday on the required ship day."] },
        { paint: { supplier: "is-running" }, ev: ["warn", "Solver shifts ship to nearest valid PRIOR day."] },
        { paint: { supplier: "is-success", "dc-north": "is-success", "lc-store": "is-success" }, ev: ["ok", "On-time delivery preserved using lead-time slack."] }
      ],
      kpi: [["Order", "500", "good"], ["Ship day", "−1 day", "warn"], ["On time?", "Yes", "good"]],
      why: "The holiday shifts the ship date earlier; because slack existed, delivery stays on time." },
    freeze: { name: "Freeze-window block", dot: "err",
      steps: [
        { paint: { "lc-store": "is-running" }, ev: ["warn", "Required ship date computed = inside Firm Fence."] },
        { paint: { supplier: "is-frozen" }, ev: ["err", "Solver cannot create supply inside the freeze."] },
        { paint: { "lc-store": "is-failed" }, ev: ["err", "Short Exception raised; planner alerted for manual override."] }
      ],
      kpi: [["New order", "0", "bad"], ["Exception", "Short", "bad"], ["Action", "Planner", "warn"]],
      why: "Inside the freeze the solver will not auto-order — it raises an exception and defers to the planner." },
    spike: { name: "Demand spike", dot: "warn",
      steps: [
        { paint: { customer: "is-running", "lc-store": "is-running" }, ev: ["warn", "Forecast jumps: demand 400 → 620 units."] },
        { paint: { "lc-store": "is-running", supplier: "is-running" }, ev: ["warn", "Net requirement rises; larger/expedited order needed."] },
        { paint: { supplier: "is-success", "lc-store": "is-short" }, ev: ["err", "Lead time can't fully cover spike → partial shortage flagged."] }
      ],
      kpi: [["Demand", "620", "warn"], ["Order", "600", "warn"], ["Short", "~70", "bad"]],
      why: "The solver expedites a larger order, but the lead time limits how much of the spike it can cover in time." },
    capacity: { name: "Inbound capacity breach", dot: "warn",
      steps: [
        { paint: { "lc-store": "is-running" }, ev: ["warn", "Week-3 receipts exceed LC inbound box capacity."] },
        { paint: { "dc-north": "is-running", "lc-store": "is-running" }, ev: ["warn", "Solver spreads receipts across multiple days."] },
        { paint: { "lc-store": "is-success" }, ev: ["ok", "Within capacity after spreading; no shortage."] }
      ],
      kpi: [["Receipts", "spread", "warn"], ["Days used", "3", "warn"], ["Short", "0", "good"]],
      why: "Capacity is soft: the solver spreads receipts across days to stay within limits rather than overloading the LC." },
    failover: { name: "Multi-source failover", dot: "ok",
      steps: [
        { paint: { supplier: "is-blocked" }, ev: ["warn", "Supplier X on production holiday."] },
        { paint: { supplierB: "is-running" }, ev: ["ok", "Split ratio redirects demand to Supplier Y."] },
        { paint: { supplierB: "is-success", "dc-nat": "is-success", "lc-store": "is-success" }, ev: ["ok", "Order placed on available source; demand met."] }
      ],
      kpi: [["Source", "Supplier Y", "good"], ["Order", "500", "good"], ["On time?", "Yes", "good"]],
      why: "With a second source available, the split ratio automatically redirects demand to the supplier that can ship." }
  };

  var module = {
    id: "sim-lab", title: "Solver Behavior Lab", fullWidth: true,
    _engine: null, _controls: null, _diagram: null, _off: null, _pick: null, _cur: "normal",
    render: function (container) {
      var self = this;
      var picker = Object.keys(SCEN).map(function (k) {
        var s = SCEN[k];
        return '<button class="scenario-btn' + (k === "normal" ? " active" : "") + '" data-scen="' + k + '">' +
          '<div class="s-name"><span class="s-dot ' + s.dot + '"></span>' + s.name + '</div>' +
          '<div class="s-trig">' + s.steps.length + ' steps · outcome below</div></button>';
      }).join("");
      container.innerHTML =
        '<div class="module-header animate-fade-in-up"><div class="module-eyebrow">Solver Behavior Lab</div>' +
          '<h1 class="module-title gradient-text">Fire a disruption — watch the solver react</h1>' +
          '<p class="module-subtitle">Pick a scenario, then press play. The same Widget-A network is re-solved under each disruption, with per-node state, an event log, and the resulting outcome.</p></div>' +
        '<div class="scenario-grid" id="scen-grid">' + picker + '</div>' +
        '<div class="arch-layout"><div class="arch-canvas" id="canvas-host"></div>' +
          '<aside class="arch-detail" id="detail"></aside></div>' +
        '<div class="arch-controls" id="controls"></div>' +
        '<section class="section"><h2 class="section-title">Outcome</h2><div class="kpi-row" id="outcome"></div>' +
          '<div class="event-log" id="log"></div></section>';

      var diagram = AV.ArchDiagram.create({ nodes: GEO, edges: EDGES, viewBox: "0 0 780 165", onSelect: function () {} });
      container.querySelector("#canvas-host").appendChild(diagram.el);
      this._diagram = diagram;
      var detail = container.querySelector("#detail");
      var log = container.querySelector("#log");
      var outcome = container.querySelector("#outcome");

      function clearPaint() {
        GEO.forEach(function (g) { var e = diagram.el.querySelector('[data-id="' + g.id + '"]'); if (e) e.classList.remove("is-running", "is-success", "is-short", "is-blocked", "is-skipped", "is-frozen", "is-failed"); });
      }
      function renderScen(k, idx) {
        var s = SCEN[k];
        clearPaint();
        if (idx < 0) {
          diagram.clear(); log.innerHTML = "";
          detail.innerHTML = "<h3>" + s.name + "</h3><p>Press play to run this scenario.</p>";
          outcome.innerHTML = s.kpi.map(function (k2) { return '<div class="kpi"><div class="kpi-num">—</div><div class="kpi-label">' + k2[0] + '</div></div>'; }).join("");
          return;
        }
        var step = s.steps[idx];
        Object.keys(step.paint).forEach(function (nid) { var e = diagram.el.querySelector('[data-id="' + nid + '"]'); if (e) e.classList.add(step.paint[nid]); });
        detail.innerHTML = "<h3>" + s.name + " · step " + (idx + 1) + "</h3><p>" + step.ev[1] + "</p>";
        var rows = "";
        for (var i = 0; i <= idx; i++) rows += '<div class="ev ' + s.steps[i].ev[0] + '"><span class="t">' + (i + 1) + '</span>' + s.steps[i].ev[1] + '</div>';
        // reveal outcome once the last step is reached
        if (idx === s.steps.length - 1) {
          outcome.innerHTML = s.kpi.map(function (k2) { return '<div class="kpi ' + (k2[2] || "") + '"><div class="kpi-num">' + k2[1] + '</div><div class="kpi-label">' + k2[0] + '</div></div>'; }).join("");
          rows += '<div class="ev ok"><span class="t">✔</span><b>Why:</b> ' + s.why + '</div>';
        } else {
          outcome.innerHTML = s.kpi.map(function (k2) { return '<div class="kpi"><div class="kpi-num">—</div><div class="kpi-label">' + k2[0] + '</div></div>'; }).join("");
        }
        log.innerHTML = rows;
      }

      function loadScenario(k) {
        self._cur = k;
        if (self._off) { self._off(); self._off = null; }
        if (self._controls) { self._controls.destroy(); self._controls = null; }
        if (self._engine) { self._engine.destroy(); self._engine = null; }
        var steps = SCEN[k].steps.map(function (st, i) { return { label: SCEN[k].name + " · " + (i + 1), duration: 2200 }; });
        var engine = new AV.AnimationEngine({ steps: steps, speed: 1 });
        self._engine = engine;
        self._off = engine.on("stepchange", function (idx) { renderScen(k, idx); });
        var controls = AV.AnimationControls.create(engine, { title: SCEN[k].name + " — press play" });
        var host = container.querySelector("#controls");
        host.innerHTML = ""; host.appendChild(controls.el);
        self._controls = controls;
        renderScen(k, -1);
      }

      loadScenario("normal");

      var grid = container.querySelector("#scen-grid");
      this._pick = function (e) {
        var b = e.target.closest("button[data-scen]"); if (!b) return;
        grid.querySelectorAll("button").forEach(function (x) { x.classList.remove("active"); });
        b.classList.add("active");
        loadScenario(b.getAttribute("data-scen"));
      };
      grid.addEventListener("click", this._pick);
    },
    destroy: function () {
      var g = document.querySelector("#scen-grid");
      if (g && this._pick) g.removeEventListener("click", this._pick);
      if (this._off) { this._off(); this._off = null; }
      if (this._controls) { this._controls.destroy(); this._controls = null; }
      if (this._engine) { this._engine.destroy(); this._engine = null; }
      if (this._diagram) { this._diagram.destroy(); this._diagram = null; }
      this._pick = null;
    }
  };
  AV.registerModule(module);
})();
