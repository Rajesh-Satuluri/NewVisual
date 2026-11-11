export default {
  id: "how-do-i-handle-cache-stampede-and-thundering-herd",
  question: "How do I handle cache stampede and thundering herd?",
  icon: "⚡",
  difficulty: "Intermediate",
  category: "Caching & Performance",
  tags: ["Caching"],
  tldr: "Use request coalescing, early/jittered recompute, and locks so one miss doesn't send a thousand requests to the database at once.",
  steps: [],
  checklist: [],
  draft: true
};
