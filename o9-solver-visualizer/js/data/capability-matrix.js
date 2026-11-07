/* ============================================================
   data/capability-matrix.js — feature × model support grid
   Shape:
     AV.CAPABILITY_MATRIX = {
       features: [ "lot size", "shelf life", … ],
       models:   [ "Lot-Based", "Supply Code", "Shelf Life", … ],
       grid:     [ [bool, …], … ]   // grid[featureIdx][modelIdx]
     }
   Feeds: Capability Matrix page (t10). Ships a co-located integrity test
   when populated (grid dimensions match features × models).
   STATUS: SCAFFOLD — empty; filled in the Supported-Models iteration.
   ============================================================ */
(function () {
  "use strict";
  var NS = (window.SolverViz = window.SolverViz || {});
  NS.CAPABILITY_MATRIX = { features: [], models: [], grid: [] };
})();
