/*
 * conceptlab.js — a generic "Learn" (concepts) renderer for every data-stack
 * except Python (which keeps its bespoke pyapp.js). It is the multi-stack
 * generalization of pyapp.js's renderTopic: it reads topics from window.LEARN
 * (learncore.js) for a given stack and renders the same teaching structure —
 * Concept → Show me → Why it matters → Recognize → Traps → Complexity →
 * Under the hood → Mini challenge — reusing the shared CSS component classes.
 *
 * Runnable code (Pyodide) is enabled only for Python-family stacks (numpy,
 * pandas); SQL and PySpark show read-only, syntax-highlighted code because they
 * can't execute in the browser. Progress is stored via the shared store with
 * ids namespaced "learn:<stack>:<id>" so nothing collides.
 */
(function () {
  var LEARN = window.LEARN;
  var store = window.BLIND75.store;

  var STATUS_GLYPH = { "not-started": "○", "learning": "◐", "learned": "✓", "mastered": "★" };
  var STATUS_LABEL = { "not-started": "Not started", "learning": "Learning", "learned": "Learned", "mastered": "Mastered" };
  var STATUS_ORDER = ["not-started", "learning", "learned", "mastered"];

  // per-stack presentation
  var META = {
    sql:    { lang: "sql",    runnable: false, whyTitle: "🎯 Why it matters",         engineTitle: "🛠 Dialect notes" },
    spark:  { lang: "python", runnable: false, whyTitle: "🎯 Why it matters in pipelines", engineTitle: "⚡ Under the hood (Spark)" },
    numpy:  { lang: "python", runnable: true,  whyTitle: "🎯 Why it matters",         engineTitle: "🔬 Under the hood" },
    pandas: { lang: "python", runnable: true,  whyTitle: "🎯 Why it matters",         engineTitle: "🔬 Under the hood" }
  };
  // which practice registry to cross-link a stack's concepts to
  function practiceReg(stack) {
    if (stack === "sql") return window.SQLLAB;
    if (stack === "spark") return window.PYSPARK;
    if (stack === "numpy") return window.NUMPY;
    return null;
  }

  var cur = { stack: null, id: null };
  var query = "";

  function el(id) { return document.getElementById(id); }
  function h(tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) { if (k === "class") e.className = attrs[k]; else e.setAttribute(k, attrs[k]); }
    if (html != null) e.innerHTML = html;
    return e;
  }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  function meta() { return META[cur.stack] || META.numpy; }
  function nsStatus(id) { return "learn:" + cur.stack + ":" + id; }

  // ---- indent guides ----
  function addIndentGuides(codeEl) {
    var TAB = 4, lines = codeEl.innerHTML.split("\n");
    for (var i = 0; i < lines.length; i++) {
      var m = /^( +)/.exec(lines[i]); if (!m) continue;
      var n = m[1].length, rest = lines[i].slice(n), out = "";
      for (var c = 0; c < n; c += TAB) { var w = Math.min(TAB, n - c); out += '<span class="ind-g">' + new Array(w + 1).join(" ") + "</span>"; }
      lines[i] = out + rest;
    }
    codeEl.innerHTML = lines.join("\n");
  }
  function codeBlock(src) {
    var lang = meta().lang;
    var wrap = h("div", { class: "code-wrap" });
    var pre = h("pre", { class: "code-pre" });
    var code = h("code", { class: "language-" + lang });
    code.textContent = src;
    pre.appendChild(code); wrap.appendChild(pre);
    if (window.Prism) { try { window.Prism.highlightElement(code); } catch (e) {} }
    if (lang === "python") addIndentGuides(code);
    return wrap;
  }

  // ---- runnable editor (Pyodide) — python-family only ----
  function runnableEditor(initial) {
    var box = h("div", { class: "pyplay" });
    var ta = h("textarea", { class: "pyplay-code", spellcheck: "false" });
    ta.value = initial || "";
    ta.rows = Math.min(Math.max((initial || "").split("\n").length + 1, 4), 18);
    var bar = h("div", { class: "run-bar" });
    var btn = h("button", { class: "chip-btn run-btn" }, "▶ Run");
    var hint = h("span", { class: "run-hint muted" }, "runs in your browser · add print(...) to see output");
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

  function section(key, title, bodyNode, collapsed) {
    var sec = h("section", { class: "prob-section" + (collapsed ? " collapsed" : ""), "data-key": key });
    var head = h("button", { class: "sec-head" });
    head.innerHTML = '<span class="sec-caret">▾</span><span class="sec-title">' + esc(title) + "</span>";
    var outer = h("div", { class: "sec-body-outer" });
    if (collapsed) outer.style.height = "0px";
    var body = h("div", { class: "sec-body" });
    body.appendChild(bodyNode); outer.appendChild(body);
    head.addEventListener("click", function () {
      var willOpen = sec.classList.contains("collapsed");
      var startH = outer.getBoundingClientRect().height;
      outer.style.height = startH + "px"; outer.getBoundingClientRect();
      sec.classList.toggle("collapsed", !willOpen);
      outer.style.height = (willOpen ? body.getBoundingClientRect().height : 0) + "px";
      var done = function (e) { if (e.propertyName !== "height") return; outer.removeEventListener("transitionend", done); if (willOpen) outer.style.height = "auto"; };
      outer.addEventListener("transitionend", done);
    });
    sec.appendChild(head); sec.appendChild(outer);
    return sec;
  }

  function diffClass(d) {
    d = String(d).toLowerCase();
    return (d === "beginner" || d === "easy") ? "easy" : (d === "advanced" || d === "hard") ? "hard" : "medium";
  }

  // ---- cross-link concepts to same-stack problems by matchTags ----
  function relatedProblems(topic) {
    var reg = practiceReg(cur.stack);
    if (!reg || !reg.all) return [];
    var tags = (topic.matchTags || []).map(function (t) { return t.toLowerCase(); });
    if (!tags.length) return [];
    var out = [], seen = {};
    reg.all().forEach(function (p) {
      var hay = [p.category, p.meta && p.meta.pattern, p.meta && p.meta.sqlConcept,
                 p.meta && p.meta.transformation, p.meta && p.meta.functions, p.meta && p.meta.technique,
                 (p.topics || []).join(" ")].join(" ").toLowerCase();
      for (var i = 0; i < tags.length; i++) {
        if (hay.indexOf(tags[i]) !== -1) { if (!seen[p.id]) { out.push(p); seen[p.id] = true; } break; }
      }
    });
    return out.slice(0, 8);
  }

  // ============================================================ TOPIC PAGE
  function renderTopic(topic) {
    var main = el("main");
    main.innerHTML = "";
    var M = meta();

    var header = h("div", { class: "prob-header" });
    var dots = "";
    var rel = topic.relevance != null ? topic.relevance : topic.dsaRelevance;
    if (rel != null) for (var d = 1; d <= 3; d++) dots += '<span class="dsa-dot' + (d <= rel ? " on" : "") + '">●</span>';
    header.innerHTML =
      '<div class="ph-top">' +
        '<span class="ph-diff d-' + diffClass(topic.difficulty) + '">' + esc(topic.difficulty || "Core") + "</span>" +
        (topic.estMinutes ? '<span class="ph-cat">⏱ ' + topic.estMinutes + " min</span>" : "") +
        (rel != null ? '<span class="ph-cat" title="Interview relevance">Relevance ' + dots + "</span>" : "") +
      "</div>" +
      '<h1 class="ph-title">' + esc(topic.title) + "</h1>" +
      (topic.tagline ? '<p class="py-tagline">' + topic.tagline + "</p>" : "");
    main.appendChild(header);

    // status control row
    var actions = h("div", { class: "ph-actions" });
    var grp = h("div", { class: "status-group" });
    STATUS_ORDER.forEach(function (s) {
      var curSt = store.getPyStatus(nsStatus(topic.id));
      var b = h("button", { class: "status-btn py-st-" + s + (curSt === s ? " on" : "") }, STATUS_GLYPH[s] + " " + STATUS_LABEL[s]);
      b.addEventListener("click", function () { store.setPyStatus(nsStatus(topic.id), s); renderTopic(topic); renderSidebar(topic.id); renderProgress(); });
      grp.appendChild(b);
    });
    actions.appendChild(grp);
    var nextT = nextTopic(topic.id);
    if (nextT) {
      var nb = h("button", { class: "chip-btn cta-next" }, "Next topic →");
      nb.addEventListener("click", function () { window.BLIND75.goTo("learn", cur.stack, nextT.id); });
      actions.appendChild(nb);
    }
    main.appendChild(actions);

    // What is it?
    var whatBody = h("div", {});
    (topic.whatIsIt || []).forEach(function (p) { whatBody.appendChild(h("p", { class: "py-para" }, p)); });
    if ((topic.whatIsIt || []).length) main.appendChild(section("logic", "What is it?", whatBody, false));

    // Show me
    if (topic.showMe) {
      var showBody = h("div", {});
      showBody.appendChild(codeBlock(topic.showMe.code));
      if (topic.showMe.viz && window.PYVIZ) { var v = window.PYVIZ.build(topic.showMe.viz); if (v) showBody.appendChild(v); }
      if (topic.showMe.caption) showBody.appendChild(h("p", { class: "viz-caption" }, topic.showMe.caption));
      main.appendChild(section("code", "Show me", showBody, false));
    }

    // Why it matters
    var why = topic.whyMatters || topic.whyDsa;
    if (why) main.appendChild(section("srs", M.whyTitle, h("div", { class: "py-rich" }, why), false));

    // Recognize
    if (topic.recognize && topic.recognize.length) {
      var recBody = h("div", { class: "recognize-list" });
      topic.recognize.forEach(function (r) {
        var row = h("div", { class: "recognize-row" });
        row.innerHTML = '<div class="rec-q">' + esc(r.q) + '</div><div class="rec-arrow">↓ think</div><div class="rec-think">' + esc(r.think) + "</div>";
        recBody.appendChild(row);
      });
      main.appendChild(section("recognize", "🧠 Don’t memorize — recognize", recBody, false));
    }

    // cross-links to same-stack problems
    var rp = relatedProblems(topic);
    if (rp.length) {
      var relBody = h("div", {});
      relBody.appendChild(h("p", { class: "py-para muted" }, "Practice problems that use " + esc(topic.title) + ":"));
      var chips = h("div", { class: "prob-chips" });
      rp.forEach(function (p) {
        var c = h("button", { class: "chip-btn prob-chip" }, esc(p.title));
        c.addEventListener("click", function () { window.BLIND75.goTo("practice", cur.stack, p.id); });
        chips.appendChild(c);
      });
      relBody.appendChild(chips);
      main.appendChild(section("recall", "🔗 Connected problems", relBody, false));
    }

    // Traps
    if (topic.traps && topic.traps.length) {
      var trapBody = h("div", {});
      topic.traps.forEach(function (t) {
        var box = h("div", { class: "trap" });
        var bad = h("div", { class: "trap-bad" });
        bad.appendChild(h("div", { class: "trap-tag trap-tag-bad" }, "✗ avoid"));
        bad.appendChild(codeBlock(t.bad)); box.appendChild(bad);
        if (t.good) { var good = h("div", { class: "trap-good" }); good.appendChild(h("div", { class: "trap-tag trap-tag-good" }, "✓ prefer")); good.appendChild(codeBlock(t.good)); box.appendChild(good); }
        box.appendChild(h("p", { class: "trap-why" }, t.why));
        trapBody.appendChild(box);
      });
      main.appendChild(section("complexity", "⚠ Common traps", trapBody, true));
    }

    // Complexity / operations table
    if (topic.complexity && topic.complexity.length) {
      var cxBody = h("div", {});
      var tbl = h("table", { class: "cx-table" });
      tbl.innerHTML = "<thead><tr><th>Operation</th><th>Complexity</th><th>Note</th></tr></thead>";
      var tb = h("tbody", {});
      topic.complexity.forEach(function (r) {
        tb.appendChild(h("tr", {}, "<td><code>" + esc(r.op) + "</code></td><td class=\"cx-o\">" + esc(r.big_o) + "</td><td class=\"cx-note\">" + esc(r.note || "") + "</td>"));
      });
      tbl.appendChild(tb); cxBody.appendChild(tbl);
      main.appendChild(section("complexity", "📊 Complexity", cxBody, false));
    }

    // Under the hood / engine note
    var engine = topic.engineNote || topic.cpython;
    if (engine) main.appendChild(section("neutral", M.engineTitle, h("div", { class: "py-rich" }, engine), true));

    // Mini challenge
    if (topic.challenge) {
      var chBody = h("div", {});
      chBody.appendChild(h("p", { class: "py-para" }, esc(topic.challenge.prompt)));
      if (M.runnable) chBody.appendChild(runnableEditor(topic.challenge.starter || ""));
      else if (topic.challenge.starter) chBody.appendChild(codeBlock(topic.challenge.starter));
      var revealBtn = h("button", { class: "chip-btn" }, "Reveal solution");
      var solWrap = h("div", { class: "challenge-sol", hidden: "hidden" });
      solWrap.appendChild(codeBlock(topic.challenge.solution));
      revealBtn.addEventListener("click", function () { solWrap.hidden = !solWrap.hidden; revealBtn.textContent = solWrap.hidden ? "Reveal solution" : "Hide solution"; });
      var doneBtn = h("button", { class: "chip-btn" + (store.isPyChallengeDone(nsStatus(topic.id)) ? " on" : "") }, store.isPyChallengeDone(nsStatus(topic.id)) ? "✓ Done" : "Mark done");
      doneBtn.addEventListener("click", function () {
        var now = !store.isPyChallengeDone(nsStatus(topic.id));
        store.setPyChallengeDone(nsStatus(topic.id), now);
        doneBtn.classList.toggle("on", now); doneBtn.textContent = now ? "✓ Done" : "Mark done";
      });
      var row = h("div", { class: "challenge-actions" });
      row.appendChild(revealBtn); row.appendChild(doneBtn);
      chBody.appendChild(row); chBody.appendChild(solWrap);
      main.appendChild(section("srs", "🎯 Mini challenge", chBody, true));
    }

    main.scrollTop = 0;
  }

  function nextTopic(id) {
    var all = LEARN.all(cur.stack), i = -1;
    for (var k = 0; k < all.length; k++) if (all[k].id === id) i = k;
    return all[i + 1] || null;
  }

  // ============================================================ LANDING
  function renderLanding() {
    var main = el("main");
    main.innerHTML = "";
    var stackLabel = LEARN.stackMeta(cur.stack).label;
    var all = LEARN.all(cur.stack);
    var ids = all.map(function (t) { return nsStatus(t.id); });
    var readiness = store.pyReadiness(ids);

    var hero = h("div", { class: "py-hero" });
    hero.innerHTML =
      '<h1 class="py-hero-title">' + esc(stackLabel) + ' — Concepts</h1>' +
      '<p class="py-hero-sub">Learn ' + esc(stackLabel) + ' the way interviews test it — concept → example → why it matters → the practice problems that use it.</p>' +
      '<div class="py-readiness"><div class="py-ready-ring" style="--pct:' + readiness + '"><span>' + readiness + '%</span></div>' +
      '<div class="py-ready-txt"><b>' + all.length + '</b> topics live · your readiness across what\'s authored</div></div>';
    main.appendChild(hero);

    // curriculum map (authored + "soon")
    var grid = h("div", { class: "learn-map" });
    LEARN.outline(cur.stack).forEach(function (sec) {
      var authored = LEARN.sectionTopics(cur.stack, sec.section);
      var authoredTitles = {}; authored.forEach(function (t) { authoredTitles[t.title] = t; });
      var card = h("div", { class: "learn-sec" });
      card.appendChild(h("div", { class: "learn-sec-h" }, LEARN.sectionIcon(cur.stack, sec.section) + " " + esc(sec.section)));
      var ul = h("div", { class: "learn-topic-list" });
      sec.topics.forEach(function (title) {
        var t = authoredTitles[title];
        if (t) {
          var st = store.getPyStatus(nsStatus(t.id));
          var it = h("button", { class: "learn-topic" }, '<span class="st py-st-' + st + '">' + STATUS_GLYPH[st] + "</span> " + esc(title));
          it.addEventListener("click", function () { window.BLIND75.goTo("learn", cur.stack, t.id); });
          ul.appendChild(it);
        } else {
          ul.appendChild(h("div", { class: "learn-topic soon" }, '<span class="st">·</span> ' + esc(title) + ' <span class="soon-badge">soon</span>'));
        }
      });
      card.appendChild(ul);
      grid.appendChild(card);
    });
    main.appendChild(grid);
    main.scrollTop = 0;
  }

  // ============================================================ SIDEBAR
  function renderSidebar(activeId) {
    var nav = el("nav");
    if (!nav) return;
    nav.innerHTML = "";
    var q = query.trim().toLowerCase();
    LEARN.outline(cur.stack).forEach(function (sec) {
      var topics = LEARN.sectionTopics(cur.stack, sec.section);
      if (q) topics = topics.filter(function (t) { return (t.title + " " + (t.tagline || "") + " " + (t.matchTags || []).join(" ")).toLowerCase().indexOf(q) !== -1; });
      if (!topics.length) return;
      var key = cur.stack + "::learn::" + sec.section;
      var collapsed = store.isCatCollapsed(key);
      var block = h("div", { class: "cat-block" + (collapsed ? " collapsed" : "") });
      var header = h("button", { class: "cat-header" });
      var done = topics.filter(function (t) { var s = store.getPyStatus(nsStatus(t.id)); return s === "learned" || s === "mastered"; }).length;
      header.innerHTML = '<span class="cat-caret">▾</span><span class="cat-icon">' + LEARN.sectionIcon(cur.stack, sec.section) + "</span>" +
        '<span class="cat-name">' + esc(sec.section) + '</span><span class="cat-count">' + done + "/" + topics.length + "</span>";
      block.appendChild(header);
      var outer = h("div", { class: "cat-list-outer" });
      if (collapsed) outer.style.height = "0px";
      var list = h("div", { class: "cat-list" });
      topics.forEach(function (t) {
        var st = store.getPyStatus(nsStatus(t.id));
        var item = h("a", { class: "nav-item" + (t.id === activeId ? " active" : ""), href: "#" });
        item.innerHTML = '<span class="st py-st-' + st + '">' + STATUS_GLYPH[st] + "</span><span class=\"ni-title\">" + esc(t.title) + "</span>";
        item.addEventListener("click", function (e) { e.preventDefault(); window.BLIND75.goTo("learn", cur.stack, t.id); });
        list.appendChild(item);
      });
      outer.appendChild(list); block.appendChild(outer);
      header.addEventListener("click", function () {
        var willOpen = block.classList.contains("collapsed");
        var startH = outer.getBoundingClientRect().height;
        outer.style.height = startH + "px"; outer.getBoundingClientRect();
        block.classList.toggle("collapsed", !willOpen);
        outer.style.height = (willOpen ? list.getBoundingClientRect().height : 0) + "px";
        var d = function (ev) { if (ev.propertyName !== "height") return; outer.removeEventListener("transitionend", d); if (willOpen) outer.style.height = "auto"; };
        outer.addEventListener("transitionend", d);
        store.setCatCollapsed(key, !willOpen);
      });
      nav.appendChild(block);
    });
    if (!nav.children.length) nav.appendChild(h("div", { class: "nav-empty" }, "No topics match your search."));
  }

  function renderProgress() {
    var box = el("pyProgress");
    if (!box) return;
    var all = LEARN.all(cur.stack);
    var ids = all.map(function (t) { return nsStatus(t.id); });
    var readiness = store.pyReadiness(ids);
    var learned = all.filter(function (t) { var s = store.getPyStatus(nsStatus(t.id)); return s === "learned" || s === "mastered"; }).length;
    box.innerHTML =
      '<div class="py-prog-head"><span class="py-prog-title">' + esc(LEARN.stackMeta(cur.stack).label) + ' · Learn</span>' +
      '<span class="py-prog-pct">' + readiness + '%</span></div>' +
      '<div class="progress-track"><div class="progress-fill" style="width:' + readiness + '%"></div></div>' +
      '<div class="py-prog-foot muted">' + learned + ' learned · ' + all.length + ' topics</div>';
    box.hidden = false;
  }

  // ============================================================ PUBLIC API
  window.ConceptLab = {
    mount: function (stack, id) {
      if (!LEARN.STACKS[stack]) return;
      cur.stack = stack;
      var t = id ? LEARN.byId(stack, id) : null;
      renderSidebar(t ? t.id : null);
      renderProgress();
      if (t) { cur.id = t.id; store.setPref("lastTopic_" + stack, t.id); renderTopic(t); }
      else { cur.id = null; renderLanding(); }
    },
    lastId: function (stack) { return store.getPref("lastTopic_" + stack); },
    onSearch: function (q) { query = q; renderSidebar(cur.id); },
    toggleAll: function () {
      var secs = LEARN.sectionOrder(cur.stack);
      var keys = secs.map(function (s) { return cur.stack + "::learn::" + s; });
      var allCollapsed = keys.every(function (k) { return store.isCatCollapsed(k); });
      keys.forEach(function (k) { store.setCatCollapsed(k, !allCollapsed); });
      renderSidebar(cur.id);
    }
  };
})();
