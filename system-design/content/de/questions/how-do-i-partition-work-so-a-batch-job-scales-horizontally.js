export default {
  id: "how-do-i-partition-work-so-a-batch-job-scales-horizontally",
  question: "How do I partition work so a batch job scales horizontally?",
  icon: "⚙️",
  difficulty: "Intermediate",
  category: "Batch Processing",
  tags: ["Batch","Spark"],
  tldr: "Split input into independent, evenly-sized partitions keyed for balance, so adding workers adds throughput and no single task becomes the bottleneck.",
  steps: [],
  checklist: [],
  draft: true
};
