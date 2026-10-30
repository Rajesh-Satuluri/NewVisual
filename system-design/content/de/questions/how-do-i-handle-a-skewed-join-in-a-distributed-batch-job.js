export default {
  id: "how-do-i-handle-a-skewed-join-in-a-distributed-batch-job",
  question: "How do I handle a skewed join in a distributed batch job?",
  icon: "⚙️",
  difficulty: "Advanced",
  category: "Batch Processing",
  tags: ["Spark","Performance"],
  tldr: "Salt the hot key, split skewed values, or use skew-join/AQE so one giant key does not send all its rows to a single overloaded reducer.",
  steps: [],
  checklist: [],
  draft: true
};
