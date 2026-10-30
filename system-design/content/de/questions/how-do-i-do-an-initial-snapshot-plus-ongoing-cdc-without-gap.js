export default {
  id: "how-do-i-do-an-initial-snapshot-plus-ongoing-cdc-without-gap",
  question: "How do I do an initial snapshot plus ongoing CDC without gaps or duplicates?",
  icon: "📥",
  difficulty: "Advanced",
  category: "Ingestion & CDC",
  tags: ["CDC","Ingestion","Reliability"],
  tldr: "Snapshot at a known log position (LSN/SCN), then stream changes from that exact offset — overlap slightly and dedupe on key so nothing is missed or double-applied.",
  steps: [],
  checklist: [],
  draft: true
};
