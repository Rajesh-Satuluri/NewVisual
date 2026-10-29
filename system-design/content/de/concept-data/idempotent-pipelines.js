export default {
  id: "idempotent-pipelines",
  title: "Idempotent & retriable pipelines",
  icon: "♻️",
  chapter: 14,
  group: "Ingestion & pipelines",
  summary: "Pipelines fail and get re-run — on retries, backfills, and manual replays — so every task must be idempotent: running it twice produces the same result as running it once. The canonical pattern is overwrite-by-partition instead of blind append, so a re-run replaces its slice rather than duplicating it.",
  widget: "de-idempotent",
  widgetIntro: "Orchestrators retry failed tasks and re-run whole date ranges for backfills, so a task **will** execute more than once on the same input. If it blindly **appends**, every re-run double-writes and the data drifts. If it **overwrites its partition** — delete-then-write, or MERGE by key — a re-run replaces exactly its own slice and the result is identical no matter how many times it runs.\n\nRun the task, then run it again. In append mode the row count keeps climbing; flip to overwrite-by-partition and re-runs converge to the correct count. That property is what makes retries and backfills safe.",
  sections: [
    {
      title: "Why idempotency is non-negotiable",
      body: "In a real pipeline, re-execution is routine, not exceptional: a transient failure triggers a retry, a late-arriving fix triggers a backfill, an on-call engineer replays a run. Each of those runs the same task on the same data again. Unless the task is idempotent, every re-run corrupts the output — usually as silent duplicates nobody notices until the numbers are wrong.",
      rules: ["Assume every task runs more than once on the same input — design so that's harmless."],
    },
    {
      title: "The anti-pattern: blind append",
      body: "`INSERT INTO target SELECT … FROM source WHERE date = :d` looks fine until it runs twice. The second run appends the same rows again, doubling that day's data. Retries and backfills make this guaranteed, not hypothetical. Append is only safe when each run writes a genuinely new, never-repeated slice.",
      callout: { tone: "bad", label: "Not idempotent:", body: "A blind INSERT re-run duplicates its rows. One retry = double-counted metrics." },
    },
    {
      title: "The pattern: overwrite the partition",
      body: "Make the write replace exactly the slice this run owns. The cleanest form is partition overwrite: delete (or truncate) the target partition for the run's date, then write it fresh. On a table format, `INSERT OVERWRITE` / dynamic partition overwrite does this atomically. Now a re-run replaces its partition with an identical result — idempotent by construction.",
      flow: ["run for date = D", "overwrite partition D", "re-run → replaces D", "same result"],
      rules: ["Overwrite-by-partition (or MERGE by key) → re-running a slice replaces it, never duplicates it."],
    },
    {
      title: "Other idempotency tools",
      body: "Partition overwrite is the workhorse, but the toolbox is bigger:",
      bullets: [
        "**MERGE / UPSERT by primary key:** re-applying a row updates in place instead of inserting again.",
        "**Deterministic keys:** derive the output key from inputs so duplicates collide and dedupe.",
        "**Idempotency keys / dedup on event id:** drop already-seen events at the sink.",
        "**Transactional (atomic) writes:** a table format commit so a half-run leaves no partial output.",
      ],
    },
  ],
  deepDiveTitle: "🔬 Deep dive",
  deepDiveIntro: "Idempotency is what lets the rest of the stack — orchestration, at-least-once delivery, backfills — be simple and safe.",
  deepDive: [
    {
      title: "It makes at-least-once enough",
      body: "Exactly-once delivery is hard and often impossible end-to-end. But if your sink is idempotent, at-least-once delivery is enough: duplicates are harmless because re-applying produces the same state. This is the single most important reason to build idempotent sinks — it turns a hard distributed-systems problem into a storage pattern.",
      stats: [
        { value: "overwrite", label: "replace the run's partition", tone: "green" },
        { value: "MERGE by key", label: "upsert, don't re-insert", tone: "blue" },
        { value: "at-least-once ✓", label: "duplicates become harmless", tone: "accent" },
        { value: "backfill-safe", label: "re-run any date range", tone: "amber" },
      ],
    },
    {
      title: "Designing for replay",
      body: "Key every task to its data interval and make its write replace that interval. Then retries, backfills, and manual replays are all 'just re-run it' — no special casing, no cleanup. The discipline is: a task's output must be a pure, overwriting function of its input slice, with no dependence on how many times or in what order it ran.",
      callout: { tone: "tip", label: "The senior framing:", body: "\"Every task is idempotent: it overwrites its own partition (or MERGEs by key), so retries, backfills, and at-least-once delivery can all re-run it safely. That one property is what lets the orchestrator and the delivery layer stay simple.\"" },
    },
  ],
  qa: [
    {
      q: "What does it mean for a pipeline task to be idempotent, and why does it matter?",
      a: "Idempotent means running the task twice on the same input yields the same result as running it once. It matters because re-execution is routine: orchestrators retry failed tasks, backfills re-run date ranges, and engineers replay runs. A non-idempotent task (like a blind append) duplicates its output every re-run, usually as silent duplicates that corrupt metrics. Idempotency makes all that re-running safe, so retries and backfills are just 're-run it' with no cleanup.",
      tip: "Define it crisply (same result on re-run) and tie it to the routine re-execution orchestrators cause.",
    },
    {
      q: "How do you make a load idempotent?",
      a: "The workhorse is overwrite-by-partition: instead of appending, the task deletes/truncates the target partition for its run's date and writes it fresh (INSERT OVERWRITE / dynamic partition overwrite on a table format), so a re-run replaces exactly its slice. Alternatives are MERGE/UPSERT by primary key (re-applying a row updates in place), deterministic output keys so duplicates collide, and dedup on event/idempotency id at the sink. The principle: the write must replace the run's slice, not add to it.",
      tip: "Lead with overwrite-by-partition and MERGE-by-key; the common theme is 'replace the slice, don't append'.",
    },
    {
      q: "How does idempotency relate to exactly-once delivery?",
      a: "It largely replaces the need for it. True end-to-end exactly-once delivery is hard and often impractical, but if the sink is idempotent, at-least-once delivery is sufficient: duplicate deliveries just re-apply the same change and produce the same state. So rather than chasing exactly-once in the transport, you make the write idempotent (overwrite or MERGE by key) and accept at-least-once — turning a hard distributed-systems problem into a storage design pattern.",
      tip: "'Idempotent sink + at-least-once = effectively-once' is the key insight interviewers want.",
    },
  ],
  related: [],
};
