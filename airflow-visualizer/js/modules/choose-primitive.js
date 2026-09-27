/* ============================================================
   modules/choose-primitive.js — Choose the Right Primitive
   ------------------------------------------------------------
   List of requirement-based decisions (filterable) → a trade-off
   picker per decision (choose-approach.js). Records to AV.Progress
   ("choose").
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});
  var DIFF = { easy: "Concept", med: "Applied", hard: "Production" };

  function data() { return (AV.data && AV.data.choose) || []; }

  var module = {
    id: "choose-primitive",
    title: "Choose the Right Primitive",
    _container: null,
    _filter: "all",
    _onClick: null,

    render: function (container) {
      var self = this;
      this._container = container;
      this._filter = "all";
      this._onClick = function (e) {
        var chip = e.target.closest && e.target.closest(".prep-chip");
        if (chip && container.contains(chip)) { self._filter = chip.getAttribute("data-cat"); self.renderList(); return; }
        if (e.target.closest && e.target.closest(".prep-detail-back")) { self.renderList(); return; }
        var card = e.target.closest && e.target.closest(".prep-card[data-id]");
        if (card && container.contains(card)) { self.open(card.getAttribute("data-id")); return; }
      };
      container.addEventListener("click", this._onClick);
      this.renderList();
    },

    renderList: function () {
      var self = this;
      var items = data();
      var prog = AV.Progress ? AV.Progress.items("choose") : {};

      var cats = [], seen = {};
      items.forEach(function (s) { if (!seen[s.category]) { seen[s.category] = 1; cats.push(s.category); } });
      var chips = ['<button class="prep-chip' + (this._filter === "all" ? " active" : "") + '" data-cat="all">All</button>']
        .concat(cats.map(function (c) {
          return '<button class="prep-chip' + (self._filter === c ? " active" : "") + '" data-cat="' + c + '">' + c + "</button>";
        })).join("");

      var shown = items.filter(function (s) { return self._filter === "all" || s.category === self._filter; });
      var cards = shown.map(function (s) {
        var rec = prog[s.id];
        var foot = rec && rec.correct ? '<span class="prep-solved">✓ Nailed</span>'
          : rec ? '<span class="prep-seen">Reviewed</span>' : "<span></span>";
        return '<button class="prep-card" data-id="' + s.id + '">' +
          '<div class="prep-card-top"><span class="prep-card-icon">⚖️</span>' +
            '<span class="prep-card-title">' + s.title + "</span></div>" +
          '<div class="prep-card-sym">' + s.requirement + "</div>" +
          '<div class="prep-badges"><span class="prep-badge cat">' + s.category + "</span>" +
            '<span class="prep-badge diff-' + s.difficulty + '">' + (DIFF[s.difficulty] || s.difficulty) + "</span></div>" +
          '<div class="prep-card-foot">' + foot + '<span class="prep-go">Decide →</span></div>' +
        "</button>";
      }).join("");

      this._container.innerHTML =
        '<div class="module-header animate-fade-in-up">' +
          '<div class="module-eyebrow">Interview Prep · Pick the right tool, and know why</div>' +
          '<h1 class="module-title">Choose the Right Primitive</h1>' +
          '<p class="module-subtitle">A requirement, several plausible approaches. Pick one, then see why ' +
          "each option is the best fit, merely viable, or wrong — and what would change your answer if the " +
          "requirement changed. This is how senior candidates reason out loud.</p>" +
        "</div>" +
        '<div class="prep-filter">' + chips + "</div>" +
        '<div class="prep-grid">' + cards + "</div>";
    },

    open: function (id) {
      var self = this;
      var items = data(), scn = null;
      for (var i = 0; i < items.length; i++) if (items[i].id === id) { scn = items[i]; break; }
      if (!scn || !AV.ChooseApproach) { this.renderList(); return; }
      this._container.innerHTML =
        '<div class="prep-back"><button class="btn btn-secondary prep-detail-back">← All decisions</button></div>';
      var flow = AV.ChooseApproach.create(scn, function () { self.renderList(); });
      this._container.appendChild(flow.el);
      var canvas = document.getElementById("canvas");
      if (canvas) canvas.scrollTop = 0;
    },

    destroy: function () {
      if (this._onClick && this._container) this._container.removeEventListener("click", this._onClick);
      this._onClick = null; this._container = null;
    }
  };

  AV.registerModule(module);
})();
