export default {
  id: "join-strategies",
  title: "Join strategies (broadcast vs shuffle)",
  icon: "🔗",
  chapter: 21,
  group: "Performance & quality",
  summary: "How a distributed engine joins two tables is the single biggest performance lever. A broadcast join copies a small table to every executor so the big table never moves — no shuffle. A shuffle (sort-merge) join repartitions both sides by the join key across the network. Knowing when each applies, and sizing the broadcast, is most of join tuning.",
  widget: "de-join",
  widgetIntro: "The expensive part of a distributed join is **moving data so matching keys meet**. A **shuffle join** moves *both* tables: each is repartitioned by the join key across the network so equal keys land on the same task. A **broadcast join** avoids that entirely — if one side is small, copy it in full to every executor and join it locally against the big side, which never moves.\n\nToggle the strategy and watch the data movement: broadcast ships one small copy to each executor; shuffle repartitions both big tables all-to-all. The size of the small side decides which is possible.",
  sections: [
    {
      title: "The two strategies",
      body: "Both get matching keys onto the same executor; they differ in what moves.",
      table: {
        head: ["", "Broadcast join", "Shuffle (sort-merge) join"],
        rows: [
          ["Moves", "Small table → every executor", "Both tables, repartitioned by key"],
          ["Big table", "Stays put (no shuffle)", "Shuffled across network"],
          ["Needs", "One side small enough to fit", "Works for any sizes"],
          ["Cost", "Cheap — one small broadcast", "Expensive — all-to-all shuffle"],
        ],
      },
    },
    {
      title: "Broadcast join: avoid the shuffle",
      body: "If one table is small (a dimension, a lookup), the engine copies it to every executor's memory. Each executor then joins its local partition of the big table against the in-memory copy — no repartitioning of the big table at all. This is the fastest join and the one you engineer for whenever a small side exists.",
      flow: ["small table", "broadcast to all executors", "join locally vs big-table partition"],
      rules: ["A small side → broadcast it; the big table never shuffles. This is the fast path."],
    },
    {
      title: "Shuffle join: when both are big",
      body: "When neither side fits in memory for broadcast, the engine shuffles: both tables are repartitioned by the join key (hash) so all rows with the same key land on the same task, then joined (typically sort-merge). Correct for any sizes, but it moves both large datasets over the network — the expensive default you try to avoid.",
      flow: ["table A", "table B", "both shuffled by key", "sort-merge per partition"],
    },
    {
      title: "Making broadcast possible",
      body: "Since broadcast wins, engineer for it: filter and aggregate the small side down first, keep dimension tables lean, raise the broadcast threshold when a side is just over it, and let the engine's adaptive execution pick broadcast at runtime when it sees the actual size. Watch skew too — a hot join key overloads one task in a shuffle join; salting or AQE skew handling helps.",
      bullets: [
        "Shrink the small side (filter/select) so it qualifies for broadcast.",
        "Tune the broadcast size threshold for borderline tables.",
        "Use adaptive execution to choose broadcast at runtime.",
        "Mitigate join-key skew with salting / adaptive skew handling.",
      ],
    },
  ],
  deepDiveTitle: "🔬 Deep dive",
  deepDiveIntro: "Join choice is where distributed data engineering pays off or falls over — it's mostly about data moved and skew.",
  deepDive: [
    {
      title: "Why broadcast is so much cheaper",
      body: "A shuffle join moves the entirety of both tables across the network and to disk; a broadcast join moves one small table once, to each executor, and leaves the big table in place. If the big table is terabytes and the small one megabytes, that's the difference between moving terabytes and moving a few megabytes — often an order-of-magnitude speedup from a single decision.",
      stats: [
        { value: "big stays", label: "broadcast: no big-table shuffle", tone: "green" },
        { value: "both move", label: "shuffle: repartition both", tone: "red" },
        { value: "fits in mem", label: "broadcast eligibility", tone: "blue" },
        { value: "skew", label: "hot key stalls a shuffle join", tone: "amber" },
      ],
    },
    {
      title: "Skew is the other killer",
      body: "Even a shuffle join is fine until one join key dominates — then that key's partition is enormous and one task does most of the work while others finish early. The stage waits on the straggler. Fixes are salting the hot key (splitting it across tasks) or adaptive skew join handling. Broadcasting the small side also sidesteps skew entirely, since the big side isn't partitioned by the key.",
      callout: { tone: "tip", label: "The senior framing:", body: "\"If one side is small, broadcast it so the big table never shuffles — the fast path I engineer for by shrinking the small side. Otherwise sort-merge with a shuffle, and watch join-key skew, fixing it with salting or adaptive execution.\"" },
    },
  ],
  qa: [
    {
      q: "Broadcast join vs shuffle join — how do they differ and when do you use each?",
      a: "A shuffle (sort-merge) join repartitions both tables by the join key across the network so matching keys meet, then merges — correct for any sizes but it moves both large datasets, which is expensive. A broadcast join applies when one side is small enough to fit in memory: that side is copied to every executor and joined locally against the big table, which never moves, so there's no shuffle. You use broadcast whenever a small side exists (it's the fast path) and fall back to shuffle only when both sides are large.",
      tip: "Contrast what moves (both tables vs one small copy); broadcast when a side is small, shuffle otherwise.",
    },
    {
      q: "How do you make a join use the fast broadcast path?",
      a: "Engineer the small side to qualify: filter and aggregate it down before the join, select only needed columns, and keep dimension/lookup tables lean so they fit under the broadcast threshold. For borderline cases, raise the broadcast size threshold, or rely on adaptive query execution to detect the actual size at runtime and switch to broadcast. The goal is to ensure one side is small enough that the big table never has to shuffle.",
      tip: "Shrink the small side + tune the threshold + use AQE; the aim is 'keep the big table from shuffling'.",
    },
    {
      q: "What is join skew and how do you handle it?",
      a: "Join skew is when one join key appears far more often than others, so in a shuffle join its partition is huge and lands on a single task that becomes a straggler while the rest idle — the stage waits on it. Handle it by salting the hot key (appending a random suffix to split it across multiple tasks, replicating the matching rows on the other side) or by enabling adaptive skew join handling, which splits skewed partitions automatically. Broadcasting the small side also avoids skew, since the big table isn't partitioned by the join key at all.",
      tip: "Define skew as a hot-key straggler; fixes are salting, adaptive skew handling, or broadcasting to sidestep it.",
    },
  ],
  related: [],
};
