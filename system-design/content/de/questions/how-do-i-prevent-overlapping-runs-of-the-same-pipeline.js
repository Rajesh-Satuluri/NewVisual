export default {
  id: "how-do-i-prevent-overlapping-runs-of-the-same-pipeline",
  question: "How do I prevent overlapping runs of the same pipeline?",
  icon: "🪄",
  difficulty: "Intermediate",
  category: "Orchestration & Scheduling",
  tags: ["Orchestration","Reliability"],
  tldr: "Enforce max-active-runs/concurrency or a lock so a slow run can’t overlap the next trigger and corrupt shared state or double-write a partition.",
  steps: [],
  checklist: [],
  draft: true
};
