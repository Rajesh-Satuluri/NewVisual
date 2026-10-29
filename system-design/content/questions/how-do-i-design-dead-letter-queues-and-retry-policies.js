export default {
  id: "how-do-i-design-dead-letter-queues-and-retry-policies",
  question: "How do I design dead-letter queues and retry policies?",
  icon: "📨",
  difficulty: "Intermediate",
  category: "Async Processing Events & Jobs",
  tags: ["Distributed Systems","Message Queues","Reliability"],
  tldr: "Retry a bounded number of times with backoff, then route poison messages to a DLQ for inspection instead of blocking the pipeline.",
  steps: [],
  checklist: [],
  draft: true
};
