/* ============================================================
   modules/review.js — Spaced Review
   Resurfaces missed Test-Yourself questions on a 1/3/7-day
   schedule (AV.Review). Answer right → the interval grows; wrong
   → back to day 1. Graduated items leave the queue.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  function fmtDue(ts) {
    var ms = ts - Date.now();
    if (ms <= 0) return "now";
    var h = Math.round(ms / (60 * 60 * 1000));
    if (h < 24) return "in " + h + "h";
    return "in " + Math.round(h / 24) + "d";
  }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  var module = {
    id: "review",
    title: "Spaced Review",
    render: function (container) {
      AV.ui && AV.ui.setDifficulty && AV.ui.setDifficulty(null);

      function draw() {
        var counts = AV.Review.counts();
        var due = AV.Review.dueItems();
        var upcoming = AV.Review.upcoming();

        container.innerHTML =
          '<div class="module-header animate-fade-in-up"><div class="module-eyebrow">Production &amp; Practice</div>' +
            '<h1 class="module-title">Spaced review</h1>' +
            '<p class="module-subtitle">Questions you miss in any module\'s Test-Yourself come here. Review brings them back after 1, then 3, then 7 days — the schedule that actually moves knowledge into long-term memory. Get one right three reviews running and it graduates out.</p></div>' +

          '<div class="stat-row" style="margin-bottom:var(--space-6)">' +
            stat(counts.due, "due now") + stat(upcoming.length, "scheduled later") + stat(counts.total, "in rotation") +
          "</div>" +

          (counts.total === 0
            ? '<div class="panel"><div class="panel-title">Nothing to review yet</div><p class="text-muted">Take the Test-Yourself quiz under any module. Anything you miss lands here for spaced practice. <a href="#fundamentals">Start with Fundamentals →</a></p></div>'
            : '<div id="rv-stage"></div>') +

          (due.length ? '<div style="margin-top:var(--space-4)"><button class="btn btn-primary" id="rv-start">▶ Review ' + due.length + " due question" + (due.length > 1 ? "s" : "") + "</button></div>" : "") +

          (upcoming.length
            ? '<section class="section" style="margin-top:var(--space-6)"><h2 class="section-title">Coming up</h2><div class="panel"><ul class="tick-list">' +
                upcoming.slice(0, 12).map(function (u) {
                  var r = AV.routes[u.item.mod] || {};
                  return "<li>🕑 <b>" + fmtDue(u.item.due) + "</b> · <a href=\"#" + u.item.mod + "\">" + esc(r.title || u.item.mod) + "</a> <span class=\"text-muted text-sm\">" + esc(u.item.q.slice(0, 70)) + (u.item.q.length > 70 ? "…" : "") + "</span></li>";
                }).join("") + "</ul></div></section>"
            : "") +

          (counts.total ? '<div style="margin-top:var(--space-6)"><button class="btn btn-ghost btn-sm" id="rv-reset">↺ Clear review queue</button></div>' : "");

        var startBtn = container.querySelector("#rv-start");
        if (startBtn) startBtn.addEventListener("click", function () { runSession(due.slice()); });
        var resetBtn = container.querySelector("#rv-reset");
        if (resetBtn) resetBtn.addEventListener("click", function () { if (confirm("Clear the whole spaced-review queue?")) { AV.Review.reset(); draw(); } });
      }

      function runSession(queue) {
        var stage = container.querySelector("#rv-stage");
        container.querySelector("#rv-start").disabled = true;
        var i = 0, right = 0;

        function next() {
          if (i >= queue.length) {
            stage.innerHTML = '<div class="panel"><div class="panel-title">Session complete</div>' +
              '<div class="stat-row"><div class="stat"><div class="stat-num gradient-text">' + right + " / " + queue.length + '</div><div class="stat-label">correct this round</div></div></div>' +
              '<p class="text-muted">Correct answers move further out (3d → 7d → graduated); misses come back tomorrow. Come back when more are due.</p>' +
              '<button class="btn btn-primary btn-sm" id="rv-again">Back to review</button></div>';
            stage.querySelector("#rv-again").addEventListener("click", draw);
            return;
          }
          var entry = queue[i];
          var q = AV.Review.findQuestion(entry.item);
          if (!q) { // bank changed and the question is gone — drop it
            AV.Review.grade(entry.key, true); i++; next(); return;
          }
          var answered = false;
          stage.innerHTML =
            '<div class="panel ty-section"><div class="ty-head"><span class="ty-badge">🔁 Review ' + (i + 1) + " / " + queue.length + '</span>' +
              '<span class="ty-best"><a href="#' + entry.item.mod + '">' + esc((AV.routes[entry.item.mod] || {}).title || entry.item.mod) + "</a></span></div>" +
            (q.code ? '<div class="ty-code" id="rv-code"></div>' : "") +
            '<div class="ty-q">' + q.q + "</div>" +
            '<div class="ty-options">' + q.options.map(function (o, oi) {
              return '<button class="ty-option" data-i="' + oi + '"><span class="ty-key">' + String.fromCharCode(65 + oi) + "</span><span>" + o + "</span></button>";
            }).join("") + "</div><div class=\"ty-fb\" hidden></div></div>";
          if (q.code) {
            var ch = stage.querySelector("#rv-code");
            if (ch && AV.CodeViewer) ch.appendChild(AV.CodeViewer.create({ title: "", lang: "http", code: q.code }));
          }
          stage.querySelectorAll(".ty-option").forEach(function (btn) {
            btn.addEventListener("click", function () {
              if (answered) return;
              answered = true;
              var chosen = parseInt(btn.getAttribute("data-i"), 10);
              var correct = chosen === q.answer;
              if (correct) right++;
              AV.Review.grade(entry.key, correct);
              stage.querySelectorAll(".ty-option").forEach(function (b, bi) {
                b.disabled = true;
                if (bi === q.answer) b.classList.add("ty-correct");
                else if (bi === chosen) b.classList.add("ty-wrong");
              });
              var fb = stage.querySelector(".ty-fb");
              fb.hidden = false;
              fb.className = "ty-fb " + (correct ? "ty-fb-right" : "ty-fb-wrong");
              fb.innerHTML = "<b>" + (correct ? "✓ Correct" : "✗ Not quite") + "</b> " + q.why +
                '<button class="ty-next btn btn-primary">' + (i === queue.length - 1 ? "Finish →" : "Next →") + "</button>";
              fb.querySelector(".ty-next").addEventListener("click", function () { i++; next(); });
            });
          });
        }
        next();
      }

      draw();
    },
    destroy: function () {}
  };

  function stat(n, l) { return '<div class="stat"><div class="stat-num">' + n + '</div><div class="stat-label">' + l + "</div></div>"; }

  AV.registerModule(module);
})();
