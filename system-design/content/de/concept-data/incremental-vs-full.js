export default {
  id: "incremental-vs-full",
  title: "Incremental vs full loads",
  icon: "⏫",
  chapter: 11,
  group: "Ingestion & pipelines",
  summary: "A full load re-copies the entire source every run — simple but O(table size) and increasingly unsustainable. An incremental load tracks a high-water mark and pulls only rows that changed since the last run — O(changes), far cheaper, but it needs a reliable change signal and care around deletes and late data.",
  widget: "de-incremental",
  widgetIntro: "The idea is a **high-water mark**: the pipeline remembers the maximum `updated_at` (or id, or log offset) it has already loaded. Next run it pulls only rows **above** that mark, then advances it. So a table with millions of rows but a few thousand daily changes moves a few thousand rows, not millions.\n\nAdd rows to the source and run both loads: the full load re-copies everything every time, while the incremental load moves only what's new and slides its watermark forward. Then see the catch — deletes and out-of-order updates the watermark can miss.",
  sections: [
    {
      title: "Full load: simple but O(table)",
      body: "A full load truncates the target and re-copies the whole source each run. It's trivially correct (the target always exactly matches the source, including deletes) and needs no change tracking — but it moves the entire table every time, so it stops scaling as data grows and hammers the source.",
      rules: ["Full load = correct and simple, but cost grows with table size, not with how much changed."],
    },
    {
      title: "Incremental load: a high-water mark",
      body: "Store the maximum value of a monotonic column you've loaded — usually `updated_at` or an auto-increment id. Each run selects `WHERE updated_at > :last_mark`, loads those rows (upserting by key), and advances the mark to the new max. You move only changed rows.",
      flow: ["read last mark", "SELECT WHERE updated_at > mark", "upsert changes", "advance mark"],
      body2: "This is the query-based cousin of CDC: cheaper than full loads, but relying on a column rather than the commit log.",
    },
    {
      title: "The three traps",
      body: "Incremental loads are faster but easy to get subtly wrong.",
      bullets: [
        "**Deletes are invisible:** a deleted row has no new `updated_at`, so it never appears — the target keeps a ghost. (Soft-delete flags or CDC solve this.)",
        "**Late / out-of-order data:** a row written late with an older timestamp can slip below the mark and be missed — use a small overlap window (re-scan the last N minutes).",
        "**Unreliable change column:** if `updated_at` isn't always bumped on update, changes are silently skipped.",
      ],
      rules: ["Incremental needs a trustworthy monotonic column, a delete strategy, and a lateness overlap."],
    },
    {
      title: "Patterns that make it safe",
      body: "Use an **overlapping window** (reload `> mark - safety_margin`) and upsert by primary key so re-loading a few rows is harmless (idempotent). Handle deletes with soft-delete flags, periodic full reconciliations, or by switching to log-based CDC. Many teams run incremental daily plus an occasional full reload to self-heal drift.",
      bullets: [
        "Upsert by key so overlap re-loads are idempotent.",
        "Periodic full reload (or reconciliation) to catch missed deletes/drift.",
        "Graduate to CDC when the change column can't be trusted.",
      ],
    },
  ],
  deepDiveTitle: "🔬 Deep dive",
  deepDiveIntro: "Incremental loading is a watermark plus a set of guards against the ways a watermark lies.",
  deepDive: [
    {
      title: "Watermark + idempotent upsert",
      body: "The pattern is: pull rows above the mark with a small safety overlap, upsert them by primary key, then advance the mark. The overlap re-loads a few recently-seen rows, but because the apply is an idempotent upsert, re-applying them is a no-op — so you trade a tiny bit of rework for not missing late writes.",
      stats: [
        { value: "O(changes)", label: "rows moved per run", tone: "green" },
        { value: "watermark", label: "max loaded updated_at / id", tone: "blue" },
        { value: "overlap", label: "re-scan for late data", tone: "amber" },
        { value: "upsert", label: "idempotent apply by key", tone: "accent" },
      ],
    },
    {
      title: "When to graduate to CDC",
      body: "Incremental-by-query breaks down when you can't trust the change column, must capture deletes precisely, or need low latency. Log-based CDC reads the commit log instead, catching every change (including deletes) in order with no reliance on an application-maintained timestamp. Incremental loads are the pragmatic middle; CDC is the robust end.",
      callout: { tone: "tip", label: "The senior framing:", body: "\"Incremental by high-water mark with an overlap window and idempotent upsert — O(changes) not O(table). Guard deletes with soft-deletes or periodic reconciliation, and graduate to log-based CDC when the change column can't be trusted or deletes must be exact.\"" },
    },
  ],
  qa: [
    {
      q: "How does an incremental load work and why use it over a full load?",
      a: "An incremental load keeps a high-water mark — the max updated_at or id it has already loaded — and each run pulls only rows above that mark, upserts them by key, and advances the mark. It moves O(changes) instead of O(table size), so it scales as data grows and spares the source, whereas a full load re-copies everything every run. The trade-off is that incremental needs a reliable change signal and careful handling of deletes and late data, which full loads get for free.",
      tip: "High-water mark + upsert + advance the mark is the mechanism; contrast O(changes) vs O(table).",
    },
    {
      q: "What are the failure modes of incremental loads?",
      a: "Three main ones. Deletes are invisible — a removed row produces no new timestamp, so the target keeps a ghost row. Late or out-of-order writes can land with a timestamp below the current mark and be skipped, so you use an overlapping re-scan window. And if the change column isn't reliably updated on every change, updates are silently missed. You mitigate with soft-delete flags or CDC for deletes, an overlap window plus idempotent upsert for lateness, and periodic full reconciliations to self-heal.",
      tip: "Deletes, late data, and an unreliable change column are the three traps — name the mitigation for each.",
    },
    {
      q: "Incremental-by-query vs CDC — when do you switch?",
      a: "Query-based incremental is simple and needs only a monotonic column, but it can't see deletes reliably, depends on the application maintaining that column, and polls the source. Switch to log-based CDC when you must capture deletes exactly, can't trust the change column, or need near-real-time latency — CDC reads the commit log and captures every change in order with no application cooperation. Incremental loading is the pragmatic default; CDC is where you go when its assumptions break.",
      tip: "Frame incremental as the lightweight default and CDC as the robust upgrade when deletes/latency/trust demand it.",
    },
  ],
  related: [],
};
