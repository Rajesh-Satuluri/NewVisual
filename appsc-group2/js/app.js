/* APPSC Group 2 — syllabus-first study map. Pure vanilla JS, no deps.
   Phase 0: structure, weight (marks) and blueprint. PYQ-aware: when Phase 1
   attaches `pyq` data to topics, frequency/recency light up automatically. */
(function () {
  "use strict";
  var DATA = window.APPSC_G2;
  if (!DATA) { document.getElementById("main").innerHTML = "<p class='empty'>Data failed to load.</p>"; return; }
  var esc = function (s) { return (s == null ? "" : String(s)).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); };

  /* ---------- Flatten syllabus into sections + topics ---------- */
  var SECTIONS = [], TOPICS = [], sid = 0, tid = 0;
  DATA.syllabus.forEach(function (blk) {
    var indic = blk.marks == null ? null : null;
    var perSecIndic = (blk.stage === "Prelims") ? Math.round(150 / blk.sections.length) : null;
    blk.sections.forEach(function (sec) {
      var marks = sec.marks != null ? sec.marks : perSecIndic;
      var s = {
        id: "s" + (sid++), stage: blk.stage, code: blk.code, paper: blk.paper,
        blockMarks: blk.marks, meritCounts: !!blk.meritCounts, intro: blk.intro,
        name: sec.name, ap: !!sec.ap, marks: marks, indicative: sec.marks == null,
        topics: [], pyq: 0
      };
      sec.topics.forEach(function (t) {
        var tp = { id: "t" + (tid++), secId: s.id, name: t.name, ap: !!t.ap || !!sec.ap, pyq: (t.pyq || null) };
        if (tp.pyq) s.pyq += (tp.pyq.count || 0);
        s.topics.push(tp); TOPICS.push(tp);
      });
      SECTIONS.push(s);
    });
  });
  var secById = {}; SECTIONS.forEach(function (s) { secById[s.id] = s; });
  var HAS_PYQ = TOPICS.some(function (t) { return t.pyq; });
  var maxMarks = Math.max.apply(null, SECTIONS.map(function (s) { return s.marks || 0; })) || 1;
  var MAINS_MARKS = SECTIONS.filter(function (s) { return s.stage === "Mains"; }).reduce(function (a, s) { return a + (s.marks || 0); }, 0);

  /* ---------- Shared UI ---------- */
  var main = document.getElementById("main");
  function stageTag(st) { return "<span class='tag-stage " + (st === "Prelims" ? "prelims" : "mains") + "'>" + esc(st) + "</span>"; }
  function apTag(ap) { return ap ? "<span class='tag-ap'>AP</span>" : ""; }
  function pyqChip(s) {
    if (s.pyq) return "<span class='pyq-chip live'>" + s.pyq + " PYQs</span>";
    return "<span class='pyq-chip'>PYQs → Phase 1</span>";
  }
  function stat(k, v) { return "<div class='stat'><div class='k'>" + k + "</div><div class='v'>" + v + "</div></div>"; }
  function statStrip() {
    return "<div class='stats'>" +
      stat("Stages", "Prelims + Mains") +
      stat("Mains papers", 2) +
      stat("Sections", SECTIONS.length) +
      stat("Topics", TOPICS.length) +
      stat("Mains marks", MAINS_MARKS) +
      "</div>";
  }
  function phaseBanner() {
    return "<div class='phase-banner'><span class='ic'>🧭</span><div><b>Phase 0 — syllabus skeleton.</b> " + esc(DATA.phaseNote) +
      " Weights below are the official <b>mark allocation</b> (Mains) or an <b>indicative split</b> (Prelims). Real question frequency replaces them in Phase 1.</div></div>";
  }

  /* ---------- View: Priority Board ---------- */
  var boardSort = "weight", boardStage = "all";
  function renderBoard() {
    main.innerHTML =
      "<div class='view-head'><h1>Priority Board</h1><p>The whole APPSC Group 2 syllabus as one ranked list. Each row is a syllabus section, weighted by <b>marks</b>. Mains decides your merit — Prelims is only the gate. Click any section to see exactly which <b>parts</b> it covers.</p></div>" +
      phaseBanner() + statStrip() +
      "<div class='controls'>" +
      "<div class='seg' id='sortseg'><button data-s='weight' class='on'>By weight</button><button data-s='syllabus'>Syllabus order</button><button data-s='ap'>AP focus first</button></div>" +
      "<div class='seg' id='stageseg'><button data-g='all' class='on'>All</button><button data-g='Mains'>Mains</button><button data-g='Prelims'>Prelims</button></div>" +
      "<span class='hint'>Tip: click a row to drill in</span>" +
      "</div><div class='board' id='board'></div>";
    document.getElementById("sortseg").addEventListener("click", function (e) {
      var b = e.target.closest("button[data-s]"); if (!b) return; boardSort = b.dataset.s;
      [].forEach.call(this.children, function (c) { c.classList.toggle("on", c === b); }); paintBoard();
    });
    document.getElementById("stageseg").addEventListener("click", function (e) {
      var b = e.target.closest("button[data-g]"); if (!b) return; boardStage = b.dataset.g;
      [].forEach.call(this.children, function (c) { c.classList.toggle("on", c === b); }); paintBoard();
    });
    paintBoard();
  }
  function paintBoard() {
    var list = SECTIONS.slice();
    if (boardStage !== "all") list = list.filter(function (s) { return s.stage === boardStage; });
    if (boardSort === "weight") list.sort(function (a, b) { return (b.marks || 0) - (a.marks || 0) || (a.stage === "Mains" ? -1 : 1); });
    else if (boardSort === "ap") list.sort(function (a, b) { return (b.ap - a.ap) || (b.marks || 0) - (a.marks || 0); });
    // "syllabus" keeps natural order
    var el = document.getElementById("board");
    if (!list.length) { el.innerHTML = "<p class='empty'>No sections match.</p>"; return; }
    el.innerHTML = list.map(function (s, i) {
      var w = Math.max(8, Math.round((s.marks || 0) / maxMarks * 100));
      var mk = s.marks != null ? (s.marks + (s.indicative ? " (indic.)" : "") + " marks") : "—";
      return "<div class='row' data-key='" + s.id + "'>" +
        "<div class='rank'>" + (i + 1) + "</div>" +
        "<div><div class='title'>" + esc(s.name) + " " + stageTag(s.stage) + apTag(s.ap) +
        "</div><div class='sub'>" + esc(s.paper) + " · " + s.topics.length + " parts · " +
        (s.meritCounts ? "counts to merit" : "screening gate") + " · " + pyqChip(s) + "</div></div>" +
        "<div class='metric'><div class='big'>" + (s.marks != null ? s.marks : "—") + "</div><div class='lbl'>" + (s.indicative ? "indic. marks" : "marks") + "</div>" +
        "<div class='bar'><span style='width:" + w + "%'></span></div></div>" +
        "</div>";
    }).join("");
  }

  /* ---------- View: Syllabus Map (flow tree) ---------- */
  function renderMap() {
    main.innerHTML = "<div class='view-head'><h1>Syllabus Map</h1><p>Everything the exam can ask, as a flow — <b>Paper → Section → Part</b>. This is the veteran's map: scan it and you know the whole terrain. Colour marks the stage; click any node to drill in.</p></div>" +
      "<div class='map-legend'><span><span class='tag-stage prelims'>Prelims</span> screening gate</span><span><span class='tag-stage mains'>Mains</span> counts to merit</span><span><span class='tag-ap'>AP</span> Andhra-specific</span><span>Box width follows mark weight</span></div>" +
      "<div class='map-wrap'>" + buildSVG() + "</div>";
    main.querySelectorAll(".node").forEach(function (n) {
      n.addEventListener("click", function () {
        if (this.dataset.type === "sec") openSection(this.dataset.key);
      });
    });
  }
  function buildSVG() {
    var padY = 24, rowH = 24, colX = [80, 360, 650];
    var rows = [], blockY = {}, y = padY;
    DATA.syllabus.forEach(function (blk, bi) {
      var secs = SECTIONS.filter(function (s) { return s.paper === blk.paper; });
      var start = y;
      secs.forEach(function (s) {
        var ty0 = y;
        s.topics.forEach(function (t) { rows.push({ t: t, s: s, y: y, blk: blk }); y += rowH; });
        s._cy = (ty0 + y - rowH) / 2;
        y += 8;
      });
      blockY[blk.paper] = (start + y - rowH) / 2; y += 18;
    });
    var H = y + padY, W = 980;
    var stColor = function (st) { return st === "Prelims" ? "var(--accent2)" : "var(--accent)"; };
    var svg = "<svg viewBox='0 0 " + W + " " + H + "' width='" + W + "' height='" + H + "' xmlns='http://www.w3.org/2000/svg'>";
    // edges block -> section
    SECTIONS.forEach(function (s) { svg += edge(colX[0] + 60, blockY[s.paper], colX[1] - 60, s._cy); });
    // edges section -> topic
    rows.forEach(function (r) { svg += edge(colX[1] + 60, r.s._cy, colX[2] - 5, r.y); });
    // block (paper) nodes
    DATA.syllabus.forEach(function (blk) {
      var cy = blockY[blk.paper], c = stColor(blk.stage);
      svg += "<g class='node' data-type='blk'>" +
        "<rect x='" + (colX[0] - 60) + "' y='" + (cy - 22) + "' rx='9' width='120' height='44' fill='var(--bg-3)' stroke='" + c + "' stroke-width='1.6'/>" +
        "<text x='" + colX[0] + "' y='" + (cy - 4) + "' text-anchor='middle' fill='var(--text)' font-size='10' font-weight='800'>" + esc(blk.code) + "</text>" +
        "<text x='" + colX[0] + "' y='" + (cy + 10) + "' text-anchor='middle' fill='var(--muted)' font-size='9'>" + (blk.marks ? blk.marks + " marks" : "screening") + "</text></g>";
    });
    // section nodes
    SECTIONS.forEach(function (s) {
      var cy = s._cy, c = stColor(s.stage);
      var wpx = 150 + Math.round((s.marks || 10) / maxMarks * 40);
      svg += "<g class='node' data-type='sec' data-key='" + s.id + "'>" +
        "<rect x='" + (colX[1] - wpx / 2) + "' y='" + (cy - 13) + "' rx='8' width='" + wpx + "' height='26' fill='var(--bg-2)' stroke='" + c + "' stroke-width='1.3'/>" +
        "<text x='" + colX[1] + "' y='" + (cy + 4) + "' text-anchor='middle' fill='var(--text)' font-size='10.5' font-weight='700'>" + esc(clip(s.name, 34)) + (s.ap ? " ◆" : "") + "</text></g>";
    });
    // topic nodes (leaf labels)
    rows.forEach(function (r) {
      var cx = colX[2], cy = r.y, c = stColor(r.s.stage);
      svg += "<g class='node' data-type='sec' data-key='" + r.s.id + "'>" +
        "<circle cx='" + cx + "' cy='" + cy + "' r='4' fill='" + c + "' opacity='0.85'/>" +
        "<text x='" + (cx + 10) + "' y='" + (cy + 4) + "' fill='var(--muted)' font-size='10.5'>" + esc(clip(r.t.name, 56)) + "</text></g>";
    });
    return svg + "</svg>";
  }
  function edge(x1, y1, x2, y2) { var mx = (x1 + x2) / 2; return "<path class='edge' d='M" + x1 + " " + y1 + " C" + mx + " " + y1 + " " + mx + " " + y2 + " " + x2 + " " + y2 + "'/>"; }
  function clip(s, n) { return s.length > n ? s.slice(0, n - 1) + "…" : s; }

  /* ---------- View: Blueprint ---------- */
  function renderBlueprint() {
    var p = DATA.pattern;
    function card(key, obj, extraPapers) {
      var merit = obj.meritCounts;
      var papers = (obj.papers || []).map(function (pp) {
        return "<div class='bp-paper'><span class='pl'>" + esc(pp.label) + "</span><span class='pm'>" + (pp.questions ? pp.questions + " Q · " : "") + pp.marks + " mk" + (pp.minutes ? " · " + pp.minutes + "m" : "") + "</span></div>";
      }).join("");
      return "<div class='bp-card'><h3>" + esc(obj.name) + " <span class='merit " + (merit ? "yes" : "no") + "'>" + (merit ? "merit" : "qualifying") + "</span></h3>" +
        "<div class='pnote'>" + esc(obj.note) + "</div>" + papers +
        (obj.negative ? "<div class='bp-neg'>Negative marking: " + esc(obj.negative) + "</div>" : "") +
        (obj.marks && !obj.papers ? "<div class='bp-neg'>Max marks: " + obj.marks + "</div>" : "") + "</div>";
    }
    var tl = DATA.notifications.slice().reverse().map(function (n) {
      var cls = n.upcoming ? "upcoming" : (n.verified ? "" : "unverified");
      var flag = n.upcoming ? "<span class='tl-flag up'>upcoming</span>" : (n.verified ? "" : "<span class='tl-flag unv'>unverified</span>");
      return "<div class='tl-item " + cls + "'><div class='tl-yr'>" + esc(n.year) + " " + flag + (n.posts ? "<span class='tl-posts'>" + n.posts + " posts</span>" : "") + "</div>" +
        "<div class='tl-meta'>" + esc(n.no) + (n.screening ? " · screening " + esc(n.screening) : "") + (n.mains ? " · mains " + esc(n.mains) : "") + "<br>" + esc(n.note) + "</div></div>";
    }).join("");
    main.innerHTML = "<div class='view-head'><h1>Exam Blueprint</h1><p>How APPSC Group 2 is actually run — the stages, the marks, and how often the notification has come. Mains marks decide the merit list; Prelims only shortlists.</p></div>" +
      "<div class='bp-grid'>" + card("prelims", p.prelims) + card("mains", p.mains) + card("cpt", p.cpt) + "</div>" +
      "<div class='caveat'><b>Pattern note.</b> " + esc(DATA.blueprintNote) + "</div>" +
      "<div class='view-head' style='margin-top:26px'><h1 style='font-size:22px'>Notification history</h1><p>APPSC Group 2 runs in bursts — roughly every few years, not annually. The recent 2023→2026 back-to-back is why the current pattern matters most.</p></div>" +
      "<div class='timeline'>" + tl + "</div>" +
      "<div class='caveat'><b>Frequency read.</b> Four cycles are firmly dated (2016, 2018-19, 2023-24, 2026); older ones are reported but unverified. Plan to the <b>current objective pattern</b>, with 2024 screening + 2025 mains as the freshest PYQ signal for Phase 1.</div>";
  }

  /* ---------- Drill-down drawer ---------- */
  var drawer = document.getElementById("drawer"), dbody = document.getElementById("drawer-body");
  function openDrawer(html) { dbody.innerHTML = html; drawer.hidden = false; document.body.style.overflow = "hidden"; }
  function closeDrawer() { drawer.hidden = true; document.body.style.overflow = ""; }
  drawer.addEventListener("click", function (e) { if (e.target.hasAttribute("data-close")) closeDrawer(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeDrawer(); });

  function openSection(id) {
    var s = secById[id]; if (!s) return;
    var pts = s.topics.map(function (t) {
      return "<li>" + esc(t.name) + " " + apTag(t.ap && !s.ap) + " " +
        (t.pyq ? "<span class='pyq-chip live'>" + t.pyq.count + " PYQs</span>" : "<span class='pyq-chip'>Phase 1</span>") + "</li>";
    }).join("");
    openDrawer("<div class='crumb'>" + esc(s.stage) + " ▸ " + esc(s.paper) + "</div><h2>" + esc(s.name) + " " + stageTag(s.stage) + apTag(s.ap) + "</h2>" +
      "<div class='mini-stats'>" +
      "<div class='mini-stat'><div class='k'>Weight</div><div class='v'>" + (s.marks != null ? s.marks : "—") + "<span style='font-size:12px;color:var(--muted)'> " + (s.indicative ? "indic." : "marks") + "</span></div></div>" +
      "<div class='mini-stat'><div class='k'>Parts</div><div class='v'>" + s.topics.length + "</div></div>" +
      "<div class='mini-stat'><div class='k'>Merit</div><div class='v' style='font-size:14px'>" + (s.meritCounts ? "Yes" : "Gate") + "</div></div></div>" +
      (s.intro ? "<p class='hint' style='margin:4px 0 10px'>" + esc(s.intro) + "</p>" : "") +
      "<div class='subhead'>Which parts this section covers</div><ul class='points'>" + pts + "</ul>" +
      "<div class='caveat'>" + (HAS_PYQ ? "Previous-year questions are attached — frequency view live." : "Previous-year questions land in <b>Phase 1</b>. Each part above will then show how often it's actually asked and let you drill into real questions with solutions.") + "</div>");
  }
  // board / map row click
  main.addEventListener("click", function (e) {
    var row = e.target.closest(".row[data-key]"); if (row) openSection(row.dataset.key);
  });

  /* ---------- Routing / nav ---------- */
  var VIEWS = { board: renderBoard, map: renderMap, blueprint: renderBlueprint };
  var nav = document.querySelector(".nav");
  function go(view) {
    if (!VIEWS[view]) view = "board";
    [].forEach.call(nav.children, function (c) { c.classList.toggle("active", c.dataset.view === view); });
    VIEWS[view](); window.scrollTo(0, 0);
  }
  nav.addEventListener("click", function (e) {
    var b = e.target.closest(".nav-pill"); if (!b) return;
    if (location.hash.slice(1) !== b.dataset.view) location.hash = b.dataset.view; else go(b.dataset.view);
  });
  window.addEventListener("hashchange", function () { go(location.hash.slice(1)); });

  /* ---------- Theme ---------- */
  document.getElementById("theme-toggle").addEventListener("click", function () {
    var cur = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", cur);
    try { localStorage.setItem("appscg2-theme", cur); } catch (e) { }
    this.textContent = cur === "light" ? "☀" : "☾";
  });

  go(location.hash.slice(1) || "board");
})();
