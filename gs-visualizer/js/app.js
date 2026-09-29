/* GS Airflow — SSC General Studies PYQ frequency map. Pure vanilla JS, no deps. */
(function () {
  "use strict";
  var DATA = window.GS_HISTORY;
  if (!DATA) { document.getElementById("main").innerHTML = "<p class='empty'>Data failed to load.</p>"; return; }

  var Q = DATA.questions;
  var YEAR_W = { 2024: 1.0, 2023: 0.92, 2022: 0.72, 2021: 0.5, 2020: 0.34, 2019: 0.2 };
  var esc = function (s) { return (s == null ? "" : String(s)).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); };

  /* ---------- Aggregation ---------- */
  function recencyOf(years) { // years: {y:count}; returns 0..1 weighted freshness
    var tot = 0, w = 0;
    for (var y in years) { var c = years[y]; tot += c; w += c * (YEAR_W[y] || 0.15); }
    return tot ? w / tot : 0;
  }
  var subtopics = {}, sectionAgg = {};
  Q.forEach(function (q) {
    var key = q.sec + " ▸ " + q.st;
    var s = subtopics[key] || (subtopics[key] = { key: key, sec: q.sec, name: q.st, count: 0, years: {}, exams: {}, ids: [] });
    s.count++; s.ids.push(q.id);
    if (q.y) s.years[q.y] = (s.years[q.y] || 0) + 1;
    if (q.ex) s.exams[q.ex] = (s.exams[q.ex] || 0) + 1;
    var sa = sectionAgg[q.sec] || (sectionAgg[q.sec] = { name: q.sec, count: 0, years: {}, subs: {} });
    sa.count++; sa.subs[q.st] = (sa.subs[q.st] || 0) + 1;
    if (q.y) sa.years[q.y] = (sa.years[q.y] || 0) + 1;
  });
  var STOPS = Object.keys(subtopics).map(function (k) {
    var s = subtopics[k]; s.recency = recencyOf(s.years);
    s.priority = s.count * (0.55 + 0.45 * s.recency);
    return s;
  });
  // assign tiers by priority rank
  var byPri = STOPS.slice().sort(function (a, b) { return b.priority - a.priority; });
  byPri.forEach(function (s, i) { var f = i / byPri.length; s.tier = f < 0.2 ? 1 : f < 0.55 ? 2 : 3; });
  var maxCount = Math.max.apply(null, STOPS.map(function (s) { return s.count; }));
  Object.keys(sectionAgg).forEach(function (k) { var sa = sectionAgg[k]; sa.recency = recencyOf(sa.years); });

  var ALL_YEARS = [];
  Q.forEach(function (q) { if (q.y && ALL_YEARS.indexOf(q.y) < 0) ALL_YEARS.push(q.y); });
  ALL_YEARS.sort();
  var ALL_EXAMS = [];
  Q.forEach(function (q) { if (q.ex && ALL_EXAMS.indexOf(q.ex) < 0) ALL_EXAMS.push(q.ex); });
  ALL_EXAMS.sort(function (a, b) {
    var ca = 0, cb = 0; Q.forEach(function (q) { if (q.ex === a) ca++; if (q.ex === b) cb++; }); return cb - ca;
  });

  /* ---------- Shared UI helpers ---------- */
  var main = document.getElementById("main");
  function tierPill(t) { return "<span class='pill p" + t + "'>P" + t + "</span>"; }
  function statStrip() {
    var withYr = Q.filter(function (q) { return q.y; }).length;
    return "<div class='stats'>" +
      stat("Questions", Q.length) +
      stat("Sections", DATA.sections.length) +
      stat("Topics", STOPS.length) +
      stat("Exam years", ALL_YEARS[0] + "<small>–" + ALL_YEARS[ALL_YEARS.length - 1] + "</small>") +
      stat("P1 hot topics", byPri.filter(function (s) { return s.tier === 1; }).length) +
      "</div>";
  }
  function stat(k, v) { return "<div class='stat'><div class='k'>" + k + "</div><div class='v'>" + v + "</div></div>"; }
  function heatColor(v, max) {
    if (!v) return "background:var(--bg-3);color:var(--muted-2)";
    var t = Math.pow(v / max, 0.6);
    // blue -> cyan ramp
    var r = Math.round(1 + t * 20), g = Math.round(90 + t * 120), b = Math.round(180 + t * 40);
    return "background:rgb(" + r + "," + g + "," + b + ")";
  }

  /* ---------- View: Priority Board ---------- */
  var boardSort = "priority", boardSec = "all", boardExam = "all";
  function renderDashboard() {
    var secOpts = "<option value=all>All sections</option>" + DATA.sections.map(function (s) { return "<option value='" + esc(s.name) + "'>" + esc(s.name) + "</option>"; }).join("");
    var exOpts = "<option value=all>All exams</option>" + ALL_EXAMS.map(function (e) { return "<option value='" + esc(e) + "'>" + esc(e) + "</option>"; }).join("");
    main.innerHTML =
      "<div class='view-head'><h1>Priority Board</h1><p>Every History topic ranked by <b>how often it is asked</b> and <b>how recently</b>. Study P1 first — they are the highest-yield, most-recent topics. Click any topic to see exactly which parts the questions come from.</p></div>" +
      statStrip() +
      "<div class='controls'>" +
      "<div class='seg' id='sortseg'>" +
      "<button data-s='priority' class='on'>Priority</button><button data-s='count'>Most asked</button><button data-s='recency'>Most recent</button></div>" +
      "<select id='secsel'>" + secOpts + "</select>" +
      "<select id='exsel'>" + exOpts + "</select>" +
      "<span class='hint'>Tip: click a row to drill in</span>" +
      "</div><div class='board' id='board'></div>";
    document.getElementById("sortseg").addEventListener("click", function (e) {
      var b = e.target.closest("button[data-s]"); if (!b) return;
      boardSort = b.dataset.s;[].forEach.call(this.children, function (c) { c.classList.toggle("on", c === b); }); paintBoard();
    });
    document.getElementById("secsel").addEventListener("change", function () { boardSec = this.value; paintBoard(); });
    document.getElementById("exsel").addEventListener("change", function () { boardExam = this.value; paintBoard(); });
    paintBoard();
  }
  function paintBoard() {
    var list = STOPS.slice();
    if (boardSec !== "all") list = list.filter(function (s) { return s.sec === boardSec; });
    if (boardExam !== "all") list = list.filter(function (s) { return s.exams[boardExam]; });
    list.sort(function (a, b) {
      if (boardSort === "count") return b.count - a.count;
      if (boardSort === "recency") return b.recency - a.recency || b.count - a.count;
      return b.priority - a.priority;
    });
    var el = document.getElementById("board");
    if (!list.length) { el.innerHTML = "<p class='empty'>No topics match.</p>"; return; }
    el.innerHTML = list.map(function (s, i) {
      var topExam = Object.keys(s.exams).sort(function (a, b) { return s.exams[b] - s.exams[a]; })[0] || "—";
      var yrs = Object.keys(s.years).sort();
      var span = yrs.length ? yrs[0] + "–" + yrs[yrs.length - 1] : "—";
      return "<div class='row' data-key='" + esc(s.key) + "'>" +
        "<div class='rank'>" + (i + 1) + "</div>" +
        "<div><div class='title'>" + esc(s.name) + " " + tierPill(s.tier) +
        "<span class='tag-mini'>" + esc(s.sec) + "</span></div>" +
        "<div class='sub'>Top exam: <b>" + esc(topExam) + "</b> · years " + span + " · recency " + Math.round(s.recency * 100) + "%</div></div>" +
        "<div class='metric'><div class='big'>" + s.count + "</div><div class='lbl'>questions</div>" +
        "<div class='bar'><span style='width:" + Math.max(6, Math.round(s.count / maxCount * 100)) + "%'></span></div></div>" +
        "</div>";
    }).join("");
  }

  /* ---------- View: Topic Map (flow graph) ---------- */
  function renderMap() {
    main.innerHTML = "<div class='view-head'><h1>Topic Map</h1><p>The syllabus as a flow — <b>Subject → Section → Topic</b>. Bubble size = number of questions. Brighter = asked more recently. Click any node to drill in.</p></div>" +
      "<div class='map-legend'><span>Bubble size = <b>frequency</b></span><span>Glow = <b>recency</b></span><span>Colour ring = <b>P1</b> <span style='color:var(--p1)'>●</span> <b>P2</b> <span style='color:var(--p2)'>●</span> <b>P3</b> <span style='color:var(--p3)'>●</span></span></div>" +
      "<div class='map-wrap'>" + buildSVG() + "</div>";
    main.querySelectorAll(".node").forEach(function (n) {
      n.addEventListener("click", function () {
        var t = this.dataset.type, k = this.dataset.key;
        if (t === "sec") openSection(k); else if (t === "st") openSubtopic(k); else openSubject();
      });
    });
  }
  function buildSVG() {
    var padY = 30, rowH = 26, colX = [70, 340, 720];
    var order = DATA.sections;
    // compute subtopic rows grouped by section
    var rows = [], secY = {};
    var y = padY;
    order.forEach(function (sec) {
      var subs = STOPS.filter(function (s) { return s.sec === sec.name; }).sort(function (a, b) { return b.count - a.count; });
      var start = y;
      subs.forEach(function (s) { rows.push({ s: s, y: y }); y += rowH; });
      secY[sec.name] = (start + y - rowH) / 2; y += 14;
    });
    var H = y + padY, W = 940;
    var subjY = H / 2;
    var tierColor = { 1: "var(--p1)", 2: "var(--p2)", 3: "var(--p3)" };
    var svg = "<svg viewBox='0 0 " + W + " " + H + "' width='" + W + "' height='" + H + "' xmlns='http://www.w3.org/2000/svg'>";
    // edges subject->section
    order.forEach(function (sec) {
      svg += edge(colX[0] + 30, subjY, colX[1] - 46, secY[sec.name]);
    });
    // edges section->subtopic
    rows.forEach(function (r) { svg += edge(colX[1] + 46, secY[r.s.sec], colX[2] - rad(r.s.count) - 4, r.y); });
    // subject node
    svg += "<g class='node' data-type='subject' data-key='History'><circle cx='" + colX[0] + "' cy='" + subjY + "' r='30' fill='var(--accent-soft)' stroke='var(--accent)' stroke-width='2'/><text x='" + colX[0] + "' y='" + (subjY + 4) + "' text-anchor='middle' fill='var(--text)' font-size='13' font-weight='800'>History</text></g>";
    // section nodes
    order.forEach(function (sec) {
      var cy = secY[sec.name], sa = sectionAgg[sec.name];
      var glow = 0.25 + 0.75 * sa.recency;
      svg += "<g class='node' data-type='sec' data-key='" + esc(sec.name) + "'>" +
        "<rect x='" + (colX[1] - 46) + "' y='" + (cy - 16) + "' rx='9' width='92' height='32' fill='var(--bg-3)' stroke='var(--accent2)' stroke-width='1.5' opacity='" + glow.toFixed(2) + "'/>" +
        "<text x='" + colX[1] + "' y='" + (cy - 1) + "' text-anchor='middle' fill='var(--text)' font-size='11' font-weight='800'>" + esc(shortSec(sec.name)) + "</text>" +
        "<text x='" + colX[1] + "' y='" + (cy + 11) + "' text-anchor='middle' fill='var(--muted)' font-size='9.5'>" + sa.count + " Q</text></g>";
    });
    // subtopic nodes
    rows.forEach(function (r) {
      var s = r.s, cx = colX[2], cy = r.y, R = rad(s.count);
      var glow = 0.3 + 0.7 * s.recency;
      svg += "<g class='node' data-type='st' data-key='" + esc(s.key) + "'>" +
        "<circle cx='" + cx + "' cy='" + cy + "' r='" + R + "' fill='var(--accent)' opacity='" + glow.toFixed(2) + "' stroke='" + tierColor[s.tier] + "' stroke-width='2'/>" +
        "<text x='" + (cx + R + 8) + "' y='" + (cy + 4) + "' fill='var(--text)' font-size='11.5'>" + esc(s.name) + " <tspan fill='var(--muted)'>(" + s.count + ")</tspan></text></g>";
    });
    return svg + "</svg>";
  }
  function rad(c) { return 6 + Math.sqrt(c) * 2.4; }
  function edge(x1, y1, x2, y2) { var mx = (x1 + x2) / 2; return "<path class='edge' d='M" + x1 + " " + y1 + " C" + mx + " " + y1 + " " + mx + " " + y2 + " " + x2 + " " + y2 + "'/>"; }
  function shortSec(n) { return n.replace(" History", ""); }

  /* ---------- View: Heatmap ---------- */
  var hmMode = "section";
  function renderHeatmap() {
    main.innerHTML = "<div class='view-head'><h1>Frequency Heatmap</h1><p>Where the questions actually come from, by <b>exam</b> and <b>year</b>. Darker = more questions. Spot which exam hammered which area, and how the pattern shifts year to year.</p></div>" +
      "<div class='controls'><div class='seg' id='hmseg'><button data-m='section' class='on'>Exam × Section</button><button data-m='year'>Exam × Year</button><button data-m='secyear'>Section × Year</button></div></div>" +
      "<div class='map-wrap' style='padding:18px'>" + buildHeat() + "</div>";
    document.getElementById("hmseg").addEventListener("click", function (e) {
      var b = e.target.closest("button[data-m]"); if (!b) return; hmMode = b.dataset.m;
      [].forEach.call(this.children, function (c) { c.classList.toggle("on", c === b); });
      main.querySelector(".map-wrap").innerHTML = buildHeat();
    });
  }
  function buildHeat() {
    var rowsKey, colsKey, rowLabels, colLabels, getRow, getCol;
    if (hmMode === "section") { rowLabels = ALL_EXAMS; colLabels = DATA.sections.map(function (s) { return s.name; }); getRow = function (q) { return q.ex; }; getCol = function (q) { return q.sec; }; }
    else if (hmMode === "year") { rowLabels = ALL_EXAMS; colLabels = ALL_YEARS; getRow = function (q) { return q.ex; }; getCol = function (q) { return q.y; }; }
    else { rowLabels = DATA.sections.map(function (s) { return s.name; }); colLabels = ALL_YEARS; getRow = function (q) { return q.sec; }; getCol = function (q) { return q.y; }; }
    var grid = {}, max = 0, colTot = {}, rowTot = {};
    Q.forEach(function (q) {
      var r = getRow(q), c = getCol(q); if (r == null || c == null) return;
      var k = r + "|" + c; grid[k] = (grid[k] || 0) + 1; if (grid[k] > max) max = grid[k];
      colTot[c] = (colTot[c] || 0) + 1; rowTot[r] = (rowTot[r] || 0) + 1;
    });
    var h = "<table class='hm'><thead><tr><th></th>";
    colLabels.forEach(function (c) { h += "<th>" + esc(hmMode !== "section" && String(c).length > 4 ? c : shortSec(String(c))) + "</th>"; });
    h += "<th class='tot'>Σ</th></tr></thead><tbody>";
    rowLabels.forEach(function (r) {
      h += "<tr><td class='rowlab'>" + esc(r) + "</td>";
      colLabels.forEach(function (c) { var v = grid[r + "|" + c] || 0; h += "<td class='cell' style='" + heatColor(v, max) + "'>" + (v || "") + "</td>"; });
      h += "<td class='cell tot' style='background:var(--bg-3)'>" + (rowTot[r] || 0) + "</td></tr>";
    });
    h += "<tr><td class='rowlab tot'>Σ</td>";
    colLabels.forEach(function (c) { h += "<td class='cell tot' style='background:var(--bg-3)'>" + (colTot[c] || 0) + "</td>"; });
    h += "<td class='cell tot' style='background:var(--bg-3)'>" + Q.length + "</td></tr></tbody></table>";
    return h;
  }

  /* ---------- View: Quiz ---------- */
  var quiz = null;
  function renderQuiz() {
    var secOpts = "<option value=all>All sections</option>" + DATA.sections.map(function (s) { return "<option value='" + esc(s.name) + "'>" + esc(s.name) + "</option>"; }).join("");
    main.innerHTML = "<div class='view-head'><h1>Quiz</h1><p>Drill real previous-year questions with full solutions. Focus a section or blast the whole subject.</p></div>" +
      "<div class='controls'><select id='qsec'>" + secOpts + "</select>" +
      "<select id='qn'><option>10</option><option>20</option><option>30</option><option>50</option></select>" +
      "<select id='qorder'><option value='priority'>High-frequency first</option><option value='random'>Random</option><option value='recent'>Most recent first</option></select>" +
      "<button class='btn primary' id='qstart'>Start</button></div><div id='quizarea'></div>";
    document.getElementById("qstart").addEventListener("click", startQuiz);
  }
  function startQuiz() {
    var sec = document.getElementById("qsec").value, n = +document.getElementById("qn").value, order = document.getElementById("qorder").value;
    var pool = Q.filter(function (q) { return q.o && Object.keys(q.o).length === 4 && q.a && (sec === "all" || q.sec === sec); });
    if (order === "random") pool.sort(function () { return Math.random() - 0.5; });
    else if (order === "recent") pool.sort(function (a, b) { return (b.y || 0) - (a.y || 0); });
    else { // priority: weight by subtopic priority, then shuffle within
      pool.sort(function (a, b) { var pa = (subtopics[a.sec + " ▸ " + a.st] || {}).priority || 0, pb = (subtopics[b.sec + " ▸ " + b.st] || {}).priority || 0; return pb - pa; });
    }
    quiz = { list: pool.slice(0, n), i: 0, correct: 0, answered: false };
    paintQuiz();
  }
  function paintQuiz() {
    var area = document.getElementById("quizarea");
    if (quiz.i >= quiz.list.length) {
      area.innerHTML = "<div class='quiz-card' style='text-align:center'><h2>Done!</h2><p style='font-size:34px;font-weight:800;margin:14px 0'>" + quiz.correct + " / " + quiz.list.length + "</p><p class='hint'>" + Math.round(quiz.correct / quiz.list.length * 100) + "% correct</p><div class='btnrow' style='justify-content:center'><button class='btn primary' id='qagain'>New quiz</button></div></div>";
      document.getElementById("qagain").addEventListener("click", renderQuiz); return;
    }
    var q = quiz.list[quiz.i]; quiz.answered = false;
    var opts = ["a", "b", "c", "d"].filter(function (l) { return q.o[l]; }).map(function (l) {
      return "<button class='opt' data-l='" + l + "'><span class='lt'>" + l.toUpperCase() + "</span>" + esc(q.o[l]) + "</button>";
    }).join("");
    area.innerHTML = "<div class='quiz-card'>" +
      "<div class='quiz-meta'><span>Q " + (quiz.i + 1) + " / " + quiz.list.length + "</span><span>" + esc(q.sec) + " ▸ " + esc(q.st) + "</span><span>Score " + quiz.correct + "</span></div>" +
      "<div class='quiz-q'>" + esc(q.q) + "</div><div id='opts'>" + opts + "</div>" +
      "<div class='quiz-sol' id='sol'><b>Answer: " + (q.a ? q.a.toUpperCase() : "?") + "</b> — " + esc(q.o[q.a] || "") + "<div style='margin-top:8px'>" + esc(q.s) + "</div><div class='src' style='font-size:11.5px;color:var(--muted-2);margin-top:8px'>" + esc(q.ex || "") + (q.y ? " · " + q.y : "") + (q.sh ? " · " + esc(q.sh) : "") + "</div></div>" +
      "<div class='btnrow'><button class='btn primary' id='qnext' disabled>Next →</button></div></div>";
    document.getElementById("opts").addEventListener("click", function (e) {
      var b = e.target.closest(".opt"); if (!b || quiz.answered) return; quiz.answered = true;
      var chosen = b.dataset.l;
      [].forEach.call(this.children, function (c) {
        if (c.dataset.l === q.a) c.classList.add("correct");
        else if (c.dataset.l === chosen) c.classList.add("wrong");
      });
      if (chosen === q.a) quiz.correct++;
      document.getElementById("sol").classList.add("show");
      document.getElementById("qnext").disabled = false;
      area.querySelector(".quiz-meta").children[2].textContent = "Score " + quiz.correct;
    });
    document.getElementById("qnext").addEventListener("click", function () { quiz.i++; paintQuiz(); });
  }

  /* ---------- Drill-down drawer ---------- */
  var drawer = document.getElementById("drawer"), dbody = document.getElementById("drawer-body");
  function openDrawer(html) { dbody.innerHTML = html; drawer.hidden = false; document.body.style.overflow = "hidden"; }
  function closeDrawer() { drawer.hidden = true; document.body.style.overflow = ""; }
  drawer.addEventListener("click", function (e) { if (e.target.hasAttribute("data-close")) closeDrawer(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeDrawer(); });

  function miniHeat(years) {
    var max = Math.max.apply(null, ALL_YEARS.map(function (y) { return years[y] || 0; })) || 1;
    return "<table class='hm' style='border-spacing:3px'><tr>" + ALL_YEARS.map(function (y) { return "<th>" + y + "</th>"; }).join("") + "</tr><tr>" +
      ALL_YEARS.map(function (y) { var v = years[y] || 0; return "<td class='cell' style='width:44px;height:34px;" + heatColor(v, max) + "'>" + (v || "") + "</td>"; }).join("") + "</tr></table>";
  }
  function examBars(exams, total) {
    var keys = Object.keys(exams).sort(function (a, b) { return exams[b] - exams[a]; });
    var mx = exams[keys[0]] || 1;
    return keys.map(function (k) {
      return "<div class='part'><div class='pn'>" + esc(k) + "</div><div class='pc'>" + exams[k] + "</div><div class='pbar'><span style='width:" + Math.round(exams[k] / mx * 100) + "%'></span></div></div>";
    }).join("");
  }

  function openSubject() {
    var subs = STOPS.slice().sort(function (a, b) { return b.count - a.count; });
    var mx = subs[0].count;
    openDrawer("<div class='crumb'>Subject</div><h2>History</h2>" +
      "<div class='mini-stats'><div class='mini-stat'><div class='k'>Questions</div><div class='v'>" + Q.length + "</div></div>" +
      "<div class='mini-stat'><div class='k'>Sections</div><div class='v'>" + DATA.sections.length + "</div></div>" +
      "<div class='mini-stat'><div class='k'>Topics</div><div class='v'>" + STOPS.length + "</div></div></div>" +
      "<div class='subhead'>Questions by year</div>" + miniHeat(sumYears(Q)) +
      "<div class='subhead'>Every topic — where the questions come from</div><div class='parts'>" +
      subs.map(function (s) {
        return "<div class='part' data-key='" + esc(s.key) + "'><div class='pn'>" + esc(s.name) + " " + tierPill(s.tier) + "</div><div class='pc'>" + s.count + "</div><div class='pbar'><span style='width:" + Math.round(s.count / mx * 100) + "%'></span></div></div>";
      }).join("") + "</div>");
    wireParts();
  }
  function openSection(name) {
    var sa = sectionAgg[name]; if (!sa) return;
    var subs = STOPS.filter(function (s) { return s.sec === name; }).sort(function (a, b) { return b.count - a.count; });
    var mx = subs[0] ? subs[0].count : 1;
    openDrawer("<div class='crumb'>History ▸ Section</div><h2>" + esc(name) + "</h2>" +
      "<div class='mini-stats'><div class='mini-stat'><div class='k'>Questions</div><div class='v'>" + sa.count + "</div></div>" +
      "<div class='mini-stat'><div class='k'>Topics</div><div class='v'>" + subs.length + "</div></div>" +
      "<div class='mini-stat'><div class='k'>Recency</div><div class='v'>" + Math.round(sa.recency * 100) + "%</div></div></div>" +
      "<div class='subhead'>By year</div>" + miniHeat(sa.years) +
      "<div class='subhead'>Which parts the questions come from</div><div class='parts'>" +
      subs.map(function (s) {
        return "<div class='part' data-key='" + esc(s.key) + "'><div class='pn'>" + esc(s.name) + " " + tierPill(s.tier) + "</div><div class='pc'>" + s.count + " Q</div><div class='pbar'><span style='width:" + Math.round(s.count / mx * 100) + "%'></span></div></div>";
      }).join("") + "</div><p class='hint'>Click a part to see its questions.</p>");
    wireParts();
  }
  function openSubtopic(key) {
    var s = subtopics[key]; if (!s) return;
    var qs = s.ids.map(function (id) { return Q[id]; });
    openDrawer("<div class='crumb'>History ▸ " + esc(s.sec) + "</div><h2>" + esc(s.name) + " " + tierPill(s.tier) + "</h2>" +
      "<div class='mini-stats'><div class='mini-stat'><div class='k'>Questions</div><div class='v'>" + s.count + "</div></div>" +
      "<div class='mini-stat'><div class='k'>Recency</div><div class='v'>" + Math.round(s.recency * 100) + "%</div></div>" +
      "<div class='mini-stat'><div class='k'>Priority</div><div class='v'>P" + s.tier + "</div></div></div>" +
      "<div class='subhead'>Asked in which year</div>" + miniHeat(s.years) +
      "<div class='subhead'>Asked in which exam</div><div class='parts'>" + examBars(s.exams, s.count) + "</div>" +
      "<div class='subhead'>All " + s.count + " previous-year questions</div><div class='qlist'>" +
      qs.map(function (q, i) {
        var opts = ["a", "b", "c", "d"].filter(function (l) { return q.o[l]; }).map(function (l) {
          return "<div class='o" + (l === q.a ? " ans" : "") + "'>(" + l + ") " + esc(q.o[l]) + (l === q.a ? " ✓" : "") + "</div>";
        }).join("");
        return "<div class='qitem'><div class='qhead'><span class='qn'>Q" + (i + 1) + "</span><span>" + esc(q.q) + "</span></div>" +
          "<div class='qbody'>" + opts + "<div class='exp'><b>Solution:</b> " + esc(q.s) + "</div>" +
          "<div class='src'>" + esc(q.ex || "Unknown exam") + (q.y ? " · " + q.y : "") + (q.sh ? " · " + esc(q.sh) : "") + "</div></div></div>";
      }).join("") + "</div>");
    dbody.querySelectorAll(".qhead").forEach(function (h) { h.addEventListener("click", function () { this.nextElementSibling.classList.toggle("show"); }); });
    wireParts();
  }
  function wireParts() {
    dbody.querySelectorAll(".part[data-key]").forEach(function (p) { p.addEventListener("click", function () { openSubtopic(this.dataset.key); }); });
  }
  function sumYears(qs) { var y = {}; qs.forEach(function (q) { if (q.y) y[q.y] = (y[q.y] || 0) + 1; }); return y; }

  // board row click
  main.addEventListener("click", function (e) {
    var row = e.target.closest(".row[data-key]"); if (row) openSubtopic(row.dataset.key);
  });

  /* ---------- Routing / nav ---------- */
  var VIEWS = { dashboard: renderDashboard, map: renderMap, heatmap: renderHeatmap, quiz: renderQuiz };
  var nav = document.querySelector(".nav");
  nav.addEventListener("click", function (e) {
    var b = e.target.closest(".nav-pill"); if (!b) return;
    [].forEach.call(nav.children, function (c) { c.classList.toggle("active", c === b); });
    (VIEWS[b.dataset.view] || renderDashboard)();
    window.scrollTo(0, 0);
  });

  /* ---------- Theme ---------- */
  document.getElementById("theme-toggle").addEventListener("click", function () {
    var cur = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", cur);
    try { localStorage.setItem("gsviz-theme", cur); } catch (e) { }
    this.textContent = cur === "light" ? "☀" : "☾";
  });

  renderDashboard();
})();
