export default {
  id: "how-do-i-process-only-new-or-changed-data-incrementally",
  question: "How do I process only new or changed data incrementally?",
  icon: "⚙️",
  difficulty: "Intermediate",
  category: "Batch Processing",
  tags: ["Batch","Performance"],
  tldr: "Track a high-water mark (timestamp/id) or use CDC, process just the delta since last run, and merge — so cost scales with change, not with total size.",
  steps: [],
  checklist: [],
  draft: true
};
