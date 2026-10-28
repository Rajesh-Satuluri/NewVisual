export default {
  id: "how-do-i-design-an-outbox-inbox-pattern-for-reliable-events",
  question: "How do I design an outbox/inbox pattern for reliable events?",
  icon: "🔗",
  difficulty: "Advanced",
  category: "Consistency Availability & Transactions",
  tags: ["Databases","Distributed Systems","Message Queues"],
  tldr: "Write the event to an outbox table in the same transaction as the data, then relay it to the broker; dedupe on the consumer via an inbox.",
  steps: [],
  checklist: [],
  draft: true
};
