export default {
  id: "how-do-i-handle-late-and-out-of-order-events-with-watermarks",
  question: "How do I handle late and out-of-order events with watermarks?",
  icon: "🌊",
  difficulty: "Advanced",
  category: "Streaming & Windowing",
  tags: ["Streaming","Windowing"],
  tldr: "A watermark tracks event-time progress and decides when a window is “done”; allow a grace period for late data, then drop or route stragglers to a side output.",
  steps: [],
  checklist: [],
  draft: true
};
