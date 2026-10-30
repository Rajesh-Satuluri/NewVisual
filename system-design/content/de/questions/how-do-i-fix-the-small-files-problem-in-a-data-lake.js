export default {
  id: "how-do-i-fix-the-small-files-problem-in-a-data-lake",
  question: "How do I fix the small-files problem in a data lake?",
  icon: "🗄️",
  difficulty: "Intermediate",
  category: "Storage & Formats",
  tags: ["Storage","Performance","Lake"],
  tldr: "Batch writes, compact small files into larger ones (~128MB–1GB), and tune partitioning so you stop creating thousands of tiny files that wreck scan speed.",
  steps: [],
  checklist: [],
  draft: true
};
