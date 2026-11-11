export default {
  id: "how-do-i-replay-a-stream-from-the-past",
  question: "How do I replay a stream from the past?",
  icon: "🌊",
  difficulty: "Intermediate",
  category: "Streaming & Windowing",
  tags: ["Kafka","Streaming","Reliability"],
  tldr: "Retain the log long enough and reset consumer offsets to a timestamp; make processing idempotent so a replay recomputes results without double effects.",
  steps: [],
  checklist: [],
  draft: true
};
