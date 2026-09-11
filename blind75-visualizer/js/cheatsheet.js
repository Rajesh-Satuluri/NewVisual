/*
 * cheatsheet.js — the PySpark function cheatsheet panel. A self-contained modal
 * (built in JS) that reads window.PYSPARK_CHEAT and shows, for every function:
 * its signature, a one-line summary, a parameter table (name · type · what it
 * controls), the return type, and a runnable-style example. Group filter chips
 * across the top + a live search box.
 *
 * Opens from #cheatBtn or window.CHEATSHEET.open(). Load AFTER data/spark/cheatsheet.js
 * and the Prism vendor scripts. Reuses the .ros-* modal shell styles + .cht-* extras.
 */
(function () {
  var DATA = window.PYSPARK_CHEAT || { groups: [], fns: [] };
  var overlay = null, bodyEl = null, searchEl = null, active = "all", query = "", sortMode = "used";

  // Usage rank (lower = more used). Drives the default "Most used" sort, the
  // within-category ordering, and the ★ essential badge on the top tier.
  var RANK = {}; (DATA.rankOrder || []).forEach(function (id, i) { RANK[id] = i; });
  function rankOf(f) { var r = RANK[f.id]; return r == null ? 9999 : r; }
  function byRank(a, b) { var d = rankOf(a) - rankOf(b); return d !== 0 ? d : (a.name || "").localeCompare(b.name || ""); }
  var ESSENTIAL = DATA.essentialCount || 0;
  function isEssential(f) { return rankOf(f) < ESSENTIAL; }

  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  function codeBlock(src) {
    var pre = document.createElement("pre");
    pre.className = "code-pre ros-pre cht-example";
    var code = document.createElement("code");
    code.className = "language-python";
    code.textContent = src;
    pre.appendChild(code);
    if (window.Prism) { try { window.Prism.highlightElement(code); } catch (e) {} }
    return pre;
  }

  function matchesQuery(fn) {
    if (!query) return true;
    var hay = (fn.name + " " + (fn.signature || "") + " " + (fn.summary || "") + " " +
      (fn.group || "") + " " + (fn.params || []).map(function (p) { return p.name; }).join(" ")).toLowerCase();
    return hay.indexOf(query) !== -1;
  }

  function card(fn, showPill) {
    var c = document.createElement("div");
    c.className = "cht-card" + (isEssential(fn) ? " cht-essential" : "");
    var head = document.createElement("div");
    head.className = "cht-head";
    head.innerHTML =
      '<span class="cht-head-l">' +
        (isEssential(fn) ? '<span class="cht-star" title="Essential — one of the most-used; learn these first">★</span>' : "") +
        '<code class="cht-sig">' + esc(fn.signature || fn.name) + "</code>" +
      "</span>" +
      '<span class="cht-head-r">' +
        (showPill && fn.group ? '<span class="cht-group-pill">' + esc(fn.group) + "</span>" : "") +
        (fn.returns ? '<span class="cht-ret">→ ' + esc(fn.returns) + "</span>" : "") +
      "</span>";
    c.appendChild(head);
    if (fn.summary) { var s = document.createElement("div"); s.className = "cht-sum"; s.innerHTML = fn.summary; c.appendChild(s); }

    if (fn.params && fn.params.length) {
      var tbl = document.createElement("table");
      tbl.className = "cht-params";
      var rows = '<thead><tr><th>Parameter</th><th>Type</th><th>What it controls</th></tr></thead><tbody>';
      fn.params.forEach(function (p) {
        rows += '<tr><td class="cht-p-name">' + esc(p.name) + "</td>" +
          '<td class="cht-p-type">' + esc(p.type || "") + "</td>" +
          '<td class="cht-p-desc">' + (p.desc || "") + "</td></tr>";
      });
      tbl.innerHTML = rows + "</tbody>";
      var scr = document.createElement("div"); scr.className = "cht-params-scroll"; scr.appendChild(tbl);
      c.appendChild(scr);
    }
    if (fn.example) {
      var exWrap = document.createElement("div"); exWrap.className = "cht-ex-wrap";
      exWrap.appendChild(codeBlock(fn.example));
      if (fn.output) { var o = document.createElement("div"); o.className = "cht-out"; o.textContent = "→ " + fn.output; exWrap.appendChild(o); }
      c.appendChild(exWrap);
    }
    if (fn.notes) { var n = document.createElement("div"); n.className = "cht-notes"; n.innerHTML = fn.notes; c.appendChild(n); }
    return c;
  }

  function groupHeader(text) {
    var gh = document.createElement("div");
    gh.className = "ros-group"; gh.textContent = text;
    return gh;
  }
  function emptyMsg() {
    var e = document.createElement("div");
    e.className = "cmdk-none"; e.textContent = "No functions match “" + query + "”.";
    bodyEl.appendChild(e);
  }

  function render() {
    bodyEl.innerHTML = "";
    if (sortMode === "used") {
      // Flat, ranked list — the most-used functions first, regardless of category.
      var fns = DATA.fns
        .filter(function (f) { return (active === "all" || f.group === active) && matchesQuery(f); })
        .slice().sort(byRank);
      if (!fns.length) { emptyMsg(); return; }
      bodyEl.appendChild(groupHeader(active === "all" ? "Most used first" : active + " · most used first"));
      fns.forEach(function (f) { bodyEl.appendChild(card(f, true)); });
    } else {
      // Grouped by category (importance order), most-used first within each group.
      var any = false;
      DATA.groups.forEach(function (group) {
        if (active !== "all" && active !== group) return;
        var g = DATA.fns.filter(function (f) { return f.group === group && matchesQuery(f); }).slice().sort(byRank);
        if (!g.length) return;
        any = true;
        bodyEl.appendChild(groupHeader(group));
        g.forEach(function (f) { bodyEl.appendChild(card(f, false)); });
      });
      if (!any) { emptyMsg(); return; }
    }
    bodyEl.scrollTop = 0;
  }

  function build() {
    overlay = document.createElement("div");
    overlay.id = "cheatsheet";
    overlay.className = "ros hidden";
    var chips = '<button class="ros-chip ros-chip-all active" data-g="all">All</button>' +
      DATA.groups.map(function (g) { return '<button class="ros-chip" data-g="' + esc(g) + '">' + esc(g) + "</button>"; }).join("");
    overlay.innerHTML =
      '<div class="ros-box" role="dialog" aria-label="PySpark function cheatsheet">' +
      '  <div class="ros-head">' +
      '    <div class="ros-title">⚡ PySpark cheatsheet <span class="ros-sub">— every function, its parameters, and what they do</span></div>' +
      '    <button class="ros-close" aria-label="Close">✕</button>' +
      '  </div>' +
      '  <div class="cht-search-row">' +
      '    <input class="cht-search" type="text" placeholder="Search functions… (select, join, window, groupBy, when…)" aria-label="Search PySpark functions" />' +
      '    <div class="cht-sort" role="group" aria-label="Sort order">' +
      '      <button class="cht-sort-btn active" data-sort="used" title="Show every function ordered by how often it is used">⭐ Most used</button>' +
      '      <button class="cht-sort-btn" data-sort="cat" title="Group by category (most used first within each)">🗂 By category</button>' +
      '    </div>' +
      '  </div>' +
      '  <div class="ros-filter">' + chips + '</div>' +
      '  <div class="ros-body"></div>' +
      '</div>';
    document.body.appendChild(overlay);
    bodyEl = overlay.querySelector(".ros-body");
    searchEl = overlay.querySelector(".cht-search");
    overlay.addEventListener("mousedown", function (e) { if (e.target === overlay) close(); });
    overlay.querySelector(".ros-close").addEventListener("click", close);
    overlay.querySelectorAll(".ros-chip").forEach(function (b) {
      b.addEventListener("click", function () {
        active = b.getAttribute("data-g");
        overlay.querySelectorAll(".ros-chip").forEach(function (c) { c.classList.toggle("active", c === b); });
        render();
      });
    });
    searchEl.addEventListener("input", function () { query = searchEl.value.trim().toLowerCase(); render(); });
    overlay.querySelectorAll(".cht-sort-btn").forEach(function (b) {
      b.addEventListener("click", function () {
        sortMode = b.getAttribute("data-sort");
        overlay.querySelectorAll(".cht-sort-btn").forEach(function (c) { c.classList.toggle("active", c === b); });
        render();
      });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && overlay.classList.contains("open")) close();
    });
  }

  function open() {
    if (!overlay) build();
    render();
    overlay.classList.remove("hidden");
    requestAnimationFrame(function () { overlay.classList.add("open"); if (searchEl) searchEl.focus(); });
    document.body.classList.add("cmdk-lock");
  }
  function close() {
    if (!overlay) return;
    overlay.classList.remove("open");
    document.body.classList.remove("cmdk-lock");
    setTimeout(function () { overlay.classList.add("hidden"); }, 160);
  }

  function init() {
    var btn = document.getElementById("cheatBtn");
    if (btn) btn.addEventListener("click", open);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  window.CHEATSHEET = { open: open, close: close };
})();
