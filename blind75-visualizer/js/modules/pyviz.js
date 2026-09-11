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
      return null;
    }
  };
})();
