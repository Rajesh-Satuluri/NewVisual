/* ============================================================
   modules/de-scenarios.js — Airflow + Data Engineering scenarios
   ------------------------------------------------------------
   List of DE-stack scenarios → predict → reveal what happens, why,
   and how to say it. Records to AV.Progress ("de").
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  function data() { return (AV.data && AV.data.deScenarios) || []; }

  var module = {
    id: "de-scenarios",
    title: "Airflow + Data Engineering",
    _container: null, _filter: "all", _current: null, _onClick: null,

    render: function (container) {
      var self = this;
      this._container = container; this._filter = "all";
      this._onClick = function (e) {
        var chip = e.target.closest && e.target.closest(".prep-chip");
        if (chip && container.contains(chip)) { self._filter = chip.getAttribute("data-cat"); self.renderList(); return; }
        if (e.target.closest && e.target.closest(".prep-detail-back")) { self.renderList(); return; }
        if (e.target.closest && e.target.closest(".de-reveal")) { self.reveal(); return; }
        var card = e.target.closest && e.target.closest(".prep-card[data-id]");
        if (card && container.contains(card)) { self.open(card.getAttribute("data-id")); return; }
      };
      container.addEventListener("click", this._onClick);
      this.renderList();
    },

    renderList: function () {
      var self = this, items = data();
      var prog = AV.Progress ? AV.Progress.items("de") : {};
      var cats = [], seen = {};
      items.forEach(function (s) { if (!seen[s.category]) { seen[s.category] = 1; cats.push(s.category); } });
      var chips = ['<button class="prep-chip' + (this._filter === "all" ? " active" : "") + '" data-cat="all">All</button>']
        .concat(cats.map(function (c) { return '<button class="prep-chip' + (self._filter === c ? " active" : "") + '" data-cat="' + c + '">' + c + "</button>"; })).join("");
      var shown = items.filter(function (s) { return self._filter === "all" || s.category === self._filter; });
      var cards = shown.map(function (s) {
        var seenIt = prog[s.id] && prog[s.id].done;
        return '<button class="prep-card" data-id="' + s.id + '">' +
          '<div class="prep-card-top"><span class="prep-card-icon">🔗</span><span class="prep-card-title">' + s.title + "</span></div>" +
          '<div class="prep-card-sym">' + s.scenario + "</div>" +
          '<div class="prep-badges"><span class="prep-badge cat">' + s.category + "</span></div>" +
          '<div class="prep-card-foot">' + (seenIt ? '<span class="prep-seen">Reviewed</span>' : "<span></span>") +
            '<span class="prep-go">Predict &amp; reveal →</span></div></button>';
      }).join("");
      this._container.innerHTML =
        '<div class="module-header animate-fade-in-up">' +
          '<div class="module-eyebrow">Interview Prep · Airflow in a real DE stack</div>' +
          '<h1 class="module-title">Airflow + Data Engineering</h1>' +
          '<p class="module-subtitle">Airflow orchestrating Databricks, Spark, S3, Snowflake, warehouses and ' +
          "CDC — the scenarios DE interviews actually ask. Predict what happens, then see the reasoning and how " +
          "to answer.</p>" +
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
        '<div class="de">' +
          '<div class="de-head"><div class="de-title">' + s.title + "</div>" +
            '<div class="prep-badges"><span class="prep-badge cat">' + s.category + "</span></div></div>" +
          '<div class="callout info de-scenario"><span class="callout-icon">🏭</span>' +
            '<div class="callout-body">' + s.scenario + "</div></div>" +
          '<div class="de-hint">Predict what happens — then reveal.</div>' +
          '<button class="btn btn-primary de-reveal">Reveal what happens</button>' +
          '<div class="de-answer" hidden></div>' +
        "</div>";
      var canvas = document.getElementById("canvas"); if (canvas) canvas.scrollTop = 0;
    },

    reveal: function () {
      var s = this._current;
      if (!s) return;
      if (AV.Progress) AV.Progress.record("de", s.id, { done: true, category: s.category });
      var box = this._container.querySelector(".de-answer");
      if (!box) return;
      box.innerHTML =
        '<div class="de-a-row"><span class="po-tag">What happens</span><div>' + s.whatHappens + "</div></div>" +
        '<div class="de-a-row"><span class="po-tag ok">Why</span><div>' + s.reasoning + "</div></div>" +
        (s.interview ? '<div class="callout tip"><span class="callout-icon">🎤</span><div class="callout-body"><b>How to answer.</b> ' + s.interview + "</div></div>" : "");
      box.hidden = false;
      var rb = this._container.querySelector(".de-reveal");
      if (rb) rb.disabled = true;
    },

    destroy: function () {
      if (this._onClick && this._container) this._container.removeEventListener("click", this._onClick);
      this._onClick = null; this._container = null; this._current = null;
    }
  };

  AV.registerModule(module);
})();
