/* modules/sourcing-logic.js — WHERE to source from (interactive modes) */
(function () {
  "use strict";
  var AV = (window.SolverViz = window.SolverViz || {});
  var MODES = {
    single: { title: "Single-source", desc: "One active BILT lane for the Item-LC. The decision is deterministic — there is only one place to source Widget-A from.", pill: "BILT lane" },
    multi: { title: "Multi-source (dual supplier)", desc: "Two+ sources. The solver applies <b>Dist Supplier Split Ratio – BILT(D)(Solver)</b> to split demand — e.g. Supplier A 60% / Supplier B 40% — generating two purchase schedules in proportion.", pill: "Dist Supplier Split Ratio" },
    echelon: { title: "Multi-echelon", desc: "The item flows through several DCs. The solver sources the immediate upstream node (Regional DC), which sources Central DC, which sources the Supplier — a cascading level-by-level chain.", pill: "cascading BILT" },
    kit: { title: "Kit items", desc: "Component supply is sourced via the <b>BILT(ConsSolver) Graph</b> consumption associations, positioned at the assembly LC before the Kit Lead Time deadline.", pill: "BILT(ConsSolver) Graph" }
  };
  var module = {
    id: "sourcing-logic", title: "Sourcing Logic", _h: null,
    render: function (container) {
      container.innerHTML =
        '<div class="module-header animate-fade-in-up"><div class="module-eyebrow">Solver Decisions · WHERE supply</div>' +
          '<h1 class="module-title gradient-text">Sourcing Logic</h1>' +
          '<p class="module-subtitle">Where the solver sources supply depends on the network graph and priority configuration. Pick a sourcing mode:</p></div>' +
        '<div class="view-toggle" id="mode-toggle">' +
          '<button data-m="single" class="active">Single</button><button data-m="multi">Multi-source</button>' +
          '<button data-m="echelon">Multi-echelon</button><button data-m="kit">Kit</button></div>' +
        '<div class="arch-layout"><div class="arch-canvas" id="canvas-host"></div>' +
          '<aside class="arch-detail" id="detail"></aside></div>' +
        '<section class="section"><h2 class="section-title">How the solver chooses</h2><dl class="concept-def">' +
          '<dt>Prod Priority</dt><dd>When multiple lanes serve the same item, <code>Prod Priority – BILT(Solver)</code> sequences which lane is used first.</dd>' +
          '<dt>Split Ratio</dt><dd>Multi-source demand is allocated in fixed proportions — the solver cannot arbitrarily move 100% to one supplier.</dd>' +
          '<dt>Validity</dt><dd>Only lanes active on today\'s date (Effective In/Out) are considered.</dd></dl></section>';
      var NBASE = [
        { id: "supplier", label: "Supplier X", sub: "source", x: 40, y: 95, w: 150, h: 54, color: "supplier" },
        { id: "supplierB", label: "Supplier Y", sub: "alt source", x: 40, y: 20, w: 150, h: 54, color: "supplier" },
        { id: "dc-nat", label: "DC-National", sub: "L3", x: 250, y: 95, w: 150, h: 54, color: "dc" },
        { id: "dc-north", label: "DC-North", sub: "L2", x: 450, y: 95, w: 150, h: 54, color: "dc" },
        { id: "lc-store", label: "LC-Store-A", sub: "L1", x: 640, y: 95, w: 130, h: 54, color: "lc" }
      ];
      var self = this;
      var diagram = null;
      function mount(mode) {
        if (diagram) diagram.destroy();
        var edges, active;
        if (mode === "single") { edges = [["supplier", "dc-nat"], ["dc-nat", "dc-north"], ["dc-north", "lc-store"]]; active = ["supplier"]; }
        else if (mode === "multi") { edges = [["supplier", "dc-nat"], ["supplierB", "dc-nat"], ["dc-nat", "dc-north"], ["dc-north", "lc-store"]]; active = ["supplier", "supplierB"]; }
        else if (mode === "echelon") { edges = [["supplier", "dc-nat"], ["dc-nat", "dc-north"], ["dc-north", "lc-store"]]; active = ["supplier", "dc-nat", "dc-north", "lc-store"]; }
        else { edges = [["supplier", "dc-nat"], ["dc-nat", "dc-north"], ["dc-north", "lc-store"]]; active = ["dc-north"]; }
        diagram = AV.ArchDiagram.create({ nodes: NBASE, edges: edges, viewBox: "0 0 790 165", onSelect: function () {} });
        container.querySelector("#canvas-host").appendChild(diagram.el);
        diagram.setActive(active, edges);
        var m = MODES[mode];
        container.querySelector("#detail").innerHTML = "<h3>" + m.title + "</h3><p>" + m.desc + "</p><p style=\"margin-top:8px\"><span class=\"measure-pill\">" + m.pill + "</span></p>";
      }
      mount("single");
      this._diagram = function () { return diagram; };
      var toggle = container.querySelector("#mode-toggle");
      this._h = function (e) { var b = e.target.closest("button[data-m]"); if (!b) return; toggle.querySelectorAll("button").forEach(function (x) { x.classList.remove("active"); }); b.classList.add("active"); mount(b.getAttribute("data-m")); };
      toggle.addEventListener("click", this._h);
      this._cleanup = function () { if (diagram) { diagram.destroy(); diagram = null; } };
    },
    destroy: function () { var t = document.querySelector("#mode-toggle"); if (t && this._h) t.removeEventListener("click", this._h); if (this._cleanup) this._cleanup(); this._h = null; }
  };
  AV.registerModule(module);
})();
