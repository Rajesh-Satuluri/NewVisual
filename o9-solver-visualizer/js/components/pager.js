/* ============================================================
   components/pager.js — prev / next module pager
   Kafka convention: auto-appended below each module so a learner can
   walk the spine in order. Reads the flat screen order from
   AV.getScreens() and links to the neighbours of the current id.

   Contract:
     AV.Pager.create(moduleId) -> HTML string   // prev/next links
     AV.Pager.init(container)                    // (optional) keyboard ←/→

   STATUS: SCAFFOLD (returns empty). Wired via router.enhanceModule().
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.SolverViz = window.SolverViz || {});

  AV.Pager = {
    neighbours: function (id) {
      var screens = (AV.getScreens && AV.getScreens()) || [];
      var i = screens.findIndex(function (s) { return s.id === id; });
      return { prev: i > 0 ? screens[i - 1] : null, next: i >= 0 && i < screens.length - 1 ? screens[i + 1] : null };
    },
    create: function (/* moduleId */) { return ""; /* TODO */ },
    init: function (/* container */) { /* TODO: optional ←/→ nav */ }
  };
})();
