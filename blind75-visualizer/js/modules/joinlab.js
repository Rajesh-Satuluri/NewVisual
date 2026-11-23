/*
 * joinlab.js — Spark Join Strategies Execution Lab.
 *
 * A dependency-free, theme-aware, animated SVG visualization that shows HOW the
 * four Spark join strategies actually execute across a cluster:
 *   - Broadcast Hash Join (BHJ)
 *   - Sort-Merge Join      (SMJ)
 *   - Shuffle Hash Join    (SHJ)
 *   - Broadcast Nested Loop / Cartesian (BNL)
 *
 * The user picks a strategy (or "Auto" lets the optimizer choose from the slider
 * sizes), then plays / steps through the phases (Read -> Shuffle/Broadcast ->
 * Build/Sort -> Probe/Merge -> Emit). Record tokens animate between the source
 * tables and the executor lanes so data movement (the shuffle, the broadcast,
 * the nested loop) is visible, not just described. Live cost meters (network
 * bytes, big-side shuffle, driver memory, relative time) update with the sizes.
 *
 * Pure ES5, no build step, no external libraries. Animation is a small rAF
 * tween engine; prefers-reduced-motion snaps instantly instead.
 *
 * Exposed as window.JOINLAB.build(opts) -> DOM node. Dispatched from pyviz.js
 * via { type: "joinExecLab", data: {...} }.
 */
