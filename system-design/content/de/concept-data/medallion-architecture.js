export default {
  id: "medallion-architecture",
  title: "Medallion architecture (Bronze / Silver / Gold)",
  icon: "🥉",
  chapter: 2,
  group: "Foundations",
  summary: "Refine data in named layers: Bronze holds raw ingested data exactly as it arrived, Silver holds cleaned, de-duplicated, conformed data, and Gold holds business-ready aggregates. Each hop is a quality checkpoint, and every layer can be rebuilt from the one below.",
  widget: "de-medallion",
  widgetIntro: "Medallion is a **layered refinement** pattern. Raw records land in **Bronze** untouched — including the dirty ones (nulls, duplicates, bad types). Moving to **Silver**, they are validated and de-duplicated: some rows are repaired, some are dropped. Silver rows are then rolled up into **Gold**, the aggregated tables that power dashboards and models.\n\nInject records and watch them flow through the three tiers — dirty rows marked, fixed or dropped at Silver, and Gold tables accumulating. The key property: because Bronze is immutable raw history, you can always **recompute Silver and Gold** when logic changes.",
  sections: [
    {
      title: "The three layers",
      body: "Medallion (popularized by Databricks, but format-agnostic) organizes a lakehouse into three progressively refined layers, each a table you can query and trust at a known quality level.",
      table: {
        head: ["Layer", "Contents", "Quality"],
        rows: [
          ["🥉 Bronze", "Raw ingested data, as-is, append-only", "Unvalidated — faithful copy of source"],
          ["🥈 Silver", "Cleaned, de-duplicated, conformed, joined", "Trusted, queryable detail"],
          ["🥇 Gold", "Business-level aggregates & marts", "Curated, serving-ready"],
        ],
      },
      body2: "Bronze is the system of record for *ingested* data; Silver is the system of record for *clean* data; Gold is what the business actually consumes.",
    },
    {
      title: "Bronze — raw landing",
      body: "Bronze captures source data with as little transformation as possible: append the raw rows (plus ingest metadata like load time and source file). Keeping it raw and immutable means you never lose fidelity and can always reprocess downstream layers when a bug or a new requirement appears.",
      bullets: [
        "Append-only; never mutate or clean in place.",
        "Add lineage columns (ingest timestamp, source, batch id).",
        "Schema is permissive — capture first, validate later.",
      ],
      rules: ["Bronze is your replayable history — if Silver/Gold logic changes, you rebuild from Bronze."],
    },
    {
      title: "Silver — cleaned & conformed",
      body: "Silver is where data quality happens. You validate types and constraints, drop or quarantine bad rows, de-duplicate (events arrive more than once under at-least-once delivery), standardize formats, and join/conform across sources into clean entities. Most of a pipeline's logic lives here.",
      bullets: [
        "**Validate:** enforce schema, null rules, ranges; quarantine failures.",
        "**Deduplicate:** collapse repeats from retries / at-least-once delivery.",
        "**Conform:** standardize units, codes, and keys across sources.",
      ],
    },
    {
      title: "Gold — business-ready",
      body: "Gold holds the aggregates and dimensional models the business consumes: daily revenue by region, a customer 360 table, feature tables for ML. Gold is typically small relative to Bronze/Silver and is optimized for fast serving to BI tools and applications.",
      flow: ["Silver detail", "aggregate / model", "Gold marts", "BI · ML · apps"],
    },
    {
      title: "Why layer at all?",
      body: "Layering turns an opaque pipeline into a series of inspectable, rebuildable checkpoints. If a dashboard looks wrong you can bisect: is Bronze capturing correctly? Is Silver clean? Is the Gold aggregation right? And because each layer is derived from the one below, a logic change means reprocessing forward — not re-ingesting from source.",
      rules: ["Each layer is independently queryable and rebuildable — that's what makes pipelines debuggable."],
    },
  ],
  deepDiveTitle: "🔬 Deep dive",
  deepDiveIntro: "Medallion is simple to state and subtle to run well. The interesting parts are idempotent reprocessing, where quality gates sit, and not over-engineering the layers.",
  deepDive: [
    {
      title: "Reprocessing is the whole point",
      body: "Because Bronze is immutable raw history, each downstream layer is a pure function of the layer below. Change a cleaning rule or fix a bug, and you re-derive Silver and Gold — no need to go back to the (possibly gone) source system.",
      steps: [
        { title: "Source → Bronze: append raw", detail: "Immutable; the faithful record of what arrived." },
        { title: "Bronze → Silver: clean (idempotent)", detail: "Re-runnable: same Bronze input always yields the same Silver." },
        { title: "Silver → Gold: aggregate (idempotent)", detail: "Recompute marts whenever definitions change." },
      ],
      callout: { tone: "key", label: "Idempotency rule:", body: "Each layer transform must be safe to re-run — overwrite the target partition rather than blindly append, so a retry or backfill never double-counts." },
    },
    {
      title: "Where quality gates live",
      body: "Validation belongs at the Bronze→Silver boundary: that's the gate that stops bad data from reaching trusted tables. Failing rows should be quarantined (written to a reject table), not silently dropped — so you can measure and fix data quality instead of losing rows invisibly.",
      callout: { tone: "warn", label: "Don't silently drop:", body: "Quarantine bad rows to a reject/DLQ table with the reason. A pipeline that silently discards 5% of records is worse than one that fails loudly." },
    },
    {
      title: "Don't over-layer",
      body: "Three layers is a convention, not a law. Small pipelines may fold Silver and Gold together; large ones may add sub-layers. The point is meaningful quality checkpoints, not ceremony — adding layers that don't change trust level just adds cost and latency.",
      callout: { tone: "tip", label: "The senior framing:", body: "\"Bronze = replayable raw, Silver = the clean source of truth, Gold = serving. I keep Bronze immutable so every layer is a rebuildable, idempotent function of the one below.\"" },
    },
  ],
  qa: [
    {
      q: "Walk me through the Bronze, Silver, and Gold layers.",
      a: "Bronze is raw ingested data appended as-is, with lineage metadata — an immutable, replayable copy of the source. Silver is the cleaned layer: validated, de-duplicated, conformed, and joined into trustworthy detail tables, where most pipeline logic lives. Gold is business-ready: aggregates, dimensional models, and feature tables optimized for serving to BI and ML. Each layer is derived from the one below, so you can rebuild forward when logic changes.",
      tip: "Stress that each layer is a rebuildable function of the previous one — that's the property that makes medallion valuable, not the three names.",
    },
    {
      q: "Why keep a raw Bronze layer instead of cleaning on ingest?",
      a: "Because cleaning is lossy and your rules will change. If you only store cleaned data and later find a bug in the cleaning logic — or need a field you'd discarded — you may be unable to recover it, especially if the source system has moved on. An immutable raw Bronze layer lets you reprocess Silver and Gold at any time from faithful history, which is cheap on object storage.",
      tip: "'Rules change and cleaning is lossy' is the crux — Bronze is insurance against your future self's bugs.",
    },
    {
      q: "How do you make medallion transforms safe to re-run (backfills, retries)?",
      a: "Make each transform idempotent: a given input partition always produces the same output, and writes overwrite the target partition rather than appending. Then a retry or a backfill re-derives the same result instead of double-counting. Deduplicate in Silver to absorb at-least-once delivery, and overwrite-by-partition in Gold so recomputing a day's aggregate replaces it cleanly.",
      tip: "Idempotent, overwrite-by-partition writes are the mechanism — connect it to backfills and at-least-once delivery.",
    },
    {
      q: "Where should data-quality checks go, and what happens to bad rows?",
      a: "Put the main quality gate at the Bronze→Silver boundary so bad data never reaches trusted tables. Validate schema, nulls, ranges, and uniqueness, and quarantine failing rows to a reject table with the failure reason rather than silently dropping them — so data quality is measurable and fixable. Silver then contains only rows you trust.",
      tip: "Quarantine-don't-drop is the point interviewers look for; silent drops hide real problems.",
    },
  ],
  related: [],
};
