/* ============================================================
   modules/troubleshooting.js — Troubleshooting Lab
   ------------------------------------------------------------
   List of production scenarios (filterable by category) → an
   interactive investigation flow per scenario (investigation-flow.js).
   Progress is recorded through AV.Progress ("troubleshooting").
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});
  var DIFF = { easy: "Concept", med: "Applied", hard: "Production" };

  function data() { return (AV.data && AV.data.troubleshooting) || []; }

  var module = {
    id: "troubleshooting",
    title: "Troubleshooting Lab",
    _container: null,
    _filter: "all",
    _onClick: null,

    render: function (container) {
      var self = this;
      this._container = container;
      this._filter = "all";
      this._onClick = function (e) {
        var chip = e.target.closest && e.target.closest(".prep-chip");
        if (chip && container.contains(chip)) {
          self._filter = chip.getAttribute("data-cat");
          self.renderList();
          return;
        }
        if (e.target.closest && e.target.closest(".prep-detail-back")) {
          self.renderList();
          return;
        }
        var card = e.target.closest && e.target.closest(".prep-card[data-id]");
        if (card && container.contains(card)) {
          self.openScenario(card.getAttribute("data-id"));
          return;
        }
      };
      container.addEventListener("click", this._onClick);
      this.renderList();
    },

    renderList: function () {
      var self = this;
      var items = data();
      var solved = AV.Progress ? AV.Progress.items("troubleshooting") : {};

      var cats = [], seen = {};
      items.forEach(function (s) { if (!seen[s.category]) { seen[s.category] = 1; cats.push(s.category); } });
      var chips = ['<button class="prep-chip' + (this._filter === "all" ? " active" : "") + '" data-cat="all">All</button>']
        .concat(cats.map(function (c) {
          return '<button class="prep-chip' + (self._filter === c ? " active" : "") +
            '" data-cat="' + c + '">' + c + "</button>";
        })).join("");

      var shown = items.filter(function (s) {
        return self._filter === "all" || s.category === self._filter;
      });
      var cards = shown.map(function (s) {
        var done = solved[s.id] && solved[s.id].solved;
        return '<button class="prep-card" data-id="' + s.id + '">' +
          '<div class="prep-card-top"><span class="prep-card-icon">' + s.icon + "</span>" +
            '<span class="prep-card-title">' + s.title + "</span></div>" +
          '<div class="prep-card-sym">' + s.symptom + "</div>" +
          '<div class="prep-badges"><span class="prep-badge cat">' + s.category + "</span>" +
            '<span class="prep-badge diff-' + s.difficulty + '">' + (DIFF[s.difficulty] || s.difficulty) + "</span></div>" +
          '<div class="prep-card-foot">' +
            (done ? '<span class="prep-solved">✓ Solved</span>' : "<span></span>") +
            '<span class="prep-go">Investigate →</span></div>' +
        "</button>";
      }).join("");

      var solvedCount = 0;
      for (var k in solved) if (solved.hasOwnProperty(k) && solved[k].solved) solvedCount++;

      this._container.innerHTML =
        '<div class="module-header animate-fade-in-up">' +
          '<div class="module-eyebrow">Interview Prep · Diagnose like an on-call engineer</div>' +
          '<h1 class="module-title">Troubleshooting Lab</h1>' +
          '<p class="module-subtitle">Real production symptoms. At each step you choose what to check ' +
          "next — right calls reveal the evidence and the reasoning, wrong calls explain the " +
          "misconception. Reach the root cause, then rehearse the fix and the interview answer.</p>" +
          (solvedCount ? '<p class="prep-tally">' + solvedCount + " of " + items.length + " scenarios solved.</p>" : "") +
        "</div>" +
        '<div class="prep-filter">' + chips + "</div>" +
        '<div class="prep-grid">' + cards + "</div>";
    },

    openScenario: function (id) {
      var self = this;
      var items = data(), scn = null;
      for (var i = 0; i < items.length; i++) if (items[i].id === id) { scn = items[i]; break; }
      if (!scn || !AV.InvestigationFlow) { this.renderList(); return; }
      this._container.innerHTML =
        '<div class="prep-back"><button class="btn btn-secondary prep-detail-back">← All scenarios</button></div>';
      var flow = AV.InvestigationFlow.create(scn, function () { self.renderList(); });
      this._container.appendChild(flow.el);
      var canvas = document.getElementById("canvas");
      if (canvas) canvas.scrollTop = 0;
    },

    destroy: function () {
      if (this._onClick && this._container) this._container.removeEventListener("click", this._onClick);
      this._onClick = null;
      this._container = null;
    }
  };

  AV.registerModule(module);
})();
