/* ============================================================
   modules/traps.js — Interview Traps (myth vs fact)
   ------------------------------------------------------------
   List of claims → guess myth/fact → reveal the reality.
   Records to AV.Progress ("traps").
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  function data() { return (AV.data && AV.data.traps) || []; }

  var module = {
    id: "traps",
    title: "Interview Traps",
    _container: null, _filter: "all", _current: null, _onClick: null,

    render: function (container) {
      var self = this;
      this._container = container; this._filter = "all";
      this._onClick = function (e) {
        var chip = e.target.closest && e.target.closest(".prep-chip");
        if (chip && container.contains(chip)) { self._filter = chip.getAttribute("data-cat"); self.renderList(); return; }
        if (e.target.closest && e.target.closest(".prep-detail-back")) { self.renderList(); return; }
        var g = e.target.closest && e.target.closest(".trap-btn[data-g]");
        if (g) { self.reveal(g.getAttribute("data-g")); return; }
        var card = e.target.closest && e.target.closest(".prep-card[data-id]");
        if (card && container.contains(card)) { self.open(card.getAttribute("data-id")); return; }
      };
      container.addEventListener("click", this._onClick);
      this.renderList();
    },

    renderList: function () {
      var self = this, items = data();
      var prog = AV.Progress ? AV.Progress.items("traps") : {};
      var cats = [], seen = {};
      items.forEach(function (s) { if (!seen[s.category]) { seen[s.category] = 1; cats.push(s.category); } });
      var chips = ['<button class="prep-chip' + (this._filter === "all" ? " active" : "") + '" data-cat="all">All</button>']
        .concat(cats.map(function (c) { return '<button class="prep-chip' + (self._filter === c ? " active" : "") + '" data-cat="' + c + '">' + c + "</button>"; })).join("");
      var shown = items.filter(function (s) { return self._filter === "all" || s.category === self._filter; });
      var cards = shown.map(function (s) {
        var rec = prog[s.id];
        var foot = rec && rec.correct ? '<span class="prep-solved">✓ Spotted</span>' : rec ? '<span class="prep-seen">Seen</span>' : "<span></span>";
        return '<button class="prep-card" data-id="' + s.id + '">' +
          '<div class="prep-card-top"><span class="prep-card-icon">🪤</span><span class="prep-card-title">&ldquo;' + s.claim + '&rdquo;</span></div>' +
          '<div class="prep-badges"><span class="prep-badge cat">' + s.category + "</span></div>" +
          '<div class="prep-card-foot">' + foot + '<span class="prep-go">Myth or fact? →</span></div></button>';
      }).join("");
      this._container.innerHTML =
        '<div class="module-header animate-fade-in-up">' +
          '<div class="module-eyebrow">Interview Prep · Don\'t fall for it</div>' +
          '<h1 class="module-title">Interview Traps</h1>' +
          '<p class="module-subtitle">Statements that sound right and trip candidates up. Decide whether each ' +
          "is a myth or a fact, then see the subtle distinction that separates a confident answer from a wrong one.</p>" +
        "</div>" +
        '<div class="prep-filter">' + chips + "</div>" +
        '<div class="prep-grid">' + cards + "</div>";
    },

    open: function (id) {
      var items = data(), t = null;
      for (var i = 0; i < items.length; i++) if (items[i].id === id) { t = items[i]; break; }
      if (!t) { this.renderList(); return; }
      this._current = t;
      this._container.innerHTML =
        '<div class="prep-back"><button class="btn btn-secondary prep-detail-back">← All traps</button></div>' +
        '<div class="trap">' +
          '<div class="trap-claim">&ldquo;' + t.claim + '&rdquo;</div>' +
          '<div class="prep-badges"><span class="prep-badge cat">' + t.category + "</span></div>" +
          '<div class="trap-hint">A common belief — is it a myth or a fact?</div>' +
          '<div class="trap-guess"><button class="trap-btn" data-g="myth">It\'s a myth</button>' +
            '<button class="trap-btn" data-g="fact">It\'s a fact</button></div>' +
          '<div class="trap-reveal" hidden></div>' +
        "</div>";
      var canvas = document.getElementById("canvas"); if (canvas) canvas.scrollTop = 0;
    },

    reveal: function (guess) {
      var t = this._current;
      if (!t) return;
      var guessMyth = guess === "myth";
      var correct = guessMyth === t.isMyth;
      if (AV.Progress) AV.Progress.record("traps", t.id, { done: true, correct: correct, category: t.category });
      var verdictWord = t.isMyth ? "Myth" : "Fact";
      var box = this._container.querySelector(".trap-reveal");
      if (!box) return;
      this._container.querySelectorAll(".trap-btn").forEach(function (b) { b.disabled = true; });
      box.innerHTML =
        '<div class="trap-verdict ' + (correct ? "good" : "bad") + '">' +
          (correct ? "✓ Correct — " : "✗ Not quite — ") + "it's a <b>" + verdictWord + "</b>.</div>" +
        '<div class="callout ' + (t.isMyth ? "warn" : "tip") + ' trap-reality"><span class="callout-icon">' +
          (t.isMyth ? "🧨" : "✅") + '</span><div class="callout-body"><b>Reality.</b> ' + t.reality + "</div></div>";
      box.hidden = false;
    },

    destroy: function () {
      if (this._onClick && this._container) this._container.removeEventListener("click", this._onClick);
      this._onClick = null; this._container = null; this._current = null;
    }
  };

  AV.registerModule(module);
})();
