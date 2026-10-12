import { createModuleShell, createIQSection } from '../components/module-shell.js';

const FUNCTIONAL = [
  { q: 'Walk me through how demand planning works end-to-end in this tenant.',
    a: 'Three grains, coarse to fine. Customer-LC-Month holds aggregate signals (exceptions, CoC deltas) for CS analysts. Customer-Item-LC-Month (459 measures) holds the bulk forecast with Forecast Quantity Weekly Lag 0–52. Customer-Item-LC-FiscalWeek (300 measures) holds the operational weekly forecast. Cycle: statistical baseline → BAF adjustment → exception review → Commit-or-Cancel via Forecast Acceptance Status → accepted Final Forecast rolls into supply.',
    tip: 'Name the three grains and the five cycle beats. Real measure names signal hands-on experience.' },
  { q: 'A plant reports stockouts though the system shows sufficient inventory. How do you investigate?',
    a: 'Structured debug, three layers. Data: is on-hand real and at the right grain? Is in-transit being netted? Is the inventory measure the Available-for-Planning one or a gross figure? Business logic: is safety stock double-counted, or a priority-part allocation starving this item? Is the demand signal at the right customer-item-LC? Process: timing — did the plan run before or after the latest receipt/consumption? Work data → logic → process, not guesses.',
    tip: 'Always answer debug questions as a layered method (data → logic → process), not a single guess.' },
  { q: 'How would you set safety stock for a critical part with variable demand and long, variable lead time?',
    a: 'Both variabilities inflate the buffer. Use a service-level-driven safety stock that accounts for demand standard deviation AND lead-time standard deviation (not just average demand × lead time). For a critical/priority part, target a high service level and review it frequently. Store it as Safety Stock Final (Volume) - Item LC and let supply plan to cover it. Flag it as a Priority Part so it wins allocation under shortage.',
    tip: 'Emphasize lead-time variability, not just demand variability — that\'s what separates a senior answer.' },
];

const PLATFORM = [
  { q: 'What is a Commit-or-Cancel (CoC) exception and how would you configure the thresholds?',
    a: 'CoC is the governance gate between a proposed forecast change and the accepted plan. An exception is raised when a cell\'s change breaches a threshold — configured via Monthly CoC Delta Upper/Lower Threshold (and firm-zone rules for near-term weeks). Breaching cells surface as Weekly CoC Firm Zone / 10-Day exceptions; the planner commits or cancels via Forecast Acceptance Status. Set thresholds tight enough to catch real moves, loose enough that the queue stays workable.',
    tip: 'Define CoC as the gate, name the threshold measures, and mention tuning the queue size.' },
  { q: 'How would you model a new LC-to-LC replenishment lane?',
    a: 'A lane is a sourcing relationship on the Location/LogisticsCenter graph: a From-LC supplying a To-LC, with properties (lead time, cost, validity dates, min/max). Create the sourcing/transport edge (RelationshipType), set its lead time and valid date range, and add any capacity. Then the DRP solver can net demand at the To-LC back to the From-LC along that lane. Validate it doesn\'t create an unintended cycle unless cycles are valid for transport.',
    tip: 'Frame a lane as a typed edge with lead-time/validity properties — ties back to the graph model.' },
];

