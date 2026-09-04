/* ============================================================
   command-palette.js — ⌘K / Ctrl-K fuzzy jump to any module
   ARIA dialog + listbox; capture-phase key handler so it wins.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  var overlay, input, list, items = [], active = 0, built = false;

  function routes() {
    var r = AV.routes || {};
    return Object.keys(r).map(function (id) {
      return { id: id, title: (r[id] && r[id].title) || id };
    });
  }

  // Subsequence fuzzy match; returns score (lower = better) or -1.
  function score(q, text) {
    q = q.toLowerCase(); text = text.toLowerCase();
    if (!q) return 0;
    if (text.indexOf(q) !== -1) return text.indexOf(q); // contiguous wins
    var ti = 0, qi = 0, first = -1;
    for (; ti < text.length && qi < q.length; ti++) {
      if (text[ti] === q[qi]) { if (first < 0) first = ti; qi++; }
    }
    return qi === q.length ? 100 + first : -1;
  }

  function build() {
    overlay = document.createElement("div");
    overlay.className = "cmdk-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Command palette");
    overlay.hidden = true;
    overlay.innerHTML =
      '<div class="cmdk-box">' +
        '<input class="cmdk-input" type="text" role="combobox" aria-expanded="true" aria-controls="cmdk-list" ' +
          'aria-autocomplete="list" placeholder="Jump to a module…  (Esc to close)" autocomplete="off" spellcheck="false" />' +
        '<ul class="cmdk-list" id="cmdk-list" role="listbox"></ul>' +
        '<div class="cmdk-foot"><kbd>↑</kbd><kbd>↓</kbd> navigate · <kbd>↵</kbd> open · <kbd>esc</kbd> close</div>' +
      "</div>";
    document.body.appendChild(overlay);
    input = overlay.querySelector(".cmdk-input");
    list = overlay.querySelector(".cmdk-list");

    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
    input.addEventListener("input", render);
    input.addEventListener("keydown", onKey);
    list.addEventListener("click", function (e) {
      var li = e.target.closest("[data-id]");
      if (li) go(li.getAttribute("data-id"));
    });
    built = true;
  }

  function render() {
    var q = input.value.trim();
    var scored = routes().map(function (r) { return { r: r, s: score(q, r.title + " " + r.id) }; })
      .filter(function (x) { return x.s >= 0; })
      .sort(function (a, b) { return a.s - b.s; })
      .slice(0, 40);
    items = scored.map(function (x) { return x.r; });
    active = 0;
    list.innerHTML = items.map(function (r, i) {
      return '<li class="cmdk-item' + (i === 0 ? " active" : "") + '" role="option" data-id="' + r.id +
        '" aria-selected="' + (i === 0) + '"><span class="cmdk-title">' + r.title +
        '</span><span class="cmdk-id">#' + r.id + "</span></li>";
    }).join("") || '<li class="cmdk-empty">No matching module</li>';
  }

  function move(d) {
    if (!items.length) return;
    active = (active + d + items.length) % items.length;
    var els = list.querySelectorAll(".cmdk-item");
    els.forEach(function (el, i) {
      var on = i === active;
      el.classList.toggle("active", on);
      el.setAttribute("aria-selected", on);
      if (on) el.scrollIntoView({ block: "nearest" });
    });
  }

  function onKey(e) {
    if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
    else if (e.key === "Enter") { e.preventDefault(); if (items[active]) go(items[active].id); }
    else if (e.key === "Escape") { e.preventDefault(); close(); }
  }

  function go(id) { close(); location.hash = "#" + id; }

  function open() {
    if (!built) build();
    overlay.hidden = false;
    input.value = "";
    render();
    setTimeout(function () { input.focus(); }, 0);
  }
  function close() { if (overlay) overlay.hidden = true; }
  function isOpen() { return overlay && !overlay.hidden; }

  // Global shortcut (capture phase so it beats other handlers).
  document.addEventListener("keydown", function (e) {
    if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
      e.preventDefault();
      isOpen() ? close() : open();
    }
  }, true);

  AV.commandPalette = { open: open, close: close };
})();
