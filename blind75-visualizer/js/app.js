/*
 * app.js — the Blind 75 study application.
 * Renders the sidebar, the problem reading pane, search, filters, progress,
 * code toggles (approach + RCS/plain), blur-to-recall, notes, review queue,
 * export/import, the all-75 revision grid, and keyboard navigation.
 */
(function () {
  var B = window.BLIND75;
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
      { name: "meta.dataStructure", weight: 0.15 },
      { name: "meta.technique", weight: 0.15 },
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
    setFilter: store.getPref("setFilter") || "all",  // "all" (NeetCode 150) | "blind75"
    workspace: store.getPref("workspace") || "dsa",  // "dsa" | "python" (legacy CSS key)
    stack: "python",                                 // python | sql | spark | numpy | pandas
    mode: "practice",                                // learn | practice
    approachIndex: {}   // problemId -> selected approach index
  };

  // ---- master stack/mode model ----
  var STACK_KEYS = ["python", "numpy", "pandas", "spark", "sql"];
  var STACK_LABEL = { python: "Python", numpy: "NumPy", pandas: "Pandas", spark: "PySpark", sql: "SQL" };
  function hasLearn(stack) {
    if (stack === "python") return !!(window.PYDSA && window.PYDSA.all().length);
    return !!(window.LEARN && window.LEARN.hasContent(stack));
  }
  function hasPractice(stack) {
    if (stack === "python") return true;                                  // DSA problems
    if (stack === "sql") return !!(window.SQLLAB && window.SQLLAB.all().length);
    if (stack === "spark") return !!(window.PYSPARK && window.PYSPARK.all().length);
    if (stack === "numpy") return !!(window.NUMPY && window.NUMPY.all().length);
    if (stack === "pandas") return !!(window.PANDAS && window.PANDAS.all().length);
    return false;
  }
  function modeAvailable(stack, mode) { return mode === "learn" ? hasLearn(stack) : hasPractice(stack); }

  // Build the hash for a (mode, stack, id). Python keeps its legacy routes so old
  // deep links still resolve; every other stack uses "#learn|solve/<stack>/<id>".
  function routeFor(mode, stack, id) {
    if (stack === "python" && mode === "practice") return id ? "#" + id : "#";
    if (stack === "python" && mode === "learn") return id ? "#py/" + id : "#py";
    return "#" + (mode === "learn" ? "learn" : "solve") + "/" + stack + (id ? "/" + id : "");
  }
  function parseRoute(hash) {
    var raw = (hash || "").replace(/^#/, "");
    if (raw === "") return { mode: "practice", stack: "python", id: null, empty: true };
    if (raw === "py" || raw.indexOf("py/") === 0) return { mode: "learn", stack: "python", id: raw.indexOf("py/") === 0 ? raw.slice(3) : null };
    var parts = raw.split("/");
    if (parts[0] === "learn" || parts[0] === "solve") {
      return { mode: parts[0] === "learn" ? "learn" : "practice", stack: parts[1] || "sql", id: parts[2] || null };
    }
    return { mode: "practice", stack: "python", id: raw }; // legacy bare problem id
  }
  // Remembered/last item id for a (stack, mode) so switches resume where you were.
  function defaultIdFor(stack, mode) {
    if (stack === "python" && mode === "practice") return state.currentId;
    if (stack === "python" && mode === "learn") return store.getPref("lastTopic");
    if (mode === "practice") return window.ProblemLab && window.ProblemLab.lastId(stack);
    return window.ConceptLab && window.ConceptLab.lastId(stack);
  }

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

  // ---- modal open/close with enter + exit transitions ----
  var MODAL_MS = 200; // keep in sync with --dur
  function openModal(id) {
    var m = el(id);
    if (!m) return;
    m.classList.remove("hidden");
    // force a reflow so the .open transition runs from the hidden state
    void m.offsetWidth;
    m.classList.add("open");
  }
  function closeModal(id) {
    var m = el(id);
    if (!m || m.classList.contains("hidden")) return;
    m.classList.remove("open");
    setTimeout(function () { m.classList.add("hidden"); }, MODAL_MS);
  }

  // interview-importance tiers
  var IMP_META = {
    essential:  { label: "Essential",  stars: "★★★", cls: "imp-essential" },
    common:     { label: "Common",     stars: "★★",  cls: "imp-common" },
    occasional: { label: "Occasional", stars: "★",   cls: "imp-occasional" }
  };
  function impOf(p) {
    var m = B.IMPORTANCE || {};
    return m[p && p.lc] || "common";
  }

  // Base labels for the filter dropdowns (counts get appended per option).
  var DIFF_LABELS = { all: "All difficulty", Easy: "Easy", Medium: "Medium", Hard: "Hard" };
  var STATUS_LABELS = { all: "Any status", "not-started": "Not started", learning: "Learning", solved: "Solved", review: "★ Review queue", due: "🔁 Due for review" };
  var IMP_LABELS = { all: "Any importance", essential: "★★★ Essential", common: "★★ Common", occasional: "★ Occasional" };

  // Rewrite each option label as "Base (n)". Counts are scoped to the active
  // study set (All 150 / Blind 75), NOT cross-filtered by the other dropdowns —
  // so they stay stable and answer "how many X are in this set?".
  function setOptionCounts(id, labels, counts) {
    var sel = el(id);
    if (!sel) return;
    for (var i = 0; i < sel.options.length; i++) {
      var opt = sel.options[i];
      var base = labels[opt.value] != null ? labels[opt.value] : opt.value;
      opt.textContent = base + " (" + (counts[opt.value] || 0) + ")";
    }
  }
  function updateFilterCounts() {
    var set = activeProblems();
    var total = set.length;
    var diff = { Easy: 0, Medium: 0, Hard: 0 };
    var imp = { essential: 0, common: 0, occasional: 0 };
    var stat = { "not-started": 0, learning: 0, solved: 0, review: 0, due: 0 };
    var pat = {};
    set.forEach(function (p) {
      if (diff[p.difficulty] != null) diff[p.difficulty]++;
      imp[impOf(p)]++;
      var s = store.getStatus(p.id);
      if (stat[s] != null) stat[s]++;
      if (store.isReview(p.id)) stat.review++;
      if (store.isDue(p.id)) stat.due++;
      var pp = p.meta && p.meta.pattern;
      if (pp) pat[pp] = (pat[pp] || 0) + 1;
    });
    setOptionCounts("filterDifficulty", DIFF_LABELS, { all: total, Easy: diff.Easy, Medium: diff.Medium, Hard: diff.Hard });
    setOptionCounts("filterImportance", IMP_LABELS, { all: total, essential: imp.essential, common: imp.common, occasional: imp.occasional });
    setOptionCounts("filterStatus", STATUS_LABELS, {
      all: total, "not-started": stat["not-started"], learning: stat.learning,
      solved: stat.solved, review: stat.review, due: stat.due
    });
    var pf = el("filterPattern");
    if (pf) for (var j = 0; j < pf.options.length; j++) {
      var o = pf.options[j];
      var base = o.value === "all" ? "All patterns" : o.value;
      var n = o.value === "all" ? total : (pat[o.value] || 0);
      o.textContent = base + " (" + n + ")";
    }
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

  // Is a problem in the currently-selected study set (All 150 vs Blind 75)?
  function inActiveSet(p) {
    return state.setFilter === "blind75" ? B.isBlind75(p) : true;
  }
  // Problems of the active set (optionally within a given list).
  function activeProblems(list) {
    return (list || ALL).filter(inActiveSet);
  }

  // Is any dropdown filter active (search excluded — its box is always visible)?
  function anyFilterActive() {
    return state.filterDifficulty !== "all" || state.filterStatus !== "all" ||
           state.filterPattern !== "all" || state.filterImportance !== "all";
  }
  function updateFilterDot() {
    var d = el("filterDot");
    if (d) d.hidden = !anyFilterActive();
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
  // Smoothly open/close a category by animating an explicit pixel height. Works
  // in every browser and never reflows-per-frame the way a grid-fr transition
  // would. Reading getBoundingClientRect first means an interrupted animation
  // continues from wherever it currently is.
  function onHeightEnd(node, fn) {
    var handler = function (e) {
      if (e.target !== node || e.propertyName !== "height") return;
      node.removeEventListener("transitionend", handler);
      fn();
    };
    node.addEventListener("transitionend", handler);
  }
  // Generic smooth collapse used by BOTH the sidebar categories and the main
  // content sections. `toggleEl` carries the .collapsed class (caret/fade), `outer`
  // is the element whose pixel height we animate.
  function animateCollapse(toggleEl, outer, open) {
    if (!outer) return;
    var startH = outer.getBoundingClientRect().height; // current height (handles mid-flight)
    toggleEl.classList.toggle("collapsed", !open);
    outer.style.height = startH + "px";                 // pin the starting height (auto -> px)
    void outer.offsetHeight;                            // force reflow so the next change animates
    if (open) {
      outer.style.height = outer.scrollHeight + "px";   // grow to full content height
      onHeightEnd(outer, function () {
        // settle to auto so later content changes don't get clipped — but only if
        // we're still open (a fast re-collapse must not reopen it)
        if (!toggleEl.classList.contains("collapsed")) outer.style.height = "auto";
      });
    } else {
      outer.style.height = "0px";                        // shrink to nothing
    }
  }
  function setCatOpen(block, open) {
    animateCollapse(block, block.querySelector(".cat-list-outer"), open);
  }

  // Which renderer owns the shared "Categories" tools bar right now?
  //   python + practice → the DSA app;  other stacks → ProblemLab (practice) /
  //   ConceptLab (learn).  (Python-Learn hides this bar; it has its own.)
  function toggleAllAllCollapsed() {
    if (state.stack === "python" && state.mode === "practice") {
      var groups = B.byCategory();
      return groups.length && groups.every(function (g) { return store.isCatCollapsed(g.category); });
    }
    if (state.mode === "practice") { return !!(window.ProblemLab && window.ProblemLab.allCollapsed && window.ProblemLab.allCollapsed()); }
    return !!(window.ConceptLab && window.ConceptLab.allCollapsed && window.ConceptLab.allCollapsed());
  }
  // Reflect the single expand/collapse-all button's state (caret + tooltip).
  function updateToggleAllIcon() {
    var btn = el("toggleAll"); if (!btn) return;
    var allCollapsed = toggleAllAllCollapsed();
    btn.textContent = "▾";                                  // single caret; CSS rotates it
    btn.classList.toggle("collapsed", !!allCollapsed);
    btn.title = allCollapsed ? "Expand all categories" : "Collapse all categories";
    btn.setAttribute("aria-label", btn.title);
  }

  function renderSidebar() {
    var nav = el("nav");
    nav.innerHTML = "";
    updateFilterDot();
    var vis = visibleIds();

    GROUPS.forEach(function (g) {
      var matching = g.problems.filter(function (p) { return vis[p.id]; });
      if (!matching.length) return;

      var collapsed = store.isCatCollapsed(g.category);
      // Badge reflects the CURRENTLY-VISIBLE problems (after search + difficulty +
      // status + pattern + set filters) — the same list rendered below — so it
      // stays in sync with what the user is actually looking at. Numerator is the
      // solved count among those visible.
      var solvedInCat = matching.filter(function (p) { return store.getStatus(p.id) === "solved"; }).length;

      // A self-contained block per category. The list is ALWAYS rendered (even
      // when collapsed) so collapse/expand can animate purely in CSS — the
      // header click just toggles a class instead of rebuilding the whole nav.
      var block = h("div", { class: "cat-block" + (collapsed ? " collapsed" : ""), "data-cat": g.category });

      var header = h("button", { class: "cat-header", "data-cat": g.category });
      header.innerHTML =
        '<span class="cat-caret">▾</span>' +
        '<span class="cat-icon">' + (B.CATEGORY_ICON[g.category] || "•") + "</span>" +
        '<span class="cat-name">' + esc(g.category) + "</span>" +
        '<span class="cat-count">' + solvedInCat + "/" + matching.length + "</span>";
      header.addEventListener("click", function () {
        var willOpen = block.classList.contains("collapsed"); // currently collapsed -> open it
        setCatOpen(block, willOpen);
        store.setCatCollapsed(g.category, !willOpen);
        updateToggleAllIcon();
      });
      block.appendChild(header);
      var pctCat = matching.length ? Math.round((solvedInCat / matching.length) * 100) : 0;
      block.appendChild(h("div", { class: "cat-prog" }, '<i style="width:' + pctCat + '%"></i>'));

      var outer = h("div", { class: "cat-list-outer" });
      if (collapsed) outer.style.height = "0px"; // start closed with no animation
      var list = h("div", { class: "cat-list" });
      matching.forEach(function (p) {
        var st = store.getStatus(p.id);
        var item = h("a", { class: "nav-item" + (p.id === state.currentId ? " active" : ""), href: "#" + p.id, "data-id": p.id });
        var imp = impOf(p);
        var impDot = imp === "occasional" ? "" :
          '<span class="ni-imp ' + IMP_META[imp].cls + '" title="' + IMP_META[imp].label + ' — interview importance">●</span>';
        item.innerHTML =
          '<span class="st st-' + st + '">' + STATUS_GLYPH[st] + "</span>" +
          '<span class="ni-title">' + esc(p.title) + "</span>" +
          (store.isReview(p.id) ? '<span class="ni-review" title="Flagged for review">★</span>' : "") +
          impDot +
          '<span class="ni-diff d-' + p.difficulty.toLowerCase() + '">' + p.difficulty.charAt(0) + "</span>";
        item.addEventListener("click", function (e) {
          e.preventDefault();
          navigate("#" + p.id);
        });
        list.appendChild(item);
      });
      outer.appendChild(list);
      block.appendChild(outer);
      nav.appendChild(block);
    });

    // Merged search: when the user is searching, surface matching Python topics
    // at the top of the nav so a query like "heap" finds both sides.
    if (state.query && state.query.trim() && window.PYLAB && window.PYLAB.search) {
      var pyHits = window.PYLAB.search(state.query).slice(0, 4);
      if (pyHits.length) {
        var xblock = h("div", { class: "nav-xsearch" });
        xblock.appendChild(h("div", { class: "nav-xsearch-head" }, "🐍 In Python for DSA"));
        pyHits.forEach(function (t) {
          var it = h("button", { class: "nav-xsearch-item" }, esc(t.title));
          it.addEventListener("click", function () { B.goToTopic(t.id); });
          xblock.appendChild(it);
        });
        nav.insertBefore(xblock, nav.firstChild);
      }
    }

    if (!nav.children.length) {
      nav.appendChild(h("div", { class: "nav-empty" }, "No problems match your search / filters."));
    }
    updateToggleAllIcon();
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
    if (lbl) lbl.textContent = state.setFilter === "blind75" ? "Blind 75" : "NeetCode 150";

    updateFilterCounts();

    // spaced-repetition due count (within the active set)
    var due = store.countDue(set.map(function (p) { return p.id; }));
    var rb = el("reviewDueBtn");
    if (rb) {
      rb.querySelector(".rd-count").textContent = due;
      rb.classList.toggle("has-due", due > 0);
      rb.disabled = due === 0;
      rb.title = due > 0 ? "Start a review session (" + due + " due)" : "No cards due for review";
    }
  }

  // ============================================================= CODE BLOCK
  // `ident` (optional) = { id, ai, mode } identifies a solution block so edits
  // can be locked/unlocked and persisted per problem+approach+mode. Blocks
  // without an ident (e.g. inline snippets) render read-only, exactly as before.
  function codeBlock(source, extraClass, ident) {
    var wrap = h("div", { class: "code-wrap " + (extraClass || "") });
    var bar = h("div", { class: "code-bar" });
    bar.appendChild(h("span", { class: "code-lang" }, "Python"));
    var actions = h("div", { class: "code-actions" });
    bar.appendChild(actions);
    var body = h("div", { class: "code-body" });
    wrap.appendChild(bar);
    wrap.appendChild(body);

    var editing = false; // lock state is per-block and starts LOCKED every render

    function savedEdit() {
      return ident ? store.getCodeEdit(ident.id, ident.ai, ident.mode) : null;
    }
    function currentSource() {
      var e = savedEdit();
      return e != null ? e : source;
    }

    function render() {
      body.innerHTML = "";
      actions.innerHTML = "";
      var edited = savedEdit() != null;

      if (edited) {
        actions.appendChild(h("span", { class: "code-edited", title: "This code was edited locally" }, "edited"));
        var reset = h("button", { class: "code-mini", title: "Restore the original code" }, "Reset");
        reset.addEventListener("click", function () {
          store.clearCodeEdit(ident.id, ident.ai, ident.mode);
          editing = false; render();
        });
        actions.appendChild(reset);
      }

      var ta; // textarea, only created in edit mode; referenced by Copy below

      if (ident) {
        var lock = h("button", { class: "code-mini lock" + (editing ? " on" : "") },
          editing ? "🔓 Editing" : "🔒 Locked");
        lock.title = editing ? "Lock to stop editing (changes are saved)" : "Unlock to edit this code";
        lock.addEventListener("click", function () { editing = !editing; render(); });
        actions.appendChild(lock);
      }

      var copy = h("button", { class: "copy-btn" }, "Copy");
      copy.addEventListener("click", function () {
        var text = editing && ta ? ta.value : currentSource();
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(flash, function () { fallbackCopy(text); flash(); });
        } else { fallbackCopy(text); flash(); }
        function flash() { copy.textContent = "Copied!"; setTimeout(function () { copy.textContent = "Copy"; }, 1200); }
      });
      actions.appendChild(copy);

      if (editing) {
        ta = h("textarea", { class: "code-edit", spellcheck: "false", wrap: "off", autocomplete: "off" });
        ta.value = currentSource();
        var fit = function () { ta.style.height = "auto"; ta.style.height = ta.scrollHeight + "px"; };
        ta.addEventListener("input", function () {
          fit();
          if (ta.value === source) store.clearCodeEdit(ident.id, ident.ai, ident.mode); // back to original
          else store.setCodeEdit(ident.id, ident.ai, ident.mode, ta.value);
          // (the "edited" badge appears when the block is locked again — a live
          //  re-render here would rebuild the textarea and drop the caret)
        });
        // preserve indentation on Enter / Tab for a real editing feel
        ta.addEventListener("keydown", function (e) {
          if (e.key === "Tab") {
            e.preventDefault();
            var s = ta.selectionStart, en = ta.selectionEnd;
            ta.value = ta.value.slice(0, s) + "    " + ta.value.slice(en);
            ta.selectionStart = ta.selectionEnd = s + 4;
            ta.dispatchEvent(new Event("input"));
          }
        });
        body.appendChild(ta);
        setTimeout(function () { fit(); ta.focus(); }, 0);
      } else {
        var pre = h("pre", { class: "code-pre" });
        var code = h("code", { class: "language-python" }, esc(currentSource()));
        pre.appendChild(code);
        body.appendChild(pre);
        if (window.Prism) window.Prism.highlightElement(code);
        addIndentGuides(code);
      }
    }

    render();
    return wrap;
  }

  // Draw VS-Code-style vertical indentation guides. Runs after Prism, so it
  // walks the highlighted HTML line by line and wraps each 4-space indent step
  // in a guide span. Leading indentation is always plain text (Prism never puts
  // it inside a token span) and none of the solutions use multi-line string
  // literals, so splitting on "\n" can't cut through a token — the markup stays
  // valid. Uses an inset box-shadow (see .ind-g) so the guide adds no width and
  // the code never drifts out of alignment.
  function addIndentGuides(codeEl) {
    var TAB = 4;
    var lines = codeEl.innerHTML.split("\n");
    for (var i = 0; i < lines.length; i++) {
      var m = /^( +)/.exec(lines[i]);
      if (!m) continue;
      var n = m[1].length, rest = lines[i].slice(n), out = "";
      for (var c = 0; c < n; c += TAB) {
        var w = Math.min(TAB, n - c);
        out += '<span class="ind-g">' + new Array(w + 1).join(" ") + "</span>";
      }
      lines[i] = out + rest;
    }
    codeEl.innerHTML = lines.join("\n");
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
    // outer wrapper enables a smooth grid-rows 1fr↔0fr height animation
    var outer = h("div", { class: "sec-body-outer" });
    var body = h("div", { class: "sec-body" });
    body.appendChild(bodyNode);
    outer.appendChild(body);
    head.addEventListener("click", function () {
      var willOpen = sec.classList.contains("collapsed");
      animateCollapse(sec, outer, willOpen);   // smooth px-height, same as the sidebar
    });
    sec.appendChild(head);
    sec.appendChild(outer);
    return sec;
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
        '<span class="ph-lc">#' + p.lc + "</span>" +
        '<span class="ph-diff d-' + p.difficulty.toLowerCase() + '">' + p.difficulty + "</span>" +
        '<span class="ph-imp ' + IMP_META[impOf(p)].cls + '" title="Interview importance (curated estimate)">' +
          IMP_META[impOf(p)].stars + " " + IMP_META[impOf(p)].label + "</span>" +
        '<span class="ph-cat">' + esc(p.category) + "</span>" +
        '<a class="ph-link" href="' + p.link + '" target="_blank" rel="noopener">LeetCode ↗</a>' +
      "</div>" +
      '<h1 class="ph-title">' + esc(p.title) + "</h1>";

    // status + actions row
    var actions = h("div", { class: "ph-actions" });
    var statusSel = h("div", { class: "status-group" });
    ["not-started", "learning", "solved"].forEach(function (s) {
      var b = h("button", { class: "status-btn st-" + s + (st === s ? " sel" : ""), "data-s": s },
        STATUS_GLYPH[s] + " " + STATUS_LABEL[s]);
      b.addEventListener("click", function () {
        var wasSolved = store.getStatus(p.id) === "solved";
        applyStatus(p.id, s);
        // update the selected state in place — avoids a full re-render (and its flash)
        var btns = statusSel.querySelectorAll(".status-btn");
        for (var k = 0; k < btns.length; k++) btns[k].classList.remove("sel");
        b.classList.add("sel");
        renderSidebar(); renderProgress();
        if (s === "solved" && !wasSolved) {
          toast(nextUnsolvedId(p.id) ? "Solved ✓ — press n for the next unsolved" : "Solved ✓ — all done! 🎉");
        }
        // refresh the Next CTA target in place (it may have pointed at this problem)
        var cta = document.querySelector(".cta-next");
        if (cta) {
          var nx = nextUnsolvedId(p.id);
          cta.textContent = nx ? "Next unsolved →" : "🎉 All solved";
          cta.classList.toggle("disabled", !nx);
        }
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

    // ---- smart study-loop CTAs: keep momentum after each problem ----
    var nextId = nextUnsolvedId(p.id);
    var nextBtn = h("button", { class: "chip-btn cta-next" + (nextId ? "" : " disabled") },
      nextId ? "Next unsolved →" : "🎉 All solved");
    if (nextId) nextBtn.addEventListener("click", function () { navigate("#" + nextId); });
    actions.appendChild(nextBtn);

    var dueCount = store.countDue(activeProblems().map(function (x) { return x.id; }));
    if (dueCount > 0) {
      var dueBtn = h("button", { class: "chip-btn cta-due" }, "⟳ Review due (" + dueCount + ")");
      dueBtn.addEventListener("click", openReview);
      actions.appendChild(dueBtn);
    }

    header.appendChild(actions);
    main.appendChild(header);

    // ---- metadata badge row ----
    var metaBox = h("div", { class: "meta-box" });
    var m = p.meta || {};
    var approach0 = p.approaches[0] || {};
    var metaItems = [
      ["Pattern", m.pattern],
      ["Data Structure", m.dataStructure],
      ["Technique", m.technique],
      ["Difficulty", p.difficulty],
      ["Time", approach0.time],
      ["Space", approach0.space]
    ];
    metaItems.forEach(function (it) {
      if (!it[1]) return;
      var cell = h("div", { class: "meta-cell" });
      cell.innerHTML = '<div class="meta-k">' + esc(it[0]) + "</div>";
      if (it[0] === "Pattern") {
        var tag = h("button", { class: "meta-v pattern-link", title: "Show all with this pattern" }, esc(it[1]));
        tag.addEventListener("click", function () {
          state.filterPattern = it[1];
          var pfSel = el("filterPattern"); if (pfSel) pfSel.value = it[1];
          state.query = ""; el("search").value = "";
          renderSidebar();
        });
        cell.appendChild(tag);
      } else {
        cell.appendChild(h("div", { class: "meta-v" }, esc(it[1])));
      }
      metaBox.appendChild(cell);
    });
    // importance cell (stars + tier)
    var impCell = h("div", { class: "meta-cell" });
    var impInfo = IMP_META[impOf(p)];
    impCell.innerHTML = '<div class="meta-k">Importance</div>' +
      '<div class="meta-v ' + impInfo.cls + '">' + impInfo.stars + " " + impInfo.label + "</div>";
    metaBox.appendChild(impCell);
    main.appendChild(metaBox);

    // ---- Python concepts used (reverse cross-link into the Python lab) ----
    var pySec = pythonConceptsSection(p);
    if (pySec) main.appendChild(pySec);

    // ---- spaced-repetition review ----
    main.appendChild(buildSrsSection(p));

    // ---- animation / visualization links (above the description) ----
    main.appendChild(buildLinksSection(p));

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
        var b = h("button", { class: "app-tab" + (i === ai ? " active" : "") },
          esc(a.name) + '<span class="app-cx">' + esc(a.time) + "</span>");
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
    var plainBtn = h("button", { class: "ct-btn" + (codeMode === "plain" ? " active" : "") }, "Plain Python");
    rcsBtn.addEventListener("click", function () { store.setPref("codeMode", "rcs"); renderProblem(); });
    plainBtn.addEventListener("click", function () { store.setPref("codeMode", "plain"); renderProblem(); });
    toggle.appendChild(rcsBtn); toggle.appendChild(plainBtn);
    var hint = h("span", { class: "code-hint" }, codeMode === "rcs" ? "Commented for revision" : "Clean — try to read it yourself");
    toggle.appendChild(hint);
    codeArea.appendChild(toggle);

    var source = codeMode === "rcs" ? cur.rcs : cur.plain;
    var cb = codeBlock(source, blur ? "blurred" : "", { id: p.id, ai: ai, mode: codeMode });
    if (blur) cb.appendChild(revealOverlay(cb));
    codeArea.appendChild(cb);

    if (cur.whenToUse) {
      codeArea.appendChild(h("div", { class: "when-use" }, "<strong>When to use:</strong> " + esc(cur.whenToUse)));
    }
    apWrap.appendChild(section("code", "Solution Code — " + (cur.name || "Approach"),
      codeArea, { badge: (cur.time || "") + " / " + (cur.space || "") }));

    main.appendChild(apWrap);

    // ---- Complexity summary (all approaches) ----
    var cxNode = h("div", { class: "cx-table" });
    approaches.forEach(function (a) {
      var row = h("div", { class: "cx-row" });
      row.innerHTML =
        '<span class="cx-name">' + esc(a.name) + "</span>" +
        '<span class="cx-time">Time <code>' + esc(a.time) + "</code></span>" +
        '<span class="cx-space">Space <code>' + esc(a.space) + "</code></span>";
      cxNode.appendChild(row);
    });
    main.appendChild(section("complexity", "Complexity", cxNode));

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
    if (prev) pbtn.addEventListener("click", function () { navigate("#" + prev.id); });
    var nbtn = h("button", { class: "nav-btn" + (next ? "" : " disabled") },
      next ? esc(next.title) + " →" : "End →");
    if (next) nbtn.addEventListener("click", function () { navigate("#" + next.id); });
    footer.appendChild(pbtn); footer.appendChild(nbtn);
    main.appendChild(footer);

    main.scrollTop = prevScroll;

    // Cross-fade the reading pane only on real navigation (not in-place toggles).
    if (preserveScroll === false) {
      main.classList.remove("nav-enter");
      void main.offsetWidth; // restart the animation
      main.classList.add("nav-enter");
    }
  }

  // ---- spaced repetition ----
  var GRADES = [
    { key: "again", label: "Again", hint: "Blanked / wrong", cls: "g-again" },
    { key: "hard", label: "Hard", hint: "Right, but a struggle", cls: "g-hard" },
    { key: "good", label: "Good", hint: "Recalled with effort", cls: "g-good" },
    { key: "easy", label: "Easy", hint: "Instant / trivial", cls: "g-easy" }
  ];

  function humanWhen(dueMs) {
    var day = 86400000;
    if (dueMs <= Date.now()) return "today";
    var start = new Date(); start.setHours(0, 0, 0, 0);
    var diff = Math.round((dueMs - start.getTime()) / day);
    if (diff <= 0) return "today";
    if (diff === 1) return "tomorrow";
    if (diff < 7) return "in " + diff + " days";
    if (diff < 30) return "in " + Math.round(diff / 7) + " week" + (diff < 14 ? "" : "s");
    return "in " + Math.round(diff / 30) + " month" + (diff < 60 ? "" : "s");
  }

  function buildSrsSection(p) {
    var wrap = h("div", { class: "srs-wrap" });
    var rec = store.getSrs(p.id);

    var statusLine = h("div", { class: "srs-status" });
    if (!rec) {
      statusLine.innerHTML = '<span class="srs-badge srs-new">New</span> ' +
        '<span class="muted">Not in your review schedule yet. Grade your recall to start spaced repetition.</span>';
    } else {
      var due = store.isDue(p.id);
      var when = humanWhen(rec.due);
      statusLine.innerHTML =
        '<span class="srs-badge ' + (due ? "srs-due" : "srs-ok") + '">' + (due ? "Due now" : "Scheduled") + "</span> " +
        '<span class="muted">Next review <b class="srs-when">' + when + "</b>" +
        " · " + rec.reps + " review" + (rec.reps === 1 ? "" : "s") +
        (rec.lapses ? " · " + rec.lapses + " lapse" + (rec.lapses === 1 ? "" : "s") : "") +
        "</span>";
    }
    wrap.appendChild(statusLine);

    var hint = h("div", { class: "srs-hint muted" },
      "How well did you recall the full approach? Your rating schedules the next review.");
    wrap.appendChild(hint);

    var row = h("div", { class: "srs-grades" });
    GRADES.forEach(function (g) {
      // preview the interval this grade would produce
      var btn = h("button", { class: "srs-grade " + g.cls, title: g.hint });
      btn.innerHTML = '<span class="sg-label">' + g.label + "</span>" +
        '<span class="sg-hint">' + g.hint + "</span>";
      btn.addEventListener("click", function () {
        var nrec = store.reviewCard(p.id, g.key);
        // grading implies you've studied it — nudge status to at least "learning"
        if (store.getStatus(p.id) === "not-started") applyStatus(p.id, "learning");
        renderProblem(); renderSidebar(); renderProgress();
        toast("Scheduled — next review " + humanWhen(nrec.due) + ".");
      });
      row.appendChild(btn);
    });
    wrap.appendChild(row);

    return section("srs", "Spaced Repetition Review", wrap,
      { badge: rec ? (store.isDue(p.id) ? "Due" : humanWhen(rec.due)) : "New" });
  }

  // small transient toast
  var toastTimer;
  function toast(msg) {
    var t = el("toast");
    if (!t) {
      t = h("div", { class: "toast", id: "toast" });
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, 1800);
  }

  function buildLinksSection(p) {
    var linksWrap = h("div", { class: "links-wrap" });
    linksWrap.appendChild(h("div", { class: "links-hint" },
      "Two animation/visualization links come pre-filled (CodeDive and AlgoMaster). Edit either field to save your own link to this browser instead; click Open to launch in a new tab."));
    var savedLinks = store.getLinks(p.id);
    var defaultLinks = (window.BLIND75.REF_LINKS && window.BLIND75.REF_LINKS[p.lc]) || [];
    for (var li = 0; li < 2; li++) {
      (function (idx) {
        var row = h("div", { class: "link-row" });
        var nameIn = h("input", { class: "link-name", type: "text", placeholder: "Label (optional)" });
        var urlIn = h("input", { class: "link-url", type: "url", placeholder: "https://…  animation link" });
        var open = h("a", { class: "link-open", target: "_blank", rel: "noopener" }, "Open ↗");
        var saved = savedLinks[idx];
        var hasSaved = saved && (saved.url || saved.name);
        var cur = hasSaved ? saved : (defaultLinks[idx] || { name: "", url: "" });
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
  // Next problem (in the active set's order) that isn't solved yet; wraps around.
  // Returns null when everything in the set is solved.
  function nextUnsolvedId(fromId) {
    var list = activeProblems();
    if (!list.length) return null;
    var start = list.findIndex(function (p) { return p.id === fromId; });
    if (start < 0) start = -1;
    for (var off = 1; off <= list.length; off++) {
      var p = list[(start + off) % list.length];
      if (store.getStatus(p.id) !== "solved") return p.id;
    }
    return null;
  }

  // Pure renderer for a problem — history is managed by navigate()/applyRoute().
  function selectProblem(id) {
    state.currentId = id;
    renderProblem(false);
    // Just move the active highlight instead of rebuilding the whole list — the
    // active state transitions smoothly and no in-progress collapse animation
    // or scroll position is thrown away. Fall back to a full render if the newly
    // selected item isn't in the current filtered list.
    var nav = el("nav");
    var next = nav.querySelector('.nav-item[data-id="' + id + '"]');
    if (next) {
      var cur = nav.querySelector(".nav-item.active");
      if (cur && cur !== next) cur.classList.remove("active");
      next.classList.add("active");
      next.scrollIntoView({ block: "nearest" });
    } else {
      renderSidebar();
    }
  }

  // ============================================================= REVISION GRID
  function openGrid() {
    var modal = el("gridModal");
    var body = el("gridBody");
    body.innerHTML = "";
    var table = h("table", { class: "grid-table" });
    table.innerHTML = "<thead><tr><th>#</th><th>Problem</th><th>Category</th><th>Difficulty</th>" +
      "<th>Importance</th><th>Pattern</th><th>Time</th><th>Space</th><th>Status</th></tr></thead>";
    var tbody = h("tbody");
    activeProblems().forEach(function (p) {
      var a0 = p.approaches[p.approaches.length - 1] || {};
      var stt = store.getStatus(p.id);
      var tr = h("tr", { class: "grid-row" });
      tr.innerHTML =
        "<td>" + p.lc + "</td>" +
        '<td class="g-title">' + esc(p.title) + "</td>" +
        "<td>" + esc(p.category) + "</td>" +
        '<td class="d-' + p.difficulty.toLowerCase() + '">' + p.difficulty + "</td>" +
        '<td class="' + IMP_META[impOf(p)].cls + '" title="' + IMP_META[impOf(p)].label + '">' + IMP_META[impOf(p)].stars + "</td>" +
        "<td>" + esc((p.meta && p.meta.pattern) || "") + "</td>" +
        "<td><code>" + esc(a0.time || "") + "</code></td>" +
        "<td><code>" + esc(a0.space || "") + "</code></td>" +
        '<td class="st st-' + stt + '">' + STATUS_GLYPH[stt] + "</td>";
      tr.addEventListener("click", function () { closeModal("gridModal"); navigate("#" + p.id); });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    body.appendChild(table);
    openModal("gridModal");
  }

  // ============================================================= REVIEW SESSION
  function openReview() {
    var body = el("reviewBody");
    // due cards in the active set, soonest-due first
    var queue = activeProblems().filter(function (p) { return store.isDue(p.id); })
      .sort(function (a, b) { return store.getSrs(a.id).due - store.getSrs(b.id).due; });
    var startTotal = queue.length;
    var done = 0;

    function renderCard() {
      body.innerHTML = "";
      if (!queue.length) {
        var d = h("div", { class: "rv-done" });
        d.innerHTML = "<div class='rv-done-emoji'>✓</div>" +
          "<h3>Review complete</h3>" +
          "<p class='muted'>" + (startTotal ? "You reviewed " + startTotal + " card" + (startTotal === 1 ? "" : "s") + "." : "Nothing was due.") +
          " Come back tomorrow for the next batch.</p>";
        var close = h("button", { class: "ghost-btn" }, "Close");
        close.addEventListener("click", function () { closeModal("reviewModal"); });
        d.appendChild(close);
        body.appendChild(d);
        return;
      }
      var p = queue[0];
      var a = p.approaches[p.approaches.length - 1] || {};
      var card = h("div", { class: "rv-card" });

      var prog = h("div", { class: "rv-progress" });
      prog.innerHTML = "<span>" + (done + 1) + " / " + (done + queue.length) + "</span>" +
        "<div class='rv-track'><div class='rv-fill' style='width:" +
        (startTotal ? Math.round((done / startTotal) * 100) : 0) + "%'></div></div>";
      card.appendChild(prog);

      var q = h("div", { class: "rv-q" });
      q.innerHTML =
        "<div class='rv-meta'><span class='ph-lc'>#" + p.lc + "</span>" +
        "<span class='ph-diff d-" + p.difficulty.toLowerCase() + "'>" + p.difficulty + "</span>" +
        "<span class='ph-cat'>" + esc(p.category) + "</span></div>" +
        "<h2 class='rv-title'>" + esc(p.title) + "</h2>" +
        "<p class='muted'>Recall the approach and its complexity before revealing.</p>";
      card.appendChild(q);

      var answer = h("div", { class: "rv-answer blurred" });
      answer.innerHTML =
        "<div class='rv-a-row'><span class='rv-a-k'>Pattern</span><span class='rv-a-v'>" + esc((p.meta && p.meta.pattern) || "—") + "</span></div>" +
        "<div class='rv-a-row'><span class='rv-a-k'>Approach</span><span class='rv-a-v'>" + esc(a.name || "—") + "</span></div>" +
        "<div class='rv-a-row'><span class='rv-a-k'>Time</span><span class='rv-a-v mono'>" + esc(a.time || "—") + "</span></div>" +
        "<div class='rv-a-row'><span class='rv-a-k'>Space</span><span class='rv-a-v mono'>" + esc(a.space || "—") + "</span></div>";
      var reveal = h("button", { class: "rv-reveal" }, "👁 Reveal answer");
      reveal.addEventListener("click", function () { answer.classList.remove("blurred"); reveal.remove(); grades.classList.add("show"); });
      card.appendChild(reveal);
      card.appendChild(answer);

      var open = h("button", { class: "rv-open" }, "Open full problem ↗");
      open.addEventListener("click", function () { closeModal("reviewModal"); navigate("#" + p.id); });
      card.appendChild(open);

      var grades = h("div", { class: "srs-grades rv-grades" });
      GRADES.forEach(function (g) {
        var btn = h("button", { class: "srs-grade " + g.cls, title: g.hint });
        btn.innerHTML = "<span class='sg-label'>" + g.label + "</span><span class='sg-hint'>" + g.hint + "</span>";
        btn.addEventListener("click", function () {
          store.reviewCard(p.id, g.key);
          if (store.getStatus(p.id) === "not-started") applyStatus(p.id, "learning");
          queue.shift(); done++;
          renderCard();
          renderSidebar(); renderProgress();
        });
        grades.appendChild(btn);
      });
      card.appendChild(grades);
      body.appendChild(card);
    }

    renderCard();
    openModal("reviewModal");
  }

  // ============================================================= DASHBOARD
  function bar(label, value, total, cls) {
    var pct = total ? Math.round((value / total) * 100) : 0;
    var row = h("div", { class: "db-bar-row" });
    row.innerHTML =
      "<div class='db-bar-label'>" + esc(label) + "</div>" +
      "<div class='db-bar-track'><div class='db-bar-fill " + (cls || "") + "' style='width:" + pct + "%'></div></div>" +
      "<div class='db-bar-val'>" + value + "/" + total + "</div>";
    return row;
  }

  // ---- cross-stack readiness (M5.1) ----
  function dashPracticeReg(stack) {
    if (stack === "python") return window.BLIND75;
    if (stack === "sql") return window.SQLLAB;
    if (stack === "spark") return window.PYSPARK;
    if (stack === "numpy") return window.NUMPY;
    if (stack === "pandas") return window.PANDAS;
    return null;
  }
  function dashLearnStats(stack) {
    var ids = [];
    if (stack === "python") {
      ids = ((window.PYDSA && window.PYDSA.all()) || []).map(function (t) { return t.id; });
    } else if (window.LEARN && window.LEARN.hasContent && window.LEARN.hasContent(stack)) {
      ids = window.LEARN.all(stack).map(function (t) { return "learn:" + stack + ":" + t.id; });
    }
    return { total: ids.length, done: store.countPy(ids, "learned") + store.countPy(ids, "mastered"), pct: store.pyReadiness(ids) };
  }
  function dashPracticeStats(stack) {
    var reg = dashPracticeReg(stack);
    if (!reg || !reg.all) return { total: 0, solved: 0, pct: 0, due: 0, has: false };
    var ids = reg.all().map(function (p) { return stack === "python" ? p.id : stack + ":" + p.id; });
    var solved = 0;
    for (var i = 0; i < ids.length; i++) if (store.getStatus(ids[i]) === "solved") solved++;
    return { total: ids.length, solved: solved, pct: ids.length ? Math.round((solved / ids.length) * 100) : 0, due: store.countDue(ids), has: true };
  }
  function miniRing(pct, label, sub) {
    var wrap = h("div", { class: "xs-metric" });
    wrap.innerHTML =
      '<div class="py-ready-ring xs-ring" style="--pct:' + pct + '"><span>' + pct + '%</span></div>' +
      '<div class="xs-metric-txt"><div class="xs-metric-k">' + esc(label) + '</div><div class="xs-metric-sub muted">' + esc(sub) + '</div></div>';
    return wrap;
  }
  function renderCrossStack(body) {
    var block = h("div", { class: "db-block db-overview" });
    block.appendChild(h("h3", null, "Your progress across the stack"));
    var grid = h("div", { class: "xstack-grid" });
    var tConceptsDone = 0, tConcepts = 0, tSolved = 0, tProblems = 0, tDue = 0;
    STACK_KEYS.forEach(function (stack) {
      var L = dashLearnStats(stack), P = dashPracticeStats(stack);
      tConceptsDone += L.done; tConcepts += L.total;
      tSolved += P.solved; tProblems += P.total; tDue += P.due;
      var card = h("button", { class: "xstack-card", "data-stack": stack, title: "Open " + STACK_LABEL[stack] });
      var head = h("div", { class: "xs-head" });
      head.innerHTML = '<span class="xs-name">' + esc(STACK_LABEL[stack]) + '</span>' +
        (P.due ? '<span class="xs-due">' + P.due + ' due</span>' : '');
      card.appendChild(head);
      var rings = h("div", { class: "xs-rings" });
      if (L.total) rings.appendChild(miniRing(L.pct, "Learn", L.done + "/" + L.total + " topics"));
      if (P.has) rings.appendChild(miniRing(P.pct, "Practice", P.solved + "/" + P.total + " solved"));
      if (!L.total && !P.has) rings.appendChild(h("div", { class: "xs-metric muted" }, "coming soon"));
      card.appendChild(rings);
      card.addEventListener("click", function () {
        closeModal("dashModal");
        var mode = hasPractice(stack) ? "practice" : "learn";
        B.goTo(mode, stack, null);
      });
      grid.appendChild(card);
    });
    block.appendChild(grid);
    var overall = h("div", { class: "xs-overall muted" });
    overall.innerHTML = "<b>" + tConceptsDone + "</b>/" + tConcepts + " concepts learned · <b>" +
      tSolved + "</b>/" + tProblems + " problems solved" + (tDue ? " · <b>" + tDue + "</b> due for review" : "");
    block.appendChild(overall);
    body.appendChild(block);
  }

  function openDashboard() {
    var body = el("dashBody");
    body.innerHTML = "";
    renderCrossStack(body);
    body.appendChild(h("div", { class: "db-section-label" }, "Python · DSA — detailed breakdown"));
    var set = activeProblems();
    var ids = set.map(function (p) { return p.id; });
    var solved = 0, learning = 0, notStarted = 0, reviewFlag = 0;
    set.forEach(function (p) {
      var s = store.getStatus(p.id);
      if (s === "solved") solved++; else if (s === "learning") learning++; else notStarted++;
      if (store.isReview(p.id)) reviewFlag++;
    });
    var due = store.countDue(ids);
    var scheduled = ids.filter(function (id) { return store.isScheduled(id); }).length;
    var streak = store.currentStreak();

    // ---- headline stat cards ----
    var stats = h("div", { class: "db-stats" });
    [
      ["Solved", solved + " / " + set.length, "of the " + (state.setFilter === "blind75" ? "Blind 75" : "NeetCode 150"), "stat-solved"],
      ["Learning", learning, "in progress"],
      ["Not started", notStarted, "remaining"],
      ["Day streak", (streak ? "🔥 " : "") + streak + (streak === 1 ? " day" : " days"), streak ? "keep it going" : "study today to start", "stat-streak"],
      ["Due now", due, scheduled + " scheduled"],
      ["Flagged", reviewFlag, "starred for review"]
    ].forEach(function (s) {
      var c = h("div", { class: "db-stat" + (s[3] ? " " + s[3] : "") });
      c.innerHTML = "<div class='db-stat-v'>" + esc(String(s[1])) + "</div>" +
        "<div class='db-stat-k'>" + esc(s[0]) + "</div>" +
        "<div class='db-stat-sub muted'>" + esc(s[2]) + "</div>";
      stats.appendChild(c);
    });
    body.appendChild(stats);

    // ---- by difficulty ----
    var diffWrap = h("div", { class: "db-block" });
    diffWrap.appendChild(h("h3", null, "By difficulty"));
    ["Easy", "Medium", "Hard"].forEach(function (d) {
      var inD = set.filter(function (p) { return p.difficulty === d; });
      var sv = inD.filter(function (p) { return store.getStatus(p.id) === "solved"; }).length;
      diffWrap.appendChild(bar(d, sv, inD.length, "d-fill-" + d.toLowerCase()));
    });
    body.appendChild(diffWrap);

    // ---- by importance ----
    var impWrap = h("div", { class: "db-block" });
    impWrap.appendChild(h("h3", null, "By interview importance"));
    ["essential", "common", "occasional"].forEach(function (tier) {
      var inT = set.filter(function (p) { return impOf(p) === tier; });
      var sv = inT.filter(function (p) { return store.getStatus(p.id) === "solved"; }).length;
      impWrap.appendChild(bar(IMP_META[tier].stars + " " + IMP_META[tier].label, sv, inT.length, "imp-fill-" + tier));
    });
    body.appendChild(impWrap);

    // ---- by category (weakest first) ----
    var catWrap = h("div", { class: "db-block" });
    catWrap.appendChild(h("h3", null, "By category — weakest first"));
    var cats = B.byCategory().map(function (g) {
      var inSet = g.problems.filter(inActiveSet);
      var sv = inSet.filter(function (p) { return store.getStatus(p.id) === "solved"; }).length;
      return { name: g.category, solved: sv, total: inSet.length };
    }).filter(function (c) { return c.total > 0; });
    cats.sort(function (a, b) { return (a.solved / a.total) - (b.solved / b.total); });
    cats.forEach(function (c) {
      var row = bar(c.name, c.solved, c.total);
      if (c.solved / c.total < 0.5) row.classList.add("db-weak");
      catWrap.appendChild(row);
    });
    body.appendChild(catWrap);

    // ---- by pattern (top, weakest first) ----
    var patMap = {};
    set.forEach(function (p) {
      var pat = p.meta && p.meta.pattern; if (!pat) return;
      if (!patMap[pat]) patMap[pat] = { solved: 0, total: 0 };
      patMap[pat].total++;
      if (store.getStatus(p.id) === "solved") patMap[pat].solved++;
    });
    var pats = Object.keys(patMap).map(function (k) { return { name: k, solved: patMap[k].solved, total: patMap[k].total }; });
    if (pats.length) {
      pats.sort(function (a, b) { return (a.solved / a.total) - (b.solved / b.total) || b.total - a.total; });
      var patWrap = h("div", { class: "db-block" });
      patWrap.appendChild(h("h3", null, "By pattern"));
      pats.slice(0, 12).forEach(function (c) {
        var row = bar(c.name, c.solved, c.total);
        if (c.solved / c.total < 0.5) row.classList.add("db-weak");
        patWrap.appendChild(row);
      });
      body.appendChild(patWrap);
    }

    // ---- activity heatmap (last 26 weeks) ----
    var heatWrap = h("div", { class: "db-block" });
    heatWrap.appendChild(h("h3", null, "Activity — last 26 weeks"));
    heatWrap.appendChild(buildHeatmap());
    body.appendChild(heatWrap);

    openModal("dashModal");
  }

  function buildHeatmap() {
    var act = store.activityMap();
    var day = 86400000;
    var weeks = 26;
    var today = new Date(); today.setHours(0, 0, 0, 0);
    // start on the Sunday of the earliest visible week
    var startBack = weeks * 7 - 1;
    var start = new Date(today.getTime() - startBack * day);
    start = new Date(start.getTime() - start.getDay() * day); // back to Sunday
    var grid = h("div", { class: "heat-grid" });
    var max = 0;
    for (var k in act) if (act[k] > max) max = act[k];
    function ds(dObj) {
      var m = dObj.getMonth() + 1, dd = dObj.getDate();
      return dObj.getFullYear() + "-" + (m < 10 ? "0" : "") + m + "-" + (dd < 10 ? "0" : "") + dd;
    }
    var cols = h("div", { class: "heat-cols" });
    var cur = new Date(start.getTime());
    while (cur.getTime() <= today.getTime()) {
      var col = h("div", { class: "heat-col" });
      for (var r = 0; r < 7; r++) {
        var future = cur.getTime() > today.getTime();
        var count = act[ds(cur)] || 0;
        var level = count === 0 ? 0 : (max <= 1 ? 1 : Math.min(4, Math.ceil((count / max) * 4)));
        var cell = h("div", { class: "heat-cell l" + level + (future ? " heat-future" : "") });
        if (!future) cell.title = ds(cur) + " · " + count + " action" + (count === 1 ? "" : "s");
        col.appendChild(cell);
        cur = new Date(cur.getTime() + day);
      }
      cols.appendChild(col);
    }
    grid.appendChild(cols);
    var legend = h("div", { class: "heat-legend muted" });
    legend.innerHTML = "Less <span class='heat-cell l0'></span><span class='heat-cell l1'></span>" +
      "<span class='heat-cell l2'></span><span class='heat-cell l3'></span><span class='heat-cell l4'></span> More";
    grid.appendChild(legend);
    return grid;
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
    if (nav) { nav.classList.remove("nav-flip"); void nav.offsetWidth; nav.classList.add("nav-flip"); }
  }

  function wireControls() {
    var search = el("search");
    search.addEventListener("input", function () {
      if (state.stack === "python" && state.mode === "practice") { state.query = search.value; renderSidebar(); }
      else if (state.stack === "python" && state.mode === "learn") { if (window.PYLAB && window.PYLAB.onSearch) window.PYLAB.onSearch(search.value); }
      else if (state.mode === "practice") { if (window.ProblemLab) window.ProblemLab.onSearch(search.value); }
      else { if (window.ConceptLab) window.ConceptLab.onSearch(search.value); }
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

    el("filterDifficulty").addEventListener("change", function (e) { state.filterDifficulty = e.target.value; renderSidebar(); });
    el("filterStatus").addEventListener("change", function (e) { state.filterStatus = e.target.value; renderSidebar(); });

    var pf = el("filterPattern");
    if (pf) {
      allPatterns().forEach(function (pat) { pf.appendChild(h("option", { value: pat }, pat)); });
      pf.addEventListener("change", function (e) { state.filterPattern = e.target.value; renderSidebar(); });
    }

    var impf = el("filterImportance");
    if (impf) impf.addEventListener("change", function (e) { state.filterImportance = e.target.value; renderSidebar(); });

    // filter panel show/hide toggle
    var filterPanel = el("filterPanel");
    var filterToggle = el("filterToggle");
    function setFiltersOpen(open) {
      filterPanel.classList.toggle("collapsed", !open);
      filterToggle.classList.toggle("active", open);
      filterToggle.setAttribute("aria-expanded", open ? "true" : "false");
      store.setPref("filtersOpen", open);
    }
    if (filterToggle) filterToggle.addEventListener("click", function () {
      setFiltersOpen(filterPanel.classList.contains("collapsed"));
    });

    // expand / collapse all categories
    function setAllCollapsed(collapsed) {
      B.byCategory().forEach(function (g) { store.setCatCollapsed(g.category, collapsed); });
      // Animate every currently-rendered block at once rather than rebuilding.
      var nav = el("nav");
      var blocks = nav.querySelectorAll(".cat-block");
      if (blocks.length) {
        for (var i = 0; i < blocks.length; i++) setCatOpen(blocks[i], !collapsed);
      } else {
        renderSidebar();
      }
    }
    // one button toggles all categories: collapse them if any is open, else expand
    var toggleAllBtn = el("toggleAll");
    if (toggleAllBtn) toggleAllBtn.addEventListener("click", function () {
      if (state.stack === "python" && state.mode === "practice") {
        var groups = B.byCategory();
        var allCollapsed = groups.every(function (g) { return store.isCatCollapsed(g.category); });
        setAllCollapsed(!allCollapsed);                                   // DSA (animated)
      } else if (state.mode === "practice") {
        if (window.ProblemLab) window.ProblemLab.toggleAll();            // SQL/PySpark/NumPy/Pandas practice
      } else {
        if (window.ConceptLab) window.ConceptLab.toggleAll();           // SQL/PySpark/NumPy/Pandas learn
      }
      updateToggleAllIcon();
    });

    el("clearFilters").addEventListener("click", function () {
      state.query = ""; state.filterDifficulty = "all"; state.filterStatus = "all"; state.filterPattern = "all"; state.filterImportance = "all";
      search.value = ""; el("filterDifficulty").value = "all"; el("filterStatus").value = "all";
      if (pf) pf.value = "all";
      if (impf) impf.value = "all";
      renderSidebar();
    });

    // theme
    var themeBtn = el("themeBtn");
    applyTheme(store.getPref("theme"));
    // stack switch (Python · NumPy · Pandas · PySpark · SQL)
    var stackBtns = document.querySelectorAll("#stackSwitch .ws-btn");
    for (var wi = 0; wi < stackBtns.length; wi++) {
      stackBtns[wi].addEventListener("click", function () {
        var stack = this.getAttribute("data-stack");
        if (stack === state.stack) return;
        goStack(stack);
      });
    }
    // mode switch (Learn · Practice)
    var modeBtns = document.querySelectorAll("#modeSwitch .mode-btn");
    for (var mi = 0; mi < modeBtns.length; mi++) {
      modeBtns[mi].addEventListener("click", function () {
        var mode = this.getAttribute("data-mode");
        if (mode === state.mode || this.disabled) return;
        goMode(mode);
      });
    }

    themeBtn.addEventListener("click", function () {
      var next = store.getPref("theme") === "dark" ? "light" : "dark";
      store.setPref("theme", next);
      applyTheme(next);
    });

    // grid
    el("gridBtn").addEventListener("click", openGrid);
    el("gridClose").addEventListener("click", function () { closeModal("gridModal"); });
    el("gridModal").addEventListener("click", function (e) { if (e.target === el("gridModal")) closeModal("gridModal"); });

    // dashboard
    var dashBtn = el("dashBtn");
    if (dashBtn) dashBtn.addEventListener("click", openDashboard);
    el("dashClose").addEventListener("click", function () { closeModal("dashModal"); });
    el("dashModal").addEventListener("click", function (e) { if (e.target === el("dashModal")) closeModal("dashModal"); });

    // review session
    var reviewDueBtn = el("reviewDueBtn");
    if (reviewDueBtn) reviewDueBtn.addEventListener("click", function () { if (!reviewDueBtn.disabled) openReview(); });
    el("reviewClose").addEventListener("click", function () { closeModal("reviewModal"); });
    el("reviewModal").addEventListener("click", function (e) { if (e.target === el("reviewModal")) closeModal("reviewModal"); });

    var scClose = el("shortcutsClose");
    if (scClose) scClose.addEventListener("click", function () { closeModal("shortcutsModal"); });
    var scModal = el("shortcutsModal");
    if (scModal) scModal.addEventListener("click", function (e) { if (e.target === scModal) closeModal("shortcutsModal"); });
    var scBtn = el("shortcutsBtn");
    if (scBtn) scBtn.addEventListener("click", openShortcuts);

    // settings popover (⋯) — declutters the toolbar
    var settingsBtn = el("settingsBtn"), settingsMenu = el("settingsMenu");
    function closeSettings() { if (!settingsMenu) return; settingsMenu.classList.add("hidden"); settingsBtn.setAttribute("aria-expanded", "false"); }
    function toggleSettings() {
      if (!settingsMenu) return;
      var open = settingsMenu.classList.toggle("hidden") === false;
      settingsBtn.setAttribute("aria-expanded", open ? "true" : "false");
    }
    if (settingsBtn) settingsBtn.addEventListener("click", function (e) { e.stopPropagation(); toggleSettings(); });
    if (settingsMenu) {
      settingsMenu.addEventListener("click", function (e) {
        // clicks on an actionable item close the menu (import stays open only via file dialog)
        if (e.target.closest(".menu-item")) closeSettings();
      });
    }
    document.addEventListener("click", function (e) {
      if (settingsMenu && !settingsMenu.classList.contains("hidden") &&
          !settingsMenu.contains(e.target) && e.target !== settingsBtn) closeSettings();
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeSettings(); });
    var scMenuBtn = el("scMenuBtn");
    if (scMenuBtn) scMenuBtn.addEventListener("click", openShortcuts);
    var welcomeBtn = el("welcomeBtn");
    if (welcomeBtn) welcomeBtn.addEventListener("click", function () { if (window.ONBOARD) window.ONBOARD.open(); });

    // export / import / reset
    el("exportBtn").addEventListener("click", function () {
      var blob = new Blob([store.exportJSON()], { type: "application/json" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url; a.download = "blind75-progress.json";
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

    // sidebar toggle — off-canvas drawer on mobile, collapse-to-full-width on desktop
    el("menuBtn").addEventListener("click", function () {
      if (window.matchMedia("(max-width: 900px)").matches) {
        document.body.classList.toggle("sidebar-open");
      } else {
        var collapsed = !document.body.classList.contains("sidebar-collapsed");
        document.body.classList.toggle("sidebar-collapsed", collapsed);
        store.setPref("sidebarCollapsed", collapsed);
      }
    });
    // tapping the scrim (or a nav item) closes the mobile drawer
    var scrim = el("drawerScrim");
    if (scrim) scrim.addEventListener("click", function () { document.body.classList.remove("sidebar-open"); });

    // keyboard nav
    document.addEventListener("keydown", function (e) {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") {
        if (e.key === "Escape") e.target.blur();
        return;
      }
      if (e.key === "?" || (e.key === "/" && e.shiftKey)) { e.preventDefault(); openShortcuts(); return; }
      if (e.key === "/") { e.preventDefault(); search.focus(); return; }
      if (e.key === "Escape") {
        closeModal("gridModal");
        closeModal("dashModal");
        closeModal("reviewModal");
        closeModal("shortcutsModal");
        return;
      }
      if (e.key === "g" || e.key === "G") { e.preventDefault(); goMode(state.mode === "learn" ? "practice" : "learn"); return; }
      // [ / ] step through problems in any Practice view
      if ((e.key === "[" || e.key === "]") && state.mode === "practice") {
        var d = e.key === "]" ? 1 : -1;
        if (state.stack !== "python") {
          if (window.ProblemLab) { e.preventDefault(); d > 0 ? window.ProblemLab.next() : window.ProblemLab.prev(); }
          return;
        }
        var pi = ALL.findIndex(function (x) { return x.id === state.currentId; });
        if (ALL[pi + d]) { e.preventDefault(); navigate("#" + ALL[pi + d].id); }
        return;
      }
      if (!(state.stack === "python" && state.mode === "practice")) return; // remaining shortcuts are DSA-only
      var idx = ALL.findIndex(function (x) { return x.id === state.currentId; });
      if (e.key === "j" || e.key === "ArrowDown") { if (ALL[idx + 1]) { e.preventDefault(); navigate("#" + ALL[idx + 1].id); } }
      if (e.key === "k" || e.key === "ArrowUp") { if (ALL[idx - 1]) { e.preventDefault(); navigate("#" + ALL[idx - 1].id); } }
      if (e.key === "n") { var nx = nextUnsolvedId(state.currentId); if (nx) { e.preventDefault(); navigate("#" + nx); } }
      if (e.key === "r") { store.setPref("codeMode", "rcs"); renderProblem(); }
      if (e.key === "p") { store.setPref("codeMode", "plain"); renderProblem(); }
      if (e.key === "b") { store.setPref("blur", !store.getPref("blur")); renderProblem(); }
      if (e.key === "d") { openDashboard(); }
      if (e.key === "1") { setStatusShortcut("not-started"); }
      if (e.key === "2") { setStatusShortcut("learning"); }
      if (e.key === "3") { setStatusShortcut("solved"); }
    });
  }

  function setStatusShortcut(s) {
    var wasSolved = store.getStatus(state.currentId) === "solved";
    applyStatus(state.currentId, s);
    renderProblem(); renderSidebar(); renderProgress();
    if (s === "solved" && !wasSolved) {
      toast(nextUnsolvedId(state.currentId) ? "Solved ✓ — press n for the next unsolved" : "Solved ✓ — all done! 🎉");
    }
  }

  // Keyboard shortcut cheatsheet (opened with ?)
  function openShortcuts() {
    var body = el("shortcutsBody");
    if (body) {
      var rows = [
        ["/", "Focus search"],
        ["j  /  ↓", "Next problem"],
        ["k  /  ↑", "Previous problem"],
        ["n", "Jump to next unsolved problem"],
        ["1  2  3", "Mark not-started / learning / solved"],
        ["r  /  p", "Show RCS code / Plain code"],
        ["b", "Toggle recall (blur) mode"],
        ["d", "Open progress dashboard"],
        ["g", "Switch DSA ↔ Python for DSA"],
        ["?", "Show this help"],
        ["Esc", "Close dialog / unfocus field"]
      ];
      body.innerHTML = '<div class="kbd-list">' + rows.map(function (r) {
        return '<div class="kbd-row"><kbd>' + esc(r[0]) + "</kbd><span>" + esc(r[1]) + "</span></div>";
      }).join("") + "</div>";
    }
    openModal("shortcutsModal");
  }

  // Set status and, on a fresh transition to "solved", log a day of activity.
  function applyStatus(id, s) {
    var prev = store.getStatus(id);
    store.setStatus(id, s);
    if (s === "solved" && prev !== "solved") store.logSolve();
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    el("themeBtn").textContent = theme === "dark" ? "☀ Light theme" : "☾ Dark theme";
  }

  // ============================================================= WORKSPACE / ROUTER
  // Set the shell "chrome" (state, body attrs, switch highlights) WITHOUT
  // rendering — the router decides what to render. `data-ws` is the legacy CSS key
  // (dsa = full problem chrome; python = everything hidden so a lab paints its
  // own nav); `data-stack`/`data-mode` drive the new accent + switch styling.
  function setChrome(stack, mode) {
    state.stack = stack;
    state.mode = mode;
    var ws = (stack === "python" && mode === "practice") ? "dsa" : "python";
    state.workspace = ws;
    store.setPref("workspace", ws);
    store.setPref("lastStack", stack);
    store.setPref("lastModeFor_" + stack, mode);
    document.body.setAttribute("data-ws", ws);
    document.body.setAttribute("data-stack", stack);
    document.body.setAttribute("data-mode", mode);

    var sb = document.querySelectorAll("#stackSwitch .ws-btn");
    for (var i = 0; i < sb.length; i++) sb[i].classList.toggle("active", sb[i].getAttribute("data-stack") === stack);
    var mb = document.querySelectorAll("#modeSwitch .mode-btn");
    for (var j = 0; j < mb.length; j++) {
      var mm = mb[j].getAttribute("data-mode");
      mb[j].classList.toggle("active", mm === mode);
      var ok = modeAvailable(stack, mm);
      mb[j].classList.toggle("soon", !ok);
      mb[j].disabled = !ok;
      mb[j].title = ok ? "" : (STACK_LABEL[stack] + " " + (mm === "learn" ? "concepts" : "problems") + " — coming soon");
    }
  }

  // The single router: render whatever the current location.hash points at.
  // It NEVER writes history, so it is safe to call on popstate and on load.
  var lastRenderedHash = null;
  var lastView = null; // "stack:mode" of what is currently painted
  function applyRoute() {
    if (location.hash === lastRenderedHash) return; // Back can fire popstate + hashchange
    lastRenderedHash = location.hash;
    var r = parseRoute(location.hash);

    // Fall back gracefully if the requested cell has no content yet.
    if (!modeAvailable(r.stack, r.mode)) {
      if (modeAvailable(r.stack, r.mode === "learn" ? "practice" : "learn")) r.mode = (r.mode === "learn" ? "practice" : "learn");
      else { r.stack = "python"; r.mode = "practice"; }
    }

    var prevView = lastView;
    setChrome(r.stack, r.mode);
    lastView = r.stack + ":" + r.mode;

    if (r.stack === "python" && r.mode === "practice") {
      if (byId[r.id]) state.currentId = r.id;
      // Full render on first paint or when arriving from any other view.
      if (prevView !== "python:practice" || !el("nav").querySelector(".nav-item")) renderAll();
      else selectProblem(state.currentId);
    } else if (r.stack === "python" && r.mode === "learn") {
      var okTid = r.id && window.PYDSA && window.PYDSA.byId(r.id) ? r.id : null;
      if (window.PYLAB) window.PYLAB.mount(okTid);
    } else if (r.mode === "practice") {
      if (window.ProblemLab) window.ProblemLab.mount(r.stack, r.id);
    } else {
      if (window.ConceptLab) window.ConceptLab.mount(r.stack, r.id);
    }
    // keep the shared "Categories" expand/collapse-all caret in sync per view
    updateToggleAllIcon();
  }

  // All user navigations go through here: push a history entry, then render.
  function navigate(hash) {
    if (location.hash !== hash) history.pushState(null, "", hash);
    applyRoute();
  }
  B.navigate = navigate;

  // Master navigation primitive — jump to any (mode, stack, id) cell.
  B.goTo = function (mode, stack, id) { navigate(routeFor(mode, stack, id)); };

  // Switch to a stack, resuming its last-used (or default) mode + item.
  function goStack(stack) {
    var pref = store.getPref("lastModeFor_" + stack);
    var mode = (pref && modeAvailable(stack, pref)) ? pref
             : (hasPractice(stack) ? "practice" : "learn");
    if (!modeAvailable(stack, mode)) mode = (mode === "learn" ? "practice" : "learn");
    navigate(routeFor(mode, stack, defaultIdFor(stack, mode)));
  }
  // Switch mode within the current stack.
  function goMode(mode) {
    if (!modeAvailable(state.stack, mode)) return;
    navigate(routeFor(mode, state.stack, defaultIdFor(state.stack, mode)));
  }

  // Legacy bridges (used by cross-links in DSA + Python labs).
  B.goToProblem = function (id) { navigate("#" + id); };
  B.goToTopic = function (id) { navigate("#py/" + id); };

  // Reverse cross-link: which Python topics does this problem exercise? Asks the
  // Python lab (if loaded) to match the problem's meta against topic tags.
  function pythonConceptsSection(p) {
    if (!window.PYLAB || !window.PYLAB.topicsForProblem) return null;
    var topics = window.PYLAB.topicsForProblem(p);
    if (!topics || !topics.length) return null;
    var wrap = h("div", {});
    wrap.appendChild(h("p", { class: "py-xlink-lead" }, "This problem leans on these Python building blocks — tap to brush up:"));
    var chips = h("div", { class: "py-xlink-chips" });
    topics.forEach(function (t) {
      var c = h("button", { class: "chip-btn py-xlink-chip" }, "🐍 " + t.title);
      c.addEventListener("click", function () { B.goToTopic(t.id); });
      chips.appendChild(c);
    });
    wrap.appendChild(chips);
    return section("recall", "Python concepts used", wrap);
  }

  // ============================================================= BOOT
  function renderAll() {
    renderSidebar(); renderProblem(); renderProgress();
  }

  function boot() {
    // restore persisted desktop sidebar-collapse state
    if (store.getPref("sidebarCollapsed")) document.body.classList.add("sidebar-collapsed");

    // restore persisted filter-panel open state
    var fOpen = !!store.getPref("filtersOpen");
    var fp = el("filterPanel"), ftg = el("filterToggle");
    if (fp) fp.classList.toggle("collapsed", !fOpen);
    if (ftg) { ftg.classList.toggle("active", fOpen); ftg.setAttribute("aria-expanded", fOpen ? "true" : "false"); }

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
    wireControls();

    // Normalize the initial URL to a concrete route (so the first history entry
    // is restorable), then render it. An explicit hash wins; otherwise resume the
    // last stack + mode the user was in.
    var startHash = location.hash;
    if (!startHash || startHash === "#") {
      var lastStack = store.getPref("lastStack") || "python";
      if (STACK_KEYS.indexOf(lastStack) === -1) lastStack = "python";
      var lastMode = store.getPref("lastModeFor_" + lastStack);
      if (!lastMode || !modeAvailable(lastStack, lastMode)) lastMode = (hasPractice(lastStack) ? "practice" : "learn");
      startHash = routeFor(lastMode, lastStack, defaultIdFor(lastStack, lastMode));
      if (startHash && startHash !== "#") history.replaceState(null, "", startHash);
    }
    applyRoute();

    // Back / Forward restore the exact previous route (workspace + selection).
    window.addEventListener("popstate", applyRoute);
    // Cover manual hash edits too (our own navigations use pushState, which
    // doesn't fire hashchange, so this only runs for user-typed fragments).
    window.addEventListener("hashchange", applyRoute);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
