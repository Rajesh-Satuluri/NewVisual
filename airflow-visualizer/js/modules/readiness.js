/* ============================================================
   modules/readiness.js — Interview Readiness Dashboard
   ------------------------------------------------------------
   Aggregates the progress signals the app already collects — new
   troubleshooting/chain activity (AV.Progress) plus existing quiz
   best-scores (afviz-quiz-*) and visited modules (afviz-visited) —
   into a per-area readiness view, highlights the weakest area, and
   points at the right practice. It measures practice coverage and
   accuracy, NOT a prediction of real interview outcomes.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  function pctOf(a, b) { return b ? Math.round((a / b) * 100) : 0; }
  function band(p) { return p < 40 ? "low" : p < 75 ? "mid" : "high"; }

  function gather() {
    var P = AV.Progress;
    var tsData = (AV.data && AV.data.troubleshooting) || [];
    var chData = (AV.data && AV.data.chains) || [];
    var coData = (AV.data && AV.data.choose) || [];
    var seData = (AV.data && AV.data.senior) || [];

    // Troubleshooting: scenarios solved / total.
    var tsItems = P ? P.items("troubleshooting") : {};
    var tsSolved = 0;
    for (var a in tsItems) if (tsItems.hasOwnProperty(a) && tsItems[a].solved) tsSolved++;

    // Chains: completed chains + accuracy across completed ones.
    var chItems = P ? P.items("chains") : {};
    var chDone = 0, chGot = 0, chTotal = 0;
    for (var b in chItems) if (chItems.hasOwnProperty(b) && chItems[b].done) {
      chDone++; chGot += (chItems[b].got || 0); chTotal += (chItems[b].total || 0);
    }

    // Choose the right primitive: decisions tried + how many best answers.
    var coItems = P ? P.items("choose") : {};
    var coTried = 0, coCorrect = 0;
    for (var d in coItems) if (coItems.hasOwnProperty(d)) { coTried++; if (coItems[d].correct) coCorrect++; }

    // Senior scenarios: how many reviewed.
    var seItems = P ? P.items("senior") : {};
    var seDone = 0;
    for (var e in seItems) if (seItems.hasOwnProperty(e) && seItems[e].done) seDone++;

    // Concept quizzes: existing per-module best scores.
    var lq = P ? P.legacyQuiz() : {};
    var qBest = 0, qTotal = 0, qBanks = 0, qAttempted = 0;
    for (var c in lq) if (lq.hasOwnProperty(c)) {
      qBanks++; qBest += lq[c].best; qTotal += lq[c].total;
      if (lq[c].best > 0) qAttempted++;
    }

    // Module coverage: visited / total routes.
    var visited = P ? P.visitedCount() : 0;
    var totalRoutes = Object.keys(AV.routes || {}).length;

    return {
      tiles: [
        { num: tsSolved + "/" + tsData.length, label: "Scenarios solved" },
        { num: coCorrect + "/" + coData.length, label: "Decisions nailed" },
        { num: chDone + "/" + chData.length, label: "Chains completed" },
        { num: seDone + "/" + seData.length, label: "Senior scenarios" }
      ],
      rows: [
        { key: "troubleshooting", name: "Troubleshooting", val: tsSolved + " / " + tsData.length + " scenarios",
          pct: pctOf(tsSolved, tsData.length), href: "#troubleshooting",
          sub: "Diagnose production symptoms step by step.", mastery: true },
        { key: "choose", name: "Choose the right primitive", val: coCorrect + " / " + coData.length + " decisions",
          pct: pctOf(coCorrect, coData.length), href: "#choose-primitive",
          sub: "Pick the right tool — and justify it.", mastery: true },
        { key: "chains", name: "Follow-up chains", val: chDone + " / " + chData.length + " chains",
          pct: chDone ? pctOf(chGot, chTotal) : 0, href: "#interview-chains",
          sub: chDone ? "Accuracy across completed chains." : "Handle the interviewer's deeper follow-ups.", mastery: true },
        { key: "senior", name: "Senior scenarios (L3)", val: seDone + " / " + seData.length + " reviewed",
          pct: pctOf(seDone, seData.length), href: "#senior-scenarios",
          sub: "Production reasoning and trade-offs.", mastery: false },
        { key: "quizzes", name: "Concept quizzes", val: qAttempted + " / " + qBanks + " banks tried",
          pct: pctOf(qBest, qTotal), href: "#study", sub: "Per-module Test Yourself best scores.", mastery: true },
        { key: "coverage", name: "Module coverage", val: visited + " / " + totalRoutes + " modules",
          pct: pctOf(visited, totalRoutes), href: "#master-map", sub: "How much of the material you've opened.", mastery: false }
      ]
    };
  }

  var module = {
    id: "readiness",
    title: "Interview Readiness",

    render: function (container) {
      var g = gather();

      var tiles = g.tiles.map(function (t) {
        return '<div class="rd-tile"><div class="rd-tile-num gradient-text">' + t.num +
          '</div><div class="rd-tile-label">' + t.label + "</div></div>";
      }).join("");

      var rows = g.rows.map(function (r) {
        return '<a class="rd-row" href="' + r.href + '">' +
          '<div class="rd-row-top"><span class="rd-row-name">' + r.name +
            '</span><span class="rd-row-val">' + r.val + " · " + r.pct + "%</span></div>" +
          '<div class="rd-meter"><div class="rd-meter-fill ' + band(r.pct) +
            '" style="width:' + r.pct + '%"></div></div>' +
          '<div class="rd-row-sub">' + r.sub + "</div>" +
        "</a>";
      }).join("");

      // Weakest *mastery* area (ignore pure coverage) to recommend practice.
      var mastery = g.rows.filter(function (r) { return r.mastery; });
      mastery.sort(function (x, y) { return x.pct - y.pct; });
      var weak = mastery[0];
      var weakMsg = weak.pct === 0
        ? "You haven't started <b>" + weak.name.toLowerCase() + "</b> yet — that's the highest-leverage place to begin."
        : "Your weakest area is <b>" + weak.name.toLowerCase() + "</b> at " + weak.pct + "%. A focused pass there moves the needle most.";

      container.innerHTML =
        '<div class="module-header animate-fade-in-up">' +
          '<div class="module-eyebrow">Interview Prep · Your readiness at a glance</div>' +
          '<h1 class="module-title">Interview Readiness</h1>' +
          '<p class="module-subtitle">Where you stand across the interview-prep tracks, built from your own ' +
          "activity in this browser. Click any track to jump straight into practice.</p>" +
        "</div>" +
        '<div class="rd-tiles">' + tiles + "</div>" +
        '<h2 class="rd-section-title">Readiness by area</h2>' +
        '<div class="rd-rows">' + rows + "</div>" +
        '<div class="callout tip rd-weak"><span class="callout-icon">🎯</span>' +
          '<div class="callout-body"><b>Recommended focus.</b> ' + weakMsg + "</div></div>" +
        '<h2 class="rd-section-title">Recommended practice</h2>' +
        '<div class="rd-actions">' +
          '<a class="rd-action" href="#' + (weak.href.replace("#", "") || "troubleshooting") + '">▶ Focus: ' + weak.name + "</a>" +
          '<a class="rd-action" href="#troubleshooting">🔧 Troubleshooting Lab</a>' +
          '<a class="rd-action" href="#interview-chains">🎤 Follow-up chains</a>' +
          '<a class="rd-action" href="#study">🎴 Study deck quizzes</a>' +
        "</div>" +
        '<p class="rd-disclaimer">These scores reflect your practice coverage and accuracy in this browser — ' +
        "not a prediction of real interview success. Progress is stored locally and never leaves your device.</p>";
    },

    destroy: function () {}
  };

  AV.registerModule(module);
})();
