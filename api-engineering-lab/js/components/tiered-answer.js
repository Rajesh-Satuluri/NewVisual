/* ============================================================
   tiered-answer.js — one question, the same answer at several depths
   ------------------------------------------------------------
   A tabbed answer switcher used by two features with different tiers:
   - "Improve Your Answer": Weak / Good / Senior (+ why senior wins)
   - "30s / 90s / 3-min": three time-boxed depths
   - also reused by the Airflow 2.x→3.x version trap (2.x / 3.x / say-it)

     AV.TieredAnswer.create(item, onBack, opts) -> { el, destroy }

   item: { id, question, category, tiers: [ { label, body } ], note? }
   opts: { cat?, tierNote? }  (cat -> AV.Progress category to mark viewed)
   Content is trusted HTML (authored in-repo). ES5-safe.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  function create(item, onBack, opts) {
    opts = opts || {};
    var el = document.createElement("div");
    el.className = "ta";
    var active = 0;

    function render() {
      var tabs = item.tiers.map(function (t, i) {
        return '<button class="ta-tab' + (i === active ? " active" : "") + '" data-i="' + i + '">' + t.label + "</button>";
      }).join("");
      el.querySelector(".ta-body").innerHTML =
        '<div class="ta-tabs">' + tabs + "</div>" +
        '<div class="ta-panel">' + item.tiers[active].body + "</div>";
    }

    el.addEventListener("click", function (e) {
      var t = e.target.closest && e.target.closest(".ta-tab[data-i]");
      if (t) { active = parseInt(t.getAttribute("data-i"), 10); render(); return; }
      if (e.target.closest && e.target.closest(".ta-back")) { if (typeof onBack === "function") onBack(); return; }
    });

    if (AV.Progress && opts.cat) AV.Progress.record(opts.cat, item.id, { viewed: true, category: item.category });

    el.innerHTML =
      '<div class="ta-head"><div class="ta-q">' + (item.question || item.title) + "</div>" +
        '<div class="prep-badges"><span class="prep-badge cat">' + item.category + "</span>" +
          (opts.tierNote ? '<span class="prep-badge steps">' + opts.tierNote + "</span>" : "") +
        "</div></div>" +
      (item.note ? '<div class="ta-note">' + item.note + "</div>" : "") +
      '<div class="ta-body"></div>' +
      '<div class="ta-actions"><button class="btn btn-secondary ta-back">← Back</button></div>';
    render();
    return { el: el, destroy: function () {} };
  }

  AV.TieredAnswer = { create: create };
})();
