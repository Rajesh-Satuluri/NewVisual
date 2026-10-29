export default {
  id: "batch-vs-streaming",
  title: "Batch vs streaming",
  icon: "🌊",
  chapter: 5,
  group: "Foundations",
  summary: "Batch processes bounded chunks of data on a schedule — simple, cheap, high-throughput, but stale between runs. Streaming processes each event as it arrives — low latency, always fresh, but harder to get right. The choice is driven by how fresh the answer must be.",
  widget: "de-batch-vs-stream",
  widgetIntro: "The difference is **when** work happens. **Batch** lets events pile up and processes them in groups on a schedule, so a record's result isn't ready until the next run — latency is roughly the batch interval. **Streaming** processes each event the moment it lands, so results are fresh within seconds, at the cost of a continuously-running, more complex system.\n\nWatch events flow down two lanes: the batch lane collects then flushes in bursts; the streaming lane passes each event straight through. Note how batch latency swings up to the interval while streaming stays low — the trade-off at the heart of every pipeline design.",
  sections: [
    {
      title: "Bounded vs unbounded",
      body: "Batch operates on a **bounded** dataset — a finite chunk with a start and end (yesterday's orders). Streaming operates on an **unbounded** stream — events that never stop arriving, processed incrementally forever. That single distinction drives everything else.",
      table: {
        head: ["", "Batch", "Streaming"],
        rows: [
          ["Data", "Bounded chunks", "Unbounded, continuous"],
          ["Latency", "Minutes to hours", "Milliseconds to seconds"],
          ["Trigger", "Schedule (cron)", "Per event / micro-batch"],
          ["Complexity", "Lower", "Higher (state, time, failures)"],
          ["Cost", "Cheap, runs then stops", "Always-on cluster"],
        ],
      },
    },
    {
      title: "When batch is the right answer",
      body: "Most analytics doesn't need second-level freshness. Daily reports, model training sets, large backfills, and reprocessing are naturally bounded and run far more cheaply and simply as batch jobs. Batch also makes correctness easy: re-run the job and you get the same result.",
      bullets: [
        "Daily/hourly reporting and dashboards where freshness in minutes is fine.",
        "Heavy transformations, ML training, and large historical backfills.",
        "Anything where simplicity and reproducibility beat latency.",
      ],
      rules: ["Default to batch; reach for streaming only when the freshness requirement demands it."],
    },
    {
      title: "When you actually need streaming",
      body: "Streaming earns its complexity when a late answer is a wrong answer: fraud detection, real-time dashboards and alerting, personalization, and anything reacting to events as they happen. The cost is dealing with unbounded time — windows, late data, and continuous state — covered by the streaming concepts.",
      bullets: [
        "Fraud / anomaly detection and real-time alerting.",
        "Live dashboards, leaderboards, and monitoring.",
        "Event-driven reactions and personalization.",
      ],
    },
    {
      title: "Micro-batch: the middle ground",
      body: "Many 'streaming' systems (e.g. Spark Structured Streaming) actually run **micro-batches** — tiny batches every few seconds. You get near-streaming latency with batch-like simplicity and exactly-once semantics. It's often the pragmatic sweet spot between a nightly job and true per-event streaming.",
      flow: ["per-event streaming", "micro-batch (seconds)", "batch (hours)"],
    },
    {
      title: "The Lambda / Kappa question",
      body: "Historically teams ran **both**: a batch layer for correct historical results and a speed layer for fresh approximate ones (Lambda architecture) — but maintaining two codebases is painful. The **Kappa** approach runs everything as a stream and reprocesses from the log for history, keeping one codebase. Modern lakehouse table formats blur the line further by making one pipeline serve both.",
      rules: ["Prefer one code path (Kappa / unified) over maintaining separate batch + streaming logic for the same metric."],
    },
  ],
  deepDiveTitle: "🔬 Deep dive",
  deepDiveIntro: "The real cost of streaming isn't latency — it's reasoning about time and failure on data that never ends.",
  deepDive: [
    {
      title: "Latency vs the cost of always-on",
      body: "Batch spends nothing between runs and amortizes overhead across huge chunks, but every record waits for the next run. Streaming pays for a cluster that never sleeps and more engineering, and buys freshness measured in seconds. Put a number on the freshness requirement first — it decides the architecture.",
      stats: [
        { value: "~interval", label: "batch latency ≈ run cadence", tone: "amber" },
        { value: "~seconds", label: "streaming end-to-end latency", tone: "green" },
        { value: "runs → stops", label: "batch compute cost", tone: "blue" },
        { value: "always-on", label: "streaming compute cost", tone: "accent" },
      ],
    },
    {
      title: "Streaming's hard parts",
      body: "On an unbounded stream you can't 'wait for all the data', so you slice it into windows, track event-time progress with watermarks to know when a window is complete, handle events that arrive late or out of order, and keep fault-tolerant state with checkpoints so a crash doesn't lose or double-count. These are exactly the streaming concepts — the price of low latency.",
      callout: { tone: "tip", label: "The senior framing:", body: "\"Quantify the freshness need. If minutes are fine, batch — it's cheaper and simpler. If seconds matter, stream, and budget for windows, watermarks, late data and checkpointed state. Micro-batch is often the pragmatic middle.\"" },
    },
  ],
  qa: [
    {
      q: "How do you decide between batch and streaming?",
      a: "Start from the freshness requirement — how stale can the answer be before it's useless? If minutes-to-hours is acceptable (most reporting, ML training, backfills), use batch: it's cheaper, simpler, and trivially reproducible. If the value depends on reacting within seconds (fraud, alerting, live dashboards), use streaming and accept its complexity. Quantify the latency need first; it drives the whole architecture. Micro-batch is a common middle ground.",
      tip: "Lead with 'quantify the freshness requirement' — that's the decision driver, not a preference for either technology.",
    },
    {
      q: "What makes streaming harder than batch?",
      a: "Batch runs on a bounded dataset, so 'process everything then stop' is well-defined and re-running gives the same answer. Streaming runs on an unbounded stream where data never stops and arrives out of order, so you must slice it into windows, use watermarks to decide when a window is complete, handle late/duplicate events, and keep fault-tolerant state via checkpoints so failures don't lose or double-count data. That's a lot of extra machinery for the latency gain.",
      tip: "Windows, watermarks, late data, and checkpointed state are the four hard parts — name them.",
    },
    {
      q: "What is micro-batch and when is it a good fit?",
      a: "Micro-batch processes the stream as a rapid series of very small batches — every few seconds — instead of one event at a time. You get near-real-time latency with batch-like simplicity, reproducibility, and easier exactly-once semantics (Spark Structured Streaming works this way). It's the pragmatic sweet spot when you need fresher-than-nightly data but don't need true per-event millisecond latency, which is most 'streaming' use cases.",
      tip: "Frame micro-batch as 'most of streaming's freshness with most of batch's simplicity' — the common real-world choice.",
    },
    {
      q: "Lambda vs Kappa architecture — what's the trade-off?",
      a: "Lambda runs two layers: a batch layer for correct historical results and a speed layer for fresh approximate ones, then merges them. It works but means maintaining two implementations of the same logic, which drift. Kappa runs a single streaming pipeline and handles history by reprocessing from the event log, keeping one codebase at the cost of needing a replayable log and reprocessing capacity. Modern lakehouse stacks increasingly let one pipeline serve both, favoring the single-codebase direction.",
      tip: "The key pain is 'two codebases that drift' (Lambda) vs 'one codebase, replay for history' (Kappa).",
    },
  ],
  related: [],
};
