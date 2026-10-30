export default {
  id: "how-do-i-handle-a-task-that-fails-halfway-with-partial-write",
  question: "How do I handle a task that fails halfway with partial writes?",
  icon: "🪄",
  difficulty: "Intermediate",
  category: "Orchestration & Scheduling",
  tags: ["Orchestration","Reliability"],
  tldr: "Write to staging then atomically publish, make the task idempotent, and on retry overwrite the partition — so a half-finished run leaves no visible partial state.",
  steps: [],
  checklist: [],
  draft: true
};
