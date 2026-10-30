export default {
  id: "how-do-i-capture-deletes-including-hard-deletes-from-a-sourc",
  question: "How do I capture deletes (including hard deletes) from a source?",
  icon: "📥",
  difficulty: "Intermediate",
  category: "Ingestion & CDC",
  tags: ["CDC","Ingestion"],
  tldr: "Read deletes from the DB log via CDC, or diff snapshots when there is no log — represent them as soft-delete tombstones downstream rather than silent row removal.",
  steps: [],
  checklist: [],
  draft: true
};
