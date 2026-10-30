export default {
  id: "how-do-i-land-raw-ingested-data-so-it-stays-replayable",
  question: "How do I land raw ingested data so it stays replayable?",
  icon: "📥",
  difficulty: "Fundamental",
  category: "Ingestion & CDC",
  tags: ["Ingestion","Lake","Storage"],
  tldr: "Write immutable, append-only raw files partitioned by ingest time, keep the original payload untouched, so you can always reprocess from the source of truth.",
  steps: [],
  checklist: [],
  draft: true
};
