export default {
  id: "how-do-i-quarantine-bad-records-without-failing-the-whole-ba",
  question: "How do I quarantine bad records without failing the whole batch?",
  icon: "🔎",
  difficulty: "Intermediate",
  category: "Data Quality & Reconciliation",
  tags: ["Data Quality","Reliability"],
  tldr: "Route rows failing validation to a dead-letter/quarantine table with the reason, let good rows proceed, and review/replay the quarantine separately.",
  steps: [],
  checklist: [],
  draft: true
};
