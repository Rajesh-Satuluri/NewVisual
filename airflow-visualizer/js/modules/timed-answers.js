/* ============================================================
   modules/timed-answers.js — 30s / 90s / 3-minute answers
   ------------------------------------------------------------
   List of topics → a tabbed 30s / 90s / 3-min answer per topic
   (tiered-answer.js).
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  function data() { return (AV.data && AV.data.answersTimed) || []; }

  var module = {
    id: "timed-answers",
    title: "30s / 90s / 3-min Answers",
    _container: null, _filter: "all", _onClick: null,

    render: function (container) {
      var self = this;
      this._container = container; this._filter = "all";
      this._onClick = function (e) {
        var chip = e.target.closest && e.target.closest(".prep-chip");
        if (chip && container.contains(chip)) { self._filter = chip.getAttribute("data-cat"); self.renderList(); return; }
        if (e.target.closest && e.target.closest(".ta-back")) { self.renderList(); return; }
        var card = e.target.closest && e.target.closest(".prep-card[data-id]");
        if (card && container.contains(card)) { self.open(card.getAttribute("data-id")); return; }
      };
      container.addEventListener("click", this._onClick);
      this.renderList();
    },

    renderList: function () {
      var self = this, items = data();
      var cats = [], seen = {};
      items.forEach(function (s) { if (!seen[s.category]) { seen[s.category] = 1; cats.push(s.category); } });
      var chips = ['<button class="prep-chip' + (this._filter === "all" ? " active" : "") + '" data-cat="all">All</button>']
        .concat(cats.map(function (c) { return '<button class="prep-chip' + (self._filter === c ? " active" : "") + '" data-cat="' + c + '">' + c + "</button>"; })).join("");
      var shown = items.filter(function (s) { return self._filter === "all" || s.category === self._filter; });
      var cards = shown.map(function (s) {
        return '<button class="prep-card" data-id="' + s.id + '">' +
          '<div class="prep-card-top"><span class="prep-card-icon">⏱️</span><span class="prep-card-title">' + s.question + "</span></div>" +
          '<div class="prep-badges"><span class="prep-badge cat">' + s.category + "</span>" +
            '<span class="prep-badge steps">30s · 90s · 3 min</span></div>' +
          '<div class="prep-card-foot"><span></span><span class="prep-go">Pick your depth →</span></div></button>';
      }).join("");
      this._container.innerHTML =
        '<div class="module-header animate-fade-in-up">' +
          '<div class="module-eyebrow">Interview Prep · Right-size the answer</div>' +
          '<h1 class="module-title">30-second, 90-second &amp; 3-minute answers</h1>' +
          '<p class="module-subtitle">Every topic answered at three depths — a crisp 30-second reply, a ' +
          "90-second concept-plus-example, and a 3-minute deep dive with trade-offs. Rehearse the length the " +
          "moment calls for.</p>" +
        "</div>" +
        '<div class="prep-filter">' + chips + "</div>" +
        '<div class="prep-grid">' + cards + "</div>";
    },

    open: function (id) {
      var self = this, items = data(), it = null;
      for (var i = 0; i < items.length; i++) if (items[i].id === id) { it = items[i]; break; }
      if (!it || !AV.TieredAnswer) { this.renderList(); return; }
      this._container.innerHTML = "";
      var flow = AV.TieredAnswer.create(it, function () { self.renderList(); }, { cat: "answers-timed", tierNote: "by depth" });
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
