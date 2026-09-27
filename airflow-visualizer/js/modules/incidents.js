/* ============================================================
   modules/incidents.js — Production Incident Bank
   ------------------------------------------------------------
   A fast, readable reference over the same scenario library the
   Troubleshooting Lab drills interactively (AV.data.troubleshooting).
   Where the Lab makes you choose, the Bank lays out the whole
   playbook — symptom → investigation (in order) → root cause →
   resolution → prevention → 60–90s interview answer — for revision.
   Shares one source of scenario data with the Lab (no duplication).
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});
  var DIFF = { easy: "Concept", med: "Applied", hard: "Production" };

  function data() { return (AV.data && AV.data.troubleshooting) || []; }

  var module = {
    id: "incidents",
    title: "Production Incident Bank",
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
      var cats = [], seen = {};
      items.forEach(function (s) { if (!seen[s.category]) { seen[s.category] = 1; cats.push(s.category); } });
      var chips = ['<button class="prep-chip' + (this._filter === "all" ? " active" : "") + '" data-cat="all">All</button>']
        .concat(cats.map(function (c) {
          return '<button class="prep-chip' + (self._filter === c ? " active" : "") + '" data-cat="' + c + '">' + c + "</button>";
        })).join("");
      var shown = items.filter(function (s) { return self._filter === "all" || s.category === self._filter; });
      var cards = shown.map(function (s) {
        return '<button class="prep-card" data-id="' + s.id + '">' +
          '<div class="prep-card-top"><span class="prep-card-icon">' + s.icon + "</span>" +
            '<span class="prep-card-title">' + s.title + "</span></div>" +
          '<div class="prep-card-sym">' + s.symptom + "</div>" +
          '<div class="prep-badges"><span class="prep-badge cat">' + s.category + "</span>" +
            '<span class="prep-badge diff-' + s.difficulty + '">' + (DIFF[s.difficulty] || s.difficulty) + "</span></div>" +
          '<div class="prep-card-foot"><span></span><span class="prep-go">Read the playbook →</span></div>' +
        "</button>";
      }).join("");

      this._container.innerHTML =
        '<div class="module-header animate-fade-in-up">' +
          '<div class="module-eyebrow">Interview Prep · The incident playbook, at a glance</div>' +
          '<h1 class="module-title">Production Incident Bank</h1>' +
          '<p class="module-subtitle">The full reference for every incident — symptom, the checks in order, ' +
          "root cause, resolution, prevention, and a 60–90 second interview answer. Read to revise; then " +
          'drill them hands-on in the <a href="#troubleshooting">Troubleshooting Lab</a>.</p>' +
        "</div>" +
        '<div class="prep-filter">' + chips + "</div>" +
        '<div class="prep-grid">' + cards + "</div>";
    },

    open: function (id) {
      var items = data(), s = null;
      for (var i = 0; i < items.length; i++) if (items[i].id === id) { s = items[i]; break; }
      if (!s) { this.renderList(); return; }
      if (AV.Progress) AV.Progress.record("incidents", s.id, { reviewed: true, category: s.category });

      var steps = (s.steps || []).map(function (st) {
        var correct = null;
        (st.checks || []).forEach(function (c) { if (c.correct) correct = c; });
        return correct
          ? "<li><b>" + correct.label + "</b> — " + correct.reasoning + "</li>"
          : "<li>" + st.prompt + "</li>";
      }).join("");

      function row(label, body, kind) {
        return body ? '<div class="inv-concl-row inv-' + kind + '"><span class="inv-concl-tag">' + label +
          '</span><div class="inv-concl-body">' + body + "</div></div>" : "";
      }

      this._container.innerHTML =
        '<div class="prep-back"><button class="btn btn-secondary prep-detail-back">← All incidents</button></div>' +
        '<div class="inc">' +
          '<div class="inv-head"><span class="inv-icon">' + s.icon + "</span>" +
            '<div class="inv-head-main"><div class="inv-title">' + s.title + "</div>" +
              '<div class="prep-badges"><span class="prep-badge cat">' + s.category + "</span>" +
                '<span class="prep-badge diff-' + s.difficulty + '">' + (DIFF[s.difficulty] || s.difficulty) + "</span></div>" +
            "</div></div>" +
          '<div class="callout warn inv-symptom"><span class="callout-icon">🔎</span>' +
            '<div class="callout-body"><b>Symptom.</b> ' + s.symptom + "</div></div>" +
          '<h2 class="inc-h">Investigation — what to check, in order</h2>' +
          '<ol class="inc-steps">' + steps + "</ol>" +
          '<div class="inv-concl">' +
            row("Root cause", s.rootCause, "root") +
            row("Resolution", s.resolution, "fix") +
            row("Prevention", s.prevention, "prev") +
          "</div>" +
          (s.interviewAnswer
            ? '<div class="callout tip inv-interview"><span class="callout-icon">🎤</span>' +
              '<div class="callout-body"><b>60–90 second answer.</b> ' + s.interviewAnswer + "</div></div>"
            : "") +
          '<div class="inc-cta"><a class="btn btn-primary" href="#troubleshooting">Drill this interactively →</a></div>' +
        "</div>";
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
