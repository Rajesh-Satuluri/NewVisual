/* ============================================================
   data/catmpn-dataset.js — the REAL CATMPN tenant, distilled
   Grounds every I/O module, the engine's networks, and the schema
   explorer in the actual o9 Supply Chain Solver deployment.
   Source digest: scratchpad/CATMPN-factsheet.md (not shipped raw).

   Shape (AV.CATMPN_DATASET):
     {
       network,                       // one real Item × LC lane
       dims:    [{ name, role }],     // the 61 dims (SCS-critical subset)
       plans:   [{ name, role }],     // 5 o9 plans; solver runs CAT Supply Plan
       inboundTables:  [{ name, grain, columns:[…], sample:[…] }],  // the 17 real In_Fact_*
       outboundTables: [{ name, grain, columns:[…] }],             // real Out_Fact_*
       measures: [{ measure, grain, suffix, meaning }]
     }

   NOTE: staged as AV.CATMPN_DATASET so it does NOT clobber the working
   synthetic AV.CATMPN (catmpn-data.js, hero Widget-A). Iteration 2
   migrates grounded modules onto this and keeps Widget-A as the beginner
   hero. STATUS: SCAFFOLD — empty containers; populated in Iteration 2.
   ============================================================ */
(function () {
  "use strict";
  var NS = (window.SolverViz = window.SolverViz || {});

  NS.CATMPN_DATASET = {
    tenant: "CATMPN",
    network: null,
    dims: [],            // TODO: 61 dims (Activity, BODLane, GLBItem, LOTID, …)
    plans: [],           // TODO: CAT Demand/Inventory/Supply Plan + TenantStats + Algorithm Parameters
    inboundTables: [],   // TODO: the 17 real In_Fact_* feed tables (real columns + sample rows)
    outboundTables: [],  // TODO: real Out_Fact_* (pegging, inventory buckets, RCA, WIP)
    measures: []         // TODO: measure naming & grain ((D)/(SCPU)/- IL/- BILT)
  };
})();
