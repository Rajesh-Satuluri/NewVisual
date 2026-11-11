export default {
  id: "how-do-i-choose-partition-columns-and-avoid-over-partitionin",
  question: "How do I choose partition columns and avoid over-partitioning?",
  icon: "🗄️",
  difficulty: "Intermediate",
  category: "Storage & Formats",
  tags: ["Partitioning","Storage"],
  tldr: "Partition on low-cardinality columns your queries filter by (usually date); too many partitions make tiny files and slow metadata — prune, don’t shatter.",
  steps: [],
  checklist: [],
  draft: true
};
