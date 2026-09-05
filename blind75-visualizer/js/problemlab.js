/*
 * problemlab.js — a generic "Practice" (coding problems) renderer that powers
 * any problem stack that shares the register()/all()/byCategory() registry shape:
 * currently SQL (window.SQLLAB) and PySpark (window.PYSPARK).
 *
 * It fills the shared shell (#nav sidebar, #main pane, #pyProgress box) on demand
 * and reuses the DSA app's CSS component classes so every stack looks native. It
 * renders the SUPERSET of problem fields, showing a section only when the current
 * problem actually has it (SQL schema/sample-data/expected-output/setup/walkthrough;
 * PySpark spark-internals/spark-SQL; shared examples/approaches/recall/notes/SRS).
 *
 * Progress is stored through the shared store with stack-namespaced ids
 * ("sql:<id>", "spark:<id>") so no two stacks can collide.
 */
(function () {
  var store = window.BLIND75.store;
  var md = window.BLIND75.md;

  // ---- per-stack configuration ------------------------------------------------
  var STACKS = {
    sql: {
      reg: function () { return window.SQLLAB; },
      lang: "sql",
      langLabel: "SQL",
      codePrimary: { key: "tsql", label: "T-SQL" },
      codeSecondary: { key: "clean", label: "Clean SQL" },
      importanceOf: function (p) { var m = (window.SQLLAB && window.SQLLAB.IMPORTANCE) || {}; return m[p.id] || "common"; },
      numberOf: function (p) { return p.number || ""; }
    },
    spark: {
      reg: function () { return window.PYSPARK; },
      lang: "python",
      langLabel: "PySpark",
      codePrimary: { key: "rcs", label: "Commented" },
      codeSecondary: { key: "plain", label: "Clean" },
      importanceOf: function (p) { var m = (window.PYSPARK && window.PYSPARK.IMPORTANCE) || {}; return m[p.lc] || "common"; },
      numberOf: function (p) { return p.lc != null ? "Q" + p.lc : ""; }
    },
    numpy: {
      reg: function () { return window.NUMPY; },
      lang: "python",
      langLabel: "NumPy",
      runnable: true,                              // Pyodide can execute NumPy in-browser
      codePrimary: { key: "rcs", label: "Commented" },
      codeSecondary: { key: "plain", label: "Clean" },
      importanceOf: function (p) { return p.importance || "common"; },
      numberOf: function (p) { return p.num != null ? "Q" + p.num : ""; }
    },
    pandas: {
      reg: function () { return window.PANDAS; },
      lang: "python",
      langLabel: "Pandas",
      runnable: true,                              // Pyodide can execute pandas in-browser
      codePrimary: { key: "rcs", label: "Commented" },
      codeSecondary: { key: "plain", label: "Clean" },
      importanceOf: function (p) { return p.importance || "common"; },
      numberOf: function (p) { return p.num != null ? "Q" + p.num : ""; }
    }
  };

  var IMP_META = {
    essential:  { label: "Essential",  stars: "★★★", cls: "imp-essential" },
    common:     { label: "Common",     stars: "★★",  cls: "imp-common" },
    occasional: { label: "Occasional", stars: "★",   cls: "imp-occasional" }
  };
  var STATUS_GLYPH = { "not-started": "○", "learning": "◐", "solved": "✓" };
  var STATUS_LABEL = { "not-started": "Not Started", "learning": "Learning", "solved": "Solved" };

  // ---- state ----
  var cur = { stack: null, id: null };
  var query = "";
  var approachIndex = {};   // nsId -> selected approach index
  var fuseCache = {};       // stack -> Fuse

  // ---- dom helpers ----
  function el(id) { return document.getElementById(id); }
  function h(tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === "class") e.className = attrs[k];
      else e.setAttribute(k, attrs[k]);
    }
    if (html != null) e.innerHTML = html;
    return e;
  }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  function cfg() { return STACKS[cur.stack]; }
  function reg() { return cfg().reg(); }
  function nsId(id) { return cur.stack + ":" + id; }

  function all() { var r = reg(); return (r && r.all && r.all()) || []; }
  function groups() { var r = reg(); return (r && r.byCategory && r.byCategory()) || []; }
  function byId(id) { var found = null; all().forEach(function (p) { if (p.id === id) found = p; }); return found; }

  // ---- search (Fuse per stack) ----
  function fuseFor(stack) {
    if (fuseCache[stack]) return fuseCache[stack];
    var list = (STACKS[stack].reg().all && STACKS[stack].reg().all()) || [];
    fuseCache[stack] = new Fuse(list, {
      includeScore: true, threshold: 0.38, ignoreLocation: true,
      keys: [
        { name: "title", weight: 0.4 }, { name: "category", weight: 0.2 },
        { name: "meta.pattern", weight: 0.2 }, { name: "meta.sqlConcept", weight: 0.15 },
        { name: "meta.functions", weight: 0.15 }, { name: "meta.transformation", weight: 0.15 },
        { name: "difficulty", weight: 0.1 }
      ]
    });
    return fuseCache[stack];
  }
  function visibleList() {
    if (!query.trim()) return all();
    return fuseFor(cur.stack).search(query.trim()).map(function (r) { return r.item; });
  }

  // ---- indent guides (mirrors app.js) ----
  function addIndentGuides(codeEl) {
    var TAB = 4, lines = codeEl.innerHTML.split("\n");
    for (var i = 0; i < lines.length; i++) {
      var m = /^( +)/.exec(lines[i]);
      if (!m) continue;
      var n = m[1].length, rest = lines[i].slice(n), out = "";
      for (var c = 0; c < n; c += TAB) { var w = Math.min(TAB, n - c); out += '<span class="ind-g">' + new Array(w + 1).join(" ") + "</span>"; }
      lines[i] = out + rest;
    }
    codeEl.innerHTML = lines.join("\n");
  }
  function codeBlock(src, lang) {
    var wrap = h("div", { class: "code-wrap" });
    var bar = h("div", { class: "code-bar" });
    bar.appendChild(h("span", { class: "code-lang" }, cfg().langLabel));
    var actions = h("div", { class: "code-actions" });
    var copy = h("button", { class: "copy-btn" }, "Copy");
    copy.addEventListener("click", function () {
      var text = src;
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(flash, flash);
      else flash();
      function flash() { copy.textContent = "Copied!"; setTimeout(function () { copy.textContent = "Copy"; }, 1200); }
    });
    actions.appendChild(copy);
    bar.appendChild(actions);
    var body = h("div", { class: "code-body" });
    var pre = h("pre", { class: "code-pre" });
    var code = h("code", { class: "language-" + (lang || cfg().lang) });
    code.textContent = src;
    pre.appendChild(code); body.appendChild(pre);
    wrap.appendChild(bar); wrap.appendChild(body);
    if (window.Prism) { try { window.Prism.highlightElement(code); } catch (e) {} }
    if ((lang || cfg().lang) === "python") addIndentGuides(code);
    return wrap;
  }

  // ---- runnable editor (Pyodide) — used by python-family practice stacks ----
  function runnableEditor(initial) {
    var box = h("div", { class: "pyplay" });
    var ta = h("textarea", { class: "pyplay-code", spellcheck: "false" });
    ta.value = initial || "";
    ta.rows = Math.min(Math.max((initial || "").split("\n").length + 1, 4), 22);
    var bar = h("div", { class: "run-bar" });
    var btn = h("button", { class: "chip-btn run-btn" }, "▶ Run");
    var hint = h("span", { class: "run-hint muted" }, "runs in your browser · edit & re-run freely");
    var out = h("pre", { class: "run-out", hidden: "hidden" });
    btn.addEventListener("click", function () {
      if (window.PYRUN) window.PYRUN.run(ta.value, out, btn);
      else { out.hidden = false; out.textContent = "Python runtime unavailable."; }
    });
    ta.addEventListener("keydown", function (e) {
      if (e.key === "Tab") { e.preventDefault(); var s = ta.selectionStart, en = ta.selectionEnd; ta.value = ta.value.slice(0, s) + "    " + ta.value.slice(en); ta.selectionStart = ta.selectionEnd = s + 4; }
    });
    bar.appendChild(btn); bar.appendChild(hint);
    box.appendChild(ta); box.appendChild(bar); box.appendChild(out);
    return box;
  }

  // ---- collapsible section (matches DSA/py, smooth px-height) ----
  function section(key, title, bodyNode, opts) {
    opts = opts || {};
    var collapsed = !!opts.collapsed;
    var sec = h("section", { class: "prob-section" + (collapsed ? " collapsed" : ""), "data-key": key });
    var head = h("button", { class: "sec-head" });
    head.innerHTML = '<span class="sec-caret">▾</span><span class="sec-title">' + esc(title) + "</span>" +
      (opts.badge ? '<span class="sec-badge">' + esc(opts.badge) + "</span>" : "");
    var outer = h("div", { class: "sec-body-outer" });
    if (collapsed) outer.style.height = "0px";
    var body = h("div", { class: "sec-body" });
    body.appendChild(bodyNode);
    outer.appendChild(body);
    head.addEventListener("click", function () {
      var willOpen = sec.classList.contains("collapsed");
      var startH = outer.getBoundingClientRect().height;
      outer.style.height = startH + "px";
      outer.getBoundingClientRect();
      sec.classList.toggle("collapsed", !willOpen);
      outer.style.height = (willOpen ? body.getBoundingClientRect().height : 0) + "px";
      var done = function (e) { if (e.propertyName !== "height") return; outer.removeEventListener("transitionend", done); if (willOpen) outer.style.height = "auto"; };
      outer.addEventListener("transitionend", done);
    });
    sec.appendChild(head); sec.appendChild(outer);
    return sec;
  }

  // ---- a simple data table (columns + rows of scalars) ----
  function dataTable(columns, rows) {
    var scroller = h("div", { class: "lab-table-scroll" });
    var t = h("table", { class: "lab-table" });
    var thead = "<thead><tr>";
    (columns || []).forEach(function (c) { thead += "<th>" + esc(c) + "</th>"; });
    thead += "</tr></thead>";
    var tb = "<tbody>";
    (rows || []).forEach(function (r) {
      tb += "<tr>";
      r.forEach(function (v) { tb += "<td>" + (v === null ? "<span class='lab-null'>NULL</span>" : esc(v)) + "</td>"; });
      tb += "</tr>";
    });
    tb += "</tbody>";
    t.innerHTML = thead + tb;
    scroller.appendChild(t);
    return scroller;
  }
  function schemaTable(tbl) {
    var wrap = h("div", { class: "lab-schema" });
    wrap.appendChild(h("div", { class: "lab-schema-name" }, esc(tbl.name)));
    var rows = (tbl.columns || []).map(function (c) {
      return [c.name, c.type + (c.note ? "  · " + c.note : "")];
    });
    wrap.appendChild(dataTable(["Column", "Type"], rows));
    return wrap;
  }

  // ============================================================ SIDEBAR
  function catCollapseKey(cat) { return cur.stack + "::" + cat; }
  function renderSidebar() {
    var nav = el("nav");
    if (!nav) return;
    nav.innerHTML = "";
    var vis = {}; visibleList().forEach(function (p) { vis[p.id] = true; });
    groups().forEach(function (g) {
      var matching = g.problems.filter(function (p) { return vis[p.id]; });
      if (!matching.length) return;
      var collapsed = store.isCatCollapsed(catCollapseKey(g.category));
      var solved = matching.filter(function (p) { return store.getStatus(nsId(p.id)) === "solved"; }).length;
      var block = h("div", { class: "cat-block" + (collapsed ? " collapsed" : ""), "data-cat": g.category });
      var header = h("button", { class: "cat-header" });
      var icon = (reg().CATEGORY_ICON && reg().CATEGORY_ICON[g.category]) || "•";
      header.innerHTML =
        '<span class="cat-caret">▾</span><span class="cat-icon">' + icon + "</span>" +
        '<span class="cat-name">' + esc(g.category) + "</span>" +
        '<span class="cat-count">' + solved + "/" + matching.length + "</span>";
      block.appendChild(header);
      var outer = h("div", { class: "cat-list-outer" });
      if (collapsed) outer.style.height = "0px";
      var list = h("div", { class: "cat-list" });
      matching.forEach(function (p) {
        var st = store.getStatus(nsId(p.id));
        var item = h("a", { class: "nav-item" + (p.id === cur.id ? " active" : ""), href: "#", "data-id": p.id });
        var imp = cfg().importanceOf(p);
        var impDot = imp === "occasional" ? "" : '<span class="ni-imp ' + IMP_META[imp].cls + '">●</span>';
        item.innerHTML =
          '<span class="st st-' + st + '">' + STATUS_GLYPH[st] + "</span>" +
          '<span class="ni-title">' + esc(p.title) + "</span>" +
          (store.isReview(nsId(p.id)) ? '<span class="ni-review">★</span>' : "") + impDot +
          '<span class="ni-diff d-' + String(p.difficulty).toLowerCase() + '">' + String(p.difficulty).charAt(0) + "</span>";
        item.addEventListener("click", function (e) { e.preventDefault(); window.BLIND75.goTo("practice", cur.stack, p.id); });
        list.appendChild(item);
      });
      outer.appendChild(list);
      block.appendChild(outer);
      header.addEventListener("click", function () {
        var willOpen = block.classList.contains("collapsed");
        var startH = outer.getBoundingClientRect().height;
        outer.style.height = startH + "px"; outer.getBoundingClientRect();
        block.classList.toggle("collapsed", !willOpen);
        outer.style.height = (willOpen ? list.getBoundingClientRect().height : 0) + "px";
        var done = function (ev) { if (ev.propertyName !== "height") return; outer.removeEventListener("transitionend", done); if (willOpen) outer.style.height = "auto"; };
        outer.addEventListener("transitionend", done);
        store.setCatCollapsed(catCollapseKey(g.category), !willOpen);
      });
      nav.appendChild(block);
    });
    if (!nav.children.length) nav.appendChild(h("div", { class: "nav-empty" }, "No problems match your search."));
  }

  // ============================================================ PROGRESS
  function renderProgress() {
    var box = el("pyProgress");
    if (!box) return;
    var list = all();
    var ids = list.map(function (p) { return nsId(p.id); });
    var solved = list.filter(function (p) { return store.getStatus(nsId(p.id)) === "solved"; }).length;
    var learning = list.filter(function (p) { return store.getStatus(nsId(p.id)) === "learning"; }).length;
    var pct = list.length ? Math.round((solved / list.length) * 100) : 0;
    var due = store.countDue(ids);
    box.innerHTML =
      '<div class="py-prog-head"><span class="py-prog-title">' + esc(cfg().langLabel) + ' · Practice</span>' +
      '<span class="py-prog-pct">' + pct + '%</span></div>' +
      '<div class="progress-track"><div class="progress-fill" style="width:' + pct + '%"></div></div>' +
      '<div class="py-prog-foot muted">' + solved + ' solved · ' + learning + ' learning · ' + list.length + ' total' +
      (due ? ' · <b>' + due + ' due</b>' : '') + '</div>';
    box.hidden = false;
  }

  // ============================================================ PROBLEM PAGE
  var GRADES = [
    { key: "again", label: "Again", hint: "Blanked / wrong", cls: "g-again" },
    { key: "hard", label: "Hard", hint: "Right, but a struggle", cls: "g-hard" },
    { key: "good", label: "Good", hint: "Recalled with effort", cls: "g-good" },
    { key: "easy", label: "Easy", hint: "Instant / trivial", cls: "g-easy" }
  ];

  function renderProblem() {
    var main = el("main");
    var p = byId(cur.id);
    main.innerHTML = "";
    if (!p) { main.appendChild(h("div", { class: "empty-state" }, "Select a problem from the sidebar to begin.")); return; }
    var nid = nsId(p.id);
    var st = store.getStatus(nid);
    var imp = cfg().importanceOf(p);

    // header
    var header = h("div", { class: "prob-header" });
    var linkHtml = p.link ? '<a class="ph-link" href="' + esc(p.link) + '" target="_blank" rel="noopener">' + esc(p.platform || "Source") + ' ↗</a>' : "";
    header.innerHTML =
      '<div class="ph-top">' +
        (cfg().numberOf(p) ? '<span class="ph-lc">' + esc(cfg().numberOf(p)) + "</span>" : "") +
        '<span class="ph-diff d-' + String(p.difficulty).toLowerCase() + '">' + esc(p.difficulty) + "</span>" +
        '<span class="ph-imp ' + IMP_META[imp].cls + '">' + IMP_META[imp].stars + " " + IMP_META[imp].label + "</span>" +
        '<span class="ph-cat">' + esc(p.category) + "</span>" + linkHtml +
      "</div>" +
      '<h1 class="ph-title">' + esc(p.title) + "</h1>";

    var actions = h("div", { class: "ph-actions" });
    var grp = h("div", { class: "status-group" });
    ["not-started", "learning", "solved"].forEach(function (s) {
      var b = h("button", { class: "status-btn st-" + s + (st === s ? " sel" : "") }, STATUS_GLYPH[s] + " " + STATUS_LABEL[s]);
      b.addEventListener("click", function () {
        store.setStatus(nid, s);
        if (s === "solved") store.logSolve();
        renderProblem(); renderSidebar(); renderProgress();
      });
      grp.appendChild(b);
    });
    actions.appendChild(grp);
    var reviewBtn = h("button", { class: "chip-btn" + (store.isReview(nid) ? " on" : "") }, store.isReview(nid) ? "★ In review queue" : "☆ Mark for review");
    reviewBtn.addEventListener("click", function () { store.toggleReview(nid); renderProblem(); renderSidebar(); });
    actions.appendChild(reviewBtn);
    header.appendChild(actions);
    main.appendChild(header);

    // meta row
    var m = p.meta || {};
    var metaBox = h("div", { class: "meta-box" });
    [["Pattern", m.pattern], ["Concept", m.sqlConcept], ["Transformation", m.transformation],
     ["Technique", m.technique], ["Functions", m.functions], ["Difficulty", p.difficulty]].forEach(function (it) {
      if (!it[1]) return;
      var cell = h("div", { class: "meta-cell" });
      cell.innerHTML = '<div class="meta-k">' + esc(it[0]) + '</div><div class="meta-v">' + esc(it[1]) + "</div>";
      metaBox.appendChild(cell);
    });
    main.appendChild(metaBox);

    // description
    var descNode = h("div", { class: "md" });
    descNode.innerHTML = md(p.descriptionBrief || p.description || "");
    if (p.constraints && p.constraints.length) {
      var cwrap = h("div", { class: "constraints" });
      cwrap.appendChild(h("div", { class: "subhead" }, "Constraints"));
      var ul = h("ul"); p.constraints.forEach(function (c) { ul.appendChild(h("li", null, md(c).replace(/^<p>|<\/p>$/g, ""))); });
      cwrap.appendChild(ul); descNode.appendChild(cwrap);
    }
    if (p.notes && p.notes.length) {
      var nwrap = h("div", { class: "notes-block" });
      nwrap.appendChild(h("div", { class: "subhead" }, "Notes"));
      var ul2 = h("ul"); p.notes.forEach(function (c) { ul2.appendChild(h("li", null, md(c).replace(/^<p>|<\/p>$/g, ""))); });
      nwrap.appendChild(ul2); descNode.appendChild(nwrap);
    }
    main.appendChild(section("description", "Problem", descNode));

    // schema + sample data (SQL)
    if ((p.schema && p.schema.length) || (p.sampleData && p.sampleData.length)) {
      var sd = h("div", {});
      (p.schema || []).forEach(function (t) { sd.appendChild(schemaTable(t)); });
      (p.sampleData || []).forEach(function (t) {
        sd.appendChild(h("div", { class: "lab-table-cap" }, esc(t.table)));
        sd.appendChild(dataTable(t.columns, t.rows));
      });
      main.appendChild(section("schema", "Schema & Sample Data", sd));
    }

    // examples (PySpark / generic)
    if (p.examples && p.examples.length) {
      var exWrap = h("div", { class: "examples" });
      p.examples.forEach(function (ex, i) {
        var card = h("div", { class: "example-card" });
        card.appendChild(h("div", { class: "ex-num" }, "Example " + (i + 1)));
        var io = h("div", { class: "ex-io" });
        io.innerHTML = '<div class="ex-row"><span class="ex-label">Input</span><code>' + esc(ex.input) + "</code></div>" +
          '<div class="ex-row"><span class="ex-label">Output</span><code>' + esc(ex.output) + "</code></div>";
        card.appendChild(io);
        if (ex.reasoning) { var r = h("div", { class: "ex-reason md" }); r.innerHTML = md(ex.reasoning); card.appendChild(r); }
        exWrap.appendChild(card);
      });
      main.appendChild(section("examples", "Examples", exWrap, { badge: p.examples.length + "" }));
    }

    // expected output (SQL)
    if (p.expectedOutput && p.expectedOutput.columns) {
      main.appendChild(section("expected", "Expected Output",
        dataTable(p.expectedOutput.columns, p.expectedOutput.rows),
        { badge: (p.expectedOutput.rows || []).length + " row" + ((p.expectedOutput.rows || []).length === 1 ? "" : "s") }));
    }

    // approaches: logic + code toggle
    var approaches = p.approaches || [];
    if (approachIndex[nid] == null) approachIndex[nid] = approaches.length - 1;
    var ai = Math.min(approachIndex[nid], approaches.length - 1); if (ai < 0) ai = 0;
    var apWrap = h("div", { class: "approach-area" });
    if (approaches.length > 1) {
      var switcher = h("div", { class: "approach-switch" });
      approaches.forEach(function (a, i) {
        var b = h("button", { class: "app-tab" + (i === ai ? " active" : "") }, esc(a.name));
        b.addEventListener("click", function () { approachIndex[nid] = i; renderProblem(); });
        switcher.appendChild(b);
      });
      apWrap.appendChild(switcher);
    }
    var a = approaches[ai] || {};
    if (a.logic) {
      var logicNode = h("div", { class: "md logic" }); logicNode.innerHTML = md(a.logic);
      apWrap.appendChild(section("logic", "Complete Logic — " + (a.name || "Approach"), logicNode));
    }

    // code (primary/secondary toggle)
    var codeArea = h("div", { class: "code-area" });
    var pk = cfg().codePrimary, sk = cfg().codeSecondary;
    var hasSecondary = sk && a[sk.key] && a[sk.key] !== a[pk.key];
    var mode = store.getPref("labCodeMode_" + cur.stack) || "primary";
    if (mode === "secondary" && !hasSecondary) mode = "primary";
    if (hasSecondary) {
      var toggle = h("div", { class: "code-toggle" });
      var pb = h("button", { class: "ct-btn" + (mode === "primary" ? " active" : "") }, pk.label);
      var sb = h("button", { class: "ct-btn" + (mode === "secondary" ? " active" : "") }, sk.label);
      pb.addEventListener("click", function () { store.setPref("labCodeMode_" + cur.stack, "primary"); renderProblem(); });
      sb.addEventListener("click", function () { store.setPref("labCodeMode_" + cur.stack, "secondary"); renderProblem(); });
      toggle.appendChild(pb); toggle.appendChild(sb);
      codeArea.appendChild(toggle);
    }
    var source = mode === "secondary" ? a[sk.key] : (a[pk.key] || a[sk.key] || "");
    codeArea.appendChild(codeBlock(source, cfg().lang));
    if (cfg().runnable) {
      var tryBox = h("div", { class: "prob-try" });
      tryBox.appendChild(h("div", { class: "prob-try-h" }, "▶ Try it — run and edit this solution in your browser"));
      tryBox.appendChild(runnableEditor(a.plain || a[pk.key] || source));
      codeArea.appendChild(tryBox);
    }
    if (a.whenToUse) codeArea.appendChild(h("div", { class: "when-use" }, "<strong>When to use:</strong> " + esc(a.whenToUse)));
    if (a.perfNote) codeArea.appendChild(h("div", { class: "when-use" }, "<strong>Performance:</strong> " + esc(a.perfNote)));
    if (a.dialectNote) codeArea.appendChild(h("div", { class: "when-use dialect" }, "<strong>Dialect note:</strong> " + esc(a.dialectNote)));
    apWrap.appendChild(section("code", cfg().langLabel + " Solution — " + (a.name || "Approach"), codeArea));
    main.appendChild(apWrap);

    // walkthrough (SQL step tables)
    if (p.walkthrough && p.walkthrough.length) {
      var wt = h("div", {});
      p.walkthrough.forEach(function (s, i) {
        var stepBox = h("div", { class: "lab-step" });
        stepBox.appendChild(h("div", { class: "lab-step-h" }, (i + 1) + ". " + esc(s.step)));
        if (s.note) stepBox.appendChild(h("div", { class: "lab-step-note muted" }, esc(s.note)));
        if (s.table) stepBox.appendChild(dataTable(s.table.columns, s.table.rows));
        wt.appendChild(stepBox);
      });
      main.appendChild(section("walkthrough", "Walkthrough", wt, { badge: p.walkthrough.length + " step" + (p.walkthrough.length === 1 ? "" : "s") }));
    }

    // Spark internals + Spark SQL (PySpark)
    if (p.sparkInternals) {
      var siNode = h("div", { class: "md" }); siNode.innerHTML = md(p.sparkInternals);
      main.appendChild(section("neutral", "⚡ Spark Internals & Performance", siNode));
    }
    if (p.sparkSql) {
      main.appendChild(section("sparksql", "Spark SQL Equivalent", codeBlock(p.sparkSql, "sql")));
    }

    // setup script (SQL)
    if (p.setupSql) {
      main.appendChild(section("setup", "Setup Script (paste into your SQL client)", codeBlock(p.setupSql, "sql"), { collapsed: true }));
    }

    // recognition / recall cues
    var recogList = p.patternRecognition || [];
    if (recogList.length) {
      var pr = h("ul", { class: "cue-list" });
      recogList.forEach(function (t) { pr.appendChild(h("li", null, md(t).replace(/^<p>|<\/p>$/g, ""))); });
      main.appendChild(section("recognize", "How to Recognize This Problem", pr));
    }
    var recallList = p.interviewRecall || p.recognizeRecall || [];
    if (recallList.length) {
      var ir = h("ul", { class: "cue-list recall" });
      recallList.forEach(function (t) { ir.appendChild(h("li", null, md(t).replace(/^<p>|<\/p>$/g, ""))); });
      main.appendChild(section("recall", "Interview Recall", ir));
    }
    if (p.commonMistakes && p.commonMistakes.length) {
      var cm = h("ul", { class: "cue-list" });
      p.commonMistakes.forEach(function (t) { cm.appendChild(h("li", null, md(t).replace(/^<p>|<\/p>$/g, ""))); });
      main.appendChild(section("mistakes", "Common Mistakes", cm));
    }

    // spaced repetition
    main.appendChild(buildSrs(p, nid));

    // notes
    var noteWrap = h("div", { class: "note-wrap" });
    var ta = h("textarea", { class: "note-area", placeholder: "Your own notes… (saved automatically)" });
    ta.value = store.getNote(nid);
    var saveHint = h("span", { class: "note-hint" }, "");
    var timer;
    ta.addEventListener("input", function () {
      clearTimeout(timer);
      timer = setTimeout(function () { store.setNote(nid, ta.value); saveHint.textContent = "Saved ✓"; setTimeout(function () { saveHint.textContent = ""; }, 1000); }, 350);
    });
    noteWrap.appendChild(ta); noteWrap.appendChild(saveHint);
    main.appendChild(section("notes", "My Notes", noteWrap, { collapsed: true }));

    main.scrollTop = 0;
  }

  function humanWhen(dueMs) {
    var day = 86400000;
    if (dueMs <= Date.now()) return "today";
    var start = new Date(); start.setHours(0, 0, 0, 0);
    var diff = Math.round((dueMs - start.getTime()) / day);
    if (diff <= 0) return "today"; if (diff === 1) return "tomorrow";
    if (diff < 7) return "in " + diff + " days";
    if (diff < 30) return "in " + Math.round(diff / 7) + " week" + (diff < 14 ? "" : "s");
    return "in " + Math.round(diff / 30) + " month" + (diff < 60 ? "" : "s");
  }
  function buildSrs(p, nid) {
    var wrap = h("div", { class: "srs-wrap" });
    var rec = store.getSrs(nid);
    var statusLine = h("div", { class: "srs-status" });
    if (!rec) statusLine.innerHTML = '<span class="srs-badge srs-new">New</span> <span class="muted">Grade your recall to start spaced repetition.</span>';
    else {
      var due = store.isDue(nid);
      statusLine.innerHTML = '<span class="srs-badge ' + (due ? "srs-due" : "srs-ok") + '">' + (due ? "Due now" : "Scheduled") + "</span> " +
        '<span class="muted">Next review <b>' + humanWhen(rec.due) + "</b> · " + rec.reps + " review" + (rec.reps === 1 ? "" : "s") + "</span>";
    }
    wrap.appendChild(statusLine);
    var row = h("div", { class: "srs-grades" });
    GRADES.forEach(function (g) {
      var btn = h("button", { class: "srs-grade " + g.cls, title: g.hint });
      btn.innerHTML = '<span class="sg-label">' + g.label + '</span><span class="sg-hint">' + g.hint + "</span>";
      btn.addEventListener("click", function () {
        var nrec = store.reviewCard(nid, g.key);
        if (store.getStatus(nid) === "not-started") store.setStatus(nid, "learning");
        renderProblem(); renderSidebar(); renderProgress();
      });
      row.appendChild(btn);
    });
    wrap.appendChild(row);
    return section("srs", "Spaced Repetition Review", wrap, { badge: rec ? (store.isDue(nid) ? "Due" : humanWhen(rec.due)) : "New" });
  }

  // ============================================================ PUBLIC API
  window.ProblemLab = {
    // Render the given stack's practice view; id null => first problem.
    mount: function (stack, id) {
      if (!STACKS[stack]) return;
      cur.stack = stack;
      var list = all();
      if (!list.length) {
        cur.id = null;
        el("nav").innerHTML = "";
        el("main").innerHTML = "";
        el("main").appendChild(h("div", { class: "empty-state" }, "This stack has no problems yet."));
        return;
      }
      cur.id = (id && byId(id)) ? id : list[0].id;
      store.setPref("lastProblem_" + stack, cur.id);
      renderSidebar(); renderProblem(); renderProgress();
    },
    lastId: function (stack) { return store.getPref("lastProblem_" + stack); },
    onSearch: function (q) { query = q; renderSidebar(); },
    toggleAll: function () {
      var gs = groups();
      var allCollapsed = gs.every(function (g) { return store.isCatCollapsed(catCollapseKey(g.category)); });
      gs.forEach(function (g) { store.setCatCollapsed(catCollapseKey(g.category), !allCollapsed); });
      renderSidebar();
    }
  };
})();
