/* modules/net-requirements.js — WHAT supply to generate (animated calc) */
(function () {
  "use strict";
  var AV = (window.SolverViz = window.SolverViz || {});
  var W = AV.CATMPN.widgetA;
  // each step reveals part of the calculation; idx-driven (render 0..idx)
  var STEPS = [
    { label: "1 · Demand to Week 3", cls: "demand", val: "+" + W.demandToWeek3, note: "SplitWeek Final Forecast: 4 slots × 100 = " + W.demandToWeek3 + " units." },
    { label: "2 · Less beginning on-hand", cls: "onhand", val: "− " + W.onHand, note: "SCS Beginning on Hand already available = " + W.onHand + " units." },
    { label: "3 · Plus safety stock", cls: "ss", val: "+ " + W.safetyStock, note: "Safety Stock Final must be protected on top of demand." },
    { label: "4 · Net requirement", cls: "net", val: "= " + W.netRequirementUnits, note: "max(0, 400 − 200 + 150) = " + W.netRequirementUnits + " units. Positive → a supply signal is generated." },
    { label: "5 · Convert to boxes", cls: "box", val: W.netRequirementBoxes + " boxes", note: W.netRequirementUnits + " ÷ " + W.unitsPerBox + " units/box = " + W.netRequirementBoxes + " boxes needed." },
    { label: "6 · Apply Min then Mult", cls: "order", val: W.orderBoxes + " boxes = " + W.orderUnits + " units", note: "Min " + W.minBoxes + " ✓; round up to a multiple of " + W.multBoxes + " → " + W.orderBoxes + " boxes = Dist Prod Qty " + W.orderUnits + " units." }
  ];
  var module = {
    id: "net-requirements", title: "Net Requirements", fullWidth: true,
    _engine: null, _controls: null, _off: null,
    render: function (container) {
      var self = this;
      container.innerHTML =
        '<div class="module-header animate-fade-in-up"><div class="module-eyebrow">Solver Decisions · WHAT supply</div>' +
          '<h1 class="module-title gradient-text">Net Requirements</h1>' +
          '<p class="module-subtitle">The core of every solve: for each Item-LC-SplitWeek the solver computes how much new supply is needed, then rounds it to a valid order.</p></div>' +
        '<div class="formula" id="live-formula">Net Requirement = max(0, SCS Fcst Qty − SCS Beginning on Hand + Safety Stock Final)</div>' +
        '<div class="arch-layout"><div class="arch-canvas" id="calc"></div>' +
          '<aside class="arch-detail" id="detail"><h3>Ready — press play</h3><p>Step through the calculation for Widget-A.</p></aside></div>' +
        '<div class="arch-controls" id="controls"></div>' +
        '<section class="section"><h2 class="section-title">The result</h2>' +
          '<div class="kpi-row">' +
            '<div class="kpi"><div class="kpi-num">' + W.demandToWeek3 + '</div><div class="kpi-label">Demand</div></div>' +
            '<div class="kpi"><div class="kpi-num">' + W.onHand + '</div><div class="kpi-label">On hand</div></div>' +
            '<div class="kpi"><div class="kpi-num">' + W.safetyStock + '</div><div class="kpi-label">Safety stock</div></div>' +
            '<div class="kpi accent"><div class="kpi-num">' + W.netRequirementUnits + '</div><div class="kpi-label">Net requirement</div></div>' +
            '<div class="kpi good"><div class="kpi-num">' + W.orderUnits + '</div><div class="kpi-label">Order (after Min/Mult)</div></div>' +
          '</div>' +
          '<div><span class="measure-pill">SplitWeek Final Forecast</span><span class="measure-pill">SCS Beginning on Hand</span><span class="measure-pill">Safety Stock Final</span><span class="measure-pill">Dist Prod Qty – BILT(D)</span></div></section>' +
        '<div class="callout tip"><span class="callout-icon">🧮</span><div class="callout-body">If net requirement is ≤ 0, <b>no supply is generated</b> — on-hand plus safety stock already covers demand. For kits, component demand is derived via Cons Qty Per (the BOM explosion).</div></div>';
      var host = container.querySelector("#calc");
      var detail = container.querySelector("#detail");
      function ladder(idx) {
        var rows = "";
        for (var i = 0; i <= idx; i++) {
          var s = STEPS[i];
          rows += '<div class="calc-row calc-' + s.cls + '"><span class="calc-label">' + s.label + '</span><span class="calc-val">' + s.val + '</span></div>';
        }
        host.innerHTML = '<div class="calc-ladder">' + (rows || '<div class="calc-row"><span class="calc-label">Press play…</span></div>') + '</div>';
      }
      function show(idx) {
        if (idx < 0) { ladder(-1); detail.innerHTML = "<h3>Ready — press play</h3><p>Step through the calculation for Widget-A.</p>"; return; }
        ladder(idx);
        detail.innerHTML = "<h3>" + STEPS[idx].label + "</h3><p>" + STEPS[idx].note + "</p>";
      }
      var engine = new AV.AnimationEngine({ steps: STEPS.map(function (s) { return { label: s.label, duration: 2300 }; }), speed: 1 });
      this._engine = engine; this._off = engine.on("stepchange", function (idx) { show(idx); });
      var controls = AV.AnimationControls.create(engine, { title: "Ready — press play" });
      container.querySelector("#controls").appendChild(controls.el); this._controls = controls; show(-1);
    },
    destroy: function () { if (this._off) { this._off(); this._off = null; } if (this._controls) { this._controls.destroy(); this._controls = null; } if (this._engine) { this._engine.destroy(); this._engine = null; } }
  };
  AV.registerModule(module);
})();
