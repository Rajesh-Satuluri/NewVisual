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
  var bank = BANKS.spark;      // current bank
  var builtBank = null;        // which bank the current overlay DOM was built for
  var activeCat = "all";
  var query = "";
  var revealAll = false;
  var got = {};

  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

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

  // Spaced-repetition grade row for srs banks.
  function srsRow(p) {
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
    if (!overlay) return;
    var b = overlay.querySelector(".iqa-reveal");
    if (b) { b.textContent = revealAll ? "Hide all" : "Reveal all"; b.classList.toggle("on", revealAll); }
  }
  function syncDueChip() {
    if (!overlay) return;
    var chip = overlay.querySelector('.ros-cat-chip[data-cat="__due"] .ros-cat-n');
    if (chip) chip.textContent = "(" + dueCount() + ")";
  }

  function build() {
    overlay = document.createElement("div");
    overlay.id = "interviewqa";
    overlay.className = "ros iqa hidden";
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
    overlay.innerHTML =
      '<div class="ros-box" role="dialog" aria-label="' + bank.aria + '">' +
      '  <div class="ros-head">' +
      '    <div class="ros-title">' + bank.title + ' <span class="ros-sub">' + bank.subtitle + '</span></div>' +
      '    <button class="ros-close" aria-label="Close">✕</button>' +
      '  </div>' +
      '  <div class="ros-filter iqa-tools">' +
      '    <input type="search" class="iqa-search" placeholder="Search questions, tags…" aria-label="Search questions" />' +
      '    <button class="ros-chip iqa-reveal" type="button">Reveal all</button>' +
      '  </div>' +
      '  <div class="ros-filter ros-cat-filter">' + catChips +
      '    <span class="ros-hint">' + hint + '</span>' +
      '  </div>' +
      '  <div class="ros-body iqa-body"></div>' +
      '</div>';
    document.body.appendChild(overlay);
    bodyEl = overlay.querySelector(".ros-body");
    searchEl = overlay.querySelector(".iqa-search");

    overlay.addEventListener("mousedown", function (e) { if (e.target === overlay) close(); });
    overlay.querySelector(".ros-close").addEventListener("click", close);

    overlay.querySelectorAll(".ros-cat-chip").forEach(function (b) {
      b.addEventListener("click", function () {
        activeCat = b.getAttribute("data-cat");
        overlay.querySelectorAll(".ros-cat-chip").forEach(function (c) { c.classList.toggle("active", c === b); });
        bodyEl.__keepScroll = 0;
        render();
      });
    });

    searchEl.addEventListener("input", function () {
      query = (searchEl.value || "").trim().toLowerCase();
      bodyEl.__keepScroll = 0;
      render();
    });

    overlay.querySelector(".iqa-reveal").addEventListener("click", function () {
      revealAll = !revealAll;
      allItems().forEach(function (p) { p.__open = false; });
      syncRevealBtn();
      render();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && overlay.classList.contains("open")) close();
    });
    builtBank = bank.key;
  }

  function teardown() {
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    overlay = null; bodyEl = null; searchEl = null; builtBank = null;
  }

  function open(bankKey) {
    var b = BANKS[bankKey] || bank || BANKS.spark;
    // Switching banks rebuilds the overlay (different groups/title/chips).
    if (overlay && builtBank !== b.key) teardown();
    bank = b;
    got = loadGot();
    activeCat = "all"; query = ""; revealAll = false;
    if (!overlay) build();
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

  window.INTERVIEW_QA_UI = { open: open, close: close };
})();
