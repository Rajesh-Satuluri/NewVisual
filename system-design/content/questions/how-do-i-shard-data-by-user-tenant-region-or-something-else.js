export default {
  id: "how-do-i-shard-data-by-user-tenant-region-or-something-else",
  question: "How do I shard data by user, tenant, region, or something else?",
  icon: "🗃️",
  difficulty: "Intermediate",
  category: "Data Modeling Storage & Indexing",
  tags: ["Databases","Distributed Systems","Scalability"],
  tldr: "Shard on the key your queries filter by so most reads hit one shard — usually user or tenant — and avoid cross-shard fan-out.",
  steps: [],
  checklist: [],
  widget: "consistent-hash",
  draft: true
};
