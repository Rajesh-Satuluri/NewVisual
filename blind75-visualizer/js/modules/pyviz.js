/*
 * pyviz.js — small, dependency-free visualizations for the Python-for-DSA lab.
 * Each builder returns a DOM node. Everything is theme-aware (uses CSS vars via
 * class names) and respects prefers-reduced-motion (the global CSS guard kills
 * transitions; the Step buttons still work, they just don't animate).
 */
(function () {
  function elh(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  // ---- indexed sequence: boxes with positive + negative index rails ----
  // opts: { items: [..], label: "arr" }
  function sequence(opts) {
    var items = opts.items || [];
    var wrap = elh("div", "viz viz-seq");
    if (opts.label) wrap.appendChild(elh("div", "viz-name", opts.label + " ="));

    var row = elh("div", "seq-row");
    items.forEach(function (v, i) {
      var cell = elh("div", "seq-cell");
      cell.appendChild(elh("div", "seq-ipos", String(i)));
      cell.appendChild(elh("div", "seq-val", String(v)));
      cell.appendChild(elh("div", "seq-ineg", String(i - items.length)));
      row.appendChild(cell);
    });
    wrap.appendChild(row);
    wrap.appendChild(elh("div", "viz-hint", "top = index &nbsp;•&nbsp; bottom = negative index"));
    return wrap;
  }

  // ---- dict hashing pipeline: key -> hash -> slot -> value, with Step ----
  // opts: { pairs: [[key, value], ..] }
  function dictHash(opts) {
    var pairs = opts.pairs || [];
    var SLOTS = 8;
    var wrap = elh("div", "viz viz-dict");

    var stage = elh("div", "dh-stage");
    var keyBox = elh("div", "dh-key", "—");
    var arrow1 = elh("div", "dh-arrow", "hash() →");
    var hashBox = elh("div", "dh-hash", "—");
    var arrow2 = elh("div", "dh-arrow", "% " + SLOTS + " →");
    stage.appendChild(keyBox);
    stage.appendChild(arrow1);
    stage.appendChild(hashBox);
    stage.appendChild(arrow2);
    wrap.appendChild(stage);

    var table = elh("div", "dh-table");
    var slotEls = [];
    for (var s = 0; s < SLOTS; s++) {
      var slot = elh("div", "dh-slot");
      slot.appendChild(elh("div", "dh-slot-i", String(s)));
      var body = elh("div", "dh-slot-body", "");
      slot.appendChild(body);
      slotEls.push(body);
      table.appendChild(slot);
    }
    wrap.appendChild(table);

    // deterministic tiny hash so the demo is stable across runs
    function hashStr(str) {
      var hStr = 0;
      for (var i = 0; i < str.length; i++) hStr = (hStr * 31 + str.charCodeAt(i)) >>> 0;
      return hStr;
    }

    var step = 0;
    var controls = elh("div", "viz-controls");
    var runBtn = elh("button", "viz-btn", "▶ Step");
    var resetBtn = elh("button", "viz-btn ghost", "↻ Reset");
    controls.appendChild(runBtn);
    controls.appendChild(resetBtn);
    wrap.appendChild(controls);
    var status = elh("div", "viz-hint", "Press Step to insert each key into its slot.");
    wrap.appendChild(status);

    function clearActive() {
      var a = table.querySelectorAll(".active");
      for (var i = 0; i < a.length; i++) a[i].classList.remove("active");
    }

    function doStep() {
      if (step >= pairs.length) { status.innerHTML = "All keys placed. Lookup is: hash the key → go straight to its slot."; return; }
      var k = pairs[step][0], v = pairs[step][1];
      var hStr = hashStr(k);
      var slot = hStr % SLOTS;
      keyBox.textContent = "'" + k + "'";
      hashBox.textContent = String(hStr % 100000);
      clearActive();
      var target = slotEls[slot];
      var existing = target.textContent;
      target.innerHTML = (existing ? existing + ", " : "") + "'" + k + "'→" + v;
      target.parentNode.classList.add("active");
      status.innerHTML = "'" + k + "' hashes to slot <b>" + slot + "</b> — value stored with no scanning of other slots.";
      step++;
    }

    runBtn.addEventListener("click", doStep);
    resetBtn.addEventListener("click", function () {
      step = 0; keyBox.textContent = "—"; hashBox.textContent = "—"; clearActive();
      for (var i = 0; i < slotEls.length; i++) slotEls[i].textContent = "";
      status.innerHTML = "Press Step to insert each key into its slot.";
    });

    return wrap;
  }

  // ---- recursion call stack: push frames on the way down, unwind with returns ----
  // opts: { calls: ["factorial(3)", ...], returns: ["3*2 = 6", ...] } (returns
  // are ordered base-case first, i.e. the order they resolve).
  function callStack(opts) {
    var calls = opts.calls || [], returns = opts.returns || [];
    var wrap = elh("div", "viz viz-stack");
    var stackEl = elh("div", "cs-stack");
    wrap.appendChild(stackEl);
    var status = elh("div", "viz-hint", "Step: calls stack downward until the base case, then returns travel back up.");
    var controls = elh("div", "viz-controls");
    var stepBtn = elh("button", "viz-btn", "▶ Step");
    var resetBtn = elh("button", "viz-btn ghost", "↻ Reset");
    controls.appendChild(stepBtn); controls.appendChild(resetBtn);
    wrap.appendChild(controls); wrap.appendChild(status);

    var phase = 0; // 0..calls.length = pushing; then unwinding
    var pushed = 0, popped = 0;

    function draw() {
      stackEl.innerHTML = "";
      for (var i = 0; i < pushed; i++) {
        var resolved = i >= (pushed - popped);
        var f = elh("div", "cs-frame" + (i === pushed - 1 && popped === 0 ? " top" : "") + (resolved ? " resolved" : ""));
        f.style.marginLeft = (i * 18) + "px";
        f.innerHTML = '<span class="cs-call">' + calls[i] + "</span>" +
          (resolved ? '<span class="cs-ret">→ ' + returns[pushed - 1 - i] + "</span>" : "");
        stackEl.appendChild(f);
      }
    }

    function step() {
      if (pushed < calls.length) {
        pushed++;
        if (pushed === calls.length) status.innerHTML = "Base case reached — now each call returns its value to its caller.";
        else status.innerHTML = "Call <b>" + calls[pushed - 1] + "</b> pushes a new frame and pauses, waiting on the call below it.";
      } else if (popped < calls.length) {
        popped++;
        status.innerHTML = "<b>" + calls[calls.length - popped] + "</b> returns <b>" + returns[popped - 1] + "</b> to its caller.";
      } else {
        status.innerHTML = "Done — the top call now has its final answer: " + returns[returns.length - 1] + ".";
      }
      draw();
    }
    stepBtn.addEventListener("click", step);
    resetBtn.addEventListener("click", function () { pushed = 0; popped = 0; draw(); status.innerHTML = "Step: calls stack downward until the base case, then returns travel back up."; });
    draw();
    return wrap;
  }

  // ---- Big-O growth explorer: slider for n, live operation counts per class ----
  function growth(opts) {
    var classes = (opts && opts.classes) || ["O(1)", "O(log n)", "O(n)", "O(n log n)", "O(n²)", "O(2ⁿ)"];
    var wrap = elh("div", "viz viz-growth");
    var row = elh("div", "gr-controls");
    var label = elh("span", "gr-label", "n = 8");
    var slider = document.createElement("input");
    slider.type = "range"; slider.min = "1"; slider.max = "32"; slider.value = "8"; slider.className = "gr-slider";
    row.appendChild(label); row.appendChild(slider);
    wrap.appendChild(row);
    var bars = elh("div", "gr-bars");
    wrap.appendChild(bars);

    function ops(cls, n) {
      switch (cls) {
        case "O(1)": return 1;
        case "O(log n)": return Math.max(1, Math.round(Math.log2(n)));
        case "O(n)": return n;
        case "O(n log n)": return Math.round(n * Math.max(1, Math.log2(n)));
        case "O(n²)": return n * n;
        case "O(2ⁿ)": return Math.pow(2, Math.min(n, 20));
        default: return n;
      }
    }
    function render() {
      var n = parseInt(slider.value, 10);
      label.textContent = "n = " + n;
      var vals = classes.map(function (c) { return ops(c, n); });
      var max = Math.max.apply(null, vals);
      bars.innerHTML = "";
      classes.forEach(function (c, i) {
        var pct = Math.max(2, Math.round((vals[i] / max) * 100));
        var b = elh("div", "gr-bar-row");
        b.innerHTML = '<span class="gr-name">' + c + '</span>' +
          '<span class="gr-track"><span class="gr-fill c' + i + '" style="width:' + pct + '%"></span></span>' +
          '<span class="gr-val">' + (vals[i] > 100000 ? vals[i].toExponential(1) : vals[i].toLocaleString()) + " ops</span>";
        bars.appendChild(b);
      });
    }
    slider.addEventListener("input", render);
    render();
    return wrap;
  }

  // ---- heap: the same data shown as an array AND as a binary tree ----
  // opts: { array: [1,3,6,5,9,8] }  (a valid min-heap)
  function heapTree(opts) {
    var arr = opts.array || [];
    var wrap = elh("div", "viz viz-heap");
    wrap.appendChild(elh("div", "viz-name", "heap = " + JSON.stringify(arr)));

    // array row with indices
    var row = elh("div", "seq-row");
    arr.forEach(function (v, i) {
      var cell = elh("div", "seq-cell");
      cell.appendChild(elh("div", "seq-ipos", String(i)));
      cell.appendChild(elh("div", "seq-val", String(v)));
      row.appendChild(cell);
    });
    wrap.appendChild(row);

    // tree: level by level (index i -> children 2i+1, 2i+2)
    var tree = elh("div", "hp-tree");
    var level = 0, count = 1, i = 0;
    while (i < arr.length) {
      var lvl = elh("div", "hp-level");
      for (var k = 0; k < count && i < arr.length; k++, i++) {
        var node = elh("div", "hp-node" + (i === 0 ? " root" : ""), String(arr[i]));
        lvl.appendChild(node);
      }
      tree.appendChild(lvl);
      level++; count *= 2;
    }
    wrap.appendChild(tree);
    wrap.appendChild(elh("div", "viz-hint", "Parent at i, children at 2i+1 and 2i+2. In a min-heap every parent ≤ its children, so the smallest is always at index 0."));
    return wrap;
  }

  // ---- set operations: two overlapping circles, highlight the result set ----
  // opts: { a: [1,2,3,4], b: [3,4,5,6] }
  function setOps(opts) {
    var A = opts.a || [], B = opts.b || [];
    var setB = {}; B.forEach(function (x) { setB[x] = true; });
    var setA = {}; A.forEach(function (x) { setA[x] = true; });
    var onlyA = A.filter(function (x) { return !setB[x]; });
    var both = A.filter(function (x) { return setB[x]; });
    var onlyB = B.filter(function (x) { return !setA[x]; });

    var wrap = elh("div", "viz viz-sets");
    var venn = elh("div", "vn-venn");
    var cA = elh("div", "vn-circle vn-a");
    var cB = elh("div", "vn-circle vn-b");
    var lA = elh("div", "vn-only vn-onlya", onlyA.join(" "));
    var lMid = elh("div", "vn-mid", both.join(" "));
    var lB = elh("div", "vn-only vn-onlyb", onlyB.join(" "));
    venn.appendChild(cA); venn.appendChild(cB);
    venn.appendChild(lA); venn.appendChild(lMid); venn.appendChild(lB);
    wrap.appendChild(venn);

    var controls = elh("div", "viz-controls");
    var status = elh("div", "viz-hint", "a = {" + A.join(", ") + "}   b = {" + B.join(", ") + "}");
    var ops = [
      ["a | b  (union)", A.concat(onlyB)],
      ["a & b  (intersection)", both],
      ["a - b  (difference)", onlyA]
    ];
    ops.forEach(function (o) {
      var btn = elh("button", "viz-btn ghost", o[0]);
      btn.addEventListener("click", function () {
        venn.className = "vn-venn hl";
        lA.classList.toggle("on", o[1].indexOf(onlyA[0]) !== -1 || o[0].indexOf("union") !== -1 || o[0].indexOf("difference") !== -1);
        // simpler: recompute highlight per element group
        var res = {}; o[1].forEach(function (x) { res[x] = true; });
        lA.classList.toggle("on", onlyA.some(function (x) { return res[x]; }));
        lMid.classList.toggle("on", both.some(function (x) { return res[x]; }));
        lB.classList.toggle("on", onlyB.some(function (x) { return res[x]; }));
        status.innerHTML = "<b>" + o[0] + "</b> = {" + o[1].join(", ") + "}";
      });
      controls.appendChild(btn);
    });
    wrap.appendChild(controls);
    wrap.appendChild(status);
    return wrap;
  }

  // ---- execution order: order you WRITE code vs order the engine RUNS it ----
  // Two stacked panels (SQL, then PySpark). Each has a left column in *written*
  // order and a right column in *execution* order; wires link each clause to the
  // stage where it actually runs. SQL wires cross (written != executed); the
  // PySpark chain's wires are straight (written == executed) — that contrast is
  // the whole lesson. Hover a chip to highlight its twin + wire; ▶ Trace walks
  // the pipeline stage by stage on both sides at once.
  // opts: {
  //   stages: [{ key, sql, spark, note }],   // in EXECUTION order (step 1..n)
  //   sqlWritten: [key, ...]                  // SQL clauses in WRITTEN order
  // }
  function execOrder(opts) {
    function esc(s) {
      return String(s).replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; });
    }
    var stages = opts.stages || [];
    var n = stages.length;
    var byKey = {}; stages.forEach(function (s, i) { byKey[s.key] = i; }); // key -> exec index
    var sqlWritten = opts.sqlWritten || stages.map(function (s) { return s.key; });
    var sparkWritten = stages.map(function (s) { return s.key; }); // written == executed

    var NS = "http://www.w3.org/2000/svg";
    var W = 560, rowH = 40, top = 44, chipW = 224, chipH = 28, badge = 12;
    var Lx = 6, Rx = W - chipW - 6;

    function svgEl(name, attrs) {
      var e = document.createElementNS(NS, name);
      if (attrs) for (var k in attrs) e.setAttribute(k, String(attrs[k]));
      return e;
    }
    function cy(rowIdx) { return top + rowIdx * rowH + chipH / 2; }

    var wrap = elh("div", "viz viz-eo");
    var defaultStatus = "Hover a step to see why it runs where it does — or press <b>▶ Trace the flow</b> to watch the data move through the pipeline.";
    var status = elh("div", "viz-hint eo-status", defaultStatus);

    var panels = [];

    function panel(title, sub, leftOrder, accentClass) {
      var H = top + n * rowH + 6;
      var svg = svgEl("svg", { "class": "eo-svg " + accentClass, viewBox: "0 0 " + W + " " + H, width: "100%", role: "img", "aria-label": title });
      var h1 = svgEl("text", { "class": "eo-col-h", x: Lx + 4, y: 24 }); h1.textContent = "▾ " + title;
      var h2 = svgEl("text", { "class": "eo-col-h", x: Rx + 4, y: 24 }); h2.textContent = sub;
      svg.appendChild(h1); svg.appendChild(h2);

      var chips = {};
      // wires first, so chips paint on top
      leftOrder.forEach(function (key, li) {
        var ri = byKey[key];
        var y1 = cy(li), y2 = cy(ri), x1 = Lx + chipW, x2 = Rx, mx = (x1 + x2) / 2;
        var wire = svgEl("path", { "class": "eo-wire", d: "M" + x1 + "," + y1 + " C" + mx + "," + y1 + " " + mx + "," + y2 + " " + x2 + "," + y2 });
        svg.appendChild(wire);
        chips[key] = { wire: wire };
      });

      function chip(x, rowIdx, key, label, stepNum) {
        var y = top + rowIdx * rowH;
        var g = svgEl("g", { "class": "eo-chip-g", tabindex: "0", role: "button", "aria-label": label + " runs at step " + stepNum });
        g.appendChild(svgEl("rect", { "class": "eo-chip", x: x, y: y, width: chipW, height: chipH, rx: 7 }));
        g.appendChild(svgEl("circle", { "class": "eo-badge", cx: x + badge + 5, cy: y + chipH / 2, r: badge }));
        var bt = svgEl("text", { "class": "eo-badge-t", x: x + badge + 5, y: y + chipH / 2 + 4 }); bt.textContent = String(stepNum);
        g.appendChild(bt);
        var t = svgEl("text", { "class": "eo-chip-label", x: x + badge * 2 + 12, y: y + chipH / 2 + 4 }); t.textContent = label;
        g.appendChild(t);
        svg.appendChild(g);
        g.addEventListener("mouseenter", function () { hoverFocus(key); });
        g.addEventListener("focus", function () { hoverFocus(key); });
        g.addEventListener("mouseleave", releaseFocus);
        g.addEventListener("blur", releaseFocus);
        return { g: g };
      }

      leftOrder.forEach(function (key, li) {
        var ri = byKey[key], st = stages[ri];
        chips[key].left = chip(Lx, li, key, accentClass === "eo-sql" ? st.sql : st.spark, ri + 1);
      });
      stages.forEach(function (st, ri) {
        chips[st.key].right = chip(Rx, ri, st.key, accentClass === "eo-sql" ? st.sql : st.spark, ri + 1);
      });
      return { svg: svg, chips: chips };
    }

    function applyFocus(key) {
      panels.forEach(function (p) {
        for (var k in p.chips) {
          var c = p.chips[k], on = (k === key);
          if (c.wire) { c.wire.classList.toggle("on", on); c.wire.classList.toggle("dim", !on); }
          if (c.left) { c.left.g.classList.toggle("on", on); c.left.g.classList.toggle("dim", !on); }
          if (c.right) { c.right.g.classList.toggle("on", on); c.right.g.classList.toggle("dim", !on); }
        }
      });
    }
    function clearClasses() {
      panels.forEach(function (p) {
        for (var k in p.chips) {
          var c = p.chips[k];
          if (c.wire) c.wire.classList.remove("on", "dim");
          if (c.left) c.left.g.classList.remove("on", "dim");
          if (c.right) c.right.g.classList.remove("on", "dim");
        }
      });
    }
    function hoverFocus(key) {
      if (tracing) return;
      applyFocus(key);
      var st = stages[byKey[key]];
      status.innerHTML = "<b>" + esc(st.sql) + "</b> runs at step " + (byKey[key] + 1) + " — " + esc(st.note);
    }
    function releaseFocus() {
      if (tracing) return;
      clearClasses();
      status.innerHTML = defaultStatus;
    }

    // trace
    var tracing = false, traceI = 0, traceTimer = null;
    function traceStep() {
      if (traceI >= n) { stopTrace(); status.innerHTML = "Done — that is the full run order, <b>1 → " + n + "</b>. Notice the numbers march straight down the PySpark chain, but jump around the SQL you wrote."; return; }
      var st = stages[traceI];
      applyFocus(st.key);
      status.innerHTML = "Step " + (traceI + 1) + " of " + n + ": <b>" + esc(st.sql) + "</b> runs. " + esc(st.note);
      traceI++;
      traceTimer = setTimeout(traceStep, 1150);
    }
    function stopTrace() { tracing = false; if (traceTimer) { clearTimeout(traceTimer); traceTimer = null; } runBtn.textContent = "▶ Trace the flow"; }

    panels.push(panel("SQL — as you write it", "…but it RUNS in this order", sqlWritten, "eo-sql"));
    panels.push(panel("PySpark — as you write it", "…and it RUNS in the same order", sparkWritten, "eo-spark"));
    panels.forEach(function (p) { wrap.appendChild(p.svg); });

    var controls = elh("div", "viz-controls");
    var runBtn = elh("button", "viz-btn", "▶ Trace the flow");
    var resetBtn = elh("button", "viz-btn ghost", "↻ Reset");
    controls.appendChild(runBtn); controls.appendChild(resetBtn);
    wrap.appendChild(controls);
    wrap.appendChild(status);

    runBtn.addEventListener("click", function () {
      if (tracing) { stopTrace(); return; }
      tracing = true; traceI = 0; runBtn.textContent = "⏸ Pause"; traceStep();
    });
    resetBtn.addEventListener("click", function () { stopTrace(); clearClasses(); status.innerHTML = defaultStatus; });

    return wrap;
  }

  // ---- Catalyst: the plan you WROTE vs the plan Spark RUNS -------------------
  // Two stacked plan columns. The left is your DataFrame chain as typed; the
  // right is Spark's optimized plan (filters pushed down, columns pruned). A
  // "▶ Optimize" trace walks the rewrites; a toggle drops in a Python UDF and
  // shows pushdown hitting the wall. Same DNA as execOrder: written ≠ run.
  // opts: {
  //   written:   [{ t, detail, why }],
  //   optimized: [{ t, detail, changed, why }],
  //   udf: { optimized: [...], steps: [...] },   // alternate: UDF blocks pushdown
  //   steps: [{ title, caption, w:[idx], o:[idx] }],
  //   hint, done
  // }
  function catalyst(opts) {
    function esc(s) { return String(s == null ? "" : s).replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); }
    var NS = "http://www.w3.org/2000/svg";
    function svgEl(name, attrs) { var e = document.createElementNS(NS, name); if (attrs) for (var k in attrs) e.setAttribute(k, String(attrs[k])); return e; }
    var W = 560, X = 8, boxW = W - 16, boxH = 34, rowH = 42, top = 46;

    var written = opts.written || [];
    var wrap = elh("div", "viz viz-cat");
    var host = elh("div", "cat-host");
    wrap.appendChild(host);
    var defaultStatus = opts.hint || "Press <b>▶ Optimize</b> to watch Spark rewrite your plan for speed — then toggle a Python UDF to see what blocks it.";
    var status = elh("div", "viz-hint cat-status", defaultStatus);

    var udfOn = false, panels = {}, tracing = false, ti = 0, timer = null;

    function buildPanel(title, sub, rows, accentClass) {
      var H = top + rows.length * rowH + 6;
      var svg = svgEl("svg", { "class": "cat-svg " + accentClass, viewBox: "0 0 " + W + " " + H, width: "100%", role: "img", "aria-label": title });
      var h1 = svgEl("text", { "class": "cat-col-h", x: X + 2, y: 20 }); h1.textContent = "▾ " + title;
      var h2 = svgEl("text", { "class": "cat-col-h cat-col-sub", x: X + 2, y: 38 }); h2.textContent = sub;
      svg.appendChild(h1); svg.appendChild(h2);
      var els = [];
      rows.forEach(function (r, i) {
        var y = top + i * rowH;
        var g = svgEl("g", { "class": "cat-row" + (r.changed ? " changed" : "") + (r.wall ? " wall" : ""), tabindex: "0", role: "button" });
        g.appendChild(svgEl("rect", { "class": "cat-box", x: X, y: y, width: boxW, height: boxH, rx: 7 }));
        if (r.changed || r.wall) g.appendChild(svgEl("rect", { "class": "cat-stripe", x: X, y: y, width: 4, height: boxH }));
        var t = svgEl("text", { "class": "cat-op", x: X + 16, y: y + boxH / 2 + 1 }); t.textContent = r.t;
        g.appendChild(t);
        if (r.detail) { var d = svgEl("text", { "class": "cat-detail", x: X + boxW - 12, y: y + boxH / 2 + 1 }); d.textContent = r.detail; g.appendChild(d); }
        svg.appendChild(g);
        (function (r) {
          function hi() { if (tracing) return; status.innerHTML = "<b>" + esc(r.t) + "</b>" + (r.why ? " — " + esc(r.why) : ""); }
          function out() { if (tracing) return; status.innerHTML = defaultStatus; }
          g.addEventListener("mouseenter", hi); g.addEventListener("focus", hi);
          g.addEventListener("mouseleave", out); g.addEventListener("blur", out);
        })(r);
        els.push(g);
      });
      return { svg: svg, els: els };
    }

    function render() {
      host.innerHTML = "";
      var opt = udfOn ? ((opts.udf && opts.udf.optimized) || opts.optimized) : (opts.optimized || []);
      panels.written = buildPanel("Plan as you WROTE it", "the chain you typed", written, "cat-write");
      panels.optimized = buildPanel(
        udfOn ? "How Spark runs it — UDF wall" : "How Spark RUNS it — optimized",
        udfOn ? "the Python UDF blocks pushdown" : "filters pushed down · columns pruned",
        opt, "cat-run");
      host.appendChild(panels.written.svg);
      host.appendChild(panels.optimized.svg);
    }
    function clearHi() { ["written", "optimized"].forEach(function (p) { if (panels[p]) panels[p].els.forEach(function (e) { e.classList.remove("on", "dim"); }); }); }
    function highlight(wIdx, oIdx) {
      panels.written.els.forEach(function (e, i) { e.classList.toggle("on", wIdx.indexOf(i) !== -1); e.classList.toggle("dim", wIdx.indexOf(i) === -1); });
      panels.optimized.els.forEach(function (e, i) { e.classList.toggle("on", oIdx.indexOf(i) !== -1); e.classList.toggle("dim", oIdx.indexOf(i) === -1); });
    }
    function curSteps() { return udfOn ? ((opts.udf && opts.udf.steps) || opts.steps || []) : (opts.steps || []); }
    function step() {
      var steps = curSteps();
      if (ti >= steps.length) { stop(); clearHi(); status.innerHTML = opts.done || "That's the rewrite: you wrote it for clarity, Spark ran it for speed."; return; }
      var s = steps[ti]; highlight(s.w || [], s.o || []);
      status.innerHTML = "<b>" + esc(s.title) + "</b> — " + esc(s.caption); ti++;
      timer = setTimeout(step, 1600);
    }
    function stop() { tracing = false; if (timer) { clearTimeout(timer); timer = null; } runBtn.textContent = "▶ Optimize"; }

    render();
    var controls = elh("div", "viz-controls");
    var runBtn = elh("button", "viz-btn", "▶ Optimize");
    var resetBtn = elh("button", "viz-btn ghost", "↻ Reset");
    var udfBtn = elh("button", "viz-btn ghost", "🐍 Add a Python UDF");
    controls.appendChild(runBtn); controls.appendChild(udfBtn); controls.appendChild(resetBtn);
    wrap.appendChild(controls); wrap.appendChild(status);

    runBtn.addEventListener("click", function () { if (tracing) { stop(); return; } tracing = true; ti = 0; runBtn.textContent = "⏸ Pause"; step(); });
    resetBtn.addEventListener("click", function () { stop(); clearHi(); status.innerHTML = defaultStatus; });
    udfBtn.addEventListener("click", function () {
      udfOn = !udfOn; stop(); render();
      udfBtn.classList.toggle("on", udfOn);
      udfBtn.textContent = udfOn ? "↩ Remove the UDF" : "🐍 Add a Python UDF";
      status.innerHTML = udfOn
        ? "With a <b>Python UDF</b> in the chain, Catalyst can't see inside it — the filter is stuck <b>above</b> the UDF and every row is read. Prefer built-in <code>F.*</code> functions."
        : defaultStatus;
    });
    return wrap;
  }

  // ---- Driver vs Executors: where does each line of my code run? ------------
  // A cluster diagram: one driver, N executors (each holding partitions), and a
  // storage bar. Click an operation (or ▶ Run the job) to light up WHERE it runs
  // and what moves — distributed on executors, shuffled between them, funnelled
  // into the driver (collect → OOM risk), serialized to Python workers (UDF), or
  // written straight to storage.
  // opts: { executors, ops: [{ key, label, where, caption }] }
  //   where ∈ "executors" | "shuffle" | "driver" | "udf" | "storage"
  function clusterRun(opts) {
    function esc(s) { return String(s == null ? "" : s).replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); }
    var NS = "http://www.w3.org/2000/svg";
    function svgEl(name, attrs) { var e = document.createElementNS(NS, name); if (attrs) for (var k in attrs) e.setAttribute(k, String(attrs[k])); return e; }
    var NE = opts.executors || 3;
    var ops = opts.ops || [];

    var W = 560, H = 268;
    var svg = svgEl("svg", { "class": "cr-svg", viewBox: "0 0 " + W + " " + H, width: "100%", role: "img", "aria-label": "Driver and executors" });

    // driver (top center)
    var dW = 190, dX = (W - dW) / 2, dY = 8, dH = 40;
    var driver = svgEl("g", { "class": "cr-driver" });
    driver.appendChild(svgEl("rect", { "class": "cr-drv-box", x: dX, y: dY, width: dW, height: dH, rx: 8 }));
    var dt = svgEl("text", { "class": "cr-drv-t", x: W / 2, y: dY + dH / 2 + 1 }); dt.textContent = "Driver  ·  1 JVM (your main program)"; driver.appendChild(dt);

    // executors row
    var exW = 158, exH = 74, exY = 150, gap = (W - NE * exW) / (NE + 1);
    var execXs = [];
    var execG = svgEl("g", {});
    for (var e = 0; e < NE; e++) {
      var ex = gap + e * (exW + gap); execXs.push(ex);
      var g = svgEl("g", { "class": "cr-exec" });
      g.appendChild(svgEl("rect", { "class": "cr-exec-box", x: ex, y: exY, width: exW, height: exH, rx: 8 }));
      var lt = svgEl("text", { "class": "cr-exec-t", x: ex + 10, y: exY + 16 }); lt.textContent = "Executor " + (e + 1); g.appendChild(lt);
      for (var p = 0; p < 2; p++) {
        g.appendChild(svgEl("rect", { "class": "cr-part", x: ex + 10 + p * 72, y: exY + 28, width: 64, height: 32, rx: 5 }));
        var pt = svgEl("text", { "class": "cr-part-t", x: ex + 10 + p * 72 + 32, y: exY + 28 + 20 }); pt.textContent = "part " + (e * 2 + p); g.appendChild(pt);
      }
      execG.appendChild(g);
    }

    // storage bar (bottom)
    var stY = H - 30, stX = 60, stW = W - 120;
    var storage = svgEl("g", { "class": "cr-storage" });
    storage.appendChild(svgEl("rect", { "class": "cr-store-box", x: stX, y: stY, width: stW, height: 22, rx: 6 }));
    var stt = svgEl("text", { "class": "cr-store-t", x: W / 2, y: stY + 15 }); stt.textContent = "Storage  ·  Parquet / Delta (S3, HDFS…)"; storage.appendChild(stt);

    // arrow helper
    function arrow(x1, y1, x2, y2, cls) {
      var g = svgEl("g", { "class": "cr-arrow " + cls });
      g.appendChild(svgEl("line", { "class": "cr-line", x1: x1, y1: y1, x2: x2, y2: y2 }));
      var ang = Math.atan2(y2 - y1, x2 - x1), s = 7;
      var pts = x2 + "," + y2 + " " +
        (x2 - s * Math.cos(ang - 0.5)) + "," + (y2 - s * Math.sin(ang - 0.5)) + " " +
        (x2 - s * Math.cos(ang + 0.5)) + "," + (y2 - s * Math.sin(ang + 0.5));
      g.appendChild(svgEl("polygon", { "class": "cr-head", points: pts }));
      return g;
    }
    var arrowsG = svgEl("g", {});
    // funnel: each executor -> driver
    execXs.forEach(function (ex) { arrowsG.appendChild(arrow(ex + exW / 2, exY, W / 2, dY + dH, "funnel")); });
    // shuffle: between adjacent executors (both directions, curved via mid dip)
    for (var i2 = 0; i2 < NE - 1; i2++) {
      arrowsG.appendChild(arrow(execXs[i2] + exW, exY + exH / 2, execXs[i2 + 1], exY + exH / 2, "shuffle"));
      arrowsG.appendChild(arrow(execXs[i2 + 1], exY + exH - 10, execXs[i2] + exW, exY + exH - 10, "shuffle"));
    }
    // store: each executor -> storage
    execXs.forEach(function (ex) { arrowsG.appendChild(arrow(ex + exW / 2, exY + exH, ex + exW / 2, stY, "store")); });
    // udf: a python worker beside each executor + serialize arrows
    var udfG = svgEl("g", { "class": "cr-arrow udf" });
    execXs.forEach(function (ex) {
      var wx = ex + exW - 30, wy = exY - 26;
      udfG.appendChild(svgEl("rect", { "class": "cr-py", x: wx, y: wy, width: 34, height: 20, rx: 4 }));
      var wt = svgEl("text", { "class": "cr-py-t", x: wx + 17, y: wy + 14 }); wt.textContent = "py"; udfG.appendChild(wt);
      udfG.appendChild(svgEl("line", { "class": "cr-line", x1: wx + 17, y1: wy + 20, x2: ex + exW - 20, y2: exY }));
    });
    arrowsG.appendChild(udfG);

    svg.appendChild(arrowsG); svg.appendChild(driver); svg.appendChild(execG); svg.appendChild(storage);

    var wrap = elh("div", "viz viz-cr");
    wrap.appendChild(svg);
    var defaultStatus = "Click an operation to see <b>where it runs</b> — or press ▶ Run the job to follow a pipeline through the cluster.";
    var status = elh("div", "viz-hint cr-status", defaultStatus);

    function setActive(op) {
      svg.setAttribute("data-where", op ? op.where : "");
      driver.classList.toggle("hot", !!op && op.where === "driver");
      driver.classList.toggle("warn", !!op && op.where === "driver");
      execG.classList.toggle("hot", !!op && (op.where === "executors" || op.where === "shuffle" || op.where === "udf" || op.where === "storage"));
      storage.classList.toggle("hot", !!op && op.where === "storage");
      ["funnel", "shuffle", "store", "udf"].forEach(function (c) {
        var show = op && ((c === "funnel" && op.where === "driver") || (c === "shuffle" && op.where === "shuffle") || (c === "store" && op.where === "storage") || (c === "udf" && op.where === "udf"));
        arrowsG.querySelectorAll(".cr-arrow." + c).forEach(function (a) { a.classList.toggle("show", !!show); });
      });
      status.innerHTML = op ? ("<b>" + esc(op.label) + "</b> — " + esc(op.caption)) : defaultStatus;
    }

    // op buttons
    var opsRow = elh("div", "cr-ops");
    var opBtns = [];
    ops.forEach(function (op) {
      var b = elh("button", "cr-op-btn" + (op.warn ? " warn" : ""), esc(op.label));
      b.addEventListener("click", function () {
        var wasActive = b.classList.contains("active");
        opBtns.forEach(function (x) { x.classList.remove("active"); });
        if (wasActive) { setActive(null); } else { b.classList.add("active"); setActive(op); }
      });
      opsRow.appendChild(b); opBtns.push(b);
    });
    wrap.appendChild(opsRow);

    var controls = elh("div", "viz-controls");
    var runBtn = elh("button", "viz-btn", "▶ Run the job");
    var resetBtn = elh("button", "viz-btn ghost", "↻ Reset");
    controls.appendChild(runBtn); controls.appendChild(resetBtn);
    wrap.appendChild(controls); wrap.appendChild(status);

    var tracing = false, ti = 0, timer = null;
    var flow = ops.filter(function (o) { return o.where !== "udf" && o.where !== "storage"; }); // read→filter→shuffle→collect
    function step() {
      if (ti >= flow.length) { stop(); opBtns.forEach(function (x) { x.classList.remove("active"); }); setActive(null); return; }
      var op = flow[ti];
      opBtns.forEach(function (x) { x.classList.toggle("active", x.textContent === op.label); });
      setActive(op); ti++; timer = setTimeout(step, 1700);
    }
    function stop() { tracing = false; if (timer) { clearTimeout(timer); timer = null; } runBtn.textContent = "▶ Run the job"; }
    runBtn.addEventListener("click", function () { if (tracing) { stop(); return; } tracing = true; ti = 0; runBtn.textContent = "⏸ Pause"; step(); });
    resetBtn.addEventListener("click", function () { stop(); opBtns.forEach(function (x) { x.classList.remove("active"); }); setActive(null); });

    return wrap;
  }

  // ---- Narrow vs Wide: the shuffle is the stage boundary --------------------
  // A vertical pipeline of ops grouped into STAGE brackets; a shuffle divider
  // (with a little all-to-all mesh) sits between stages. The aha: narrow ops
  // fuse into one stage, every shuffle starts a new one — count shuffles to
  // count stages. Hover an op; ▶ Run walks the pipeline and counts stages.
  // opts: { ops: [{ t, kind, note }] }  kind ∈ "source"|"narrow"|"wide"|"action"
  function shuffleStages(opts) {
    function esc(s) { return String(s == null ? "" : s).replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); }
    var NS = "http://www.w3.org/2000/svg";
    function svgEl(name, attrs) { var e = document.createElementNS(NS, name); if (attrs) for (var k in attrs) e.setAttribute(k, String(attrs[k])); return e; }
    var ops = opts.ops || [];
    var W = 560, X0 = 70, chipW = W - X0 - 10, chipH = 32, rowH = 42, divH = 48;

    // assign stages: a wide op that isn't the first thing starts a new stage
    var items = [], stageNo = 1, hasOp = false;
    ops.forEach(function (op) {
      if (op.kind === "wide" && hasOp) { items.push({ type: "divider" }); stageNo++; hasOp = false; }
      items.push({ type: "op", op: op, stage: stageNo }); hasOp = true;
    });
    var totalStages = stageNo, totalShuffles = stageNo - 1;

    // layout
    var y = 10, spans = {}, laid = [];
    items.forEach(function (it) {
      if (it.type === "divider") { laid.push({ type: "divider", y: y }); y += divH; }
      else { var s = it.stage; if (!spans[s]) spans[s] = { y0: y }; spans[s].y1 = y + chipH; laid.push({ type: "op", op: it.op, stage: s, y: y }); y += rowH; }
    });
    var H = y + 6;

    var svg = svgEl("svg", { "class": "ss-svg", viewBox: "0 0 " + W + " " + H, width: "100%", role: "img", "aria-label": "Stages and shuffles" });

    // stage brackets (behind)
    Object.keys(spans).forEach(function (s) {
      var sp = spans[s];
      svg.appendChild(svgEl("rect", { "class": "ss-stage", x: 8, y: sp.y0 - 5, width: 54, height: (sp.y1 - sp.y0) + 10, rx: 8 }));
      var cx = 35, cy = (sp.y0 + sp.y1) / 2;
      var t = svgEl("text", { "class": "ss-stage-t", x: cx, y: cy, transform: "rotate(-90 " + cx + " " + cy + ")" }); t.textContent = "STAGE " + s;
      svg.appendChild(t);
    });

    var KIND = { source: "src", narrow: "nar", wide: "wide", action: "act" };
    var KIND_T = { source: "source", narrow: "narrow", wide: "wide · shuffle", action: "action" };
    var opEls = [];

    laid.forEach(function (it) {
      if (it.type === "divider") {
        var dy = it.y + 8;
        svg.appendChild(svgEl("line", { "class": "ss-div-line", x1: X0, y1: dy + 14, x2: W - 10, y2: dy + 14 }));
        var lbl = svgEl("text", { "class": "ss-div-t", x: W - 12, y: dy + 10 }); lbl.textContent = "⇄ shuffle — new stage"; svg.appendChild(lbl);
        // mini all-to-all mesh
        var mx = X0 + 6, top = dy + 4, bot = dy + 24, gap = 26;
        for (var a = 0; a < 3; a++) for (var b = 0; b < 3; b++) svg.appendChild(svgEl("line", { "class": "ss-mesh", x1: mx + a * gap, y1: top, x2: mx + b * gap, y2: bot }));
        for (var d = 0; d < 3; d++) { svg.appendChild(svgEl("circle", { "class": "ss-dot", cx: mx + d * gap, cy: top, r: 3 })); svg.appendChild(svgEl("circle", { "class": "ss-dot", cx: mx + d * gap, cy: bot, r: 3 })); }
        return;
      }
      var op = it.op, ky = KIND[op.kind] || "nar";
      var g = svgEl("g", { "class": "ss-op k-" + ky, tabindex: "0", role: "button" });
      g.appendChild(svgEl("rect", { "class": "ss-box", x: X0, y: it.y, width: chipW, height: chipH, rx: 7 }));
      var t = svgEl("text", { "class": "ss-op-t", x: X0 + 14, y: it.y + chipH / 2 + 1 }); t.textContent = op.t; g.appendChild(t);
      var bw = 96, bx = X0 + chipW - bw - 8;
      g.appendChild(svgEl("rect", { "class": "ss-badge", x: bx, y: it.y + 6, width: bw, height: chipH - 12, rx: 9 }));
      var bt = svgEl("text", { "class": "ss-badge-t", x: bx + bw / 2, y: it.y + chipH / 2 + 1 }); bt.textContent = KIND_T[op.kind] || op.kind; g.appendChild(bt);
      svg.appendChild(g);
      (function (op) {
        function hi() { if (tracing) return; status.innerHTML = "<b>" + esc(op.t) + "</b> — " + esc(op.note || ""); }
        function out() { if (tracing) return; status.innerHTML = defaultStatus; }
        g.addEventListener("mouseenter", hi); g.addEventListener("focus", hi);
        g.addEventListener("mouseleave", out); g.addEventListener("blur", out);
      })(op);
      opEls.push({ g: g, op: op });
    });

    var wrap = elh("div", "viz viz-ss");
    wrap.appendChild(svg);
    var defaultStatus = "Hover an op to see if it shuffles. Narrow ops fuse into <b>one stage</b>; every shuffle starts a new one — this job is <b>" + totalStages + " stage" + (totalStages > 1 ? "s" : "") + "</b> (" + totalShuffles + " shuffle" + (totalShuffles === 1 ? "" : "s") + ").";
    var status = elh("div", "viz-hint ss-status", defaultStatus);

    var controls = elh("div", "viz-controls");
    var runBtn = elh("button", "viz-btn", "▶ Run the job");
    var resetBtn = elh("button", "viz-btn ghost", "↻ Reset");
    controls.appendChild(runBtn); controls.appendChild(resetBtn);
    wrap.appendChild(controls); wrap.appendChild(status);

    var tracing = false, ti = 0, timer = null;
    function step() {
      if (ti >= opEls.length) { stop(); opEls.forEach(function (o) { o.g.classList.remove("on", "dim"); }); status.innerHTML = "Done — <b>" + totalStages + " stages</b>, split at each of the " + totalShuffles + " shuffle" + (totalShuffles === 1 ? "" : "s") + "."; return; }
      var cur = opEls[ti];
      opEls.forEach(function (o, i) { o.g.classList.toggle("on", i === ti); o.g.classList.toggle("dim", i !== ti); });
      status.innerHTML = (cur.op.kind === "wide" ? "⇄ <b>Shuffle</b> — " : "") + "<b>" + esc(cur.op.t) + "</b> — " + esc(cur.op.note || "");
      ti++; timer = setTimeout(step, 1300);
    }
    function stop() { tracing = false; if (timer) { clearTimeout(timer); timer = null; } runBtn.textContent = "▶ Run the job"; }
    runBtn.addEventListener("click", function () { if (tracing) { stop(); return; } tracing = true; ti = 0; runBtn.textContent = "⏸ Pause"; step(); });
    resetBtn.addEventListener("click", function () { stop(); opEls.forEach(function (o) { o.g.classList.remove("on", "dim"); }); status.innerHTML = defaultStatus; });

    return wrap;
  }

  // ---- Window frame: partitionBy → orderBy → the frame that slides ----------
  // A table split into partitions (colour bands), ordered within each. Pick a
  // frame type and step the "current row" — the frame bracket slides and the
  // result column recomputes, never crossing a partition boundary.
  // opts: { rows:[{part,ord,val}], partLabel, ordLabel, valLabel, frames:[{key,label,desc,start,end}] }
  //   start/end: "unboundedPreceding" | "currentRow" | "unboundedFollowing" | integer offset
  function windowFrame(opts) {
    function esc(s) { return String(s == null ? "" : s).replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); }
    var NS = "http://www.w3.org/2000/svg";
    function svgEl(name, attrs) { var e = document.createElementNS(NS, name); if (attrs) for (var k in attrs) e.setAttribute(k, String(attrs[k])); return e; }
    var rows = opts.rows || [];
    var frames = opts.frames || [];
    var partLabel = opts.partLabel || "part", ordLabel = opts.ordLabel || "order", valLabel = opts.valLabel || "value";
    var fi = 0, cur = 0;

    // partition index bounds for each row
    var partOf = rows.map(function (r) { return r.part; });
    function partRange(i) {
      var p = partOf[i], lo = i, hi = i;
      while (lo - 1 >= 0 && partOf[lo - 1] === p) lo--;
      while (hi + 1 < rows.length && partOf[hi + 1] === p) hi++;
      return [lo, hi];
    }
    function frameBounds(i, f) {
      var pr = partRange(i), lo, hi;
      lo = (f.start === "unboundedPreceding") ? pr[0] : (f.start === "currentRow" ? i : Math.max(pr[0], i + (f.start | 0)));
      hi = (f.end === "unboundedFollowing") ? pr[1] : (f.end === "currentRow" ? i : Math.min(pr[1], i + (f.end | 0)));
      lo = Math.max(pr[0], lo); hi = Math.min(pr[1], hi);
      return [lo, hi];
    }
    function frameSum(i, f) { var b = frameBounds(i, f), s = 0; for (var k = b[0]; k <= b[1]; k++) s += rows[k].val; return s; }

    var W = 560, colP = 20, colO = 210, colV = 350, colR = 476;
    var top = 40, rH = 34, X = 8, tableW = W - 16;
    var H = top + rows.length * rH + 8;
    var svg = svgEl("svg", { "class": "wf-svg", viewBox: "0 0 " + W + " " + H, width: "100%", role: "img", "aria-label": "Window frame" });

    // header
    var hdr = [[colP, partLabel + " (partitionBy)"], [colO, ordLabel + " (orderBy)"], [colV, valLabel], [colR, "→ result"]];
    hdr.forEach(function (h) { var t = svgEl("text", { "class": "wf-h", x: h[0], y: 24 }); t.textContent = h[1]; svg.appendChild(t); });
    svg.appendChild(svgEl("line", { "class": "wf-hr", x1: X, y1: 32, x2: W - X, y2: 32 }));

    var rowEls = [];
    function rowY(i) { return top + i * rH; }

    // partition band backgrounds (alternating tint per partition run)
    var runStart = 0, bandIdx = 0;
    for (var i2 = 0; i2 <= rows.length; i2++) {
      if (i2 === rows.length || partOf[i2] !== partOf[runStart]) {
        svg.appendChild(svgEl("rect", { "class": "wf-band p" + (bandIdx % 2), x: X, y: rowY(runStart), width: tableW, height: rowY(i2) - rowY(runStart), rx: 6 }));
        bandIdx++; runStart = i2;
      }
    }

    // frame bracket (drawn/updated on render)
    var bracket = svgEl("rect", { "class": "wf-bracket", x: X + 2, y: 0, width: tableW - 4, height: 0, rx: 6, opacity: 0 });
    svg.appendChild(bracket);

    // rows
    rows.forEach(function (r, i) {
      var y = rowY(i);
      var g = svgEl("g", { "class": "wf-row", tabindex: "0", role: "button" });
      var cells = [[colP, r.part], [colO, r.ord], [colV, String(r.val)]];
      cells.forEach(function (c) { var t = svgEl("text", { "class": "wf-cell", x: c[0], y: y + rH / 2 + 4 }); t.textContent = c[1]; g.appendChild(t); });
      var res = svgEl("text", { "class": "wf-res", x: colR, y: y + rH / 2 + 4 }); res.textContent = ""; g.appendChild(res);
      // hit area
      g.insertBefore(svgEl("rect", { "class": "wf-hit", x: X, y: y, width: tableW, height: rH, rx: 5 }), g.firstChild);
      svg.appendChild(g);
      (function (idx) { g.addEventListener("click", function () { cur = idx; render(); }); g.addEventListener("focus", function () { cur = idx; render(); }); })(i);
      rowEls.push({ g: g, res: res });
    });

    var wrap = elh("div", "viz viz-wf");
    // frame toggle
    var fRow = elh("div", "wf-frames");
    var fBtns = [];
    frames.forEach(function (f, idx) {
      var b = elh("button", "wf-fbtn" + (idx === 0 ? " active" : ""), esc(f.label));
      b.addEventListener("click", function () { fi = idx; fBtns.forEach(function (x) { x.classList.remove("active"); }); b.classList.add("active"); render(); });
      fRow.appendChild(b); fBtns.push(b);
    });
    wrap.appendChild(fRow);
    wrap.appendChild(svg);

    var status = elh("div", "viz-hint wf-status", "");
    var controls = elh("div", "viz-controls");
    var prevB = elh("button", "viz-btn ghost", "‹ Prev row");
    var runB = elh("button", "viz-btn", "▶ Slide the frame");
    var nextB = elh("button", "viz-btn ghost", "Next row ›");
    controls.appendChild(prevB); controls.appendChild(runB); controls.appendChild(nextB);
    wrap.appendChild(controls); wrap.appendChild(status);

    function render() {
      var f = frames[fi];
      // fill result column for every row under this frame
      rowEls.forEach(function (re, i) { re.res.textContent = String(frameSum(i, f)); re.g.classList.toggle("cur", i === cur); });
      // frame bracket over current row's frame
      var b = frameBounds(cur, f);
      var y0 = rowY(b[0]), y1 = rowY(b[1]) + rH;
      bracket.setAttribute("y", y0 + 1); bracket.setAttribute("height", (y1 - y0) - 2); bracket.setAttribute("opacity", 1);
      rowEls.forEach(function (re, i) { re.g.classList.toggle("inframe", i >= b[0] && i <= b[1]); });
      var pr = partRange(cur);
      status.innerHTML = "<b>" + esc(f.label) + "</b> — " + esc(f.desc) + "<br>current row: <b>" + esc(rows[cur].part) + " / " + esc(rows[cur].ord) + "</b> · frame covers rows " + (b[0] - pr[0] + 1) + "–" + (b[1] - pr[0] + 1) + " of this partition · <b>" + valLabel + " = " + frameSum(cur, f) + "</b>";
    }

    var tracing = false, timer = null;
    function stop() { tracing = false; if (timer) { clearTimeout(timer); timer = null; } runB.textContent = "▶ Slide the frame"; }
    function tick() { cur = (cur + 1) % rows.length; render(); if (cur === rows.length - 1) { timer = setTimeout(stop, 1100); } else timer = setTimeout(tick, 1100); }
    prevB.addEventListener("click", function () { stop(); cur = (cur - 1 + rows.length) % rows.length; render(); });
    nextB.addEventListener("click", function () { stop(); cur = (cur + 1) % rows.length; render(); });
    runB.addEventListener("click", function () { if (tracing) { stop(); return; } tracing = true; runB.textContent = "⏸ Pause"; cur = 0; render(); timer = setTimeout(tick, 1100); });

    render();
    return wrap;
  }

  // small shared SVG arrow (line + triangle head), coloured by parent class
  function svgArrow(NS, x1, y1, x2, y2, cls) {
    function e(name, a) { var el = document.createElementNS(NS, name); for (var k in a) el.setAttribute(k, String(a[k])); return el; }
    var g = e("g", { "class": cls });
    g.appendChild(e("line", { "class": "ar-line", x1: x1, y1: y1, x2: x2, y2: y2 }));
    var ang = Math.atan2(y2 - y1, x2 - x1), s = 7;
    g.appendChild(e("polygon", { "class": "ar-head", points: x2 + "," + y2 + " " +
      (x2 - s * Math.cos(ang - 0.5)) + "," + (y2 - s * Math.sin(ang - 0.5)) + " " +
      (x2 - s * Math.cos(ang + 0.5)) + "," + (y2 - s * Math.sin(ang + 0.5)) }));
    return g;
  }

  // ---- Join strategy: Broadcast Hash Join vs Sort-Merge Join ----------------
  // Drag the small table's size. Under the threshold Spark broadcasts it to
  // every executor (the big fact never shuffles); over it, both sides shuffle
  // by key and sort-merge. The size slider FLIPS the strategy at the threshold
  // — that's the whole lesson made physical.
  // opts: { threshold, big, bigSize, small, executors, maxSize, startSize }
  function joinStrategy(opts) {
    function esc(s) { return String(s == null ? "" : s).replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); }
    var NS = "http://www.w3.org/2000/svg";
    function E(name, a) { var el = document.createElementNS(NS, name); if (a) for (var k in a) el.setAttribute(k, String(a[k])); return el; }
    var TH = opts.threshold || 10, MAX = opts.maxSize || 64;
    var big = opts.big || "orders", bigSize = opts.bigSize || "500 MB", small = opts.small || "customers", NE = opts.executors || 3;
    var size = opts.startSize || 6;

    var W = 560, H = 292;
    var svg = E("svg", { "class": "js-svg", viewBox: "0 0 " + W + " " + H, width: "100%", role: "img", "aria-label": "Join strategy" });

    // table cards
    var bcX = 16, cardY = 8, cardW = 210, cardH = 48, smX = W - cardW - 16;
    var bigCard = E("g", { "class": "js-card js-big" });
    bigCard.appendChild(E("rect", { "class": "js-card-box", x: bcX, y: cardY, width: cardW, height: cardH, rx: 8 }));
    var bt1 = E("text", { "class": "js-card-t", x: bcX + 14, y: cardY + 20 }); bt1.textContent = big + " · " + bigSize; bigCard.appendChild(bt1);
    var bigTag = E("text", { "class": "js-card-tag", x: bcX + 14, y: cardY + 38 }); bigCard.appendChild(bigTag);
    var smallCard = E("g", { "class": "js-card js-small" });
    smallCard.appendChild(E("rect", { "class": "js-card-box", x: smX, y: cardY, width: cardW, height: cardH, rx: 8 }));
    var st1 = E("text", { "class": "js-card-t", x: smX + 14, y: cardY + 20 }); smallCard.appendChild(st1);
    // size bar inside small card
    smallCard.appendChild(E("rect", { "class": "js-size-track", x: smX + 14, y: cardY + 30, width: cardW - 28, height: 8, rx: 4 }));
    var sizeFill = E("rect", { "class": "js-size-fill", x: smX + 14, y: cardY + 30, width: 10, height: 8, rx: 4 }); smallCard.appendChild(sizeFill);

    // executors
    var exW = 150, exH = 66, exY = 176, gap = (W - NE * exW) / (NE + 1), execXs = [];
    var execG = E("g", {});
    var execLabels = [];
    for (var i = 0; i < NE; i++) {
      var ex = gap + i * (exW + gap); execXs.push(ex);
      var g = E("g", { "class": "js-exec" });
      g.appendChild(E("rect", { "class": "js-exec-box", x: ex, y: exY, width: exW, height: exH, rx: 8 }));
      var el = E("text", { "class": "js-exec-t", x: ex + 10, y: exY + 16 }); el.textContent = "Executor " + (i + 1); g.appendChild(el);
      g.appendChild(E("rect", { "class": "js-chip big", x: ex + 10, y: exY + 24, width: exW - 20, height: 16, rx: 4 }));
      var ct = E("text", { "class": "js-chip-t", x: ex + 16, y: exY + 36 }); ct.textContent = big + " p" + i + " (resident)"; g.appendChild(ct);
      var mode = E("text", { "class": "js-exec-mode", x: ex + exW / 2, y: exY + 55 }); g.appendChild(mode);
      execG.appendChild(g); execLabels.push(mode);
    }

    // arrow groups
    var arrows = E("g", {});
    var bcast = E("g", { "class": "js-arrow bcast" });
    execXs.forEach(function (ex) { bcast.appendChild(svgArrow(NS, smX + cardW / 2, cardY + cardH, ex + exW / 2, exY)); });
    var shufS = E("g", { "class": "js-arrow shuf" });
    var shufB = E("g", { "class": "js-arrow shuf" });
    execXs.forEach(function (ex) {
      shufS.appendChild(svgArrow(NS, smX + cardW / 2, cardY + cardH, ex + exW / 2, exY));
      shufB.appendChild(svgArrow(NS, bcX + cardW / 2, cardY + cardH, ex + exW / 2, exY));
    });
    arrows.appendChild(bcast); arrows.appendChild(shufS); arrows.appendChild(shufB);

    svg.appendChild(arrows); svg.appendChild(bigCard); svg.appendChild(smallCard); svg.appendChild(execG);

    var wrap = elh("div", "viz viz-js");
    // slider row
    var sRow = elh("div", "viz-range-row");
    sRow.appendChild(elh("span", "viz-range-lbl", small + " size:"));
    var slider = document.createElement("input");
    slider.type = "range"; slider.min = "1"; slider.max = String(MAX); slider.value = String(size); slider.className = "viz-range";
    var sVal = elh("span", "viz-range-val", size + " MB");
    sRow.appendChild(slider); sRow.appendChild(sVal);
    wrap.appendChild(sRow);
    wrap.appendChild(svg);
    var status = elh("div", "viz-hint js-status", "");
    wrap.appendChild(status);

    function render() {
      var bcastMode = size <= TH;
      st1.textContent = small + " · " + size + " MB";
      sizeFill.setAttribute("width", Math.max(6, (cardW - 28) * size / MAX));
      svg.setAttribute("data-mode", bcastMode ? "bcast" : "smj");
      bigTag.textContent = bcastMode ? "stays put — no shuffle ✓" : "shuffled by key ⇄";
      bcast.classList.toggle("show", bcastMode);
      shufS.classList.toggle("show", !bcastMode);
      shufB.classList.toggle("show", !bcastMode);
      execLabels.forEach(function (m) { m.textContent = bcastMode ? "hash join (local)" : "sort + merge"; });
      status.innerHTML = bcastMode
        ? "<b>BroadcastHashJoin</b> — " + small + " (" + size + " MB) ≤ " + TH + " MB, so Spark copies it to <b>every executor</b>; " + big + " is never shuffled. Fast: one exchange of a tiny table."
        : "<b>SortMergeJoin</b> — " + small + " (" + size + " MB) &gt; " + TH + " MB, so <b>both sides shuffle</b> by key and sort before merging. Two large exchanges. Tip: filter/project first, or force it with <code>F.broadcast(" + small + ")</code>.";
    }
    slider.addEventListener("input", function () { size = parseInt(slider.value, 10); sVal.textContent = size + " MB"; render(); });
    render();
    return wrap;
  }

  // ---- Data skew & salting: one hot key drags the whole stage --------------
  // Bars = rows per partition. With no salt, the hot key piles into one giant
  // partition (a straggler task); drag the salt factor and its rows split
  // across N partitions, dropping the slowest task and balancing the load.
  // opts: { partitions, base:[...], hot, hotPartition, hotKey, maxSalt }
  function dataSkew(opts) {
    function esc(s) { return String(s == null ? "" : s).replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); }
    var NS = "http://www.w3.org/2000/svg";
    function E(name, a) { var el = document.createElementNS(NS, name); if (a) for (var k in a) el.setAttribute(k, String(a[k])); return el; }
    var P = opts.partitions || 6;
    var base = opts.base || [6, 7, 6, 8, 7, 6];
    var HOT = opts.hot || 48, hotP = opts.hotPartition || 2, hotKey = opts.hotKey || "US", MAXS = opts.maxSalt || 8;
    var salt = 1;

    function heights(k) {
      var h = base.slice(0, P);
      var hotRows = h.map(function () { return 0; });
      // split HOT into k salted sub-keys, round-robin to k distinct partitions
      for (var j = 0; j < k; j++) {
        var per = Math.floor(HOT / k) + (j < (HOT % k) ? 1 : 0);
        var p = (hotP + j) % P;
        hotRows[p] += per;
      }
      var total = h.map(function (v, i) { return v + hotRows[i]; });
      return { total: total, hot: hotRows };
    }

    var W = 560, H = 250, base0 = 196, left = 44, right = W - 16;
    var bw = (right - left) / P, barW = bw * 0.62;
    var yMax = 176, scaleMaxRows = Math.max.apply(null, base) + HOT; // fixed scale
    function yFor(v) { return base0 - (v / scaleMaxRows) * yMax; }

    var svg = E("svg", { "class": "sk-svg", viewBox: "0 0 " + W + " " + H, width: "100%", role: "img", "aria-label": "Data skew" });
    // axis
    svg.appendChild(E("line", { "class": "sk-axis", x1: left - 6, y1: base0, x2: right, y2: base0 }));
    var yLbl = E("text", { "class": "sk-ylbl", x: 6, y: 20 }); yLbl.textContent = "rows/partition"; svg.appendChild(yLbl);

    // slowest-task line + label
    var slowLine = E("line", { "class": "sk-slow", x1: left - 6, y1: 0, x2: right, y2: 0 });
    var slowLbl = E("text", { "class": "sk-slow-t", x: right, y: 0 });
    svg.appendChild(slowLine); svg.appendChild(slowLbl);

    // bars: base part + hot part stacked
    var bars = [];
    for (var i = 0; i < P; i++) {
      var bx = left + i * bw + (bw - barW) / 2;
      var g = E("g", {});
      var rBase = E("rect", { "class": "sk-bar-base", x: bx, y: base0, width: barW, height: 0, rx: 3 });
      var rHot = E("rect", { "class": "sk-bar-hot", x: bx, y: base0, width: barW, height: 0, rx: 3 });
      var top = E("text", { "class": "sk-bar-t", x: bx + barW / 2, y: base0 - 4 });
      var plab = E("text", { "class": "sk-plab", x: bx + barW / 2, y: base0 + 16 }); plab.textContent = "p" + i;
      g.appendChild(rBase); g.appendChild(rHot); g.appendChild(top); g.appendChild(plab);
      svg.appendChild(g);
      bars.push({ base: rBase, hot: rHot, top: top, x: bx });
    }

    var wrap = elh("div", "viz viz-sk");
    var sRow = elh("div", "viz-range-row");
    sRow.appendChild(elh("span", "viz-range-lbl", "salt factor:"));
    var slider = document.createElement("input");
    slider.type = "range"; slider.min = "1"; slider.max = String(MAXS); slider.value = "1"; slider.className = "viz-range";
    var sVal = elh("span", "viz-range-val", "×1 (no salt)");
    sRow.appendChild(slider); sRow.appendChild(sVal);
    wrap.appendChild(sRow);
    wrap.appendChild(svg);
    var status = elh("div", "viz-hint sk-status", "");
    wrap.appendChild(status);

    function render() {
      var r = heights(salt), tot = r.total, hot = r.hot;
      var max = Math.max.apply(null, tot), maxIdx = tot.indexOf(max);
      for (var i = 0; i < P; i++) {
        var b = bars[i], baseH = base0 - yFor(base[i]), hotH = (base0 - yFor(tot[i])) - baseH;
        b.base.setAttribute("y", yFor(base[i])); b.base.setAttribute("height", Math.max(0, baseH));
        b.hot.setAttribute("y", yFor(tot[i])); b.hot.setAttribute("height", Math.max(0, hotH));
        b.hot.setAttribute("x", b.x);
        b.top.setAttribute("y", yFor(tot[i]) - 4); b.top.textContent = tot[i];
        b.top.classList.toggle("hotmax", i === maxIdx);
      }
      var sy = yFor(max);
      slowLine.setAttribute("y1", sy); slowLine.setAttribute("y2", sy);
      slowLbl.setAttribute("y", sy - 5); slowLbl.textContent = "slowest task ≈ " + max + " rows";
      sVal.textContent = salt === 1 ? "×1 (no salt)" : "×" + salt;
      status.innerHTML = salt === 1
        ? "<b>Skew.</b> Every '" + esc(hotKey) + "' row hashes to the same partition (p" + hotP + " = <b>" + max + " rows</b>) while the rest hold ~" + base[0] + ". The stage can't finish until that one straggler task does — parallelism wasted."
        : "<b>Salted ×" + salt + ".</b> '" + esc(hotKey) + "' is split into " + salt + " sub-keys (" + esc(hotKey) + "_0…" + esc(hotKey) + "_" + (salt - 1) + ") that spread across partitions — slowest task down to <b>" + max + " rows</b>. Combine the partial results in a second step.";
    }
    slider.addEventListener("input", function () { salt = parseInt(slider.value, 10); render(); });
    render();
    return wrap;
  }

  // ---- memorySpill: executor heap regions + spill-to-disk vs OOM -----------
  // Drag the working-set a task must hold. A spill-friendly workload (sort /
  // shuffle / aggregate) spills sorted runs to disk once it passes the execution
  // ceiling — slow but safe. A "must hold whole" workload (a skewed groupBy key,
  // collect(), a giant explode) can't spill a single group, so it OOMs the moment
  // it exceeds the ceiling. That contrast is the whole "why did my job die" answer.
  // opts: { heapGB, reservedGB, execGB, userGB, maxGB }
  function memorySpill(opts) {
    function esc(s) { return String(s == null ? "" : s).replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); }
    var NS = "http://www.w3.org/2000/svg";
    function E(name, a) { var el = document.createElementNS(NS, name); if (a) for (var k in a) el.setAttribute(k, String(a[k])); return el; }
    var HEAP = opts.heapGB || 4, RES = opts.reservedGB || 0.3, EXEC = opts.execGB || 2.2, USER = opts.userGB || 1.5;
    var MAXG = opts.maxGB || 6;
    var demand = 1.2, mode = "spill";

    var W = 560, H = 274, base0 = 232, vH = 196;
    function yFor(gb) { return base0 - (gb / MAXG) * vH; }
    var svg = E("svg", { "class": "ms-svg", viewBox: "0 0 " + W + " " + H, width: "100%", role: "img", "aria-label": "Executor memory, spill and OOM" });

    // ---- heap column (static reference diagram) ----
    var hx = 46, hw = 92;
    function band(gb0, gb1, cls, label, sub) {
      var y = yFor(gb1), h = yFor(gb0) - yFor(gb1);
      var g = E("g", {});
      g.appendChild(E("rect", { "class": "ms-band " + cls, x: hx, y: y, width: hw, height: Math.max(0, h), rx: 3 }));
      var t = E("text", { "class": "ms-band-t", x: hx + hw / 2, y: y + h / 2 + 3 }); t.textContent = label; g.appendChild(t);
      if (sub) { var s = E("text", { "class": "ms-band-s", x: hx + hw / 2, y: y + h / 2 + 15 }); s.textContent = sub; g.appendChild(s); }
      svg.appendChild(g);
    }
    band(0, RES, "ms-res", "Reserved", RES + " GB");
    band(RES, RES + EXEC, "ms-exec", "Execution", EXEC + " GB");
    band(RES + EXEC, RES + EXEC + USER, "ms-user", "User", USER + " GB");
    var hcap = E("text", { "class": "ms-cap", x: hx + hw / 2, y: yFor(HEAP) - 8 }); hcap.textContent = HEAP + " GB heap"; svg.appendChild(hcap);

    // ---- demand column (interactive) ----
    var dx = 214, dw = 84;
    var ceil = EXEC; // execution memory available to the task
    var cy = yFor(ceil);
    var dGreen = E("rect", { "class": "ms-d-green", x: dx, y: base0, width: dw, height: 0, rx: 3 });
    var dOver = E("rect", { "class": "ms-d-over", x: dx, y: base0, width: dw, height: 0, rx: 3 });
    svg.appendChild(dGreen); svg.appendChild(dOver);
    var dTop = E("text", { "class": "ms-d-top", x: dx + dw / 2, y: base0 }); svg.appendChild(dTop);
    var dLbl = E("text", { "class": "ms-axis", x: dx + dw / 2, y: base0 + 16 }); dLbl.textContent = "task working set"; svg.appendChild(dLbl);
    // execution ceiling line across the demand + disk area
    var cLine = E("line", { "class": "ms-ceil", x1: dx - 10, y1: cy, x2: 356, y2: cy });
    var cTxt = E("text", { "class": "ms-ceil-t", x: 354, y: cy - 6 }); cTxt.textContent = "execution limit ≈ " + EXEC + " GB";
    svg.appendChild(cLine); svg.appendChild(cTxt);

    // ---- disk box (fills with spill) ----
    var kx = 372, kw = 150, kTop = base0 - 64, kH = 64;
    svg.appendChild(E("rect", { "class": "ms-disk-box", x: kx, y: kTop, width: kw, height: kH, rx: 5 }));
    var dFill = E("rect", { "class": "ms-disk-fill", x: kx, y: kTop + kH, width: kw, height: 0 });
    svg.appendChild(dFill);
    var dkT = E("text", { "class": "ms-disk-t", x: kx + kw / 2, y: kTop - 8 }); dkT.textContent = "local disk"; svg.appendChild(dkT);
    var dkS = E("text", { "class": "ms-disk-s", x: kx + kw / 2, y: kTop + kH / 2 + 4 }); svg.appendChild(dkS);

    var wrap = elh("div", "viz viz-ms");
    // workload toggle
    var seg = elh("div", "viz-seg");
    var bSpill = elh("button", "viz-seg-btn on", "Spillable op (sort / shuffle / agg)");
    var bHold = elh("button", "viz-seg-btn", "Must hold whole (skew / collect)");
    seg.appendChild(bSpill); seg.appendChild(bHold); wrap.appendChild(seg);
    // slider
    var sRow = elh("div", "viz-range-row");
    sRow.appendChild(elh("span", "viz-range-lbl", "working set:"));
    var slider = document.createElement("input");
    slider.type = "range"; slider.min = "4"; slider.max = String(MAXG * 10); slider.value = "12"; slider.className = "viz-range";
    var sVal = elh("span", "viz-range-val", "1.2 GB");
    sRow.appendChild(slider); sRow.appendChild(sVal); wrap.appendChild(sRow);
    wrap.appendChild(svg);
    var status = elh("div", "viz-hint ms-status", "");
    wrap.appendChild(status);

    function render() {
      sVal.textContent = demand.toFixed(1) + " GB";
      var inMem = Math.min(demand, ceil), over = Math.max(0, demand - ceil);
      var oom = (mode === "hold" && over > 0.001);
      // green (in-memory) portion
      dGreen.setAttribute("y", yFor(inMem)); dGreen.setAttribute("height", Math.max(0, base0 - yFor(inMem)));
      dGreen.setAttribute("class", oom ? "ms-d-green ms-dim" : "ms-d-green");
      // over portion (spill = yellow, oom = red)
      dOver.setAttribute("y", yFor(demand)); dOver.setAttribute("height", Math.max(0, yFor(inMem) - yFor(demand)));
      dOver.setAttribute("class", over > 0.001 ? (oom ? "ms-d-oom" : "ms-d-spill") : "ms-d-none");
      dTop.setAttribute("y", yFor(demand) - 5);
      dTop.textContent = oom ? "OOM ✗" : demand.toFixed(1) + " GB";
      dTop.setAttribute("class", oom ? "ms-d-top ms-oomtxt" : (over > 0.001 ? "ms-d-top ms-spilltxt" : "ms-d-top"));
      // disk fill (only when spilling)
      var spillGB = (!oom && over > 0.001) ? over : 0;
      var fillH = Math.min(kH, (spillGB / (MAXG - ceil)) * kH);
      dFill.setAttribute("y", kTop + kH - fillH); dFill.setAttribute("height", fillH);
      dkS.textContent = spillGB > 0.001 ? ("spilled " + spillGB.toFixed(1) + " GB") : (oom ? "—" : "no spill");
      dkS.setAttribute("class", oom ? "ms-disk-s ms-dim" : "ms-disk-s");

      if (over <= 0.001) {
        status.innerHTML = "<b>In memory.</b> The task's working set (" + demand.toFixed(1) + " GB) fits under the execution limit — processed at full speed, no disk I/O.";
      } else if (!oom) {
        status.innerHTML = "<b>Spilling to disk.</b> A sort/shuffle/aggregate spills sorted runs past " + EXEC + " GB and merges them — the job <b>survives</b> but pays " + spillGB.toFixed(1) + " GB of write-then-reread. Fix: more partitions (smaller each), or more executor memory.";
      } else {
        status.innerHTML = "<b>OutOfMemoryError.</b> This workload must hold a single unit whole — a skewed groupBy key, <code>collect()</code>, a giant <code>explode</code> — so it <b>can't spill</b>. Past the execution limit the executor dies. Fix: salt the skewed key, avoid <code>collect()</code>, raise partitions, or size up the executor.";
      }
    }
    function setMode(m) { mode = m; bSpill.classList.toggle("on", m === "spill"); bHold.classList.toggle("on", m === "hold"); render(); }
    slider.addEventListener("input", function () { demand = parseInt(slider.value, 10) / 10; render(); });
    bSpill.addEventListener("click", function () { setMode("spill"); });
    bHold.addEventListener("click", function () { setMode("hold"); });
    render();
    return wrap;
  }

  // ---- partitionOps: repartition vs coalesce vs partitionBy ----------------
  // Toggle the three most-confused partition operations against the SAME uneven
  // input. repartition = full shuffle to even sizes; coalesce = local merge, no
  // shuffle, stays uneven, reduce-only; partitionBy = an on-disk directory layout,
  // a different thing entirely. opts: { input:[...], keys:[...] }
  function partitionOps(opts) {
    function esc(s) { return String(s == null ? "" : s).replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); }
    var NS = "http://www.w3.org/2000/svg";
    function E(name, a) { var el = document.createElementNS(NS, name); if (a) for (var k in a) el.setAttribute(k, String(a[k])); return el; }
    var input = opts.input || [10, 2, 8, 3, 9, 4];
    var keys = opts.keys || ["US", "IN", "UK"];
    var total = input.reduce(function (a, b) { return a + b; }, 0);
    var op = "repartition";

    var W = 560, H = 300;
    var svg = E("svg", { "class": "po-svg", viewBox: "0 0 " + W + " " + H, width: "100%", role: "img", "aria-label": "repartition vs coalesce vs partitionBy" });
    var maxV = Math.max.apply(null, input) + 4;
    var colY = 66, colH = 150, barMaxH = 120;
    function barH(v) { return (v / maxV) * barMaxH; }

    var leftX = 24, rightX = 312, slotW = 44, gap = 10;
    function drawSet(x0, vals, cls, labelPrefix) {
      var nodes = [];
      for (var i = 0; i < vals.length; i++) {
        var bx = x0 + i * (slotW + gap);
        var v = vals[i], h = barH(v), y = colY + colH - h;
        var g = E("g", {});
        g.appendChild(E("rect", { "class": "po-slot", x: bx, y: colY, width: slotW, height: colH, rx: 4 }));
        g.appendChild(E("rect", { "class": "po-bar " + cls, x: bx + 4, y: y, width: slotW - 8, height: Math.max(2, h), rx: 3 }));
        var t = E("text", { "class": "po-bar-t", x: bx + slotW / 2, y: y - 4 }); t.textContent = v; g.appendChild(t);
        var pl = E("text", { "class": "po-plab", x: bx + slotW / 2, y: colY + colH + 15 }); pl.textContent = (labelPrefix || "p") + i; g.appendChild(pl);
        svg.appendChild(g);
        nodes.push({ x: bx + slotW / 2, topY: y, botY: colY + colH });
      }
      return nodes;
    }
    var headL = E("text", { "class": "po-head", x: leftX, y: 40 }); headL.textContent = "input: 6 uneven partitions (" + total + " rows)"; svg.appendChild(headL);
    var headR = E("text", { "class": "po-head", x: rightX, y: 40 });
    var arrowLayer = E("g", {}); svg.appendChild(arrowLayer);
    var inNodes = drawSet(leftX, input, "po-in", "p");
    var outLayer = E("g", {}); svg.appendChild(outLayer);

    var wrap = elh("div", "viz viz-po");
    var seg = elh("div", "viz-seg");
    var bR = elh("button", "viz-seg-btn on", "repartition(3)");
    var bC = elh("button", "viz-seg-btn", "coalesce(3)");
    var bP = elh("button", "viz-seg-btn", "partitionBy('country')");
    seg.appendChild(bR); seg.appendChild(bC); seg.appendChild(bP); wrap.appendChild(seg);
    wrap.appendChild(svg);
    var status = elh("div", "viz-hint po-status", ""); wrap.appendChild(status);

    function clear(layer) { while (layer.firstChild) layer.removeChild(layer.firstChild); }
    function arrow(x1, y1, x2, y2, cls) {
      var g = E("g", {});
      g.appendChild(E("line", { "class": "po-arr " + (cls || ""), x1: x1, y1: y1, x2: x2, y2: y2 }));
      return g;
    }

    function render() {
      clear(outLayer); clear(arrowLayer);
      bR.classList.toggle("on", op === "repartition");
      bC.classList.toggle("on", op === "coalesce");
      bP.classList.toggle("on", op === "partitionBy");

      if (op === "repartition") {
        headR.textContent = "3 partitions, balanced";
        var each = Math.round(total / 3), out = [each, each, total - 2 * each];
        var outNodes = drawSetInto(outLayer, rightX, out, "po-rep", "p");
        // full shuffle: every input feeds every output
        for (var i = 0; i < inNodes.length; i++) for (var j = 0; j < outNodes.length; j++)
          arrowLayer.appendChild(arrow(inNodes[i].x, inNodes[i].botY + 4, outNodes[j].x, outNodes[j].topY - 4, "po-shuf"));
        status.innerHTML = "<b>repartition(3) — full shuffle.</b> Every input partition sends rows to every output partition across the network, landing 3 <b>evenly balanced</b> partitions. Use it to fix skew or to <i>increase</i> parallelism. Cost: a full shuffle.";
      } else if (op === "coalesce") {
        headR.textContent = "3 partitions, merged (uneven)";
        var out2 = [input[0] + input[1], input[2] + input[3], input[4] + input[5]];
        var outNodes2 = drawSetInto(outLayer, rightX, out2, "po-coal", "p");
        // local merge: adjacent pairs, no crossing
        var pairs = [[0, 1], [2, 3], [4, 5]];
        for (var p = 0; p < pairs.length; p++) for (var q = 0; q < pairs[p].length; q++)
          arrowLayer.appendChild(arrow(inNodes[pairs[p][q]].x, inNodes[pairs[p][q]].botY + 4, outNodes2[p].x, outNodes2[p].topY - 4, "po-merge"));
        status.innerHTML = "<b>coalesce(3) — no shuffle.</b> Adjacent partitions are merged locally on the executor that already holds them, so there's no network movement — cheap. But sizes stay <b>uneven</b>, and it can only <i>reduce</i> the partition count, never raise it.";
      } else {
        headR.textContent = "on-disk: one directory per key";
        drawFolders(outLayer, rightX);
        status.innerHTML = "<b>partitionBy('country') — a disk layout, not an in-memory repartition.</b> On <code>write</code>, Spark lays down one directory per key value (<code>country=US/…</code>) so a later filter on <code>country</code> reads only that folder (<b>partition pruning</b>). Watch out: a high-cardinality key makes a flood of tiny files.";
      }
    }
    function drawSetInto(layer, x0, vals, cls, prefix) {
      var nodes = [];
      for (var i = 0; i < vals.length; i++) {
        var bx = x0 + i * (slotW + gap), v = vals[i], h = barH(v), y = colY + colH - h;
        var g = E("g", {});
        g.appendChild(E("rect", { "class": "po-slot", x: bx, y: colY, width: slotW, height: colH, rx: 4 }));
        g.appendChild(E("rect", { "class": "po-bar " + cls, x: bx + 4, y: y, width: slotW - 8, height: Math.max(2, h), rx: 3 }));
        var t = E("text", { "class": "po-bar-t", x: bx + slotW / 2, y: y - 4 }); t.textContent = v; g.appendChild(t);
        var pl = E("text", { "class": "po-plab", x: bx + slotW / 2, y: colY + colH + 15 }); pl.textContent = (prefix || "p") + i; g.appendChild(pl);
        layer.appendChild(g);
        nodes.push({ x: bx + slotW / 2, topY: y, botY: colY + colH });
      }
      return nodes;
    }
    function drawFolders(layer, x0) {
      var start = 356, sp = 62, fw = 50, y = colY + 10, fh = 96;
      for (var i = 0; i < keys.length; i++) {
        var bx = start + i * sp;
        var g = E("g", {});
        g.appendChild(E("path", { "class": "po-folder", d: "M" + bx + " " + (y + 9) + " h13 l5 -8 h" + (fw - 22) + " v" + (fh - 1) + " h-" + fw + " z" }));
        var t = E("text", { "class": "po-folder-t", x: bx + fw / 2, y: y + 36 }); t.textContent = "country="; g.appendChild(t);
        var t2 = E("text", { "class": "po-folder-k", x: bx + fw / 2, y: y + 54 }); t2.textContent = esc(keys[i]); g.appendChild(t2);
        var pf = E("text", { "class": "po-folder-f", x: bx + fw / 2, y: y + 82 }); pf.textContent = "part-*"; g.appendChild(pf);
        layer.appendChild(g);
      }
    }
    bR.addEventListener("click", function () { op = "repartition"; render(); });
    bC.addEventListener("click", function () { op = "coalesce"; render(); });
    bP.addEventListener("click", function () { op = "partitionBy"; render(); });
    render();
    return wrap;
  }

  // ---- clusterSizing: interactive executor / cluster sizing calculator ------
  // Steppers for worker nodes / cores-per-node / RAM-per-node drive a live
  // recompute using the "5 cores per executor" rule of thumb. The SVG shows one
  // worker node's cores grouped into executor slots (OS reserve greyed, leftover
  // cores idle) and its RAM split into per-executor containers (heap + a thin
  // memoryOverhead sliver). A summary tally and a generated spark-submit line
  // update on every change — so the arithmetic every DE interview asks about
  // becomes something you can feel.
  // opts: { nodes, cores, ram, reserve }
  function clusterSizing(opts) {
    var NS = "http://www.w3.org/2000/svg";
    function svgEl(name, attrs) { var e = document.createElementNS(NS, name); if (attrs) for (var k in attrs) e.setAttribute(k, String(attrs[k])); return e; }

    var st = {
      nodes: opts.nodes || 6,
      cores: opts.cores || 16,
      ram: opts.ram || 64,
      reserve: opts.reserve !== false
    };
    var LIM = { nodes: [1, 20], cores: [2, 32], ram: [8, 256] };

    function compute() {
      var res = st.reserve ? 1 : 0;
      var uCores = Math.max(1, st.cores - res);
      var uRam = Math.max(1, st.ram - res);
      var cpe = Math.min(5, uCores);
      var epn = Math.max(1, Math.floor(uCores / cpe));
      if (uCores < 5) { epn = 1; cpe = uCores; }
      var idle = uCores - epn * cpe;
      var memExec = Math.floor(uRam / epn);
      var overhead = Math.max(0.384, 0.07 * memExec);
      overhead = Math.ceil(overhead * 100) / 100;
      var heap = Math.round((memExec - overhead) * 10) / 10;
      var totalAll = epn * st.nodes;
      var totalExec = Math.max(1, totalAll - 1); // one slot funds the driver
      return { res: res, uCores: uCores, uRam: uRam, cpe: cpe, epn: epn, idle: idle,
               memExec: memExec, overhead: overhead, heap: heap, totalAll: totalAll, totalExec: totalExec };
    }

    var wrap = elh("div", "viz viz-cs");
    var host = elh("div", "cs-host");

    var ctrlWrap = elh("div", "cs-steppers");
    function stepper(key, label, unit) {
      var box = elh("div", "cs-step");
      box.appendChild(elh("div", "cs-step-lab", label));
      var row = elh("div", "cs-step-row");
      var minus = elh("button", "cs-step-btn", "−");
      var val = elh("span", "cs-step-val", st[key] + (unit || ""));
      var plus = elh("button", "cs-step-btn", "+");
      row.appendChild(minus); row.appendChild(val); row.appendChild(plus);
      box.appendChild(row);
      var lim = LIM[key];
      var stepSize = key === "ram" ? 8 : (key === "cores" ? 2 : 1);
      minus.addEventListener("click", function () { st[key] = Math.max(lim[0], st[key] - stepSize); val.textContent = st[key] + (unit || ""); render(); });
      plus.addEventListener("click", function () { st[key] = Math.min(lim[1], st[key] + stepSize); val.textContent = st[key] + (unit || ""); render(); });
      return box;
    }
    ctrlWrap.appendChild(stepper("nodes", "Worker nodes", ""));
    ctrlWrap.appendChild(stepper("cores", "Cores / node", ""));
    ctrlWrap.appendChild(stepper("ram", "RAM / node", " GB"));
    var resBox = elh("div", "cs-step");
    resBox.appendChild(elh("div", "cs-step-lab", "OS / daemon reserve"));
    var resBtn = elh("button", "cs-toggle" + (st.reserve ? " on" : ""), st.reserve ? "1 core + 1 GB ✓" : "none");
    resBtn.addEventListener("click", function () { st.reserve = !st.reserve; resBtn.classList.toggle("on", st.reserve); resBtn.textContent = st.reserve ? "1 core + 1 GB ✓" : "none"; render(); });
    resBox.appendChild(resBtn);
    ctrlWrap.appendChild(resBox);

    var status = elh("div", "viz-hint cs-status", "");
    var codeBox = elh("pre", "cs-code");

    wrap.appendChild(ctrlWrap);
    wrap.appendChild(host);
    wrap.appendChild(codeBox);
    wrap.appendChild(status);

    function drawCore(svg, x, y, sq, cls) {
      svg.appendChild(svgEl("rect", { "class": "cs-core " + cls, x: x, y: y, width: sq, height: sq, rx: 4 }));
    }

    function render() {
      var c = compute();
      host.innerHTML = "";
      var W = 560, pad = 12, coreGap = 4, coreTop = 34;
      var cn = st.cores;
      var sq = Math.min(30, Math.floor((W - pad * 2 - (cn - 1) * coreGap) / cn));
      if (sq < 8) sq = 8;
      var rowW = cn * sq + (cn - 1) * coreGap;
      var startX = (W - rowW) / 2;
      var ramTop = coreTop + sq + 54;
      var barH = 34;
      var H = ramTop + barH + 26;
      var svg = svgEl("svg", { "class": "cs-svg", viewBox: "0 0 " + W + " " + H, width: "100%", role: "img", "aria-label": "Executor sizing for one worker node" });

      var title = svgEl("text", { "class": "cs-title", x: pad, y: 20 });
      title.textContent = "One worker node — " + st.cores + " cores · " + st.ram + " GB";
      svg.appendChild(title);

      var idx = 0, i;
      for (i = 0; i < c.res; i++) { drawCore(svg, startX + idx * (sq + coreGap), coreTop, sq, "reserve"); idx++; }
      for (var e = 0; e < c.epn; e++) {
        var gx0 = startX + idx * (sq + coreGap);
        for (var k = 0; k < c.cpe; k++) { drawCore(svg, startX + idx * (sq + coreGap), coreTop, sq, "exec e" + (e % 4)); idx++; }
        var gw = c.cpe * (sq + coreGap) - coreGap;
        svg.appendChild(svgEl("rect", { "class": "cs-exec-br", x: gx0 - 2, y: coreTop - 2, width: gw + 4, height: sq + 4, rx: 5 }));
        var elab = svgEl("text", { "class": "cs-exec-lab", x: gx0 + gw / 2, y: coreTop + sq + 15 }); elab.textContent = "E" + (e + 1); svg.appendChild(elab);
      }
      for (i = 0; i < c.idle; i++) { drawCore(svg, startX + idx * (sq + coreGap), coreTop, sq, "idle"); idx++; }

      var ramLabel = svgEl("text", { "class": "cs-title", x: pad, y: ramTop - 10 });
      ramLabel.textContent = "RAM → " + c.epn + " executor container" + (c.epn > 1 ? "s" : "") + " (heap + overhead)";
      svg.appendChild(ramLabel);
      var gbToPx = rowW / st.ram, bx = startX;
      if (c.res > 0) { var rw = c.res * gbToPx; svg.appendChild(svgEl("rect", { "class": "cs-ram-reserve", x: bx, y: ramTop, width: rw, height: barH })); bx += rw; }
      for (var e2 = 0; e2 < c.epn; e2++) {
        var totPx = c.memExec * gbToPx, ovPx = c.overhead * gbToPx, heapPx = totPx - ovPx;
        svg.appendChild(svgEl("rect", { "class": "cs-ram-heap e" + (e2 % 4), x: bx, y: ramTop, width: heapPx, height: barH }));
        svg.appendChild(svgEl("rect", { "class": "cs-ram-ov", x: bx + heapPx, y: ramTop, width: ovPx, height: barH }));
        bx += totPx;
      }
      host.appendChild(svg);

      status.innerHTML = "<b>" + c.totalExec + " executors</b> cluster-wide (" + c.epn + "/node × " + st.nodes + " nodes − 1 for the driver) · <b>" + c.cpe + " cores</b> each · <b>~" + c.heap + " GB</b> heap + " + c.overhead.toFixed(2) + " GB overhead per executor."
        + (c.idle > 0 ? " <span class='cs-warn'>" + c.idle + " core" + (c.idle > 1 ? "s" : "") + "/node idle</span> — too few to form another 5-core executor." : "")
        + (c.cpe < 5 ? " Fewer than 5 usable cores here, so the node runs one small executor." : "");

      codeBox.textContent =
        "spark-submit \\\n" +
        "  --num-executors " + c.totalExec + " \\\n" +
        "  --executor-cores " + c.cpe + " \\\n" +
        "  --executor-memory " + Math.max(1, Math.floor(c.heap)) + "g \\\n" +
        "  --conf spark.executor.memoryOverhead=" + Math.round(c.overhead * 1024) + " \\\n" +
        "  your_app.py";
    }

    render();
    return wrap;
  }

  // ---- hdfsBlocks: file -> 128MB blocks -> rack-aware replication + failover -
  // A file splits into fixed-size blocks; each block is replicated (default 3x)
  // across DataNodes placed with rack awareness (1 replica one rack, 2 on a
  // second rack). Click a block to see its replicas light up; click a node to
  // fail it and watch HDFS re-replicate to restore the replication factor. A
  // NameNode line shows the block->node metadata. opts: { fileMB, rf }
  function hdfsBlocks(opts) {
    function esc(s) { return String(s == null ? "" : s).replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); }
    var NS = "http://www.w3.org/2000/svg";
    function svgEl(name, attrs) { var e = document.createElementNS(NS, name); if (attrs) for (var k in attrs) e.setAttribute(k, String(attrs[k])); return e; }

    var BLK = 128; // MB
    var st = { fileMB: opts.fileMB || 640, rf: opts.rf || 3, sel: 0, dead: {} };
    var LIM = [128, 2048];
    var NODES = [{ id: "N1", rack: 0 }, { id: "N2", rack: 0 }, { id: "N3", rack: 0 },
                 { id: "N4", rack: 1 }, { id: "N5", rack: 1 }, { id: "N6", rack: 1 }];

    function nBlocks() { return Math.max(1, Math.ceil(st.fileMB / BLK)); }
    function basePlacement(i) { return [i % 3, 3 + (i % 3), 3 + ((i + 1) % 3)].slice(0, st.rf); }
    function effective(i) {
      var base = basePlacement(i);
      var healthy = [], lost = [], restored = [], used = {};
      base.forEach(function (n) { used[n] = 1; if (st.dead[n]) lost.push(n); else healthy.push(n); });
      lost.forEach(function () {
        for (var n = 0; n < NODES.length; n++) { if (!used[n] && !st.dead[n]) { restored.push(n); used[n] = 1; break; } }
      });
      return { base: base, healthy: healthy, lost: lost, restored: restored };
    }

    var wrap = elh("div", "viz viz-hb");

    var ctrlWrap = elh("div", "cs-steppers");
    function stepper(label, get, dec, inc, unit) {
      var box = elh("div", "cs-step");
      box.appendChild(elh("div", "cs-step-lab", label));
      var row = elh("div", "cs-step-row");
      var minus = elh("button", "cs-step-btn", "−");
      var val = elh("span", "cs-step-val", get());
      var plus = elh("button", "cs-step-btn", "+");
      row.appendChild(minus); row.appendChild(val); row.appendChild(plus);
      box.appendChild(row);
      minus.addEventListener("click", function () { dec(); val.textContent = get(); render(); });
      plus.addEventListener("click", function () { inc(); val.textContent = get(); render(); });
      return { box: box, refresh: function () { val.textContent = get(); } };
    }
    var sizeStep = stepper("File size",
      function () { return st.fileMB >= 1024 ? (st.fileMB / 1024) + " GB" : st.fileMB + " MB"; },
      function () { st.fileMB = Math.max(LIM[0], st.fileMB - 128); if (st.sel >= nBlocks()) st.sel = nBlocks() - 1; },
      function () { st.fileMB = Math.min(LIM[1], st.fileMB + 128); });
    var rfStep = stepper("Replication",
      function () { return st.rf + "×"; },
      function () { st.rf = Math.max(2, st.rf - 1); },
      function () { st.rf = Math.min(3, st.rf + 1); });
    ctrlWrap.appendChild(sizeStep.box);
    ctrlWrap.appendChild(rfStep.box);
    var resetBox = elh("div", "cs-step");
    resetBox.appendChild(elh("div", "cs-step-lab", "Failed nodes"));
    var resetBtn = elh("button", "cs-toggle", "revive all");
    resetBtn.addEventListener("click", function () { st.dead = {}; render(); });
    resetBox.appendChild(resetBtn);
    ctrlWrap.appendChild(resetBox);
    wrap.appendChild(ctrlWrap);

    var host = elh("div", "hb-host");
    wrap.appendChild(host);
    var status = elh("div", "viz-hint hb-status", "");
    wrap.appendChild(status);

    function render() {
      host.innerHTML = "";
      sizeStep.refresh(); rfStep.refresh();
      var W = 560, pad = 12;
      var nb = nBlocks();
      var fileTop = 30, fileH = 30, gap = 4;
      var bw = Math.min(46, Math.floor((W - pad * 2 - (nb - 1) * gap) / nb));
      if (bw < 14) bw = 14;
      var rowW = nb * bw + (nb - 1) * gap;
      var startX = (W - rowW) / 2;
      var nnTop = fileTop + fileH + 26;
      var rackTop = nnTop + 40;
      var nodeW = 150, nodeH = 46, nodeGap = 16;
      var rackH = nodeH + 34;
      var H = rackTop + rackH * 2 + 16;
      var svg = svgEl("svg", { "class": "hb-svg", viewBox: "0 0 " + W + " " + H, width: "100%", role: "img", "aria-label": "HDFS file blocks and replication" });

      // file -> blocks
      var ft = svgEl("text", { "class": "hb-title", x: pad, y: 18 });
      ft.textContent = "File (" + (st.fileMB >= 1024 ? st.fileMB / 1024 + " GB" : st.fileMB + " MB") + ") → " + nb + " block" + (nb > 1 ? "s" : "") + " × " + BLK + " MB";
      svg.appendChild(ft);
      for (var i = 0; i < nb; i++) {
        var x = startX + i * (bw + gap);
        var g = svgEl("g", { "class": "hb-block" + (i === st.sel ? " sel" : ""), tabindex: "0", role: "button" });
        g.appendChild(svgEl("rect", { "class": "hb-block-box", x: x, y: fileTop, width: bw, height: fileH, rx: 4 }));
        var bt = svgEl("text", { "class": "hb-block-t", x: x + bw / 2, y: fileTop + fileH / 2 + 4 }); bt.textContent = "B" + i; g.appendChild(bt);
        (function (idx) { g.addEventListener("click", function () { st.sel = idx; render(); }); g.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { st.sel = idx; render(); } }); })(i);
        svg.appendChild(g);
      }

      var eff = effective(st.sel);
      var holds = {}; eff.healthy.forEach(function (n) { holds[n] = "holds"; });
      eff.restored.forEach(function (n) { holds[n] = "restore"; });

      // NameNode metadata line
      var meta = "B" + st.sel + " → " + eff.healthy.concat(eff.restored).map(function (n) { return NODES[n].id; }).join(", ");
      if (eff.lost.length) meta += "   (re-replicated after " + eff.lost.map(function (n) { return NODES[n].id; }).join(", ") + " failed)";
      var nn = svgEl("g", { "class": "hb-nn" });
      nn.appendChild(svgEl("rect", { "class": "hb-nn-box", x: startX, y: nnTop, width: rowW, height: 26, rx: 6 }));
      var nnt = svgEl("text", { "class": "hb-nn-t", x: startX + 10, y: nnTop + 17 }); nnt.textContent = "NameNode  " + meta; nn.appendChild(nnt);
      svg.appendChild(nn);

      // racks
      for (var rk = 0; rk < 2; rk++) {
        var ry = rackTop + rk * rackH;
        var rlab = svgEl("text", { "class": "hb-rack-lab", x: pad, y: ry + 16 }); rlab.textContent = "Rack " + (rk + 1); svg.appendChild(rlab);
        var rackNodes = NODES.map(function (n, idx) { return { n: n, idx: idx }; }).filter(function (o) { return o.n.rack === rk; });
        var totalW = rackNodes.length * nodeW + (rackNodes.length - 1) * nodeGap;
        var rx0 = W - pad - totalW;
        rackNodes.forEach(function (o, j) {
          var nx = rx0 + j * (nodeW + nodeGap), ny = ry + 4;
          var state = st.dead[o.idx] ? "dead" : (holds[o.idx] || "");
          var gn = svgEl("g", { "class": "hb-node " + state, tabindex: "0", role: "button" });
          gn.appendChild(svgEl("rect", { "class": "hb-node-box", x: nx, y: ny, width: nodeW, height: nodeH, rx: 7 }));
          var nt = svgEl("text", { "class": "hb-node-t", x: nx + 12, y: ny + 20 }); nt.textContent = "DataNode " + o.n.id; gn.appendChild(nt);
          var sub = svgEl("text", { "class": "hb-node-sub", x: nx + 12, y: ny + 37 });
          sub.textContent = st.dead[o.idx] ? "✕ failed" : (holds[o.idx] === "holds" ? "● replica of B" + st.sel : (holds[o.idx] === "restore" ? "◆ new replica B" + st.sel : "—"));
          gn.appendChild(sub);
          (function (idx) { gn.addEventListener("click", function () { st.dead[idx] = !st.dead[idx]; render(); }); gn.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { st.dead[idx] = !st.dead[idx]; render(); } }); })(o.idx);
          svg.appendChild(gn);
        });
      }
      host.appendChild(svg);

      var msg = "Block <b>B" + st.sel + "</b> is replicated <b>" + st.rf + "×</b> — 1 on Rack 1, " + (st.rf - 1) + " on Rack 2 (rack awareness: survive a whole-rack outage).";
      if (eff.lost.length) msg += " <span class='cs-warn'>" + eff.lost.map(function (n) { return NODES[n].id; }).join(", ") + " failed</span> → NameNode spawned a fresh replica on " + eff.restored.map(function (n) { return NODES[n].id; }).join(", ") + " to restore " + st.rf + "× (fault tolerance).";
      else msg += " Click a DataNode to fail it and watch HDFS re-replicate.";
      status.innerHTML = msg;
    }

    render();
    return wrap;
  }

  // ---- deployMode: client vs cluster — where does the driver run? -----------
  // Toggle between --deploy-mode client and cluster. The SVG shows a gateway
  // node and a YARN cluster (ResourceManager + two NodeManager workers holding
  // containers). The Driver chip moves: client mode keeps it on the gateway
  // (outside the cluster); cluster mode places it in a container as the
  // ApplicationMaster. Arrows link driver -> executors. A spark-submit line and
  // an implications list update on toggle. opts: { mode }
  function deployMode(opts) {
    function esc(s) { return String(s == null ? "" : s).replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); }
    var NS = "http://www.w3.org/2000/svg";
    function svgEl(name, attrs) { var e = document.createElementNS(NS, name); if (attrs) for (var k in attrs) e.setAttribute(k, String(attrs[k])); return e; }
    var st = { mode: opts.mode || "client" };

    var wrap = elh("div", "viz viz-dm");
    var toggle = elh("div", "dm-toggle");
    var bC = elh("button", "dm-tab", "client mode");
    var bK = elh("button", "dm-tab", "cluster mode");
    toggle.appendChild(bC); toggle.appendChild(bK);
    var host = elh("div", "dm-host");
    var code = elh("pre", "cs-code");
    var status = elh("div", "viz-hint dm-status", "");
    wrap.appendChild(toggle); wrap.appendChild(host); wrap.appendChild(code); wrap.appendChild(status);

    function box(svg, x, y, w, h, cls, title, sub) {
      var g = svgEl("g", { "class": "dm-box " + cls });
      g.appendChild(svgEl("rect", { "class": "dm-rect", x: x, y: y, width: w, height: h, rx: 6 }));
      if (title) { var t = svgEl("text", { "class": "dm-t", x: x + w / 2, y: y + (sub ? 17 : h / 2 + 4) }); t.textContent = title; g.appendChild(t); }
      if (sub) { var s = svgEl("text", { "class": "dm-sub", x: x + w / 2, y: y + 32 }); s.textContent = sub; g.appendChild(s); }
      svg.appendChild(g);
      return { cx: x + w / 2, cy: y + h / 2, x: x, y: y, w: w, h: h };
    }
    function arrow(svg, x1, y1, x2, y2, cls) {
      var g = svgEl("g", { "class": "dm-arrow " + (cls || "") });
      g.appendChild(svgEl("line", { "class": "dm-line", x1: x1, y1: y1, x2: x2, y2: y2 }));
      var ang = Math.atan2(y2 - y1, x2 - x1), s = 6;
      g.appendChild(svgEl("polygon", { "class": "dm-head", points: x2 + "," + y2 + " " + (x2 - s * Math.cos(ang - 0.5)) + "," + (y2 - s * Math.sin(ang - 0.5)) + " " + (x2 - s * Math.cos(ang + 0.5)) + "," + (y2 - s * Math.sin(ang + 0.5)) }));
      svg.appendChild(g);
    }

    function render() {
      host.innerHTML = "";
      bC.classList.toggle("on", st.mode === "client");
      bK.classList.toggle("on", st.mode === "cluster");
      var cluster = st.mode === "cluster";
      var W = 560, H = 250;
      var svg = svgEl("svg", { "class": "dm-svg", viewBox: "0 0 " + W + " " + H, width: "100%", role: "img", "aria-label": "Spark deploy mode" });

      // labels
      var l1 = svgEl("text", { "class": "dm-lab", x: 12, y: 14 }); l1.textContent = "Edge / Gateway node"; svg.appendChild(l1);
      var cx = 176, cw = W - cx - 8;
      var cl = svgEl("text", { "class": "dm-lab", x: cx + 4, y: 14 }); cl.textContent = "YARN cluster"; svg.appendChild(cl);
      // cluster boundary
      svg.appendChild(svgEl("rect", { "class": "dm-boundary", x: cx, y: 20, width: cw, height: H - 28, rx: 8 }));

      // gateway
      box(svg, 12, 20, 150, H - 28, "dm-gw", "", "");
      var driverPos;
      if (!cluster) {
        driverPos = box(svg, 26, 60, 122, 48, "dm-driver hot", "Driver", "your JVM (main)");
        box(svg, 26, 128, 122, 34, "dm-submit", "spark-submit ⏎", "");
      } else {
        box(svg, 26, 84, 122, 44, "dm-submit", "spark-submit ⏎", "then can disconnect");
      }

      // ResourceManager
      box(svg, cx + 14, 30, cw - 28, 26, "dm-rm", "ResourceManager", "");

      // workers
      var wy = 74, wh = H - 92, ww = (cw - 28 - 14) / 2;
      var w1x = cx + 14, w2x = w1x + ww + 14;
      var slots = [];
      [w1x, w2x].forEach(function (wx, wi) {
        box(svg, wx, wy, ww, wh, "dm-worker", "", "");
        var nl = svgEl("text", { "class": "dm-worker-lab", x: wx + 8, y: wy + 15 }); nl.textContent = "NodeManager " + (wi + 1); svg.appendChild(nl);
        for (var s = 0; s < 2; s++) slots.push({ x: wx + 8, y: wy + 24 + s * ((wh - 30) / 2 + 4), w: ww - 16, h: (wh - 30) / 2 });
      });

      var execCenters = [];
      slots.forEach(function (sl, i) {
        var role, cls, sub;
        if (cluster && i === 0) { role = "AM + Driver"; cls = "dm-driver hot"; sub = "runs in the cluster"; driverPos = { cx: sl.x + sl.w / 2, cy: sl.y + sl.h / 2 }; }
        else if (!cluster && i === 0) { role = "ApplicationMaster"; cls = "dm-am"; sub = "asks RM for resources"; }
        else { role = "Executor"; cls = "dm-exec"; sub = "runs tasks"; }
        box(svg, sl.x, sl.y, sl.w, sl.h, cls, role, sub);
        if (role === "Executor") execCenters.push({ cx: sl.x + sl.w / 2, cy: sl.y });
      });

      // driver -> executor control arrows
      if (driverPos) execCenters.forEach(function (ec) { arrow(svg, driverPos.cx, driverPos.cy, ec.cx, ec.cy, "ctrl"); });

      host.appendChild(svg);

      code.textContent = "spark-submit \\\n  --master yarn \\\n  --deploy-mode " + st.mode + " \\\n  your_app.py";
      status.innerHTML = cluster
        ? "<b>cluster mode</b> — the driver runs <b>inside the cluster</b> as the ApplicationMaster. spark-submit can exit / your laptop can disconnect and the job keeps running. Driver logs live in YARN. <b>Use for production &amp; scheduled jobs.</b>"
        : "<b>client mode</b> — the driver runs on the <b>gateway node where you launched it</b> (outside the cluster); a separate ApplicationMaster only requests containers. Driver logs stream to your terminal, but if that process dies the job dies. <b>Use for spark-shell / notebooks / interactive.</b>";
    }

    bC.addEventListener("click", function () { st.mode = "client"; render(); });
    bK.addEventListener("click", function () { st.mode = "cluster"; render(); });
    render();
    return wrap;
  }

  // ---- parquetLayout: columnar file -> row groups -> column chunks ----------
  // A Parquet file drawn as row groups, each split into per-column chunks with
  // min/max stats. Pick which columns to SELECT (column pruning) and a WHERE
  // predicate (row-group skipping via min/max). Read chunks light up; pruned
  // columns and skipped row groups dim; a "scanned" readout updates. Flip to
  // row format to see why neither optimization is possible there.
  // opts: {}
  function parquetLayout(opts) {
    function esc(s) { return String(s == null ? "" : s).replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); }
    var NS = "http://www.w3.org/2000/svg";
    function svgEl(name, attrs) { var e = document.createElementNS(NS, name); if (attrs) for (var k in attrs) e.setAttribute(k, String(attrs[k])); return e; }
    var COLS = ["order_id", "country", "amount", "ts"];
    var RGS = [
      { amin: 10, amax: 200, countries: ["US", "IN"] },
      { amin: 150, amax: 600, countries: ["IN", "UK"] },
      { amin: 500, amax: 900, countries: ["US", "DE"] }
    ];
    var st = { sel: { order_id: false, country: true, amount: true, ts: false }, pred: "amount", columnar: true };

    function survives(rg) {
      if (st.pred === "amount") return rg.amax > 500;
      if (st.pred === "country") return rg.countries.indexOf("US") !== -1;
      return true;
    }

    var wrap = elh("div", "viz viz-pl");
    var ctrls = elh("div", "pl-ctrls");

    function chipGroup(label, items, isOn, onClick) {
      var row = elh("div", "pl-row");
      row.appendChild(elh("span", "pl-row-lab", label));
      var box = elh("div", "pl-chips");
      items.forEach(function (it) {
        var c = elh("button", "pl-chip" + (isOn(it.key) ? " on" : ""), it.label);
        c.addEventListener("click", function () { onClick(it.key); render(); });
        box.appendChild(c);
      });
      row.appendChild(box);
      return row;
    }

    var host = elh("div", "pl-host");
    var readout = elh("div", "viz-hint pl-readout", "");
    var status = elh("div", "viz-hint pl-status", "");

    function buildCtrls() {
      ctrls.innerHTML = "";
      ctrls.appendChild(chipGroup("SELECT", COLS.map(function (c) { return { key: c, label: c }; }),
        function (k) { return st.sel[k]; }, function (k) { st.sel[k] = !st.sel[k]; }));
      ctrls.appendChild(chipGroup("WHERE", [
        { key: "none", label: "(no filter)" }, { key: "amount", label: "amount > 500" }, { key: "country", label: "country = 'US'" }
      ], function (k) { return st.pred === k; }, function (k) { st.pred = k; }));
      ctrls.appendChild(chipGroup("Format", [
        { key: "col", label: "Columnar (Parquet)" }, { key: "row", label: "Row format" }
      ], function (k) { return st.columnar === (k === "col"); }, function (k) { st.columnar = (k === "col"); }));
    }

    wrap.appendChild(ctrls);
    wrap.appendChild(host);
    wrap.appendChild(readout);
    wrap.appendChild(status);

    function render() {
      buildCtrls();
      host.innerHTML = "";
      var W = 560, gut = 54, x0 = gut, colW = (W - gut - 10) / COLS.length;
      var headY = 24, bandTop = 34, bandH = 46, bandGap = 10;
      var H = bandTop + RGS.length * (bandH + bandGap) + 6;
      var svg = svgEl("svg", { "class": "pl-svg", viewBox: "0 0 " + W + " " + H, width: "100%", role: "img", "aria-label": "Parquet columnar layout" });

      var anySel = COLS.some(function (c) { return st.sel[c]; });

      // column headers (columnar only)
      if (st.columnar) {
        COLS.forEach(function (c, j) {
          var ht = svgEl("text", { "class": "pl-colhead" + (st.sel[c] ? " on" : ""), x: x0 + j * colW + colW / 2, y: headY - 4 }); ht.textContent = c; svg.appendChild(ht);
        });
      } else {
        var rh = svgEl("text", { "class": "pl-colhead", x: x0, y: headY - 4 }); rh.textContent = "row-major bytes (all columns interleaved per row)"; svg.appendChild(rh);
      }

      RGS.forEach(function (rg, i) {
        var by = bandTop + i * (bandH + bandGap);
        var alive = st.columnar ? survives(rg) : true;
        // row-group label
        var rl = svgEl("text", { "class": "pl-rglab", x: 8, y: by + bandH / 2 - 4 }); rl.textContent = "RowGrp " + i; svg.appendChild(rl);
        var rl2 = svgEl("text", { "class": "pl-rglab pl-rgstat", x: 8, y: by + bandH / 2 + 12 }); rl2.textContent = "amt " + rg.amin + "-" + rg.amax; svg.appendChild(rl2);

        if (st.columnar) {
          COLS.forEach(function (c, j) {
            var cx = x0 + j * colW, state;
            if (!alive) state = "skip";
            else if (!st.sel[c]) state = "prune";
            else state = "read";
            var g = svgEl("g", { "class": "pl-cell " + state });
            g.appendChild(svgEl("rect", { "class": "pl-cell-box", x: cx + 2, y: by, width: colW - 4, height: bandH, rx: 5 }));
            var badge = c === "amount" ? (rg.amin + "-" + rg.amax) : (c === "country" ? "{" + rg.countries.join(",") + "}" : "chunk");
            var t1 = svgEl("text", { "class": "pl-cell-t", x: cx + colW / 2, y: by + 20 }); t1.textContent = c; g.appendChild(t1);
            var t2 = svgEl("text", { "class": "pl-cell-sub", x: cx + colW / 2, y: by + 36 }); t2.textContent = badge; g.appendChild(t2);
            svg.appendChild(g);
          });
          if (!alive) {
            var sk = svgEl("text", { "class": "pl-skip-lab", x: x0 + (W - gut - 10) / 2, y: by + bandH / 2 + 4 });
            sk.textContent = "✕ skipped — min/max excludes the filter"; svg.appendChild(sk);
          }
        } else {
          // row format: one solid band, all read, interleaved cells
          var g2 = svgEl("g", { "class": "pl-cell read" });
          g2.appendChild(svgEl("rect", { "class": "pl-cell-box", x: x0 + 2, y: by, width: W - gut - 14, height: bandH, rx: 5 }));
          var seg = (W - gut - 14) / 8;
          for (var s = 0; s < 8; s++) {
            g2.appendChild(svgEl("line", { "class": "pl-rowsep", x1: x0 + 2 + s * seg, y1: by, x2: x0 + 2 + s * seg, y2: by + bandH }));
          }
          var rt = svgEl("text", { "class": "pl-cell-sub", x: x0 + (W - gut - 14) / 2, y: by + bandH / 2 + 4 }); rt.textContent = "all columns of every row read"; g2.appendChild(rt);
          svg.appendChild(g2);
        }
      });
      host.appendChild(svg);

      var total = COLS.length * RGS.length;
      var scanned;
      if (st.columnar) {
        var selN = COLS.filter(function (c) { return st.sel[c]; }).length;
        var aliveN = RGS.filter(survives).length;
        scanned = selN * aliveN;
      } else {
        scanned = total;
      }
      var pct = Math.round(scanned / total * 100);
      readout.innerHTML = "Scanned <b>" + scanned + " / " + total + "</b> column-chunks (<b>" + pct + "%</b> of the file)" + (!anySel && st.columnar ? " — select at least one column" : "");

      status.innerHTML = st.columnar
        ? "<b>Columnar:</b> each column is stored together, so Spark reads <b>only the selected columns</b> (column pruning) and uses each row group's <b>min/max stats to skip</b> groups that can't match the filter (predicate pushdown / row-group skipping)."
        : "<b>Row format</b> (CSV/JSON): every row's columns are interleaved, so there's <b>no way to read one column</b> without reading the whole row, and <b>no per-column stats to skip</b> row groups — every query is a full scan. That's why analytics uses Parquet.";
    }

    render();
    return wrap;
  }

  window.PYVIZ = {
    build: function (spec) {
      if (!spec || !spec.type) return null;
      if (spec.type === "sequence") return sequence(spec.data || {});
      if (spec.type === "dictHash") return dictHash(spec.data || {});
      if (spec.type === "callStack") return callStack(spec.data || {});
      if (spec.type === "growth") return growth(spec.data || {});
      if (spec.type === "heapTree") return heapTree(spec.data || {});
      if (spec.type === "setOps") return setOps(spec.data || {});
      if (spec.type === "execOrder") return execOrder(spec.data || {});
      if (spec.type === "catalyst") return catalyst(spec.data || {});
      if (spec.type === "clusterRun") return clusterRun(spec.data || {});
      if (spec.type === "shuffleStages") return shuffleStages(spec.data || {});
      if (spec.type === "windowFrame") return windowFrame(spec.data || {});
      if (spec.type === "joinStrategy") return joinStrategy(spec.data || {});
      if (spec.type === "dataSkew") return dataSkew(spec.data || {});
      if (spec.type === "memorySpill") return memorySpill(spec.data || {});
      if (spec.type === "partitionOps") return partitionOps(spec.data || {});
      if (spec.type === "clusterSizing") return clusterSizing(spec.data || {});
      if (spec.type === "hdfsBlocks") return hdfsBlocks(spec.data || {});
      if (spec.type === "deployMode") return deployMode(spec.data || {});
      if (spec.type === "parquetLayout") return parquetLayout(spec.data || {});
      return null;
    }
  };
})();
