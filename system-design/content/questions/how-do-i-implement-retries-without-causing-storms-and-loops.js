export default {
  id: "how-do-i-implement-retries-without-causing-storms-and-loops",
  question: "How do I implement retries without causing storms and loops?",
  icon: "🛡️",
  difficulty: "Intermediate",
  category: "Reliability Failures & Recovery",
  tags: ["Distributed Systems","Reliability"],
  tldr: "Retry only idempotent calls, with exponential backoff + jitter, a cap, and a budget — and never retry through a tripped circuit.",
  steps: [],
  checklist: [],
  widget: "backoff",
  draft: true
};
