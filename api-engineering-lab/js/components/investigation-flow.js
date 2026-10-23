/* ============================================================
   investigation-flow.js — interactive troubleshooting decision flow
   ------------------------------------------------------------
   The app already has a *linear* failure playbook; this adds the
   missing interactive piece: the learner observes a production
   symptom and, at each step, chooses what to check next. A correct
   choice reveals the evidence + why it's the right next check and
   advances; a wrong choice explains the misconception and lets them
   try again. Reaching the end reveals root cause, resolution,
   prevention and a spoken interview answer, and records the result.

     AV.InvestigationFlow.create(scenario, onBack) -> { el, destroy }

   Scenario shape (see js/data/prep/troubleshooting.js):
     { id, category, difficulty, icon, title, symptom,
       steps: [ { prompt, checks: [
           { label, correct:true,  evidence, reasoning } |
           { label, correct:false, why } ] } ],
       rootCause, resolution, prevention, interviewAnswer }

   Content fields are trusted HTML (authored in-repo), matching how
   every other module treats its strings. No dependencies, ES5-safe.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  var DIFF_LABEL = { easy: "Concept", med: "Applied", hard: "Production" };

  function create(scn, onBack) {
    var el = document.createElement("div");
    el.className = "inv";
    var state = { step: 0, misses: 0, picks: 0 };

    function head() {
      return (
        '<div class="inv-head">' +
          '<span class="inv-icon">' + (scn.icon || "🔧") + "</span>" +
          '<div class="inv-head-main">' +
            '<div class="inv-title">' + scn.title + "</div>" +
            '<div class="prep-badges">' +
              '<span class="prep-badge cat">' + scn.category + "</span>" +
              '<span class="prep-badge diff-' + scn.difficulty + '">' +
                (DIFF_LABEL[scn.difficulty] || scn.difficulty) + "</span>" +
            "</div>" +
          "</div>" +
        "</div>" +
        '<div class="callout warn inv-symptom"><span class="callout-icon">🔎</span>' +
          '<div class="callout-body"><b>Symptom.</b> ' + scn.symptom + "</div></div>"
      );
    }

    function renderStep() {
      var st = scn.steps[state.step];
      var opts = st.checks.map(function (ck, i) {
        return '<button class="inv-check" data-i="' + i + '">' + ck.label + "</button>";
      }).join("");
      el.querySelector(".inv-flow").innerHTML =
        '<div class="inv-step">' +
          '<div class="inv-progress">Investigation · step ' + (state.step + 1) +
            " / " + scn.steps.length + "</div>" +
          '<div class="inv-prompt">' + st.prompt + "</div>" +
          '<div class="inv-checks">' + opts + "</div>" +
          '<div class="inv-fb"></div>' +
        "</div>";
    }

    function conclBlock(label, body, kind) {
      return body
        ? '<div class="inv-concl-row inv-' + kind + '">' +
            '<span class="inv-concl-tag">' + label + "</span>" +
            '<div class="inv-concl-body">' + body + "</div></div>"
        : "";
    }

    function renderConclusion() {
      var clean = state.misses === 0;
      if (AV.Progress) {
        AV.Progress.record("troubleshooting", scn.id, {
          solved: true, clean: clean, misses: state.misses, category: scn.category
        });
      }
      el.querySelector(".inv-flow").innerHTML =
        '<div class="inv-done">' +
          '<div class="inv-done-head">' +
            (clean
              ? "✅ Solved cleanly — no wrong turns."
              : "✅ Root cause found — " + state.misses + " wrong turn" +
                (state.misses === 1 ? "" : "s") + " on the way.") +
          "</div>" +
          '<div class="inv-concl">' +
            conclBlock("Root cause", scn.rootCause, "root") +
            conclBlock("Resolution", scn.resolution, "fix") +
            conclBlock("Prevention", scn.prevention, "prev") +
          "</div>" +
          (scn.interviewAnswer
            ? '<div class="callout tip inv-interview"><span class="callout-icon">🎤</span>' +
              '<div class="callout-body"><b>Say it in an interview.</b> ' +
              scn.interviewAnswer + "</div></div>"
            : "") +
          '<div class="inv-actions">' +
            '<button class="btn btn-primary inv-back">← All scenarios</button>' +
            '<button class="btn btn-secondary inv-retry">Redo this one ↻</button>' +
          "</div>" +
        "</div>";
    }

    el.addEventListener("click", function (e) {
      var btn = e.target.closest && e.target.closest(".inv-check");
      if (btn && !btn.disabled) {
        var st = scn.steps[state.step];
        var ck = st.checks[parseInt(btn.getAttribute("data-i"), 10)];
        var fb = el.querySelector(".inv-fb");
        state.picks++;
        if (ck.correct) {
          btn.classList.add("correct");
          el.querySelectorAll(".inv-check").forEach(function (b) { b.disabled = true; });
          var last = state.step === scn.steps.length - 1;
          var d = document.createElement("div");
          d.className = "inv-correct";
          d.innerHTML =
            '<div class="inv-evidence"><span class="inv-tag">Evidence</span><div>' +
              ck.evidence + "</div></div>" +
            '<div class="inv-reason"><span class="inv-tag ok">Why this is the right next check</span><div>' +
              ck.reasoning + "</div></div>" +
            '<button class="btn btn-primary inv-next">' +
              (last ? "See root cause →" : "Next check →") + "</button>";
          fb.appendChild(d);
        } else {
          btn.classList.add("wrong");
          btn.disabled = true;
          state.misses++;
          var m = document.createElement("div");
          m.className = "inv-miss";
          m.innerHTML =
            '<span class="inv-tag bad">Not the strongest next move</span><div>' +
            ck.why + "</div>";
          fb.appendChild(m);
        }
        return;
      }
      if (e.target.closest && e.target.closest(".inv-next")) {
        state.step++;
        if (state.step >= scn.steps.length) renderConclusion();
        else renderStep();
        return;
      }
      if (e.target.closest && e.target.closest(".inv-retry")) {
        state = { step: 0, misses: 0, picks: 0 };
        renderStep();
        return;
      }
      if (e.target.closest && e.target.closest(".inv-back")) {
        if (typeof onBack === "function") onBack();
        return;
      }
    });

    el.innerHTML = head() + '<div class="inv-flow"></div>';
    renderStep();

    return { el: el, destroy: function () {} };
  }

  AV.InvestigationFlow = { create: create };
})();
