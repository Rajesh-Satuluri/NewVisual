export default {
  id: "how-do-i-design-rate-limiting-that-doesn-t-break-good-users",
  question: "How do I design rate limiting that doesn't break good users?",
  icon: "⚡",
  difficulty: "Intermediate",
  category: "Caching & Performance",
  tags: ["Reliability","Scalability"],
  tldr: "Limit per-key with token/leaky buckets, allow bursts, return clear 429s with retry hints, and tune so normal users never notice.",
  steps: [],
  checklist: [],
  draft: true
};
