export default {
  id: "how-do-i-ingest-a-third-party-api-that-paginates-and-rate-li",
  question: "How do I ingest a third-party API that paginates and rate-limits?",
  icon: "📥",
  difficulty: "Intermediate",
  category: "Ingestion & CDC",
  tags: ["Ingestion","Reliability"],
  tldr: "Page with cursors, respect rate limits with backoff, checkpoint progress, and make each run resumable so a 429 or timeout never forces a full restart.",
  steps: [],
  checklist: [],
  draft: true
};
