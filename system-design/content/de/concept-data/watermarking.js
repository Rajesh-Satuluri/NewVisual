export default {
  id: "watermarking",
  title: "Watermarking & late data",
  icon: "💧",
  chapter: 18,
  group: "Streaming systems",
  summary: "On a stream, events arrive out of order, so you can't know a time window is complete just because the clock passed its end. A watermark is the engine's assertion that 'event time has progressed to T — expect no more events older than T,' which lets it decide when to fire a window and what to treat as late.",
  widget: "de-watermark",
  widgetIntro: "Bucketing by **event time** is correct, but it creates a hard question: a window for 10:00–10:01 can still receive an event timestamped 10:00:30 that arrives at 10:03. When is the window *done*? A **watermark** answers it: the engine tracks the max event time it has seen and subtracts an allowed-lateness bound, asserting 'I don't expect events older than this anymore.' When the watermark passes a window's end, the window **fires**.\n\nWatch events arrive out of order, the watermark advance, windows fire as it crosses their end, and late events (behind the watermark) get flagged and dropped.",
  sections: [
    {
      title: "The completeness problem",
      body: "Processing time tells you when an event arrived; event time tells you when it happened. Correct aggregates use event time — but events are delayed and reordered by networks, retries, and backlogs, so 'the wall clock passed 10:01' does NOT mean every 10:00–10:01 event has arrived. You need a signal for 'this window is probably complete'. That signal is the watermark.",
      rules: ["You can't fire an event-time window on the wall clock — you need to know the data is complete."],
    },
    {
      title: "What a watermark is",
      body: "A watermark is a monotonically advancing timestamp the engine emits into the stream, meaning 'event time has reached W; don't expect events older than W.' It's typically computed as `max event time seen − allowed lateness`. As more data flows, the watermark climbs. When it passes a window's end, the engine considers that window complete and fires it (emits the aggregate).",
      flow: ["track max event time", "watermark = max − allowed lateness", "watermark passes window end", "fire window"],
    },
    {
      title: "The lateness trade-off",
      body: "Allowed lateness is the dial between latency and completeness. A large bound waits longer before firing, so windows capture more stragglers (more correct) but results are later. A small bound fires quickly (fresher) but risks excluding late events. You size it from your data's real delay distribution — enough to catch most legitimate lateness without stalling.",
      rules: ["Allowed lateness trades freshness against completeness — size it from observed event delays."],
    },
    {
      title: "Handling events behind the watermark",
      body: "An event whose time is older than the current watermark is **late**. Options: drop it (simplest, some loss), send it to a side output / dead-letter for separate handling, or allow a grace period that updates an already-fired window (more correct, more complex). Choosing among these is a correctness-vs-complexity decision every streaming job must make.",
      bullets: [
        "**Drop:** ignore late events — simple, small loss.",
        "**Side output:** route late events elsewhere for repair.",
        "**Allowed lateness / update:** re-fire the window with the late event included.",
      ],
    },
  ],
  deepDiveTitle: "🔬 Deep dive",
  deepDiveIntro: "Watermarks are the mechanism that makes event-time streaming correct and bounded at the same time.",
  deepDive: [
    {
      title: "Why max − lateness",
      body: "The watermark can't be the max event time itself, or the first out-of-order event older than the max would already be 'late'. Subtracting an allowed-lateness margin gives reordering room: the engine holds windows open a bit past their nominal end so normal out-of-order arrivals still count. The margin is exactly how much disorder you tolerate.",
      stats: [
        { value: "event time", label: "correctness basis", tone: "green" },
        { value: "max − lateness", label: "watermark formula", tone: "blue" },
        { value: "fire on cross", label: "window end < watermark", tone: "accent" },
        { value: "late = drop/side", label: "behind the watermark", tone: "amber" },
      ],
    },
    {
      title: "Watermarks + windows + triggers",
      body: "Windowing defines the buckets, watermarks decide when a bucket is complete, and triggers decide when to actually emit (on watermark, early/speculative, or on late updates). Together they let a streaming job be both low-latency and eventually correct: fire on the watermark for the main result, optionally emit early estimates and late corrections.",
      callout: { tone: "tip", label: "The senior framing:", body: "\"Window by event time; advance a watermark at max-seen minus allowed lateness; fire each window when the watermark passes its end; and route events behind the watermark to drop, a side output, or a late update. Allowed lateness is the freshness-vs-completeness dial.\"" },
    },
  ],
  qa: [
    {
      q: "What is a watermark and what problem does it solve?",
      a: "A watermark is a timestamp the streaming engine advances through the stream asserting 'event time has reached W; don't expect events older than W.' It solves the completeness problem of event-time windowing: because events arrive out of order and delayed, you can't tell a window is done just because the wall clock passed its end. The watermark — typically max-event-time-seen minus an allowed-lateness margin — gives the engine a principled signal for when a window is complete, so it knows when to fire it.",
      tip: "Define it as 'event time has progressed to W' and tie it to deciding when a window is complete.",
    },
    {
      q: "Why is the watermark max-seen minus a margin, not just max-seen?",
      a: "If the watermark were exactly the maximum event time seen, then any out-of-order event older than that max would instantly be 'late', so normal reordering would lose data. Subtracting an allowed-lateness margin holds windows open slightly past their nominal end, giving room for events that arrive a bit out of order to still be counted. The margin is literally how much disorder/delay you're willing to tolerate before declaring a window complete.",
      tip: "The margin is reordering tolerance; without it, routine out-of-order events would all count as late.",
    },
    {
      q: "What happens to events that arrive after the watermark has passed their window?",
      a: "They're late, and you choose a policy: drop them (simplest, accepts small loss), route them to a side output / dead-letter for separate handling or backfill, or keep a grace period of allowed lateness that re-fires the already-emitted window with the late event included (most correct, most complex). The choice is a correctness-vs-complexity trade-off, sized against how much legitimate lateness your data has and how exact the result must be.",
      tip: "Drop / side-output / late-update are the three options; frame the pick as correctness vs complexity.",
    },
  ],
  related: [],
};
