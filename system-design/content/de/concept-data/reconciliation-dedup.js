export default {
  id: "reconciliation-dedup",
  title: "Reconciliation & deduplication",
  icon: "🧮",
  chapter: 24,
  group: "Performance & quality",
  summary: "At-least-once delivery and retries mean the same record can arrive more than once, so pipelines deduplicate by a stable key to keep counts correct. Reconciliation is the complementary check: prove that source and target agree (row counts, sums, hashes) so you catch silent loss or duplication instead of trusting the pipeline blindly.",
  widget: "de-reconcile",
  widgetIntro: "Two sides of trusting your data. **Deduplication** removes the duplicates that at-least-once delivery and retries inevitably create — collapse records by a stable key so each real event is counted once. **Reconciliation** then verifies the result: does the target's row count (or sum, or key set) match the source's? A mismatch means silent loss or duplication you'd otherwise never notice.\n\nSend records with duplicates, toggle dedup, and watch the target count — with dedup it matches the source; without it, duplicates inflate the target and reconciliation flags the mismatch.",
  sections: [
    {
      title: "Why duplicates are inevitable",
      body: "Most pipelines deliver at-least-once: a lost ack causes a retry, a crashed consumer re-reads from its last offset, a backfill re-processes a window. All of these redeliver records. So duplicates aren't a rare bug — they're the normal consequence of reliable delivery, and every pipeline must handle them to keep aggregates correct.",
      rules: ["At-least-once delivery guarantees duplicates — dedup is a requirement, not an edge case."],
    },
    {
      title: "Deduplication strategies",
      body: "Collapse records by a key that uniquely identifies the real event.",
      bullets: [
        "**Dedup by primary/event key:** keep one row per key (latest wins), via MERGE/UPSERT or `ROW_NUMBER()` windowing.",
        "**Idempotent sink:** overwrite-by-partition or UPSERT so a re-delivery is a no-op (the same pattern as exactly-once).",
        "**Dedup window:** for streams, remember seen event-ids for a bounded time and drop repeats within it.",
      ],
      body2: "Dedup needs a trustworthy unique key — if events have no stable id, you may have to derive one (hash of fields + timestamp).",
    },
    {
      title: "Reconciliation: trust but verify",
      body: "Dedup makes the target correct *if the pipeline behaved*. Reconciliation checks that it did, by comparing the source and target independently: row counts per partition, control totals (sum of an amount column), or key-set/hash comparisons. When they disagree, you've caught loss or duplication before it reaches a report — the safety net behind every number.",
      flow: ["count/sum/hash source", "count/sum/hash target", "compare", "match ✓ or alert on drift"],
    },
    {
      title: "What reconciliation catches",
      body: "A missed delete leaving a ghost row, dropped records from a bug, double-counting from a dedup gap, or drift from a partial failure — none of these throw an error; they just make the numbers wrong. Reconciliation (often a scheduled job comparing control totals per day/partition) is the check that turns silent discrepancies into alerts, and it pairs naturally with a periodic full reload to self-heal.",
      bullets: [
        "Row-count and control-total checks per partition/day.",
        "Key-set or hash comparison for exact agreement.",
        "Alert on drift; pair with periodic full reload to self-heal.",
      ],
    },
  ],
  deepDiveTitle: "🔬 Deep dive",
  deepDiveIntro: "Dedup keeps the numbers right; reconciliation proves they're right. You want both.",
  deepDive: [
    {
      title: "Dedup is idempotency, reconciliation is observability",
      body: "Deduplication is the write-side discipline — make the sink collapse duplicates (the same idempotency pattern that gives effectively-once). Reconciliation is the read-side check — independently verify source and target agree. One prevents the error, the other detects it when prevention slips. Mature pipelines do both: idempotent dedup on the way in, scheduled reconciliation to confirm.",
      stats: [
        { value: "dedup by key", label: "one row per real event", tone: "green" },
        { value: "control totals", label: "count / sum / hash compare", tone: "blue" },
        { value: "per partition", label: "reconcile at the grain you load", tone: "accent" },
        { value: "alert on drift", label: "catch silent loss/dup", tone: "amber" },
      ],
    },
    {
      title: "Where dedup and reconciliation live",
      body: "Dedup belongs at the raw→clean boundary (collapse on ingest, before aggregates are built), using the event/primary key. Reconciliation runs as its own scheduled job comparing source extracts to target tables at the partition grain, with results trended over time. Combined with incremental loads' periodic full reconciliation, they keep a pipeline honest without manual spot-checking.",
      callout: { tone: "tip", label: "The senior framing:", body: "\"At-least-once means duplicates, so I dedup by a stable key with an idempotent MERGE at the clean boundary, then run scheduled reconciliation — control totals and key-set comparison per partition — to prove source and target agree and alert on any drift. Prevent with dedup, detect with reconciliation.\"" },
    },
  ],
  qa: [
    {
      q: "Why do pipelines need deduplication, and how do you do it?",
      a: "Because most pipelines deliver at-least-once — lost acks trigger retries, crashed consumers re-read from their offset, backfills reprocess windows — so the same record arrives more than once and inflates aggregates. You dedup by a stable key that identifies the real event: MERGE/UPSERT by primary key, keep-one-per-key with ROW_NUMBER() windowing, an idempotent overwrite-by-partition sink, or a bounded dedup window on event-ids for streams. It requires a trustworthy unique key; if events lack one, derive it from a hash of identifying fields.",
      tip: "At-least-once → inevitable duplicates → dedup by a stable key (MERGE/row-number/idempotent sink).",
    },
    {
      q: "What is reconciliation and what does it catch?",
      a: "Reconciliation independently compares source and target to prove they agree — typically row counts per partition, control totals like the sum of an amount column, or key-set/hash comparisons. It catches the failures that don't throw errors: missed deletes leaving ghost rows, records dropped by a bug, double-counting from a dedup gap, or drift from a partial failure. Run as a scheduled job at the load grain with results trended over time, it turns silent discrepancies into alerts before they reach a report.",
      tip: "Reconciliation = independent source-vs-target comparison (counts/sums/hashes) that catches silent loss/duplication.",
    },
    {
      q: "How do deduplication and reconciliation relate?",
      a: "They're prevention and detection. Deduplication is the write-side discipline that keeps duplicates from corrupting the data — the same idempotency pattern behind effectively-once. Reconciliation is the read-side check that independently verifies source and target agree, catching errors when prevention slips (a dedup gap, a dropped batch). Mature pipelines do both: idempotent dedup by key at the clean boundary on the way in, plus scheduled reconciliation of control totals to confirm the result and alert on drift.",
      tip: "Dedup prevents (idempotency/write-side), reconciliation detects (observability/read-side) — use both.",
    },
  ],
  related: [],
};
