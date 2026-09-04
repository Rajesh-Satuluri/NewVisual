/* ============================================================
   test-yourself.js — per-module mini-quiz appended by the router
   Reads AirflowViz.data.quizBanks[routeId]; grades, explains, and
   persists a best score. No-ops when a module has no bank.
   AirflowViz.TestYourself.{ create, append, has }
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});
  function banks() { return (AV.data && AV.data.quizBanks) || {}; }
  function bestKey(id) { return "afviz-quiz-" + id; }
  function readBest(id) { try { return parseInt(localStorage.getItem(bestKey(id)), 10) || 0; } catch (e) { return 0; } }
  function writeBest(id, v) { try { if (v > readBest(id)) localStorage.setItem(bestKey(id), String(v)); } catch (e) {} }

  function create(id) {
    var qs = banks()[id];
    if (!qs || !qs.length) return null;
    var sec = document.createElement("section");
    sec.className = "section ty-section";
    var state = { idx: 0, score: 0, answered: false };
    sec.innerHTML =
      '<div class="ty-head"><span class="ty-badge">✅ Test Yourself</span><span class="ty-best"></span></div>' +
      '<div class="ty-body"></div>';
    var body = sec.querySelector(".ty-body");
    var bestEl = sec.querySelector(".ty-best");
    function updBest() { var b = readBest(id); bestEl.textContent = b ? "Best: " + b + " / " + qs.length : ""; }
    updBest();

    function renderQ() {
      state.answered = false;
      var item = qs[state.idx];
      body.innerHTML =
        '<div class="ty-progress">Question ' + (state.idx + 1) + " / " + qs.length +
          ' · <span class="ty-diff ty-' + item.diff + '">' + item.diff + "</span></div>" +
        '<div class="ty-q">' + item.q + "</div>" +
        '<div class="ty-options">' + item.options.map(function (o, i) {
          return '<button class="ty-option" data-i="' + i + '"><span class="ty-key">' +
            String.fromCharCode(65 + i) + "</span><span>" + o + "</span></button>";
        }).join("") + "</div>" +
        '<div class="ty-fb" hidden></div>';
    }
    function renderResult() {
      var pct = Math.round(state.score / qs.length * 100);
      writeBest(id, state.score); updBest();
      var msg = pct === 100 ? "Perfect — you know this cold." : pct >= 67 ? "Solid grasp of this topic." : "Worth another pass through the module.";
      body.innerHTML =
        '<div class="ty-result"><div class="ty-score gradient-text">' + state.score + " / " + qs.length + "</div>" +
        '<div class="ty-pct">' + pct + "% · " + msg + "</div>" +
        '<button class="ty-retry btn btn-primary">Try again ↻</button></div>';
    }

    body.addEventListener("click", function (e) {
      var opt = e.target.closest(".ty-option");
      if (opt && !state.answered) {
        state.answered = true;
        var chosen = parseInt(opt.getAttribute("data-i"), 10);
        var item = qs[state.idx];
        var correct = chosen === item.answer;
        if (correct) state.score++;
        body.querySelectorAll(".ty-option").forEach(function (b, i) {
          b.disabled = true;
          if (i === item.answer) b.classList.add("ty-correct");
          else if (i === chosen) b.classList.add("ty-wrong");
        });
        var fb = body.querySelector(".ty-fb");
        fb.hidden = false;
        fb.className = "ty-fb " + (correct ? "ty-fb-right" : "ty-fb-wrong");
        fb.innerHTML = "<b>" + (correct ? "✓ Correct" : "✗ Not quite") + "</b> " + item.why +
          '<button class="ty-next btn btn-primary">' + (state.idx === qs.length - 1 ? "See score →" : "Next →") + "</button>";
        return;
      }
      if (e.target.closest(".ty-next")) { state.idx++; if (state.idx >= qs.length) renderResult(); else renderQ(); return; }
      if (e.target.closest(".ty-retry")) { state = { idx: 0, score: 0, answered: false }; renderQ(); return; }
    });

    renderQ();
    return sec;
  }

  function append(c, id) { if (!c) return; var el = create(id); if (el) c.appendChild(el); }
  AV.TestYourself = { create: create, append: append, has: function (id) { return !!banks()[id]; } };
})();
