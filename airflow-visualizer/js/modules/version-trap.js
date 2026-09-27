/* ============================================================
   modules/version-trap.js — Airflow 2.x → 3.x version trap
   ------------------------------------------------------------
   List of concepts → a tabbed 2.x / 3.x / say-it-safely answer per
   concept (tiered-answer.js).
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  function data() { return (AV.data && AV.data.version) || []; }

  var module = {
    id: "version-trap",
    title: "Airflow 2.x → 3.x",
    _container: null, _onClick: null,

    render: function (container) {
      var self = this;
      this._container = container;
      this._onClick = function (e) {
        if (e.target.closest && e.target.closest(".ta-back")) { self.renderList(); return; }
        var card = e.target.closest && e.target.closest(".prep-card[data-id]");
        if (card && container.contains(card)) { self.open(card.getAttribute("data-id")); return; }
      };
      container.addEventListener("click", this._onClick);
      this.renderList();
    },

    renderList: function () {
      var items = data();
      var cards = items.map(function (s) {
        return '<button class="prep-card" data-id="' + s.id + '">' +
          '<div class="prep-card-top"><span class="prep-card-icon">🔀</span><span class="prep-card-title">' + s.question + "</span></div>" +
          '<div class="prep-badges"><span class="prep-badge cat">' + s.category + "</span>" +
            '<span class="prep-badge steps">2.x · 3.x · say it</span></div>' +
          '<div class="prep-card-foot"><span></span><span class="prep-go">Compare versions →</span></div></button>';
      }).join("");
      this._container.innerHTML =
        '<div class="module-header animate-fade-in-up">' +
          '<div class="module-eyebrow">Interview Prep · Know what changed</div>' +
          '<h1 class="module-title">Airflow 2.x → 3.x Version Trap</h1>' +
          '<p class="module-subtitle">The concepts that differ between Airflow 2.x and 3.x, where interviewers ' +
          "set traps. For each: how it worked in 2.x, what changed in 3.x, and an interview-safe way to say it " +
          "without overclaiming.</p>" +
          '<div class="callout info" style="margin-top:var(--space-4)"><span class="callout-icon">🏷️</span>' +
          '<div class="callout-body">This lab targets <b>Airflow 3.x</b>. For a real migration, confirm exact ' +
          "removals and feature availability against your target release's notes.</div></div>" +
        "</div>" +
        '<div class="prep-grid">' + cards + "</div>";
    },

    open: function (id) {
      var self = this, items = data(), it = null;
      for (var i = 0; i < items.length; i++) if (items[i].id === id) { it = items[i]; break; }
      if (!it || !AV.TieredAnswer) { this.renderList(); return; }
      this._container.innerHTML = "";
      var flow = AV.TieredAnswer.create(it, function () { self.renderList(); }, { cat: "version", tierNote: "by version" });
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
