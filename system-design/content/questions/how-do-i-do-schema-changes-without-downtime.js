export default {
  id: "how-do-i-do-schema-changes-without-downtime",
  question: "How do I do schema changes without downtime?",
  icon: "🛡️",
  difficulty: "Advanced",
  category: "Reliability Failures & Recovery",
  tags: ["Databases","Reliability"],
  tldr: "Expand-contract: add the new shape, dual-write/backfill, migrate reads, then drop the old — each step backward compatible.",
  steps: [],
  checklist: [],
  draft: true
};
