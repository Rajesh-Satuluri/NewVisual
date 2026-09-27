/* ============================================================
   modules/pipeline-design.js — Design an Airflow Pipeline
   ------------------------------------------------------------
   List of business briefs (filterable) → a guided design flow per
   brief (design-flow.js) ending in a reference architecture.
   Records to AV.Progress ("design").
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  function data() { return (AV.data && AV.data.pipelineDesign) || []; }

  var module = {
    id: "pipeline-design",
    title: "Design an Airflow Pipeline",
    _container: null, _filter: "all", _onClick: null,

    render: function (container) {
      var self = this;
      this._container = container; this._filter = "all";
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
      var prog = AV.Progress ? AV.Progress.items("design") : {};
      var cats = [], seen = {};
      items.forEach(function (s) { if (!seen[s.category]) { seen[s.category] = 1; cats.push(s.category); } });
      var chips = ['<button class="prep-chip' + (this._filter === "all" ? " active" : "") + '" data-cat="all">All</button>']
        .concat(cats.map(function (c) { return '<button class="prep-chip' + (self._filter === c ? " active" : "") + '" data-cat="' + c + '">' + c + "</button>"; })).join("");
      var shown = items.filter(function (s) { return self._filter === "all" || s.category === self._filter; });
      var cards = shown.map(function (s) {
        var done = prog[s.id] && prog[s.id].done;
        return '<button class="prep-card" data-id="' + s.id + '">' +
          '<div class="prep-card-top"><span class="prep-card-icon">🧱</span><span class="prep-card-title">' + s.title + "</span></div>" +
          '<div class="prep-card-sym">' + s.brief + "</div>" +
          '<div class="prep-badges"><span class="prep-badge cat">' + s.category + "</span>" +
            '<span class="prep-badge steps">' + s.decisions.length + " decisions</span></div>" +
          '<div class="prep-card-foot">' + (done ? '<span class="prep-solved">✓ Designed</span>' : "<span></span>") +
            '<span class="prep-go">Design it →</span></div></button>';
      }).join("");
      this._container.innerHTML =
        '<div class="module-header animate-fade-in-up">' +
          '<div class="module-eyebrow">Interview Prep · Whiteboard the pipeline</div>' +
          '<h1 class="module-title">Design an Airflow Pipeline</h1>' +
          '<p class="module-subtitle">A business brief, then the design decisions an interviewer walks you ' +
          "through — scheduling, data passing, idempotency, data quality, failure handling, backfill — each " +
          "with the trade-offs. Finish on an interview-quality reference architecture.</p>" +
        "</div>" +
        '<div class="prep-filter">' + chips + "</div>" +
        '<div class="prep-grid">' + cards + "</div>";
    },

    open: function (id) {
      var self = this, items = data(), d = null;
      for (var i = 0; i < items.length; i++) if (items[i].id === id) { d = items[i]; break; }
      if (!d || !AV.DesignFlow) { this.renderList(); return; }
      this._container.innerHTML = '<div class="prep-back"><button class="btn btn-secondary prep-detail-back">← All designs</button></div>';
      var flow = AV.DesignFlow.create(d, function () { self.renderList(); });
      this._container.appendChild(flow.el);
      var canvas = document.getElementById("canvas"); if (canvas) canvas.scrollTop = 0;
    },

    destroy: function () {
      if (this._onClick && this._container) this._container.removeEventListener("click", this._onClick);
      this._onClick = null; this._container = null;
    }
  };

  AV.registerModule(module);
})();
