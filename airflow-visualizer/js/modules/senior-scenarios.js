/* ============================================================
   modules/senior-scenarios.js — Senior Scenario Mode (Level 3)
   ------------------------------------------------------------
   Production-reasoning scenarios (L3): read the situation, think,
   then reveal what a senior weighs plus a strong answer and the edge
   case. Complements the L1 (concept) and L2 (applied) material in the
   concept modules. Records to AV.Progress ("senior").
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  function data() { return (AV.data && AV.data.senior) || []; }

  var module = {
    id: "senior-scenarios",
    title: "Senior Scenario Mode",
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
        if (e.target.closest && e.target.closest(".sen-reveal")) { self.reveal(); return; }
        var card = e.target.closest && e.target.closest(".prep-card[data-id]");
        if (card && container.contains(card)) { self.open(card.getAttribute("data-id")); return; }
      };
      container.addEventListener("click", this._onClick);
      this.renderList();
    },

    renderList: function () {
      var self = this;
      var items = data();
      var prog = AV.Progress ? AV.Progress.items("senior") : {};

      var cats = [], seen = {};
      items.forEach(function (s) { if (!seen[s.category]) { seen[s.category] = 1; cats.push(s.category); } });
      var chips = ['<button class="prep-chip' + (this._filter === "all" ? " active" : "") + '" data-cat="all">All</button>']
        .concat(cats.map(function (c) {
          return '<button class="prep-chip' + (self._filter === c ? " active" : "") + '" data-cat="' + c + '">' + c + "</button>";
        })).join("");
      var shown = items.filter(function (s) { return self._filter === "all" || s.category === self._filter; });
      var cards = shown.map(function (s) {
        var seenIt = prog[s.id] && prog[s.id].done;
        return '<button class="prep-card" data-id="' + s.id + '">' +
          '<div class="prep-card-top"><span class="prep-card-icon">🧠</span>' +
            '<span class="prep-card-title">' + s.topic + "</span></div>" +
          '<div class="prep-card-sym">' + s.scenario + "</div>" +
          '<div class="prep-badges"><span class="prep-badge cat">' + s.category + "</span>" +
            '<span class="prep-badge diff-hard">Production · L3</span></div>' +
          '<div class="prep-card-foot">' + (seenIt ? '<span class="prep-seen">Reviewed</span>' : "<span></span>") +
            '<span class="prep-go">Think it through →</span></div>' +
        "</button>";
      }).join("");

      this._container.innerHTML =
        '<div class="module-header animate-fade-in-up">' +
          '<div class="module-eyebrow">Interview Prep · Level 3 · Production reasoning</div>' +
          '<h1 class="module-title">Senior Scenario Mode</h1>' +
          '<p class="module-subtitle">Not “what is X” — these are “this is happening in production, ' +
          "what do you change, and what are the trade-offs.” Read the situation, form your answer, then " +
          "reveal what a senior data engineer weighs and how they'd respond.</p>" +
        "</div>" +
        '<div class="prep-filter">' + chips + "</div>" +
        '<div class="prep-grid">' + cards + "</div>";
    },

    open: function (id) {
      var items = data(), s = null;
      for (var i = 0; i < items.length; i++) if (items[i].id === id) { s = items[i]; break; }
      if (!s) { this.renderList(); return; }
      this._current = s;
      this._container.innerHTML =
        '<div class="prep-back"><button class="btn btn-secondary prep-detail-back">← All scenarios</button></div>' +
        '<div class="sen">' +
          '<div class="sen-head"><div class="sen-topic">' + s.topic + "</div>" +
            '<div class="prep-badges"><span class="prep-badge cat">' + s.category + "</span>" +
              '<span class="prep-badge diff-hard">Production · L3</span></div></div>' +
          '<div class="callout info sen-scenario"><span class="callout-icon">🏭</span>' +
            '<div class="callout-body">' + s.scenario + "</div></div>" +
          '<div class="sen-hint">Form your answer first — what would you change, and why? Then reveal.</div>' +
          '<button class="btn btn-primary sen-reveal">Reveal senior approach</button>' +
          '<div class="sen-answer" hidden></div>' +
        "</div>";
      var canvas = document.getElementById("canvas");
      if (canvas) canvas.scrollTop = 0;
    },

    reveal: function () {
      var s = this._current;
      if (!s) return;
      if (AV.Progress) AV.Progress.record("senior", s.id, { done: true, category: s.category });
      var chips = (s.considerations || []).map(function (c) {
        return '<span class="fuc-chip">' + c + "</span>";
      }).join("");
      var box = this._container.querySelector(".sen-answer");
      if (!box) return;
      box.innerHTML =
        (chips ? '<div class="sen-a-row"><span class="fuc-tag">A senior weighs</span><div class="fuc-chips">' + chips + "</div></div>" : "") +
        '<div class="callout tip sen-strong"><span class="callout-icon">⭐</span>' +
          '<div class="callout-body"><b>Strong answer.</b> ' + s.strongAnswer + "</div></div>" +
        (s.edge
          ? '<div class="callout warn sen-edge"><span class="callout-icon">⚠️</span>' +
            '<div class="callout-body"><b>Edge case.</b> ' + s.edge + "</div></div>"
          : "");
      box.hidden = false;
      var btn = this._container.querySelector(".sen-reveal");
      if (btn) btn.disabled = true;
    },

    destroy: function () {
      if (this._onClick && this._container) this._container.removeEventListener("click", this._onClick);
      this._onClick = null; this._container = null; this._current = null;
    }
  };

  AV.registerModule(module);
})();
