export default {
  id: "windowing",
  title: "Windowing (tumbling, sliding, session)",
  icon: "🪟",
  chapter: 17,
  group: "Streaming systems",
  summary: "A stream is infinite, so you can't 'sum all events' — there's no end. Windowing slices the unbounded stream into finite chunks you can aggregate over. Tumbling windows are fixed and non-overlapping, sliding windows overlap, and session windows group bursts of activity separated by gaps.",
  widget: "de-windowing",
  widgetIntro: "On an unbounded stream, every aggregation needs a **boundary**: you compute 'events per minute', not 'events ever'. A window defines that boundary. **Tumbling** windows chop time into fixed, non-overlapping blocks. **Sliding** windows are fixed-size but step forward by a smaller interval, so they overlap and an event belongs to several. **Session** windows have no fixed size — they grow with activity and close after a gap of inactivity.\n\nSwitch window types and watch events fall into windows that close and emit an aggregate — the mechanism behind every streaming metric.",
  sections: [
    {
      title: "Why windows exist",
      body: "Batch aggregation works on a bounded dataset — you can wait for all of it. A stream never ends, so 'the total' is never final. Windowing imposes finiteness: group events by the time interval they fall in, aggregate each interval, and emit a result when the interval is complete. Every streaming count, sum, or average is really a per-window aggregate.",
      rules: ["You can't aggregate an infinite stream — you aggregate finite windows of it."],
    },
    {
      title: "Tumbling windows",
      body: "Fixed-size, non-overlapping, contiguous intervals: `[0–60s)`, `[60–120s)`, and so on. Each event belongs to exactly one window. Tumbling is the default for periodic metrics — 'requests per minute', 'revenue per hour' — because the buckets line up with reporting periods and don't double-count.",
      flow: ["[0–60s)", "[60–120s)", "[120–180s)"],
      rules: ["Tumbling = fixed, non-overlapping; each event in exactly one window. Use for periodic totals."],
    },
    {
      title: "Sliding windows",
      body: "Fixed-size windows that advance by a smaller **slide** interval, so they overlap: a 60s window sliding every 10s gives a fresh 'last 60 seconds' every 10 seconds. An event falls into multiple windows. Sliding windows power smooth moving averages and 'last N minutes' alerts where you want a continuously updated view, not discrete buckets.",
      rules: ["Sliding = fixed size + smaller slide → overlapping windows; events counted in several. Use for moving averages / 'last N min'."],
    },
    {
      title: "Session windows",
      body: "No fixed size — a session window groups events that arrive close together and closes after a **gap** of inactivity longer than a timeout. They're perfect for activity-based analysis: a user's browsing session, a sequence of trades, a device's burst of readings. Window length is data-driven, not clock-driven.",
      rules: ["Session = dynamic; grows with activity, closes after an inactivity gap. Use for per-user activity bursts."],
    },
  ],
  deepDiveTitle: "🔬 Deep dive",
  deepDiveIntro: "Windows sound simple until you ask the two hard questions: by whose clock, and when is a window really done?",
  deepDive: [
    {
      title: "Event time vs processing time",
      body: "Windows should bucket by **event time** (when the event actually happened) not processing time (when it arrived), or network delays and retries scatter events into the wrong windows and your metrics lie. Bucketing by event time is correct but raises the completeness problem: events can arrive late, so when do you decide a window is finished? That's what watermarks answer.",
      stats: [
        { value: "event time", label: "bucket by when it happened", tone: "green" },
        { value: "tumbling", label: "fixed, non-overlapping", tone: "blue" },
        { value: "sliding", label: "fixed size, overlapping", tone: "accent" },
        { value: "session", label: "activity gap-based", tone: "amber" },
      ],
    },
    {
      title: "Choosing a window",
      body: "Match the window to the question. Periodic reporting (per-minute, per-hour totals) → tumbling. Smooth trends and 'last N minutes' alerting → sliding. User/device activity and funnels → session. Window size also trades latency against stability: smaller windows are fresher but noisier; larger ones are smoother but laggier.",
      callout: { tone: "tip", label: "The senior framing:", body: "\"Window by event time. Tumbling for periodic totals, sliding for moving averages and short-horizon alerts, session for activity bursts. Then use watermarks to decide when each window is complete and handle late events.\"" },
    },
  ],
  qa: [
    {
      q: "Why do streaming systems need windows at all?",
      a: "Because a stream is unbounded — there's no end, so an aggregation like 'the total' is never final. Windowing slices the infinite stream into finite intervals you can actually aggregate and emit results for: instead of 'sum of all events', you compute 'sum per minute'. Every streaming count/sum/average is a per-window aggregate. Windows are what make bounded operations (and therefore results you can emit) possible on unbounded data.",
      tip: "The crux: you can't aggregate infinity, so you aggregate finite windows of it.",
    },
    {
      q: "Tumbling vs sliding vs session windows — when do you use each?",
      a: "Tumbling windows are fixed-size and non-overlapping, each event in exactly one — use them for periodic totals like requests-per-minute or revenue-per-hour. Sliding windows are fixed-size but advance by a smaller slide so they overlap, and an event lands in several — use them for moving averages and 'last N minutes' alerts that update continuously. Session windows have no fixed size: they group bursts of activity and close after an inactivity gap — use them for per-user sessions, funnels, or device activity bursts.",
      tip: "Tumbling = periodic totals, sliding = moving averages/last-N-min, session = activity bursts; mention overlap and gap.",
    },
    {
      q: "Should windows use event time or processing time, and why does it matter?",
      a: "Event time — when the event actually occurred — not processing time, which is when it happened to arrive. If you bucket by processing time, network delays, retries, and backlogs scatter events into the wrong windows and your per-interval metrics become wrong. Event-time windowing is correct but creates the completeness problem: late-arriving events mean you can't immediately know a window is done, which is exactly what watermarks are for.",
      tip: "Event time for correctness; note it forces the 'when is the window complete?' problem that watermarks solve.",
    },
  ],
  related: [],
};
