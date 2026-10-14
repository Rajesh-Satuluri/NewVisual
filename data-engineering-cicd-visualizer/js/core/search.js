/* ============================================================
   search.js — DECICDViz.Search
   Global search overlay across modules, tools, common errors,
   commands, and cross-cutting concepts. Open with "/" or the
   topbar search button. Keyboard: ↑/↓ to move, Enter to open,
   Esc to close. Navigation is via the hash router.
   ============================================================ */
(function () {
  "use strict";
  var NS = (window.DECICDViz = window.DECICDViz || {});

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  var KIND_LABEL = {
    module: "Topic", tool: "Tool", error: "Error",
    command: "Command", concept: "Concept"
  };

  var entries = null;
  function buildEntries() {
    if (entries) return entries;
    var out = [];
    // Modules from the route registry.
    var routes = NS.routes || {};
    Object.keys(routes).forEach(function (id) {
      out.push({ kind: "module", title: routes[id].title || id, route: id, keywords: id.replace(/-/g, " ") });
    });
    // Tools (purpose adds searchable keywords; route to the matching module).
    var tools = (NS.Concepts && NS.Concepts.tools) || [];
    tools.forEach(function (t) {
      out.push({ kind: "tool", title: t.name, route: t.id, keywords: t.purpose + " " + (t.roi || "") });
    });
    // Curated errors / commands / concepts.
    (NS.SearchIndex || []).forEach(function (e) { out.push(e); });
    entries = out;
    return out;
  }

  function score(entry, q) {
    var t = entry.title.toLowerCase();
    var k = (entry.keywords || "").toLowerCase();
    if (t === q) return 100;
    if (t.indexOf(q) === 0) return 80;
    if (t.indexOf(q) !== -1) return 60;
    if (k.indexOf(q) !== -1) return 30;
    return 0;
  }

  var overlay = null, input = null, listEl = null, active = -1, shown = [];

  function ensureDOM() {
    if (overlay) return;
    overlay = document.createElement("div");
    overlay.className = "search-overlay hidden";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Search");
    overlay.innerHTML =
      '<div class="search-backdrop"></div>' +
      '<div class="search-box">' +
        '<div class="search-input-row">' +
          '<span class="search-icon" aria-hidden="true">🔍</span>' +
          '<input type="text" class="search-input" placeholder="Search topics, tools, errors, commands…" ' +
            'aria-label="Search" autocomplete="off" spellcheck="false" />' +
          '<kbd class="search-esc">Esc</kbd>' +
        '</div>' +
        '<div class="search-results" role="listbox"></div>' +
        '<div class="search-hint">Type to filter · <kbd>↑</kbd><kbd>↓</kbd> move · <kbd>↵</kbd> open · <kbd>Esc</kbd> close</div>' +
      '</div>';
    document.body.appendChild(overlay);
    input = overlay.querySelector(".search-input");
    listEl = overlay.querySelector(".search-results");

    overlay.querySelector(".search-backdrop").addEventListener("click", close);
    input.addEventListener("input", draw);
    input.addEventListener("keydown", onKey);
    listEl.addEventListener("click", function (e) {
      var row = e.target.closest(".search-result");
      if (row) go(parseInt(row.getAttribute("data-i"), 10));
    });
  }

  function draw() {
    var q = (input.value || "").trim().toLowerCase();
    active = -1;
    if (!q) {
      shown = [];
      listEl.innerHTML =
        '<div class="search-empty">Start typing — e.g. <code>CrashLoop</code>, ' +
        '<code>dbt</code>, <code>rollback</code>, <code>OIDC</code>.</div>';
      return;
    }
    var all = buildEntries();
    shown = all.map(function (e) { return { e: e, s: score(e, q) }; })
      .filter(function (r) { return r.s > 0; })
      .sort(function (a, b) { return b.s - a.s || a.e.title.length - b.e.title.length; })
      .slice(0, 30)
      .map(function (r) { return r.e; });

    if (!shown.length) {
      listEl.innerHTML = '<div class="search-empty">No matches for “' + esc(q) + '”.</div>';
      return;
    }
    listEl.innerHTML = shown.map(function (e, i) {
      return '<div class="search-result" role="option" data-i="' + i + '">' +
        '<span class="search-kind search-kind-' + e.kind + '">' + (KIND_LABEL[e.kind] || e.kind) + '</span>' +
        '<span class="search-result-title">' + esc(e.title) + '</span>' +
        '<span class="search-result-route">#' + esc(e.route) + '</span>' +
      '</div>';
    }).join("");
    setActive(0);
  }

  function setActive(i) {
    var rows = listEl.querySelectorAll(".search-result");
    if (!rows.length) return;
    if (i < 0) i = rows.length - 1;
    if (i >= rows.length) i = 0;
    rows.forEach(function (r) { r.classList.remove("active"); });
    rows[i].classList.add("active");
    rows[i].scrollIntoView({ block: "nearest" });
    active = i;
  }

  function onKey(e) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive(active + 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive(active - 1); }
    else if (e.key === "Enter") { e.preventDefault(); if (shown.length) go(active < 0 ? 0 : active); }
    else if (e.key === "Escape") { e.preventDefault(); close(); }
  }

  function go(i) {
    var entry = shown[i];
    if (!entry) return;
    close();
    location.hash = "#" + entry.route;
  }

  function open() {
    ensureDOM();
    overlay.classList.remove("hidden");
    input.value = "";
    draw();
    setTimeout(function () { input.focus(); }, 0);
  }
  function close() {
    if (overlay) overlay.classList.add("hidden");
  }
  function isOpen() { return overlay && !overlay.classList.contains("hidden"); }

  // Global "/" to open (ignored while typing in a field).
  document.addEventListener("keydown", function (e) {
    var tag = (e.target && e.target.tagName) || "";
    var typing = tag === "INPUT" || tag === "TEXTAREA" || (e.target && e.target.isContentEditable);
    if (e.key === "/" && !typing && !isOpen()) { e.preventDefault(); open(); }
  });

  NS.Search = { open: open, close: close, toggle: function () { isOpen() ? close() : open(); } };
})();
