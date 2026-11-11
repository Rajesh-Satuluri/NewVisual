export default {
  id: "how-do-i-handle-read-your-own-writes-in-a-distributed-system",
  question: "How do I handle \"read your own writes\" in a distributed system?",
  icon: "🔗",
  difficulty: "Intermediate",
  category: "Consistency Availability & Transactions",
  tags: ["Databases","Distributed Systems"],
  tldr: "Route a user's reads to the primary or a synced replica after a write, or pin them to an updated node, so they see their own change.",
  steps: [],
  checklist: [],
  draft: true
};
