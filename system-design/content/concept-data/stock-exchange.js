export default {
  id: "stock-exchange",
  title: "Design a stock exchange",
  icon: "🏦",
  chapter: 28,
  group: "Money & real-time",
  summary: "Match buy and sell orders fairly, in order, with ultra-low and predictable latency. The heart is a single-threaded in-memory matching engine over an order book, fed by a strict sequencer, with correctness and determinism prized above raw parallelism.",
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
