export default {
  id: "how-do-i-handle-updates-and-deletes-on-immutable-lake-files",
  question: "How do I handle updates and deletes on immutable lake files?",
  icon: "🗄️",
  difficulty: "Advanced",
  category: "Storage & Formats",
  tags: ["Table Formats","Storage","Lake"],
  tldr: "Use a table format (Delta/Iceberg/Hudi) that does copy-on-write or merge-on-read, or re-write affected partitions — never try to edit object files in place.",
  steps: [],
  checklist: [],
  draft: true
};
