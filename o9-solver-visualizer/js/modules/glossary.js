/* modules/glossary.js — searchable glossary of every o9 measure/term */
(function () {
  "use strict";
  var AV = (window.SolverViz = window.SolverViz || {});
  var C = AV.CATMPN;
  // Build the term list from the structured inputs + constraints data.
  var TERMS = [];
  Object.keys(C.inputs).forEach(function (k) {
    var cat = C.inputs[k];
    cat.measures.forEach(function (m) { TERMS.push({ term: m[0], def: m[1], grp: cat.title }); });
  });
  Object.keys(C.constraints).forEach(function (k) {
    var cat = C.constraints[k];
    cat.items.forEach(function (m) { TERMS.push({ term: m[0], def: m[1], grp: cat.title }); });
  });
  // A few core decision/output terms
  [["Net Requirement", "max(0, SCS Fcst Qty − SCS Beginning on Hand + Safety Stock Final).", "Solver Decisions"],
   ["Dist Prod Qty – BILT(D)", "Planned receipt quantity at a node.", "Outputs"],
   ["Purchase Schedule Qty CM", "Recommended supplier purchase.", "Outputs"],
   ["SCS Ending on Hand", "Projected closing inventory per period.", "Outputs"],
   ["MaterialRootCause(Solver)", "Graph that traces a shortage to its upstream origin.", "Shortages"],
   ["Dist Consumption Pegging (D)(Solver)", "Links demand to the supply draw that fulfils it.", "Pegging"],
   ["Dist Production Pegging (D)(Solver)", "Links a receipt to its upstream supply.", "Pegging"],
   ["Line Down Date", "Date a line stops due to a Priority-Part shortage.", "Exceptions"]
  ].forEach(function (t) { TERMS.push({ term: t[0], def: t[1], grp: t[2] }); });
  TERMS.sort(function (a, b) { return a.term.localeCompare(b.term); });

  var module = {
    id: "glossary", title: "Glossary", _s: null,
    render: function (container) {
      container.innerHTML =
        '<div class="module-header animate-fade-in-up"><div class="module-eyebrow">Learning Mode</div>' +
          '<h1 class="module-title gradient-text">Glossary</h1>' +
          '<p class="module-subtitle">' + TERMS.length + ' o9 measures and terms used across CATMPN — searchable.</p></div>' +
        '<input id="g-search" class="q-search" type="text" placeholder="Search terms… (e.g. freeze, split ratio, pegging)" />' +
        '<div id="g-list"></div>';
      var list = container.querySelector("#g-list");
      function render(f) {
        f = (f || "").toLowerCase();
        var items = TERMS.filter(function (t) { return !f || (t.term + " " + t.def + " " + t.grp).toLowerCase().indexOf(f) >= 0; });
        list.innerHTML = items.length ? items.map(function (t) {
          return '<div class="gloss-item"><span class="gloss-term">' + t.term + '</span><span class="gloss-grp">' + t.grp + '</span><div class="gloss-def">' + t.def + '</div></div>';
        }).join("") : '<p style="color:var(--text-muted);padding:16px">No terms match.</p>';
      }
      render("");
      var search = container.querySelector("#g-search");
      this._s = function () { render(search.value); };
      search.addEventListener("input", this._s);
      this._search = search;
    },
    destroy: function () { if (this._search && this._s) this._search.removeEventListener("input", this._s); this._s = this._search = null; }
  };
  AV.registerModule(module);
})();
