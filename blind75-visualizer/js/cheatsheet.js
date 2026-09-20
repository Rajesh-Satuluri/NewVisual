/*
 * cheatsheet.js — the function-reference panels. A self-contained modal (built
 * in JS) that reads a cheatsheet dataset and shows, for every function: its
 * signature, a one-line summary, a parameter table (name · type · what it
 * controls), the return type, and a runnable-style example. Group filter chips
 * with live counts across the top + a live search box + ⭐ Most used / 🗂 By
 * category sort + a ★ badge on the essential top tier.
 *
 * ONE renderer, driven by a config object, powers three panels:
 *   • PySpark ref  (window.PYSPARK_CHEAT)  — #cheatBtn    → window.CHEATSHEET
 *   • Python ref   (window.PYTHON_CHEAT)   — #pyCheatBtn  → window.PYCHEATSHEET
 *   • SQL ref      (window.SQL_CHEAT)      — #sqlCheatBtn → window.SQLCHEATSHEET
 *
 * Load AFTER the data/*cheatsheet.js files and the Prism vendor scripts.
 * Reuses the .ros-* modal shell styles + .cht-* extras. Copy buttons mount into
 * the per-example [data-copy-host] strip via copybtn.js, so Copy never covers
 * the first line of code.
 */
(function () {

  // Build one cheatsheet panel from a config object. Every panel is independent
  // (its own overlay, its own persisted sort), but shares this exact behavior.
  function makeCheatsheet(cfg) {
    var DATA = cfg.data || { groups: [], fns: [] };
    var LANG = cfg.lang || "python";
    var COLLAPSIBLE = !!cfg.collapsible;   // cards collapse to just their signature
    var overlay = null, bodyEl = null, searchEl = null, active = "all", query = "", sortMode = "used";

    // Usage rank (lower = more used). Drives the default "Most used" sort, the
    // within-category ordering, and the ★ essential badge on the top tier.
    var RANK = {}; (DATA.rankOrder || []).forEach(function (id, i) { RANK[id] = i; });
    function rankOf(f) { var r = RANK[f.id]; return r == null ? 9999 : r; }
    function byRank(a, b) { var d = rankOf(a) - rankOf(b); return d !== 0 ? d : (a.name || "").localeCompare(b.name || ""); }
    var ESSENTIAL = DATA.essentialCount || 0;
    function isEssential(f) { return rankOf(f) < ESSENTIAL; }

    var SORT_KEY = cfg.sortKey;
    function saveSort() { try { localStorage.setItem(SORT_KEY, sortMode); } catch (e) {} }
    function restoreSort() { try { var s = localStorage.getItem(SORT_KEY); if (s === "used" || s === "cat") sortMode = s; } catch (e) {} }
    function syncSortButtons() {
      if (!overlay) return;
      overlay.querySelectorAll(".cht-sort-btn").forEach(function (b) { b.classList.toggle("active", b.getAttribute("data-sort") === sortMode); });
    }

    function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

    function codeBlock(src) {
      var pre = document.createElement("pre");
      pre.className = "code-pre ros-pre cht-example";
      var code = document.createElement("code");
      code.className = "language-" + LANG;
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

    // Section sub-heading inside an expanded card (How it works, Gotchas, …).
    function secHead(txt) { var h = document.createElement("div"); h.className = "cht-sec-h"; h.innerHTML = txt; return h; }

    // Full-width divider between sub-blocks within a group (e.g. the Regex chip).
    // Rendered before any card that carries a `divider` label.
    function subDivider(txt) { var d = document.createElement("div"); d.className = "cht-subdiv"; d.textContent = txt; return d; }

    // A labelled code block with a Copy-button host strip (reused for patterns).
    function labeledCode(label, src) {
      var w = document.createElement("div"); w.className = "cht-ex-wrap";
      var head = document.createElement("div"); head.className = "cht-ex-head"; head.setAttribute("data-copy-host", "1");
      head.innerHTML = '<span class="cht-ex-label">' + esc(label) + "</span>";
      w.appendChild(head); w.appendChild(codeBlock(src));
      return w;
    }

    // forceOpen: keep the card expanded even in collapsible mode (used on search).
    function card(fn, showPill, forceOpen) {
      var collapsed = COLLAPSIBLE && !forceOpen;
      var c = document.createElement("div");
      c.className = "cht-card" + (isEssential(fn) ? " cht-essential" : "") +
        (COLLAPSIBLE ? " cht-collapsible" : "") + (collapsed ? " collapsed" : "");

      var head = document.createElement("div");
      head.className = "cht-head";
      head.innerHTML =
        '<span class="cht-head-l">' +
          (COLLAPSIBLE ? '<span class="cht-chevron" aria-hidden="true">▸</span>' : "") +
          (isEssential(fn) ? '<span class="cht-star" title="Essential — one of the most-used; learn these first">★</span>' : "") +
          '<code class="cht-sig">' + esc(fn.signature || fn.name) + "</code>" +
        "</span>" +
        '<span class="cht-head-r">' +
          (showPill && fn.group ? '<span class="cht-group-pill">' + esc(fn.group) + "</span>" : "") +
          (fn.returns ? '<span class="cht-ret">→ ' + esc(fn.returns) + "</span>" : "") +
        "</span>";
      c.appendChild(head);

      // In collapsible mode everything below the head lives in a togglable body.
      var body = COLLAPSIBLE ? document.createElement("div") : c;
      if (COLLAPSIBLE) body.className = "cht-body";

      if (fn.category) { var cat = document.createElement("div"); cat.className = "cht-cat"; cat.innerHTML = fn.category; body.appendChild(cat); }
      if (fn.summary) { var s = document.createElement("div"); s.className = "cht-sum"; s.innerHTML = fn.summary; body.appendChild(s); }

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
        body.appendChild(scr);
      }
      if (fn.example) {
        var exWrap = document.createElement("div"); exWrap.className = "cht-ex-wrap";
        // Slim header strip: label on the left, and a host for the Copy button
        // (copybtn.js mounts into [data-copy-host]) so Copy never covers line 1.
        var exHead = document.createElement("div");
        exHead.className = "cht-ex-head";
        exHead.setAttribute("data-copy-host", "1");
        exHead.innerHTML = '<span class="cht-ex-label">Example</span>';
        exWrap.appendChild(exHead);
        exWrap.appendChild(codeBlock(fn.example));
        if (fn.output) { var o = document.createElement("div"); o.className = "cht-out"; o.textContent = "→ " + fn.output; exWrap.appendChild(o); }
        body.appendChild(exWrap);
      }

      // ---- enhanced sections (all optional; only present on deepened fns) ----
      if (fn.works) { body.appendChild(secHead("How it works")); var wk = document.createElement("div"); wk.className = "cht-works"; wk.innerHTML = fn.works; body.appendChild(wk); }
      if (fn.patterns && fn.patterns.length) {
        body.appendChild(secHead("Common patterns"));
        fn.patterns.forEach(function (p) { body.appendChild(labeledCode(p.label || "Pattern", p.code)); });
      }
      if (fn.gotchas && fn.gotchas.length) {
        body.appendChild(secHead("⚠️ Gotchas"));
        var ul = document.createElement("ul"); ul.className = "cht-gotchas";
        fn.gotchas.forEach(function (g) { var li = document.createElement("li"); li.innerHTML = g; ul.appendChild(li); });
        body.appendChild(ul);
      }
      if (fn.related) { body.appendChild(secHead("Related / confused")); var rel = document.createElement("div"); rel.className = "cht-related"; rel.innerHTML = fn.related; body.appendChild(rel); }
      if (fn.perf) { body.appendChild(secHead("Performance")); var pf = document.createElement("div"); pf.className = "cht-perf"; pf.innerHTML = fn.perf; body.appendChild(pf); }
      if (fn.interview && fn.interview.length) {
        body.appendChild(secHead("Interview questions"));
        var qa = document.createElement("div"); qa.className = "cht-qa";
        fn.interview.forEach(function (it) {
          var q = document.createElement("div"); q.className = "cht-q"; q.innerHTML = it.q;
          var a = document.createElement("div"); a.className = "cht-a"; a.innerHTML = it.a;
          qa.appendChild(q); qa.appendChild(a);
        });
        body.appendChild(qa);
      }
      if (fn.notes) { var n = document.createElement("div"); n.className = "cht-notes"; n.innerHTML = fn.notes; body.appendChild(n); }
      if (fn.memory) { var m = document.createElement("div"); m.className = "cht-memory"; m.innerHTML = "🧠 " + fn.memory; body.appendChild(m); }

      if (COLLAPSIBLE) {
        c.appendChild(body);
        head.setAttribute("role", "button");
        head.setAttribute("tabindex", "0");
        head.setAttribute("aria-expanded", collapsed ? "false" : "true");
        var toggle = function () {
          c.classList.toggle("collapsed");
          head.setAttribute("aria-expanded", c.classList.contains("collapsed") ? "false" : "true");
        };
        head.addEventListener("click", toggle);
        head.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
        });
      }
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

    // Count of functions in a category (or "all") that match the current search.
    function countFor(group) {
      return DATA.fns.filter(function (f) {
        return (group === "all" || f.group === group) && matchesQuery(f);
      }).length;
    }
    // Refresh the "(N)" suffix on every filter chip — updates live as you search.
    function updateChipCounts() {
      if (!overlay) return;
      overlay.querySelectorAll(".ros-chip").forEach(function (b) {
        var g = b.getAttribute("data-g");
        b.textContent = (g === "all" ? "All" : g) + " (" + countFor(g) + ")";
      });
    }

    function render() {
      bodyEl.innerHTML = "";
      updateChipCounts();
      if (sortMode === "used") {
        // Flat, ranked list — the most-used functions first, regardless of category.
        var fns = DATA.fns
          .filter(function (f) { return (active === "all" || f.group === active) && matchesQuery(f); })
          .slice().sort(byRank);
        if (!fns.length) { emptyMsg(); return; }
        var head = fns.length + " function" + (fns.length === 1 ? "" : "s") + " · most used first";
        if (active !== "all") head = active + " · " + head;
        bodyEl.appendChild(groupHeader(head));
        fns.forEach(function (f) { if (f.divider) bodyEl.appendChild(subDivider(f.divider)); bodyEl.appendChild(card(f, true, !!query)); });
      } else {
        // Grouped by category (importance order), most-used first within each group.
        var any = false;
        DATA.groups.forEach(function (group) {
          if (active !== "all" && active !== group) return;
          var g = DATA.fns.filter(function (f) { return f.group === group && matchesQuery(f); }).slice().sort(byRank);
          if (!g.length) return;
          any = true;
          bodyEl.appendChild(groupHeader(group + " · " + g.length));
          g.forEach(function (f) { if (f.divider) bodyEl.appendChild(subDivider(f.divider)); bodyEl.appendChild(card(f, false, !!query)); });
        });
        if (!any) { emptyMsg(); return; }
      }
      bodyEl.scrollTop = 0;
    }

    function build() {
      overlay = document.createElement("div");
      overlay.id = cfg.overlayId;
      overlay.className = "ros hidden" + (cfg.wide ? " ros-wide" : "");
      var chips = '<button class="ros-chip ros-chip-all active" data-g="all">All</button>' +
        DATA.groups.map(function (g) { return '<button class="ros-chip" data-g="' + esc(g) + '">' + esc(g) + "</button>"; }).join("");
      overlay.innerHTML =
        '<div class="ros-box" role="dialog" aria-label="' + esc(cfg.ariaLabel) + '">' +
        '  <div class="ros-head">' +
        '    <div class="ros-title">' + cfg.title + ' <span class="ros-sub">— ' + esc(cfg.sub) + '</span></div>' +
        '    <button class="ros-close" aria-label="Close">✕</button>' +
        '  </div>' +
        '  <div class="cht-search-row">' +
        '    <input class="cht-search" type="text" placeholder="' + esc(cfg.placeholder) + '" aria-label="Search ' + esc(cfg.ariaLabel) + '" />' +
        '    <div class="cht-sort" role="group" aria-label="Sort order">' +
        '      <button class="cht-sort-btn active" data-sort="used" title="Show every function ordered by how often it is used">⭐ Most used</button>' +
        '      <button class="cht-sort-btn" data-sort="cat" title="Group by category (most used first within each)">🗂 By category</button>' +
        '    </div>' +
        (COLLAPSIBLE ?
        '    <div class="cht-xall" role="group" aria-label="Expand or collapse all functions">' +
        '      <button class="cht-xall-btn" data-x="open" title="Expand every function">Expand all</button>' +
        '      <button class="cht-xall-btn" data-x="close" title="Collapse to just names">Collapse all</button>' +
        '    </div>' : "") +
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
          saveSort();
          render();
        });
      });
      overlay.querySelectorAll(".cht-xall-btn").forEach(function (b) {
        b.addEventListener("click", function () {
          var collapse = b.getAttribute("data-x") === "close";
          overlay.querySelectorAll(".cht-card.cht-collapsible").forEach(function (c) {
            c.classList.toggle("collapsed", collapse);
            var h = c.querySelector(".cht-head");
            if (h) h.setAttribute("aria-expanded", collapse ? "false" : "true");
          });
        });
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && overlay.classList.contains("open")) close();
      });
    }

    function open() {
      if (!overlay) build();
      restoreSort();
      syncSortButtons();
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
      var btn = document.getElementById(cfg.btnId);
      if (btn) btn.addEventListener("click", open);
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
    else init();

    return { open: open, close: close };
  }

  // ---- the three panels -----------------------------------------------------
  window.CHEATSHEET = makeCheatsheet({
    data: window.PYSPARK_CHEAT,
    lang: "python",
    overlayId: "cheatsheet",
    btnId: "cheatBtn",
    sortKey: "blind75_cheat_sort",
    ariaLabel: "PySpark function cheatsheet",
    title: "⚡ PySpark cheatsheet",
    sub: "every function, its parameters, and what they do",
    placeholder: "Search functions… (select, join, window, groupBy, when…)",
    collapsible: true,   // cards collapse to just their signature; click to expand
    wide: true           // landscape aspect — roomier for comparison tables
  });

  window.PYCHEATSHEET = makeCheatsheet({
    data: window.PYTHON_CHEAT,
    lang: "python",
    overlayId: "pycheatsheet",
    btnId: "pyCheatBtn",
    sortKey: "blind75_pycheat_sort",
    ariaLabel: "Python function cheatsheet",
    title: "🐍 Python cheatsheet",
    sub: "the built-ins, idioms & stdlib you reach for in a coding round",
    placeholder: "Search… (enumerate, Counter, sorted, heapq, comprehension…)"
  });

  window.SQLCHEATSHEET = makeCheatsheet({
    data: window.SQL_CHEAT,
    lang: "sql",
    overlayId: "sqlcheatsheet",
    btnId: "sqlCheatBtn",
    sortKey: "blind75_sqlcheat_sort",
    ariaLabel: "SQL function cheatsheet",
    title: "🗄 SQL cheatsheet",
    sub: "every function, its parameters, and how to use it",
    placeholder: "Search… (row_number, coalesce, datediff, case, string_agg…)"
  });

})();
