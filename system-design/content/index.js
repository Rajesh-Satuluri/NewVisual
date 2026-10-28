// ── Category order (drives sidebar groups + home sections) ──────────────────
// The 11 categories of the knowledge base, in learning order.
export const CATEGORY_ORDER = [
  "Core Distributed Systems & Scalability",
  "Data Modeling Storage & Indexing",
  "Caching & Performance",
  "Consistency Availability & Transactions",
  "Reliability Failures & Recovery",
  "Async Processing Events & Jobs",
  "APIs Boundaries & Contracts",
  "Observability Monitoring & Incidents",
  "Evolution Cost People & Real-World Trade-offs",
  "People Reviews & High-Level Thinking",
];

// Short labels for compact UI (sidebar group headers, chips).
export const CATEGORY_LABEL = {
  "Core Distributed Systems & Scalability": "Core & Scalability",
  "Data Modeling Storage & Indexing": "Data & Storage",
  "Caching & Performance": "Caching & Perf",
  "Consistency Availability & Transactions": "Consistency & Txns",
  "Reliability Failures & Recovery": "Reliability",
  "Async Processing Events & Jobs": "Async & Events",
  "APIs Boundaries & Contracts": "APIs & Contracts",
  "Observability Monitoring & Incidents": "Observability",
  "Evolution Cost People & Real-World Trade-offs": "Evolution & Cost",
  "People Reviews & High-Level Thinking": "People & Review",
};

// ── Question metadata (lightweight; no answer bodies) ───────────────────────
// Lists every question for nav + home + filtering. Bodies load lazily below.
// Keep one entry per question file; order within a category is display order.
export const QUESTIONS = [
  {
    id: "idempotency-write-apis",
    question: "How do I handle idempotency for write APIs?",
    icon: "🔁",
    difficulty: "Advanced",
    category: "Core Distributed Systems & Scalability",
    tags: ["Databases", "Distributed Systems", "Reliability"],
    draft: false,
  },
  {
    id: "migrate-huge-table",
    question: "How do I design a migration strategy for a huge table?",
    icon: "🧱",
    difficulty: "Advanced",
    category: "Data Modeling Storage & Indexing",
    tags: ["Databases", "Reliability", "Storage"],
    draft: false,
  },
];

// ── Lazy loaders for full question data (one dynamic import per id) ──────────
export const LOADERS = {
  "idempotency-write-apis": () => import("./questions/idempotency-write-apis.js"),
  "migrate-huge-table": () => import("./questions/migrate-huge-table.js"),
};

// ── Difficulty metadata ─────────────────────────────────────────────────────
export const DIFFICULTY_ORDER = ["Fundamental", "Intermediate", "Advanced"];

// All distinct tags across questions (derived; handy for the filter bar).
export function allTags() {
  const set = new Set();
  QUESTIONS.forEach((q) => (q.tags || []).forEach((t) => set.add(t)));
  return [...set].sort();
}
