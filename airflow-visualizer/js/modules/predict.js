/* ============================================================
   modules/predict.js — Predict What Airflow Does
   ------------------------------------------------------------
   List of code snippets → a predict-then-reveal panel per snippet
   (predict-output.js). Records to AV.Progress ("predict").
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  function data() { return (AV.data && AV.data.predict) || []; }

  var module = {
    id: "predict",
    title: "Predict What Airflow Does",
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
      var self = this, items = data();
      var prog = AV.Progress ? AV.Progress.items("predict") : {};
      var cats = [], seen = {};
      items.forEach(function (s) { if (!seen[s.category]) { seen[s.category] = 1; cats.push(s.category); } });
      var chips = ['<button class="prep-chip' + (this._filter === "all" ? " active" : "") + '" data-cat="all">All</button>']
        .concat(cats.map(function (c) { return '<button class="prep-chip' + (self._filter === c ? " active" : "") + '" data-cat="' + c + '">' + c + "</button>"; })).join("");
      var shown = items.filter(function (s) { return self._filter === "all" || s.category === self._filter; });
      var cards = shown.map(function (s) {
        var seenIt = prog[s.id] && prog[s.id].done;
        return '<button class="prep-card" data-id="' + s.id + '">' +
          '<div class="prep-card-top"><span class="prep-card-icon">🔮</span><span class="prep-card-title">' + s.title + "</span></div>" +
          '<div class="prep-card-sym">' + s.question + "</div>" +
          '<div class="prep-badges"><span class="prep-badge cat">' + s.category + "</span></div>" +
          '<div class="prep-card-foot">' + (seenIt ? '<span class="prep-seen">Reviewed</span>' : "<span></span>") +
            '<span class="prep-go">Predict →</span></div></button>';
      }).join("");
      this._container.innerHTML =
        '<div class="module-header animate-fade-in-up">' +
          '<div class="module-eyebrow">Interview Prep · Read the DAG, call the behaviour</div>' +
          '<h1 class="module-title">Predict What Airflow Does</h1>' +
          '<p class="module-subtitle">Short DAG snippets with one question each: what happens when this runs? ' +
          "Predict first, then reveal what Airflow actually does and why — the fastest way to test real " +
          "understanding.</p>" +
        "</div>" +
        '<div class="prep-filter">' + chips + "</div>" +
        '<div class="prep-grid">' + cards + "</div>";
    },

    open: function (id) {
      var self = this, items = data(), it = null;
      for (var i = 0; i < items.length; i++) if (items[i].id === id) { it = items[i]; break; }
      if (!it || !AV.PredictOutput) { this.renderList(); return; }
      this._container.innerHTML = '<div class="prep-back"><button class="btn btn-secondary prep-detail-back">← All snippets</button></div>';
      var flow = AV.PredictOutput.create(it, function () { self.renderList(); });
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
