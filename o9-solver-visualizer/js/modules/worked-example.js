/* modules/worked-example.js — the doc's full Widget-A walkthrough (animated) */
(function () {
  "use strict";
  var AV = (window.SolverViz = window.SolverViz || {});
  var W = AV.CATMPN.widgetA;
  var STEPS = [
    { label: "1 · Rule engine input", kpi: [["On hand", W.onHand], ["Safety stock", W.safetyStock], ["Fcst/slot", W.forecastPerSlot]],
      desc: "Widget-A at DC-North: on-hand " + W.onHand + ", safety stock " + W.safetyStock + ", forecast " + W.forecastPerSlot + "/slot. Supplier lead time " + W.leadTimeDays + " days; Min " + W.minBoxes + " boxes, Mult " + W.multBoxes + "; next slot Week 3." },
    { label: "2 · Net requirement calc", kpi: [["Demand", W.demandToWeek3], ["Available", W.onHand], ["Net req", W.netRequirementUnits]],
      desc: "By Week 3 demand = 2 wks × 2 deliveries × 100 = " + W.demandToWeek3 + ". Available = " + W.onHand + ". Net = " + W.demandToWeek3 + " − " + W.onHand + " + " + W.safetyStock + " = <b>" + W.netRequirementUnits + " units</b>." },
    { label: "3 · Constraint application", kpi: [["Boxes needed", W.netRequirementBoxes], ["Min", W.minBoxes], ["Order", W.orderBoxes + " box"]],
      desc: W.netRequirementUnits + " ÷ " + W.unitsPerBox + " = " + W.netRequirementBoxes + " boxes. Min " + W.minBoxes + " ✓. Mult " + W.multBoxes + " → next valid = <b>" + W.orderBoxes + " boxes (" + W.orderUnits + " units)</b>." },
    { label: "4 · Timing", kpi: [["Lead time", W.leadTimeDays + "d"], ["Ship", "Mon Wk1"], ["Holiday?", "No"]],
      desc: "Required delivery = start of Week 3. Lead time " + W.leadTimeDays + " days → required ship date = today (Mon Wk1). IsHoliday = false ✓ valid ship date." },
    { label: "5 · Solver output", kpi: [["Dist Prod Qty", W.orderUnits], ["Purchase Sch", W.orderUnits], ["Dist Cons Qty", W.orderUnits]],
      desc: "Dist Prod Qty = " + W.orderUnits + " on Week 3; Purchase Schedule = " + W.orderUnits + " at Supplier X; Dist Cons Qty = " + W.orderUnits + " from Supplier X on Mon Wk1." },
    { label: "6 · Post-solve", kpi: [["Ending OH", W.endingOnHandWk3], ["Safety stock", W.safetyStock], ["Health", "InStock"]],
      desc: "SCS Ending on Hand (Wk3) = " + W.onHand + " − " + W.demandToWeek3 + " + " + W.orderUnits + " = <b>" + W.endingOnHandWk3 + "</b> > safety stock " + W.safetyStock + " → <b>InvHealth InStock</b>. No exception flags raised." }
  ];
  var module = {
    id: "worked-example", title: "Worked Example", fullWidth: true,
    _engine: null, _controls: null, _off: null,
    render: function (container) {
      container.innerHTML =
        '<div class="module-header animate-fade-in-up"><div class="module-eyebrow">Execution &amp; Outputs</div>' +
          '<h1 class="module-title gradient-text">Worked Example: Widget-A End to End</h1>' +
          '<p class="module-subtitle">The framework doc\'s full walkthrough — one Item-LC through all six solver stages, from rule-engine input to post-solve inventory health.</p></div>' +
        '<div class="arch-layout"><div class="arch-canvas" id="host"></div>' +
          '<aside class="arch-detail" id="detail"><h3>Ready — press play</h3><p>Step through the complete Widget-A solve.</p></aside></div>' +
        '<div class="arch-controls" id="controls"></div>' +
        '<div class="callout tip"><span class="callout-icon">📘</span><div class="callout-body">This is the canonical example every other module references. If you can narrate these six steps with the numbers, you can answer the core "walk me through a solve" interview question.</div></div>';
      var host = container.querySelector("#host");
      var detail = container.querySelector("#detail");
      function show(idx) {
        if (idx < 0) { host.innerHTML = '<div class="kpi-row" style="padding:8px"><div class="kpi"><div class="kpi-num">—</div><div class="kpi-label">press play</div></div></div>'; detail.innerHTML = "<h3>Ready — press play</h3><p>Step through the complete Widget-A solve.</p>"; return; }
        var s = STEPS[idx];
        host.innerHTML = '<div class="kpi-row" style="padding:8px">' + s.kpi.map(function (k, i) {
          var cls = idx === 5 ? (i === 2 ? "good" : "") : (i === s.kpi.length - 1 ? "accent" : "");
          return '<div class="kpi ' + cls + '"><div class="kpi-num">' + k[1] + '</div><div class="kpi-label">' + k[0] + '</div></div>';
        }).join("") + '</div>';
        detail.innerHTML = "<h3>" + s.label + "</h3><p>" + s.desc + "</p>";
      }
      var engine = new AV.AnimationEngine({ steps: STEPS.map(function (s) { return { label: s.label, duration: 2600 }; }), speed: 1 });
      this._engine = engine; this._off = engine.on("stepchange", function (idx) { show(idx); });
      var controls = AV.AnimationControls.create(engine, { title: "Ready — press play" });
      container.querySelector("#controls").appendChild(controls.el); this._controls = controls; show(-1);
    },
    destroy: function () { if (this._off) { this._off(); this._off = null; } if (this._controls) { this._controls.destroy(); this._controls = null; } if (this._engine) { this._engine.destroy(); this._engine = null; } }
  };
  AV.registerModule(module);
})();
