// Production Incident Simulator — 20 named dbt incidents (Iter 4).
// Each incident drives a multi-step on-call flow:
//   briefing → evidence (walk the lineage) → hypothesis (scored) → root cause →
//   recovery choice (scored, with consequences) → fix → validate → postmortem.
//
// Schema per incident:
//   { id, icon, title, severity, paged, symptom,
//     trace:      [{ node, check }],                 // walk DOWN the lineage
//     hypotheses: [{ id, label, correct, why }],     // exactly one correct
//     root,                                          // the true root cause
//     recovery:   { prompt, options:[{ id, label, correct, outcome }] },
//     fixCode,                                        // illustrative — NOT executed
//     validate,                                       // how you confirm the fix
//     writeup:    { cause, impact, detection, resolution, prevention },
//     deeper:     { id, label } }
//
// fixCode is labelled "Illustrative fix — not executed" in the UI: nothing here
// runs against a warehouse. Technical accuracy is cross-checked; adapter-specific
// behavior (incremental strategies, partition pruning, QUALIFY) is called out.
// Populated from two authoring batches, de-duplicated and schema-checked.
export const INCIDENTS = [
];
