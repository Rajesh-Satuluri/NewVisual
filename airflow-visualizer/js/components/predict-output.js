/* ============================================================
   predict-output.js — "Predict what Airflow does" code reveal
   ------------------------------------------------------------
   Show a short DAG/code snippet and a question; the learner predicts,
   then reveals what actually happens plus why. Reuses AV.CodeViewer
   for syntax-highlighted code.

     AV.PredictOutput.create(item, onBack) -> { el, destroy }

   item: { id, title, category, code, codeTitle?, question,
           prediction, explanation, concept? }
   Records to AV.Progress ("predict"). Content is trusted HTML. ES5-safe.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  function create(item, onBack) {
    var el = document.createElement("div");
    el.className = "po";
    el.innerHTML =
      '<div class="po-head"><div class="po-title">' + item.title + "</div>" +
        '<div class="prep-badges"><span class="prep-badge cat">' + item.category + "</span></div></div>" +
      '<div class="po-code"></div>' +
      '<div class="callout info po-q"><span class="callout-icon">❓</span>' +
        '<div class="callout-body"><b>' + item.question + "</b></div></div>" +
      '<button class="btn btn-primary po-reveal">Reveal what happens</button>' +
      '<div class="po-answer" hidden></div>' +
      '<div class="po-actions" hidden><button class="btn btn-secondary po-back">← All snippets</button></div>';

    var codeHost = el.querySelector(".po-code");
    if (AV.CodeViewer && AV.CodeViewer.create) {
      codeHost.appendChild(AV.CodeViewer.create({ title: item.codeTitle || "DAG snippet", lang: "python", code: item.code }));
    } else {
      codeHost.innerHTML = "<pre><code>" + String(item.code).replace(/&/g, "&amp;").replace(/</g, "&lt;") + "</code></pre>";
    }

    el.addEventListener("click", function (e) {
      if (e.target.closest && e.target.closest(".po-reveal")) {
        if (AV.Progress) AV.Progress.record("predict", item.id, { done: true, category: item.category });
        var box = el.querySelector(".po-answer");
        box.innerHTML =
          '<div class="po-a-row"><span class="po-tag">What happens</span><div>' + item.prediction + "</div></div>" +
          '<div class="po-a-row"><span class="po-tag ok">Why</span><div>' + item.explanation + "</div></div>" +
          (item.concept ? '<div class="po-concept">Concept: <b>' + item.concept + "</b></div>" : "");
        box.hidden = false;
        var rb = el.querySelector(".po-reveal");
        if (rb) rb.disabled = true;
        el.querySelector(".po-actions").hidden = false;
        return;
      }
      if (e.target.closest && e.target.closest(".po-back")) { if (typeof onBack === "function") onBack(); return; }
    });

    return { el: el, destroy: function () {} };
  }

  AV.PredictOutput = { create: create };
})();
