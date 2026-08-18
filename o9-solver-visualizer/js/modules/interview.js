/* modules/interview.js — searchable conceptual Q&A accordion */
(function () {
  "use strict";
  var AV = (window.SolverViz = window.SolverViz || {});
  var Q = AV.Interview.concepts;
  var module = {
    id: "interview", title: "Interview Q&A", _h: null, _s: null,
    render: function (container) {
      container.innerHTML =
        '<div class="module-header animate-fade-in-up"><div class="module-eyebrow">Learning Mode</div>' +
          '<h1 class="module-title gradient-text">Interview Q&amp;A</h1>' +
          '<p class="module-subtitle">' + Q.length + ' conceptual questions on the o9 solver. Search, expand an answer, and jump to the module that proves it.</p></div>' +
        '<input id="q-search" class="q-search" type="text" placeholder="Search questions… (e.g. freeze, net requirement, pegging)" />' +
        '<div id="q-list" class="q-list"></div>';
      var list = container.querySelector("#q-list");
      function render(filter) {
        filter = (filter || "").toLowerCase();
        var items = Q.filter(function (x) { return !filter || (x.q + " " + x.a + " " + x.group).toLowerCase().indexOf(filter) >= 0; });
        list.innerHTML = items.length ? items.map(function (x, i) {
          return '<div class="qa-item"><button class="qa-q" data-i="' + i + '"><span class="qa-grp">' + x.group + '</span>' + x.q + '<span class="qa-caret">▸</span></button>' +
            '<div class="qa-a"><p>' + x.a + '</p><a class="lens-link" href="#' + x.ref + '">Open module: ' + x.ref + ' →</a></div></div>';
        }).join("") : '<p style="color:var(--text-muted);padding:16px">No questions match “' + filter + '”.</p>';
        // rebind data to filtered set
        list._items = items;
      }
      render("");
      this._h = function (e) {
        var btn = e.target.closest(".qa-q"); if (!btn) return;
        var item = btn.parentNode; item.classList.toggle("open");
      };
      list.addEventListener("click", this._h);
      var search = container.querySelector("#q-search");
      this._s = function () { render(search.value); };
      search.addEventListener("input", this._s);
      this._search = search;
    },
    destroy: function () {
      var list = document.querySelector("#q-list");
      if (list && this._h) list.removeEventListener("click", this._h);
      if (this._search && this._s) this._search.removeEventListener("input", this._s);
      this._h = this._s = this._search = null;
    }
  };
  AV.registerModule(module);
})();
