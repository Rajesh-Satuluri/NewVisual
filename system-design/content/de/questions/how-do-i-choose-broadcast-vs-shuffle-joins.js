export default {
  id: "how-do-i-choose-broadcast-vs-shuffle-joins",
  question: "How do I choose broadcast vs shuffle joins?",
  icon: "⚙️",
  difficulty: "Intermediate",
  category: "Batch Processing",
  tags: ["Spark","Performance"],
  tldr: "Broadcast when one side is small enough to copy to every node (no shuffle); shuffle-sort-merge when both sides are large — the small-side size is the deciding factor.",
  steps: [],
  checklist: [],
  draft: true
};
