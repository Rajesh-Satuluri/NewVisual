export default {
  id: "how-do-i-design-a-job-scheduler-for-millions-of-jobs-day",
  question: "How do I design a job scheduler for millions of jobs/day?",
  icon: "📨",
  difficulty: "Advanced",
  category: "Async Processing Events & Jobs",
  tags: ["Distributed Systems","Message Queues","Scalability"],
  tldr: "Partition the job space, use durable queues with leasing, make workers idempotent, and track state so jobs survive crashes and scale out.",
  steps: [],
  checklist: [],
  draft: true
};
