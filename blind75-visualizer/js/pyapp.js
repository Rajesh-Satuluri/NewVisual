/*
 * pyapp.js — the "Python for DSA" workspace.
 * Self-contained renderer that fills the shared shell (#nav sidebar, #main pane,
 * #pyProgress box) when the workspace switch is set to Python. It reuses the DSA
 * app's CSS tokens and component classes (.prob-section, .code-wrap, .chip-btn …)
 * so it looks native, and talks back to the DSA workspace only through the small
 * bridge window.BLIND75.goToProblem(id).
 */
(function () {
  var PY = window.PYDSA;
  var store = window.BLIND75.store;
  var pyQuery = "";   // active sidebar search query (Python workspace)

  var STATUS_GLYPH = { "not-started": "○", "learning": "◐", "learned": "✓", "mastered": "★" };
  var STATUS_LABEL = { "not-started": "Not started", "learning": "Learning", "learned": "Learned", "mastered": "Mastered" };
  var STATUS_ORDER = ["not-started", "learning", "learned", "mastered"];

  // ---- tiny DOM helpers (mirrors app.js) ----
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
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  // ---- problems (for cross-links) ----
  function allProblems() { return (window.BLIND75.all && window.BLIND75.all()) || []; }
  var _pById = null;
  function problemById(id) {
    if (!_pById) { _pById = {}; allProblems().forEach(function (p) { _pById[p.id] = p; }); }
    return _pById[id] || null;
  }

  // Auto-derive related problems: curated ids first, then anything whose meta
  // (pattern / dataStructure / technique / category) matches a topic tag.
  function relatedProblems(topic) {
    var out = [], seen = {};
    (topic.relatedProblems || []).forEach(function (id) {
      var p = problemById(id);
      if (p && !seen[p.id]) { out.push(p); seen[p.id] = true; }
    });
    var tags = (topic.matchTags || []).map(function (t) { return t.toLowerCase(); });
    if (tags.length) {
      allProblems().forEach(function (p) {
        if (seen[p.id]) return;
        var hay = [
          p.category, p.meta && p.meta.pattern, p.meta && p.meta.dataStructure, p.meta && p.meta.technique
        ].join(" ").toLowerCase();
        for (var i = 0; i < tags.length; i++) {
          if (hay.indexOf(tags[i]) !== -1) { out.push(p); seen[p.id] = true; break; }
        }
      });
    }
    return out.slice(0, 8);
  }

  // ---- topic search (substring over title, section, tags, tagline) ----
  function searchTopics(q) {
    q = (q || "").trim().toLowerCase();
    if (!q) return [];
    return PY.all().filter(function (t) {
      var hay = [t.title, t.section, t.tagline || "", (t.matchTags || []).join(" ")].join(" ").toLowerCase();
      return hay.indexOf(q) !== -1;
    });
  }

  // ---- reverse cross-link: which topics does a DSA problem exercise? ----
  function topicsForProblem(p) {
    if (!p) return [];
    var hay = [p.category, p.meta && p.meta.pattern, p.meta && p.meta.dataStructure, p.meta && p.meta.technique]
      .join(" ").toLowerCase();
    var out = [], seen = {};
    PY.all().forEach(function (t) {
      var tags = (t.matchTags || []);
      for (var i = 0; i < tags.length; i++) {
        if (tags[i] && hay.indexOf(tags[i].toLowerCase()) !== -1) {
          if (!seen[t.id]) { out.push({ id: t.id, title: t.title }); seen[t.id] = true; }
          break;
        }
      }
    });
    return out.slice(0, 5);
  }

  // ---- SRS "recognize" cards: reuse the shared SM-2 engine, py-namespaced ids ----
  function recCardId(topicId, idx) { return "py:rec:" + topicId + ":" + idx; }
  function allRecCards() {
    var cards = [];
    PY.all().forEach(function (t) {
      (t.recognize || []).forEach(function (r, i) {
        cards.push({ id: recCardId(t.id, i), topicId: t.id, topicTitle: t.title, front: r.q, back: r.think });
      });
    });
    return cards;
  }
  function dueRecCards() {
    return allRecCards().filter(function (c) { return store.isDue(c.id); });
  }

  // ---- editable, runnable code (lazy Pyodide via window.PYRUN) ----
  function runnableEditor(initial) {
    var box = h("div", { class: "pyplay" });
    var ta = h("textarea", { class: "pyplay-code", spellcheck: "false" });
    ta.value = initial || "";
    var lines = (initial || "").split("\n").length;
    ta.rows = Math.min(Math.max(lines + 1, 4), 18);
    var bar = h("div", { class: "run-bar" });
    var btn = h("button", { class: "chip-btn run-btn" }, "▶ Run");
    var hint = h("span", { class: "run-hint muted" }, "runs in your browser · add print(...) to see output");
    var out = h("pre", { class: "run-out", hidden: "hidden" });
    btn.addEventListener("click", function () {
      if (window.PYRUN) window.PYRUN.run(ta.value, out, btn);
      else { out.hidden = false; out.textContent = "Python runtime unavailable."; }
    });
    // Tab inserts spaces instead of leaving the textarea
    ta.addEventListener("keydown", function (e) {
      if (e.key === "Tab") { e.preventDefault(); var s = ta.selectionStart, en = ta.selectionEnd; ta.value = ta.value.slice(0, s) + "    " + ta.value.slice(en); ta.selectionStart = ta.selectionEnd = s + 4; }
    });
    bar.appendChild(btn); bar.appendChild(hint);
    box.appendChild(ta); box.appendChild(bar); box.appendChild(out);
    return box;
  }

  // ---- indent guides (mirrors app.js addIndentGuides) ----
  function addIndentGuides(codeEl) {
    var TAB = 4, lines = codeEl.innerHTML.split("\n");
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

  function codeBlock(src) {
    var wrap = h("div", { class: "code-wrap" });
    var pre = h("pre", { class: "code-pre" });
    var code = h("code", { class: "language-python" });
    code.textContent = src;
    pre.appendChild(code);
    wrap.appendChild(pre);
    if (window.Prism) { try { window.Prism.highlightElement(code); } catch (e) {} }
    addIndentGuides(code);
    return wrap;
  }

  // ---- collapsible section (matches DSA .prob-section, smooth px-height) ----
  function section(key, title, bodyNode, collapsed) {
    var sec = h("section", { class: "prob-section" + (collapsed ? " collapsed" : ""), "data-key": key });
    var head = h("button", { class: "sec-head" });
    head.innerHTML = '<span class="sec-caret">▾</span><span class="sec-title">' + esc(title) + "</span>";
    var outer = h("div", { class: "sec-body-outer" });
    if (collapsed) outer.style.height = "0px";
    var body = h("div", { class: "sec-body" });
    body.appendChild(bodyNode);
    outer.appendChild(body);
    head.addEventListener("click", function () {
      var willOpen = sec.classList.contains("collapsed");
      var startH = outer.getBoundingClientRect().height;
      outer.style.height = startH + "px";
      outer.getBoundingClientRect(); // reflow
      sec.classList.toggle("collapsed", !willOpen);
      var endH = willOpen ? body.getBoundingClientRect().height : 0;
      outer.style.height = endH + "px";
      var done = function (e) {
        if (e.propertyName !== "height") return;
        outer.removeEventListener("transitionend", done);
        if (willOpen) outer.style.height = "auto";
      };
      outer.addEventListener("transitionend", done);
    });
    sec.appendChild(head);
    sec.appendChild(outer);
    return sec;
  }

  function frag() { return document.createDocumentFragment(); }

  // ========================================================== TOPIC PAGE
  function renderTopic(topic) {
    var main = el("main");
    main.innerHTML = "";

    // ---- header ----
    var header = h("div", { class: "prob-header" });
    var dots = "";
    for (var d = 1; d <= 3; d++) dots += '<span class="dsa-dot' + (d <= topic.dsaRelevance ? " on" : "") + '">●</span>';
    header.innerHTML =
      '<div class="ph-top">' +
        '<span class="ph-diff d-' + diffClass(topic.difficulty) + '">' + esc(topic.difficulty) + "</span>" +
        '<span class="ph-cat">⏱ ' + topic.estMinutes + " min</span>" +
        '<span class="ph-cat" title="DSA relevance">DSA ' + dots + "</span>" +
      "</div>" +
      '<h1 class="ph-title">' + esc(topic.title) + "</h1>" +
      '<p class="py-tagline">' + topic.tagline + "</p>";
    main.appendChild(header);

    // status control row (four learning states)
    var actions = h("div", { class: "ph-actions" });
    var grp = h("div", { class: "status-group" });
    STATUS_ORDER.forEach(function (s) {
      var cur = store.getPyStatus(topic.id);
      var b = h("button", { class: "status-btn py-st-" + s + (cur === s ? " on" : "") }, STATUS_GLYPH[s] + " " + STATUS_LABEL[s]);
      b.addEventListener("click", function () {
        store.setPyStatus(topic.id, s);
        renderTopic(topic); renderSidebar(topic.id); renderProgress();
      });
      grp.appendChild(b);
    });
    actions.appendChild(grp);
    var nextT = nextTopic(topic.id);
    if (nextT) {
      var nb = h("button", { class: "chip-btn cta-next" }, "Next topic →");
      nb.addEventListener("click", function () { window.PYLAB.selectTopic(nextT.id); });
      actions.appendChild(nb);
    }
    main.appendChild(actions);

    // ---- What is it? ----
    var whatBody = h("div", {});
    (topic.whatIsIt || []).forEach(function (p) { whatBody.appendChild(h("p", { class: "py-para" }, p)); });
    main.appendChild(section("logic", "What is it?", whatBody, false));

    // ---- Show me ----
    if (topic.showMe) {
      var showBody = h("div", {});
      showBody.appendChild(codeBlock(topic.showMe.code));
      if (topic.showMe.viz && window.PYVIZ) {
        var v = window.PYVIZ.build(topic.showMe.viz);
        if (v) showBody.appendChild(v);
      }
      if (topic.showMe.caption) showBody.appendChild(h("p", { class: "viz-caption" }, topic.showMe.caption));
      main.appendChild(section("code", "Show me", showBody, false));
    }

    // ---- Why it matters in DSA ----
    if (topic.whyDsa) {
      main.appendChild(section("srs", "🎯 Why it matters in DSA", h("div", { class: "py-rich" }, topic.whyDsa), false));
    }

    // ---- Don't memorize — recognize ----
    if (topic.recognize && topic.recognize.length) {
      var recBody = h("div", { class: "recognize-list" });
      topic.recognize.forEach(function (r) {
        var row = h("div", { class: "recognize-row" });
        row.innerHTML = '<div class="rec-q">' + esc(r.q) + '</div>' +
          '<div class="rec-arrow">↓ think</div>' +
          '<div class="rec-think">' + esc(r.think) + "</div>";
        recBody.appendChild(row);
      });
      main.appendChild(section("recognize", "🧠 Don’t memorize — recognize", recBody, false));
    }

    // ---- DSA connections (auto-derived) ----
    var rel = relatedProblems(topic);
    if (rel.length) {
      var relBody = h("div", {});
      relBody.appendChild(h("p", { class: "py-para muted" }, "Problems in this lab that use " + esc(topic.title) + ":"));
      var chips = h("div", { class: "prob-chips" });
      rel.forEach(function (p) {
        var c = h("button", { class: "chip-btn prob-chip" }, esc(p.title));
        c.addEventListener("click", function () { window.BLIND75.goToProblem(p.id); });
        chips.appendChild(c);
      });
      relBody.appendChild(chips);
      main.appendChild(section("recall", "🔗 DSA connections", relBody, false));
    }

    // ---- Common traps ----
    if (topic.traps && topic.traps.length) {
      var trapBody = h("div", {});
      topic.traps.forEach(function (t) {
        var box = h("div", { class: "trap" });
        var bad = h("div", { class: "trap-bad" });
        bad.appendChild(h("div", { class: "trap-tag trap-tag-bad" }, "✗ avoid"));
        bad.appendChild(codeBlock(t.bad));
        box.appendChild(bad);
        if (t.good) {
          var good = h("div", { class: "trap-good" });
          good.appendChild(h("div", { class: "trap-tag trap-tag-good" }, "✓ prefer"));
          good.appendChild(codeBlock(t.good));
          box.appendChild(good);
        }
        box.appendChild(h("p", { class: "trap-why" }, t.why));
        trapBody.appendChild(box);
      });
      main.appendChild(section("complexity", "⚠ Common traps", trapBody, true));
    }

    // ---- Complexity ----
    if (topic.complexity && topic.complexity.length) {
      var cxBody = h("div", {});
      var tbl = h("table", { class: "cx-table" });
      tbl.innerHTML = "<thead><tr><th>Operation</th><th>Complexity</th><th>Note</th></tr></thead>";
      var tb = h("tbody", {});
      topic.complexity.forEach(function (r) {
        tb.appendChild(h("tr", {}, "<td><code>" + esc(r.op) + "</code></td><td class=\"cx-o\">" + esc(r.big_o) + "</td><td class=\"cx-note\">" + esc(r.note || "") + "</td>"));
      });
      tbl.appendChild(tb);
      cxBody.appendChild(tbl);
      main.appendChild(section("complexity", "📊 Complexity", cxBody, false));
    }

    // ---- CPython detail ----
    if (topic.cpython) {
      main.appendChild(section("neutral", "🐍 Under the hood (CPython)", h("div", { class: "py-rich" }, topic.cpython), true));
    }

    // ---- Mini challenge ----
    if (topic.challenge) {
      var chBody = h("div", {});
      chBody.appendChild(h("p", { class: "py-para" }, esc(topic.challenge.prompt)));
      chBody.appendChild(runnableEditor(topic.challenge.starter || ""));
      var revealBtn = h("button", { class: "chip-btn" }, "Reveal solution");
      var solWrap = h("div", { class: "challenge-sol", hidden: "hidden" });
      solWrap.appendChild(codeBlock(topic.challenge.solution));
      revealBtn.addEventListener("click", function () { solWrap.hidden = !solWrap.hidden; revealBtn.textContent = solWrap.hidden ? "Reveal solution" : "Hide solution"; });
      var doneBtn = h("button", { class: "chip-btn" + (store.isPyChallengeDone(topic.id) ? " on" : "") }, store.isPyChallengeDone(topic.id) ? "✓ Done" : "Mark done");
      doneBtn.addEventListener("click", function () {
        var now = !store.isPyChallengeDone(topic.id);
        store.setPyChallengeDone(topic.id, now);
        doneBtn.classList.toggle("on", now);
        doneBtn.textContent = now ? "✓ Done" : "Mark done";
      });
      var row = h("div", { class: "challenge-actions" });
      row.appendChild(revealBtn); row.appendChild(doneBtn);
      chBody.appendChild(row);
      chBody.appendChild(solWrap);
      main.appendChild(section("srs", "🎯 Mini challenge", chBody, true));
    }

    main.scrollTop = 0;
  }

  function diffClass(d) { return String(d).toLowerCase() === "beginner" ? "easy" : String(d).toLowerCase() === "advanced" ? "hard" : "medium"; }

  function nextTopic(id) {
    var all = PY.all(), i = -1;
    for (var k = 0; k < all.length; k++) if (all[k].id === id) i = k;
    return all[i + 1] || null;
  }

  // ========================================================== LANDING
  function renderLanding() {
    var main = el("main");
    main.innerHTML = "";
    var all = PY.all();
    var ids = all.map(function (t) { return t.id; });
    var readiness = store.pyReadiness(ids);

    var hero = h("div", { class: "py-hero" });
    hero.innerHTML =
      '<h1 class="py-hero-title">🐍 Python for DSA</h1>' +
      '<p class="py-hero-sub">Learn the Python that actually helps you solve problems — concept → visualization → complexity → the NeetCode problems that use it.</p>';
    main.appendChild(hero);

    // readiness
    var rd = h("div", { class: "py-readiness" });
    rd.innerHTML =
      '<div class="pyr-head"><span>Python DSA Readiness</span><span class="pyr-pct">' + readiness + '%</span></div>' +
      '<div class="progress-track"><div class="progress-fill" style="width:' + readiness + '%"></div></div>' +
      '<div class="pyr-foot muted">' + store.countPy(ids, "learned") + " learned · " + store.countPy(ids, "mastered") + " mastered · " + ids.length + " topics live</div>";
    main.appendChild(rd);

    // continue learning
    var cont = firstUnfinished();
    if (cont) {
      var card = h("div", { class: "py-continue" });
      card.innerHTML =
        '<div class="pc-label">🔥 Continue learning</div>' +
        '<div class="pc-title">' + esc(cont.title) + "</div>" +
        '<div class="pc-meta muted">' + cont.estMinutes + " min · " + esc(cont.difficulty) + " · " + esc(cont.section) + "</div>";
      var go = h("button", { class: "chip-btn cta-next" }, "Continue →");
      go.addEventListener("click", function () { window.PYLAB.selectTopic(cont.id); });
      card.appendChild(go);
      main.appendChild(card);
    }

    // LEARN — full curriculum map (live topics clickable, planned ones "soon")
    var learn = h("div", { class: "py-learn" });
    learn.appendChild(h("h2", { class: "py-h2" }, "Learn"));
    PY.OUTLINE.forEach(function (grp) {
      var g = h("div", { class: "py-group" });
      g.appendChild(h("div", { class: "py-group-head" }, (PY.SECTION_ICON[grp.section] || "•") + "  " + esc(grp.section)));
      var gridEl = h("div", { class: "py-topic-grid" });
      grp.topics.forEach(function (title) {
        var t = PY.byTitle(title);
        if (t) {
          var st = store.getPyStatus(t.id);
          var cardEl = h("button", { class: "py-topic-card live" });
          cardEl.innerHTML =
            '<span class="ptc-glyph st-' + st + '">' + STATUS_GLYPH[st] + "</span>" +
            '<span class="ptc-title">' + esc(t.title) + "</span>" +
            '<span class="ptc-min muted">' + t.estMinutes + "m</span>";
          cardEl.addEventListener("click", function () { window.PYLAB.selectTopic(t.id); });
          gridEl.appendChild(cardEl);
        } else {
          var soon = h("div", { class: "py-topic-card soon" });
          soon.innerHTML = '<span class="ptc-title">' + esc(title) + "</span><span class=\"ptc-soon\">soon</span>";
          gridEl.appendChild(soon);
        }
      });
      g.appendChild(gridEl);
      learn.appendChild(g);
    });
    main.appendChild(learn);

    // toolkit
    main.appendChild(toolkitNode());

    // playground — real in-browser Python (lazy Pyodide)
    var play = h("div", { class: "py-playground" });
    play.appendChild(h("h2", { class: "py-h2" }, "🐍 Python Playground"));
    play.appendChild(h("p", { class: "py-para muted" }, "Scratch space — write Python and run it right here in your browser. The first run downloads the runtime once."));
    play.appendChild(runnableEditor(
      "# Two Sum, the hash-map way\n" +
      "nums = [2, 7, 11, 15]\n" +
      "target = 9\n" +
      "seen = {}\n" +
      "for i, x in enumerate(nums):\n" +
      "    if target - x in seen:\n" +
      "        print('indices:', seen[target - x], i)\n" +
      "    seen[x] = i\n"));
    main.appendChild(play);

    main.scrollTop = 0;
  }

  function firstUnfinished() {
    var all = PY.all();
    for (var i = 0; i < all.length; i++) {
      var s = store.getPyStatus(all[i].id);
      if (s === "not-started" || s === "learning") return all[i];
    }
    return all[0] || null;
  }

  // ========================================================== TOOLKIT
  var TOOLKIT_PICK = [
    { need: "Fast membership — “have I seen this?”", tool: "set", note: "x in s → O(1) avg", topic: "sets" },
    { need: "Count how often things appear", tool: "dict / Counter", note: "freq[x] = freq.get(x,0)+1", topic: "dictionaries" },
    { need: "LIFO — stack", tool: "list", note: "append() / pop()", topic: "lists" },
    { need: "FIFO — BFS queue", tool: "collections.deque", note: "append() / popleft() O(1)", topic: null },
    { need: "Repeatedly get the smallest/largest", tool: "heapq", note: "heappush / heappop O(log n)", topic: null },
    { need: "Search / insert in sorted data", tool: "bisect", note: "bisect_left / insort", topic: null }
  ];
  var TOOLKIT_CX = [
    ["list[i]", "O(1)"], ["list.append(x)", "O(1) amortized"], ["list.pop(0)", "O(n)"],
    ["x in list", "O(n)"], ["x in set / dict", "O(1) avg"], ["deque.popleft()", "O(1)"],
    ["heap push / pop", "O(log n)"], ["sorted(list)", "O(n log n)"]
  ];
  var TOOLKIT_CHEAT = [
    ["Stack", "list"], ["Queue", "deque"], ["Hash set", "set"], ["Hash map", "dict"],
    ["Frequency", "Counter"], ["Graph adj list", "defaultdict(list)"], ["Priority queue", "heapq"], ["Sorted search", "bisect"]
  ];

  function toolkitNode() {
    var box = h("div", { class: "py-toolkit" });
    box.appendChild(h("h2", { class: "py-h2" }, "⚡ Python DSA Toolkit"));
    var tabs = h("div", { class: "tk-tabs" });
    var body = h("div", { class: "tk-body" });
    var TABS = ["Pick a tool", "Complexity", "Cheat sheet"];
    var btns = [];

    function show(idx) {
      body.innerHTML = "";
      btns.forEach(function (b, i) { b.classList.toggle("on", i === idx); });
      if (idx === 0) {
        TOOLKIT_PICK.forEach(function (r) {
          var row = h("div", { class: "tk-pick" });
          row.innerHTML = '<div class="tk-need">' + esc(r.need) + '</div><div class="tk-arrow">→</div>' +
            '<div class="tk-tool"><b>' + esc(r.tool) + '</b><span class="muted"> ' + esc(r.note) + '</span></div>';
          if (r.topic && PY.byId(r.topic)) {
            var lnk = h("button", { class: "tk-link" }, "learn ↗");
            lnk.addEventListener("click", function () { window.PYLAB.selectTopic(r.topic); });
            row.appendChild(lnk);
          }
          body.appendChild(row);
        });
      } else if (idx === 1) {
        var tbl = h("table", { class: "cx-table" });
        tbl.innerHTML = "<thead><tr><th>Operation</th><th>Complexity</th></tr></thead>";
        var tb = h("tbody", {});
        TOOLKIT_CX.forEach(function (r) { tb.appendChild(h("tr", {}, "<td><code>" + esc(r[0]) + "</code></td><td class=\"cx-o\">" + esc(r[1]) + "</td>")); });
        tbl.appendChild(tb); body.appendChild(tbl);
      } else {
        var grid = h("div", { class: "tk-cheat" });
        TOOLKIT_CHEAT.forEach(function (r) {
          grid.appendChild(h("div", { class: "tk-cheat-row" }, '<span>' + esc(r[0]) + '</span><span class="tk-cheat-arrow">→</span><code>' + esc(r[1]) + "</code>"));
        });
        body.appendChild(grid);
      }
    }

    TABS.forEach(function (t, i) {
      var b = h("button", { class: "tk-tab" }, t);
      b.addEventListener("click", function () { show(i); });
      tabs.appendChild(b); btns.push(b);
    });
    box.appendChild(tabs); box.appendChild(body);
    show(0);
    return box;
  }

  // ========================================================== SIDEBAR + PROGRESS
  function pySectionsWithTopics() {
    return PY.SECTION_ORDER.filter(function (s) { return (PY.sectionTopics(s) || []).length; });
  }
  function updatePyToggleIcon() {
    var btn = el("pyToggleAll"); if (!btn) return;
    var secs = pySectionsWithTopics();
    var allCollapsed = secs.length && secs.every(function (s) { return store.isCatCollapsed("py:" + s); });
    btn.textContent = allCollapsed ? "▸" : "▾";
    btn.title = allCollapsed ? "Expand all sections" : "Collapse all sections";
    btn.setAttribute("aria-label", btn.title);
  }
  function togglePyAll() {
    var secs = pySectionsWithTopics();
    var allCollapsed = secs.every(function (s) { return store.isCatCollapsed("py:" + s); });
    secs.forEach(function (s) { store.setCatCollapsed("py:" + s, !allCollapsed); });
    renderSidebar(current);
  }

  function renderSidebar(activeId) {
    var nav = el("nav");
    nav.innerHTML = "";
    var home = h("button", { class: "py-home" + (activeId ? "" : " active") }, "🐍  Python home");
    home.addEventListener("click", function () { window.PYLAB.home(); });
    nav.appendChild(home);

    var q = pyQuery.trim().toLowerCase();

    // sections toolbar with a single expand/collapse-all button
    var tools = h("div", { class: "py-tools" });
    tools.appendChild(h("span", { class: "nav-tools-label" }, "Sections"));
    var toggleBtn = h("button", { class: "nav-tool-icon", id: "pyToggleAll" }, "▾");
    toggleBtn.addEventListener("click", togglePyAll);
    tools.appendChild(toggleBtn);
    nav.appendChild(tools);

    var shown = 0;
    PY.SECTION_ORDER.forEach(function (sectionName) {
      var topics = PY.sectionTopics(sectionName);
      if (q) {
        topics = topics.filter(function (t) {
          return [t.title, (t.matchTags || []).join(" "), t.tagline || ""].join(" ").toLowerCase().indexOf(q) !== -1;
        });
      }
      if (!topics.length) return;
      // When searching, force every matching section open; otherwise honor the
      // persisted collapsed state (namespaced "py:" so it never clashes with DSA).
      var collapsed = !q && store.isCatCollapsed("py:" + sectionName);
      var learned = topics.filter(function (t) { var s = store.getPyStatus(t.id); return s === "learned" || s === "mastered"; }).length;

      var block = h("div", { class: "cat-block" + (collapsed ? " collapsed" : "") });
      var header = h("button", { class: "cat-header" });
      header.innerHTML =
        '<span class="cat-caret">▾</span>' +
        '<span class="cat-icon">' + (PY.SECTION_ICON[sectionName] || "•") + "</span>" +
        '<span class="cat-name">' + esc(sectionName) + "</span>" +
        '<span class="cat-count">' + learned + "/" + topics.length + "</span>";
      block.appendChild(header);

      var outer = h("div", { class: "cat-list-outer" });
      if (collapsed) outer.style.height = "0px";
      var list = h("div", { class: "cat-list" });
      topics.forEach(function (t) {
        shown++;
        var st = store.getPyStatus(t.id);
        var item = h("a", { class: "nav-item" + (t.id === activeId ? " active" : ""), href: "#py/" + t.id });
        item.innerHTML = '<span class="st st-' + st + '">' + STATUS_GLYPH[st] + "</span>" +
          '<span class="ni-title">' + esc(t.title) + "</span>";
        item.addEventListener("click", function (e) { e.preventDefault(); window.PYLAB.selectTopic(t.id); });
        list.appendChild(item);
      });
      outer.appendChild(list);
      block.appendChild(outer);

      header.addEventListener("click", function () {
        var willOpen = block.classList.contains("collapsed");
        var startH = outer.getBoundingClientRect().height;
        outer.style.height = startH + "px";
        outer.getBoundingClientRect();
        block.classList.toggle("collapsed", !willOpen);
        var endH = willOpen ? list.getBoundingClientRect().height : 0;
        outer.style.height = endH + "px";
        var done = function (e) { if (e.propertyName !== "height") return; outer.removeEventListener("transitionend", done); if (willOpen) outer.style.height = "auto"; };
        outer.addEventListener("transitionend", done);
        store.setCatCollapsed("py:" + sectionName, !willOpen);
        updatePyToggleIcon();
      });

      nav.appendChild(block);
    });
    if (q) toggleBtn.disabled = true; // collapsing is meaningless while filtering
    updatePyToggleIcon();

    // Merged search: when searching, surface matching DSA problems too.
    if (q && window.BLIND75.all) {
      var probs = window.BLIND75.all().filter(function (p) {
        var hay = [p.title, p.category, p.meta && p.meta.pattern, p.meta && p.meta.dataStructure].join(" ").toLowerCase();
        return hay.indexOf(q) !== -1;
      }).slice(0, 5);
      if (probs.length) {
        var xb = h("div", { class: "nav-xsearch" });
        xb.appendChild(h("div", { class: "nav-xsearch-head" }, "▦ In DSA problems"));
        probs.forEach(function (p) {
          var it = h("button", { class: "nav-xsearch-item" }, esc(p.title));
          it.addEventListener("click", function () { window.BLIND75.goToProblem(p.id); });
          xb.appendChild(it);
        });
        nav.appendChild(xb);
      }
    }
    if (q && !shown) nav.appendChild(h("div", { class: "nav-empty" }, "No Python topics match “" + esc(pyQuery) + "”."));
  }

  function renderProgress() {
    var box = el("pyProgress");
    if (!box) return;
    box.hidden = false; // CSS still hides it in the DSA workspace via [data-ws]
    var ids = PY.all().map(function (t) { return t.id; });
    var pct = store.pyReadiness(ids);
    box.innerHTML =
      '<div class="progress-head"><span>Python readiness</span></div>' +
      '<div class="progress-track"><div class="progress-fill" style="width:' + pct + '%"></div></div>' +
      '<div class="progress-foot muted"><span>' + store.countPy(ids, "learned") + " learned</span> · " +
        store.countPy(ids, "mastered") + " mastered · " + ids.length + " topics</div>";
    var due = dueRecCards().length;
    var rbtn = h("button", { class: "py-rec-btn" + (due ? " has-due" : "") }, "🔁 Practice recognition" + (due ? " (" + due + " due)" : ""));
    rbtn.addEventListener("click", function () { openRecognition(); });
    box.appendChild(rbtn);
  }

  // ========================================================== RECOGNITION REVIEW
  var _pyModalWired = false;
  function pyOpenModal() { var m = el("pyReviewModal"); if (m) m.classList.remove("hidden"); }
  function pyCloseModal() { var m = el("pyReviewModal"); if (m) m.classList.add("hidden"); }
  function wirePyModal() {
    if (_pyModalWired) return; _pyModalWired = true;
    var m = el("pyReviewModal"), c = el("pyReviewClose");
    if (c) c.addEventListener("click", pyCloseModal);
    if (m) m.addEventListener("click", function (e) { if (e.target === m) pyCloseModal(); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && m && !m.classList.contains("hidden")) pyCloseModal();
    });
  }

  function openRecognition() {
    wirePyModal();
    var body = el("pyReviewBody"); if (!body) return;
    var queue = dueRecCards(), practice = false;
    if (!queue.length) { queue = allRecCards(); practice = true; }
    if (!queue.length) return;
    var idx = 0;
    function renderCard() {
      body.innerHTML = "";
      if (idx >= queue.length) {
        body.appendChild(h("div", { class: "rv-done" }, "✓ Done — " + queue.length + (queue.length === 1 ? " card" : " cards") + " reviewed."));
        var cl = h("button", { class: "chip-btn" }, "Close");
        cl.addEventListener("click", pyCloseModal);
        body.appendChild(cl);
        renderProgress(); renderSidebar(current);
        return;
      }
      var card = queue[idx];
      var wrap = h("div", { class: "rv-card" });
      wrap.appendChild(h("div", { class: "rv-progress muted" }, (practice ? "Practice · " : "") + "Card " + (idx + 1) + " / " + queue.length + " · " + esc(card.topicTitle)));
      wrap.appendChild(h("div", { class: "rv-front" }, esc(card.front)));
      var back = h("div", { class: "rv-back blurred" }, "→ " + esc(card.back));
      wrap.appendChild(back);
      var reveal = h("button", { class: "chip-btn rv-reveal" }, "Show answer");
      var grades = h("div", { class: "rv-grades" });
      [["again", "Again"], ["hard", "Hard"], ["good", "Good"], ["easy", "Easy"]].forEach(function (g) {
        var b = h("button", { class: "chip-btn rv-grade rv-" + g[0] }, g[1]);
        b.addEventListener("click", function () { store.reviewCard(card.id, g[0]); idx++; renderCard(); });
        grades.appendChild(b);
      });
      grades.hidden = true;
      reveal.addEventListener("click", function () { back.classList.remove("blurred"); reveal.remove(); grades.hidden = false; });
      var open = h("button", { class: "chip-btn rv-open" }, "Open " + card.topicTitle + " →");
      open.addEventListener("click", function () { pyCloseModal(); window.PYLAB.selectTopic(card.topicId); });
      wrap.appendChild(reveal); wrap.appendChild(grades); wrap.appendChild(open);
      body.appendChild(wrap);
    }
    renderCard();
    pyOpenModal();
  }

  // ========================================================== PUBLIC API
  var current = null;
  window.PYLAB = {
    // Pure renderer, called by the app.js router. History is managed there.
    mount: function (topicId) {
      pyQuery = ""; var s = el("search"); if (s) { s.value = ""; s.placeholder = "Search Python topics…  ( / )"; }
      if (topicId && PY.byId(topicId)) { current = topicId; store.setPref("lastTopic", topicId); }
      else current = null;
      renderSidebar(current);
      renderProgress();
      if (current) renderTopic(PY.byId(current));
      else renderLanding();
    },
    // User navigations push a history entry via the shared router.
    selectTopic: function (id) {
      if (!PY.byId(id)) return;
      window.BLIND75.navigate("#py/" + id);
    },
    home: function () {
      window.BLIND75.navigate("#py");
    },
    // used by the DSA workspace + merged search
    search: function (q) { return searchTopics(q); },
    topicsForProblem: function (p) { return topicsForProblem(p); },
    onSearch: function (q) { pyQuery = q; renderSidebar(current); }
  };
})();
