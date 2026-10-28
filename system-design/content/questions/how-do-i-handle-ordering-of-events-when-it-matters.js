export default {
  id: "how-do-i-handle-ordering-of-events-when-it-matters",
  question: "How do I handle ordering of events when it matters?",
  icon: "📨",
  difficulty: "Advanced",
  category: "Async Processing Events & Jobs",
  tags: ["Distributed Systems","Message Queues","Reliability"],
  tldr: "Partition by the ordering key so related events stay in one ordered stream, and use sequence numbers to detect gaps or reordering.",
  steps: [],
  checklist: [],
  draft: true
};
