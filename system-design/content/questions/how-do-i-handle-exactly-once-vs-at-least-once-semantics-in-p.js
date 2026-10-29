export default {
  id: "how-do-i-handle-exactly-once-vs-at-least-once-semantics-in-p",
  question: "How do I handle exactly-once vs at-least-once semantics in practice?",
  icon: "📨",
  difficulty: "Advanced",
  category: "Async Processing Events & Jobs",
  tags: ["Distributed Systems","Message Queues"],
  tldr: "Assume at-least-once delivery and make consumers idempotent — true exactly-once is really at-least-once plus dedupe.",
  steps: [],
  checklist: [],
  draft: true
};
