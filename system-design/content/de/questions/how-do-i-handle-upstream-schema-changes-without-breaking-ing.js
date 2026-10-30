export default {
  id: "how-do-i-handle-upstream-schema-changes-without-breaking-ing",
  question: "How do I handle upstream schema changes without breaking ingestion?",
  icon: "📥",
  difficulty: "Advanced",
  category: "Ingestion & CDC",
  tags: ["Ingestion","Schema"],
  tldr: "Land raw permissively, detect drift, evolve additively (new columns ok), and quarantine breaking changes so one source change never halts the whole load.",
  steps: [],
  checklist: [],
  draft: true
};
