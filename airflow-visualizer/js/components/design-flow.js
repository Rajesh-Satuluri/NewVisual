/* ============================================================
   design-flow.js — "Design an Airflow Pipeline" guided decisions
   ------------------------------------------------------------
   A business brief, a sequence of design decisions (each a trade-off
   pick that reveals why each option is best/viable/wrong), then an
   interview-quality reference architecture.

     AV.DesignFlow.create(design, onBack) -> { el, destroy }

   design: { id, title, category, brief, requirements:[…],
             decisions: [ { q, options:[{label,verdict,why}] } ],
             reference: { summary, stages:[{name,detail}], notes:[…] } }

   Reuses the .ca-opt option styling from choose-approach. Records to
   AV.Progress ("design"). Content is trusted HTML. ES5-safe.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});
  var VLAB = { best: "Best choice", viable: "Viable", wrong: "Not ideal" };

  function create(design, onBack) {
    var el = document.createElement("div");
    el.className = "df";
    var step = 0, answered = false;

    function header() {
      return '<div class="df-head"><div class="df-title">' + design.title + "</div>" +
          '<div class="prep-badges"><span class="prep-badge cat">' + design.category + "</span>" +
            '<span class="prep-badge steps">' + design.decisions.length + " design decisions</span></div></div>" +
        '<div class="callout info df-brief"><span class="callout-icon">📦</span>' +
          '<div class="callout-body"><b>Brief.</b> ' + design.brief +
          (design.requirements && design.requirements.length
            ? '<ul class="df-reqs">' + design.requirements.map(function (r) { return "<li>" + r + "</li>"; }).join("") + "</ul>"
            : "") +
          "</div></div>";
    }

    function renderDecision() {
      answered = false;
      var d = design.decisions[step];
      el.querySelector(".df-body").innerHTML =
        '<div class="df-step"><div class="df-progress">Design decision ' + (step + 1) + " / " + design.decisions.length + "</div>" +
        '<div class="df-q">' + d.q + "</div>" +
        '<div class="df-opts">' + d.options.map(function (o, i) {
          return '<button class="ca-opt" data-i="' + i + '">' + o.label + "</button>";
        }).join("") + "</div>" +
        '<div class="df-fb"></div></div>';
    }

    function revealDecision(idx) {
      answered = true;
      var d = design.decisions[step];
      var last = step === design.decisions.length - 1;
      var opts = d.options.map(function (o, i) {
        return '<div class="ca-opt revealed v-' + o.verdict + (i === idx ? " chosen" : "") + '">' +
          '<div class="ca-opt-label">' + o.label + '<span class="ca-verdict v-' + o.verdict + '">' + VLAB[o.verdict] + "</span></div>" +
          '<div class="ca-why">' + o.why + "</div></div>";
      }).join("");
      el.querySelector(".df-body").innerHTML =
        '<div class="df-step"><div class="df-progress">Design decision ' + (step + 1) + " / " + design.decisions.length + "</div>" +
        '<div class="df-q">' + d.q + "</div>" +
        '<div class="df-opts">' + opts + "</div>" +
        '<button class="btn btn-primary df-next">' + (last ? "See reference architecture →" : "Next decision →") + "</button></div>";
    }

    function renderReference() {
      if (AV.Progress) AV.Progress.record("design", design.id, { done: true, category: design.category });
      var r = design.reference || {};
      var stages = (r.stages || []).map(function (s, i) {
        return '<div class="df-stage"><span class="df-stage-n">' + (i + 1) + "</span>" +
          '<div><div class="df-stage-name">' + s.name + "</div>" +
          '<div class="df-stage-detail">' + s.detail + "</div></div></div>";
      }).join("");
      var notes = (r.notes || []).map(function (n) { return "<li>" + n + "</li>"; }).join("");
      el.querySelector(".df-body").innerHTML =
        '<div class="df-ref"><div class="df-ref-head">✅ Reference architecture</div>' +
        (r.summary ? '<p class="df-ref-summary">' + r.summary + "</p>" : "") +
        '<div class="df-stages">' + stages + "</div>" +
        (notes ? '<h3 class="df-h">Decisions baked in</h3><ul class="df-notes">' + notes + "</ul>" : "") +
        '<div class="df-actions"><button class="btn btn-primary df-back">← All designs</button>' +
        '<button class="btn btn-secondary df-retry">Redo ↻</button></div></div>';
    }

    el.addEventListener("click", function (e) {
      var opt = e.target.closest && e.target.closest(".ca-opt[data-i]");
      if (opt && !answered) { revealDecision(parseInt(opt.getAttribute("data-i"), 10)); return; }
      if (e.target.closest && e.target.closest(".df-next")) {
        step++;
        if (step >= design.decisions.length) renderReference(); else renderDecision();
        return;
      }
      if (e.target.closest && e.target.closest(".df-retry")) { step = 0; answered = false; renderDecision(); return; }
      if (e.target.closest && e.target.closest(".df-back")) { if (typeof onBack === "function") onBack(); return; }
    });

    el.innerHTML = header() + '<div class="df-body"></div>';
    renderDecision();
    return { el: el, destroy: function () {} };
  }

  AV.DesignFlow = { create: create };
})();
