// ─────────────────────────────────────────────────────────────────────────────
// Canonical networks  (sim/networks.js)
//
// The three teaching networks the SCS Mini-Engine runs on, distilled from real
// CATMPN rows. They double as Solver Playground presets and the backbone of
// every Worked Example:
//   • distribution  — a CAT distribution lane for one real Item × LC
//                     (Supplier → DC-National → DC-Regional → Store-LC)
//   • manufacturing — a 2-level BOM case
//   • procurement   — an alternate-source case (two suppliers, split %,
//                     different lead times + MOQ)
//
// Node shape (teaching abstraction over the real dims):
//   { id, kind: 'material'|'activity'|'demand'|'capacity'|'storage', label, lc, item, ... }
// Lane shape: { from, to, transMode, leadTime, ... }
//
// STATUS: SCAFFOLD. Shapes and IDs are fixed here so the engine, tests, and
// Playground can bind to them. Real CATMPN-derived quantities/lead-times/splits
// are populated in Iteration 1 from data/catmpn-dataset.js.
// ─────────────────────────────────────────────────────────────────────────────

// A CAT distribution lane for one real Item × LC.
export const DISTRIBUTION = {
  id: "distribution",
  title: "CAT Distribution Lane",
  item: "GLBItem-TBD",
  calendar: [],        // ascending working-day indices (Iteration 1)
  nodes: [],           // material/activity/demand/capacity/storage nodes
  lanes: [],           // BODLane + TransMode + lead time
  demands: [],         // OutboundOpenRequirement-derived OBO demands
  config: {}           // lot size, yield, priority, split %, SS policy
};

// A 2-level BOM manufacturing case.
export const MANUFACTURING = {
  id: "manufacturing",
  title: "2-Level BOM (Mfg)",
  item: "GLBItem-TBD",
  calendar: [],
  nodes: [],
  lanes: [],
  demands: [],
  config: {}
};

// A procurement / alternate-source case: two suppliers, split %, differing
// lead times + MOQ.
export const PROCUREMENT = {
  id: "procurement",
  title: "Procurement · Alternate Source",
  item: "GLBItem-TBD",
  calendar: [],
  nodes: [],
  lanes: [],
  demands: [],
  config: {}
};

// Registry consumed by the Playground preset picker.
export const NETWORKS = { distribution: DISTRIBUTION, manufacturing: MANUFACTURING, procurement: PROCUREMENT };

export default NETWORKS;
