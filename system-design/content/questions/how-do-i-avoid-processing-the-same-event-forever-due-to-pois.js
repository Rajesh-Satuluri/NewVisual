export default {
  id: "how-do-i-avoid-processing-the-same-event-forever-due-to-pois",
  question: "How do I avoid processing the same event forever due to poison messages?",
  icon: "📨",
  difficulty: "Advanced",
  category: "Async Processing Events & Jobs",
  tags: ["Distributed Systems","Message Queues","Reliability"],
  tldr: "Cap retries, move repeat failures to a dead-letter queue, and alert — so one bad message can't loop and starve the consumer.",
  steps: [],
  checklist: [],
  draft: true
};
