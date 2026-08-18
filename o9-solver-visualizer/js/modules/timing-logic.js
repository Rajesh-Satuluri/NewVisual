/* modules/timing-logic.js — WHEN to generate supply (back-scheduling) */
(function () {
  "use strict";
  var AV = (window.SolverViz = window.SolverViz || {});
  var NODES = [
    { id: "req", label: "Required delivery", sub: "start of Wk3", x: 560, y: 30, w: 200, h: 56, color: "lc" },
    { id: "lead", label: "− Dist Lead Time", sub: "14 days", x: 300, y: 120, w: 200, h: 56, color: "dc" },
    { id: "ship", label: "Required ship date", sub: "today, Mon Wk1", x: 40, y: 210, w: 200, h: 56, color: "supplier" },
    { id: "freeze", label: "Freeze check", sub: "in fence?", x: 320, y: 210, w: 180, h: 56, color: "solver" }
  ];
  var EDGES = [["req", "lead"], ["lead", "ship"], ["ship", "freeze"]];
  var STEPS = [
    { active: ["req"], edges: [], label: "Start from required delivery", desc: "Widget-A must arrive at LC-Store-A by the <b>start of Week 3</b> (its valid delivery slot)." },
    { active: ["lead"], edges: [["req", "lead"]], label: "Subtract lead time", desc: "<div class=\"formula\">Required Ship Date = Required Delivery Date − <span class=\"hl\">Dist Lead Time – BT(Solver)</span> = Wk3 − 14 days = today (Mon Wk1).</div>" },
    { active: ["ship"], edges: [["lead", "ship"]], label: "Required ship date", desc: "The solver must ship <b>today</b> for the goods to arrive on time." },
    { active: ["freeze"], edges: [["ship", "freeze"]], label: "Freeze-window test", desc: "Is the ship date inside the freeze? <b>Plan Zone</b> → generate a planned receipt on the nearest valid delivery day. <b>Inside freeze</b> → shortage exception, alert the planner (no new supply)." },
    { active: ["req", "lead", "ship", "freeze"], edges: [["req", "lead"], ["lead", "ship"], ["ship", "freeze"]], label: "Expedite / de-expedite", desc: "If an existing order is mistimed, the solver recommends <b>Reschedule Date</b> and <b>Reschedule Qty</b> — advancing (expedite) or delaying (de-expedite) supply." }
  ];
  var module = {
    id: "timing-logic", title: "Timing Logic", fullWidth: true,
    _engine: null, _controls: null, _diagram: null, _off: null,
    render: function (container) {
      container.innerHTML =
        '<div class="module-header animate-fade-in-up"><div class="module-eyebrow">Solver Decisions · WHEN supply</div>' +
          '<h1 class="module-title gradient-text">Timing Logic</h1>' +
          '<p class="module-subtitle">The solver works <b>backward</b> from the required delivery date using lead time, then tests the result against the freeze window.</p></div>' +
        '<div class="arch-layout"><div class="arch-canvas" id="canvas-host"></div>' +
          '<aside class="arch-detail" id="detail"><h3>Ready — press play</h3><p>Follow the back-schedule from delivery date to ship date.</p></aside></div>' +
        '<div class="arch-controls" id="controls"></div>' +
        '<section class="section"><h2 class="section-title">Key rule</h2>' +
          '<div class="formula">Required Ship Date = Required Delivery Date − <span class="hl">Dist Lead Time – BT(Solver)</span></div>' +
          '<div><span class="measure-pill">Dist Lead Time – BT(Solver)</span><span class="measure-pill">LC Delivery Calendar</span><span class="measure-pill">Reschedule Date</span><span class="measure-pill">Reschedule Qty</span></div></section>';
      var diagram = AV.ArchDiagram.create({ nodes: NODES, edges: EDGES, viewBox: "0 0 780 290", onSelect: function () {} });
      container.querySelector("#canvas-host").appendChild(diagram.el);
      this._diagram = diagram;
      var detail = container.querySelector("#detail");
      function show(idx) { if (idx < 0) { diagram.clear(); return; } diagram.setActive(STEPS[idx].active, STEPS[idx].edges); detail.innerHTML = "<h3>" + STEPS[idx].label + "</h3><p>" + STEPS[idx].desc + "</p>"; }
      var engine = new AV.AnimationEngine({ steps: STEPS.map(function (s) { return { label: s.label, duration: 2600 }; }), speed: 1 });
      this._engine = engine; this._off = engine.on("stepchange", function (idx) { show(idx); });
      var controls = AV.AnimationControls.create(engine, { title: "Ready — press play" });
      container.querySelector("#controls").appendChild(controls.el); this._controls = controls; show(-1);
    },
    destroy: function () { if (this._off) { this._off(); this._off = null; } if (this._controls) { this._controls.destroy(); this._controls = null; } if (this._engine) { this._engine.destroy(); this._engine = null; } if (this._diagram) { this._diagram.destroy(); this._diagram = null; } }
  };
  AV.registerModule(module);
})();
