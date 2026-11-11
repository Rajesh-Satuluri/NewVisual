export default {
  id: "how-do-i-tune-a-spark-job-that-spills-and-runs-slowly",
  question: "How do I tune a Spark job that spills and runs slowly?",
  icon: "⚙️",
  difficulty: "Advanced",
  category: "Batch Processing",
  tags: ["Spark","Performance"],
  tldr: "Attack shuffle: fix skew, right-size partitions, broadcast small joins, cache reused data, and cut wide dependencies — spill means too much data per task.",
  steps: [],
  checklist: [],
  draft: true
};
