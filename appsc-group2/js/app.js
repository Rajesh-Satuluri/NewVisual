/* APPSC Group 2 — syllabus-first study map. Pure vanilla JS, no deps.
   Views:
     • Priority Board  — sections ranked by mark weight (Phase 0)
     • Syllabus Map    — Paper → Section → Part flow tree (Phase 0)
     • Prep Tracker    — study status + spaced revision + readiness (works off syllabus)
     • Blueprint       — pattern + notification history (Phase 0)
     • Practice        — Coverage / Heatmap / Quiz (unlocks automatically once
                         PYQ data is attached to topics; hidden until then)
   PYQ-aware from day one: when `pyq` data is attached to topics in
   data/syllabus.js, frequency/recency/coverage/quiz light up with no rewrite. */
(function () {
  "use strict";
  var DATA = window.APPSC_G2;
  if (!DATA) { document.getElementById("main").innerHTML = "<p class='empty'>Data failed to load.</p>"; return; }
  var esc = function (s) { return (s == null ? "" : String(s)).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); };
  var YEAR_W = { 2025: 1.0, 2024: 0.95, 2023: 0.85, 2022: 0.7, 2021: 0.6, 2020: 0.5, 2019: 0.45, 2016: 0.3, 2011: 0.18, 2008: 0.12 };

  /* ---------- Flatten syllabus into sections + topics ---------- */
  var SECTIONS = [], TOPICS = [], sid = 0, tid = 0;
  DATA.syllabus.forEach(function (blk) {
    var perSecIndic = (blk.stage === "Prelims") ? Math.round(150 / blk.sections.length) : null;
    blk.sections.forEach(function (sec) {
      var marks = sec.marks != null ? sec.marks : perSecIndic;
      var s = {
        id: "s" + (sid++), stage: blk.stage, code: blk.code, paper: blk.paper,
        blockMarks: blk.marks, meritCounts: !!blk.meritCounts, intro: blk.intro,
        name: sec.name, ap: !!sec.ap, marks: marks, indicative: sec.marks == null,
        topics: [], pyq: 0, years: {}, exams: {}
      };
      sec.topics.forEach(function (t) {
        var tp = { id: "t" + (tid++), secId: s.id, sec: s.name, stage: s.stage, name: t.name, ap: !!t.ap || !!sec.ap, w: 0, pyq: (t.pyq || null) };
        if (tp.pyq) {
          s.pyq += (tp.pyq.count || 0);
          for (var y in (tp.pyq.years || {})) { s.years[y] = (s.years[y] || 0) + tp.pyq.years[y]; }
          for (var ex in (tp.pyq.exams || {})) { s.exams[ex] = (s.exams[ex] || 0) + tp.pyq.exams[ex]; }
        }
        s.topics.push(tp); TOPICS.push(tp);
      });
      // even split of section marks across topics = per-topic study weight
      var pw = (s.marks || 10) / (s.topics.length || 1);
      s.topics.forEach(function (tp) { tp.w = pw; });
      SECTIONS.push(s);
    });
  });
  var secById = {}; SECTIONS.forEach(function (s) { secById[s.id] = s; });
  var topById = {}; TOPICS.forEach(function (t) { topById[t.id] = t; });
  var HAS_PYQ = TOPICS.some(function (t) { return t.pyq; });
  var maxMarks = Math.max.apply(null, SECTIONS.map(function (s) { return s.marks || 0; })) || 1;
  var MAINS_MARKS = SECTIONS.filter(function (s) { return s.stage === "Mains"; }).reduce(function (a, s) { return a + (s.marks || 0); }, 0);
  var ALL_YEARS = []; var ALL_EXAMS = [];
  TOPICS.forEach(function (t) { if (t.pyq) { for (var y in t.pyq.years) if (ALL_YEARS.indexOf(+y) < 0) ALL_YEARS.push(+y); for (var e in t.pyq.exams) if (ALL_EXAMS.indexOf(e) < 0) ALL_EXAMS.push(e); } });
  ALL_YEARS.sort();

  /* ---------- Progress store (localStorage) ---------- */
  var PKEY = "appscg2-progress";
  var progress = (function () { try { return JSON.parse(localStorage.getItem(PKEY)) || {}; } catch (e) { return {}; } })();
  function saveProgress() { try { localStorage.setItem(PKEY, JSON.stringify(progress)); } catch (e) { } }
  function statusOf(tid) { return (progress[tid] && progress[tid].s) || 0; }
  function cycleStatus(tid) {
    var cur = statusOf(tid), next = (cur + 1) % 3;
    if (next === 0) delete progress[tid]; else progress[tid] = { s: next, t: Date.now() };
    saveProgress();
  }
  // readiness 0..1 for a list of topics (learning=0.5, revised=1)
  function readiness(topics) {
    var w = 0, got = 0;
    topics.forEach(function (t) { w += t.w; var s = statusOf(t.id); got += t.w * (s === 2 ? 1 : s === 1 ? 0.5 : 0); });
    return w ? got / w : 0;
  }

  /* ---------- Shared UI ---------- */
  var main = document.getElementById("main");
  var STATUS_LABEL = ["Not started", "Learning", "Revised"];
  function stageTag(st) { return "<span class='tag-stage " + (st === "Prelims" ? "prelims" : "mains") + "'>" + esc(st) + "</span>"; }
  function apTag(ap) { return ap ? "<span class='tag-ap'>AP</span>" : ""; }
  function pyqChip(s) { return s.pyq ? "<span class='pyq-chip live'>" + s.pyq + " PYQs</span>" : "<span class='pyq-chip'>PYQs → Phase 1</span>"; }
  function stat(k, v) { return "<div class='stat'><div class='k'>" + k + "</div><div class='v'>" + v + "</div></div>"; }
  function statStrip() {
    return "<div class='stats'>" + stat("Stages", "Prelims + Mains") + stat("Mains papers", 2) +
      stat("Sections", SECTIONS.length) + stat("Topics", TOPICS.length) + stat("Mains marks", MAINS_MARKS) + "</div>";
  }
  function phaseBanner() {
    return "<div class='phase-banner'><span class='ic'>🧭</span><div><b>Phase 0 — syllabus skeleton.</b> " + esc(DATA.phaseNote) +
      " Weights below are the official <b>mark allocation</b> (Mains) or an <b>indicative split</b> (Prelims). Real question frequency replaces them once PYQs are parsed.</div></div>";
  }
  function pct(x) { return Math.round(x * 100); }
  function ring(p, size, label, sub) {
    var r = (size - 10) / 2, c = 2 * Math.PI * r, off = c * (1 - p);
    var col = p < 0.34 ? "var(--p1)" : p < 0.67 ? "var(--p2)" : "var(--p3)";
    return "<div class='ringwrap'><svg width='" + size + "' height='" + size + "' viewBox='0 0 " + size + " " + size + "'>" +
      "<circle cx='" + size / 2 + "' cy='" + size / 2 + "' r='" + r + "' fill='none' stroke='var(--bg-4)' stroke-width='8'/>" +
      "<circle cx='" + size / 2 + "' cy='" + size / 2 + "' r='" + r + "' fill='none' stroke='" + col + "' stroke-width='8' stroke-linecap='round' stroke-dasharray='" + c.toFixed(1) + "' stroke-dashoffset='" + off.toFixed(1) + "' transform='rotate(-90 " + size / 2 + " " + size / 2 + ")'/>" +
      "<text x='50%' y='50%' text-anchor='middle' dy='.35em' font-size='" + (size / 4) + "' font-weight='800' fill='var(--text)'>" + pct(p) + "%</text></svg>" +
      "<div class='ringlab'>" + label + (sub ? "<span>" + sub + "</span>" : "") + "</div></div>";
  }
  function heatColor(v, max) {
    if (!v) return "background:var(--bg-3);color:var(--muted-2)";
    var t = Math.pow(v / max, 0.6);
    return "background:rgb(" + Math.round(1 + t * 20) + "," + Math.round(90 + t * 120) + "," + Math.round(180 + t * 40) + ")";
  }

  /* ---------- View: Priority Board ---------- */
  var boardSort = "weight", boardStage = "all";
  function renderBoard() {
    main.innerHTML =
      "<div class='view-head'><h1>Priority Board</h1><p>The whole APPSC Group 2 syllabus as one ranked list. Each row is a syllabus section, weighted by <b>marks</b>. Mains decides your merit — Prelims is only the gate. Click any section to see exactly which <b>parts</b> it covers.</p></div>" +
      (HAS_PYQ ? "" : phaseBanner()) + statStrip() +
      "<div class='controls'>" +
      "<div class='seg' id='sortseg'><button data-s='weight' class='on'>By weight</button><button data-s='syllabus'>Syllabus order</button><button data-s='ap'>AP focus first</button>" + (HAS_PYQ ? "<button data-s='pyq'>Most asked</button>" : "") + "</div>" +
      "<div class='seg' id='stageseg'><button data-g='all' class='on'>All</button><button data-g='Mains'>Mains</button><button data-g='Prelims'>Prelims</button></div>" +
      "<span class='hint'>Tip: click a row to drill in</span></div><div class='board' id='board'></div>";
    document.getElementById("sortseg").addEventListener("click", function (e) { var b = e.target.closest("button[data-s]"); if (!b) return; boardSort = b.dataset.s; [].forEach.call(this.children, function (c) { c.classList.toggle("on", c === b); }); paintBoard(); });
    document.getElementById("stageseg").addEventListener("click", function (e) { var b = e.target.closest("button[data-g]"); if (!b) return; boardStage = b.dataset.g; [].forEach.call(this.children, function (c) { c.classList.toggle("on", c === b); }); paintBoard(); });
    paintBoard();
  }
  function paintBoard() {
    var list = SECTIONS.slice();
    if (boardStage !== "all") list = list.filter(function (s) { return s.stage === boardStage; });
    if (boardSort === "weight") list.sort(function (a, b) { return (b.marks || 0) - (a.marks || 0) || (a.stage === "Mains" ? -1 : 1); });
    else if (boardSort === "ap") list.sort(function (a, b) { return (b.ap - a.ap) || (b.marks || 0) - (a.marks || 0); });
    else if (boardSort === "pyq") list.sort(function (a, b) { return b.pyq - a.pyq; });
    var el = document.getElementById("board");
    if (!list.length) { el.innerHTML = "<p class='empty'>No sections match.</p>"; return; }
    el.innerHTML = list.map(function (s, i) {
      var w = Math.max(8, Math.round((s.marks || 0) / maxMarks * 100));
      return "<div class='row' data-key='" + s.id + "'><div class='rank'>" + (i + 1) + "</div>" +
        "<div><div class='title'>" + esc(s.name) + " " + stageTag(s.stage) + apTag(s.ap) + "</div>" +
        "<div class='sub'>" + esc(s.paper) + " · " + s.topics.length + " parts · " + (s.meritCounts ? "counts to merit" : "screening gate") + " · " + pyqChip(s) + "</div></div>" +
        "<div class='metric'><div class='big'>" + (s.marks != null ? s.marks : "—") + "</div><div class='lbl'>" + (s.indicative ? "indic. marks" : "marks") + "</div>" +
        "<div class='bar'><span style='width:" + w + "%'></span></div></div></div>";
    }).join("");
  }

  /* ---------- View: Syllabus Map ---------- */
  function renderMap() {
    main.innerHTML = "<div class='view-head'><h1>Syllabus Map</h1><p>Everything the exam can ask, as a flow — <b>Paper → Section → Part</b>. This is the veteran's map: scan it and you know the whole terrain. Colour marks the stage; click any node to drill in.</p></div>" +
      "<div class='map-legend'><span><span class='tag-stage prelims'>Prelims</span> screening gate</span><span><span class='tag-stage mains'>Mains</span> counts to merit</span><span><span class='tag-ap'>AP</span> Andhra-specific</span><span>Box width follows mark weight</span></div>" +
      "<div class='map-wrap'>" + buildSVG() + "</div>";
    main.querySelectorAll(".node").forEach(function (n) { n.addEventListener("click", function () { if (this.dataset.type === "sec") openSection(this.dataset.key); }); });
  }
  function buildSVG() {
    var padY = 24, rowH = 24, colX = [80, 360, 650];
    var rows = [], blockY = {}, y = padY;
    DATA.syllabus.forEach(function (blk) {
      var secs = SECTIONS.filter(function (s) { return s.paper === blk.paper; });
      var start = y;
      secs.forEach(function (s) { var ty0 = y; s.topics.forEach(function (t) { rows.push({ t: t, s: s, y: y, blk: blk }); y += rowH; }); s._cy = (ty0 + y - rowH) / 2; y += 8; });
      blockY[blk.paper] = (start + y - rowH) / 2; y += 18;
    });
    var H = y + padY, W = 980;
    var stColor = function (st) { return st === "Prelims" ? "var(--accent2)" : "var(--accent)"; };
    var svg = "<svg viewBox='0 0 " + W + " " + H + "' width='" + W + "' height='" + H + "' xmlns='http://www.w3.org/2000/svg'>";
    SECTIONS.forEach(function (s) { svg += edge(colX[0] + 60, blockY[s.paper], colX[1] - 60, s._cy); });
    rows.forEach(function (r) { svg += edge(colX[1] + 60, r.s._cy, colX[2] - 5, r.y); });
    DATA.syllabus.forEach(function (blk) {
      var cy = blockY[blk.paper], c = stColor(blk.stage);
      svg += "<g class='node' data-type='blk'><rect x='" + (colX[0] - 60) + "' y='" + (cy - 22) + "' rx='9' width='120' height='44' fill='var(--bg-3)' stroke='" + c + "' stroke-width='1.6'/>" +
        "<text x='" + colX[0] + "' y='" + (cy - 4) + "' text-anchor='middle' fill='var(--text)' font-size='10' font-weight='800'>" + esc(blk.code) + "</text>" +
        "<text x='" + colX[0] + "' y='" + (cy + 10) + "' text-anchor='middle' fill='var(--muted)' font-size='9'>" + (blk.marks ? blk.marks + " marks" : "screening") + "</text></g>";
    });
    SECTIONS.forEach(function (s) {
      var cy = s._cy, c = stColor(s.stage), wpx = 150 + Math.round((s.marks || 10) / maxMarks * 40);
      svg += "<g class='node' data-type='sec' data-key='" + s.id + "'><rect x='" + (colX[1] - wpx / 2) + "' y='" + (cy - 13) + "' rx='8' width='" + wpx + "' height='26' fill='var(--bg-2)' stroke='" + c + "' stroke-width='1.3'/>" +
        "<text x='" + colX[1] + "' y='" + (cy + 4) + "' text-anchor='middle' fill='var(--text)' font-size='10.5' font-weight='700'>" + esc(clip(s.name, 34)) + (s.ap ? " ◆" : "") + "</text></g>";
    });
    rows.forEach(function (r) {
      var cx = colX[2], cy = r.y, c = stColor(r.s.stage);
      svg += "<g class='node' data-type='sec' data-key='" + r.s.id + "'><circle cx='" + cx + "' cy='" + cy + "' r='4' fill='" + c + "' opacity='0.85'/>" +
        "<text x='" + (cx + 10) + "' y='" + (cy + 4) + "' fill='var(--muted)' font-size='10.5'>" + esc(clip(r.t.name, 56)) + "</text></g>";
    });
    return svg + "</svg>";
  }
  function edge(x1, y1, x2, y2) { var mx = (x1 + x2) / 2; return "<path class='edge' d='M" + x1 + " " + y1 + " C" + mx + " " + y1 + " " + mx + " " + y2 + " " + x2 + " " + y2 + "'/>"; }
  function clip(s, n) { return s.length > n ? s.slice(0, n - 1) + "…" : s; }

  /* ---------- View: Prep Tracker ---------- */
  function renderTracker() {
    var mains = TOPICS.filter(function (t) { return t.stage === "Mains"; });
    var prelims = TOPICS.filter(function (t) { return t.stage === "Prelims"; });
    var started = TOPICS.filter(function (t) { return statusOf(t.id) > 0; }).length;
    var revised = TOPICS.filter(function (t) { return statusOf(t.id) === 2; }).length;
    main.innerHTML =
      "<div class='view-head'><h1>Prep Tracker</h1><p>Mark each part as you study it — tap once for <b>Learning</b>, again for <b>Revised</b>. Readiness is weighted by marks (Mains decides merit). The <b>Revise next</b> strip resurfaces whatever you touched longest ago. Saved in your browser.</p></div>" +
      "<div class='rings'>" +
      ring(readiness(mains), 120, "Merit readiness", "Mains, marks-weighted") +
      ring(readiness(prelims), 120, "Prelims readiness", "screening gate") +
      "<div class='track-counts'>" +
      "<div><div class='v'>" + started + "<small>/" + TOPICS.length + "</small></div><div class='k'>parts started</div></div>" +
      "<div><div class='v'>" + revised + "<small>/" + TOPICS.length + "</small></div><div class='k'>parts revised</div></div>" +
      "<button class='btn' id='resetprog'>Reset progress</button></div></div>" +
      "<div id='revnext'></div>" +
      "<div class='controls' style='margin-top:6px'><span class='hint'>Tap a part to cycle: <b>Not started → Learning → Revised</b></span></div>" +
      "<div id='trackblocks'></div>";
    document.getElementById("resetprog").addEventListener("click", function () { if (confirm("Clear all study progress?")) { progress = {}; saveProgress(); renderTracker(); } });
    paintRevNext(); paintTrackBlocks();
  }
  function paintRevNext() {
    var touched = TOPICS.filter(function (t) { return statusOf(t.id) > 0; })
      .sort(function (a, b) { return (progress[a.id].t || 0) - (progress[b.id].t || 0); }).slice(0, 6);
    var el = document.getElementById("revnext");
    if (!touched.length) { el.innerHTML = "<div class='caveat'>Nothing tracked yet. Tap parts below to start — the ones you studied longest ago will surface here for revision.</div>"; return; }
    el.innerHTML = "<div class='subhead' style='margin-top:4px'>Revise next <span style='color:var(--muted-2);font-weight:600;text-transform:none;letter-spacing:0'>· oldest-touched first</span></div><div class='revrow'>" +
      touched.map(function (t) {
        var days = Math.floor((Date.now() - (progress[t.id].t || Date.now())) / 86400000);
        return "<div class='revcard' data-tid='" + t.id + "'><div class='rn'>" + esc(t.name) + "</div><div class='rm'>" + esc(t.sec) + " " + stageTag(t.stage) + "</div><div class='rd'>" + STATUS_LABEL[statusOf(t.id)] + " · " + (days <= 0 ? "today" : days + "d ago") + "</div></div>";
      }).join("") + "</div>";
    el.querySelectorAll(".revcard").forEach(function (c) { c.addEventListener("click", function () { cycleStatus(this.dataset.tid); renderTracker(); }); });
  }
  function paintTrackBlocks() {
    var host = document.getElementById("trackblocks");
    host.innerHTML = DATA.syllabus.map(function (blk) {
      var secs = SECTIONS.filter(function (s) { return s.paper === blk.paper; });
      var tp = []; secs.forEach(function (s) { tp = tp.concat(s.topics); });
      var r = readiness(tp);
      var body = secs.map(function (s) {
        var chips = s.topics.map(function (t) {
          var st = statusOf(t.id);
          return "<button class='tchip st" + st + "' data-tid='" + t.id + "' title='" + esc(STATUS_LABEL[st]) + "'>" + esc(t.name) + "</button>";
        }).join("");
        return "<div class='tsec'><div class='tsec-h'>" + esc(s.name) + " " + apTag(s.ap) + "<span class='tsec-r'>" + pct(readiness(s.topics)) + "%</span></div><div class='tchips'>" + chips + "</div></div>";
      }).join("");
      return "<details class='trackblk' open><summary><span class='tb-code'>" + esc(blk.code) + "</span> " + esc(blk.paper) + " " + stageTag(blk.stage) +
        "<span class='tb-bar'><span style='width:" + pct(r) + "%'></span></span><span class='tb-pct'>" + pct(r) + "%</span></summary>" + body + "</details>";
    }).join("");
    host.querySelectorAll(".tchip").forEach(function (c) { c.addEventListener("click", function () { cycleStatus(this.dataset.tid); renderTracker(); }); });
  }

  /* ---------- View: Blueprint ---------- */
  function renderBlueprint() {
    var p = DATA.pattern;
    function card(obj) {
      var merit = obj.meritCounts;
      var papers = (obj.papers || []).map(function (pp) { return "<div class='bp-paper'><span class='pl'>" + esc(pp.label) + "</span><span class='pm'>" + (pp.questions ? pp.questions + " Q · " : "") + pp.marks + " mk" + (pp.minutes ? " · " + pp.minutes + "m" : "") + "</span></div>"; }).join("");
      return "<div class='bp-card'><h3>" + esc(obj.name) + " <span class='merit " + (merit ? "yes" : "no") + "'>" + (merit ? "merit" : "qualifying") + "</span></h3><div class='pnote'>" + esc(obj.note) + "</div>" + papers +
        (obj.negative ? "<div class='bp-neg'>Negative marking: " + esc(obj.negative) + "</div>" : "") + (obj.marks && !obj.papers ? "<div class='bp-neg'>Max marks: " + obj.marks + "</div>" : "") + "</div>";
    }
    var tl = DATA.notifications.slice().reverse().map(function (n) {
      var cls = n.upcoming ? "upcoming" : (n.verified ? "" : "unverified");
      var flag = n.upcoming ? "<span class='tl-flag up'>upcoming</span>" : (n.verified ? "" : "<span class='tl-flag unv'>unverified</span>");
      return "<div class='tl-item " + cls + "'><div class='tl-yr'>" + esc(n.year) + " " + flag + (n.posts ? "<span class='tl-posts'>" + n.posts + " posts</span>" : "") + "</div>" +
        "<div class='tl-meta'>" + esc(n.no) + (n.screening ? " · screening " + esc(n.screening) : "") + (n.mains ? " · mains " + esc(n.mains) : "") + "<br>" + esc(n.note) + "</div></div>";
    }).join("");
    main.innerHTML = "<div class='view-head'><h1>Exam Blueprint</h1><p>How APPSC Group 2 is actually run — the stages, the marks, and how often the notification has come. Mains marks decide the merit list; Prelims only shortlists.</p></div>" +
      "<div class='bp-grid'>" + card(p.prelims) + card(p.mains) + card(p.cpt) + "</div>" +
      "<div class='caveat'><b>Pattern note.</b> " + esc(DATA.blueprintNote) + "</div>" +
      "<div class='view-head' style='margin-top:26px'><h1 style='font-size:22px'>Notification history</h1><p>APPSC Group 2 runs in bursts — roughly every few years, not annually. The recent 2023→2026 back-to-back is why the current pattern matters most.</p></div>" +
      "<div class='timeline'>" + tl + "</div>" +
      "<div class='caveat'><b>Frequency read.</b> Four cycles are firmly dated (2016, 2018-19, 2023-24, 2026); older ones are reported but unverified. Plan to the <b>current objective pattern</b>, with 2024 screening + 2025 mains as the freshest PYQ signal for the Practice phase.</div>";
  }

  /* ---------- View: Practice (Coverage / Heatmap / Quiz) — needs PYQ data ---------- */
  var practiceTab = "coverage";
  function renderPractice() {
    if (!HAS_PYQ) {
      main.innerHTML = "<div class='view-head'><h1>Practice</h1></div><div class='locked'><div class='lk-ic'>🔒</div><h2>Unlocks with previous-year questions</h2>" +
        "<p>Coverage &amp; gap analysis, exam×topic heatmaps and a real PYQ quiz turn on automatically the moment PYQ papers are parsed into <code>data/syllabus.js</code>. Drop the APPSC Group 2 paper PDFs (25 Feb 2024 screening + Feb 2025 Mains are the freshest) and run <code>tools/parse_appsc.py</code>.</p></div>";
      return;
    }
    main.innerHTML = "<div class='view-head'><h1>Practice</h1><p>Where the questions actually come from. Coverage flags high-weight areas starved of PYQs; the heatmap shows the exam×topic pattern; the quiz drills real questions.</p></div>" +
      "<div class='controls'><div class='seg' id='pracseg'><button data-p='coverage' class='on'>Coverage</button><button data-p='heatmap'>Heatmap</button><button data-p='quiz'>Quiz</button></div></div><div id='pracbody'></div>";
    document.getElementById("pracseg").addEventListener("click", function (e) { var b = e.target.closest("button[data-p]"); if (!b) return; practiceTab = b.dataset.p; [].forEach.call(this.children, function (c) { c.classList.toggle("on", c === b); }); paintPractice(); });
    paintPractice();
  }
  function paintPractice() {
    var b = document.getElementById("pracbody");
    if (practiceTab === "coverage") b.innerHTML = buildCoverage();
    else if (practiceTab === "heatmap") b.innerHTML = "<div class='map-wrap' style='padding:18px'>" + buildHeat() + "</div>";
    else { b.innerHTML = buildQuizStart(); wireQuiz(); }
  }
  function buildCoverage() {
    var maxPyq = Math.max.apply(null, SECTIONS.map(function (s) { return s.pyq; })) || 1;
    var list = SECTIONS.slice().sort(function (a, b) { return (b.marks || 0) - (a.marks || 0); });
    return "<p class='hint' style='margin-bottom:10px'>Bars: <b>mark weight</b> (blue) vs <b>PYQs seen</b> (cyan). A wide blue bar with a short cyan one = high-value area you can't yet drill — a gap to watch.</p>" +
      "<div class='board'>" + list.map(function (s) {
        var wm = Math.max(6, Math.round((s.marks || 0) / maxMarks * 100)), wp = Math.round(s.pyq / maxPyq * 100);
        return "<div class='row' data-key='" + s.id + "'><div class='rank'>" + (s.marks != null ? s.marks : "—") + "</div>" +
          "<div><div class='title'>" + esc(s.name) + " " + stageTag(s.stage) + apTag(s.ap) + "</div>" +
          "<div class='cov2'><div class='covbar w'><span style='width:" + wm + "%'></span></div><div class='covbar p'><span style='width:" + wp + "%'></span></div></div></div>" +
          "<div class='metric'><div class='big'>" + s.pyq + "</div><div class='lbl'>PYQs</div></div></div>";
      }).join("") + "</div>";
  }
  var hmMode = "section";
  function buildHeat() {
    var rowLabels, colLabels, getRC;
    var secAgg = {}; // for exam×section we need per-question; approximate via topic pyq items
    // Build a flat list of pyq items with {sec, ex, y}
    var items = [];
    TOPICS.forEach(function (t) { if (t.pyq && t.pyq.items) t.pyq.items.forEach(function (q) { items.push({ sec: t.sec, ex: q.ex, y: q.y }); }); });
    if (!items.length) return "<p class='empty'>No question-level data yet.</p>";
    if (hmMode === "section") { rowLabels = ALL_EXAMS; colLabels = SECTIONS.map(function (s) { return s.name; }); getRC = function (q) { return [q.ex, q.sec]; }; }
    else { rowLabels = ALL_EXAMS; colLabels = ALL_YEARS; getRC = function (q) { return [q.ex, q.y]; }; }
    var grid = {}, max = 0, colTot = {}, rowTot = {};
    items.forEach(function (q) { var rc = getRC(q); if (rc[0] == null || rc[1] == null) return; var k = rc[0] + "|" + rc[1]; grid[k] = (grid[k] || 0) + 1; if (grid[k] > max) max = grid[k]; colTot[rc[1]] = (colTot[rc[1]] || 0) + 1; rowTot[rc[0]] = (rowTot[rc[0]] || 0) + 1; });
    var h = "<div class='controls'><div class='seg' id='hmseg'><button data-m='section'" + (hmMode === "section" ? " class='on'" : "") + ">Exam × Section</button><button data-m='year'" + (hmMode === "year" ? " class='on'" : "") + ">Exam × Year</button></div></div>";
    h += "<table class='hm'><thead><tr><th></th>";
    colLabels.forEach(function (c) { h += "<th>" + esc(clip(String(c), 12)) + "</th>"; });
    h += "<th class='tot'>Σ</th></tr></thead><tbody>";
    rowLabels.forEach(function (r) { h += "<tr><td class='rowlab'>" + esc(r) + "</td>"; colLabels.forEach(function (c) { var v = grid[r + "|" + c] || 0; h += "<td class='cell' style='" + heatColor(v, max) + "'>" + (v || "") + "</td>"; }); h += "<td class='cell tot' style='background:var(--bg-3)'>" + (rowTot[r] || 0) + "</td></tr>"; });
    h += "</tbody></table>";
    return h;
  }

  var quiz = null;
  function buildQuizStart() {
    var secOpts = "<option value=all>All sections</option>" + SECTIONS.filter(function (s) { return s.pyq; }).map(function (s) { return "<option value='" + s.id + "'>" + esc(s.name) + "</option>"; }).join("");
    return "<div class='controls'><select id='qsec'>" + secOpts + "</select><select id='qn'><option>10</option><option>20</option><option>30</option></select>" +
      "<select id='qorder'><option value='recent'>Most recent first</option><option value='random'>Random</option></select><button class='btn primary' id='qstart'>Start</button></div><div id='quizarea'></div>";
  }
  function poolQuestions(secId) {
    var out = [];
    TOPICS.forEach(function (t) { if ((secId === "all" || t.secId === secId) && t.pyq && t.pyq.items) t.pyq.items.forEach(function (q) { if (q.o && q.a) out.push(q); }); });
    return out;
  }
  function wireQuiz() {
    var sb = document.getElementById("qstart"); if (!sb) return;
    sb.addEventListener("click", function () {
      var sec = document.getElementById("qsec").value, n = +document.getElementById("qn").value, order = document.getElementById("qorder").value;
      var pool = poolQuestions(sec);
      if (order === "random") pool.sort(function () { return Math.random() - 0.5; });
      else pool.sort(function (a, b) { return (b.y || 0) - (a.y || 0); });
      quiz = { list: pool.slice(0, n), i: 0, correct: 0 }; paintQuiz();
    });
  }
  function paintQuiz() {
    var area = document.getElementById("quizarea");
    if (!quiz.list.length) { area.innerHTML = "<p class='empty'>No questions in this selection yet.</p>"; return; }
    if (quiz.i >= quiz.list.length) { area.innerHTML = "<div class='quiz-card' style='text-align:center'><h2>Done!</h2><p style='font-size:34px;font-weight:800;margin:14px 0'>" + quiz.correct + " / " + quiz.list.length + "</p></div>"; return; }
    var q = quiz.list[quiz.i];
    var opts = ["a", "b", "c", "d"].filter(function (l) { return q.o[l]; }).map(function (l) { return "<button class='opt' data-l='" + l + "'><span class='lt'>" + l.toUpperCase() + "</span>" + esc(q.o[l]) + "</button>"; }).join("");
    area.innerHTML = "<div class='quiz-card'><div class='quiz-meta'><span>Q " + (quiz.i + 1) + " / " + quiz.list.length + "</span><span>Score " + quiz.correct + "</span></div>" +
      "<div class='quiz-q'>" + esc(q.q) + "</div><div id='opts'>" + opts + "</div>" +
      "<div class='quiz-sol' id='sol'><b>Answer: " + (q.a ? q.a.toUpperCase() : "?") + "</b> — " + esc(q.o[q.a] || "") + (q.s ? "<div style='margin-top:8px'>" + esc(q.s) + "</div>" : "") + "<div class='src' style='font-size:11.5px;color:var(--muted-2);margin-top:8px'>" + esc(q.ex || "") + (q.y ? " · " + q.y : "") + "</div></div>" +
      "<div class='btnrow'><button class='btn primary' id='qnext' disabled>Next →</button></div></div>";
    var answered = false;
    document.getElementById("opts").addEventListener("click", function (e) {
      var b = e.target.closest(".opt"); if (!b || answered) return; answered = true; var chosen = b.dataset.l;
      [].forEach.call(this.children, function (c) { if (c.dataset.l === q.a) c.classList.add("correct"); else if (c.dataset.l === chosen) c.classList.add("wrong"); });
      if (chosen === q.a) quiz.correct++;
      document.getElementById("sol").classList.add("show"); document.getElementById("qnext").disabled = false;
    });
    document.getElementById("qnext").addEventListener("click", function () { quiz.i++; paintQuiz(); });
  }

  /* ---------- View: PYQ Analysis (window.APPSC_PYQ) ---------- */
  var PYQ = window.APPSC_PYQ || null;
  function hbar(label, count, max, cls, note) {
    var w = Math.max(3, Math.round(count / (max || 1) * 100));
    return "<div class='pq-row'><div class='pq-lab'>" + esc(label) + (note ? " <span class='pq-note'>" + esc(note) + "</span>" : "") + "</div>" +
      "<div class='pq-bar " + (cls || "") + "'><span style='width:" + w + "%'></span></div><div class='pq-n'>" + count + "</div></div>";
  }
  function paperPanel(p) {
    var cap = p.captured, rate = Math.round((p.captureRate || cap / p.total) * 100);
    var head = "<div class='pq-phead'><div><span class='tb-code'>" + esc(p.stage) + "</span> <b>" + esc(p.label) + "</b> " +
      "<span class='pq-date'>" + esc(p.date) + "</span></div><div class='pq-cap'>" + cap + " of " + p.total + " Qs read <span>(" + rate + "%)</span></div></div>";
    var body;
    if (p.halves) {
      body = p.halves.map(function (h) {
        var max = Math.max.apply(null, h.subthemes.map(function (s) { return s.captured; })) || 1;
        var top = h.subthemes[0];
        var bars = h.subthemes.map(function (s, i) { return hbar(s.name, s.captured, max, i === 0 ? "hot" : ""); }).join("");
        return "<div class='pq-half'><div class='pq-halfh'>" + esc(h.half) + " <span class='pq-decl'>declared " + h.declared + " Qs</span>" +
          (top ? "<span class='pq-lead'>top: " + esc(top.name) + " · " + Math.round(top.captured / h.captured * 100) + "% of this half</span>" : "") +
          "</div>" + bars + "</div>";
      }).join("");
    } else {
      var max = Math.max.apply(null, p.sections.map(function (s) { return s.captured; })) || 1;
      var decl = {}; (p.declaredGroups || []).forEach(function (g) { });
      body = "<div class='pq-half'>" + p.sections.map(function (s, i) {
        return hbar(s.name, s.captured, max, i === 0 ? "hot" : "");
      }).join("") + (p.declaredGroups ? "<div class='pq-decl2'>Official sections: " + p.declaredGroups.map(function (g) { return esc(g.name) + " (" + g.declared + ")"; }).join(" · ") + "</div>" : "<div class='pq-decl2'>Official: 5 sections × 30 Qs each</div>") + "</div>";
    }
    return "<div class='pq-panel'>" + head + body + "</div>";
  }
  function keyFindings() {
    // compute the single most-asked sub-area per paper and its share
    var out = [];
    PYQ.papers.forEach(function (p) {
      var best = null, half = null;
      if (p.halves) {
        p.halves.forEach(function (h) { h.subthemes.forEach(function (s) { if (!best || s.captured > best.captured) { best = s; half = h; } }); });
        if (best) out.push({ paper: p.label, area: best.name, share: Math.round(best.captured / half.captured * 100), scope: half.half });
      } else {
        p.sections.forEach(function (s) { if (!best || s.captured > best.captured) best = s; });
        if (best) out.push({ paper: p.label, area: best.name, share: Math.round(best.captured / p.captured * 100), scope: "paper" });
      }
    });
    return out;
  }
  function renderPyq() {
    if (!PYQ) { main.innerHTML = "<div class='view-head'><h1>PYQ Analysis</h1></div><p class='empty'>PYQ data not loaded.</p>"; return; }
    var totalCap = PYQ.papers.reduce(function (a, p) { return a + p.captured; }, 0);
    var kf = keyFindings();
    var cards = kf.map(function (k) {
      return "<div class='kf-card'><div class='kf-share'>" + k.share + "%</div><div class='kf-body'><b>" + esc(k.area) + "</b>" +
        "<div class='kf-sub'>" + esc(k.paper) + (k.scope !== "paper" ? " · " + esc(k.scope) + " half" : "") + "</div></div></div>";
    }).join("");
    main.innerHTML =
      "<div class='view-head'><h1>PYQ Analysis <span class='pq-badge'>live</span></h1><p>Where the questions <b>actually</b> come from — built by OCR-reading <b>4 official papers</b> (2019 &amp; 2024 Prelims, 2025 Mains Paper-I &amp; II) and mapping every recovered question to the syllabus. <b>" + totalCap + " questions</b> classified. This is the gap between the syllabus on paper and the exam in practice.</p></div>" +
      "<div class='stats'>" + stat("Papers read", PYQ.papers.length) + stat("Questions mapped", totalCap) + stat("Prelims papers", 2) + stat("Mains papers", 2) + "</div>" +
      "<div class='subhead'>Biggest concentrations — one per paper-half</div>" +
      "<div class='kf-grid'>" + cards + "</div>" +
      "<div class='subhead' style='margin-top:20px'>Full breakdown — bars are questions recovered per area</div>" +
      PYQ.papers.map(paperPanel).join("") +
      "<div class='caveat'><b>How to read this honestly.</b> <b>Declared</b> section counts are exact — printed on each paper's own header. The <b>bars</b> show questions our OCR recovered (" + Math.round(totalCap / (150 * PYQ.papers.length) * 100) + "% of all questions across the 4 papers); a few per paper are lost to scan noise, roughly evenly, so the <b>proportions</b> are reliable but a bar is a floor, not an exact tally. Sub-theme splits are observed from the recovered sample, not official quotas. " + esc(PYQ.note) + "</div>";
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
      var st = statusOf(t.id);
      return "<li>" + esc(t.name) + " " + apTag(t.ap && !s.ap) + " " + (t.pyq ? "<span class='pyq-chip live'>" + t.pyq.count + " PYQs</span>" : "<span class='pyq-chip'>Phase: PYQ</span>") +
        (st ? " <span class='tag-stage " + (st === 2 ? "mains" : "prelims") + "'>" + STATUS_LABEL[st] + "</span>" : "") + "</li>";
    }).join("");
    openDrawer("<div class='crumb'>" + esc(s.stage) + " ▸ " + esc(s.paper) + "</div><h2>" + esc(s.name) + " " + stageTag(s.stage) + apTag(s.ap) + "</h2>" +
      "<div class='mini-stats'><div class='mini-stat'><div class='k'>Weight</div><div class='v'>" + (s.marks != null ? s.marks : "—") + "<span style='font-size:12px;color:var(--muted)'> " + (s.indicative ? "indic." : "marks") + "</span></div></div>" +
      "<div class='mini-stat'><div class='k'>Parts</div><div class='v'>" + s.topics.length + "</div></div>" +
      "<div class='mini-stat'><div class='k'>Readiness</div><div class='v'>" + pct(readiness(s.topics)) + "%</div></div></div>" +
      (s.intro ? "<p class='hint' style='margin:4px 0 10px'>" + esc(s.intro) + "</p>" : "") +
      "<div class='subhead'>Which parts this section covers</div><ul class='points'>" + pts + "</ul>" +
      "<div class='caveat'>" + (HAS_PYQ ? "PYQs attached — open <b>Practice</b> for coverage, heatmap and quiz." : "Previous-year questions land in the <b>Practice</b> phase. Each part will then show how often it's actually asked, with real questions and solutions. Track your study on each part from <b>Prep Tracker</b>.") + "</div>");
  }
  main.addEventListener("click", function (e) { var row = e.target.closest(".row[data-key]"); if (row) openSection(row.dataset.key); });

  /* ---------- Routing / nav ---------- */
  var VIEWS = { board: renderBoard, map: renderMap, tracker: renderTracker, pyq: renderPyq, blueprint: renderBlueprint, practice: renderPractice };
  var nav = document.querySelector(".nav");
  // reveal the Practice tab only once PYQ data exists
  var practicePill = nav.querySelector("[data-view='practice']");
  if (practicePill && HAS_PYQ) practicePill.hidden = false;
  function go(view) {
    if (!VIEWS[view] || (view === "practice" && !HAS_PYQ && practicePill && practicePill.hidden)) view = "board";
    [].forEach.call(nav.children, function (c) { c.classList.toggle("active", c.dataset.view === view); });
    VIEWS[view](); window.scrollTo(0, 0);
  }
  nav.addEventListener("click", function (e) { var b = e.target.closest(".nav-pill"); if (!b) return; if (location.hash.slice(1) !== b.dataset.view) location.hash = b.dataset.view; else go(b.dataset.view); });
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
