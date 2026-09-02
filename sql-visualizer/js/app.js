/*
 * app.js — the Blind 75 study application.
 * Renders the sidebar, the problem reading pane, search, filters, progress,
 * code toggles (approach + RCS/plain), blur-to-recall, notes, review queue,
 * export/import, the all-75 revision grid, and keyboard navigation.
 */
(function () {
  var B = window.SQLLAB;
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
      { name: "meta.sqlConcept", weight: 0.15 },
      { name: "meta.technique", weight: 0.15 },
      { name: "topics", weight: 0.15 },
      { name: "domains", weight: 0.1 },
      { name: "platform", weight: 0.1 },
      { name: "difficulty", weight: 0.1 },
      { name: "number", weight: 0.1 }
    ]
  });

  // ---- app state ----
  var state = {
    currentId: store.getPref("lastProblem") || (ALL[0] && ALL[0].id),
    query: "",
    filterDifficulty: "all",
    filterStatus: "all",
    filterPattern: "all",
    filterPlatform: "all",
    filterImportance: "all",
    approachIndex: {}   // problemId -> selected approach index
  };

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

  // ---- interview importance (curated estimate) ----
  var IMPORTANCE = B.IMPORTANCE || {};
  var IMP_META = {
    essential:   { label: "Essential",  stars: "★★★", cls: "imp-essential" },
    common:      { label: "Common",     stars: "★★",  cls: "imp-common" },
    occasional:  { label: "Occasional", stars: "★",   cls: "imp-occasional" }
  };
  function impOf(p) { return IMPORTANCE[p.id] || "common"; }

  // ---- humanized due date ----
  function humanWhen(dueMs) {
    var now = Date.now();
    if (dueMs <= now) return "today";
    var days = Math.round((dueMs - now) / 86400000);
    if (days <= 0) return "today";
    if (days === 1) return "tomorrow";
    if (days < 14) return "in " + days + " days";
    if (days < 60) return "in " + Math.round(days / 7) + " weeks";
    return "in " + Math.round(days / 30) + " months";
  }

  // ---- modal open/close with exit animation (200ms == --dur) ----
  function openModal(id) {
    var m = el(id); if (!m) return;
    m.classList.remove("hidden"); void m.offsetWidth; m.classList.add("open");
  }
  function closeModal(id) {
    var m = el(id); if (!m || m.classList.contains("hidden")) return;
    m.classList.remove("open");
    setTimeout(function () { m.classList.add("hidden"); }, 200);
  }

  // ---- generic labeled progress bar row (reused by dashboard breakdowns) ----
  function bar(label, value, total, cls) {
    var pct = total ? Math.round((value / total) * 100) : 0;
    var row = h("div", { class: "bar-row" + (pct < 50 ? " bar-weak" : "") + (cls ? " " + cls : "") });
    row.innerHTML =
      '<div class="bar-label">' + esc(label) + '<span class="bar-num">' + value + "/" + total + "</span></div>" +
      '<div class="bar-track"><div class="bar-fill" style="width:' + pct + '%"></div></div>';
    return row;
  }

  // the active study universe (all problems — SQL tool has no subset filter)
  function activeProblems() { return ALL; }

  // Distinct patterns for the filter dropdown.
  function allPatterns() {
    var set = {};
    ALL.forEach(function (p) { if (p.meta && p.meta.pattern) set[p.meta.pattern] = true; });
    return Object.keys(set).sort();
  }
  function allPlatforms() {
    var set = {};
    ALL.forEach(function (p) { if (p.platform) set[p.platform] = true; });
    return Object.keys(set).sort();
  }

  // Which problems pass the current filters/search? Returns a Set of ids.
  function visibleIds() {
    var base = ALL;
    if (state.query.trim()) {
      base = fuse.search(state.query.trim()).map(function (r) { return r.item; });
    }
    var ids = {};
    base.forEach(function (p) {
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
      if (state.filterPlatform !== "all" && p.platform !== state.filterPlatform) return;
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
      var solvedInCat = g.problems.filter(function (p) { return store.getStatus(p.id) === "solved"; }).length;

      var header = h("button", { class: "cat-header", "data-cat": g.category });
      header.innerHTML =
        '<span class="cat-caret">' + (collapsed ? "▸" : "▾") + "</span>" +
        '<span class="cat-icon">' + (B.CATEGORY_ICON[g.category] || "•") + "</span>" +
        '<span class="cat-name">' + esc(g.category) + "</span>" +
        '<span class="cat-count">' + solvedInCat + "/" + g.problems.length + "</span>";
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
        var imp = impOf(p);
        item.innerHTML =
          '<span class="st st-' + st + '">' + STATUS_GLYPH[st] + "</span>" +
          '<span class="ni-dot ' + IMP_META[imp].cls + '" title="' + IMP_META[imp].label + '"></span>' +
          '<span class="ni-title">' + esc(p.title) + "</span>" +
          (store.isDue(p.id) ? '<span class="ni-due" title="Due for review">⏱</span>' : "") +
          (store.isReview(p.id) ? '<span class="ni-review" title="Flagged for review">★</span>' : "") +
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
    var solved = store.countSolved();
    var learning = store.countLearning();
    var total = ALL.length;
    var pct = total ? Math.round((solved / total) * 100) : 0;
    el("progressText").textContent = solved + " / " + total + " solved";
    el("progressSub").textContent = learning + " learning";
    el("progressFill").style.width = pct + "%";

    var streak = store.currentStreak();
    var stEl = el("streakText");
    if (stEl) stEl.textContent = streak + "-day streak" + (streak >= 3 ? " 🔥" : "");

    // review chip: hide when nothing due
    var due = store.countDue(ALL.map(function (p) { return p.id; }));
    var chip = el("reviewChip");
    if (chip) {
      chip.textContent = "Review " + due + " due";
      chip.disabled = due === 0;
    }

    updateFilterCounts();
    updateFilterDot();
  }

  function anyFilterActive() {
    return state.filterDifficulty !== "all" || state.filterStatus !== "all" ||
      state.filterPattern !== "all" || state.filterPlatform !== "all" ||
      state.filterImportance !== "all";
  }
  function updateFilterDot() {
    var t = el("filterToggle");
    if (t) t.classList.toggle("has-active", anyFilterActive());
  }

  // per-option counts over the active universe (not cross-filtered)
  var FILTER_BASE = {}; // selectId -> { value -> baseLabel }
  function rememberBaseLabels() {
    ["filterDifficulty", "filterStatus", "filterImportance", "filterPattern", "filterPlatform"].forEach(function (sid) {
      var sel = el(sid); if (!sel) return;
      var m = {};
      Array.prototype.forEach.call(sel.options, function (o) { m[o.value] = o.textContent.replace(/\s*\(\d+\)\s*$/, ""); });
      FILTER_BASE[sid] = m;
    });
  }
  function updateFilterCounts() {
    var uni = activeProblems();
    var diff = { Easy: 0, Medium: 0, Hard: 0 };
    var stat = { "not-started": 0, learning: 0, solved: 0, review: 0, due: 0 };
    var imp = { essential: 0, common: 0, occasional: 0 };
    var pat = {}, plat = {};
    uni.forEach(function (p) {
      if (diff[p.difficulty] != null) diff[p.difficulty]++;
      var s = store.getStatus(p.id); if (stat[s] != null) stat[s]++;
      if (store.isReview(p.id)) stat.review++;
      if (store.isDue(p.id)) stat.due++;
      imp[impOf(p)]++;
      if (p.meta && p.meta.pattern) pat[p.meta.pattern] = (pat[p.meta.pattern] || 0) + 1;
      if (p.platform) plat[p.platform] = (plat[p.platform] || 0) + 1;
    });
    var counts = {
      filterDifficulty: { all: uni.length, Easy: diff.Easy, Medium: diff.Medium, Hard: diff.Hard },
      filterStatus: { all: uni.length, "not-started": stat["not-started"], learning: stat.learning, solved: stat.solved, review: stat.review, due: stat.due },
      filterImportance: { all: uni.length, essential: imp.essential, common: imp.common, occasional: imp.occasional },
      filterPattern: Object.assign({ all: uni.length }, pat),
      filterPlatform: Object.assign({ all: uni.length }, plat)
    };
    Object.keys(counts).forEach(function (sid) {
      var sel = el(sid), base = FILTER_BASE[sid]; if (!sel || !base) return;
      Array.prototype.forEach.call(sel.options, function (o) {
        var n = counts[sid][o.value];
        o.textContent = base[o.value] + (n != null ? " (" + n + ")" : "");
      });
    });
  }

  // ============================================================= CODE BLOCK
  function codeBlock(source, extraClass, copyLabel) {
    var wrap = h("div", { class: "code-wrap " + (extraClass || "") });
    var bar = h("div", { class: "code-bar" });
    var copy = h("button", { class: "copy-btn" }, copyLabel || "Copy");
    copy.addEventListener("click", function () {
      var text = source;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(flash, function () { fallbackCopy(text); flash(); });
      } else { fallbackCopy(text); flash(); }
      function flash() { copy.textContent = "Copied!"; setTimeout(function () { copy.textContent = copyLabel || "Copy"; }, 1200); }
    });
    bar.appendChild(h("span", { class: "code-lang" }, "SQL"));
    bar.appendChild(copy);
    var pre = h("pre", { class: "code-pre" });
    var code = h("code", { class: "language-sql" }, esc(source));
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

  // ============================================================= APPROACH AREA
  // Approach switcher + Complete Logic + SQL Solution, rendered as one block
  // so it can sit directly beneath the Brief Description.
  function buildApproachArea(p) {
    var approaches = p.approaches || [];
    if (state.approachIndex[p.id] == null) state.approachIndex[p.id] = 0; // default: recommended (first)
    var ai = state.approachIndex[p.id];
    if (ai >= approaches.length) ai = 0;

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
    apWrap.appendChild(section("logic", "Complete Logic — " + (cur.name || "Approach"), logicNode));

    // Code (RCS commented / Clean toggle)
    var codeMode = store.getPref("codeMode") || "rcs";
    var codeArea = h("div", { class: "code-area" });
    var toggle = h("div", { class: "code-toggle" });
    var rcsBtn = h("button", { class: "ct-btn" + (codeMode === "rcs" ? " active" : "") }, "RCS (commented)");
    var plainBtn = h("button", { class: "ct-btn" + (codeMode === "plain" ? " active" : "") }, "Clean SQL");
    rcsBtn.addEventListener("click", function () { store.setPref("codeMode", "rcs"); renderProblem(); });
    plainBtn.addEventListener("click", function () { store.setPref("codeMode", "plain"); renderProblem(); });
    toggle.appendChild(rcsBtn); toggle.appendChild(plainBtn);
    var hint = h("span", { class: "code-hint" }, codeMode === "rcs" ? "Commented for revision" : "Clean — try to read it yourself");
    toggle.appendChild(hint);
    codeArea.appendChild(toggle);

    var source = codeMode === "rcs" ? cur.tsql : cur.clean;
    var cb = codeBlock(source || "", blur ? "blurred" : "");
    if (blur) cb.appendChild(revealOverlay(cb));
    codeArea.appendChild(cb);

    if (cur.perfNote) {
      codeArea.appendChild(h("div", { class: "when-use" }, "<strong>Performance:</strong> " + esc(cur.perfNote)));
    }
    if (cur.dialectNote) {
      codeArea.appendChild(h("div", { class: "when-use dialect" }, "<strong>Dialect note:</strong> " + esc(cur.dialectNote)));
    }
    apWrap.appendChild(section("code", "SQL Solution — " + (cur.name || "Approach"), codeArea));

    return apWrap;
  }

  // ============================================================= SECTION
  function section(key, title, bodyNode, opts) {
    opts = opts || {};
    var sec = h("section", { class: "prob-section", "data-key": key });
    var head = h("button", { class: "sec-head" });
    head.innerHTML = '<span class="sec-caret">▾</span><span class="sec-title">' + esc(title) + "</span>" +
      (opts.badge ? '<span class="sec-badge">' + esc(opts.badge) + "</span>" : "");
    // grid-rows collapse animation (height-agnostic): outer grid wrapper
    var outer = h("div", { class: "sec-body-outer" });
    var body = h("div", { class: "sec-body" });
    body.appendChild(bodyNode);
    outer.appendChild(body);
    head.addEventListener("click", function () {
      sec.classList.toggle("collapsed");   // caret rotates via CSS
    });
    sec.appendChild(head);
    sec.appendChild(outer);
    return sec;
  }

  // ============================================================= SQL TABLES
  // Render a result set / sample table as an .sql-table inside a scroller.
  function sqlTable(columns, rows, caption) {
    var wrap = h("div", { class: "sql-table-wrap" });
    if (caption) wrap.appendChild(h("div", { class: "sql-table-cap" }, esc(caption)));
    var scroller = h("div", { class: "sql-table-scroll" });
    var tbl = h("table", { class: "sql-table" });
    var thead = "<thead><tr>";
    (columns || []).forEach(function (c) { thead += "<th>" + esc(c) + "</th>"; });
    thead += "</tr></thead>";
    var tb = "<tbody>";
    (rows || []).forEach(function (r) {
      tb += "<tr>";
      r.forEach(function (cell) {
        var isNull = cell === null || cell === undefined;
        tb += '<td' + (isNull ? ' class="sql-null"' : "") + ">" +
          (isNull ? "NULL" : esc(cell)) + "</td>";
      });
      tb += "</tr>";
    });
    tb += "</tbody>";
    tbl.innerHTML = thead + tb;
    scroller.appendChild(tbl);
    wrap.appendChild(scroller);
    return wrap;
  }

  // Render a schema definition (columns + types + notes) as a table.
  function schemaTable(t) {
    var cols = ["Column", "Type", "Notes"];
    var rows = (t.columns || []).map(function (c) {
      return [c.name, c.type || "", c.note || ""];
    });
    return sqlTable(cols, rows, t.name);
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
        '<span class="ph-lc">' + esc(p.number || "") + "</span>" +
        '<span class="ph-diff d-' + p.difficulty.toLowerCase() + '">' + p.difficulty + "</span>" +
        '<span class="ph-imp ' + IMP_META[impOf(p)].cls + '" title="Interview importance (curated estimate)">' +
          IMP_META[impOf(p)].stars + " " + IMP_META[impOf(p)].label + "</span>" +
        '<span class="ph-cat">' + esc(p.category) + "</span>" +
        '<a class="ph-link" href="' + p.link + '" target="_blank" rel="noopener">' + esc(p.platform || "Source") + " ↗</a>" +
      "</div>" +
      '<h1 class="ph-title">' + esc(p.title) + "</h1>";

    // ---- "Next problem" button in the header's free top-row space ----
    // (same target as the prev/next footer at the bottom of each problem)
    var hIdx = ALL.findIndex(function (x) { return x.id === p.id; });
    var hNext = ALL[hIdx + 1];
    var topRow = header.querySelector(".ph-top");
    var srcLink = topRow ? topRow.querySelector(".ph-link") : null;
    if (topRow) {
      var nextTop = h("button",
        { class: "ph-next" + (hNext ? "" : " disabled"),
          title: hNext ? "Go to next problem: " + hNext.title : "You're at the last problem" },
        (hNext ? "Next problem →" : "End →"));
      if (hNext) nextTop.addEventListener("click", function () { selectProblem(hNext.id); });
      // sit in the free space, before the source link (which stays far right)
      if (srcLink) topRow.insertBefore(nextTop, srcLink);
      else topRow.appendChild(nextTop);
    }

    // status + actions row
    var actions = h("div", { class: "ph-actions" });
    var statusSel = h("div", { class: "status-group" });
    ["not-started", "learning", "solved"].forEach(function (s) {
      var b = h("button", { class: "status-btn st-" + s + (st === s ? " sel" : ""), "data-s": s },
        STATUS_GLYPH[s] + " " + STATUS_LABEL[s]);
      b.addEventListener("click", function () {
        store.setStatus(p.id, s);
        // update selection in place (avoids a full re-render on a frequent action)
        Array.prototype.forEach.call(statusSel.children, function (btn) {
          btn.classList.toggle("sel", btn.getAttribute("data-s") === s);
        });
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
      ["SQL Concept", m.sqlConcept],
      ["Technique", m.technique],
      ["Difficulty", p.difficulty],
      ["Platform", p.platform],
      ["Domain", (p.domains || []).join(", ")]
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

    // ---- Brief Description ----
    var descNode = h("div", { class: "md" });
    descNode.innerHTML = md(p.descriptionBrief || p.description || "");
    main.appendChild(section("description", "Brief Description", descNode));

    // ---- Approach switcher + Logic + SQL Solution (moved directly under the brief) ----
    main.appendChild(buildApproachArea(p));

    // ---- Schema & Sample Data (tables) ----
    if ((p.schema && p.schema.length) || (p.sampleData && p.sampleData.length)) {
      var sdWrap = h("div", { class: "sql-block" });
      if (p.schema && p.schema.length) {
        sdWrap.appendChild(h("div", { class: "subhead" }, "Table schema"));
        p.schema.forEach(function (t) { sdWrap.appendChild(schemaTable(t)); });
      }
      if (p.sampleData && p.sampleData.length) {
        sdWrap.appendChild(h("div", { class: "subhead" }, "Sample data"));
        p.sampleData.forEach(function (t) {
          sdWrap.appendChild(sqlTable(t.columns, t.rows, t.table));
        });
      }
      main.appendChild(section("schema", "Schema & Sample Data", sdWrap,
        { badge: (p.schema || []).length + " table" + ((p.schema || []).length === 1 ? "" : "s") }));
    }

    // ---- Expected Output (table) ----
    if (p.expectedOutput && p.expectedOutput.columns) {
      var eo = h("div", { class: "sql-block" });
      eo.appendChild(sqlTable(p.expectedOutput.columns, p.expectedOutput.rows, null));
      main.appendChild(section("expected", "Expected Output", eo,
        { badge: (p.expectedOutput.rows || []).length + " row" +
          ((p.expectedOutput.rows || []).length === 1 ? "" : "s") }));
    }

    // ---- Setup Script (copy into SSMS) ----
    if (p.setupSql) {
      var setupArea = h("div", { class: "code-area" });
      var setupCb = codeBlock(p.setupSql, "", "Copy setup for SSMS");
      setupArea.appendChild(setupCb);
      main.appendChild(section("setup", "Setup Script (paste into SSMS)", setupArea));
    }

    // ---- Walkthrough (intermediate result sets as tables) ----
    if (p.walkthrough && p.walkthrough.length) {
      var wt = h("div", { class: "sql-block walkthrough" });
      p.walkthrough.forEach(function (w, i) {
        var card = h("div", { class: "wt-step" });
        card.appendChild(h("div", { class: "wt-head" }, "Step " + (i + 1) + " — " + esc(w.step || "")));
        if (w.note) { var n = h("div", { class: "wt-note md" }); n.innerHTML = md(w.note); card.appendChild(n); }
        if (w.table && w.table.columns) card.appendChild(sqlTable(w.table.columns, w.table.rows, null));
        wt.appendChild(card);
      });
      main.appendChild(section("walkthrough", "Walkthrough", wt, { badge: p.walkthrough.length + " step" + (p.walkthrough.length === 1 ? "" : "s") }));
    }

    // ---- Common mistakes ----
    if (p.commonMistakes && p.commonMistakes.length) {
      var cm = h("ul", { class: "cue-list mistakes" });
      p.commonMistakes.forEach(function (t) { cm.appendChild(h("li", { html: md(t).replace(/^<p>|<\/p>$/g, "") })); });
      main.appendChild(section("mistakes", "Common Mistakes", cm));
    }

    // ---- Pattern recognition ----
    if (p.patternRecognition && p.patternRecognition.length) {
      var pr = h("ul", { class: "cue-list" });
      p.patternRecognition.forEach(function (t) { pr.appendChild(h("li", { html: md(t).replace(/^<p>|<\/p>$/g, "") })); });
      main.appendChild(section("recognize", "How to Recognize This Problem", pr));
    }

    // ---- Interview recall ----
    if (p.interviewRecall && p.interviewRecall.length) {
      var ir = h("ul", { class: "cue-list recall" });
      p.interviewRecall.forEach(function (t) { ir.appendChild(h("li", { html: md(t).replace(/^<p>|<\/p>$/g, "") })); });
      main.appendChild(section("recall", "Interview Recall", ir));
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

  function buildLinksSection(p) {
    var linksWrap = h("div", { class: "links-wrap" });
    linksWrap.appendChild(h("div", { class: "links-hint" },
      "Paste up to two links to external animations/visualizations of this problem (e.g. VisuAlgo, YouTube, a blog). Saved to this browser; click Open to launch in a new tab."));
    var savedLinks = store.getLinks(p.id);
    for (var li = 0; li < 2; li++) {
      (function (idx) {
        var row = h("div", { class: "link-row" });
        var nameIn = h("input", { class: "link-name", type: "text", placeholder: "Label (optional)" });
        var urlIn = h("input", { class: "link-url", type: "url", placeholder: "https://…  animation link" });
        var open = h("a", { class: "link-open", target: "_blank", rel: "noopener" }, "Open ↗");
        var cur = savedLinks[idx] || { name: "", url: "" };
        nameIn.value = cur.name || "";
        urlIn.value = cur.url || "";

        function normalize(u) {
          u = u.trim();
          if (!u) return "";
          if (!/^https?:\/\//i.test(u)) u = "https://" + u;
          return u;
        }
        function refresh() {
          var u = normalize(urlIn.value);
          if (u) { open.href = u; open.classList.add("active"); open.title = u; }
          else { open.removeAttribute("href"); open.classList.remove("active"); open.removeAttribute("title"); }
        }
        refresh();

        var lt;
        function save() {
          clearTimeout(lt);
          lt = setTimeout(function () {
            var arr = store.getLinks(p.id);
            arr[idx] = { name: nameIn.value.trim(), url: normalize(urlIn.value) };
            store.setLinks(p.id, arr);
          }, 300);
        }
        nameIn.addEventListener("input", save);
        urlIn.addEventListener("input", function () { refresh(); save(); });
        open.addEventListener("click", function (e) { if (!open.getAttribute("href")) e.preventDefault(); });

        row.appendChild(nameIn);
        row.appendChild(urlIn);
        row.appendChild(open);
        linksWrap.appendChild(row);
      })(li);
    }
    return section("links", "Animation / Visualization Links", linksWrap);
  }

  // ============================================================= SRS SECTION
  var GRADES = [
    { key: "again", label: "Again", cls: "g-again" },
    { key: "hard", label: "Hard", cls: "g-hard" },
    { key: "good", label: "Good", cls: "g-good" },
    { key: "easy", label: "Easy", cls: "g-easy" }
  ];
  function srsStatusLine(p) {
    var c = store.getSrs(p.id);
    if (!c) return "New — not yet scheduled.";
    if (store.isDue(p.id)) return "Due now · " + c.reps + " reviews so far.";
    return "Next review " + humanWhen(c.due) + " · " + c.reps + " reviews · ease " + c.ease.toFixed(2) + ".";
  }
  function buildSrsSection(p) {
    var wrap = h("div", { class: "srs-wrap" });
    var line = h("div", { class: "srs-status" }, srsStatusLine(p));
    wrap.appendChild(line);
    var row = h("div", { class: "srs-grades" });
    GRADES.forEach(function (g) {
      var b = h("button", { class: "srs-btn " + g.cls }, g.label);
      b.addEventListener("click", function () {
        var c = store.reviewCard(p.id, g.key);
        if (store.getStatus(p.id) === "not-started") store.setStatus(p.id, "learning");
        line.textContent = srsStatusLine(p);
        toast("Scheduled — next review " + humanWhen(c.due));
        renderSidebar(); renderProgress();
      });
      row.appendChild(b);
    });
    wrap.appendChild(row);
    return section("srs", "Spaced Repetition Review", wrap);
  }

  // ============================================================= TOAST
  function toast(msg) {
    var t = el("toast");
    if (!t) { t = h("div", { id: "toast", class: "toast" }); document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.classList.remove("show"); }, 1800);
  }

  // ============================================================= DASHBOARD
  function openDashboard() {
    var body = el("dashBody");
    body.innerHTML = "";
    var ids = ALL.map(function (p) { return p.id; });
    var solved = store.countSolved(), learning = store.countLearning();
    var notStarted = ALL.length - solved - learning;
    var due = store.countDue(ids);
    var flagged = ALL.filter(function (p) { return store.isReview(p.id); }).length;
    var streak = store.currentStreak();

    // headline stat cards
    var cards = h("div", { class: "stat-cards" });
    [["Solved", solved], ["Learning", learning], ["Not started", notStarted],
     ["Day streak", streak], ["Due now", due], ["Flagged", flagged]].forEach(function (c) {
      cards.appendChild(h("div", { class: "stat-card" },
        '<div class="stat-num">' + c[1] + '</div><div class="stat-lbl">' + c[0] + "</div>"));
    });
    body.appendChild(cards);

    // solved by difficulty
    var diffWrap = h("div", { class: "dash-block" });
    diffWrap.appendChild(h("div", { class: "dash-h" }, "Solved by difficulty"));
    ["Easy", "Medium", "Hard"].forEach(function (d) {
      var tot = ALL.filter(function (p) { return p.difficulty === d; });
      var sv = tot.filter(function (p) { return store.getStatus(p.id) === "solved"; }).length;
      diffWrap.appendChild(bar(d, sv, tot.length, "d-" + d.toLowerCase()));
    });
    body.appendChild(diffWrap);

    // by importance
    var impWrap = h("div", { class: "dash-block" });
    impWrap.appendChild(h("div", { class: "dash-h" }, "Solved by importance"));
    ["essential", "common", "occasional"].forEach(function (t) {
      var tot = ALL.filter(function (p) { return impOf(p) === t; });
      var sv = tot.filter(function (p) { return store.getStatus(p.id) === "solved"; }).length;
      impWrap.appendChild(bar(IMP_META[t].stars + " " + IMP_META[t].label, sv, tot.length, IMP_META[t].cls));
    });
    body.appendChild(impWrap);

    // category breakdown, weakest first
    body.appendChild(breakdownBlock("By topic (weakest first)", function (p) { return [p.category]; }));
    // pattern breakdown, weakest first
    body.appendChild(breakdownBlock("By pattern (weakest first)", function (p) {
      return [(p.meta && p.meta.pattern) || "—"];
    }));

    // activity heatmap
    body.appendChild(buildHeatmap());

    openModal("dashModal");
  }

  function breakdownBlock(title, keyFn) {
    var wrap = h("div", { class: "dash-block" });
    wrap.appendChild(h("div", { class: "dash-h" }, title));
    var tot = {}, sv = {};
    ALL.forEach(function (p) {
      keyFn(p).forEach(function (k) {
        tot[k] = (tot[k] || 0) + 1;
        if (store.getStatus(p.id) === "solved") sv[k] = (sv[k] || 0) + 1;
      });
    });
    Object.keys(tot).map(function (k) {
      return { k: k, pct: tot[k] ? (sv[k] || 0) / tot[k] : 0 };
    }).sort(function (a, b) { return a.pct - b.pct; }).forEach(function (r) {
      wrap.appendChild(bar(r.k, sv[r.k] || 0, tot[r.k]));
    });
    return wrap;
  }

  function buildHeatmap() {
    var wrap = h("div", { class: "dash-block" });
    wrap.appendChild(h("div", { class: "dash-h" }, "Activity — last 26 weeks"));
    var act = store.getActivity();
    var grid = h("div", { class: "heatmap" });
    var today = new Date(); today.setHours(0, 0, 0, 0);
    // align to the start of the week grid: 26 weeks * 7 days back
    var start = new Date(today.getTime() - 25 * 7 * 86400000);
    start.setTime(start.getTime() - start.getDay() * 86400000); // back to Sunday
    for (var w = 0; w < 26; w++) {
      var col = h("div", { class: "hm-col" });
      for (var d = 0; d < 7; d++) {
        var dt = new Date(start.getTime() + (w * 7 + d) * 86400000);
        var key = dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0") + "-" + String(dt.getDate()).padStart(2, "0");
        var n = act[key] || 0;
        var lvl = n === 0 ? 0 : n < 2 ? 1 : n < 4 ? 2 : n < 7 ? 3 : 4;
        var future = dt.getTime() > today.getTime();
        col.appendChild(h("div", {
          class: "hm-cell hm-l" + lvl + (future ? " hm-future" : ""),
          title: key + " — " + n + " action" + (n === 1 ? "" : "s")
        }));
      }
      grid.appendChild(col);
    }
    wrap.appendChild(grid);
    var legend = h("div", { class: "hm-legend" },
      "Less <span class='hm-cell hm-l0'></span><span class='hm-cell hm-l1'></span>" +
      "<span class='hm-cell hm-l2'></span><span class='hm-cell hm-l3'></span>" +
      "<span class='hm-cell hm-l4'></span> More");
    wrap.appendChild(legend);
    return wrap;
  }

  // ============================================================= REVIEW SESSION
  function startReview() {
    var queue = ALL.filter(function (p) { return store.isDue(p.id); });
    if (!queue.length) { toast("Nothing due for review — nice work!"); return; }
    var idx = 0;
    var body = el("reviewBody");
    openModal("reviewModal");

    function renderCard() {
      body.innerHTML = "";
      if (idx >= queue.length) {
        body.appendChild(h("div", { class: "rev-done" },
          "<div class='rev-done-emoji'>✅</div><div>Review session complete — " + queue.length +
          " card" + (queue.length === 1 ? "" : "s") + " reviewed.</div>"));
        var close = h("button", { class: "pill-btn" }, "Done");
        close.addEventListener("click", function () { closeModal("reviewModal"); });
        body.appendChild(close);
        renderSidebar(); renderProgress();
        return;
      }
      var p = queue[idx];
      var prog = h("div", { class: "rev-prog" });
      prog.innerHTML = '<div class="rev-prog-track"><div class="rev-prog-fill" style="width:' +
        Math.round((idx / queue.length) * 100) + '%"></div></div>' +
        "<span class='rev-count'>" + (idx + 1) + " / " + queue.length + "</span>";
      body.appendChild(prog);

      body.appendChild(h("div", { class: "rev-cat" }, esc(p.category)));
      body.appendChild(h("div", { class: "rev-title" }, esc(p.title)));
      body.appendChild(h("div", { class: "rev-brief md" }, md(p.descriptionBrief || "")));

      var reveal = h("div", { class: "rev-reveal blurred" });
      var a0 = (p.approaches && p.approaches[0]) || {};
      reveal.innerHTML =
        "<div class='rev-sub'>Recommended approach</div>" +
        "<div class='rev-approach'>" + esc(a0.name || "") + "</div>" +
        "<div class='rev-sub'>Pattern</div><div>" + esc((p.meta && p.meta.pattern) || "—") + "</div>";
      var ov = h("button", { class: "reveal-overlay" }, "👁 Recall, then click to reveal");
      ov.addEventListener("click", function () { reveal.classList.remove("blurred"); ov.remove(); grades.classList.add("ready"); });
      var revWrap = h("div", { class: "rev-reveal-wrap" });
      revWrap.appendChild(reveal); revWrap.appendChild(ov);
      body.appendChild(revWrap);

      var open = h("button", { class: "pill-btn ghost" }, "Open full problem →");
      open.addEventListener("click", function () { closeModal("reviewModal"); selectProblem(p.id); });
      body.appendChild(open);

      var grades = h("div", { class: "srs-grades rev-grades" });
      GRADES.forEach(function (g) {
        var b = h("button", { class: "srs-btn " + g.cls }, g.label);
        b.addEventListener("click", function () {
          store.reviewCard(p.id, g.key);
          if (store.getStatus(p.id) === "not-started") store.setStatus(p.id, "learning");
          idx++; renderCard();
        });
        grades.appendChild(b);
      });
      body.appendChild(grades);
    }
    renderCard();
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
    renderSidebar();
  }

  // ============================================================= REVISION GRID
  function openGrid() {
    var modal = el("gridModal");
    var body = el("gridBody");
    body.innerHTML = "";
    var table = h("table", { class: "grid-table" });
    table.innerHTML = "<thead><tr><th>#</th><th>Problem</th><th>Topic</th><th>Difficulty</th>" +
      "<th>Pattern</th><th>Platform</th><th>SQL Concept</th><th>Status</th></tr></thead>";
    var tbody = h("tbody");
    ALL.forEach(function (p) {
      var stt = store.getStatus(p.id);
      var tr = h("tr", { class: "grid-row" });
      tr.innerHTML =
        "<td>" + esc(p.number || "") + "</td>" +
        '<td class="g-title">' + esc(p.title) + "</td>" +
        "<td>" + esc(p.category) + "</td>" +
        '<td class="d-' + p.difficulty.toLowerCase() + '">' + p.difficulty + "</td>" +
        "<td>" + esc((p.meta && p.meta.pattern) || "") + "</td>" +
        "<td>" + esc(p.platform || "") + "</td>" +
        "<td><code>" + esc((p.meta && p.meta.sqlConcept) || "") + "</code></td>" +
        '<td class="st st-' + stt + '">' + STATUS_GLYPH[stt] + "</td>";
      tr.addEventListener("click", function () { modal.classList.add("hidden"); selectProblem(p.id); });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    body.appendChild(table);
    openModal("gridModal");
  }

  // ============================================================= CONTROLS
  function wireControls() {
    var search = el("search");
    search.addEventListener("input", function () {
      state.query = search.value;
      renderSidebar();
    });

    el("filterDifficulty").addEventListener("change", function (e) { state.filterDifficulty = e.target.value; renderSidebar(); updateFilterDot(); });
    el("filterStatus").addEventListener("change", function (e) { state.filterStatus = e.target.value; renderSidebar(); updateFilterDot(); });

    var imf = el("filterImportance");
    if (imf) imf.addEventListener("change", function (e) { state.filterImportance = e.target.value; renderSidebar(); updateFilterDot(); });

    var pf = el("filterPattern");
    allPatterns().forEach(function (pat) {
      pf.appendChild(h("option", { value: pat }, pat));
    });
    pf.addEventListener("change", function (e) { state.filterPattern = e.target.value; renderSidebar(); updateFilterDot(); });

    var plf = el("filterPlatform");
    if (plf) {
      allPlatforms().forEach(function (pl) { plf.appendChild(h("option", { value: pl }, pl)); });
      plf.addEventListener("change", function (e) { state.filterPlatform = e.target.value; renderSidebar(); updateFilterDot(); });
    }

    // remember base option labels now that pattern/platform options exist
    rememberBaseLabels();

    el("clearFilters").addEventListener("click", function () {
      state.query = ""; state.filterDifficulty = "all"; state.filterStatus = "all";
      state.filterPattern = "all"; state.filterPlatform = "all"; state.filterImportance = "all";
      search.value = ""; el("filterDifficulty").value = "all"; el("filterStatus").value = "all"; pf.value = "all";
      if (plf) plf.value = "all"; if (imf) imf.value = "all";
      renderSidebar(); renderProgress();
    });

    // filter drawer toggle (⚙)
    var ft = el("filterToggle");
    if (ft) {
      var applyFiltersOpen = function (open) {
        document.body.classList.toggle("filters-open", open);
        ft.setAttribute("aria-expanded", open ? "true" : "false");
      };
      applyFiltersOpen(!!store.getPref("filtersOpen"));
      ft.addEventListener("click", function () {
        var open = !document.body.classList.contains("filters-open");
        applyFiltersOpen(open); store.setPref("filtersOpen", open);
      });
    }

    // dashboard
    el("dashBtn").addEventListener("click", openDashboard);
    el("dashClose").addEventListener("click", function () { closeModal("dashModal"); });
    el("dashModal").addEventListener("click", function (e) { if (e.target === el("dashModal")) closeModal("dashModal"); });

    // review session
    el("reviewChip").addEventListener("click", startReview);
    el("reviewClose").addEventListener("click", function () { closeModal("reviewModal"); });
    el("reviewModal").addEventListener("click", function (e) { if (e.target === el("reviewModal")) closeModal("reviewModal"); });

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
      a.href = url; a.download = "sql-progress.json";
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

    // sidebar toggle: off-canvas drawer on mobile, collapse on desktop
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
      if (e.key === "Escape") { closeModal("gridModal"); closeModal("dashModal"); closeModal("reviewModal"); return; }
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
    el("totalCount").textContent = ALL.length;
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
