export default {
  id: "how-do-i-cache-or-materialize-expensive-aggregations",
  question: "How do I cache or materialize expensive aggregations?",
  icon: "💰",
  difficulty: "Intermediate",
  category: "Performance & Cost",
  tags: ["Performance","Warehouse"],
  tldr: "Precompute common rollups into materialized views/gold tables refreshed incrementally, so dashboards read cheap summaries instead of rescanning raw facts.",
  steps: [],
  checklist: [],
  draft: true
};
