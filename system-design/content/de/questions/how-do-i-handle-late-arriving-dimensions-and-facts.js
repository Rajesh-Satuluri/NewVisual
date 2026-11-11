export default {
  id: "how-do-i-handle-late-arriving-dimensions-and-facts",
  question: "How do I handle late-arriving dimensions and facts?",
  icon: "🧱",
  difficulty: "Advanced",
  category: "Modeling & Schema",
  tags: ["Modeling","SCD","Reliability"],
  tldr: "Insert an inferred/placeholder dimension row so the fact can land, then backfill attributes when the dimension arrives — never drop a fact for a missing dim.",
  steps: [],
  checklist: [],
  draft: true
};
