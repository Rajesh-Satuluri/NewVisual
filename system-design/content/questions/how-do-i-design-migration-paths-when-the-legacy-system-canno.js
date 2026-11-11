export default {
  id: "how-do-i-design-migration-paths-when-the-legacy-system-canno",
  question: "How do I design migration paths when the legacy system cannot just die?",
  icon: "🧭",
  difficulty: "Advanced",
  category: "Evolution Cost People & Real-World Trade-offs",
  tags: ["Distributed Systems","Reliability"],
  tldr: "Use the strangler pattern: route slices of traffic to the new system behind a facade until the legacy one can be retired.",
  steps: [],
  checklist: [],
  draft: true
};
