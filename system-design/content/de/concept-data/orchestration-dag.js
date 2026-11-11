export default {
  id: "orchestration-dag",
  title: "Orchestration (Airflow DAGs)",
  icon: "🧭",
  chapter: 13,
  group: "Ingestion & pipelines",
  summary: "An orchestrator models a pipeline as a DAG of tasks with dependencies, then schedules and runs them in order, retrying failures and surfacing state. It's the control plane that turns a pile of scripts into a reliable, observable, re-runnable pipeline — Airflow, Dagster, and similar tools.",
  widget: "de-dag",
  widgetIntro: "A pipeline is a **directed acyclic graph**: each task depends on the ones before it, and the orchestrator runs them in **topological order** — a task starts only once all its upstreams succeed. When a task fails it **retries**; if it finally fails, everything downstream is **skipped**, not run on bad data.\n\nWatch the DAG execute: nodes light up as they run and complete in dependency order. Fail a task to see retries kick in and the downstream subtree get blocked — the core value of an orchestrator over a cron script.",
  sections: [
    {
      title: "Why a DAG, not a cron script",
      body: "A chain of cron jobs has no idea about dependencies, failures, or state. An orchestrator makes the dependency graph explicit and owns execution: it runs tasks in order, waits for upstreams, retries transient failures, blocks downstream work when something breaks, and records what ran when. You get reliability and observability a script can't give you.",
      bullets: [
        "**Dependencies:** a task runs only after its upstreams succeed.",
        "**Retries & alerting:** transient failures retry; real ones page you.",
        "**Observability:** per-task state, logs, duration, history in one place.",
        "**Backfills:** re-run a date range to reprocess history.",
      ],
    },
    {
      title: "How scheduling works",
      body: "You define the DAG (tasks + dependencies) and a schedule (e.g. daily). For each scheduled interval the orchestrator creates a run, then executes tasks as their dependencies are satisfied, parallelizing independent branches. Each task is retried up to a limit on failure; a terminal failure marks downstream tasks as skipped/upstream-failed.",
      flow: ["extract", "→ validate", "→ transform", "→ load", "→ publish"],
      body2: "Independent branches (e.g. two sources) run in parallel and fan back in at a join task.",
    },
    {
      title: "Idempotent, parameterized tasks",
      body: "Orchestrators assume tasks can be **re-run** — on retry, on backfill, on manual replay. So tasks must be idempotent (re-running produces the same result) and parameterized by the run's logical date, so each run processes its own slice. A task that appends non-idempotently will double-write on every retry.",
      rules: ["Every task must be idempotent and keyed to its run's data interval — retries and backfills depend on it."],
    },
    {
      title: "Backfills and catch-up",
      body: "Because runs are keyed to a data interval, you can re-execute the DAG for past intervals to backfill new or corrected data — the same code, different dates. This is why orchestration pairs so well with incremental, partition-overwriting tasks: backfilling a month just re-runs 30 idempotent daily runs.",
      rules: ["Backfill = re-run the same DAG for past intervals; it only works if tasks are idempotent and date-parameterized."],
    },
  ],
  deepDiveTitle: "🔬 Deep dive",
  deepDiveIntro: "The orchestrator is a control plane: it decides what runs, in what order, and what happens when something fails.",
  deepDive: [
    {
      title: "Failure semantics",
      body: "A failed task retries with backoff up to its limit. If it still fails, the orchestrator marks downstream tasks as skipped (they never run on missing/bad data) and alerts. This 'stop the subtree' behavior is a feature: it prevents a failed extract from silently producing an empty report. You then fix and clear the failed task to resume.",
      stats: [
        { value: "topo order", label: "run after upstreams succeed", tone: "green" },
        { value: "retry", label: "transient failures, with backoff", tone: "amber" },
        { value: "skip downstream", label: "don't run on bad data", tone: "red" },
        { value: "backfill", label: "re-run past intervals", tone: "blue" },
      ],
    },
    {
      title: "Orchestration ≠ processing",
      body: "The orchestrator coordinates; it shouldn't do the heavy lifting. Tasks should submit work to the right engine (a warehouse query, a Spark job) rather than crunching data inside the scheduler. Keeping the orchestrator thin keeps it reliable and lets each step scale on the right compute. Modern tools (Dagster, Airflow with assets) also model data assets and lineage, not just task order.",
      callout: { tone: "tip", label: "The senior framing:", body: "\"Model the pipeline as a DAG so dependencies, retries, and backfills are explicit; keep every task idempotent and date-parameterized; and let the orchestrator coordinate while the actual compute runs on the warehouse or Spark. That's the difference between a reliable pipeline and a fragile chain of crons.\"" },
    },
  ],
  qa: [
    {
      q: "Why use an orchestrator instead of chained cron jobs?",
      a: "Cron jobs have no concept of dependencies, failures, or state — if step 2 fails, step 3 runs anyway on missing data, and you find out from a wrong report. An orchestrator models the pipeline as a DAG and owns execution: it runs tasks in dependency order, parallelizes independent branches, retries transient failures, blocks downstream tasks when something fails, records per-task state and history, and supports backfills. You get the reliability, observability, and re-runnability a script can't provide.",
      tip: "Lead with 'explicit dependencies + failure handling + observability + backfills' — the things cron can't do.",
    },
    {
      q: "What happens when a task fails?",
      a: "The orchestrator retries it up to a configured limit, usually with backoff, to absorb transient issues. If it still fails, the task is marked failed, downstream tasks that depend on it are skipped (marked upstream-failed) so they never run on missing or bad data, and an alert fires. You fix the root cause and clear the failed task to resume from there. This 'stop the affected subtree' behavior is deliberate — it prevents silent bad output.",
      tip: "Retry → terminal failure → skip downstream → alert; stress that skipping downstream is a feature, not a bug.",
    },
    {
      q: "Why must orchestrated tasks be idempotent and date-parameterized?",
      a: "Because the orchestrator re-runs tasks — on retry, manual replay, and especially backfills. If a task isn't idempotent (e.g. it appends), every re-run double-writes. Parameterizing by the run's logical date means each run processes only its own slice, so re-running one date reprocesses exactly that partition. Together, idempotent + date-keyed tasks make retries safe and let you backfill a range simply by re-executing the same DAG for past intervals.",
      tip: "Tie it to retries and backfills: non-idempotent tasks corrupt on re-run, which orchestrators do routinely.",
    },
  ],
  related: [],
};
