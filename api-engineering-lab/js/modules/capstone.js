/* ============================================================
   modules/capstone.js — Final Capstone
   Gated behind section mastery. When unlocked, a timed mixed exam
   (20 questions drawn across every module, weighted to advanced/
   senior) plus a design-review checkpoint → a printable completion
   report summarizing the skills the learner demonstrated.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});
  var N = 20;
  var RESULT_KEY = "apilab-capstone";

  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function stat(n, l) { return '<div class="stat"><div class="stat-num">' + n + '</div><div class="stat-label">' + l + "</div></div>"; }

  // Deterministic-ish shuffle seeded by time so each sitting differs.
  function pickQuestions() {
    var banks = (AV.data && AV.data.quizBanks) || {};
    var pool = [];
    Object.keys(banks).forEach(function (mod) {
      banks[mod].forEach(function (q) {
        var w = q.diff === "senior" ? 3 : q.diff === "advanced" ? 2 : 1;
        pool.push({ mod: mod, q: q, w: w });
      });
    });
    // weighted sample without replacement
    var chosen = [], used = {};
    var guard = 0;
    while (chosen.length < Math.min(N, pool.length) && guard < 5000) {
      guard++;
      var totalW = 0; pool.forEach(function (p, i) { if (!used[i]) totalW += p.w; });
      var r = Math.random() * totalW, acc = 0, pickIdx = -1;
      for (var i = 0; i < pool.length; i++) {
        if (used[i]) continue;
        acc += pool[i].w;
        if (r <= acc) { pickIdx = i; break; }
      }
      if (pickIdx === -1) break;
      used[pickIdx] = true;
      chosen.push(pool[pickIdx]);
    }
    return chosen;
  }

  var module = {
    id: "capstone",
    title: "Final Capstone",
    fullWidth: true,
    _timer: null,
    render: function (container) {
      var self = this;
      AV.ui && AV.ui.setDifficulty && AV.ui.setDifficulty("senior");

      var overall = AV.Mastery.overall();

      function drawGate() {
        container.innerHTML =
          '<div class="module-header animate-fade-in-up"><div class="module-eyebrow">Production &amp; Practice</div>' +
            '<h1 class="module-title">Final capstone</h1>' +
            '<p class="module-subtitle">The graduation exam: a timed, mixed assessment drawn from every topic in the lab. Unlock it by mastering each section — ≥80% on its quizzes, and the build exercises done.</p></div>' +

          '<div class="stat-row" style="margin-bottom:var(--space-6)">' +
            stat(overall.mastered + " / " + overall.total, "sections mastered") +
            stat(overall.capstoneUnlocked ? "✓" : "🔒", overall.capstoneUnlocked ? "unlocked" : "locked") +
          "</div>" +

          '<section class="section"><h2 class="section-title">Mastery gates</h2><div class="note-grid">' +
            overall.sections.map(function (s) {
              var bar = '<div class="lesson-progress-bar" style="width:100%;margin-top:var(--space-2)"><span style="width:' + s.quizPct + '%"></span></div>';
              return '<div class="panel"><div class="panel-title">' + (s.mastered ? "✅ " : s.counted ? "🔓 " : "🔒 ") + esc(s.group) + "</div>" +
                '<div class="text-sm">Quiz average: <b>' + s.quizPct + "%</b> " + (s.quizMastered ? "✓" : "(need 80%)") + "</div>" + bar +
                (s.build ? '<div class="text-sm" style="margin-top:var(--space-2)">' + (s.build.done ? "✅" : "⬜") + " " + esc(s.build.label) + ': <span class="text-muted">' + esc(s.build.detail) + "</span></div>" : "") +
                "</div>";
            }).join("") + "</div></section>" +

          (overall.capstoneUnlocked
            ? '<div style="margin-top:var(--space-6)"><button class="btn btn-primary" id="cap-start">▶ Start the capstone (' + N + ' questions, timed)</button></div>'
            : '<div class="callout info" style="margin-top:var(--space-6)"><span class="callout-icon">🔒</span><div class="callout-body">Master every section to unlock. Each section needs 80%+ quiz average (take or retake the Test-Yourself quizzes) and its build exercises completed.</div></div>') +

          lastReport();

        var sb = container.querySelector("#cap-start");
        if (sb) sb.addEventListener("click", startExam);
      }

      function lastReport() {
        var prev = null;
        try { prev = JSON.parse(localStorage.getItem(RESULT_KEY)); } catch (e) {}
        if (!prev) return "";
        return '<section class="section" style="margin-top:var(--space-6)"><h2 class="section-title">Your last result</h2>' +
          '<div class="panel"><div class="stat-row"><div class="stat"><div class="stat-num gradient-text">' + prev.pct + '%</div><div class="stat-label">' + prev.score + " / " + prev.total + '</div></div>' +
          '<div class="stat"><div class="stat-num">' + (prev.pct >= 80 ? "Pass" : "Retry") + '</div><div class="stat-label">' + esc(prev.date || "") + '</div></div></div>' +
          '<button class="btn btn-ghost btn-sm" id="cap-report-again">📄 View completion report</button></div></section>';
      }

      function startExam() {
        var questions = pickQuestions();
        if (!questions.length) { drawGate(); return; }
        var i = 0, score = 0;
        var answers = [];
        var startTs = Date.now();
        var LIMIT = N * 60 * 1000; // ~1 min/question

        function tick() {
          var left = Math.max(0, LIMIT - (Date.now() - startTs));
          var el = container.querySelector("#cap-clock");
          if (!el) return;
          var m = Math.floor(left / 60000), s = Math.floor((left % 60000) / 1000);
          el.textContent = m + ":" + (s < 10 ? "0" : "") + s;
          if (left <= 0) { finish(); }
        }

        function renderQ() {
          var entry = questions[i];
          var q = entry.q;
          container.innerHTML =
            '<div class="module-header"><div class="module-eyebrow">Final Capstone · <span id="cap-clock"></span> left</div>' +
              '<h1 class="module-title" style="font-size:1.4rem">Question ' + (i + 1) + " / " + questions.length + '</h1>' +
              '<div class="lesson-progress-bar" style="width:100%"><span style="width:' + Math.round(i / questions.length * 100) + '%"></span></div></div>' +
            '<div class="panel ty-section">' +
              '<div class="ty-progress"><a href="#' + entry.mod + '" class="text-muted">' + esc((AV.routes[entry.mod] || {}).title || entry.mod) + '</a> · <span class="ty-diff ty-' + q.diff + '">' + q.diff + "</span></div>" +
              (q.code ? '<div class="ty-code" id="cap-code"></div>' : "") +
              '<div class="ty-q">' + q.q + "</div>" +
              '<div class="ty-options">' + q.options.map(function (o, oi) {
                return '<button class="ty-option" data-i="' + oi + '"><span class="ty-key">' + String.fromCharCode(65 + oi) + "</span><span>" + o + "</span></button>";
              }).join("") + "</div><div class=\"ty-fb\" hidden></div></div>";
          if (q.code) { var ch = container.querySelector("#cap-code"); if (ch && AV.CodeViewer) ch.appendChild(AV.CodeViewer.create({ title: "", lang: "http", code: q.code })); }
          var answered = false;
          container.querySelectorAll(".ty-option").forEach(function (btn) {
            btn.addEventListener("click", function () {
              if (answered) return;
              answered = true;
              var chosen = parseInt(btn.getAttribute("data-i"), 10);
              var correct = chosen === q.answer;
              if (correct) score++;
              answers.push({ mod: entry.mod, diff: q.diff, correct: correct });
              if (!correct && AV.Review) AV.Review.addMiss(entry.mod, q.q);
              container.querySelectorAll(".ty-option").forEach(function (b, bi) {
                b.disabled = true;
                if (bi === q.answer) b.classList.add("ty-correct");
                else if (bi === chosen) b.classList.add("ty-wrong");
              });
              var fb = container.querySelector(".ty-fb");
              fb.hidden = false;
              fb.className = "ty-fb " + (correct ? "ty-fb-right" : "ty-fb-wrong");
              fb.innerHTML = "<b>" + (correct ? "✓ Correct" : "✗ Not quite") + "</b> " + q.why +
                '<button class="ty-next btn btn-primary">' + (i === questions.length - 1 ? "Finish →" : "Next →") + "</button>";
              fb.querySelector(".ty-next").addEventListener("click", function () { i++; if (i >= questions.length) finish(); else renderQ(); });
            });
          });
          tick();
        }

        function finish() {
          if (self._timer) { clearInterval(self._timer); self._timer = null; }
          var total = answers.length || questions.length;
          var pct = Math.round(score / total * 100);
          // per-section breakdown
          var bySec = {};
          answers.forEach(function (a) {
            var g = (AV.routes[a.mod] || {}).group || "Other";
            if (!bySec[g]) bySec[g] = { right: 0, n: 0 };
            bySec[g].n++; if (a.correct) bySec[g].right++;
          });
          var report = { pct: pct, score: score, total: total, date: new Date().toISOString().slice(0, 10), bySec: bySec, mins: Math.round((Date.now() - startTs) / 60000) };
          try { localStorage.setItem(RESULT_KEY, JSON.stringify(report)); } catch (e) {}
          drawReport(report, true);
        }

        self._timer = setInterval(tick, 1000);
        renderQ();
      }

      function drawReport(report, justFinished) {
        var pass = report.pct >= 80;
        var secRows = Object.keys(report.bySec || {}).map(function (g) {
          var s = report.bySec[g];
          var p = Math.round(s.right / s.n * 100);
          return '<tr><td>' + esc(g) + '</td><td class="mono">' + s.right + " / " + s.n + '</td><td class="mono">' + p + "%</td></tr>";
        }).join("");
        container.innerHTML =
          '<div class="module-header animate-fade-in-up"><div class="module-eyebrow">Final Capstone · Completion report</div>' +
            '<h1 class="module-title gradient-text">' + (pass ? "Passed — API Engineering" : "Not yet — " + report.pct + "%") + '</h1>' +
            '<p class="module-subtitle">' + (justFinished ? "" : "Your most recent sitting. ") +
              (pass ? "You demonstrated working knowledge across HTTP, REST design, architecture, implementation, security, performance and production practice — and built, validated, and reviewed real API artifacts along the way." : "Close the gaps below and sit it again — the questions are drawn fresh each time.") + "</p></div>" +

          '<div class="stat-row" style="margin-bottom:var(--space-6)">' +
            stat(report.pct + "%", report.score + " / " + report.total) +
            stat(report.mins + "m", "time taken") +
            stat(report.date, "date") +
          "</div>" +

          '<section class="section"><h2 class="section-title">By section</h2><div class="panel" style="overflow-x:auto">' +
            '<table class="dtable"><thead><tr><th>Section</th><th>Score</th><th>%</th></tr></thead><tbody>' + secRows + "</tbody></table></div></section>" +

          '<section class="section" style="margin-top:var(--space-5)"><h2 class="section-title">Demonstrated skills</h2><div class="panel"><ul class="tick-list">' +
            '<li>✅ Built 16 Express handlers/middleware that pass automated tests (routing, validation, authn/authz, idempotency, parameterized SQL)</li>' +
            '<li>✅ Validated and repaired OpenAPI contracts against a structural validator</li>' +
            '<li>✅ Designed and defended a returns/refunds API against a senior review rubric</li>' +
            '<li>✅ Answered ' + report.total + ' mixed questions spanning every section at ' + report.pct + '%</li>' +
          "</ul></div></section>" +

          '<div style="margin-top:var(--space-6)" class="chiprow">' +
            '<button class="btn btn-primary" id="cap-print">🖨️ Print / save as PDF</button>' +
            '<button class="btn btn-ghost" id="cap-back">← Back to capstone</button>' +
            (pass ? "" : '<a class="btn btn-ghost" href="#review">Review weak areas →</a>') +
          "</div>";

        container.querySelector("#cap-print").addEventListener("click", function () { window.print(); });
        container.querySelector("#cap-back").addEventListener("click", function () { overall = AV.Mastery.overall(); drawGate(); });
      }

      // entry: if a report exists and button clicked later
      drawGate();
      container.addEventListener("click", function (e) {
        if (e.target && e.target.id === "cap-report-again") {
          var prev = null; try { prev = JSON.parse(localStorage.getItem(RESULT_KEY)); } catch (er) {}
          if (prev) drawReport(prev, false);
        }
      });
    },
    destroy: function () { if (this._timer) { clearInterval(this._timer); this._timer = null; } }
  };

  AV.registerModule(module);
})();
