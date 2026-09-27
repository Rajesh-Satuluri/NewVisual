/* ============================================================
   data/prep/chains.js — Follow-up Interview Chains
   ------------------------------------------------------------
   Each chain is one topic drilled progressively deeper, the way a
   real interviewer keeps pushing. Rendered by
   js/components/follow-up-chain.js and js/modules/interview-chains.js.

   Shape:
     { id, topic, category, note?, steps: [
         { q, expectedAnswer, keyConcepts:[…], commonMistakes:[…],
           seniorAnswer } ] }

   Content is trusted HTML (authored in-repo). ES5-safe.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});
  AV.data = AV.data || {};

  AV.data.chains = [
    /* ── XCom ───────────────────────────────────────────────── */
    {
      id: "xcom",
      topic: "XCom",
      category: "execution",
      note: "The interviewer opens easy, then pushes on data size, alternatives, and retry safety — where XCom questions are actually decided.",
      steps: [
        {
          q: "What is XCom, in a sentence or two?",
          expectedAnswer: "XCom (\"cross-communication\") lets tasks pass <b>small</b> pieces of data to each other. A task pushes a value under a key; downstream tasks pull it. Values are stored in the metadata database.",
          keyConcepts: ["cross-task communication", "stored in metadata DB", "small values", "push / pull by key"],
          commonMistakes: ["Describing it as a general data-transfer channel", "Not knowing it's persisted in the metadata DB"],
          seniorAnswer: "I frame it as a control-plane channel, not a data pipe — ideal for an id, a path, a small config, or a count, backed by the metadata DB and optionally a custom XCom backend."
        },
        {
          q: "Would you use XCom to pass a 500 MB DataFrame between two tasks?",
          expectedAnswer: "No. XCom is for small values; 500 MB would bloat the metadata DB and likely blow past serialization limits.",
          keyConcepts: ["not for large payloads", "metadata-DB pressure", "serialization limits"],
          commonMistakes: ["Saying yes because \"it worked in dev\"", "Ignoring the metadata-DB impact"],
          seniorAnswer: "No — I'd write the DataFrame to object storage or a table and pass only the path/URI through XCom, keeping the metadata DB lean and letting a real store handle the bytes."
        },
        {
          q: "Why not — what specifically goes wrong?",
          expectedAnswer: "Every XCom value is serialized into a row in the metadata DB. Large payloads bloat that DB, slow every scheduler and UI query against it, and can exceed column/serialization limits.",
          keyConcepts: ["DB bloat", "serialization overhead", "shared bottleneck"],
          commonMistakes: ["Thinking the only cost is disk space", "Missing that the metadata DB is shared by the whole cluster"],
          seniorAnswer: "The metadata DB is the cluster's shared brain — anything that bloats it degrades scheduling and the UI for <i>everyone</i>, which is why large XCom is a cluster-wide anti-pattern, not just a per-DAG smell."
        },
        {
          q: "So what would you use instead?",
          expectedAnswer: "Persist the data to external storage (an object store or a table) and pass only a reference — a path, URI, or key — through XCom.",
          keyConcepts: ["object storage", "pass a reference, not the payload", "custom XCom backend"],
          commonMistakes: ["Passing the data as one giant string", "Not knowing a custom XCom backend exists"],
          seniorAnswer: "Either pass a URI through standard XCom, or configure a custom XCom backend that transparently offloads values to S3/GCS while keeping the push/pull API — best when many DAGs pass medium-sized objects."
        },
        {
          q: "What happens to that reference if the upstream task retries?",
          expectedAnswer: "If the write isn't idempotent, a retry can leave a partial or duplicated object and downstream may read stale/incomplete data. The path must be deterministic per run.",
          keyConcepts: ["idempotent writes", "deterministic path per logical date", "retry safety"],
          commonMistakes: ["Assuming the reference is always valid", "Using a random or now()-based path that changes between tries"],
          seniorAnswer: "I make the object path deterministic from the logical date and write atomically (write-temp-then-rename, or overwrite the partition), so a retry overwrites the same object and downstream always reads a complete file."
        },
        {
          q: "How do you make the whole hand-off idempotent end to end?",
          expectedAnswer: "Key the write to the run's logical date, overwrite rather than append, write atomically, and have downstream read the same deterministic key — so any number of retries converge to one correct result.",
          keyConcepts: ["logical-date keying", "overwrite / atomic write", "converge on retries"],
          commonMistakes: ["Appending instead of overwriting", "Downstream reading \"latest\" instead of the run's partition"],
          seniorAnswer: "Determinism is the whole game: derive the key from <code>{{ ds }}</code>, overwrite the slice atomically, and read that same slice downstream. Then retries, backfills, and reruns all produce identical output — the definition of an idempotent pipeline."
        }
      ]
    },

    /* ── Sensors ────────────────────────────────────────────── */
    {
      id: "sensors",
      topic: "Sensors & waiting",
      category: "execution",
      note: "From \"what is a sensor\" to the worker-slot economics that separate juniors from seniors.",
      steps: [
        {
          q: "What is a sensor in Airflow?",
          expectedAnswer: "A special operator that waits for a condition to become true — a file landing, a partition appearing, an upstream task finishing — before downstream tasks may run.",
          keyConcepts: ["waits for a condition", "gates downstream", "poke / reschedule / deferrable"],
          commonMistakes: ["Thinking it's just a sleep/delay", "Not knowing it blocks downstream until satisfied"],
          seniorAnswer: "It's a gate that turns an external readiness condition into a first-class dependency, so downstream work only starts once the data (or upstream) is actually there."
        },
        {
          q: "In poke mode, what's the cost of a sensor that waits several hours?",
          expectedAnswer: "In poke mode the sensor holds a worker slot for the entire wait, so a multi-hour wait ties up a slot for hours.",
          keyConcepts: ["poke holds a worker slot", "slot-starvation risk"],
          commonMistakes: ["Assuming waiting is free", "Not connecting long pokes to slot exhaustion"],
          seniorAnswer: "Poke is fine for very short waits, but for hours it's wasteful and risks starving the pool — which is exactly how a fleet of sensors can block all real work."
        },
        {
          q: "How does reschedule mode change that?",
          expectedAnswer: "In reschedule mode the sensor releases its worker slot between checks and is re-queued at the next poke interval, so it doesn't hold a slot while idle.",
          keyConcepts: ["reschedule frees the slot", "re-queued each interval", "slight latency trade-off"],
          commonMistakes: ["Confusing reschedule with retries", "Thinking it still checks continuously"],
          seniorAnswer: "Reschedule trades a little latency — it only checks at the interval — for freeing the slot between checks, which is the right default for medium waits on a busy cluster."
        },
        {
          q: "For thousands of frequent waits, what's the most scalable option, and how does it work?",
          expectedAnswer: "Deferrable operators/sensors: they suspend the task, hand a trigger to the async triggerer, and use no worker slot while waiting; the triggerer resumes them when the condition fires.",
          keyConcepts: ["deferrable operators", "triggerer (asyncio)", "zero worker slot while deferred"],
          commonMistakes: ["Confusing the triggerer with the scheduler", "Thinking deferred tasks still hold a slot"],
          seniorAnswer: "Deferrable is event-driven waiting: one asyncio triggerer can watch thousands of conditions with no worker slots — that's how you scale sensing without scaling the worker fleet. It requires a running triggerer and a deferrable-capable operator."
        },
        {
          q: "When is deferrable NOT worth it?",
          expectedAnswer: "For very short or one-off waits, the extra moving part (the triggerer) and complexity aren't justified — a quick poke or reschedule is simpler.",
          keyConcepts: ["short waits → poke", "operational simplicity", "triggerer is a required component"],
          commonMistakes: ["Making everything deferrable reflexively", "Forgetting you must operate a triggerer"],
          seniorAnswer: "I match the mode to the wait: poke for seconds, reschedule for medium waits, deferrable when waits are long, numerous, or frequent enough that slot cost dominates — and only where a triggerer is reliably running."
        }
      ]
    },

    /* ── Idempotency ────────────────────────────────────────── */
    {
      id: "idempotency",
      topic: "Idempotency",
      category: "reliability",
      note: "The property interviewers probe hardest, because it's where retries and backfills either save you or corrupt your data.",
      steps: [
        {
          q: "What does it mean for a task to be idempotent?",
          expectedAnswer: "Running it once or many times for the same logical date yields the same result — no duplicates, no drift.",
          keyConcepts: ["same input → same output", "safe to re-run", "keyed to logical date"],
          commonMistakes: ["Confusing idempotent with \"has retries\"", "Reading it as \"runs only once\""],
          seniorAnswer: "It's a property of the write, not the scheduler: for a given data interval, any number of executions converge to one correct state."
        },
        {
          q: "Why does idempotency matter so much in Airflow specifically?",
          expectedAnswer: "Because Airflow retries tasks and supports backfills and reruns, the same task will execute multiple times — so non-idempotent writes create duplicates or corruption.",
          keyConcepts: ["retries", "backfill / reruns", "at-least-once execution"],
          commonMistakes: ["Assuming tasks run exactly once", "Forgetting backfills re-run history"],
          seniorAnswer: "Airflow is at-least-once by design — retries, backfills, and manual reruns all re-execute tasks. Idempotency is what makes that safe instead of destructive."
        },
        {
          q: "How do you make a warehouse load idempotent?",
          expectedAnswer: "Overwrite the partition for the run's logical date (delete-insert), or MERGE/upsert on a natural key — instead of a blind INSERT/append.",
          keyConcepts: ["delete-insert by partition", "MERGE / upsert", "overwrite, not append"],
          commonMistakes: ["Plain INSERT/append", "Relying on a UNIQUE constraint to swallow duplicates"],
          seniorAnswer: "I overwrite the slice for <code>{{ ds }}</code>, or MERGE on the business key, so re-running the task replaces its own output rather than stacking new rows."
        },
        {
          q: "A task writes to S3, then loads to a warehouse, and fails between the two. How do you keep it safe?",
          expectedAnswer: "Make each step idempotent and derive paths/partitions from the logical date, so a retry redoes both steps deterministically; write atomically so partial files aren't read.",
          keyConcepts: ["deterministic keys", "atomic writes", "each step re-runnable"],
          commonMistakes: ["Assuming the whole task is atomic", "Leaving partial S3 objects that downstream reads"],
          seniorAnswer: "I design each step to be independently re-runnable and deterministic; if I need all-or-nothing I lean on transactional loads or a staging-then-swap pattern so a mid-way failure never leaves a half state."
        },
        {
          q: "How would you test that a task is actually idempotent?",
          expectedAnswer: "Run it twice (or backfill the same interval twice) and assert the target state is identical — same row counts, same checksums.",
          keyConcepts: ["run-twice test", "compare counts / checksums", "backfill re-run"],
          commonMistakes: ["Testing the happy path only once", "Never verifying the second run"],
          seniorAnswer: "My acceptance test is literally \"run it twice and diff the output.\" If the second run changes anything, it isn't idempotent yet."
        }
      ]
    },

    /* ── Concurrency & Pools ────────────────────────────────── */
    {
      id: "concurrency",
      topic: "Concurrency & Pools",
      category: "reliability",
      note: "The knobs that decide why a task is queued — and the distinctions interviewers love to test.",
      steps: [
        {
          q: "A task is stuck in queued. Name the concurrency knobs that could be the cause.",
          expectedAnswer: "Global <code>parallelism</code>, per-DAG <code>max_active_tasks</code> (task concurrency), per-DAG <code>max_active_runs</code>, and <b>pool</b> slots.",
          keyConcepts: ["parallelism (global)", "max_active_tasks (per DAG)", "max_active_runs", "pools"],
          commonMistakes: ["Knowing only one knob", "Confusing task concurrency with run concurrency"],
          seniorAnswer: "I picture a stack of ceilings — cluster-wide parallelism, per-DAG task and run limits, and pools for shared resources. A queued task is pressing on one of them."
        },
        {
          q: "What's the difference between parallelism and a pool?",
          expectedAnswer: "<code>parallelism</code> is the global cap on running tasks cluster-wide; a <b>pool</b> caps concurrent tasks that share a specific resource, regardless of which DAG they belong to.",
          keyConcepts: ["global vs resource-scoped", "pools protect a shared resource", "pools cross DAGs"],
          commonMistakes: ["Treating them as interchangeable", "Not knowing pools span DAGs"],
          seniorAnswer: "Parallelism protects the cluster; a pool protects a downstream resource. I use a pool to say \"no more than 5 tasks hit this API/DB at once\" independent of total parallelism."
        },
        {
          q: "How is max_active_tasks different from max_active_runs?",
          expectedAnswer: "<code>max_active_tasks</code> limits concurrent task instances within a DAG run; <code>max_active_runs</code> limits how many runs of the DAG execute at once.",
          keyConcepts: ["tasks-within-a-run vs runs-of-a-DAG", "orthogonal axes"],
          commonMistakes: ["Conflating the two", "Thinking one implies the other"],
          seniorAnswer: "They're orthogonal: one bounds width (tasks in a run), the other bounds depth (concurrent runs). Backfills especially need <code>max_active_runs</code> to avoid a stampede."
        },
        {
          q: "A Dynamic Task Mapping expands to 5,000 mapped tasks and overwhelms a downstream DB. How do you control it?",
          expectedAnswer: "Put the mapped tasks in a pool to cap how many run at once (and/or set <code>max_active_tasks</code>). All 5,000 still process — just fewer at a time.",
          keyConcepts: ["pool caps mapped concurrency", "expansion count ≠ concurrency", "correctness preserved"],
          commonMistakes: ["Confusing number of mapped tasks with number running at once", "Trimming the mapping and losing data"],
          seniorAnswer: "Mapping controls how many tasks <i>exist</i>; a pool controls how many <i>run</i> simultaneously. I cap the pool so all 5,000 still process but only N hit the DB at a time."
        },
        {
          q: "When would you reach for priority_weight?",
          expectedAnswer: "When slots are contended and you want certain tasks scheduled ahead of others competing for the same pool/executor slots.",
          keyConcepts: ["priority under contention", "weight_rule", "does not add capacity"],
          commonMistakes: ["Thinking priority adds capacity", "Using it in place of a pool"],
          seniorAnswer: "Priority reorders who gets the next free slot under contention — it doesn't create slots. I use it to let SLA-critical tasks jump the queue, alongside pools that cap the resource."
        }
      ]
    },

    /* ── Scheduling ─────────────────────────────────────────── */
    {
      id: "scheduling",
      topic: "Scheduling & the logical date",
      category: "scheduling",
      note: "Catchup, backfill, and the logical date — the trio that trips people up most.",
      steps: [
        {
          q: "What's the difference between catchup and backfill?",
          expectedAnswer: "Catchup is the scheduler <i>automatically</i> running missed intervals between <code>start_date</code> and now when a DAG is enabled; backfill is a <i>manual</i> CLI run of a DAG over a past date range.",
          keyConcepts: ["catchup = automatic", "backfill = manual / CLI", "both replay history"],
          commonMistakes: ["Using the terms interchangeably", "Thinking backfill is automatic"],
          seniorAnswer: "Catchup is a scheduling policy (does the scheduler fill the gap on its own?); backfill is an operator action (I ask it to run a range). Related, but one's automatic and one's on demand."
        },
        {
          q: "You deploy a DAG with start_date a year ago. What happens, and how do you prevent a flood?",
          expectedAnswer: "With <code>catchup=True</code> it schedules a run for every missed interval — a flood. Set <code>catchup=False</code> to start from now; cap <code>max_active_runs</code> if you must replay history.",
          keyConcepts: ["catchup flood", "catchup=False", "max_active_runs"],
          commonMistakes: ["Leaving catchup on with an old start_date", "Not capping concurrency for replays"],
          seniorAnswer: "I default new DAGs to <code>catchup=False</code> and pick <code>start_date</code> deliberately; when history is genuinely needed I backfill with <code>max_active_runs</code> capped so it doesn't storm the sources."
        },
        {
          q: "What does logical_date (execution_date) actually represent?",
          expectedAnswer: "It's the <b>start of the data interval</b> the run covers — not the wall-clock time the run executes. A daily run for 2024-01-15 typically executes just after that interval ends.",
          keyConcepts: ["data interval", "fires at end of interval", "logical vs wall-clock"],
          commonMistakes: ["Thinking logical_date is when it runs", "Using now() instead of the logical date in queries"],
          seniorAnswer: "logical_date names the <i>slice of data</i>, and the run fires at the end of that interval. Everything idempotent keys off it, never off <code>now()</code>."
        },
        {
          q: "When would you use a custom Timetable instead of a cron schedule?",
          expectedAnswer: "When the schedule can't be expressed as cron — irregular business calendars, holiday-aware or trading-day schedules, or data-driven intervals.",
          keyConcepts: ["Timetable for non-cron logic", "business calendars", "custom data intervals"],
          commonMistakes: ["Forcing complex schedules into cron", "Not knowing Timetables exist"],
          seniorAnswer: "Cron handles regular cadences; Timetables handle <i>logic</i> — \"every business day excluding holidays,\" or intervals that end on a Friday. I reach for a Timetable when the interval itself needs code."
        },
        {
          q: "In Airflow 3, how can a DAG run without a time schedule at all?",
          expectedAnswer: "Event/data-driven scheduling: a DAG can be triggered by Assets/Datasets updating, so it runs when upstream data is produced rather than on a clock.",
          keyConcepts: ["Assets / Datasets", "event-driven scheduling", "data-aware"],
          commonMistakes: ["Assuming everything must be time-scheduled", "Confusing this with sensors"],
          seniorAnswer: "Asset-driven scheduling flips the model from \"run at 2am\" to \"run when this dataset is refreshed,\" removing brittle cross-DAG timing and a lot of sensors."
        }
      ]
    },

    /* ── Executors ──────────────────────────────────────────── */
    {
      id: "executors",
      topic: "Executors",
      category: "architecture",
      note: "Choosing and scaling executors — a staple system-design thread.",
      steps: [
        {
          q: "Compare LocalExecutor, CeleryExecutor, and KubernetesExecutor at a high level.",
          expectedAnswer: "Local runs tasks as subprocesses on the scheduler host (single machine); Celery distributes tasks to a pool of workers via a broker; Kubernetes launches one pod per task for isolation and elastic scale.",
          keyConcepts: ["Local = single host", "Celery = worker pool + broker", "Kubernetes = pod per task"],
          commonMistakes: ["Not knowing Celery needs a broker", "Thinking Local scales horizontally"],
          seniorAnswer: "It's a spectrum of isolation and elasticity: Local for small/single-node, Celery for steady high throughput on a warm worker pool, Kubernetes for per-task isolation and bursty workloads."
        },
        {
          q: "When would you choose Celery over Kubernetes?",
          expectedAnswer: "For steady, high-volume, short tasks where a warm worker pool avoids per-task pod-startup overhead and gives predictable throughput.",
          keyConcepts: ["warm workers avoid pod startup", "steady high throughput", "short tasks"],
          commonMistakes: ["Assuming Kubernetes is always better", "Ignoring pod-startup latency"],
          seniorAnswer: "For many small, frequent tasks, Celery's warm workers beat paying pod-startup latency per task. Kubernetes shines when tasks vary wildly in resources or need isolation; Celery shines on steady throughput."
        },
        {
          q: "What's a real operational cost of KubernetesExecutor?",
          expectedAnswer: "Per-task pod-startup latency and image pulls, plus owning cluster capacity/autoscaling — a flood of tasks becomes a flood of pods.",
          keyConcepts: ["pod-startup latency", "image pull", "cluster capacity / autoscaling"],
          commonMistakes: ["Thinking pods are instant/free", "Ignoring node-capacity limits"],
          seniorAnswer: "Every task is a pod schedule plus image pull, so latency and cluster capacity become first-class concerns — Pending pods and autoscaler behaviour are now things you own."
        },
        {
          q: "How does queue routing work on CeleryExecutor?",
          expectedAnswer: "A task can be assigned a <code>queue</code>; workers subscribe to queues via <code>--queues</code>, so you can route heavy/gpu/special tasks to dedicated workers.",
          keyConcepts: ["task queue attribute", "worker --queues subscription", "route to specialized workers"],
          commonMistakes: ["Routing to a queue no worker listens on", "Assuming all workers take all tasks"],
          seniorAnswer: "Queues let me pin classes of work to the right hardware — gpu tasks to gpu workers — but the discipline is keeping task queues and worker subscriptions in sync, or tasks sit unconsumed."
        },
        {
          q: "How do you scale each executor under rising load?",
          expectedAnswer: "Celery: add workers (and broker capacity). Kubernetes: give the cluster capacity/autoscaling for more concurrent pods. Local: you can't scale out — migrate to a distributed executor.",
          keyConcepts: ["Celery: add workers", "K8s: node capacity / autoscaling", "Local: vertical only → migrate"],
          commonMistakes: ["Trying to scale Local horizontally", "Forgetting the metadata DB is the shared ceiling"],
          seniorAnswer: "Celery scales by workers, Kubernetes by cluster capacity — but both eventually press on the shared metadata DB, so PgBouncer and DB sizing are the real ceiling once executors are scaled."
        }
      ]
    }
  ];
})();
