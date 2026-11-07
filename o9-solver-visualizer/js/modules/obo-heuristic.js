/* ============================================================
   modules/obo-heuristic.js — Track 1 · Meet the Solver
   The signature mechanism of the o9 Supply Chain Solver: a
   priority-ranked, ORDER-BY-ORDER heuristic that plans one demand
   at a time, backward customer → supplier, in three timing phases
   (JIT → Build-Ahead → Build-Late).

   Faithful to the documented SCS behaviour; validated against a real
   tenant privately. All on-screen data is ILLUSTRATIVE (synthetic),
   not client data. The demand-sort demo is driven by the unit-tested
   engine helper AV.Engine.sortDemands (sim/scs-engine.js), with a
   local fallback so the screen never hard-depends on load order.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.SolverViz = window.SolverViz || {});

  // ── Demand-sort demo data (illustrative) ──────────────────────
  var SORT_DEMANDS = [
    { key: "SO-1001", cust: "Dealer-A", priority: 2, fairShare: 1, dueDate: "2026-02-10", qty: 120 },
    { key: "SO-1002", cust: "Dealer-B", priority: 1, fairShare: 1, dueDate: "2026-02-14", qty: 50 },
    { key: "SO-1003", cust: "Dealer-C", priority: 1, fairShare: 1, dueDate: "2026-02-09", qty: 80 },
    { key: "SO-1004", cust: "Dealer-D", priority: 2, fairShare: 1, dueDate: "2026-02-10", qty: 200 },
    { key: "SO-1005", cust: "Dealer-E", priority: 1, fairShare: 2, dueDate: "2026-02-05", qty: 300 }
  ];

  // Local fallback mirroring engine's sortDemands comparator exactly.
  function sortFallback(demands) {
    var n = function (v, d) { return (v === undefined || v === null) ? d : v; };
    return demands.map(function (d, i) { return { d: d, i: i }; }).sort(function (a, b) {
      var A = a.d, B = b.d;
      return (n(A.priority, 1e9) - n(B.priority, 1e9)) ||
        (n(A.fairShare, 1e9) - n(B.fairShare, 1e9)) ||
        String(n(A.dueDate, "")).localeCompare(String(n(B.dueDate, ""))) ||
        (n(B.qty, 0) - n(A.qty, 0)) ||
        String(n(A.key, "")).localeCompare(String(n(B.key, ""))) ||
        (a.i - b.i);
    }).map(function (x) { return x.d; });
  }
  function runSort(d) {
    return (AV.Engine && AV.Engine.sortDemands) ? AV.Engine.sortDemands(d) : sortFallback(d);
  }
  function engineLabel() {
    return (AV.Engine && AV.Engine.sortDemands)
      ? '<span class="badge badge-green">engine · sortDemands()</span>'
      : '<span class="badge badge-yellow">fallback sort</span>';
  }

  function demandRows(list, ranked) {
    return list.map(function (d, i) {
      return "<tr>" +
        "<td>" + (ranked ? '<b>' + (i + 1) + "</b>" : '<span style="color:var(--text-muted)">—</span>') + "</td>" +
        "<td><code>" + d.key + "</code><br><span style=\"color:var(--text-muted);font-size:12px\">" + d.cust + "</span></td>" +
        '<td><span class="badge ' + (d.priority === 1 ? "badge-green" : "badge-yellow") + '">' + d.priority + "</span></td>" +
        "<td>" + d.fairShare + "</td>" +
        "<td>" + d.dueDate + "</td>" +
        "<td>" + d.qty + "</td>" +
      "</tr>";
    }).join("");
  }

  // ── Scarcity animation (illustrative) ─────────────────────────
  var GEO = [
    { id: "customer", x: 40,  y: 72, w: 150, h: 58, color: "demand" },
    { id: "lc",       x: 250, y: 72, w: 150, h: 58, color: "lc" },
    { id: "dc",       x: 460, y: 72, w: 150, h: 58, color: "dc" },
    { id: "supplier", x: 670, y: 72, w: 150, h: 58, color: "supplier" }
  ];
  var NODELABEL = {
    customer: { label: "Customer demand", sub: "D-High / D-Low" },
    lc: { label: "LC-Store", sub: "demand node" },
    dc: { label: "DC", sub: "on-hand 60" },
    supplier: { label: "Supplier", sub: "lead time 8d" }
  };
  var EDGES = [
    ["customer", "lc", { label: "demand" }],
    ["lc", "dc", { label: "replenish" }],
    ["dc", "supplier", { label: "source" }]
  ];
  var STEPS = [
    { label: "1 · Take the top demand", active: ["customer"], edges: [], states: { customer: "is-running" },
      desc: "Demands are already sorted. The solver takes <b>D-High (priority 1)</b> first and plans it <i>completely</i> before it even looks at D-Low. Orders are never planned together." },
    { label: "2 · Net requirement", active: ["lc"], edges: [["customer", "lc"]], states: { customer: "is-success", lc: "is-running" },
      desc: "At LC-Store, net requirement = max(0, demand − on-hand + safety stock) = max(0, 50 − 0 + 0) = <b>50 units</b>, due Day 5." },
    { label: "3 · Consume on-hand (JIT)", active: ["dc"], edges: [["lc", "dc"]], states: { customer: "is-success", lc: "is-success", dc: "is-success" },
      desc: "Backward traversal reaches the DC: <b>60 on-hand</b>. Consume 50 → met <b>Just-In-Time</b>, on time. DC on-hand remaining = <b>10</b>." },
    { label: "4 · Next demand, what's left", active: ["customer"], edges: [], states: { customer: "is-running" },
      desc: "D-High is finished. Only now does the solver start <b>D-Low (priority 3)</b>: 50 units due Day 5 — but the DC has just <b>10</b> left." },
    { label: "5 · Partial + shortfall", active: ["dc"], edges: [["lc", "dc"]], states: { lc: "is-running", dc: "is-short" },
      desc: "Consume the last 10 (JIT). Still short <b>40 units</b> → traverse upstream to the supplier for fresh supply." },
    { label: "6 · Build-Late from supplier", active: ["supplier"], edges: [["dc", "supplier"]], states: { supplier: "is-short" },
      desc: "New purchase at the supplier, but lead time 8 days &gt; 5. Earliest arrival Day 8 → <b>40 units Build-Late</b> (3 days late)." },
    { label: "7 · Why the order decided it", active: ["customer", "lc", "dc", "supplier"], edges: [["customer", "lc"], ["lc", "dc"], ["dc", "supplier"]],
      states: { customer: "is-success", lc: "is-success", dc: "is-success", supplier: "is-short" },
      desc: "Same item, same 60 units, same day. <b>D-High met on time; D-Low 40 late.</b> The priority <i>sort</i> decided who won the scarce supply — that is the order-by-order heuristic." }
  ];

  // ── Quiz (self-contained; grades + persists best via ProgressStore) ──
  var QUIZ = [
    { q: "How is the o9 Supply Chain Solver best described?",
      options: ["A cost-minimising LP / MIP optimiser", "A priority-ranked, order-by-order heuristic", "A machine-learning demand forecaster", "A rules-only engine with no planning"],
      answer: 1,
      why: "SCS is a heuristic: it plans one demand at a time in priority order, honouring hard constraints and relaxing soft ones per the Objective Rank List — not a single global optimisation." },
    { q: "Which key does the demand sort apply FIRST?",
      options: ["Due Date", "Quantity", "Priority", "The order's alphabetical key"],
      answer: 2,
      why: "Order is Priority → Fair-Share Priority → Due Date → Quantity → key. Priority dominates everything else." },
    { q: "Two demands need the same scarce stock on the same day. Who is met on time?",
      options: ["The larger-quantity demand", "Whichever was entered first", "The higher-priority demand (planned first)", "They split the stock evenly"],
      answer: 2,
      why: "Because planning is strictly sequential, the higher-priority demand is planned first and consumes the scarce supply; the next demand only gets what's left." },
    { q: "The three timing phases, in the order the solver tries them, are:",
      options: ["Build-Late → JIT → Build-Ahead", "JIT → Build-Ahead → Build-Late", "Build-Ahead → JIT → Build-Late", "JIT → Build-Late → Build-Ahead"],
      answer: 1,
      why: "The solver prefers Just-In-Time, then builds ahead (up to the Build-Ahead Limit), and only then plans late (up to the Build-Late Limit) before declaring a shortage." }
  ];
  var QUIZ_ID = "obo-heuristic";
  var MASTERY = Math.ceil(QUIZ.length * 2 / 3);

  var module = {
    id: "obo-heuristic",
    title: "The Order-by-Order Heuristic",
    fullWidth: true,
    _off: null, _engine: null, _controls: null, _diagram: null,

    render: function (container) {
      var self = this;
      var best = null;
      try { if (AV.ProgressStore) best = AV.ProgressStore.get("quiz", QUIZ_ID); } catch (e) {}

      container.innerHTML =
        '<div class="module-header animate-fade-in-up">' +
          '<div class="module-eyebrow">Track 1 · Meet the Solver</div>' +
          '<h1 class="module-title gradient-text">The Order-by-Order Heuristic</h1>' +
          '<p class="module-subtitle">The one idea that explains almost everything the solver does: it is <b>not</b> a ' +
          'cost optimiser. It plans <b>one demand at a time</b>, in a strict priority order, working <b>backward</b> ' +
          'from the customer to the supplier. Understand the order and you can predict the plan.</p>' +
        "</div>" +

        // 1 · Not an optimizer
        '<section class="section">' +
          '<h2 class="section-title">Not an optimiser — a disciplined clerk</h2>' +
          '<div class="card-grid">' +
            '<div class="card"><div class="card-title">❌ What people assume (LP / MIP)</div>' +
              "<p>Look at <i>all</i> demand and supply at once and compute the single cheapest feasible plan across the whole network.</p>" +
              '<p style="color:var(--text-muted);font-size:13px">One global objective, solved simultaneously.</p></div>' +
            '<div class="card"><div class="card-title">✅ What SCS actually does (OBO)</div>' +
              "<p>Sort the demands, then plan them <b>one by one</b> in that order. Each demand grabs the supply it can; the next demand gets what remains.</p>" +
              '<p style="color:var(--text-muted);font-size:13px">Many small decisions, in priority sequence.</p></div>' +
          "</div>" +
          '<div class="callout info" style="margin-top:14px"><span class="callout-icon">💡</span>' +
            '<div class="callout-body">Because planning is sequential, <b>the Objective Rank List <i>is</i> the objective</b>. ' +
            "Change the order and you change the plan — there is no separate cost function overruling it.</div></div>" +
        "</section>" +

        // 2 · The sort
        '<section class="section">' +
          '<h2 class="section-title">Step 1 — Sort the demands ' + engineLabel() + "</h2>" +
          '<p class="section-lead">Sort order: <code>Priority → Fair-Share → Due Date → Quantity → key</code>. ' +
          'Press the button to run the <b>actual engine sort</b> on these five illustrative orders.</p>' +
          '<div class="table-wrap"><table class="ref-table" id="sort-table"><thead><tr>' +
            "<th>Rank</th><th>Order</th><th>Priority</th><th>Fair-Share</th><th>Due Date</th><th>Qty</th>" +
          '</tr></thead><tbody id="sort-body">' + demandRows(SORT_DEMANDS, false) + "</tbody></table></div>" +
          '<div style="margin-top:12px;display:flex;gap:10px;align-items:center;flex-wrap:wrap">' +
            '<button class="btn btn-primary" id="sort-btn">▶ Run the solver\'s demand sort</button>' +
            '<button class="btn btn-secondary" id="sort-reset" hidden>↺ Reset</button>' +
            '<span id="sort-note" style="color:var(--text-muted);font-size:13px"></span>' +
          "</div>" +
        "</section>" +

        // 3 · Backward traversal animation
        '<section class="section">' +
          '<h2 class="section-title">Step 2 — Plan each demand backward, in order</h2>' +
          '<p class="section-lead">Two demands want the same 60 units at the DC on the same day. Watch priority order ' +
          "decide who is met on time.</p>" +
          '<div class="arch-layout">' +
            '<div class="arch-canvas" id="obo-canvas"></div>' +
            '<aside class="arch-detail detail-panel" id="obo-detail"><h3>Ready — press play</h3>' +
              "<p>D-High (priority 1) and D-Low (priority 3) each need 50 units. The DC has 60. Press play to watch the solve.</p></aside>" +
          "</div>" +
          '<div class="arch-controls" id="obo-controls"></div>' +
        "</section>" +

        // 4 · The three phases
        '<section class="section">' +
          '<h2 class="section-title">The three timing phases</h2>' +
          '<p class="section-lead">For each demand the solver tries, in order:</p>' +
          '<div class="card-grid">' +
            '<div class="card"><div class="card-title">1 · JIT <span class="badge badge-green">preferred</span></div>' +
              "<p>Plan supply to arrive <b>exactly</b> when the demand is due. The first and best choice.</p></div>" +
            '<div class="card"><div class="card-title">2 · Build-Ahead</div>' +
              "<p>If JIT can't be met (capacity, lot size, lead time), build <b>earlier</b> and carry it — up to the <b>Build-Ahead Limit</b>.</p></div>" +
            '<div class="card"><div class="card-title">3 · Build-Late</div>' +
              "<p>If still unmet, allow <b>late</b> supply up to the <b>Build-Late Limit</b>, minimising lateness. Beyond it → a shortage (RCA).</p></div>" +
          "</div>" +
        "</section>" +

        // 5 · Quiz
        '<section class="section" id="obo-quiz">' +
          '<h2 class="section-title">Test yourself ' +
            '<span id="mastery-badge" class="badge badge-green"' + (best && best.best >= MASTERY ? "" : ' hidden') + '">✓ mastered</span></h2>' +
          '<p class="section-lead">' + QUIZ.length + " quick questions. Score " + MASTERY + "+ to master this screen." +
            (best ? ' <span style="color:var(--text-muted)">Best so far: ' + best.best + "/" + QUIZ.length + ".</span>" : "") + "</p>" +
          '<div id="quiz-qs">' + QUIZ.map(function (item, qi) {
            return '<div class="card" style="margin-bottom:12px" data-q="' + qi + '"><div class="card-title" style="font-size:15px">' +
              (qi + 1) + ". " + item.q + "</div>" +
              '<div class="quiz-opts">' + item.options.map(function (op, oi) {
                return '<label style="display:block;padding:6px 0;cursor:pointer">' +
                  '<input type="radio" name="q' + qi + '" value="' + oi + '"> ' + op + "</label>";
              }).join("") + "</div>" +
              '<div class="quiz-exp" hidden style="margin-top:8px;font-size:13px;color:var(--text-muted)"></div>' +
            "</div>";
          }).join("") + "</div>" +
          '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">' +
            '<button class="btn btn-primary" id="quiz-check">Check answers</button>' +
            '<span id="quiz-score" style="font-weight:600"></span>' +
          "</div>" +
        "</section>" +

        // 6 · Self-explain
        '<section class="section">' +
          '<h2 class="section-title">Explain it back</h2>' +
          '<p class="section-lead">In one or two sentences: <i>why does the order demands are planned in change the final plan?</i></p>' +
          '<textarea id="selfx" rows="3" style="width:100%;max-width:640px;background:var(--bg-2);color:var(--text-primary);border:1px solid var(--border-default);border-radius:8px;padding:10px;font:inherit"></textarea>' +
          '<div style="margin-top:10px"><button class="btn btn-secondary" id="selfx-btn">Reveal the key points</button></div>' +
          '<div id="selfx-rubric" hidden class="callout tip" style="margin-top:12px"><span class="callout-icon">🎯</span><div class="callout-body"><ul style="margin:0;padding-left:18px">' +
            "<li>Planning is <b>sequential</b> — each demand is planned to completion before the next.</li>" +
            "<li>Earlier (higher-priority) demands <b>consume scarce supply/capacity first</b>.</li>" +
            "<li>So later demands only see <b>what remains</b> → reordering changes who is met JIT vs late vs short.</li>" +
          "</ul></div></div>" +
        "</section>";

      // ── wire: sort demo ──
      var sortBtn = container.querySelector("#sort-btn");
      var sortReset = container.querySelector("#sort-reset");
      var sortBody = container.querySelector("#sort-body");
      var sortNote = container.querySelector("#sort-note");
      if (sortBtn) sortBtn.addEventListener("click", function () {
        var sorted = runSort(SORT_DEMANDS);
        sortBody.innerHTML = demandRows(sorted, true);
        sortNote.innerHTML = "Sorted. <b>" + sorted[0].key + "</b> (priority " + sorted[0].priority +
          ") is planned first; <b>" + sorted[sorted.length - 1].key + "</b> last.";
        sortBtn.hidden = true; sortReset.hidden = false;
      });
      if (sortReset) sortReset.addEventListener("click", function () {
        sortBody.innerHTML = demandRows(SORT_DEMANDS, false);
        sortNote.textContent = ""; sortReset.hidden = true; sortBtn.hidden = false;
      });

      // ── wire: animation ──
      var detail = container.querySelector("#obo-detail");
      var diagram = AV.ArchDiagram.create({
        nodes: GEO.map(function (g) { return { id: g.id, x: g.x, y: g.y, w: g.w, h: g.h, color: g.color, label: NODELABEL[g.id].label, sub: NODELABEL[g.id].sub }; }),
        edges: EDGES, viewBox: "0 0 860 200", onSelect: function () {}
      });
      container.querySelector("#obo-canvas").appendChild(diagram.el);
      this._diagram = diagram;

      function paint(idx) {
        GEO.forEach(function (g) {
          var node = diagram.el.querySelector('[data-id="' + g.id + '"]');
          if (node) node.classList.remove("is-running", "is-success", "is-short", "is-blocked");
        });
        if (idx < 0) { diagram.clear(); detail.innerHTML = "<h3>Ready — press play</h3><p>D-High and D-Low each need 50 units. The DC has 60.</p>"; return; }
        var step = STEPS[idx];
        diagram.setActive(step.active, step.edges);
        Object.keys(step.states).forEach(function (nid) {
          var node = diagram.el.querySelector('[data-id="' + nid + '"]');
          if (node) node.classList.add(step.states[nid]);
        });
        detail.innerHTML = "<h3>" + step.label + "</h3><p>" + step.desc + "</p>";
      }

      var engine = new AV.AnimationEngine({ steps: STEPS.map(function (s) { return { label: s.label, duration: 2600 }; }), speed: 1 });
      this._engine = engine;
      this._off = engine.on("stepchange", function (idx) { paint(idx); });
      var controls = AV.AnimationControls.create(engine, { title: "Order-by-order solve" });
      container.querySelector("#obo-controls").appendChild(controls.el);
      this._controls = controls;
      paint(-1);

      // ── wire: quiz ──
      var checkBtn = container.querySelector("#quiz-check");
      var scoreEl = container.querySelector("#quiz-score");
      if (checkBtn) checkBtn.addEventListener("click", function () {
        var score = 0;
        QUIZ.forEach(function (item, qi) {
          var card = container.querySelector('[data-q="' + qi + '"]');
          var sel = card.querySelector('input[name="q' + qi + '"]:checked');
          var exp = card.querySelector(".quiz-exp");
          var chosen = sel ? parseInt(sel.value, 10) : -1;
          var ok = chosen === item.answer;
          if (ok) score++;
          card.style.borderColor = chosen === -1 ? "var(--border-default)" : (ok ? "var(--green)" : "var(--red)");
          exp.hidden = false;
          exp.innerHTML = (ok ? "✅ Correct. " : "❌ Not quite. ") + item.why;
        });
        scoreEl.textContent = "Score: " + score + "/" + QUIZ.length + (score >= MASTERY ? " — mastered ✓" : "");
        try {
          if (AV.ProgressStore) {
            var prev = AV.ProgressStore.get("quiz", QUIZ_ID);
            var newBest = Math.max(score, (prev && prev.best) || 0);
            AV.ProgressStore.record("quiz", QUIZ_ID, { best: newBest, total: QUIZ.length });
            if (newBest >= MASTERY) {
              AV.ProgressStore.record("mastery", QUIZ_ID, { mastered: true });
              var mb = container.querySelector("#mastery-badge"); if (mb) mb.hidden = false;
            }
          }
          window.dispatchEvent(new CustomEvent("o9scs:quiz-graded", { detail: { id: QUIZ_ID, score: score, total: QUIZ.length } }));
        } catch (e) {}
      });

      // ── wire: self-explain ──
      var selfxBtn = container.querySelector("#selfx-btn");
      if (selfxBtn) selfxBtn.addEventListener("click", function () {
        var r = container.querySelector("#selfx-rubric"); if (r) r.hidden = false;
      });
    },

    destroy: function () {
      if (this._off) { this._off(); this._off = null; }
      if (this._controls) { this._controls.destroy(); this._controls = null; }
      if (this._engine) { this._engine.destroy(); this._engine = null; }
      if (this._diagram) { this._diagram.destroy(); this._diagram = null; }
    }
  };

  AV.registerModule(module);
})();
