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

  window.PYVIZ = {
    build: function (spec) {
      if (!spec || !spec.type) return null;
      if (spec.type === "sequence") return sequence(spec.data || {});
      if (spec.type === "dictHash") return dictHash(spec.data || {});
      if (spec.type === "callStack") return callStack(spec.data || {});
      if (spec.type === "growth") return growth(spec.data || {});
      if (spec.type === "heapTree") return heapTree(spec.data || {});
      if (spec.type === "setOps") return setOps(spec.data || {});
      return null;
    }
  };
})();
