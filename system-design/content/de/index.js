// ── DE question registry (Data-Engineering track) ───────────────────────────
// The DE decision-question catalog ("How do I…") lands in a later wave. For now
// this exposes the same shape as the SWE content/index.js with an empty
// catalog, so the shared engine (nav, home, dashboard, command palette) renders
// the DE track cleanly with no questions yet.

export const CATEGORY_ORDER = [
  'Ingestion & CDC',
  'Modeling & Schema',
  'Storage & Formats',
  'Batch Processing',
  'Streaming & Windowing',
  'Orchestration & Scheduling',
  'Data Quality & Reconciliation',
  'Performance & Cost',
  'Governance & Security',
  'Platform & People',
];

export const CATEGORY_LABEL = {
  'Ingestion & CDC': 'Ingestion & CDC',
  'Modeling & Schema': 'Modeling & Schema',
  'Storage & Formats': 'Storage & Formats',
  'Batch Processing': 'Batch Processing',
  'Streaming & Windowing': 'Streaming & Windows',
  'Orchestration & Scheduling': 'Orchestration',
  'Data Quality & Reconciliation': 'Quality & Recon',
  'Performance & Cost': 'Perf & Cost',
  'Governance & Security': 'Governance & Security',
  'Platform & People': 'Platform & People',
};

export const QUESTIONS = [];
export const LOADERS = {};

export const DIFFICULTY_ORDER = ['Fundamental', 'Intermediate', 'Advanced'];

export function allTags() {
  const set = new Set();
  QUESTIONS.forEach(q => (q.tags || []).forEach(t => set.add(t)));
  return [...set].sort();
}
