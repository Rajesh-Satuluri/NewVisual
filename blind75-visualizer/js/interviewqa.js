/*
 * interviewqa.js — the "Interview Q&A" flashcard panel (bank-aware).
 *
 * A sibling of the Postmortem panel: rapid-fire, interview-ready theory answers.
 * Each card shows a question; click it (or "Reveal all") to flip open a crisp
 * answer, optional code, and an interview tip. Group filter chips with counts, a
 * live search box, and a per-question "Got it" toggle persisted in localStorage.
 *
 * It drives MULTIPLE banks from one overlay:
 *   • PySpark  (window.PYSPARK_QA) — opened from #interviewBtn on PySpark Learn.
 *   • SQL      (window.SQL_QA)     — opened from SQL Learn, with spaced-repetition
 *                                    grading wired to the shared SRS store.
 * Open a specific bank with window.INTERVIEW_QA_UI.open("sql" | "spark").
 *
 * Reuses the Rosetta/Postmortem overlay shell (.ros / .ros-box / .ros-head / …);
 * panel-specific bits are iqa-* classes. Load AFTER the data/*_qa.js banks + Prism.
 */
(function () {
  var store = window.BLIND75 && window.BLIND75.store;

  // ---- bank registry -------------------------------------------------------
  var BANKS = {
    spark: {
      key: "spark",
      data: function () { return window.PYSPARK_QA || { groups: [], items: [] }; },
      title: "🎤 PySpark Interview Q&amp;A",
      subtitle: "— rapid-fire theory, interview-ready answers",
      aria: "PySpark interview Q and A",
      codeLabel: "PySpark",
      codeAccent: "#f76707",
      codeLang: "python",
      gotKey: "iqaGot:v1",
      srs: false,
      srsNs: "sparkqa"
    },
    sql: {
      key: "sql",
      data: function () { return window.SQL_QA || { groups: [], items: [] }; },
      title: "🗄 SQL Interview Q&amp;A",
      subtitle: "— rapid-fire theory with spaced-repetition recall",
      aria: "SQL interview Q and A",
      codeLabel: "SQL",
      codeAccent: "#38b2ac",
      codeLang: "sql",
      gotKey: "iqaGotSql:v1",
      srs: true,
      srsNs: "sqlqa"
    }
  };

  var overlay = null, bodyEl = null, searchEl = null;
  var rootEl = null;           // element to query for chips / reveal / due pill (overlay box OR inline host)
  var inlineHost = null;       // the page container when rendered inline (null when overlay)
  var bank = BANKS.spark;      // current bank
  var builtBank = null;        // which bank the current overlay DOM was built for
  var activeCat = "all";
  var query = "";
  var revealAll = false;
  var got = {};

  // inline ("Study Hub"-style) view state
  var inlineListEl = null;     // the .study-results container when rendered inline
  var diffFilter = "all";      // difficulty chip filter (inline only)
  // difficulty tiers used by the banks (Common → Core → Deep), ordered.
  var DIFF_META = {
    common: { label: "Common", order: 0 },
    core:   { label: "Core",   order: 1 },
    deep:   { label: "Deep",   order: 2 }
  };
  function diffKey(d) { return String(d == null ? "core" : d).toLowerCase(); }
  function diffLabel(d) { var m = DIFF_META[diffKey(d)]; return m ? m.label : (d || "Core"); }
  function diffOrder(d) { var m = DIFF_META[diffKey(d)]; return m ? m.order : 1; }
  function pad2(n) { n = String(n); return n.length < 2 ? "0" + n : n; }

  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  // ---- per-question edits (synced across devices via the shared cloud bundle) --
  // An override is { q?: plainText, a?: html } stored under the current bank in
  // store.iqaEdits. The same cloud sync that carries notes/progress carries these,
  // so an edit made on one device shows up on every device with the same sync code.
  function ovOf(p) { return (store && store.getIqaEdit) ? store.getIqaEdit(bank.key, p.id) : null; }
  function isEdited(p) { return !!ovOf(p); }
  // The question text to display: the user's edit if present, else the original.
  function viewQ(p) { var ov = ovOf(p); return (ov && typeof ov.q === "string") ? ov.q : p.q; }
  // The answer HTML to display: the user's edit if present, else the original.
  function viewA(p) { var ov = ovOf(p); return (ov && typeof ov.a === "string") ? ov.a : (p.a || ""); }
  // Open the cloud-sync dialog (the "☁ Cloud sync" item in the ⋯ More menu).
  function openSyncDialog() {
    var btn = document.getElementById("cloudSyncBtn");
    if (btn) btn.click();
  }
  function syncHintHtml() {
    var cloud = window.BLIND75 && window.BLIND75.cloud;
    if (cloud && cloud.enabled && cloud.enabled()) {
      return 'Saved on this device and synced to your other devices (cloud sync is on).';
    }
    return 'Saved on this device. <a href="#" class="iqa-sync-cta">Turn on cloud sync</a> to carry your edits across devices.';
  }

  function loadGot() { try { return JSON.parse(localStorage.getItem(bank.gotKey) || "{}") || {}; } catch (e) { return {}; } }
  function saveGot() { try { localStorage.setItem(bank.gotKey, JSON.stringify(got)); } catch (e) {} }

  // ---- data helpers (always read the live bank) ----------------------------
  function DATA() { return bank.data(); }
  function allItems() { return DATA().items || []; }
  function groupsWithItems() {
    var seen = {};
    allItems().forEach(function (p) { seen[p.group] = true; });
    return (DATA().groups || []).filter(function (g) { return seen[g]; });
  }
  function itemsFor(cat) {
    if (cat === "__due") return allItems().filter(isDue);
    return allItems().filter(function (p) { return cat === "all" || p.group === cat; });
  }
  function matchesQuery(p) {
    if (!query) return true;
    var hay = (p.q + " " + (p.a || "") + " " + (p.tags || []).join(" ") + " " + (p.code || "")).toLowerCase();
    return hay.indexOf(query) !== -1;
  }
  function visibleItems() { return itemsFor(activeCat).filter(matchesQuery); }

  // ---- SRS helpers (srs banks only) ----------------------------------------
  function srsId(p) { return bank.srsNs + ":" + p.id; }
  function isScheduled(p) { return !!(store && store.isScheduled && store.isScheduled(srsId(p))); }
  function isDue(p) { return !!(store && store.isDue && store.isDue(srsId(p))); }
  function dueCount() {
    if (!bank.srs || !store || !store.countDue) return 0;
    return store.countDue(allItems().map(srsId));
  }
  function humanWhen(ms) {
    var day = 86400000, now = Date.now();
    var d0 = new Date(); d0.setHours(0, 0, 0, 0);
    var diff = Math.round((ms - d0.getTime()) / day);
    if (ms <= now) return "now";
    if (diff <= 0) return "today";
    if (diff === 1) return "tomorrow";
    if (diff < 30) return "in " + diff + " days";
    if (diff < 60) return "in ~1 month";
    return "in ~" + Math.round(diff / 30) + " months";
  }

  // ---- clipboard (same fallback shape as rosetta/postmortem) ---------------
  function copyToClipboard(text, cb) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { cb && cb(); }, function () { textareaCopy(text); cb && cb(); });
    } else { textareaCopy(text); cb && cb(); }
  }
  function textareaCopy(text) {
    try {
      var ta = document.createElement("textarea");
      ta.value = text; ta.setAttribute("readonly", "");
      ta.style.position = "fixed"; ta.style.top = "-1000px"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta);
    } catch (e) {}
  }

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  function lvlClass(d) { return "iqa-lvl-" + String(d || "core").toLowerCase(); }

  function codeBlock(src, lang) {
    var wrap = el("div", "ros-col iqa-code");
    var head = el("div", "ros-col-h");
    head.innerHTML = '<span class="ros-col-name" style="--c:' + bank.codeAccent + '">' + esc(bank.codeLabel) + '</span>';
    var cbtn = el("button", "pm-copy"); cbtn.type = "button"; cbtn.textContent = "Copy";
    cbtn.addEventListener("click", function (ev) {
      ev.stopPropagation();
      copyToClipboard(src, function () {
        cbtn.textContent = "Copied!"; cbtn.classList.add("ok");
        setTimeout(function () { cbtn.textContent = "Copy"; cbtn.classList.remove("ok"); }, 1300);
      });
    });
    head.appendChild(cbtn);
    var pre = el("pre", "code-pre ros-pre");
    var code = el("code", "language-" + (lang || bank.codeLang));
    code.textContent = src;
    pre.appendChild(code);
    if (window.Prism) { try { window.Prism.highlightElement(code); } catch (e) {} }
    wrap.appendChild(head); wrap.appendChild(pre);
    return wrap;
  }

  // Spaced-repetition grade row for srs banks. `onGrade` (optional) overrides the
  // post-grade refresh — the inline view passes one so it doesn't touch the
  // overlay's bodyEl/render() pipeline.
  function srsRow(p, onGrade) {
    var box = el("div", "iqa-srs");
    var rec = store && store.getSrs ? store.getSrs(srsId(p)) : null;
    var status = !rec
      ? '<span class="iqa-srs-new">Not in your review schedule yet — grade your recall to start.</span>'
      : '<span class="iqa-srs-when">Next review <b>' + humanWhen(rec.due) + '</b> · ' +
        rec.reps + ' review' + (rec.reps === 1 ? '' : 's') + (isDue(p) ? ' · <b class="iqa-due-tag">due now</b>' : '') + '</span>';
    box.appendChild(el("div", "iqa-srs-status", status));
    var grades = el("div", "iqa-grades");
    [["again", "Again"], ["hard", "Hard"], ["good", "Good"], ["easy", "Easy"]].forEach(function (g) {
      var b = el("button", "iqa-grade iqa-grade-" + g[0]); b.type = "button"; b.textContent = g[1];
      b.addEventListener("click", function (ev) {
        ev.stopPropagation();
        if (store && store.reviewCard) store.reviewCard(srsId(p), g[0]);
        if (onGrade) { onGrade(); return; }
        bodyEl.__keepScroll = bodyEl.scrollTop;
        render(); syncDueChip();
      });
      grades.appendChild(b);
    });
    box.appendChild(grades);
    return box;
  }

  function card(p, idx) {
    var open = revealAll || !!p.__open;
    var c = el("div", "iqa-card" + (open ? " open" : "") + (got[p.id] ? " got" : "") + (bank.srs && isDue(p) ? " due" : ""));

    // question row (click to flip)
    var qrow = el("div", "iqa-q");
    qrow.innerHTML =
      '<span class="iqa-num">' + (idx + 1) + '</span>' +
      '<span class="iqa-qtext">' + esc(p.q) + '</span>' +
      '<span class="iqa-badges">' +
      (bank.srs && isDue(p) ? '<span class="iqa-due-dot" title="Due for review">●</span>' : '') +
      '<span class="iqa-lvl ' + lvlClass(p.difficulty) + '">' + esc(p.difficulty || "Core") + '</span>' +
      '<span class="iqa-caret">' + (open ? "▾" : "▸") + '</span>' +
      '</span>';
    qrow.addEventListener("click", function () {
      p.__open = !(revealAll || p.__open);
      if (revealAll) { p.__open = false; revealAll = false; syncRevealBtn(); }
      bodyEl.__keepScroll = bodyEl.scrollTop;
      render();
    });
    c.appendChild(qrow);

    if (open) {
      var ans = el("div", "iqa-a");
      ans.appendChild(el("div", "iqa-a-body", p.a || ""));
      if (p.code) ans.appendChild(codeBlock(p.code, p.lang));
      if (p.tip) ans.appendChild(el("div", "iqa-tip", "💡 <b>Interview tip.</b> " + p.tip));

      if (bank.srs) ans.appendChild(srsRow(p));

      // footer: got-it toggle + tags
      var foot = el("div", "iqa-foot");
      var gotBtn = el("button", "iqa-got-btn" + (got[p.id] ? " on" : ""));
      gotBtn.type = "button";
      gotBtn.textContent = got[p.id] ? "✓ Got it" : "Mark as known";
      gotBtn.addEventListener("click", function (ev) {
        ev.stopPropagation();
        if (got[p.id]) delete got[p.id]; else got[p.id] = 1;
        saveGot();
        bodyEl.__keepScroll = bodyEl.scrollTop;
        render();
      });
      foot.appendChild(gotBtn);
      if (p.tags && p.tags.length) {
        var tags = el("div", "iqa-tags");
        p.tags.slice(0, 5).forEach(function (t) { tags.appendChild(el("span", "iqa-tag", esc(t))); });
        foot.appendChild(tags);
      }
      ans.appendChild(foot);
      c.appendChild(ans);
    }
    return c;
  }

  function render() {
    if (!bodyEl) return;
    bodyEl.innerHTML = "";
    var list = visibleItems();
    var catLabel = activeCat === "all" ? "All questions" : (activeCat === "__due" ? "🔁 Due for review" : activeCat);
    var caption = catLabel + " · " + list.length + " question" + (list.length === 1 ? "" : "s");
    var known = list.filter(function (p) { return got[p.id]; }).length;
    if (list.length) caption += " · " + known + " known";
    bodyEl.appendChild(el("div", "ros-group", caption));

    if (!list.length) {
      var msg = query ? "No questions match “" + esc(query) + "”."
              : (activeCat === "__due" ? "Nothing due right now — grade some cards to schedule them." : "No questions in this group yet.");
      bodyEl.appendChild(el("div", "cmdk-none", msg));
      return;
    }
    list.forEach(function (p, i) { bodyEl.appendChild(card(p, i)); });
    bodyEl.scrollTop = bodyEl.__keepScroll || 0;
    bodyEl.__keepScroll = 0;
  }

  function syncRevealBtn() {
    if (!rootEl) return;
    var b = rootEl.querySelector(".iqa-reveal");
    if (b) { b.textContent = revealAll ? "Hide all" : "Reveal all"; b.classList.toggle("on", revealAll); }
  }
  function syncDueChip() {
    if (!rootEl) return;
    var chip = rootEl.querySelector('.ros-cat-chip[data-cat="__due"] .ros-cat-n');
    if (chip) chip.textContent = "(" + dueCount() + ")";
  }

  // The filter/search/reveal bar + category chips + body — shared verbatim by the
  // modal overlay and the inline (in-page) render.
  function panelMarkup() {
    var total = allItems().length;
    var dueChip = bank.srs
      ? '<button class="ros-chip ros-cat-chip iqa-due-chip" data-cat="__due">🔁 Due <span class="ros-cat-n">(' + dueCount() + ')</span></button>'
      : '';
    var catChips = '<button class="ros-chip ros-cat-chip active" data-cat="all">All <span class="ros-cat-n">(' + total + ')</span></button>' +
      dueChip +
      groupsWithItems().map(function (g) {
        var n = itemsFor(g).length;
        return '<button class="ros-chip ros-cat-chip" data-cat="' + esc(g) + '">' + esc(g) + ' <span class="ros-cat-n">(' + n + ')</span></button>';
      }).join("");
    var hint = bank.srs ? "tap a question to flip · grade your recall to schedule it" : "tap a question to flip · mark what you know";
    return '' +
      '  <div class="ros-filter iqa-tools">' +
      '    <input type="search" class="iqa-search" placeholder="Search questions, tags…" aria-label="Search questions" />' +
      '    <button class="ros-chip iqa-reveal" type="button">Reveal all</button>' +
      '  </div>' +
      '  <div class="ros-filter ros-cat-filter">' + catChips +
      '    <span class="ros-hint">' + hint + '</span>' +
      '  </div>' +
      '  <div class="ros-body iqa-body"></div>';
  }

  // Wire chip / search / reveal handlers within a container, and point the shared
  // bodyEl/searchEl/rootEl at it. Used by both the overlay and the inline render.
  function wirePanel(container) {
    rootEl = container;
    bodyEl = container.querySelector(".ros-body");
    searchEl = container.querySelector(".iqa-search");
    container.querySelectorAll(".ros-cat-chip").forEach(function (b) {
      b.addEventListener("click", function () {
        activeCat = b.getAttribute("data-cat");
        container.querySelectorAll(".ros-cat-chip").forEach(function (c) { c.classList.toggle("active", c === b); });
        bodyEl.__keepScroll = 0;
        render();
      });
    });
    searchEl.addEventListener("input", function () {
      query = (searchEl.value || "").trim().toLowerCase();
      bodyEl.__keepScroll = 0;
      render();
    });
    container.querySelector(".iqa-reveal").addEventListener("click", function () {
      revealAll = !revealAll;
      allItems().forEach(function (p) { p.__open = false; });
      syncRevealBtn();
      render();
    });
  }

  function build() {
    overlay = document.createElement("div");
    overlay.id = "interviewqa";
    overlay.className = "ros iqa hidden";
    overlay.innerHTML =
      '<div class="ros-box" role="dialog" aria-label="' + bank.aria + '">' +
      '  <div class="ros-head">' +
      '    <div class="ros-title">' + bank.title + ' <span class="ros-sub">' + bank.subtitle + '</span></div>' +
      '    <button class="ros-close" aria-label="Close">✕</button>' +
      '  </div>' +
      panelMarkup() +
      '</div>';
    document.body.appendChild(overlay);

    overlay.addEventListener("mousedown", function (e) { if (e.target === overlay) close(); });
    overlay.querySelector(".ros-close").addEventListener("click", close);
    wirePanel(overlay.querySelector(".ros-box"));

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && overlay.classList.contains("open")) close();
    });
    builtBank = bank.key;
  }

  function teardown() {
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    overlay = null; builtBank = null;
    if (!inlineHost) { bodyEl = null; searchEl = null; rootEl = null; }
  }

  function open(bankKey) {
    var b = BANKS[bankKey] || bank || BANKS.spark;
    // Switching banks rebuilds the overlay (different groups/title/chips).
    if (overlay && builtBank !== b.key) teardown();
    bank = b;
    got = loadGot();
    activeCat = "all"; query = ""; revealAll = false;
    inlineHost = null;           // we're in overlay mode now
    if (!overlay) build();
    // Re-point the shared panel refs at the overlay box (an inline render may have
    // moved them elsewhere); listeners were attached once in build().
    var box = overlay.querySelector(".ros-box");
    rootEl = box; bodyEl = box.querySelector(".ros-body"); searchEl = box.querySelector(".iqa-search");
    if (searchEl) searchEl.value = "";
    syncRevealBtn(); syncDueChip();
    render();
    overlay.classList.remove("hidden");
    requestAnimationFrame(function () { overlay.classList.add("open"); });
    document.body.classList.add("cmdk-lock");
    if (searchEl) setTimeout(function () { try { searchEl.focus(); } catch (e) {} }, 60);
  }
  function close() {
    if (!overlay) return;
    overlay.classList.remove("open");
    document.body.classList.remove("cmdk-lock");
    setTimeout(function () { overlay.classList.add("hidden"); }, 160);
  }

  // ---- inline ("Study Hub") render -----------------------------------------
  // A page view (not a modal) styled after the Kafka course's Study Hub:
  // hero + stat boxes, a search / difficulty-chip / group-select control bar,
  // and an accordion of questions. Reuses the shared data + SRS helpers.
  function availDiffs() {
    var seen = {};
    allItems().forEach(function (p) { seen[diffKey(p.difficulty)] = true; });
    return ["common", "core", "deep"].filter(function (k) { return seen[k]; });
  }
  function inlineVisible() {
    return allItems().filter(function (p) {
      if (activeCat !== "all" && p.group !== activeCat) return false;
      if (diffFilter !== "all" && diffKey(p.difficulty) !== diffFilter) return false;
      return matchesQuery(p);
    }).sort(function (a, b) { return diffOrder(a.difficulty) - diffOrder(b.difficulty); });
  }
  function syncInlineDue() {
    if (!inlineHost) return;
    var s = inlineHost.querySelector('.stat-val[data-stat="due"]');
    if (s) s.textContent = dueCount();
  }

  // Build an accordion row. Answer content is created lazily on first open so the
  // initial list stays light even with 100+ cards.
  function iqItem(p, idx) {
    var item = el("div", "iq-item" + (got[p.id] ? " iqs-known" : "") + (bank.srs && isDue(p) ? " iqs-due" : "") + (isEdited(p) ? " iqs-edited" : ""));
    var dk = diffKey(p.difficulty);
    var q = el("div", "iq-question");
    q.innerHTML =
      '<span class="q-num">' + pad2(idx + 1) + '</span>' +
      '<span class="iq-qtext">' + esc(viewQ(p)) + '</span>' +
      (bank.srs && isDue(p) ? '<span class="iqs-due-dot" title="Due for review">●</span>' : '') +
      '<span class="iqs-edited-badge"' + (isEdited(p) ? '' : ' hidden') + ' title="You have edited this question">edited</span>' +
      '<span class="diff-badge diff-' + dk + '">' + esc(diffLabel(p.difficulty)) + '</span>' +
      '<button type="button" class="iqs-edit-btn" aria-label="Edit this question" title="Edit this question">✎</button>' +
      '<span class="q-chevron">▾</span>';
    q.addEventListener("click", function (e) {
      if (e.target.closest("button") || e.target.closest("a")) return;
      buildAnswerOnce(item, p);
      item.classList.toggle("open");
    });
    var editBtn = q.querySelector(".iqs-edit-btn");
    if (editBtn) editBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      buildAnswerOnce(item, p);
      item.classList.add("open");
      enterEdit(item, p, idx);
    });
    item.appendChild(q);
    var wrap = el("div", "iq-answer-wrap");
    wrap.appendChild(el("div", "iq-answer"));
    item.appendChild(wrap);
    return item;
  }
  function buildAnswerOnce(item, p) {
    if (item.__built) return;
    var ans = item.querySelector(".iq-answer");
    if (!ans) return;
    ans.appendChild(el("div", "iqs-a-body", viewA(p)));
    if (p.code) ans.appendChild(codeBlock(p.code, p.lang));
    if (p.tip) ans.appendChild(el("div", "tip", "💡 <strong>Interview tip:</strong> " + p.tip));
    if (bank.srs) {
      var srsHost = el("div", "iqs-srs-host");
      ans.appendChild(srsHost);
      var paint = function () {
        srsHost.innerHTML = "";
        srsHost.appendChild(srsRow(p, function () {
          paint(); syncInlineDue();
          item.classList.toggle("iqs-due", isDue(p));
        }));
      };
      paint();
    }
    var foot = el("div", "iqs-foot");
    var gotBtn = el("button", "iqa-got-btn" + (got[p.id] ? " on" : ""));
    gotBtn.type = "button";
    gotBtn.textContent = got[p.id] ? "✓ Got it" : "Mark as known";
    gotBtn.addEventListener("click", function (ev) {
      ev.stopPropagation();
      if (got[p.id]) delete got[p.id]; else got[p.id] = 1;
      saveGot();
      item.classList.toggle("iqs-known", !!got[p.id]);
      gotBtn.classList.toggle("on", !!got[p.id]);
      gotBtn.textContent = got[p.id] ? "✓ Got it" : "Mark as known";
    });
    foot.appendChild(gotBtn);
    if (p.tags && p.tags.length) {
      var tags = el("div", "iqa-tags");
      p.tags.slice(0, 5).forEach(function (t) { tags.appendChild(el("span", "iqa-tag", esc(t))); });
      foot.appendChild(tags);
    }
    ans.appendChild(foot);
    item.__built = true;
  }

  // Re-render an item's read-only answer after an edit / reset, and refresh the
  // question text, the "edited" badge and the edited class — without a full list
  // re-render (so scroll position and which cards are open are preserved).
  function rebuildAnswer(item, p) {
    item.__built = false;
    var ans = item.querySelector(".iq-answer");
    if (ans) ans.innerHTML = "";
    buildAnswerOnce(item, p);
    var qt = item.querySelector(".iq-qtext");
    if (qt) qt.innerHTML = esc(viewQ(p));
    var badge = item.querySelector(".iqs-edited-badge");
    if (badge) badge.hidden = !isEdited(p);
    item.classList.toggle("iqs-edited", isEdited(p));
  }

  // In-place editor for one Q&A card. Edits the question (plain text) and the
  // answer (rich HTML). Saving writes an override into the synced store, so it
  // propagates to the module list here and to every device on the same sync code.
  function enterEdit(item, p, idx) {
    var ans = item.querySelector(".iq-answer");
    if (!ans) return;
    var ov = ovOf(p);
    var curQ = (ov && typeof ov.q === "string") ? ov.q : p.q;
    var curA = (ov && typeof ov.a === "string") ? ov.a : (p.a || "");
    item.classList.add("iqs-editing");

    var ed = el("div", "iqe-editor");
    ed.innerHTML =
      '<label class="iqe-label">Question</label>' +
      '<div class="iqe-field iqe-q" contenteditable="true" role="textbox" aria-label="Edit question"></div>' +
      '<label class="iqe-label">Answer</label>' +
      '<div class="iqe-field iqe-a" contenteditable="true" role="textbox" aria-label="Edit answer">' + curA + '</div>' +
      '<div class="iqe-actions">' +
      '  <button type="button" class="iqe-btn iqe-save">Save</button>' +
      '  <button type="button" class="iqe-btn iqe-cancel">Cancel</button>' +
      '  <button type="button" class="iqe-btn iqe-reset"' + (ov ? '' : ' hidden') + '>Reset to original</button>' +
      '</div>' +
      '<div class="iqe-hint">' + syncHintHtml() + '</div>';
    ans.innerHTML = "";
    ans.appendChild(ed);

    var qField = ed.querySelector(".iqe-q");
    var aField = ed.querySelector(".iqe-a");
    qField.textContent = curQ; // plain text (question renders escaped)
    var cta = ed.querySelector(".iqa-sync-cta");
    if (cta) cta.addEventListener("click", function (e) { e.preventDefault(); openSyncDialog(); });
    setTimeout(function () { try { qField.focus(); } catch (e) {} }, 0);

    function exit() { item.classList.remove("iqs-editing"); rebuildAnswer(item, p); }

    ed.querySelector(".iqe-save").addEventListener("click", function () {
      var nq = (qField.textContent || "").trim();
      var na = (aField.innerHTML || "").trim();
      var next = {};
      if (nq && nq !== (p.q || "").trim()) next.q = nq;
      if (na && na !== (p.a || "").trim()) next.a = na;
      if (store && store.setIqaEdit) store.setIqaEdit(bank.key, p.id, (next.q == null && next.a == null) ? null : next);
      exit();
    });
    ed.querySelector(".iqe-cancel").addEventListener("click", exit);
    ed.querySelector(".iqe-reset").addEventListener("click", function () {
      if (store && store.clearIqaEdit) store.clearIqaEdit(bank.key, p.id);
      exit();
    });
    ed.addEventListener("keydown", function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); ed.querySelector(".iqe-save").click(); }
      else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); ed.querySelector(".iqe-cancel").click(); }
    });
  }

  function renderInlineList() {
    if (!inlineListEl) return;
    var rows = inlineVisible();
    if (!rows.length) {
      inlineListEl.innerHTML = '<div class="study-empty">' +
        (query ? "No questions match “" + esc(query) + "”." : "No questions in this view.") + '</div>';
      return;
    }
    inlineListEl.innerHTML =
      '<div class="study-count">' + rows.length + " question" + (rows.length === 1 ? "" : "s") + '</div>' +
      '<div class="iq-list"></div>';
    var listEl = inlineListEl.querySelector(".iq-list");
    rows.forEach(function (p, i) { listEl.appendChild(iqItem(p, i)); });
  }

  // Render the Q&A INLINE into a page container (the Learn main panel), Study-Hub
  // style. The host owns scrolling.
  function mount(bankKey, host) {
    if (!host) return;
    var b = BANKS[bankKey] || bank || BANKS.spark;
    bank = b;
    got = loadGot();
    activeCat = "all"; query = ""; revealAll = false; diffFilter = "all";
    inlineHost = host;

    var total = allItems().length;
    var groups = groupsWithItems();
    var diffs = availDiffs();
    var tagText = bank.key === "sql" ? "★ · Interview Theory · SQL" : "★ · Interview Theory · PySpark";

    var diffChips = '<button class="study-chip active" data-diff="all">All levels</button>' +
      diffs.map(function (k) { return '<button class="study-chip" data-diff="' + k + '">' + esc(DIFF_META[k].label) + '</button>'; }).join("");
    var groupOpts = '<option value="all">All groups</option>' +
      groups.map(function (g) { return '<option value="' + esc(g) + '">' + esc(g) + ' (' + itemsFor(g).length + ')</option>'; }).join("");
    var statDue = bank.srs
      ? '<div class="stat-box"><span class="stat-val" data-stat="due">' + dueCount() + '</span><span class="stat-label">Due for review</span></div>'
      : '';

    host.innerHTML =
      '<div class="iqs-page">' +
      '  <div class="module-hero iqs-hero">' +
      '    <div class="module-tag">' + esc(tagText) + '</div>' +
      '    <h1 class="module-title">' + bank.title + '</h1>' +
      '    <p class="module-subtitle">Rapid-fire interview theory — filter by level, group, or keyword, then tap a question to reveal an interview-ready answer.</p>' +
      '  </div>' +
      '  <div class="study-stats">' +
      '    <div class="stat-box"><span class="stat-val">' + total + '</span><span class="stat-label">Interview Q&amp;As</span></div>' +
      '    <div class="stat-box"><span class="stat-val">' + groups.length + '</span><span class="stat-label">Topic groups</span></div>' +
      statDue +
      '  </div>' +
      '  <div class="study-controls">' +
      '    <input class="study-search" type="search" placeholder="🔍 Search questions, tags…" aria-label="Search questions" />' +
      '    <div class="study-chips" data-filter="difficulty">' + diffChips + '</div>' +
      '    <select class="study-select" aria-label="Filter by group">' + groupOpts + '</select>' +
      '  </div>' +
      '  <div class="study-results"></div>' +
      '</div>';

    var page = host.firstChild;
    rootEl = page;
    inlineListEl = page.querySelector(".study-results");
    searchEl = page.querySelector(".study-search");

    searchEl.addEventListener("input", function () {
      query = (searchEl.value || "").trim().toLowerCase();
      renderInlineList();
    });
    page.querySelectorAll(".study-chip").forEach(function (ch) {
      ch.addEventListener("click", function () {
        diffFilter = ch.getAttribute("data-diff");
        page.querySelectorAll(".study-chip").forEach(function (c) { c.classList.toggle("active", c === ch); });
        renderInlineList();
      });
    });
    page.querySelector(".study-select").addEventListener("change", function (e) {
      activeCat = e.target.value || "all";
      renderInlineList();
    });

    renderInlineList();
    if (host.scrollTop) host.scrollTop = 0;

    // Re-render when an edit lands from another device (or the cloud pull adopts
    // one), but never while the user is mid-edit here — that would discard their
    // open editor. Registered once; it no-ops unless this inline view is mounted.
    if (!refreshHooked) {
      refreshHooked = true;
      window.addEventListener("blind75:cloud-refresh", function () {
        if (inlineHost && document.body.contains(inlineHost) &&
            !(inlineListEl && inlineListEl.querySelector(".iqs-editing"))) {
          renderInlineList();
        }
      });
    }
  }
  var refreshHooked = false;

  function init() {
    // Topbar button: open the bank for whichever stack is active (PySpark or SQL).
    var btn = document.getElementById("interviewBtn");
    if (btn) btn.addEventListener("click", function () {
      var stack = document.body.getAttribute("data-stack");
      open(stack === "sql" ? "sql" : "spark");
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  window.INTERVIEW_QA_UI = { open: open, close: close, mount: mount };
})();
