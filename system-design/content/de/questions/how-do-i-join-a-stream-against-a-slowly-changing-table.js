export default {
  id: "how-do-i-join-a-stream-against-a-slowly-changing-table",
  question: "How do I join a stream against a slowly changing table?",
  icon: "🌊",
  difficulty: "Advanced",
  category: "Streaming & Windowing",
  tags: ["Streaming","Modeling"],
  tldr: "Use a temporal/lookup join against the dimension as of event time, cache it locally, and refresh on change so enrichment reflects the state when the event happened.",
  steps: [],
  checklist: [],
  draft: true
};
