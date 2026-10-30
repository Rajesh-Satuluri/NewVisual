export default {
  id: "how-do-i-design-a-backfill-that-reprocesses-years-of-history",
  question: "How do I design a backfill that reprocesses years of history safely?",
  icon: "⚙️",
  difficulty: "Advanced",
  category: "Batch Processing",
  tags: ["Batch","Reliability"],
  tldr: "Chunk by partition/date, run idempotent merges, throttle to protect live load, checkpoint each chunk, and keep it separate from the incremental path.",
  steps: [],
  checklist: [],
  draft: true
};
