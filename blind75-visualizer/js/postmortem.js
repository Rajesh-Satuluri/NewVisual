/*
 * postmortem.js — the "Interview Postmortem" modal.
 *
 * A sibling of the Rosetta panel: where Rosetta compares SYNTAX, Postmortem
 * teaches how to DISSECT an interview question. Reads data/postmortem.js and
 * renders one card per pattern — tells, approach, SQL-vs-PySpark side by side,
 * cost, do's/don'ts, and likely follow-ups.
 *
 * Reuses the Rosetta overlay shell classes (.ros / .ros-box / .ros-head / …) so
 * it feels native; postmortem-specific bits are pm-* classes. Self-contained
 * modal; opens from #postmortemBtn or window.POSTMORTEM_UI.open().
 * Load AFTER data/postmortem.js and the Prism vendor scripts.
 */
(function () {
  var DATA = window.POSTMORTEM || { groups: [], patterns: [] };
  var CODE_COLS = [
    { key: "sql", label: "SQL", lang: "sql", color: "#0ca678" },
    { key: "spark", label: "PySpark", lang: "python", color: "#f76707" }
  ];

  var overlay = null, bodyEl = null;
  var activeCat = "all";

  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  // Which groups actually contain a pattern (so we never show an empty chip).
  function groupsWithPatterns() {
    var seen = {};
    DATA.patterns.forEach(function (p) { seen[p.group] = true; });
    return (DATA.groups || []).filter(function (g) { return seen[g]; });
  }
  function patternsFor(cat) {
    return DATA.patterns.filter(function (p) { return cat === "all" || p.group === cat; });
  }

  // ---- clipboard (same fallback shape as rosetta.js) ----
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
  function ul(items, cls) {
    var u = el("ul", cls || null);
    (items || []).forEach(function (t) { u.appendChild(el("li", null, t)); });
    return u;
  }
  function sectionHead(text) { return el("div", "pm-sec-h", text); }

  // A single code column with a copy button, mirroring the Rosetta look.
  function codeCol(src, col) {
    var wrap = el("div", "ros-col");
    var head = el("div", "ros-col-h");
    head.innerHTML = '<span class="ros-col-name" style="--c:' + col.color + '">' + esc(col.label) + "</span>";
    var cbtn = el("button", "pm-copy"); cbtn.type = "button"; cbtn.textContent = "Copy";
    cbtn.addEventListener("click", function () {
      copyToClipboard(src, function () {
        cbtn.textContent = "Copied!"; cbtn.classList.add("ok");
        setTimeout(function () { cbtn.textContent = "Copy"; cbtn.classList.remove("ok"); }, 1300);
      });
    });
    head.appendChild(cbtn);
    var pre = el("pre", "code-pre ros-pre");
    var code = el("code", "language-" + col.lang);
    code.textContent = src;
    pre.appendChild(code);
    if (window.Prism) { try { window.Prism.highlightElement(code); } catch (e) {} }
    wrap.appendChild(head); wrap.appendChild(pre);
    return wrap;
  }

  function difficultyClass(d) { return "d-" + String(d || "").toLowerCase(); }

  function patternCard(p) {
    var card = el("div", "pm-card");

    // header: difficulty + title + also-known-as
    var head = el("div", "pm-card-h");
    var titleWrap = el("div", "pm-title-wrap");
    titleWrap.innerHTML =
      '<div class="pm-crumb"><span class="pm-diff ' + difficultyClass(p.difficulty) + '">' + esc(p.difficulty || "") + "</span>" +
      '<span class="pm-group">' + esc(p.group) + "</span></div>" +
      '<h3 class="pm-title">' + esc(p.title) + "</h3>" +
      (p.aka && p.aka.length ? '<div class="pm-aka">also: ' + p.aka.map(function (a) { return a; }).join(" · ") + "</div>" : "");
    head.appendChild(titleWrap);
    card.appendChild(head);

    // tells
    if (p.tells && p.tells.length) {
      var t = el("div", "pm-sec pm-tells");
      t.appendChild(sectionHead("🎯 How to recognize it"));
      t.appendChild(ul(p.tells, "pm-list"));
      card.appendChild(t);
    }

    // key idea
    if (p.keyIdea) card.appendChild(el("div", "pm-keyidea", "💡 <b>Key idea.</b> " + p.keyIdea));

    // approach
    if (p.approach && p.approach.length) {
      var a = el("div", "pm-sec");
      a.appendChild(sectionHead("🧭 Approach — narrate this"));
      var ol = el("ol", "pm-steps");
      p.approach.forEach(function (s) { ol.appendChild(el("li", null, s)); });
      a.appendChild(ol);
      card.appendChild(a);
    }

    // code side by side
    if (p.code) {
      var c = el("div", "pm-sec");
      c.appendChild(sectionHead("⌨ SQL vs PySpark"));
      var grid = el("div", "ros-cols ros-cols-multi pm-cols");
      CODE_COLS.forEach(function (col) { if (p.code[col.key]) grid.appendChild(codeCol(p.code[col.key], col)); });
      c.appendChild(grid);
      card.appendChild(c);
    }

    // cost
    if (p.cost) card.appendChild(el("div", "pm-cost", "⚡ <b>Cost.</b> " + p.cost));

    // do / don't
    if ((p.dos && p.dos.length) || (p.donts && p.donts.length)) {
      var dd = el("div", "pm-dd");
      if (p.dos && p.dos.length) {
        var doBox = el("div", "pm-do");
        doBox.appendChild(el("div", "pm-dd-h", "✅ Do"));
        doBox.appendChild(ul(p.dos, "pm-list"));
        dd.appendChild(doBox);
      }
      if (p.donts && p.donts.length) {
        var noBox = el("div", "pm-dont");
        noBox.appendChild(el("div", "pm-dd-h", "🚫 Don’t"));
        noBox.appendChild(ul(p.donts, "pm-list"));
        dd.appendChild(noBox);
      }
      card.appendChild(dd);
    }

    // follow-ups
    if (p.followUps && p.followUps.length) {
      var f = el("div", "pm-sec pm-fu-sec");
      f.appendChild(sectionHead("↪ Likely follow-ups"));
      p.followUps.forEach(function (fu) {
        var row = el("div", "pm-fu");
        row.innerHTML = '<div class="pm-fu-q">' + esc(fu.q) + '</div><div class="pm-fu-a">' + fu.a + "</div>";
        f.appendChild(row);
      });
      card.appendChild(f);
    }

    return card;
  }

  function render() {
    bodyEl.innerHTML = "";
    var list = patternsFor(activeCat);
    if (!list.length) {
      bodyEl.appendChild(el("div", "cmdk-none", "No postmortems in this category yet."));
      return;
    }
    bodyEl.appendChild(el("div", "ros-group",
      (activeCat === "all" ? "All patterns" : activeCat) + " · " + list.length + " pattern" + (list.length === 1 ? "" : "s")));
    list.forEach(function (p) { bodyEl.appendChild(patternCard(p)); });
    bodyEl.scrollTop = 0;
  }

  function build() {
    overlay = document.createElement("div");
    overlay.id = "postmortem";
    overlay.className = "ros pm hidden";
    var total = (DATA.patterns || []).length;
    var catChips = '<button class="ros-chip ros-cat-chip active" data-cat="all">All <span class="ros-cat-n">(' + total + ')</span></button>' +
      groupsWithPatterns().map(function (g) {
        var n = patternsFor(g).length;
        return '<button class="ros-chip ros-cat-chip" data-cat="' + esc(g) + '">' + esc(g) + ' <span class="ros-cat-n">(' + n + ')</span></button>';
      }).join("");
    overlay.innerHTML =
      '<div class="ros-box" role="dialog" aria-label="Interview postmortem">' +
      '  <div class="ros-head">' +
      '    <div class="ros-title">🩺 Interview postmortem <span class="ros-sub">— how to dissect the question, SQL &amp; PySpark</span></div>' +
      '    <button class="ros-close" aria-label="Close">✕</button>' +
      '  </div>' +
      '  <div class="ros-filter ros-cat-filter">' + catChips +
      '    <span class="ros-hint">spot it · plan it · code it · do’s &amp; don’ts</span>' +
      '  </div>' +
      '  <div class="ros-body pm-body"></div>' +
      '</div>';
    document.body.appendChild(overlay);
    bodyEl = overlay.querySelector(".ros-body");
    overlay.addEventListener("mousedown", function (e) { if (e.target === overlay) close(); });
    overlay.querySelector(".ros-close").addEventListener("click", close);
    overlay.querySelectorAll(".ros-cat-chip").forEach(function (b) {
      b.addEventListener("click", function () {
        activeCat = b.getAttribute("data-cat");
        overlay.querySelectorAll(".ros-cat-chip").forEach(function (c) { c.classList.toggle("active", c === b); });
        render();
      });
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
  }
  function close() {
    if (!overlay) return;
    overlay.classList.remove("open");
    document.body.classList.remove("cmdk-lock");
    setTimeout(function () { overlay.classList.add("hidden"); }, 160);
  }

  function init() {
    var btn = document.getElementById("postmortemBtn");
    if (btn) btn.addEventListener("click", function () { open(); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  window.POSTMORTEM_UI = { open: open, close: close };
})();
