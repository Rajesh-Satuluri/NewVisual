export default {
  id: "how-do-i-backfill-a-dag-over-a-historical-date-range",
  question: "How do I backfill a DAG over a historical date range?",
  icon: "🪄",
  difficulty: "Intermediate",
  category: "Orchestration & Scheduling",
  tags: ["Orchestration","Batch"],
  tldr: "Parameterize tasks by execution date so each run is isolated, then backfill per partition in parallel with limits — idempotency makes reruns safe.",
  steps: [],
  checklist: [],
  draft: true
};