const TECHNICAL = [
  { q: 'Write an IBPL query to find the top 10 parts at highest stockout risk in the next 4 fiscal weeks.',
    a: '"At risk" = days-of-supply < total lead time (can\'t replenish in time). Compute days-of-supply = Available-for-Planning ÷ (avg weekly demand ÷ 7) with safedivide, as a transient column, post-filter below lead time, orderby asc, limit 10. See module 19 → Worked IBPL for the full query. Key moves: safedivide (not /), coalesce/isnull for null-safety, Version mandatory, post-filter on the transient.',
    tip: 'Say the definition first (days-of-supply < lead time), then the IBPL constructs. Mention safedivide and the Version filter.' },
  { q: 'A batch job set Safety Stock to null for 500 items. How do you recover?',
    a: 'Don\'t panic-edit the CWV. If a snapshot exists from before the run, copy Safety Stock back from that version (cross-version scope / copymeasure) for the affected items. If not, re-derive it from inputs (demand/lead-time variability) with the correct scope, or re-load the fact file. Then add the safeguard the incident exposed: run destructive scopes against a scenario version first, and validate counts before promoting. The version isolation is what makes point-in-time recovery possible.',
    tip: 'Recovery via snapshot/version copy, then the preventive lesson: test scopes in a scenario, validate before promote.' },
  { q: 'What scope type computes a rolling 4-week demand average, and write it?',
    a: 'A regular scope with @ + LeadOffset to reach the prior weeks: Measure.[Demand4wkAvg] = (Measure.[Demand] + Measure.[Demand]@(Time.#.LeadOffset(-1)) + Measure.[Demand]@(Time.#.LeadOffset(-2)) + Measure.[Demand]@(Time.#.LeadOffset(-3))) / 4; wrapped in scope: (Version * Item * LC * Week) … end scope;. Coalesce each term so an early-period null doesn\'t void the average. It\'s regular (not recurrence) because each week reads fixed offsets, not the previous computed result.',
    tip: 'Rolling average = regular scope + @LeadOffset, not recurrence. Coalesce the terms.' },
];

const DELIVERY = [
  { q: 'A planner made UI changes that "haven\'t saved." What do you check?',
    a: 'Use FILTER_BY_UPDATES to see rows changed-but-not-saved — confirm the edits are pending, not lost. Then: is the measure editable (not calculative)? Does the planner have write access (data role + grant write, and was resetaccesscontrol run)? Is the cell at an aggregate level without a spreading rule (blocks the edit)? Is the version the CWV or a read-only snapshot? Walk permissions → editability → spreading → version.',
    tip: 'FILTER_BY_UPDATES first, then the four blockers: editable, write access, spreading rule, version.' },
  { q: 'How do you ensure ERP-fed data is correct before it affects the live plan?',
    a: 'Stage-validate-promote. Load to a staging/scenario version, run validation IBPL (row counts vs source, null checks, every fact key resolves to a real member — no orphans, range/outlier checks, compare vs prior load), and only then copy into CWV. Guard against grain mismatch and orphan members. Version isolation means a bad load never touches the live plan.',
    tip: 'Never load straight to CWV. Stage → validate (counts/nulls/orphans/ranges) → promote.' },
];

const DISRUPTION = [
  { q: 'Your biggest supplier announces administration; you have 3 weeks of stock. What do you do in o9?',
    a: 'Model it, don\'t firefight blind. Build a what-if scenario (negative-key version): zero/curtail that supplier\'s capacity and extend lead times for its parts. Re-solve supply to expose the shortages and which demands/priority parts are hit. Then evaluate levers in the scenario — alternate suppliers/lanes, expedite, reallocate to priority parts, pull safety stock — compare service impact, and only merge the chosen response into CWV. The isolation lets you test drastic moves safely.',
    tip: 'Scenario → curtail supplier → re-solve → compare levers → merge. Shows you use versions for risk, not spreadsheets.' },
  { q: 'Inventory turns dropped at one LC across all items. Where do you look?',
    a: 'Across-all-items at one LC points to something LC-wide, not item-specific. Check: a demand signal drop at that LC (forecast fell but supply kept coming), a safety-stock parameter change inflating targets, a receipt/goods-in posting issue overstating on-hand, or a sourcing change routing excess stock there. Compare the LC against peers and against last period; it\'s usually a single LC-level driver, not many coincidences.',
    tip: '"All items, one LC" = look for an LC-level cause (demand, safety-stock param, receipts, sourcing) — not per-item.' },
];

const ROUNDS = [
  ['round1','① Supply-Chain Functional', FUNCTIONAL],
  ['round2','② Platform & Data Model', PLATFORM],
  ['round3','③ IBPL Technical', TECHNICAL],
  ['round4','④ Implementation & Delivery', DELIVERY],
  ['round5','⑤ Disruption & Problem-Solving', DISRUPTION],
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M21 · Practice',
    title: 'Interview Master',
    subtitle: 'Senior o9 scenario Q&A across the five rounds interviewers actually run, grounded in the CAT tenant.',
    tabs: ROUNDS.map(([id,label,qs]) => ({ id, label, content: createIQSection(qs) })),
  });
  return null;
}
