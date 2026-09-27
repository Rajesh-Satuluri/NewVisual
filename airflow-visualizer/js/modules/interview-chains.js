/* ============================================================
   modules/interview-chains.js — Follow-up Interview Chains
   ------------------------------------------------------------
   List of topics (filterable) → a progressive follow-up drill per
   topic (follow-up-chain.js). Self-ratings are recorded through
   AV.Progress ("chains").
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  function data() { return (AV.data && AV.data.chains) || []; }

  var module = {
    id: "interview-chains",
    title: "Follow-up Interview Chains",
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
          self.openChain(card.getAttribute("data-id"));
          return;
        }
      };
      container.addEventListener("click", this._onClick);
      this.renderList();
    },

    renderList: function () {
      var self = this;
      var items = data();
      var prog = AV.Progress ? AV.Progress.items("chains") : {};

      var cats = [], seen = {};
      items.forEach(function (c) {
        var cat = c.category || "interview";
        if (!seen[cat]) { seen[cat] = 1; cats.push(cat); }
      });
      var chips = ['<button class="prep-chip' + (this._filter === "all" ? " active" : "") + '" data-cat="all">All</button>']
        .concat(cats.map(function (c) {
          return '<button class="prep-chip' + (self._filter === c ? " active" : "") +
            '" data-cat="' + c + '">' + c + "</button>";
        })).join("");

      var shown = items.filter(function (c) {
        return self._filter === "all" || (c.category || "interview") === self._filter;
      });
      var cards = shown.map(function (c) {
        var rec = prog[c.id];
        var done = rec && rec.done;
        var foot = done
          ? '<span class="prep-solved">✓ ' + rec.got + " / " + rec.total + " nailed</span>"
          : "<span></span>";
        return '<button class="prep-card" data-id="' + c.id + '">' +
          '<div class="prep-card-top"><span class="prep-card-icon">🎤</span>' +
            '<span class="prep-card-title">' + c.topic + "</span></div>" +
          (c.note ? '<div class="prep-card-sym">' + c.note + "</div>" : "") +
          '<div class="prep-badges"><span class="prep-badge cat">' + (c.category || "interview") + "</span>" +
            '<span class="prep-badge steps">' + c.steps.length + " questions · gets harder</span></div>" +
          '<div class="prep-card-foot">' + foot +
            '<span class="prep-go">Start the drill →</span></div>' +
        "</button>";
      }).join("");

      this._container.innerHTML =
        '<div class="module-header animate-fade-in-up">' +
          '<div class="module-eyebrow">Interview Prep · Handle the follow-up, not just the opener</div>' +
          '<h1 class="module-title">Follow-up Interview Chains</h1>' +
          '<p class="module-subtitle">Real interviews don\'t stop at the first answer — they drill deeper. ' +
          "Each chain is one topic pushed question by question, from the opener to the senior-level " +
          "follow-up. Answer, reveal the model answer, rate yourself, and take the next hit.</p>" +
        "</div>" +
        '<div class="prep-filter">' + chips + "</div>" +
        '<div class="prep-grid">' + cards + "</div>";
    },

    openChain: function (id) {
      var self = this;
      var items = data(), chain = null;
      for (var i = 0; i < items.length; i++) if (items[i].id === id) { chain = items[i]; break; }
      if (!chain || !AV.FollowUpChain) { this.renderList(); return; }
      this._container.innerHTML =
        '<div class="prep-back"><button class="btn btn-secondary prep-detail-back">← All chains</button></div>';
      var flow = AV.FollowUpChain.create(chain, function () { self.renderList(); });
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
