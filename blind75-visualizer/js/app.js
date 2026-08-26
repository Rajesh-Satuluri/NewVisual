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
    setFilter: store.getPref("setFilter") || "all",  // "all" (NeetCode 150) | "blind75"
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
        } else if (st !== state.filterStatus) return;
      }
      if (state.filterPattern !== "all" && (!p.meta || p.meta.pattern !== state.filterPattern)) return;
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
          '<span class="ni-title">' + esc(p.title) + "</span>" +
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
  }

  // ============================================================= CODE BLOCK
  function codeBlock(source, extraClass) {
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
    bar.appendChild(h("span", { class: "code-lang" }, "Python"));
    bar.appendChild(copy);
    var pre = h("pre", { class: "code-pre" });
    var code = h("code", { class: "language-python" }, esc(source));
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
    var body = h("div", { class: "sec-body" });
    body.appendChild(bodyNode);
    head.addEventListener("click", function () {
      var isCollapsed = sec.classList.toggle("collapsed");
      head.querySelector(".sec-caret").textContent = isCollapsed ? "▸" : "▾";
    });
    sec.appendChild(head);
    sec.appendChild(body);
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
        store.setStatus(p.id, s);
        renderProblem(); renderSidebar(); renderProgress();
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
    var cb = codeBlock(source, blur ? "blurred" : "");
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
    table.innerHTML = "<thead><tr><th>#</th><th>Problem</th><th>Category</th><th>Difficulty</th>" +
      "<th>Pattern</th><th>Time</th><th>Space</th><th>Status</th></tr></thead>";
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
        "<td>" + esc((p.meta && p.meta.pattern) || "") + "</td>" +
        "<td><code>" + esc(a0.time || "") + "</code></td>" +
        "<td><code>" + esc(a0.space || "") + "</code></td>" +
        '<td class="st st-' + stt + '">' + STATUS_GLYPH[stt] + "</td>";
      tr.addEventListener("click", function () { modal.classList.add("hidden"); selectProblem(p.id); });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    body.appendChild(table);
    modal.classList.remove("hidden");
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

    el("filterDifficulty").addEventListener("change", function (e) { state.filterDifficulty = e.target.value; renderSidebar(); });
    el("filterStatus").addEventListener("change", function (e) { state.filterStatus = e.target.value; renderSidebar(); });

    var pf = el("filterPattern");
    allPatterns().forEach(function (pat) {
      pf.appendChild(h("option", { value: pat }, pat));
    });
    pf.addEventListener("change", function (e) { state.filterPattern = e.target.value; renderSidebar(); });

    el("clearFilters").addEventListener("click", function () {
      state.query = ""; state.filterDifficulty = "all"; state.filterStatus = "all"; state.filterPattern = "all";
      search.value = ""; el("filterDifficulty").value = "all"; el("filterStatus").value = "all"; pf.value = "all";
      renderSidebar();
    });

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
    el("gridClose").addEventListener("click", function () { el("gridModal").classList.add("hidden"); });
    el("gridModal").addEventListener("click", function (e) { if (e.target === el("gridModal")) el("gridModal").classList.add("hidden"); });

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

    // sidebar toggle (mobile)
    el("menuBtn").addEventListener("click", function () {
      document.body.classList.toggle("sidebar-open");
    });

    // keyboard nav
    document.addEventListener("keydown", function (e) {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") {
        if (e.key === "Escape") e.target.blur();
        return;
      }
      if (e.key === "/") { e.preventDefault(); search.focus(); return; }
      if (e.key === "Escape") { el("gridModal").classList.add("hidden"); return; }
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
