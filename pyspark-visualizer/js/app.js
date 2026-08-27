/*
 * app.js — the Blind 75 study application.
 * Renders the sidebar, the problem reading pane, search, filters, progress,
 * code toggles (approach + RCS/plain), blur-to-recall, notes, review queue,
 * export/import, the all-75 revision grid, and keyboard navigation.
 */
(function () {
  var B = window.PYSPARK;
  var store = B.store;
  var md = B.md;

  var ALL = B.all();                 // flat, canonical order
  var GROUPS = B.byCategory();
  var byId = {};
  ALL.forEach(function (p) { byId[p.id] = p; });

  // ---- Fuse search index ----
  var fuse = new Fuse(ALL, {
    includeScore: true,
    threshold: 0.38,
    ignoreLocation: true,
    keys: [
      { name: "title", weight: 0.4 },
      { name: "category", weight: 0.2 },
      { name: "meta.pattern", weight: 0.2 },
      { name: "meta.transformation", weight: 0.15 },
      { name: "meta.functions", weight: 0.15 },
      { name: "difficulty", weight: 0.1 },
      { name: "lc", weight: 0.1 }
    ]
  });

  // ---- app state ----
  var state = {
    currentId: store.getPref("lastProblem") || (ALL[0] && ALL[0].id),
    query: "",
    filterDifficulty: "all",
    filterStatus: "all",
    filterPattern: "all",
    filterImportance: "all",
    setFilter: store.getPref("setFilter") || "all",  // "all" | "Easy" | "Medium" | "Hard"
    approachIndex: {}   // problemId -> selected approach index
  };

  // ---- interview-importance tier (curated estimate; central map in data/importance.js) ----
  var IMPORTANCE = B.IMPORTANCE || {};
  var IMP_META = {
    essential:  { label: "Essential", stars: "★★★", cls: "imp-essential" },
    common:     { label: "Common",    stars: "★★",  cls: "imp-common" },
    occasional: { label: "Occasional", stars: "★",  cls: "imp-occasional" }
  };
  function impOf(p) { return IMPORTANCE[p.lc] || "common"; }

  // ---- tiny DOM helpers ----
  function el(id) { return document.getElementById(id); }
  function h(tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === "class") e.className = attrs[k];
      else if (k === "html") e.innerHTML = attrs[k];
      else e.setAttribute(k, attrs[k]);
    }
    if (html != null) e.innerHTML = html;
    return e;
  }
  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  var STATUS_GLYPH = { "not-started": "○", "learning": "◐", "solved": "✓" };
  var STATUS_LABEL = { "not-started": "Not Started", "learning": "Learning", "solved": "Solved" };
  var DIFF_ORDER = { "Easy": 0, "Medium": 1, "Hard": 2 };

  // Distinct patterns for the filter dropdown.
  function allPatterns() {
    var set = {};
    ALL.forEach(function (p) { if (p.meta && p.meta.pattern) set[p.meta.pattern] = true; });
    return Object.keys(set).sort();
  }

  // Is a problem in the currently-selected study set (All / Easy / Medium / Hard)?
  function inActiveSet(p) {
    return B.inSet(p, state.setFilter);
  }
  // Problems of the active set (optionally within a given list).
  function activeProblems(list) {
    return (list || ALL).filter(inActiveSet);
  }

  // Which problems pass the current filters/search? Returns a Set of ids.
  function visibleIds() {
    var base = ALL;
    if (state.query.trim()) {
      base = fuse.search(state.query.trim()).map(function (r) { return r.item; });
    }
    var ids = {};
    base.forEach(function (p) {
      if (!inActiveSet(p)) return;
      if (state.filterDifficulty !== "all" && p.difficulty !== state.filterDifficulty) return;
      if (state.filterStatus !== "all") {
        var st = store.getStatus(p.id);
        if (state.filterStatus === "review") {
          if (!store.isReview(p.id)) return;
        } else if (state.filterStatus === "due") {
          if (!store.isDue(p.id)) return;
        } else if (st !== state.filterStatus) return;
      }
      if (state.filterPattern !== "all" && (!p.meta || p.meta.pattern !== state.filterPattern)) return;
      if (state.filterImportance !== "all" && impOf(p) !== state.filterImportance) return;
      ids[p.id] = true;
    });
    return ids;
  }

  // ============================================================= SIDEBAR
  function renderSidebar() {
    var nav = el("nav");
    nav.innerHTML = "";
    var vis = visibleIds();

    GROUPS.forEach(function (g) {
      var matching = g.problems.filter(function (p) { return vis[p.id]; });
      if (!matching.length) return;

      var collapsed = store.isCatCollapsed(g.category);
      var inSet = activeProblems(g.problems);
      var solvedInCat = inSet.filter(function (p) { return store.getStatus(p.id) === "solved"; }).length;

      var header = h("button", { class: "cat-header", "data-cat": g.category });
      header.innerHTML =
        '<span class="cat-caret">' + (collapsed ? "▸" : "▾") + "</span>" +
        '<span class="cat-icon">' + (B.CATEGORY_ICON[g.category] || "•") + "</span>" +
        '<span class="cat-name">' + esc(g.category) + "</span>" +
        '<span class="cat-count">' + solvedInCat + "/" + inSet.length + "</span>";
      header.addEventListener("click", function () {
        store.setCatCollapsed(g.category, !store.isCatCollapsed(g.category));
        renderSidebar();
      });
      nav.appendChild(header);

      if (collapsed) return;

      var list = h("div", { class: "cat-list" });
      matching.forEach(function (p) {
        var st = store.getStatus(p.id);
        var item = h("a", { class: "nav-item" + (p.id === state.currentId ? " active" : ""), href: "#" + p.id, "data-id": p.id });
        item.innerHTML =
          '<span class="st st-' + st + '">' + STATUS_GLYPH[st] + "</span>" +
          '<span class="ni-imp ' + IMP_META[impOf(p)].cls + '" title="' + IMP_META[impOf(p)].label + ' (curated estimate)"></span>' +
          '<span class="ni-title">' + esc(p.title) + "</span>" +
          (store.isReview(p.id) ? '<span class="ni-review" title="Flagged for review">★</span>' : "") +
          (store.isDue(p.id) ? '<span class="ni-review" title="Due for review">◔</span>' : "") +
          '<span class="ni-diff d-' + p.difficulty.toLowerCase() + '">' + p.difficulty.charAt(0) + "</span>";
        item.addEventListener("click", function (e) {
          e.preventDefault();
          selectProblem(p.id);
        });
        list.appendChild(item);
      });
      nav.appendChild(list);
    });

    if (!nav.children.length) {
      nav.appendChild(h("div", { class: "nav-empty" }, "No problems match your search / filters."));
    }
  }

  // ============================================================= PROGRESS
  function renderProgress() {
    var set = activeProblems();
    var solved = 0, learning = 0;
    set.forEach(function (p) {
      var s = store.getStatus(p.id);
      if (s === "solved") solved++;
      else if (s === "learning") learning++;
    });
    var total = set.length;
    var pct = total ? Math.round((solved / total) * 100) : 0;
    el("progressText").textContent = solved + " / " + total + " solved";
    el("progressSub").textContent = learning + " learning";
    el("progressFill").style.width = pct + "%";
    var tc = el("totalCount");
    if (tc) tc.textContent = total;
    var lbl = el("setLabel");
    if (lbl) lbl.textContent = state.setFilter === "all" ? "all" : state.setFilter;
    updateFilterCounts();
    updateReviewChip();
    updateFilterDot();
  }

  // Base labels for filter options (counts appended, never touching value).
  var STATUS_BASE = { "all": "Any status", "not-started": "Not started", "learning": "Learning",
    "solved": "Solved", "review": "★ Review queue", "due": "◔ Due for review" };
  var IMP_BASE = { "all": "All importance", "essential": "★★★ Essential", "common": "★★ Common", "occasional": "★ Occasional" };

  // Per-option match counts, scoped to the active study set only (not cross-filtered).
  function updateFilterCounts() {
    var set = activeProblems();
    var byStatus = { "not-started": 0, "learning": 0, "solved": 0, review: 0, due: 0 };
    var byImp = { essential: 0, common: 0, occasional: 0 };
    var byPat = {};
    set.forEach(function (p) {
      byStatus[store.getStatus(p.id)]++;
      if (store.isReview(p.id)) byStatus.review++;
      if (store.isDue(p.id)) byStatus.due++;
      byImp[impOf(p)]++;
      var pat = p.meta && p.meta.pattern; if (pat) byPat[pat] = (byPat[pat] || 0) + 1;
    });
    var fs = el("filterStatus");
    if (fs) Array.prototype.forEach.call(fs.options, function (o) {
      var base = STATUS_BASE[o.value] || o.value;
      var n = o.value === "all" ? set.length : (byStatus[o.value] || 0);
      o.textContent = base + " (" + n + ")";
    });
    var fi = el("filterImportance");
    if (fi) Array.prototype.forEach.call(fi.options, function (o) {
      var base = IMP_BASE[o.value] || o.value;
      var n = o.value === "all" ? set.length : (byImp[o.value] || 0);
      o.textContent = base + " (" + n + ")";
    });
    var fp = el("filterPattern");
    if (fp) Array.prototype.forEach.call(fp.options, function (o) {
      if (o.value === "all") { o.textContent = "All patterns (" + set.length + ")"; return; }
      o.textContent = o.getAttribute("data-base") + " (" + (byPat[o.value] || 0) + ")";
    });
  }

  function updateReviewChip() {
    var chip = el("reviewDue"); if (!chip) return;
    var n = store.countDue(activeProblems().map(function (p) { return p.id; }));
    chip.textContent = "◔ Review " + n + " due";
    chip.disabled = n === 0;
  }

  function anyFilterActive() {
    return state.filterStatus !== "all" || state.filterPattern !== "all" || state.filterImportance !== "all";
  }
  function updateFilterDot() {
    var t = el("filterToggle"); if (t) t.classList.toggle("has-active", anyFilterActive());
  }

  // ============================================================= CODE BLOCK
  function codeBlock(source, extraClass, lang) {
    lang = lang || "python";
    var label = lang === "sql" ? "Spark SQL" : "PySpark";
    var wrap = h("div", { class: "code-wrap " + (extraClass || "") });
    var bar = h("div", { class: "code-bar" });
    var copy = h("button", { class: "copy-btn" }, "Copy");
    copy.addEventListener("click", function () {
      var text = source;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(flash, function () { fallbackCopy(text); flash(); });
      } else { fallbackCopy(text); flash(); }
      function flash() { copy.textContent = "Copied!"; setTimeout(function () { copy.textContent = "Copy"; }, 1200); }
    });
    bar.appendChild(h("span", { class: "code-lang" }, label));
    bar.appendChild(copy);
    var pre = h("pre", { class: "code-pre" });
    var code = h("code", { class: "language-" + lang }, esc(source));
    pre.appendChild(code);
    wrap.appendChild(bar);
    wrap.appendChild(pre);
    // highlight
    if (window.Prism) window.Prism.highlightElement(code);
    return wrap;
  }
  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); } catch (e) {}
    document.body.removeChild(ta);
  }

  // ============================================================= SECTION
  function section(key, title, bodyNode, opts) {
    opts = opts || {};
    var sec = h("section", { class: "prob-section", "data-key": key });
    var head = h("button", { class: "sec-head" });
    head.innerHTML = '<span class="sec-caret">▾</span><span class="sec-title">' + esc(title) + "</span>" +
      (opts.badge ? '<span class="sec-badge">' + esc(opts.badge) + "</span>" : "");
    // grid-rows animation wrapper (see components.css)
    var outer = h("div", { class: "sec-body-outer" });
    var body = h("div", { class: "sec-body" });
    body.appendChild(bodyNode);
    outer.appendChild(body);
    head.addEventListener("click", function () {
      sec.classList.toggle("collapsed");
    });
    sec.appendChild(head);
    sec.appendChild(outer);
    return sec;
  }

  // ---- animated modal open/close (route every open/close through these) ----
  function openModal(id) {
    var m = el(id); if (!m) return;
    m.classList.remove("hidden"); void m.offsetWidth; m.classList.add("open");
  }
  function closeModal(id) {
    var m = el(id); if (!m || m.classList.contains("hidden")) return;
    m.classList.remove("open");
    setTimeout(function () { m.classList.add("hidden"); }, 200); // 200 == --dur
  }
  function anyModalOpen() {
    var ms = document.querySelectorAll(".modal:not(.hidden)");
    return ms.length ? ms[ms.length - 1].id : null;
  }

  // ---- humanized due date ----
  function humanWhen(dueMs) {
    var now = Date.now();
    if (dueMs <= now) return "today";
    var start = new Date(); start.setHours(0, 0, 0, 0);
    var days = Math.round((dueMs - start.getTime()) / 86400000);
    if (days <= 0) return "today";
    if (days === 1) return "tomorrow";
    if (days < 14) return "in " + days + " days";
    if (days < 60) return "in " + Math.round(days / 7) + " weeks";
    return "in " + Math.round(days / 30) + " months";
  }

  // ---- generic labeled progress bar (dashboard) ----
  function bar(label, value, total, weak) {
    var pct = total ? Math.round((value / total) * 100) : 0;
    var row = h("div", { class: "bar-row" + (weak ? " weak" : "") });
    row.innerHTML =
      '<div class="bar-label" title="' + esc(label) + '">' + esc(label) + "</div>" +
      '<div class="bar-track"><div class="bar-fill" style="width:' + pct + '%"></div></div>' +
      '<div class="bar-val">' + value + "/" + total + "</div>";
    return row;
  }

  // ============================================================= MAIN VIEW
  function renderProblem(preserveScroll) {
    var p = byId[state.currentId];
    var main = el("main");
    // Keep the reading position on in-place re-renders (code/approach/status
    // toggles); only jump to top when navigating to a different problem.
    var prevScroll = preserveScroll === false ? 0 : main.scrollTop;
    main.innerHTML = "";
    if (!p) {
      main.appendChild(h("div", { class: "empty-state" }, "Select a problem from the sidebar to begin."));
      return;
    }
    store.setPref("lastProblem", p.id);

    // ---- sticky header ----
    var st = store.getStatus(p.id);
    var header = h("div", { class: "prob-header" });
    header.innerHTML =
      '<div class="ph-top">' +
        '<span class="ph-lc">Q' + p.lc + "</span>" +
        '<span class="ph-diff d-' + p.difficulty.toLowerCase() + '">' + p.difficulty + "</span>" +
        '<span class="imp-pill ' + IMP_META[impOf(p)].cls + '" title="Interview importance — curated estimate">' + IMP_META[impOf(p)].stars + " " + IMP_META[impOf(p)].label + "</span>" +
        '<span class="ph-cat">' + esc(p.category) + "</span>" +
        (p.link ? '<a class="ph-link" href="' + p.link + '" target="_blank" rel="noopener">Docs ↗</a>' : "") +
      "</div>" +
      '<h1 class="ph-title">' + esc(p.title) + "</h1>";

    // status + actions row
    var actions = h("div", { class: "ph-actions" });
    var statusSel = h("div", { class: "status-group" });
    ["not-started", "learning", "solved"].forEach(function (s) {
      var b = h("button", { class: "status-btn st-" + s + (st === s ? " sel" : ""), "data-s": s },
        STATUS_GLYPH[s] + " " + STATUS_LABEL[s]);
      b.addEventListener("click", function () {
        store.setStatus(p.id, s);
        // in-place: just move the .sel class (no full re-render) + refresh sidebar/progress
        statusSel.querySelectorAll(".status-btn").forEach(function (x) { x.classList.remove("sel"); });
        b.classList.add("sel");
        renderSidebar(); renderProgress();
      });
      statusSel.appendChild(b);
    });
    actions.appendChild(statusSel);

    var reviewBtn = h("button", { class: "chip-btn" + (store.isReview(p.id) ? " on" : "") },
      (store.isReview(p.id) ? "★ In review queue" : "☆ Mark for review"));
    reviewBtn.addEventListener("click", function () {
      store.toggleReview(p.id);
      renderProblem(); renderSidebar();
    });
    actions.appendChild(reviewBtn);

    var blurBtn = h("button", { class: "chip-btn" + (store.getPref("blur") ? " on" : "") },
      (store.getPref("blur") ? "👁 Recall mode: ON" : "👁 Recall mode: OFF"));
    blurBtn.addEventListener("click", function () {
      store.setPref("blur", !store.getPref("blur"));
      renderProblem();
    });
    actions.appendChild(blurBtn);

    header.appendChild(actions);
    main.appendChild(header);

    // ---- metadata badge row ----
    var metaBox = h("div", { class: "meta-box" });
    var m = p.meta || {};
    var metaItems = [
      ["Pattern", m.pattern],
      ["Transformation", m.transformation],
      ["Functions", m.functions],
      ["Difficulty", p.difficulty],
      ["Importance", IMP_META[impOf(p)].stars + " " + IMP_META[impOf(p)].label]
    ];
    metaItems.forEach(function (it) {
      if (!it[1]) return;
      var cell = h("div", { class: "meta-cell" });
      cell.innerHTML = '<div class="meta-k">' + esc(it[0]) + "</div>";
      if (it[0] === "Pattern") {
        var tag = h("button", { class: "meta-v pattern-link", title: "Show all with this pattern" }, esc(it[1]));
        tag.addEventListener("click", function () {
          state.filterPattern = it[1]; el("filterPattern").value = it[1];
          state.query = ""; el("search").value = "";
          renderSidebar();
        });
        cell.appendChild(tag);
      } else {
        cell.appendChild(h("div", { class: "meta-v" }, esc(it[1])));
      }
      metaBox.appendChild(cell);
    });
    main.appendChild(metaBox);

    // ---- Problem Description ----
    var descNode = h("div", { class: "md" });
    descNode.innerHTML = md(p.description);
    if (p.constraints && p.constraints.length) {
      var cwrap = h("div", { class: "constraints" });
      cwrap.appendChild(h("div", { class: "subhead" }, "Constraints"));
      var ul = h("ul");
      p.constraints.forEach(function (c) { ul.appendChild(h("li", { html: md(c).replace(/^<p>|<\/p>$/g, "") })); });
      cwrap.appendChild(ul);
      descNode.appendChild(cwrap);
    }
    if (p.notes && p.notes.length) {
      var nwrap = h("div", { class: "notes-block" });
      nwrap.appendChild(h("div", { class: "subhead" }, "Notes"));
      var ul2 = h("ul");
      p.notes.forEach(function (c) { ul2.appendChild(h("li", { html: md(c).replace(/^<p>|<\/p>$/g, "") })); });
      nwrap.appendChild(ul2);
      descNode.appendChild(nwrap);
    }
    main.appendChild(section("description", "Problem Description", descNode));

    // ---- Examples ----
    var exWrap = h("div", { class: "examples" });
    (p.examples || []).forEach(function (ex, idx) {
      var card = h("div", { class: "example-card" });
      card.appendChild(h("div", { class: "ex-num" }, "Example " + (idx + 1)));
      var io = h("div", { class: "ex-io" });
      io.innerHTML =
        '<div class="ex-row"><span class="ex-label">Input</span><code>' + esc(ex.input) + "</code></div>" +
        '<div class="ex-row"><span class="ex-label">Output</span><code>' + esc(ex.output) + "</code></div>";
      card.appendChild(io);
      if (ex.reasoning) {
        var r = h("div", { class: "ex-reason md" }); r.innerHTML = md(ex.reasoning); card.appendChild(r);
      }
      if (ex.visual) {
        var v = h("div", { class: "ex-visual md" }); v.innerHTML = md(ex.visual); card.appendChild(v);
      }
      exWrap.appendChild(card);
    });
    main.appendChild(section("examples", "Examples", exWrap, { badge: (p.examples || []).length + "" }));

    // ---- Approach switcher (drives Logic + Code) ----
    var approaches = p.approaches || [];
    if (state.approachIndex[p.id] == null) state.approachIndex[p.id] = approaches.length - 1; // default: optimal
    var ai = state.approachIndex[p.id];

    var apWrap = h("div", { class: "approach-area" });
    if (approaches.length > 1) {
      var switcher = h("div", { class: "approach-switch" });
      approaches.forEach(function (a, i) {
        var b = h("button", { class: "app-tab" + (i === ai ? " active" : "") }, esc(a.name));
        b.addEventListener("click", function () {
          state.approachIndex[p.id] = i;
          renderProblem();
        });
        switcher.appendChild(b);
      });
      apWrap.appendChild(switcher);
    }

    var cur = approaches[ai] || {};
    var blur = store.getPref("blur");

    // Logic
    var logicNode = h("div", { class: "md logic" + (blur ? " blurred" : "") });
    logicNode.innerHTML = md(cur.logic);
    if (blur) logicNode.appendChild(revealOverlay(logicNode));
    var logicSection = section("logic", "Complete Logic — " + (cur.name || "Approach"), logicNode);
    apWrap.appendChild(logicSection);

    // Code (RCS / Plain toggle)
    var codeMode = store.getPref("codeMode") || "rcs";
    var codeArea = h("div", { class: "code-area" });
    var toggle = h("div", { class: "code-toggle" });
    var rcsBtn = h("button", { class: "ct-btn" + (codeMode === "rcs" ? " active" : "") }, "RCS Code");
    var plainBtn = h("button", { class: "ct-btn" + (codeMode === "plain" ? " active" : "") }, "Plain PySpark");
    rcsBtn.addEventListener("click", function () { store.setPref("codeMode", "rcs"); renderProblem(); });
    plainBtn.addEventListener("click", function () { store.setPref("codeMode", "plain"); renderProblem(); });
    toggle.appendChild(rcsBtn); toggle.appendChild(plainBtn);
    var hint = h("span", { class: "code-hint" }, codeMode === "rcs" ? "Commented for revision" : "Clean — try to read it yourself");
    toggle.appendChild(hint);
    codeArea.appendChild(toggle);

    var source = codeMode === "rcs" ? cur.rcs : cur.plain;
    var cb = codeBlock(source, blur ? "blurred" : "");
    if (blur) cb.appendChild(revealOverlay(cb));
    codeArea.appendChild(cb);

    if (cur.whenToUse) {
      codeArea.appendChild(h("div", { class: "when-use" }, "<strong>When to use:</strong> " + esc(cur.whenToUse)));
    }
    apWrap.appendChild(section("code", "Solution Code — " + (cur.name || "Approach"), codeArea));

    main.appendChild(apWrap);

    // ---- Spark Internals & Performance ----
    if (p.sparkInternals) {
      var siNode = h("div", { class: "md" });
      siNode.innerHTML = md(p.sparkInternals);
      main.appendChild(section("internals", "Spark Internals & Performance", siNode));
    }

    // ---- DataFrame API ↔ Spark SQL ----
    if (p.sparkSql) {
      var sqlArea = h("div", { class: "code-area" });
      sqlArea.appendChild(h("div", { class: "code-hint solo-hint" },
        "The same result expressed against a registered temp view — interviewers often ask for either form."));
      sqlArea.appendChild(codeBlock(p.sparkSql, "", "sql"));
      main.appendChild(section("sparksql", "DataFrame API ↔ Spark SQL", sqlArea));
    }

    // ---- Recognize & Recall (merged) ----
    if (p.recognizeRecall && p.recognizeRecall.length) {
      var rr = h("ul", { class: "cue-list recall" });
      p.recognizeRecall.forEach(function (t) { rr.appendChild(h("li", { html: md(t).replace(/^<p>|<\/p>$/g, "") })); });
      main.appendChild(section("recognize-recall", "Recognize & Recall", rr));
    }

    // ---- Spaced Repetition ----
    main.appendChild(buildSrsSection(p));

    // ---- My notes ----
    var noteWrap = h("div", { class: "note-wrap" });
    var ta = h("textarea", { class: "note-area", placeholder: "Your own notes, gotchas, or an attempt outline… (saved automatically)" });
    ta.value = store.getNote(p.id);
    var saveHint = h("span", { class: "note-hint" }, "");
    var t;
    ta.addEventListener("input", function () {
      clearTimeout(t);
      t = setTimeout(function () {
        store.setNote(p.id, ta.value);
        saveHint.textContent = "Saved ✓";
        setTimeout(function () { saveHint.textContent = ""; }, 1000);
      }, 350);
    });
    noteWrap.appendChild(ta);
    noteWrap.appendChild(saveHint);
    main.appendChild(section("notes", "My Notes", noteWrap));

    // ---- prev/next nav ----
    var footer = h("div", { class: "prob-nav" });
    var idx = ALL.findIndex(function (x) { return x.id === p.id; });
    var prev = ALL[idx - 1], next = ALL[idx + 1];
    var pbtn = h("button", { class: "nav-btn" + (prev ? "" : " disabled") },
      prev ? "← " + esc(prev.title) : "← Start");
    if (prev) pbtn.addEventListener("click", function () { selectProblem(prev.id); });
    var nbtn = h("button", { class: "nav-btn" + (next ? "" : " disabled") },
      next ? esc(next.title) + " →" : "End →");
    if (next) nbtn.addEventListener("click", function () { selectProblem(next.id); });
    footer.appendChild(pbtn); footer.appendChild(nbtn);
    main.appendChild(footer);

    main.scrollTop = prevScroll;
  }

  var GRADES = [
    { key: "again", label: "Again", sub: "< 1 day", cls: "grade-again" },
    { key: "hard", label: "Hard", sub: "sooner", cls: "grade-hard" },
    { key: "good", label: "Good", sub: "on track", cls: "grade-good" },
    { key: "easy", label: "Easy", sub: "later", cls: "grade-easy" }
  ];

  function srsStatusText(p) {
    var c = store.getSrs(p.id);
    if (!c) return "New card — not yet scheduled.";
    if (store.isDue(p.id)) return "<b>Due now.</b> Grade your recall to reschedule.";
    return "Scheduled — next review <b>" + humanWhen(c.due) + "</b> (reps " + c.reps + ").";
  }

  function buildSrsSection(p) {
    var box = h("div", { class: "srs-box" });
    var status = h("div", { class: "srs-status" }); status.innerHTML = srsStatusText(p);
    var toast = h("div", { class: "srs-toast" }, "");
    var grades = h("div", { class: "srs-grades" });
    GRADES.forEach(function (g) {
      var b = h("button", { class: "grade-btn " + g.cls }, g.label + "<small>" + g.sub + "</small>");
      b.addEventListener("click", function () {
        var c = store.reviewCard(p.id, g.key);
        if (store.getStatus(p.id) === "not-started") store.setStatus(p.id, "learning");
        status.innerHTML = srsStatusText(p);
        toast.textContent = "Next review " + humanWhen(c.due) + ".";
        renderSidebar(); renderProgress();
      });
      grades.appendChild(b);
    });
    box.appendChild(status); box.appendChild(grades); box.appendChild(toast);
    return section("srs", "Spaced Repetition Review", box);
  }

  function revealOverlay(target) {
    var ov = h("button", { class: "reveal-overlay" }, "👁 Click to reveal");
    ov.addEventListener("click", function (e) {
      e.stopPropagation();
      target.classList.remove("blurred");
      ov.remove();
    });
    return ov;
  }

  // ============================================================= SELECT
  function selectProblem(id) {
    state.currentId = id;
    if (location.hash !== "#" + id) history.replaceState(null, "", "#" + id);
    renderProblem(false);
    // one-shot cross-fade on real navigation
    var main = el("main");
    main.classList.remove("nav-enter"); void main.offsetWidth; main.classList.add("nav-enter");
    renderSidebar();
    // close mobile drawer after picking
    if (matchMedia("(max-width:900px)").matches) document.body.classList.remove("sidebar-open");
  }

  // ============================================================= REVISION GRID
  function openGrid() {
    var modal = el("gridModal");
    var body = el("gridBody");
    body.innerHTML = "";
    var table = h("table", { class: "grid-table" });
    table.innerHTML = "<thead><tr><th>#</th><th>Problem</th><th>Category</th><th>Difficulty</th>" +
      "<th>Pattern</th><th>Transformation</th><th>Status</th></tr></thead>";
    var tbody = h("tbody");
    activeProblems().forEach(function (p) {
      var stt = store.getStatus(p.id);
      var tr = h("tr", { class: "grid-row" });
      tr.innerHTML =
        "<td>Q" + p.lc + "</td>" +
        '<td class="g-title">' + esc(p.title) + "</td>" +
        "<td>" + esc(p.category) + "</td>" +
        '<td class="d-' + p.difficulty.toLowerCase() + '">' + p.difficulty + "</td>" +
        "<td>" + esc((p.meta && p.meta.pattern) || "") + "</td>" +
        "<td>" + esc((p.meta && p.meta.transformation) || "") + "</td>" +
        '<td class="st st-' + stt + '">' + STATUS_GLYPH[stt] + "</td>";
      tr.addEventListener("click", function () { closeModal("gridModal"); selectProblem(p.id); });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    body.appendChild(table);
    openModal("gridModal");
  }

  // ============================================================= DASHBOARD
  function openDashboard() {
    var body = el("dashBody");
    body.innerHTML = "";
    var set = activeProblems();
    var ids = set.map(function (p) { return p.id; });
    var solved = 0, learning = 0, notStarted = 0, flagged = 0;
    set.forEach(function (p) {
      var s = store.getStatus(p.id);
      if (s === "solved") solved++; else if (s === "learning") learning++; else notStarted++;
      if (store.isReview(p.id)) flagged++;
    });
    var due = store.countDue(ids), streak = store.currentStreak();

    // stat cards
    var grid = h("div", { class: "dash-grid" });
    [["Solved", solved, ""], ["Learning", learning, "amber"], ["Not started", notStarted, ""],
     ["Day streak", streak, "accent"], ["Due now", due, "accent"], ["Flagged", flagged, "amber"]
    ].forEach(function (c) {
      var card = h("div", { class: "stat-card " + c[2] });
      card.innerHTML = '<div class="stat-num">' + c[1] + '</div><div class="stat-label">' + c[0] + "</div>";
      grid.appendChild(card);
    });
    body.appendChild(grid);

    // by difficulty
    var diffSec = h("div", { class: "dash-section" });
    diffSec.appendChild(h("h3", null, "Solved by difficulty"));
    ["Easy", "Medium", "Hard"].forEach(function (d) {
      var inD = set.filter(function (p) { return p.difficulty === d; });
      var sv = inD.filter(function (p) { return store.getStatus(p.id) === "solved"; }).length;
      if (inD.length) diffSec.appendChild(bar(d, sv, inD.length, false));
    });
    body.appendChild(diffSec);

    // by importance
    var impSec = h("div", { class: "dash-section" });
    impSec.appendChild(h("h3", null, "By importance (curated estimate)"));
    ["essential", "common", "occasional"].forEach(function (k) {
      var inK = set.filter(function (p) { return impOf(p) === k; });
      var sv = inK.filter(function (p) { return store.getStatus(p.id) === "solved"; }).length;
      if (inK.length) impSec.appendChild(bar(IMP_META[k].stars + " " + IMP_META[k].label, sv, inK.length, false));
    });
    body.appendChild(impSec);

    // weakest-first breakdown helper
    function breakdown(title, keyFn) {
      var groups = {};
      set.forEach(function (p) {
        var k = keyFn(p); if (!k) return;
        if (!groups[k]) groups[k] = { total: 0, solved: 0 };
        groups[k].total++; if (store.getStatus(p.id) === "solved") groups[k].solved++;
      });
      var rows = Object.keys(groups).map(function (k) {
        var g = groups[k]; return { k: k, total: g.total, solved: g.solved, pct: g.solved / g.total };
      }).sort(function (a, b) { return a.pct - b.pct; }); // weakest first
      if (!rows.length) return;
      var sec = h("div", { class: "dash-section" });
      sec.appendChild(h("h3", null, title));
      rows.forEach(function (r) { sec.appendChild(bar(r.k, r.solved, r.total, r.pct < 0.5)); });
      body.appendChild(sec);
    }
    breakdown("Category (weakest first)", function (p) { return p.category; });
    breakdown("Pattern (weakest first)", function (p) { return p.meta && p.meta.pattern; });

    // activity heatmap (26 weeks)
    var hmSec = h("div", { class: "dash-section" });
    hmSec.appendChild(h("h3", null, "Activity — last 26 weeks"));
    hmSec.appendChild(buildHeatmap());
    body.appendChild(hmSec);

    openModal("dashModal");
  }

  function buildHeatmap() {
    var wrap = h("div");
    var hm = h("div", { class: "heatmap" });
    var weeks = 26;
    var today = new Date(); today.setHours(0, 0, 0, 0);
    // start on the Sunday `weeks` weeks back
    var start = new Date(today.getTime() - (weeks * 7 - 1) * 86400000);
    start.setDate(start.getDate() - start.getDay());
    function level(n) { return n === 0 ? 0 : n === 1 ? 1 : n <= 3 ? 2 : n <= 6 ? 3 : 4; }
    for (var w = 0; w < weeks; w++) {
      var col = h("div", { class: "heat-col" });
      for (var d = 0; d < 7; d++) {
        var day = new Date(start.getTime() + (w * 7 + d) * 86400000);
        var n = store.activityOn(day);
        var lv = level(n);
        var cell = h("div", { class: "heat-cell" + (lv ? " heat-" + lv : ""),
          title: day.toISOString().slice(0, 10) + ": " + n + " action" + (n === 1 ? "" : "s") });
        if (day > today) cell.style.visibility = "hidden";
        col.appendChild(cell);
      }
      hm.appendChild(col);
    }
    wrap.appendChild(hm);
    var legend = h("div", { class: "heat-legend" });
    legend.innerHTML = "Less " +
      '<span class="heat-cell"></span><span class="heat-cell heat-1"></span>' +
      '<span class="heat-cell heat-2"></span><span class="heat-cell heat-3"></span>' +
      '<span class="heat-cell heat-4"></span> More';
    wrap.appendChild(legend);
    return wrap;
  }

  // ============================================================= REVIEW SESSION
  var rsQueue = [], rsIndex = 0, rsRevealed = false;
  function startReviewSession() {
    rsQueue = activeProblems().filter(function (p) { return store.isDue(p.id); });
    rsIndex = 0; rsRevealed = false;
    if (!rsQueue.length) return;
    openModal("rsModal");
    renderReviewCard();
  }
  function renderReviewCard() {
    var body = el("rsBody"); body.innerHTML = "";
    if (rsIndex >= rsQueue.length) {
      var done = h("div", { class: "rs-done" });
      done.innerHTML = '<div class="big">✓</div><h2>Session complete</h2>' +
        '<p class="muted">You reviewed ' + rsQueue.length + " card" + (rsQueue.length === 1 ? "" : "s") + ".</p>";
      var close = h("button", { class: "rs-reveal-btn" }, "Done");
      close.style.alignSelf = "center";
      close.addEventListener("click", function () { closeModal("rsModal"); renderAll(); });
      done.appendChild(close); body.appendChild(done);
      return;
    }
    var p = rsQueue[rsIndex];
    var ai = (p.approaches || []).length - 1;
    var cur = (p.approaches || [])[ai] || {};

    var prog = h("div", { class: "rs-progress" });
    prog.innerHTML = '<div class="rs-progress-fill" style="width:' + Math.round((rsIndex / rsQueue.length) * 100) + '%"></div>';
    body.appendChild(prog);
    body.appendChild(h("div", { class: "rs-count" }, "Card " + (rsIndex + 1) + " of " + rsQueue.length));
    body.appendChild(h("div", { class: "rs-q-title" }, esc(p.title)));
    body.appendChild(h("div", { class: "rs-q-meta" }, "Recall the pattern & approach, then reveal."));

    if (!rsRevealed) {
      var rev = h("button", { class: "rs-reveal-btn" }, "Reveal answer");
      rev.addEventListener("click", function () { rsRevealed = true; renderReviewCard(); });
      body.appendChild(rev);
    } else {
      var ans = h("div", { class: "rs-answer" });
      var mdNode = h("div", { class: "md" });
      mdNode.innerHTML = "<p><strong>Pattern:</strong> " + esc((p.meta && p.meta.pattern) || "—") +
        " &nbsp;·&nbsp; <strong>Transformation:</strong> " + esc((p.meta && p.meta.transformation) || "—") + "</p>";
      ans.appendChild(mdNode);
      ans.appendChild(codeBlock(cur.plain || "", "", "python"));
      body.appendChild(ans);
      var grades = h("div", { class: "srs-grades" });
      GRADES.forEach(function (g) {
        var b = h("button", { class: "grade-btn " + g.cls }, g.label + "<small>" + g.sub + "</small>");
        b.addEventListener("click", function () {
          store.reviewCard(p.id, g.key);
          if (store.getStatus(p.id) === "not-started") store.setStatus(p.id, "learning");
          rsIndex++; rsRevealed = false; renderReviewCard();
        });
        grades.appendChild(b);
      });
      body.appendChild(grades);
    }
  }

  // ============================================================= CONTROLS
  function applySetFilter(value) {
    state.setFilter = value;
    store.setPref("setFilter", value);
    // reflect on the segmented control
    var btns = document.querySelectorAll("#setToggle .set-btn");
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle("active", btns[i].getAttribute("data-set") === value);
    }
    // if the current problem falls outside the new set, jump to the first in-set one
    var cur = byId[state.currentId];
    if (cur && !inActiveSet(cur)) {
      var first = activeProblems()[0];
      if (first) { state.currentId = first.id; store.setPref("lastProblem", first.id); }
    }
    renderAll();
    var nav = el("nav");
    if (nav) { nav.classList.remove("sidebar-fade"); void nav.offsetWidth; nav.classList.add("sidebar-fade"); }
  }

  function wireControls() {
    var search = el("search");
    search.addEventListener("input", function () {
      state.query = search.value;
      renderSidebar();
    });

    // set toggle: All 150 vs Blind 75
    var setToggle = el("setToggle");
    if (setToggle) {
      var sbtns = setToggle.querySelectorAll(".set-btn");
      for (var si = 0; si < sbtns.length; si++) {
        sbtns[si].addEventListener("click", function (e) {
          applySetFilter(e.currentTarget.getAttribute("data-set"));
        });
      }
    }

    el("filterStatus").addEventListener("change", function (e) { state.filterStatus = e.target.value; renderSidebar(); renderProgress(); });

    var pf = el("filterPattern");
    allPatterns().forEach(function (pat) {
      pf.appendChild(h("option", { value: pat, "data-base": pat }, pat));
    });
    pf.addEventListener("change", function (e) { state.filterPattern = e.target.value; renderSidebar(); renderProgress(); });

    var fi = el("filterImportance");
    if (fi) fi.addEventListener("change", function (e) { state.filterImportance = e.target.value; renderSidebar(); renderProgress(); });

    // expand / collapse all categories
    function setAllCollapsed(collapsed) {
      B.byCategory().forEach(function (g) { store.setCatCollapsed(g.category, collapsed); });
      renderSidebar();
    }
    var expandAllBtn = el("expandAll");
    if (expandAllBtn) expandAllBtn.addEventListener("click", function () { setAllCollapsed(false); });
    var collapseAllBtn = el("collapseAll");
    if (collapseAllBtn) collapseAllBtn.addEventListener("click", function () { setAllCollapsed(true); });

    el("clearFilters").addEventListener("click", function () {
      state.query = ""; state.filterStatus = "all"; state.filterPattern = "all"; state.filterImportance = "all";
      search.value = ""; el("filterStatus").value = "all"; pf.value = "all";
      if (fi) fi.value = "all";
      renderSidebar(); renderProgress();
    });

    // filters drawer toggle (⚙)
    var filterToggle = el("filterToggle");
    var filtersDrawer = el("filtersDrawer");
    if (filterToggle && filtersDrawer) {
      if (store.getPref("filtersOpen")) { filtersDrawer.classList.add("open"); filterToggle.classList.add("on"); }
      filterToggle.addEventListener("click", function () {
        var open = !filtersDrawer.classList.contains("open");
        filtersDrawer.classList.toggle("open", open);
        filterToggle.classList.toggle("on", open);
        store.setPref("filtersOpen", open);
      });
    }

    // dashboard
    var dashBtn = el("dashBtn");
    if (dashBtn) dashBtn.addEventListener("click", openDashboard);
    el("dashClose").addEventListener("click", function () { closeModal("dashModal"); });
    el("dashModal").addEventListener("click", function (e) { if (e.target === el("dashModal")) closeModal("dashModal"); });

    // review session
    var reviewDue = el("reviewDue");
    if (reviewDue) reviewDue.addEventListener("click", startReviewSession);
    el("rsClose").addEventListener("click", function () { closeModal("rsModal"); renderAll(); });
    el("rsModal").addEventListener("click", function (e) { if (e.target === el("rsModal")) { closeModal("rsModal"); renderAll(); } });

    // theme
    var themeBtn = el("themeBtn");
    applyTheme(store.getPref("theme"));
    themeBtn.addEventListener("click", function () {
      var next = store.getPref("theme") === "dark" ? "light" : "dark";
      store.setPref("theme", next);
      applyTheme(next);
    });

    // grid
    el("gridBtn").addEventListener("click", openGrid);
    el("gridClose").addEventListener("click", function () { closeModal("gridModal"); });
    el("gridModal").addEventListener("click", function (e) { if (e.target === el("gridModal")) closeModal("gridModal"); });

    // export / import / reset
    el("exportBtn").addEventListener("click", function () {
      var blob = new Blob([store.exportJSON()], { type: "application/json" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url; a.download = "pyspark-progress.json";
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
    el("importBtn").addEventListener("click", function () { el("importFile").click(); });
    el("importFile").addEventListener("change", function (e) {
      var file = e.target.files[0]; if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try { store.importJSON(reader.result); renderAll(); alert("Progress imported."); }
        catch (err) { alert("Could not import: " + err.message); }
      };
      reader.readAsText(file);
      e.target.value = "";
    });
    el("resetBtn").addEventListener("click", function () {
      if (confirm("Reset ALL progress, notes, and review flags? This cannot be undone.")) {
        store.reset(); renderAll();
      }
    });

    // sidebar toggle: off-canvas drawer on mobile, collapse-to-full-width on desktop
    el("menuBtn").addEventListener("click", function () {
      if (matchMedia("(max-width:900px)").matches) {
        document.body.classList.toggle("sidebar-open");
      } else {
        var c = !document.body.classList.contains("sidebar-collapsed");
        document.body.classList.toggle("sidebar-collapsed", c);
        store.setPref("sidebarCollapsed", c);
      }
    });

    // keyboard nav
    document.addEventListener("keydown", function (e) {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") {
        if (e.key === "Escape") e.target.blur();
        return;
      }
      if (e.key === "/") { e.preventDefault(); search.focus(); return; }
      if (e.key === "Escape") { var open = anyModalOpen(); if (open) closeModal(open); return; }
      var idx = ALL.findIndex(function (x) { return x.id === state.currentId; });
      if (e.key === "j" || e.key === "ArrowDown") { if (ALL[idx + 1]) { e.preventDefault(); selectProblem(ALL[idx + 1].id); } }
      if (e.key === "k" || e.key === "ArrowUp") { if (ALL[idx - 1]) { e.preventDefault(); selectProblem(ALL[idx - 1].id); } }
      if (e.key === "r") { store.setPref("codeMode", "rcs"); renderProblem(); }
      if (e.key === "p") { store.setPref("codeMode", "plain"); renderProblem(); }
      if (e.key === "b") { store.setPref("blur", !store.getPref("blur")); renderProblem(); }
      if (e.key === "1") { setStatusShortcut("not-started"); }
      if (e.key === "2") { setStatusShortcut("learning"); }
      if (e.key === "3") { setStatusShortcut("solved"); }
    });
  }

  function setStatusShortcut(s) {
    store.setStatus(state.currentId, s);
    renderProblem(); renderSidebar(); renderProgress();
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    el("themeBtn").textContent = theme === "dark" ? "☀ Light" : "☾ Dark";
  }

  // ============================================================= BOOT
  function renderAll() {
    renderSidebar(); renderProblem(); renderProgress();
  }

  function boot() {
    // deep-link via hash
    if (location.hash) {
      var id = location.hash.slice(1);
      if (byId[id]) state.currentId = id;
    }
    // reflect the persisted set filter on the segmented control
    var sbtns = document.querySelectorAll("#setToggle .set-btn");
    for (var i = 0; i < sbtns.length; i++) {
      sbtns[i].classList.toggle("active", sbtns[i].getAttribute("data-set") === state.setFilter);
    }
    // ensure the current problem is inside the active set
    var cur = byId[state.currentId];
    if (cur && !inActiveSet(cur)) {
      var first = activeProblems()[0];
      if (first) state.currentId = first.id;
    }
    // restore desktop sidebar-collapsed state
    if (store.getPref("sidebarCollapsed") && !matchMedia("(max-width:900px)").matches) {
      document.body.classList.add("sidebar-collapsed");
    }
    wireControls();
    renderAll();

    window.addEventListener("hashchange", function () {
      var id = location.hash.slice(1);
      if (byId[id] && id !== state.currentId) selectProblem(id);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
