export default {
  id: "how-do-i-ingest-files-that-arrive-late-out-of-order-or-parti",
  question: "How do I ingest files that arrive late, out of order, or partially?",
  icon: "📥",
  difficulty: "Intermediate",
  category: "Ingestion & CDC",
  tags: ["Ingestion","Reliability"],
  tldr: "Trigger on arrival, validate completeness (manifest/checksum) before processing, and partition by event time so a late file still lands in the right window.",
  steps: [],
  checklist: [],
  draft: true
};
