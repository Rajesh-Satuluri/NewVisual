export default {
  id: "stock-exchange",
  title: "Design a stock exchange",
  icon: "🏦",
  chapter: 28,
  group: "Money & real-time",
  summary: "Match buy and sell orders fairly, in order, with ultra-low and predictable latency. The heart is a single-threaded in-memory matching engine over an order book, fed by a strict sequencer, with correctness and determinism prized above raw parallelism.",
  widget: "order-book",
  widgetIntro: "The **order book** is the core data structure of an exchange: resting **bids** (buy orders) on one side, **asks** (sell orders) on the other, each sorted by price and then by arrival time. The **best bid** and **best ask** define the market; the gap between them is the **spread**.\n\nSend a buy or sell order and watch it match by **price-time priority** — best price first, oldest order first within a price level. A marketable order crosses the spread and prints a trade; whatever it can't fill rests in the book and becomes the new best price. This is exactly what the single-threaded matching engine does millions of times per second.",
  sections: [
    {
      title: "Requirements",
      body: "Accept orders, match buyers with sellers fairly, execute trades, and publish market data — deterministically and with microsecond-class latency.",
      bullets: [
        "Place/cancel orders (limit, market).",
        "Match orders by strict price-time priority, fairly.",
        "Extremely low, predictable latency; high throughput.",
        "Correctness and auditability — it's regulated financial infrastructure.",
      ],
    },
    {
      title: "The order book",
      body: "Each symbol has an **order book**: all resting buy orders (bids) and sell orders (asks), organized by price level and, within a level, by time. The best bid and best ask define the current market; a trade happens when a bid price meets an ask price.",
      rules: ["Order book = bids and asks sorted by price, then by time within each price level."],
    },
    {
      title: "Matching & price-time priority",
      body: "An incoming order matches against the opposite side by **price-time priority**: best price first, and among equal prices, the order that arrived first (FIFO) executes first. A limit buy at $10 matches the lowest asks ≤ $10; leftover quantity rests in the book. This fairness rule is a hard requirement — it must be exact and reproducible.",
      flow: ["Incoming order", "Match vs best opposite prices", "Fill at price-time priority", "Remainder rests in book", "Emit trade + book update"],
    },
    {
      title: "The sequencer — order matters absolutely",
      body: "Fairness and determinism require a single, total order of events. A **sequencer** assigns every incoming order a strict sequence number before matching, establishing the one true order of operations. This makes the whole system **deterministic**: replaying the sequenced input always produces the identical result — essential for recovery, auditing, and fairness.",
      rules: ["One sequencer → total order of events → fully deterministic, replayable matching."],
    },
    {
      title: "Single-threaded, in-memory matching engine",
      body: "Counter-intuitively, the matching engine is often **single-threaded and in-memory**. Why: parallelism would introduce nondeterminism and locking overhead, and matching must be exact and ordered. A single thread over in-memory data structures avoids locks, is cache-friendly, and processes millions of orders/sec with microsecond latency. Durability comes from the sequenced input log, not from touching disk on the hot path.",
      bullets: [
        "No locks, no cross-thread nondeterminism — deterministic and fast.",
        "In-memory order book; disk is off the hot path.",
        "Scale across symbols by running independent engines per symbol/partition.",
      ],
    },
    {
      title: "Durability, recovery & market data",
      body: "Persist the **sequenced input stream** (an append-only log, often replicated) before/as the engine processes it. On crash, rebuild state by replaying the log from the last snapshot — deterministic matching guarantees an identical book. Separately, the engine publishes a **market data** feed (trades, book changes) to consumers; this read path is fanned out and can be scaled independently of matching.",
      flow: ["Sequenced input log (replicated)", "Matching engine (replay to rebuild)", "Snapshots + log = recovery", "Market data feed → consumers"],
    },
  ],
  deepDiveTitle: "🔬 Deep dive",
  deepDiveIntro: "The stock exchange is the one system where a single thread beats a cluster. Here's why determinism outranks parallelism, how an order matches, and how you recover a purely in-memory engine without losing a trade.",
  deepDive: [
    {
      title: "The counter-intuitive core",
      body: "You'd expect to scale a hot system by adding threads and machines. The matching engine does the opposite: **one thread, in memory, per symbol**. Correctness and fairness must be exact and reproducible, and locks + parallelism destroy both.",
      stats: [
        { value: "1 thread", label: "per symbol's matching engine", tone: "accent" },
        { value: "in-memory", label: "order book; disk off the hot path", tone: "blue" },
        { value: "µs", label: "latency target per order", tone: "green" },
        { value: "deterministic", label: "replay = identical result", tone: "amber" },
      ],
    },
    {
      title: "How an order matches (price-time priority)",
      svg: `<svg viewBox="0 0 560 190" width="560" role="img" aria-label="Order book matching" style="font-family:system-ui">
        <text x="110" y="20" text-anchor="middle" fill="#10B981" font-size="12" font-weight="700">BIDS (buy)</text>
        <rect x="30" y="30" width="160" height="22" rx="4" fill="none" stroke="#10B981" stroke-opacity="0.6"/><text x="110" y="45" text-anchor="middle" fill="currentColor" font-size="11">$10.02 × 100</text>
        <rect x="30" y="56" width="160" height="22" rx="4" fill="none" stroke="#10B981" stroke-opacity="0.4"/><text x="110" y="71" text-anchor="middle" fill="currentColor" font-size="11">$10.01 × 300</text>
        <rect x="30" y="82" width="160" height="22" rx="4" fill="none" stroke="#10B981" stroke-opacity="0.25"/><text x="110" y="97" text-anchor="middle" fill="currentColor" font-size="11">$10.00 × 500</text>
        <text x="450" y="20" text-anchor="middle" fill="#EF4444" font-size="12" font-weight="700">ASKS (sell)</text>
        <rect x="370" y="30" width="160" height="22" rx="4" fill="none" stroke="#EF4444" stroke-opacity="0.6"/><text x="450" y="45" text-anchor="middle" fill="currentColor" font-size="11">$10.03 × 200</text>
        <rect x="370" y="56" width="160" height="22" rx="4" fill="none" stroke="#EF4444" stroke-opacity="0.4"/><text x="450" y="71" text-anchor="middle" fill="currentColor" font-size="11">$10.04 × 150</text>
        <text x="280" y="140" text-anchor="middle" fill="currentColor" font-size="11" font-weight="700">Incoming: BUY 250 @ $10.03</text>
        <text x="280" y="160" text-anchor="middle" fill="currentColor" font-size="10" opacity="0.75">matches lowest ask first: 200 @ $10.03, then rests 50 in the book</text>
        <text x="280" y="177" text-anchor="middle" fill="currentColor" font-size="10" opacity="0.6">spread = best ask − best bid = $10.03 − $10.02</text>
      </svg>`,
      caption: "Match best price first; among equal prices, earliest order first (FIFO). Leftover quantity rests in the book.",
    },
    {
      title: "Why single-threaded wins here",
      compare: {
        title: "Matching engine architecture",
        cols: [
          { title: "Multi-threaded / distributed", tone: "bad", body: "The 'obvious' way to scale.", points: [
            "Lock contention on the order book kills latency.",
            "Nondeterministic interleavings break fair, reproducible ordering.",
            "Can't replay to audit or recover exactly.",
          ] },
          { title: "Single-threaded, in-memory", tone: "good", body: "What real exchanges do.", points: [
            "No locks → cache-friendly, microsecond latency.",
            "One total order of events → fully deterministic.",
            "Replaying the input log reproduces the book exactly.",
          ] },
        ],
      },
    },
    {
      title: "The sequencer makes recovery trivial",
      body: "A **sequencer** stamps every incoming order with a strict sequence number *before* matching, defining one true order of events. Because matching is deterministic, durability doesn't need disk on the hot path — it needs the input log.",
      steps: [
        { title: "Sequence every order", detail: "Assign a monotonic sequence number and append it to a replicated input log before the engine sees it." },
        { title: "Match in memory", detail: "The single thread processes orders in sequence order, emitting trades and book updates — no disk, no locks." },
        { title: "Snapshot periodically", detail: "Checkpoint the in-memory book every so often so recovery doesn't replay from the beginning of time." },
        { title: "Recover by replay", detail: "On crash: load the latest snapshot, replay the log forward. Determinism guarantees the rebuilt book is byte-identical." },
      ],
      callouts: [
        { tone: "key", label: "Scale by partition, not by thread:", body: "Throughput comes from running independent single-threaded engines per symbol, not from parallelizing one book." },
        { tone: "tip", label: "Separate the read path:", body: "Market-data fan-out (trades, book changes) is published to consumers independently, so serving quotes never slows matching." },
      ],
    },
  ],
  qa: [
    {
      q: "Why is the matching engine often single-threaded and in-memory?",
      a: "Because correctness, fairness, and determinism outrank raw parallelism here. Matching must apply strict price-time priority in one exact, reproducible order; multiple threads would add locking overhead and nondeterministic interleavings that break fairness and make auditing/recovery impossible. A single thread over in-memory structures has no locks, is cache-friendly, and still handles millions of orders per second at microsecond latency. Durability is achieved by persisting the sequenced input (and snapshots), not by hitting disk during matching, so the hot path stays fast.",
      tip: "The counter-intuitive 'single-threaded for determinism + speed, durability via the input log' is exactly what this question probes.",
    },
    {
      q: "What is price-time priority and why does it matter?",
      a: "It's the fairness rule for matching: orders execute best-price-first, and among orders at the same price, earliest-arrival-first (FIFO). A limit buy matches the lowest-priced asks it can afford, oldest first at each price level; any unfilled quantity rests in the book. It matters because an exchange is regulated infrastructure where fairness must be exact and demonstrable — the same inputs must always produce the same matches, so participants can trust the market isn't arbitrarily reordering their orders.",
      tip: "Best-price-first, then FIFO-by-time; stress that it must be exact and reproducible for fairness/regulation.",
    },
    {
      q: "Why do you need a sequencer, and what does it enable?",
      a: "A sequencer assigns every incoming order a strict, total sequence number before matching, defining the single true order of events. That total order makes the entire system deterministic: replaying the sequenced stream always reproduces the exact same order book and trades. This enables fair matching (no ambiguity about who was first), crash recovery (replay the log from a snapshot to rebuild identical state), and auditing (prove exactly what happened). Without a sequencer, concurrency would make the outcome nondeterministic and unfair.",
      tip: "Sequencer → total order → determinism → fairness + replayable recovery + auditability. That chain is the answer.",
    },
    {
      q: "How do you make such a low-latency system durable and recoverable?",
      a: "Persist the sequenced input stream to an append-only, replicated log as (or before) the engine processes each event, and take periodic snapshots of the order book. Because matching is deterministic, recovery is just: load the latest snapshot and replay the log forward — you deterministically reconstruct the exact state, with no divergence. Replication of the log (and often hot-standby engines consuming the same sequence) provides high availability. Market-data publishing is a separate, independently scaled read path so it never slows matching.",
      tip: "Deterministic replay of a replicated input log + snapshots = durability without putting disk on the hot path.",
    },
  ],
  related: [
    "how-do-i-handle-ordering-of-events-when-it-matters",
    "how-do-i-make-rebuild-from-scratch-possible-if-everything-is",
    "how-do-i-debug-high-tail-latency-in-a-distributed-system",
    "idempotency-write-apis",
    "how-do-i-implement-distributed-transactions-without-2pc-pain",
  ],
};