(function () {
  var NS = "http://www.w3.org/2000/svg";
  var THRESHOLD = 10; // spark.sql.autoBroadcastJoinThreshold, MB

  function E(name, a) {
    var el = document.createElementNS(NS, name);
    if (a) for (var k in a) if (a.hasOwnProperty(k)) el.setAttribute(k, String(a[k]));
    return el;
  }
  function H(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function reduced() {
    try { return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches; }
    catch (e) { return false; }
  }

  // Four key classes, colored by CSS (data-key). Big fact table has several rows
  // per key; the small/dimension table has one row per key.
  var KEYS = ["A", "B", "C", "D"];

  function build(opts) {
    opts = opts || {};
    var big = opts.big || "orders";
    var small = opts.small || "customers";
    var NE = Math.max(2, Math.min(4, opts.executors || 3));
    var bigStart = opts.bigSize || 500;   // MB
    var smallStart = opts.smallSize || 6; // MB

    var bigSize = bigStart, smallSize = smallStart;

    // ---- geometry ---------------------------------------------------------
    var W = 720, HT = 452;
    var cardW = 212, cardH = 92, cardY = 14;
    var bigX = 18, smallX = W - cardW - 18;
    var exY = 322, exH = 112;
    var exGap = 18;
    var exW = (W - exGap * (NE + 1)) / NE;
    function exX(i) { return exGap + i * (exW + exGap); }

    var svg = E("svg", {
      "class": "jl-svg", viewBox: "0 0 " + W + " " + HT, width: "100%",
      role: "img", "aria-label": "Spark join strategy execution lab"
    });

    // defs: arrowheads
    var defs = E("defs");
    function marker(id, cls) {
      var m = E("marker", { id: id, viewBox: "0 0 10 10", refX: 8, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" });
      var p = E("path", { d: "M0,0 L10,5 L0,10 z", "class": cls });
      m.appendChild(p); return m;
    }
    defs.appendChild(marker("jl-ah-shuf", "jl-ah shuf"));
    defs.appendChild(marker("jl-ah-bcast", "jl-ah bcast"));
    defs.appendChild(marker("jl-ah-local", "jl-ah local"));
    svg.appendChild(defs);

    // network band label
    var bandLbl = E("text", { "class": "jl-band", x: W / 2, y: 206, "text-anchor": "middle" });
    svg.appendChild(bandLbl);

    // ---- source cards -----------------------------------------------------
    function card(x, cls, name) {
      var g = E("g", { "class": "jl-card " + cls });
      g.appendChild(E("rect", { "class": "jl-card-box", x: x, y: cardY, width: cardW, height: cardH, rx: 10 }));
      var t = E("text", { "class": "jl-card-t", x: x + 12, y: cardY + 20 }); t.textContent = name; g.appendChild(t);
      var tag = E("text", { "class": "jl-card-tag", x: x + 12, y: cardY + cardH - 10 });
      g.appendChild(tag);
      svg.appendChild(g);
      return { g: g, tag: tag };
    }
    var bigCard = card(bigX, "jl-big", big + " (fact)");
    var smallCard = card(smallX, "jl-small", small + " (dim)");

    // ---- executor lanes ---------------------------------------------------
    var execMode = [];
    for (var i = 0; i < NE; i++) {
      var g = E("g", { "class": "jl-exec" });
      g.appendChild(E("rect", { "class": "jl-exec-box", x: exX(i), y: exY, width: exW, height: exH, rx: 10 }));
      var el = E("text", { "class": "jl-exec-t", x: exX(i) + 10, y: exY + 17 }); el.textContent = "Executor " + (i + 1); g.appendChild(el);
      // build / probe column captions
      var bc = E("text", { "class": "jl-col-cap", x: exX(i) + 10, y: exY + 33 }); bc.textContent = ""; g.appendChild(bc);
      var pc = E("text", { "class": "jl-col-cap", x: exX(i) + exW / 2 + 6, y: exY + 33 }); pc.textContent = ""; g.appendChild(pc);
      var mode = E("text", { "class": "jl-exec-mode", x: exX(i) + exW / 2, y: exY + exH - 9, "text-anchor": "middle" }); g.appendChild(mode);
      svg.appendChild(g);
      execMode.push({ mode: mode, build: bc, probe: pc });
    }

    // ---- arrows layer (created per render) ---------------------------------
    var arrowG = E("g", { "class": "jl-arrows" });
    svg.appendChild(arrowG);

    // ---- tokens -----------------------------------------------------------
    // Big fact rows: 2 per key => 8. Small dim rows: 1 per key => 4.
    var TOKW = 26, TOKH = 15;
    var tokenLayer = E("g", { "class": "jl-tokens" });
    svg.appendChild(tokenLayer);

    function makeToken(key, side) {
      var g = E("g", { "class": "jl-tok " + side, "data-key": key });
      var r = E("rect", { "class": "jl-tok-box", x: 0, y: 0, width: TOKW, height: TOKH, rx: 3 });
      var t = E("text", { "class": "jl-tok-t", x: TOKW / 2, y: TOKH - 4, "text-anchor": "middle" }); t.textContent = key;
      g.appendChild(r); g.appendChild(t);
      tokenLayer.appendChild(g);
      return { el: g, key: key, side: side, x: 0, y: 0, tx: 0, ty: 0, vis: true };
    }

    var bigToks = [], smallToks = [];
    for (var k = 0; k < KEYS.length; k++) {
      bigToks.push(makeToken(KEYS[k], "big"));
      bigToks.push(makeToken(KEYS[k], "big"));
      smallToks.push(makeToken(KEYS[k], "small"));
    }
    // broadcast ghosts: for each small token, one ghost copy per executor
    var ghosts = []; // flat list
    var ghostByExec = {}; // execIdx -> [ghost per small token]
    for (var e2 = 0; e2 < NE; e2++) ghostByExec[e2] = [];
    for (var s = 0; s < smallToks.length; s++) {
      for (var e3 = 0; e3 < NE; e3++) {
        var gh = makeToken(smallToks[s].key, "small ghost");
        gh.vis = false;
        ghosts.push(gh); ghostByExec[e3].push(gh);
      }
    }

    function setPos(tok, x, y) { tok.tx = x; tok.ty = y; }
    function place(tok, x, y) { tok.x = x; tok.y = y; tok.tx = x; tok.ty = y; apply(tok); }
    function apply(tok) {
      tok.el.setAttribute("transform", "translate(" + tok.x.toFixed(1) + "," + tok.y.toFixed(1) + ")");
      tok.el.style.opacity = tok.vis ? "1" : "0";
    }

    // slot helpers inside a card
    function cardSlot(isBig, key, dup) {
      // grid: columns = keys (A..D), rows = dup index
      var x0 = isBig ? bigX : smallX;
      var cols = KEYS.length;
      var cw = (cardW - 20) / cols;
      var col = KEYS.indexOf(key);
      var x = x0 + 10 + col * cw + (cw - TOKW) / 2;
      var y = cardY + 34 + (dup || 0) * (TOKH + 4);
      return { x: x, y: y };
    }
    // slot inside an executor: side "build" (left) or "probe" (right), row index
    function execSlot(ei, side, row) {
      var x0 = exX(ei);
      var colX = side === "build" ? x0 + 10 : x0 + exW / 2 + 4;
      var x = colX;
      var y = exY + 40 + (row || 0) * (TOKH + 3);
      return { x: x, y: y };
    }

    // ---- controls (below svg) --------------------------------------------
    var wrap = H("div", "viz viz-joinlab");

    // strategy tabs
    var tabsRow = H("div", "jl-tabs");
    var STRATS = [
      { id: "auto", label: "Auto" },
      { id: "bhj", label: "Broadcast Hash" },
      { id: "smj", label: "Sort-Merge" },
      { id: "shj", label: "Shuffle Hash" },
      { id: "bnl", label: "Nested Loop" }
    ];
    var tabEls = {};
    STRATS.forEach(function (st) {
      var b = H("button", "jl-tab", st.label);
      b.type = "button"; b.setAttribute("data-strat", st.id);
      b.addEventListener("click", function () { selectStrat(st.id); });
      tabsRow.appendChild(b); tabEls[st.id] = b;
    });
    wrap.appendChild(tabsRow);

    wrap.appendChild(svg);

    // transport + phase scrubber
    var transport = H("div", "jl-transport");
    var playBtn = H("button", "jl-btn jl-play", "▶ Play"); playBtn.type = "button";
    var stepBtn = H("button", "jl-btn", "Step ▸"); stepBtn.type = "button";
    var resetBtn = H("button", "jl-btn", "↺ Reset"); resetBtn.type = "button";
    transport.appendChild(playBtn); transport.appendChild(stepBtn); transport.appendChild(resetBtn);
    var phaseDots = H("div", "jl-dots");
    transport.appendChild(phaseDots);
    wrap.appendChild(transport);

    // narration
    var narr = H("div", "jl-narr");
    wrap.appendChild(narr);

    // sliders
    function sliderRow(label, min, max, val, unit, onChange) {
      var row = H("div", "jl-range-row");
      row.appendChild(H("span", "jl-range-lbl", label));
      var inp = document.createElement("input");
      inp.type = "range"; inp.min = String(min); inp.max = String(max); inp.value = String(val);
      inp.className = "jl-range";
      var out = H("span", "jl-range-val", val + unit);
      inp.addEventListener("input", function () {
        var v = parseInt(inp.value, 10); out.textContent = v + unit; onChange(v);
      });
      row.appendChild(inp); row.appendChild(out);
      return row;
    }
    var slidersWrap = H("div", "jl-sliders");
    slidersWrap.appendChild(sliderRow(small + " size", 1, 300, smallStart, " MB", function (v) { smallSize = v; onSizes(); }));
    slidersWrap.appendChild(sliderRow(big + " size", 50, 2000, bigStart, " MB", function (v) { bigSize = v; onSizes(); }));
    wrap.appendChild(slidersWrap);

    // cost meters
    var metersWrap = H("div", "jl-meters");
    wrap.appendChild(metersWrap);
    var METERS = [
      { id: "net", label: "Network shuffle" },
      { id: "bigshuf", label: big + " shuffled?" },
      { id: "mem", label: "Driver/exec broadcast mem" },
      { id: "time", label: "Relative cost" }
    ];
    var meterEls = {};
    METERS.forEach(function (m) {
      var row = H("div", "jl-meter");
      row.appendChild(H("span", "jl-meter-lbl", m.label));
      var track = H("span", "jl-meter-track");
      var fill = H("span", "jl-meter-fill");
      track.appendChild(fill);
      row.appendChild(track);
      var val = H("span", "jl-meter-val", "");
      row.appendChild(val);
      metersWrap.appendChild(row);
      meterEls[m.id] = { fill: fill, val: val, row: row };
    });

    // ---- phase model ------------------------------------------------------
    // Each strategy = ordered list of phases; each phase has a name + narration
    // + a layout(phaseLocalState) that sets token targets, arrows, exec labels.
    var PHASES = {
      bhj: ["Read", "Broadcast", "Build hash", "Probe (local)", "Emit"],
      smj: ["Read", "Shuffle both", "Sort", "Merge", "Emit"],
      shj: ["Read", "Shuffle both", "Build hash", "Probe", "Emit"],
      bnl: ["Read", "Broadcast", "Nested loop", "Emit"]
    };

    var curStrat = "auto";    // what the user selected
    var effStrat = "bhj";     // resolved (auto -> concrete)
    var phase = 0;
    var playing = false;
    var playTimer = null;

    function recommend() {
      if (smallSize <= THRESHOLD) return "bhj";
      if (smallSize <= bigSize * 0.33) return "shj";
      return "smj";
    }

    function resolveStrat() {
      effStrat = (curStrat === "auto") ? recommend() : curStrat;
    }

    // executor assignment for a big token
    function bigExec(tok, idx, strat) {
      if (strat === "smj" || strat === "shj") return KEYS.indexOf(tok.key) % NE; // shuffle by key
      return idx % NE; // resident, no shuffle (BHJ/BNL)
    }

    function clearArrows() { while (arrowG.firstChild) arrowG.removeChild(arrowG.firstChild); }
    function arrow(x1, y1, x2, y2, cls, marker) {
      var ln = E("line", { "class": "jl-arrow " + cls, x1: x1, y1: y1, x2: x2, y2: y2, "marker-end": "url(#" + marker + ")" });
      arrowG.appendChild(ln);
    }

    // layout: compute token targets + arrows + exec captions for (strat, phase)
    function layout() {
      clearArrows();
      var P = PHASES[effStrat];
      var pname = P[phase];
      // reset exec captions
      for (var i = 0; i < NE; i++) { execMode[i].mode.textContent = ""; execMode[i].build.textContent = ""; execMode[i].probe.textContent = ""; }
      // hide all ghosts by default
      ghosts.forEach(function (gh) { gh.vis = false; });
      bigCard.g.classList.remove("dim"); smallCard.g.classList.remove("dim");

      // READ: everything home in its card
      function homeAll() {
        var dupCount = {};
        bigToks.forEach(function (t) {
          dupCount[t.key] = (dupCount[t.key] || 0);
          var sl = cardSlot(true, t.key, dupCount[t.key]); dupCount[t.key]++;
          setPos(t, sl.x, sl.y); t.vis = true; t.el.classList.remove("matched", "scan");
        });
        smallToks.forEach(function (t) {
          var sl = cardSlot(false, t.key, 0);
          setPos(t, sl.x, sl.y); t.vis = true; t.el.classList.remove("matched", "scan");
        });
      }

      if (pname === "Read") {
        homeAll();
        bandLbl.textContent = "cluster network";
        svg.setAttribute("data-phase", "read");
        return;
      }

      // Broadcast strategies (BHJ, BNL)
      if (effStrat === "bhj" || effStrat === "bnl") {
        // big tokens resident: drop straight into their executor (no shuffle)
        var perExecRows = {};
        bigToks.forEach(function (t, idx) {
          var ei = bigExec(t, idx, effStrat);
          perExecRows[ei] = (perExecRows[ei] || 0);
          var sl = execSlot(ei, "probe", perExecRows[ei]); perExecRows[ei]++;
          if (pname === "Read") return;
          setPos(t, sl.x, sl.y); t.vis = true;
        });
        // small side broadcast to every executor (build area)
        var showBroadcast = (pname === "Broadcast" || pname === "Build hash" || pname === "Probe (local)" || pname === "Nested loop" || pname === "Emit");
        if (showBroadcast) {
          smallCard.g.classList.add("dim");
          for (var ei2 = 0; ei2 < NE; ei2++) {
            var list = ghostByExec[ei2];
            for (var si = 0; si < list.length; si++) {
              var gh = list[si];
              var sl2 = execSlot(ei2, "build", si);
              setPos(gh, sl2.x, sl2.y); gh.vis = true;
            }
            execMode[ei2].build.textContent = "hash";
          }
          // hide originals (they live in the card, dimmed) — move them to card home
          smallToks.forEach(function (t) { var sl = cardSlot(false, t.key, 0); setPos(t, sl.x, sl.y); t.vis = true; });
        }
        // arrows
        if (pname === "Broadcast") {
          for (var a = 0; a < NE; a++) arrow(smallX + cardW / 2, cardY + cardH, exX(a) + exW * 0.72, exY, "bcast", "jl-ah-bcast");
        }
        if (effStrat === "bhj") {
          bandLbl.textContent = pname === "Broadcast" ? "broadcast small → every executor (big stays put)" : "cluster network";
          for (var m1 = 0; m1 < NE; m1++) {
            execMode[m1].probe.textContent = "local " + big;
            if (pname === "Build hash") execMode[m1].mode.textContent = "hash table ready";
            if (pname === "Probe (local)") execMode[m1].mode.textContent = "probe — no shuffle";
            if (pname === "Emit") execMode[m1].mode.textContent = "matched ✓";
          }
          if (pname === "Probe (local)" || pname === "Emit") markMatches();
        } else { // bnl
          bandLbl.textContent = pname === "Broadcast" ? "broadcast small → every executor" : "cluster network";
          for (var m2 = 0; m2 < NE; m2++) {
            if (pname === "Nested loop") execMode[m2].mode.textContent = "compare every × every";
            if (pname === "Emit") execMode[m2].mode.textContent = "matched ✓";
          }
          if (pname === "Nested loop") scanAll();
          if (pname === "Emit") markMatches();
        }
        svg.setAttribute("data-phase", effStrat);
        return;
      }

      // Shuffle strategies (SMJ, SHJ)
      // both sides shuffle to exec = key % NE
      var bigRows = {}, smallRows = {};
      bigToks.forEach(function (t, idx) {
        var ei = bigExec(t, idx, effStrat);
        bigRows[ei] = (bigRows[ei] || 0);
        var sl = execSlot(ei, "probe", bigRows[ei]); bigRows[ei]++;
        setPos(t, sl.x, sl.y); t.vis = true;
      });
      smallToks.forEach(function (t) {
        var ei = KEYS.indexOf(t.key) % NE;
        smallRows[ei] = (smallRows[ei] || 0);
        var sl = execSlot(ei, "build", smallRows[ei]); smallRows[ei]++;
        setPos(t, sl.x, sl.y); t.vis = true;
      });
      if (pname === "Shuffle both") {
        bigCard.g.classList.add("dim"); smallCard.g.classList.add("dim");
        for (var a2 = 0; a2 < NE; a2++) {
          arrow(bigX + cardW / 2, cardY + cardH, exX(a2) + exW * 0.72, exY, "shuf", "jl-ah-shuf");
          arrow(smallX + cardW / 2, cardY + cardH, exX(a2) + exW * 0.28, exY, "shuf", "jl-ah-shuf");
        }
        bandLbl.textContent = "shuffle BOTH sides by key — the expensive exchange";
      } else {
        bandLbl.textContent = "cluster network";
      }
      for (var mm = 0; mm < NE; mm++) {
        execMode[mm].build.textContent = effStrat === "smj" ? "sorted" : "hash";
        execMode[mm].probe.textContent = effStrat === "smj" ? "sorted" : big;
        if (pname === "Sort") execMode[mm].mode.textContent = "sort each partition";
        if (pname === "Build hash") execMode[mm].mode.textContent = "build hash (no sort)";
        if (pname === "Merge") execMode[mm].mode.textContent = "merge-walk";
        if (pname === "Probe") execMode[mm].mode.textContent = "probe";
        if (pname === "Emit") execMode[mm].mode.textContent = "matched ✓";
      }
      if (pname === "Merge" || pname === "Probe" || pname === "Emit") markMatches();
      svg.setAttribute("data-phase", effStrat);
    }

    function markMatches() {
      bigToks.forEach(function (t) { t.el.classList.add("matched"); });
      smallToks.forEach(function (t) { t.el.classList.add("matched"); });
      ghosts.forEach(function (gh) { if (gh.vis) gh.el.classList.add("matched"); });
    }
    function scanAll() {
      bigToks.forEach(function (t) { t.el.classList.add("scan"); });
      ghosts.forEach(function (gh) { if (gh.vis) gh.el.classList.add("scan"); });
    }

    // ---- rAF tween engine -------------------------------------------------
    var animating = false;
    function tick() {
      var all = bigToks.concat(smallToks).concat(ghosts);
      var moving = false;
      for (var i = 0; i < all.length; i++) {
        var t = all[i];
        var dx = t.tx - t.x, dy = t.ty - t.y;
        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
          t.x += dx * 0.22; t.y += dy * 0.22; moving = true;
        } else { t.x = t.tx; t.y = t.ty; }
        apply(t);
      }
      if (moving) { requestAnimationFrame(tick); } else { animating = false; }
    }
    function animate() {
      if (reduced()) {
        var all = bigToks.concat(smallToks).concat(ghosts);
        for (var i = 0; i < all.length; i++) { all[i].x = all[i].tx; all[i].y = all[i].ty; apply(all[i]); }
        return;
      }
      if (!animating) { animating = true; requestAnimationFrame(tick); }
    }

    // ---- narration + meters ----------------------------------------------
    function narrate() {
      var P = PHASES[effStrat];
      var pname = P[phase];
      var head = "";
      var body = "";
      var label = STRATS.filter(function (s) { return s.id === effStrat; })[0].label;
      var autoNote = curStrat === "auto"
        ? "<span class=\"jl-auto\">Auto → " + label + "</span> "
        : "";
      var MAP = {
        bhj: {
          "Read": "Spark reads both tables. " + small + " (" + smallSize + " MB) is under the " + THRESHOLD + " MB threshold, so the optimizer plans a <b>BroadcastHashJoin</b>.",
          "Broadcast": "The driver <b>broadcasts</b> the whole " + small + " table to <b>every</b> executor. " + big + " is <b>not shuffled</b> — it stays on the executor that read it.",
          "Build hash": "Each executor builds an in-memory <b>hash table</b> from its copy of " + small + ".",
          "Probe (local)": "Each executor <b>probes</b> its local " + big + " partition against the hash table — a narrow, map-side step. Zero shuffle of the big table.",
          "Emit": "Matched rows are emitted. One tiny broadcast, no big-table exchange — the cheapest join when one side is small."
        },
        smj: {
          "Read": "Both sides are large, so the optimizer plans the default <b>SortMergeJoin</b>.",
          "Shuffle both": "Spark <b>shuffles BOTH tables</b> by the join key so matching keys land on the same executor — two full exchanges across the network.",
          "Sort": "Within each partition, both sides are <b>sorted</b> by key.",
          "Merge": "Two sorted cursors <b>merge-walk</b> down in lockstep, emitting matches. Scales to huge inputs but pays for the shuffle + sort.",
          "Emit": "Matched rows emitted. The robust default for two big tables — expensive, but it never blows up memory."
        },
        shj: {
          "Read": smallSize + " MB is too big to broadcast but small relative to " + big + ", so a <b>ShuffleHashJoin</b> fits.",
          "Shuffle both": "Both sides <b>shuffle</b> by key — same exchange as sort-merge.",
          "Build hash": "The smaller shuffled side builds a <b>per-partition hash table</b>. <b>No sort</b> — that's the difference from SortMerge.",
          "Probe": "The larger side <b>probes</b> the hash table. Faster than merge when the build side fits in memory.",
          "Emit": "Matched rows emitted. Cheaper than SortMerge when one side fits in memory, riskier if the estimate is wrong (OOM)."
        },
        bnl: {
          "Read": "A non-equi / cross join — no key to hash or sort on, so Spark falls back to <b>BroadcastNestedLoopJoin</b>.",
          "Broadcast": "One side is broadcast to every executor.",
          "Nested loop": "Every row is compared against <b>every</b> row — O(n×m). Fine for tiny inputs, catastrophic at scale.",
          "Emit": "Matched rows emitted. Last resort: watch for it in explain() on large tables."
        }
      };
      head = "<b>" + pname + "</b>";
      body = (MAP[effStrat] && MAP[effStrat][pname]) || "";
      narr.innerHTML = autoNote + head + " — " + body;
    }

    function fmtMB(v) { return v >= 1000 ? (v / 1000).toFixed(1) + " GB" : v + " MB"; }

    function meters() {
      var net, bigShuf, mem, cost;
      if (effStrat === "bhj") { net = smallSize * NE; bigShuf = 0; mem = smallSize; cost = net + bigSize * 0.05; }
      else if (effStrat === "smj") { net = bigSize + smallSize; bigShuf = bigSize; mem = 0; cost = net + (bigSize + smallSize) * 0.4; }
      else if (effStrat === "shj") { net = bigSize + smallSize; bigShuf = bigSize; mem = smallSize; cost = net + smallSize * 0.3; }
      else { net = smallSize * NE; bigShuf = 0; mem = smallSize; cost = bigSize * smallSize * 0.02 + net; }

      // scale: use a generous max so BNL/SMJ look costly
      var maxNet = (bigSize + smallSize) * 1.1;
      var maxCost = Math.max((bigSize + smallSize) * 1.5, bigSize * smallSize * 0.02);

      setMeter("net", net / maxNet, fmtMB(Math.round(net)), net > maxNet * 0.5 ? "hot" : "");
      // big shuffled? binary
      meterEls.bigshuf.fill.style.width = bigShuf > 0 ? "100%" : "8%";
      meterEls.bigshuf.fill.className = "jl-meter-fill " + (bigShuf > 0 ? "hot" : "good");
      meterEls.bigshuf.val.textContent = bigShuf > 0 ? "YES (" + fmtMB(bigShuf) + ")" : "no ✓";
      setMeter("mem", mem / Math.max(maxNet, 1), mem > 0 ? fmtMB(mem) + " ×" + NE : "none", mem > THRESHOLD * 4 ? "hot" : (mem > 0 ? "warn" : "good"));
      setMeter("time", cost / maxCost, effStrat === "bnl" ? "O(n×m) ⚠" : "", cost > maxCost * 0.6 ? "hot" : (cost > maxCost * 0.3 ? "warn" : "good"));
    }
    function setMeter(id, frac, text, cls) {
      var m = meterEls[id];
      m.fill.style.width = Math.max(4, Math.min(100, frac * 100)).toFixed(0) + "%";
      m.fill.className = "jl-meter-fill " + (cls || "");
      m.val.textContent = text;
    }

    // ---- phase dots -------------------------------------------------------
    function renderDots() {
      phaseDots.innerHTML = "";
      var P = PHASES[effStrat];
      for (var i = 0; i < P.length; i++) {
        var d = H("button", "jl-dot" + (i === phase ? " on" : ""), P[i]);
        d.type = "button";
        (function (idx) { d.addEventListener("click", function () { gotoPhase(idx); }); })(i);
        phaseDots.appendChild(d);
      }
    }

    // ---- state transitions ------------------------------------------------
    function fullRender() {
      resolveStrat();
      // keep phase in range
      var P = PHASES[effStrat];
      if (phase >= P.length) phase = P.length - 1;
      // tabs active
      STRATS.forEach(function (s) { tabEls[s.id].classList.toggle("on", s.id === curStrat); });
      tabEls.auto.setAttribute("data-eff", effStrat);
      // card tags
      bigCard.tag.textContent = fmtMB(bigSize);
      smallCard.tag.textContent = fmtMB(smallSize) + (smallSize <= THRESHOLD ? " ≤ " + THRESHOLD : " > " + THRESHOLD);
      smallCard.g.classList.toggle("broadcastable", smallSize <= THRESHOLD);
      layout();
      animate();
      narrate();
      meters();
      renderDots();
    }

    function gotoPhase(p) {
      stop();
      phase = p; fullRender();
    }
    function selectStrat(id) {
      stop();
      curStrat = id; phase = 0; fullRender();
    }
    function onSizes() {
      // live: recompute auto + meters; if auto changed strategy, reset to read
      var before = effStrat;
      resolveStrat();
      if (curStrat === "auto" && before !== effStrat) phase = 0;
      fullRender();
    }

    function stepFwd() {
      var P = PHASES[effStrat];
      if (phase < P.length - 1) { phase++; fullRender(); return true; }
      return false;
    }
    function play() {
      if (playing) { stop(); return; }
      // if at end, restart
      var P = PHASES[effStrat];
      if (phase >= P.length - 1) { phase = 0; fullRender(); }
      playing = true; playBtn.textContent = "⏸ Pause"; playBtn.classList.add("on");
      playTimer = setInterval(function () {
        if (!stepFwd()) { stop(); }
      }, 1500);
    }
    function stop() {
      playing = false; playBtn.textContent = "▶ Play"; playBtn.classList.remove("on");
      if (playTimer) { clearInterval(playTimer); playTimer = null; }
    }
    function reset() { stop(); phase = 0; fullRender(); }

    playBtn.addEventListener("click", play);
    stepBtn.addEventListener("click", function () { stop(); if (!stepFwd()) { phase = 0; fullRender(); } });
    resetBtn.addEventListener("click", reset);

    // init
    selectStrat("auto");
    return wrap;
  }

  window.JOINLAB = { build: build };
})();
