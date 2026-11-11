// glossary-tooltip.js — inline, hover/focus term definitions.
//
// `gloss('bom', 'BOM')` returns a dotted-underline <span> whose definition
// (from GLOSS below) appears on hover or keyboard focus. Definitions are short,
// plain-text and kept consistent with the Glossary term bank (glossary.js) so a
// learner never meets a term before it is explained. No term is invented here
// that is not already taught in a grounded module.
export const GLOSS = {
  demand:       { t: 'demand',          d: 'A customer order or forecast the plan must satisfy — a quantity needed by a due date.' },
  supply:       { t: 'supply',          d: 'Anything that can meet demand: on-hand stock, in-transit / WIP, or new production or purchases the plan creates.' },
  'on-hand':    { t: 'on-hand',         d: 'Inventory already sitting at a location at the start of a bucket. BOH = beginning on-hand, EOH = ending on-hand.' },
  'net-req':    { t: 'net requirement', d: 'What still must be created after using stock: max(0, demand − on-hand + safety stock).' },
  'lead-time':  { t: 'lead time',       d: 'The time it takes to make, move, or buy something — so supply must be started before the due date.' },
  'lead-offset':{ t: 'lead-time offset',d: 'Stepping backward over working days from the due date by the lead time to find the start / order date.' },
  bom:          { t: 'BOM',             d: 'Bill of Materials — the recipe: which components, and how many, go into one unit of a parent item.' },
  bod:          { t: 'BOD',             d: 'Bill of Distribution — which upstream location ships to which downstream location, and by what transport mode.' },
  routing:      { t: 'routing',         d: 'The ordered operations (and the resources they use) required to produce an item.' },
  activity:     { t: 'activity',        d: 'A node representing a production or movement step the solver can execute to create supply.' },
  capacity:     { t: 'capacity',        d: 'A resource limits throughput per bucket; unlike material it expires at the end of its bucket and cannot be carried over.' },
  bucket:       { t: 'bucket',          d: 'One slot of time on the planning calendar — a single day, week or month. The plan is divided into a row of these buckets (the W1, W2, W3… columns), and every demand and every unit of supply is dropped into one of them. Saying a plan is time-phased just means it is sorted into buckets like this.' },
  heuristic:    { t: 'heuristic',       d: 'A fast, rule-based method that finds a good, feasible, explainable plan — not a math search that proves the single optimal answer.' },
  'lp-mip':     { t: 'LP / MIP',        d: 'Linear / Mixed-Integer Programming — classic optimization that searches for a provably optimal solution. The SCS is a heuristic instead.' },
  scs:          { t: 'SCS',             d: 'Supply Chain Solver — o9’s heuristic planning engine, a plugin inside the GraphCube server, that turns demand into time-phased supply.' },
  obo:          { t: 'order-by-order',  d: 'The solver plans each demand to completion, in sorted priority order, before moving to the next — so earlier demands consume scarce supply first.' },
  jit:          { t: 'JIT',             d: 'Just-In-Time — the preferred timing: plan supply to arrive exactly when the demand is due.' },
  'build-ahead':{ t: 'build-ahead',     d: 'Making supply earlier than the due date and carrying it as inventory, when it cannot be made just in time.' },
  'build-late': { t: 'build-late',      d: 'Delivering after the due date, within a late limit, when supply cannot be made on time.' },
  priority:     { t: 'priority',        d: 'The rank that decides which demand is planned first; earlier-planned demands consume scarce supply first.' },
  'fair-share': { t: 'fair-share',      d: 'A secondary rule that spreads scarce supply proportionally across competing demands of equal priority.' },
  pegging:      { t: 'pegging',         d: 'The traceable link from a demand back to the exact supply that fills it.' },
  rca:          { t: 'RCA',             d: 'Root Cause Analysis — for every short or late demand, the reason (e.g. Material Short, Capacity Short) and a suggested available date.' },
  'safety-stock':{ t: 'safety stock',   d: 'A buffer the plan tries to keep on hand to absorb variability, added on top of the net requirement.' },
  orl:          { t: 'ORL',             d: 'Objective Rank List — the ordered soft constraints the solver relaxes last-to-first; effectively the solver’s objective.' },
  sourcing:     { t: 'sourcing',        d: 'Choosing among alternate suppliers or plants for an item, by priority, proportional split and effectivity.' },
  graphcube:    { t: 'GraphCube',       d: 'o9’s in-memory graph+cube data server. The solver runs inside it as a plugin, reading and writing planning data directly.' },
};

// Wrap `text` (or the term’s display label) in a hover/focus tooltip span.
export function gloss(key, text) {
  const g = GLOSS[key];
  if (!g) return text || key;
  const label = text != null ? text : g.t;
  const tip = String(g.d).replace(/"/g, '&quot;');
  return `<span class="gloss" tabindex="0" role="note" data-tip="${tip}">${label}</span>`;
}
