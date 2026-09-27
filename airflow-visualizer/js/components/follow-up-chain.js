/* ============================================================
   follow-up-chain.js — progressive interview drill component
   ------------------------------------------------------------
   Simulates how a real interviewer keeps drilling: one topic, a
   chain of questions that each go deeper based on the last. For each
   question the learner thinks, reveals the model answer (expected
   answer + key concepts + common mistakes + a senior-level answer),
   self-rates (Got it / Partial / Missed), then the interviewer
   "follows up" with the next, harder question.

     AV.FollowUpChain.create(chain, onBack) -> { el, destroy }

   Chain shape (see js/data/prep/chains.js):
     { id, topic, category, note?, steps: [
         { q, expectedAnswer, keyConcepts:[…], commonMistakes:[…],
           seniorAnswer } ] }

   Self-ratings are recorded through AV.Progress (category "chains")
   so the Readiness Dashboard can reflect them. Content fields are
   trusted HTML (authored in-repo). No dependencies, ES5-safe.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  var RATE = { got: "Got it", partial: "Partly", missed: "Missed" };

  function create(chain, onBack) {
    var el = document.createElement("div");
    el.className = "fuc";
    var state = { step: 0, got: 0, partial: 0, missed: 0 };

    function stepLabel(i) {
      return i === 0 ? "Opening question" : "Follow-up " + i;
    }

    function head() {
      return (
        '<div class="fuc-head">' +
          '<div class="fuc-topic">' + chain.topic + "</div>" +
          '<div class="prep-badges">' +
            '<span class="prep-badge cat">' + (chain.category || "interview") + "</span>" +
            '<span class="prep-badge steps">' + chain.steps.length + " questions · gets harder</span>" +
          "</div>" +
          (chain.note ? '<p class="fuc-note">' + chain.note + "</p>" : "") +
        "</div>"
      );
    }

    function list(cls, items) {
      if (!items || !items.length) return "";
      return '<ul class="' + cls + '">' + items.map(function (x) {
        return "<li>" + x + "</li>";
      }).join("") + "</ul>";
    }

    function chips(items) {
      if (!items || !items.length) return "";
      return '<div class="fuc-chips">' + items.map(function (x) {
        return '<span class="fuc-chip">' + x + "</span>";
      }).join("") + "</div>";
    }

    function renderStep() {
      var st = chain.steps[state.step];
      el.querySelector(".fuc-flow").innerHTML =
        '<div class="fuc-step">' +
          '<div class="fuc-progress">' + stepLabel(state.step) +
            " · " + (state.step + 1) + " / " + chain.steps.length + "</div>" +
          '<div class="fuc-q"><span class="fuc-q-mark">🎤</span><div>' + st.q + "</div></div>" +
          '<div class="fuc-hint">Answer it in your head, out loud, or jot notes — then reveal the model answer.</div>' +
          '<button class="btn btn-primary fuc-reveal">Reveal model answer</button>' +
          '<div class="fuc-answer" hidden></div>' +
        "</div>";
    }

    function revealAnswer() {
      var st = chain.steps[state.step];
      var box = el.querySelector(".fuc-answer");
      var last = state.step === chain.steps.length - 1;
      box.innerHTML =
        '<div class="fuc-a-row"><span class="fuc-tag">Expected answer</span><div>' +
          st.expectedAnswer + "</div></div>" +
        (st.keyConcepts && st.keyConcepts.length
          ? '<div class="fuc-a-row"><span class="fuc-tag">Key concepts</span>' + chips(st.keyConcepts) + "</div>"
          : "") +
        (st.commonMistakes && st.commonMistakes.length
          ? '<div class="fuc-a-row"><span class="fuc-tag bad">Common mistakes</span>' +
            list("fuc-mistakes", st.commonMistakes) + "</div>"
          : "") +
        (st.seniorAnswer
          ? '<div class="callout tip fuc-senior"><span class="callout-icon">⭐</span>' +
            '<div class="callout-body"><b>Senior-level answer.</b> ' + st.seniorAnswer + "</div></div>"
          : "") +
        '<div class="fuc-rate"><span class="fuc-rate-label">How did you do?</span>' +
          '<button class="fuc-rate-btn got" data-rate="got">Got it</button>' +
          '<button class="fuc-rate-btn partial" data-rate="partial">Partly</button>' +
          '<button class="fuc-rate-btn missed" data-rate="missed">Missed</button>' +
        "</div>" +
        (last ? "" : '<div class="fuc-next-hint">Rate yourself — the interviewer will follow up.</div>');
      box.hidden = false;
      el.querySelector(".fuc-reveal").disabled = true;
    }

    function advance(rate) {
      state[rate]++;
      if (AV.Progress) {
        AV.Progress.record("chains", chain.id + "#" + state.step, {
          rate: rate, topic: chain.topic
        });
      }
      state.step++;
      if (state.step >= chain.steps.length) renderSummary();
      else renderStep();
    }

    function renderSummary() {
      var n = chain.steps.length;
      if (AV.Progress) {
        AV.Progress.record("chains", chain.id, {
          done: true, got: state.got, total: n, category: chain.category
        });
      }
      var verdict = state.got === n
        ? "You held up under the full drill — strong."
        : state.got + state.partial >= Math.ceil(n / 2)
          ? "Solid, with a couple of spots to tighten."
          : "This chain is worth another pass — the follow-ups are where interviews are won.";
      el.querySelector(".fuc-flow").innerHTML =
        '<div class="fuc-summary">' +
          '<div class="fuc-sum-head">Chain complete · ' + chain.topic + "</div>" +
          '<div class="fuc-sum-tallies">' +
            '<span class="fuc-tally got">' + state.got + " got it</span>" +
            '<span class="fuc-tally partial">' + state.partial + " partly</span>" +
            '<span class="fuc-tally missed">' + state.missed + " missed</span>" +
          "</div>" +
          '<p class="fuc-sum-verdict">' + verdict + "</p>" +
          '<div class="fuc-actions">' +
            '<button class="btn btn-primary fuc-back">← All chains</button>' +
            '<button class="btn btn-secondary fuc-retry">Run it again ↻</button>' +
          "</div>" +
        "</div>";
    }

    el.addEventListener("click", function (e) {
      if (e.target.closest && e.target.closest(".fuc-reveal")) { revealAnswer(); return; }
      var rb = e.target.closest && e.target.closest(".fuc-rate-btn");
      if (rb) { advance(rb.getAttribute("data-rate")); return; }
      if (e.target.closest && e.target.closest(".fuc-retry")) {
        state = { step: 0, got: 0, partial: 0, missed: 0 };
        renderStep();
        return;
      }
      if (e.target.closest && e.target.closest(".fuc-back")) {
        if (typeof onBack === "function") onBack();
        return;
      }
    });

    el.innerHTML = head() + '<div class="fuc-flow"></div>';
    renderStep();

    return { el: el, destroy: function () {} };
  }

  AV.FollowUpChain = { create: create };
})();
