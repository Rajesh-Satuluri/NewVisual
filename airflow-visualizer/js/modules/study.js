/* ============================================================
   modules/study.js — aggregate study deck
   Pulls every per-module quiz question into one filterable page
   (text search + difficulty + module). Click a card to reveal.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  var module = {
    id: "study",
    title: "Study Deck",
    fullWidth: true,
    _root: null, _handler: null,

    render: function (container) {
      var banks = (AV.data && AV.data.quizBanks) || {};
      var routes = AV.routes || {};
      var ids = Object.keys(banks);
      var all = [];
      ids.forEach(function (id) {
        banks[id].forEach(function (item, i) {
          all.push({ id: id, title: (routes[id] && routes[id].title) || id, item: item, n: i });
        });
      });

      var moduleOpts = ids.map(function (id) {
        return '<option value="' + id + '">' + ((routes[id] && routes[id].title) || id) + "</option>";
      }).join("");

      container.innerHTML =
        '<div class="module-header animate-fade-in-up">' +
          '<div class="module-eyebrow">Apache Airflow · Learning Mode</div>' +
          '<h1 class="module-title">Study Deck</h1>' +
          '<p class="module-subtitle">Every question from every module\'s “Test Yourself”, in one place. Filter by topic or difficulty, ' +
          "search the text, and click a card to reveal the answer and explanation. " + all.length + " questions.</p>" +
        "</div>" +
        '<div class="study-toolbar">' +
          '<input class="study-search" id="study-search" type="text" placeholder="🔍 Search questions…" autocomplete="off" aria-label="Search questions" />' +
          '<select class="study-select" id="study-diff" aria-label="Difficulty"><option value="">All levels</option><option value="easy">Easy</option><option value="med">Medium</option><option value="hard">Hard</option></select>' +
          '<select class="study-select" id="study-mod" aria-label="Module"><option value="">All modules</option>' + moduleOpts + "</select>" +
          '<span class="study-count" id="study-count"></span>' +
        "</div>" +
        '<div class="study-list" id="study-list"></div>' +
        '<div class="study-empty" id="study-empty" hidden>No questions match — broaden your filters.</div>';

      var listEl = container.querySelector("#study-list");
      var countEl = container.querySelector("#study-count");
      var emptyEl = container.querySelector("#study-empty");
      var search = container.querySelector("#study-search");
      var diffSel = container.querySelector("#study-diff");
      var modSel = container.querySelector("#study-mod");
      this._root = container;

      function cardHTML(row) {
        var it = row.item;
        var correct = it.options[it.answer];
        var hay = (row.title + " " + it.q + " " + it.options.join(" ") + " " + it.why).toLowerCase();
        return '<div class="study-card" data-hay="' + hay.replace(/"/g, "") + '" data-mod="' + row.id + '" data-diff="' + it.diff + '">' +
          '<button class="study-q" aria-expanded="false">' +
            '<span class="study-q-text">' + it.q + "</span>" +
            '<span class="study-tags"><span class="study-mod-tag">' + row.title + '</span><span class="ty-diff ty-' + it.diff + '">' + it.diff + "</span></span>" +
          "</button>" +
          '<div class="study-a" hidden><div class="study-answer"><b>Answer:</b> ' + correct + "</div><p>" + it.why + "</p></div>" +
        "</div>";
      }

      listEl.innerHTML = all.map(cardHTML).join("");
      var cards = Array.prototype.slice.call(listEl.querySelectorAll(".study-card"));

      function apply() {
        var q = search.value.trim().toLowerCase();
        var d = diffSel.value, m = modSel.value;
        var shown = 0;
        cards.forEach(function (c) {
          var ok = (!q || c.getAttribute("data-hay").indexOf(q) !== -1) &&
                   (!d || c.getAttribute("data-diff") === d) &&
                   (!m || c.getAttribute("data-mod") === m);
          c.hidden = !ok; if (ok) shown++;
        });
        countEl.textContent = shown + " / " + all.length;
        emptyEl.hidden = shown !== 0;
      }

      function onClick(e) {
        var btn = e.target.closest(".study-q");
        if (!btn) return;
        var card = btn.parentNode;
        var ans = card.querySelector(".study-a");
        var open = btn.getAttribute("aria-expanded") === "true";
        btn.setAttribute("aria-expanded", String(!open));
        ans.hidden = open;
        card.classList.toggle("open", !open);
      }

      this._handler = function (e) { onClick(e); };
      container.addEventListener("click", this._handler);
      search.addEventListener("input", apply);
      diffSel.addEventListener("change", apply);
      modSel.addEventListener("change", apply);
      apply();
    },

    destroy: function () {
      if (this._root && this._handler) this._root.removeEventListener("click", this._handler);
      this._root = null; this._handler = null;
    }
  };

  AV.registerModule(module);
})();
