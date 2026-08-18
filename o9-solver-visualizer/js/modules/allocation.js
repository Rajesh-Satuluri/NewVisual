/* modules/allocation.js — HOW allocation is decided (priority waterfall) */
(function () {
  "use strict";
  var AV = (window.SolverViz = window.SolverViz || {});
  // Available supply is short: 300 units to distribute across 4 demand tiers wanting 500 total.
  var AVAIL = 300;
  var TIERS = [
    { name: "Priority Part (SCHEDULE ORDER)", want: 150 },
    { name: "SCHEDULE ORDER", want: 120 },
    { name: "COMMERCIAL", want: 130 },
    { name: "PULL", want: 100 }
  ];
  var module = {
    id: "allocation", title: "Allocation", fullWidth: true,
    _engine: null, _controls: null, _off: null,
    render: function (container) {
      var self = this;
      container.innerHTML =
        '<div class="module-header animate-fade-in-up"><div class="module-eyebrow">Solver Decisions · allocation</div>' +
          '<h1 class="module-title gradient-text">How Allocation Is Decided</h1>' +
          '<p class="module-subtitle">When supply is insufficient, the solver distributes it by a strict hierarchy — never arbitrarily. Watch ' + AVAIL + ' units fill 4 competing demand tiers wanting 500.</p></div>' +
        '<div class="arch-layout"><div class="arch-canvas" id="host"></div>' +
          '<aside class="arch-detail" id="detail"><h3>Ready — press play</h3><p>Only ' + AVAIL + ' units available. Higher tiers fill first; lower tiers go short.</p></aside></div>' +
        '<div class="arch-controls" id="controls"></div>' +
        '<section class="section"><h2 class="section-title">The priority hierarchy</h2><dl class="concept-def">' +
          '<dt>Tier order</dt><dd>Priority Parts → SCHEDULE ORDER → COMMERCIAL → PULL.</dd>' +
          '<dt>Tie-break</dt><dd><code>Demand Priority – CCtILO(D)</code> ranks records within a tier.</dd>' +
          '<dt>Recorded</dt><dd><code>Allocated Qty – CILCDcConColGonGln</code> per customer; aggregated to DeskCode via <code>Allocated Quantity – ILDC</code>.</dd></dl>' +
          '<div><span class="measure-pill">Demand Priority – CCtILO(D)</span><span class="measure-pill">Allocated Qty</span><span class="measure-pill">Customer Type Priority</span></div></section>';
      var host = container.querySelector("#host");
      var detail = container.querySelector("#detail");
      function draw(idx) {
        var remaining = AVAIL, rows = "";
        for (var i = 0; i < TIERS.length; i++) {
          var t = TIERS[i], got = 0, revealed = i <= idx;
          if (revealed) { got = Math.max(0, Math.min(t.want, remaining)); remaining -= got; }
          var pct = Math.round((got / t.want) * 100);
          var shortCls = revealed && got < t.want ? " short" : "";
          rows += '<div class="alloc-tier' + shortCls + '"><span class="tier-name">' + t.name + '</span>' +
            '<span class="tier-bar" style="width:' + (revealed ? Math.max(6, pct) : 0) + '%"></span>' +
            '<span class="tier-qty">' + (revealed ? got + " / " + t.want : "– / " + t.want) + '</span></div>';
        }
        host.innerHTML = '<div style="width:100%;padding:8px">' + rows + '</div>';
      }
      var STEPS = TIERS.map(function (t, i) {
        return { label: "Fill: " + t.name, note: "" , i: i };
      });
      function show(idx) {
        draw(idx);
        if (idx < 0) { detail.innerHTML = "<h3>Ready — press play</h3><p>Only " + AVAIL + " units available.</p>"; return; }
        var remaining = AVAIL;
        for (var i = 0; i <= idx; i++) remaining -= Math.max(0, Math.min(TIERS[i].want, remaining));
        var t = TIERS[idx];
        detail.innerHTML = "<h3>" + t.name + "</h3><p>Allocated in priority order; <b>" + remaining + " units</b> remain after this tier. Lower tiers absorb the shortage.</p>";
      }
      var engine = new AV.AnimationEngine({ steps: STEPS.map(function (s) { return { label: s.label, duration: 2200 }; }), speed: 1 });
      this._engine = engine; this._off = engine.on("stepchange", function (idx) { show(idx); });
      var controls = AV.AnimationControls.create(engine, { title: "Ready — press play" });
      container.querySelector("#controls").appendChild(controls.el); this._controls = controls; show(-1);
    },
    destroy: function () { if (this._off) { this._off(); this._off = null; } if (this._controls) { this._controls.destroy(); this._controls = null; } if (this._engine) { this._engine.destroy(); this._engine = null; } }
  };
  AV.registerModule(module);
})();
