/* ============================================================
   choose-approach.js — "pick the right approach" trade-off mechanic
   ------------------------------------------------------------
   The app already has right/wrong MCQs; this adds the missing
   decision mechanic: given a requirement, choose an approach, then
   see WHY each option is best / viable / wrong, plus what changes if
   the requirement changes. Powers "Choose the Right Primitive" and
   (later) the Pipeline Design decisions.

     AV.ChooseApproach.create(scenario, onBack) -> { el, destroy }

   Scenario shape (see js/data/prep/choose.js):
     { id, title, category, difficulty, requirement,
       options: [ { label, verdict: "best"|"viable"|"wrong", why } ],
       whatIfChanged, interview? }

   Records to AV.Progress ("choose"): correct when the "best" option
   is chosen. Content is trusted HTML (authored in-repo). ES5-safe.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  var DIFF = { easy: "Concept", med: "Applied", hard: "Production" };
  var VLAB = { best: "Best choice", viable: "Viable", wrong: "Not ideal" };

  function create(scn, onBack) {
    var el = document.createElement("div");
    el.className = "ca";
    var answered = false;

    function header() {
      return '<div class="ca-head">' +
          '<div class="ca-title">' + scn.title + "</div>" +
          '<div class="prep-badges">' +
            '<span class="prep-badge cat">' + scn.category + "</span>" +
            '<span class="prep-badge diff-' + scn.difficulty + '">' +
              (DIFF[scn.difficulty] || scn.difficulty) + "</span>" +
          "</div>" +
        "</div>" +
        '<div class="callout info ca-req"><span class="callout-icon">🧭</span>' +
          '<div class="callout-body"><b>Requirement.</b> ' + scn.requirement + "</div></div>";
    }

    function renderOptions(chosen) {
      return scn.options.map(function (o, i) {
        if (chosen == null) {
          return '<button class="ca-opt" data-i="' + i + '">' + o.label + "</button>";
        }
        return '<div class="ca-opt revealed v-' + o.verdict + (i === chosen ? " chosen" : "") + '">' +
          '<div class="ca-opt-label">' + o.label +
            '<span class="ca-verdict v-' + o.verdict + '">' + VLAB[o.verdict] + "</span></div>" +
          '<div class="ca-why">' + o.why + "</div></div>";
      }).join("");
    }

    function renderInitial() {
      el.querySelector(".ca-body").innerHTML = '<div class="ca-opts">' + renderOptions(null) + "</div>";
    }

    function reveal(chosen) {
      answered = true;
      var opt = scn.options[chosen];
      if (AV.Progress) {
        AV.Progress.record("choose", scn.id, { correct: opt.verdict === "best", category: scn.category });
      }
      var best = null;
      scn.options.forEach(function (o) { if (o.verdict === "best") best = o; });
      var msg = opt.verdict === "best"
        ? '<div class="ca-result good">✓ That\'s the strongest choice.</div>'
        : opt.verdict === "viable"
          ? '<div class="ca-result mid">◐ Viable — but not the strongest.' +
            (best ? " The best fit is <b>" + best.label + "</b>." : "") + "</div>"
          : '<div class="ca-result bad">✗ Not the best fit.' +
            (best ? " The strongest choice is <b>" + best.label + "</b>." : "") + "</div>";
      el.querySelector(".ca-body").innerHTML =
        msg +
        '<div class="ca-opts">' + renderOptions(chosen) + "</div>" +
        (scn.whatIfChanged
          ? '<div class="callout info ca-whatif"><span class="callout-icon">🔀</span>' +
            '<div class="callout-body"><b>What if the requirement changes?</b> ' + scn.whatIfChanged + "</div></div>"
          : "") +
        (scn.interview
          ? '<div class="callout tip"><span class="callout-icon">🎤</span>' +
            '<div class="callout-body">' + scn.interview + "</div></div>"
          : "") +
        '<div class="ca-actions">' +
          '<button class="btn btn-primary ca-back">← All decisions</button>' +
          '<button class="btn btn-secondary ca-retry">Try again ↻</button>' +
        "</div>";
    }

    el.addEventListener("click", function (e) {
      var opt = e.target.closest && e.target.closest(".ca-opt[data-i]");
      if (opt && !answered) { reveal(parseInt(opt.getAttribute("data-i"), 10)); return; }
      if (e.target.closest && e.target.closest(".ca-retry")) { answered = false; renderInitial(); return; }
      if (e.target.closest && e.target.closest(".ca-back")) { if (typeof onBack === "function") onBack(); return; }
    });

    el.innerHTML = header() + '<div class="ca-body"></div>';
    renderInitial();
    return { el: el, destroy: function () {} };
  }

  AV.ChooseApproach = { create: create };
})();
