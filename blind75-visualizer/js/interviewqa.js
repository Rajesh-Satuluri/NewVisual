/*
 * interviewqa.js — the "Interview Q&A" flashcard panel for PySpark Learn.
 *
 * A sibling of the Postmortem panel: rapid-fire, interview-ready theory answers.
 * Each card shows a question; click it (or "Reveal all") to flip open a crisp
 * trendy-tech answer, optional code, and an interview tip. Group filter chips
 * with counts, a live search box, and a per-question "Got it" toggle persisted
 * in localStorage.
 *
 * Reuses the Rosetta/Postmortem overlay shell (.ros / .ros-box / .ros-head / …);
 * panel-specific bits are iqa-* classes. Opens from #interviewBtn or
 * window.INTERVIEW_QA_UI.open(). Load AFTER data/pyspark/interview_qa.js and Prism.
 */
(function () {
  var DATA = window.PYSPARK_QA || { groups: [], items: [] };
  var GOT_KEY = "iqaGot:v1";

  var overlay = null, bodyEl = null, searchEl = null;
  var activeCat = "all";
  var query = "";
  var revealAll = false;
  var got = load();

  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  function load() {
    try { return JSON.parse(localStorage.getItem(GOT_KEY) || "{}") || {}; } catch (e) { return {}; }
  }
  function save() {
    try { localStorage.setItem(GOT_KEY, JSON.stringify(got)); } catch (e) {}
  }

  // Only groups that actually contain an item (so we never show an empty chip).
  function groupsWithItems() {
    var seen = {};
    (DATA.items || []).forEach(function (p) { seen[p.group] = true; });
    return (DATA.groups || []).filter(function (g) { return seen[g]; });
  }
  function itemsFor(cat) {
    return (DATA.items || []).filter(function (p) { return cat === "all" || p.group === cat; });
  }
  function matchesQuery(p) {
    if (!query) return true;
    var hay = (p.q + " " + (p.a || "") + " " + (p.tags || []).join(" ") + " " + (p.code || "")).toLowerCase();
    return hay.indexOf(query) !== -1;
  }
  function visibleItems() {
    return itemsFor(activeCat).filter(matchesQuery);
  }

  // ---- clipboard (same fallback shape as rosetta/postmortem) ----
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
    head.innerHTML = '<span class="ros-col-name" style="--c:#f76707">PySpark</span>';
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
    var code = el("code", "language-" + (lang || "python"));
    code.textContent = src;
    pre.appendChild(code);
    if (window.Prism) { try { window.Prism.highlightElement(code); } catch (e) {} }
    wrap.appendChild(head); wrap.appendChild(pre);
    return wrap;
  }

  function card(p, idx) {
    var open = revealAll || !!p.__open;
    var c = el("div", "iqa-card" + (open ? " open" : "") + (got[p.id] ? " got" : ""));

    // question row (click to flip)
    var qrow = el("div", "iqa-q");
    qrow.innerHTML =
      '<span class="iqa-num">' + (idx + 1) + '</span>' +
      '<span class="iqa-qtext">' + esc(p.q) + '</span>' +
      '<span class="iqa-badges">' +
      '<span class="iqa-lvl ' + lvlClass(p.difficulty) + '">' + esc(p.difficulty || "Core") + '</span>' +
      '<span class="iqa-caret">' + (open ? "▾" : "▸") + '</span>' +
      '</span>';
    qrow.addEventListener("click", function () {
      p.__open = !(revealAll || p.__open);
      // when revealAll is on, an individual click collapses just this one
      if (revealAll) { p.__open = false; revealAll = false; syncRevealBtn(); }
      render();
    });
    c.appendChild(qrow);

    if (open) {
      var ans = el("div", "iqa-a");
      ans.appendChild(el("div", "iqa-a-body", p.a || ""));
      if (p.code) ans.appendChild(codeBlock(p.code, p.lang));
      if (p.tip) ans.appendChild(el("div", "iqa-tip", "💡 <b>Interview tip.</b> " + p.tip));

      // footer: got-it toggle + tags
      var foot = el("div", "iqa-foot");
      var gotBtn = el("button", "iqa-got-btn" + (got[p.id] ? " on" : ""));
      gotBtn.type = "button";
      gotBtn.textContent = got[p.id] ? "✓ Got it" : "Mark as known";
      gotBtn.addEventListener("click", function (ev) {
        ev.stopPropagation();
        if (got[p.id]) delete got[p.id]; else got[p.id] = 1;
        save(); render();
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
    var caption = (activeCat === "all" ? "All questions" : activeCat) +
      " · " + list.length + " question" + (list.length === 1 ? "" : "s");
    var known = list.filter(function (p) { return got[p.id]; }).length;
    if (list.length) caption += " · " + known + " known";
    bodyEl.appendChild(el("div", "ros-group", caption));

    if (!list.length) {
      bodyEl.appendChild(el("div", "cmdk-none", query ? "No questions match “" + esc(query) + "”." : "No questions in this group yet."));
      return;
    }
    list.forEach(function (p, i) { bodyEl.appendChild(card(p, i)); });
    bodyEl.scrollTop = bodyEl.__keepScroll || 0;
  }

  function syncRevealBtn() {
    if (!overlay) return;
    var b = overlay.querySelector(".iqa-reveal");
    if (b) { b.textContent = revealAll ? "Hide all" : "Reveal all"; b.classList.toggle("on", revealAll); }
  }

  function build() {
    overlay = document.createElement("div");
    overlay.id = "interviewqa";
    overlay.className = "ros iqa hidden";
    var total = (DATA.items || []).length;
    var catChips = '<button class="ros-chip ros-cat-chip active" data-cat="all">All <span class="ros-cat-n">(' + total + ')</span></button>' +
      groupsWithItems().map(function (g) {
        var n = itemsFor(g).length;
        return '<button class="ros-chip ros-cat-chip" data-cat="' + esc(g) + '">' + esc(g) + ' <span class="ros-cat-n">(' + n + ')</span></button>';
      }).join("");
    overlay.innerHTML =
      '<div class="ros-box" role="dialog" aria-label="PySpark interview Q and A">' +
      '  <div class="ros-head">' +
      '    <div class="ros-title">🎤 PySpark Interview Q&amp;A <span class="ros-sub">— rapid-fire theory, interview-ready answers</span></div>' +
      '    <button class="ros-close" aria-label="Close">✕</button>' +
      '  </div>' +
      '  <div class="ros-filter iqa-tools">' +
      '    <input type="search" class="iqa-search" placeholder="Search questions, tags…" aria-label="Search questions" />' +
      '    <button class="ros-chip iqa-reveal" type="button">Reveal all</button>' +
      '  </div>' +
      '  <div class="ros-filter ros-cat-filter">' + catChips +
      '    <span class="ros-hint">tap a question to flip · mark what you know</span>' +
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
      // clear per-card manual state so the global toggle is authoritative
      (DATA.items || []).forEach(function (p) { p.__open = false; });
      syncRevealBtn();
      render();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && overlay.classList.contains("open")) close();
    });
  }

  function open() {
    if (!overlay) build();
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
    var btn = document.getElementById("interviewBtn");
    if (btn) btn.addEventListener("click", function () { open(); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  window.INTERVIEW_QA_UI = { open: open, close: close };
})();
