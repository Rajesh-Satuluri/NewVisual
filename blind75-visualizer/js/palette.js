/*
 * palette.js — the ⌘K command palette + guided learning paths (M5.2).
 * A single fuzzy launcher over EVERYTHING in the tool: every Learn topic and
 * every Practice problem across all five stacks. Opens with Cmd/Ctrl+K (or the
 * header button), filters as you type (Fuse), and navigates via BLIND75.goTo.
 *
 * With an empty query it shows curated GUIDED PATHS — ordered study tracks whose
 * steps are resolved live against the content index (so they never point at a
 * stale id) and ticked off from the shared store.
 *
 * Self-contained: builds its own overlay DOM, needs no markup in index.html
 * beyond an optional #paletteBtn trigger. Load AFTER app.js so BLIND75.goTo exists.
 */
(function () {
  var store = window.BLIND75 && window.BLIND75.store;

  var STACK_LABEL = { python: "Python", numpy: "NumPy", pandas: "Pandas", spark: "PySpark", sql: "SQL" };
  var STACK_COLOR = { python: "#4c8dff", numpy: "#37b24d", pandas: "#845ef7", spark: "#f76707", sql: "#0ca678" };

  // Curated study tracks. Each step is resolved at open time to the first content
  // item whose stack+mode match and whose title/tags/category contain `match`.
  var PATHS = [
    {
      id: "neetcode150",
      name: "NeetCode 150 Prep",
      desc: "Core Python → the DSA toolkit → key patterns, in interview order.",
      steps: [
        { mode: "learn", stack: "python", match: "lists" },
        { mode: "learn", stack: "python", match: "dictionaries" },
        { mode: "learn", stack: "python", match: "recursion" },
        { mode: "learn", stack: "python", match: "deque" },
        { mode: "learn", stack: "python", match: "heapq" },
        { mode: "learn", stack: "python", match: "bisect" },
        { mode: "learn", stack: "python", match: "dynamic programming" },
        { mode: "learn", stack: "python", match: "bit manipulation" },
        { mode: "practice", stack: "python", match: "two sum" },
        { mode: "practice", stack: "python", match: "valid anagram" },
        { mode: "practice", stack: "python", match: "number of islands" }
      ]
    },
    {
      id: "de-sql",
      name: "DE Interview · SQL",
      desc: "The SQL an analytics/DE interview leans on — joins, windows, CTEs.",
      steps: [
        { mode: "learn", stack: "sql", match: "select" },
        { mode: "learn", stack: "sql", match: "group by" },
        { mode: "learn", stack: "sql", match: "join" },
        { mode: "learn", stack: "sql", match: "window" },
        { mode: "learn", stack: "sql", match: "ranking" },
        { mode: "learn", stack: "sql", match: "cte" },
        { mode: "practice", stack: "sql", match: "" }
      ]
    },
    {
      id: "de-spark-pandas",
      name: "DE Interview · PySpark + Pandas",
      desc: "The distributed and in-memory dataframe skills, side by side.",
      steps: [
        { mode: "learn", stack: "spark", match: "shuffle" },
        { mode: "learn", stack: "spark", match: "groupby" },
        { mode: "learn", stack: "spark", match: "join" },
        { mode: "learn", stack: "pandas", match: "groupby" },
        { mode: "learn", stack: "pandas", match: "merge" },
        { mode: "practice", stack: "pandas", match: "group" },
        { mode: "practice", stack: "spark", match: "" }
      ]
    }
  ];

  var index = null;      // flat content index (built lazily)
  var fuse = null;
  var overlay = null, input = null, resultsEl = null, footEl = null;
  var rows = [];         // current rendered {node, action}
  var sel = 0;
  var view = "list";     // "list" | "path"
  var curPath = null;

  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  function buildIndex() {
    var idx = [];
    function pushTopic(stack, t) {
      idx.push({ kind: "topic", stack: stack, mode: "learn", id: t.id, title: t.title,
                 cat: t.section || "", tags: (t.matchTags || []).join(" ") });
    }
    function pushProblem(stack, p) {
      var m = p.meta || {};
      idx.push({ kind: "problem", stack: stack, mode: "practice", id: p.id, title: p.title,
                 cat: p.category || "", tags: [m.pattern, m.technique, m.functions, m.transformation, m.sqlConcept].filter(Boolean).join(" ") });
    }
    if (window.PYDSA && window.PYDSA.all) window.PYDSA.all().forEach(function (t) { pushTopic("python", t); });
    ["sql", "spark", "numpy", "pandas"].forEach(function (s) {
      if (window.LEARN && window.LEARN.hasContent && window.LEARN.hasContent(s)) window.LEARN.all(s).forEach(function (t) { pushTopic(s, t); });
    });
    if (window.BLIND75 && window.BLIND75.all) window.BLIND75.all().forEach(function (p) { pushProblem("python", p); });
    [["sql", window.SQLLAB], ["spark", window.PYSPARK], ["numpy", window.NUMPY], ["pandas", window.PANDAS]].forEach(function (pair) {
      if (pair[1] && pair[1].all) pair[1].all().forEach(function (p) { pushProblem(pair[0], p); });
    });
    return idx;
  }

  function ensureIndex() {
    if (index) return;
    index = buildIndex();
    if (window.Fuse) {
      fuse = new Fuse(index, {
        includeScore: true, threshold: 0.4, ignoreLocation: true,
        keys: [{ name: "title", weight: 0.6 }, { name: "cat", weight: 0.2 }, { name: "tags", weight: 0.2 }]
      });
    }
  }

  // resolve a path step to a concrete index item (first match), or null
  function resolveStep(step) {
    if (!index) ensureIndex();
    var m = (step.match || "").toLowerCase();
    for (var i = 0; i < index.length; i++) {
      var it = index[i];
      if (it.stack !== step.stack || it.mode !== step.mode) continue;
      if (!m) return it;
      if ((it.title + " " + it.tags + " " + it.cat).toLowerCase().indexOf(m) !== -1) return it;
    }
    return null;
  }

  function isDone(it) {
    if (!store) return false;
    if (it.mode === "learn") {
      var sid = it.stack === "python" ? it.id : "learn:" + it.stack + ":" + it.id;
      var s = store.getPyStatus(sid);
      return s === "learned" || s === "mastered";
    }
    var pid = it.stack === "python" ? it.id : it.stack + ":" + it.id;
    return store.getStatus(pid) === "solved";
  }

  // ---------------- DOM ----------------
  function build() {
    overlay = document.createElement("div");
    overlay.id = "cmdk";
    overlay.className = "cmdk hidden";
    overlay.innerHTML =
      '<div class="cmdk-box" role="dialog" aria-label="Command palette">' +
      '  <input class="cmdk-input" type="text" placeholder="Jump to any topic or problem…  (type to search)" autocomplete="off" spellcheck="false" />' +
      '  <div class="cmdk-results"></div>' +
      '  <div class="cmdk-foot"><span>↑↓ navigate</span><span>↵ open</span><span>esc close</span></div>' +
      '</div>';
    document.body.appendChild(overlay);
    input = overlay.querySelector(".cmdk-input");
    resultsEl = overlay.querySelector(".cmdk-results");
    footEl = overlay.querySelector(".cmdk-foot");

    overlay.addEventListener("mousedown", function (e) { if (e.target === overlay) close(); });
    input.addEventListener("input", function () { render(); });
    input.addEventListener("keydown", onKey);
  }

  function chip(stack) {
    return '<span class="cmdk-chip" style="--c:' + (STACK_COLOR[stack] || "#888") + '">' + esc(STACK_LABEL[stack] || stack) + "</span>";
  }
  function modeTag(mode) { return '<span class="cmdk-mode">' + (mode === "learn" ? "Learn" : "Practice") + "</span>"; }

  function rowNode(html, action, done) {
    var r = document.createElement("div");
    r.className = "cmdk-row" + (done ? " done" : "");
    r.innerHTML = html;
    r.addEventListener("mousemove", function () { setSel(rows.indexOf(entry)); });
    r.addEventListener("click", function () { action(); });
    var entry = { node: r, action: action };
    return entry;
  }

  function clearRows() { rows = []; resultsEl.innerHTML = ""; }

  function addRow(entry) { rows.push(entry); resultsEl.appendChild(entry.node); }

  function setSel(i) {
    if (i < 0 || i >= rows.length) return;
    if (rows[sel]) rows[sel].node.classList.remove("sel");
    sel = i;
    rows[sel].node.classList.add("sel");
    var n = rows[sel].node, box = resultsEl;
    var top = n.offsetTop, bottom = top + n.offsetHeight;
    if (top < box.scrollTop) box.scrollTop = top;
    else if (bottom > box.scrollTop + box.clientHeight) box.scrollTop = bottom - box.clientHeight;
  }

  function go(it) { close(); window.BLIND75.goTo(it.mode, it.stack, it.id); }

  function renderEmpty() {
    view = "list"; curPath = null;
    clearRows();
    var head = document.createElement("div");
    head.className = "cmdk-section";
    head.textContent = "Guided paths";
    resultsEl.appendChild(head);
    PATHS.forEach(function (p) {
      var steps = p.steps.map(resolveStep).filter(Boolean);
      var done = steps.filter(isDone).length;
      var html = '<div class="cmdk-path-i">' +
        '<div class="cmdk-title">🧭 ' + esc(p.name) + '</div>' +
        '<div class="cmdk-sub">' + esc(p.desc) + '</div></div>' +
        '<div class="cmdk-prog">' + done + "/" + steps.length + "</div>";
      addRow(rowNode(html, function () { openPath(p); }, steps.length && done === steps.length));
    });
    var tip = document.createElement("div");
    tip.className = "cmdk-section";
    tip.textContent = "Type to search " + (index ? index.length : "") + " topics & problems";
    resultsEl.appendChild(tip);
    setSel(0);
    footEl.querySelector("span").textContent = "↑↓ navigate";
  }

  function openPath(p) {
    view = "path"; curPath = p;
    clearRows();
    var back = document.createElement("div");
    back.className = "cmdk-section cmdk-back";
    back.textContent = "‹ " + p.name;
    back.addEventListener("click", renderEmpty);
    resultsEl.appendChild(back);
    p.steps.forEach(function (step, i) {
      var it = resolveStep(step);
      if (!it) return;
      var d = isDone(it);
      var html = '<div class="cmdk-step-n">' + (d ? "✓" : (i + 1)) + "</div>" +
        '<div class="cmdk-title">' + esc(it.title) + "</div>" +
        chip(it.stack) + modeTag(it.mode);
      addRow(rowNode(html, function () { go(it); }, d));
    });
    setSel(1);
    footEl.querySelector("span").textContent = "esc ‹ back";
  }

  function renderResults(q) {
    view = "list"; curPath = null;
    clearRows();
    var items = fuse ? fuse.search(q).slice(0, 40).map(function (r) { return r.item; })
                     : index.filter(function (it) { return it.title.toLowerCase().indexOf(q.toLowerCase()) !== -1; }).slice(0, 40);
    if (!items.length) {
      var none = document.createElement("div");
      none.className = "cmdk-none";
      none.textContent = "No matches for “" + q + "”";
      resultsEl.appendChild(none);
      return;
    }
    items.forEach(function (it) {
      var d = isDone(it);
      var html = '<div class="cmdk-title">' + esc(it.title) + (d ? ' <span class="cmdk-done-tick">✓</span>' : "") + "</div>" +
        '<div class="cmdk-meta">' + chip(it.stack) + modeTag(it.mode) +
        (it.cat ? '<span class="cmdk-cat">' + esc(it.cat) + "</span>" : "") + "</div>";
      addRow(rowNode(html, function () { go(it); }, d));
    });
    setSel(0);
    footEl.querySelector("span").textContent = "↑↓ navigate";
  }

  function render() {
    ensureIndex();
    var q = input.value.trim();
    if (!q) { renderEmpty(); return; }
    renderResults(q);
  }

  function onKey(e) {
    if (e.key === "ArrowDown") { e.preventDefault(); setSel(Math.min(sel + 1, rows.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSel(Math.max(sel - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (rows[sel]) rows[sel].action(); }
    else if (e.key === "Escape") {
      e.preventDefault();
      if (view === "path") { renderEmpty(); input.focus(); }
      else close();
    }
  }

  function open() {
    if (!overlay) build();
    ensureIndex();
    overlay.classList.remove("hidden");
    requestAnimationFrame(function () { overlay.classList.add("open"); });
    input.value = "";
    render();
    input.focus();
    document.body.classList.add("cmdk-lock");
  }
  function close() {
    if (!overlay) return;
    overlay.classList.remove("open");
    document.body.classList.remove("cmdk-lock");
    setTimeout(function () { overlay.classList.add("hidden"); }, 160);
  }

  // global shortcut + header button
  function init() {
    document.addEventListener("keydown", function (e) {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        if (overlay && overlay.classList.contains("open")) close(); else open();
      }
    });
    var btn = document.getElementById("paletteBtn");
    if (btn) btn.addEventListener("click", open);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  window.PALETTE = { open: open, close: close };
})();
