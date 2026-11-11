/* ============================================================
   features/command-palette.js — ⌘K / Ctrl-K quick switcher
   Fuzzy-search every screen in the IA and jump to it. Pure DOM,
   no dependencies. Opens on ⌘K/Ctrl-K, "/" (outside inputs), or a
   topbar button (#palette-open). Arrow keys move, Enter navigates,
   Esc closes.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.SolverViz = window.SolverViz || {});

  function fuzzy(hay, needle) {
    hay = hay.toLowerCase(); needle = needle.toLowerCase();
    if (!needle) return 1;
    if (hay.indexOf(needle) !== -1) return 100 - hay.indexOf(needle); // substring wins
    var hi = 0, score = 0, run = 0;
    for (var ni = 0; ni < needle.length; ni++) {
      var ch = needle[ni], found = -1;
      for (; hi < hay.length; hi++) { if (hay[hi] === ch) { found = hi; break; } }
      if (found === -1) return 0;
      run = (found === hi ? run + 2 : 1); score += run; hi = found + 1;
    }
    return score;
  }

  var Palette = {
    _open: false, _idx: 0, _results: [], _el: null, _input: null, _list: null,

    init: function () {
      var self = this;
      this._build();
      document.addEventListener("keydown", function (e) {
        if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
          e.preventDefault(); self.toggle(); return;
        }
        if (self._open) return;
        var tag = (e.target && e.target.tagName) || "";
        if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA" && !(e.target && e.target.isContentEditable)) {
          e.preventDefault(); self.show();
        }
      });
      var opener = document.getElementById("palette-open");
      if (opener) opener.addEventListener("click", function () { self.show(); });
    },

    _build: function () {
      var el = document.createElement("div");
      el.id = "cmd-palette";
      el.className = "cmdp hidden";
      el.setAttribute("role", "dialog");
      el.setAttribute("aria-modal", "true");
      el.innerHTML =
        '<div class="cmdp-backdrop"></div>' +
        '<div class="cmdp-box">' +
          '<div class="cmdp-inputwrap">' +
            '<span class="cmdp-icon" aria-hidden="true">⌕</span>' +
            '<input class="cmdp-input" type="text" placeholder="Search modules, topics, models…" aria-label="Search modules" />' +
            '<kbd class="cmdp-esc">Esc</kbd>' +
          "</div>" +
          '<ul class="cmdp-list" role="listbox"></ul>' +
          '<div class="cmdp-foot"><span><kbd>↑</kbd><kbd>↓</kbd> navigate</span><span><kbd>↵</kbd> open</span><span><span class="dot soon"></span> on roadmap</span></div>' +
        "</div>";
      document.body.appendChild(el);
      this._el = el;
      this._input = el.querySelector(".cmdp-input");
      this._list = el.querySelector(".cmdp-list");

      var self = this;
      el.querySelector(".cmdp-backdrop").addEventListener("click", function () { self.hide(); });
      this._input.addEventListener("input", function () { self._render(); });
      this._input.addEventListener("keydown", function (e) {
        if (e.key === "ArrowDown") { e.preventDefault(); self._move(1); }
        else if (e.key === "ArrowUp") { e.preventDefault(); self._move(-1); }
        else if (e.key === "Enter") { e.preventDefault(); self._choose(); }
        else if (e.key === "Escape") { e.preventDefault(); self.hide(); }
      });
    },

    toggle: function () { this._open ? this.hide() : this.show(); },

    show: function () {
      this._open = true;
      this._el.classList.remove("hidden");
      this._input.value = "";
      this._render();
      var self = this;
      setTimeout(function () { self._input.focus(); }, 0);
    },

    hide: function () { this._open = false; this._el.classList.add("hidden"); },

    _move: function (d) {
      if (!this._results.length) return;
      this._idx = (this._idx + d + this._results.length) % this._results.length;
      this._paint();
    },

    _choose: function () {
      var r = this._results[this._idx];
      if (!r) return;
      this.hide();
      location.hash = "#" + r.id;
    },

    _render: function () {
      var q = this._input.value.trim();
      var screens = AV.getScreens ? AV.getScreens() : [];
      var scored = screens.map(function (s) {
        var score = Math.max(fuzzy(s.title, q), fuzzy(s.trackLabel, q) * 0.4, fuzzy(s.id, q) * 0.6);
        return { s: s, score: score };
      }).filter(function (x) { return x.score > 0; });
      scored.sort(function (a, b) {
        if (b.score !== a.score) return b.score - a.score;
        return (b.s.ready ? 1 : 0) - (a.s.ready ? 1 : 0);
      });
      this._results = scored.slice(0, 40).map(function (x) { return x.s; });
      this._idx = 0;
      this._paint();
    },

    _paint: function () {
      var self = this;
      if (!this._results.length) {
        this._list.innerHTML = '<li class="cmdp-empty">No matches</li>';
        return;
      }
      this._list.innerHTML = this._results.map(function (s, i) {
        return '<li class="cmdp-item' + (i === self._idx ? " active" : "") + '" data-i="' + i + '" role="option">' +
          '<span class="cmdp-title">' + s.title + "</span>" +
          '<span class="cmdp-track">' + s.trackLabel + "</span>" +
          (s.ready ? '<span class="cmdp-badge ready">ready</span>' : '<span class="cmdp-badge soon">soon</span>') +
          "</li>";
      }).join("");
      Array.prototype.forEach.call(this._list.querySelectorAll(".cmdp-item"), function (li) {
        li.addEventListener("mouseenter", function () { self._idx = +li.getAttribute("data-i"); self._paint(); });
        li.addEventListener("click", function () { self._idx = +li.getAttribute("data-i"); self._choose(); });
      });
      var active = this._list.querySelector(".cmdp-item.active");
      if (active && active.scrollIntoView) { try { active.scrollIntoView({ block: "nearest" }); } catch (e) {} }
    }
  };

  AV.CommandPalette = Palette;
})();
