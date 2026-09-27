/* ============================================================
   data/prep/senior.js — Senior Scenario Mode (Level 3 · Production)
   ------------------------------------------------------------
   Level-3 "production reasoning" scenarios: not "what is X" (L1) or
   "when would you use X" (L2), but "this is happening in production —
   what do you change, and what are the trade-offs." Rendered by
   js/modules/senior-scenarios.js.

   Shape:
     { id, topic, category, scenario,
       considerations: [ … what a senior weighs ],
       strongAnswer, edge? }

   Content is trusted HTML (authored in-repo). ES5-safe.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});
  AV.data = AV.data || {};

  AV.data.senior = [
    {
      id: "xcom-growth", topic: "XCom is bloating the metadata DB", category: "Performance",
      scenario: "Your team increasingly passes larger objects through XCom, and the metadata DB is growing fast — the scheduler and UI are slowing down. What do you change?",
      considerations: ["Metadata DB is a shared bottleneck", "Control plane vs data plane", "Custom XCom backend", "Retention / db clean"],
      strongAnswer: "Stop moving payloads through XCom: write them to object storage (or a custom XCom backend that offloads to S3/GCS transparently) and pass only references. Then reclaim the DB — <code>airflow db clean</code> with a retention policy — and add monitoring on metadata-DB size. The framing: the metadata DB is the cluster's control plane, not a data store, so anything data-sized belongs elsewhere.",
      edge: "Watch for logs and rendered templates bloating the DB too, not just XCom — remote logging and log retention matter at scale."
    },
    {
      id: "scheduler-scale", topic: "Scheduling latency rising toward 2,000 DAGs", category: "Scheduler",
      scenario: "DAG parse times are climbing and scheduling latency is rising as you approach 2,000 DAGs. How do you keep scheduling healthy?",
      considerations: ["DAG parse time", "Import-safe files", "HA / multiple schedulers", "Standalone DAG processor", "min_file_process_interval"],
      strongAnswer: "Attack parse time first: make every DAG file import-safe (no top-level IO/heavy compute), split large DAG-generating files, and tune the parsing settings (e.g. <code>min_file_process_interval</code>, parsing parallelism). Run multiple active-active schedulers for throughput and HA, and in Airflow 3 lean on the separated DAG processor. Alert on parse time and scheduler heartbeat as leading indicators.",
      edge: "More schedulers add metadata-DB connections — pair scaling with PgBouncer, or you trade a scheduling bottleneck for a DB one."
    },
    {
      id: "backfill-live", topic: "Reprocess 6 months while a dashboard is live", category: "Data Engineering",
      scenario: "A bug fix means you must reprocess 6 months of history, but the same tables feed a live dashboard. How do you backfill safely?",
      considerations: ["Idempotent writes keyed to logical date", "max_active_runs + pools", "Stage then swap", "Validate before publish"],
      strongAnswer: "Make writes idempotent and keyed to the logical date, then run a controlled backfill with <code>max_active_runs</code> capped and a pool bounding source load. Write to a staging location/partition and swap (or MERGE) so the live table never shows half-processed data, and gate the swap behind data-quality checks. Communicate the window to dashboard consumers.",
      edge: "If schema changed with the fix, version the output or backfill into a parallel table and cut over — don't mutate the live schema mid-backfill."
    },
    {
      id: "executor-cost", topic: "Kubernetes pod-per-task cost is too high", category: "Executors",
      scenario: "KubernetesExecutor pods are costing too much for a workload of many tiny, frequent tasks. What do you do?",
      considerations: ["Pod startup overhead per task", "Celery warm pool", "Hybrid executors (Airflow 3)", "Batching tiny tasks"],
      strongAnswer: "Move the steady stream of small tasks to a CeleryExecutor warm pool where there's no per-task pod startup, and reserve Kubernetes for heavy or bursty jobs that need isolation. In Airflow 3 you can run multiple executors and route work per task. Also question the granularity — batching many trivial tasks into fewer reduces both pod churn and scheduler/metadata load.",
      edge: "Don't lose the isolation you adopted K8s for — keep resource-hungry or dependency-conflicting tasks on Kubernetes."
    },
    {
      id: "success-not-correct", topic: "Airflow says success, data is wrong", category: "Data Engineering",
      scenario: "A pipeline reports success in Airflow, but downstream consumers find bad data roughly weekly. How do you make \"success\" mean \"correct\"?",
      considerations: ["Airflow success ≠ data success", "Data-quality tasks as gates", "Circuit-break the publish", "Alert on data metrics"],
      strongAnswer: "Add explicit data-quality tasks — row counts, null/uniqueness, referential and range checks, freshness — and make the DAG <b>fail</b> (or short-circuit the publish) when they breach, so a green run actually guarantees valid data. Publish DQ metrics and alert on them, not just on task status. The principle: task success only means the code ran, not that the data is right.",
      edge: "Put the gate before the swap/publish step, and make it idempotent too, so a retry re-validates rather than double-publishing."
    },
    {
      id: "sla-miss", topic: "A critical DAG intermittently misses its SLA", category: "Operations",
      scenario: "A business-critical DAG intermittently misses its 6am SLA. How do you diagnose and harden it?",
      considerations: ["Find the slow task / critical path", "Pool contention vs upstream lateness", "priority_weight & dedicated pool/queue", "Alert on trend, not just breach"],
      strongAnswer: "Instrument task durations to find whether it's the critical path, pool/slot contention, or a late upstream dependency. Then harden: give critical tasks a dedicated pool/queue and higher <code>priority_weight</code>, parallelize the critical path, and move long waits to deferrable sensors so they don't hold slots. Alert on the duration <i>trend</i> approaching the SLA, not only on the breach.",
      edge: "If lateness is an upstream data arrival, the fix is an Asset/sensor dependency — not throwing more workers at your own DAG."
    },
    {
      id: "multi-team", topic: "One team starves others on shared Airflow", category: "Operations",
      scenario: "Several teams share one Airflow deployment, and one team's heavy DAGs periodically starve everyone else. How do you isolate them?",
      considerations: ["Pools & queues per team/resource", "max_active_runs/tasks quotas", "Dedicated workers per queue", "RBAC; separate deployment if needed"],
      strongAnswer: "Carve capacity with pools and Celery queues per team (or per shared resource), and set per-DAG <code>max_active_runs</code>/<code>max_active_tasks</code> as quotas so no one team can consume the whole cluster. Route heavy teams to dedicated workers via queues, and use RBAC to scope access. If isolation needs are strong, a separate deployment (or Kubernetes namespaces) is the cleaner boundary.",
      edge: "The metadata DB is still shared — one team's XCom/log bloat can hurt all; enforce retention centrally."
    },
    {
      id: "secrets", topic: "Managing 50 connections across environments", category: "Security",
      scenario: "You have ~50 connections/credentials across dev, staging and prod. How do you manage them without hardcoding or leaking secrets?",
      considerations: ["Secrets backend (Vault/AWS/GCP/Azure)", "No secrets in code/XCom/logs", "Environment-scoped", "Rotation"],
      strongAnswer: "Use a secrets backend so Connections and Variables resolve from Vault or a cloud secrets manager rather than the metadata DB or code. Scope secrets per environment, keep them out of DAG source, XCom, and logs, and enable rotation. Access is then auditable and centrally revocable — no credentials living in the repo or the DB.",
      edge: "Mind secrets-backend lookup cost/caching at parse time, and never log a rendered connection URI."
    },
    {
      id: "mapping-explosion", topic: "Dynamic mapping expands to tens of thousands", category: "Concurrency",
      scenario: "A Dynamic Task Mapping expands to tens of thousands of mapped instances, overwhelming a downstream DB and bloating the scheduler/metadata DB. How do you make it safe?",
      considerations: ["Pool caps concurrency, not count", "Batch/chunk the inputs", "max_active_tasks", "Metadata rows per mapped TI"],
      strongAnswer: "Separate <i>how many exist</i> from <i>how many run at once</i>: cap concurrency with a pool (and/or <code>max_active_tasks</code>) so downstream load is bounded while all inputs still process. For extreme N, batch inputs so each mapped task handles a chunk — that cuts the number of task instances and the metadata rows they create. Monitor mapped-TI counts as a first-class metric.",
      edge: "Tens of thousands of mapped TIs is itself metadata-DB pressure — batching is often better than just throttling."
    },
    {
      id: "obs", topic: "Knowing a pipeline is healthy beyond green ticks", category: "Operations",
      scenario: "Leadership asks how you know pipelines are healthy — beyond \"the DAG is green.\" What's your observability story?",
      considerations: ["Metrics: StatsD/OpenTelemetry", "Duration & SLA trends", "Data-quality metrics", "Centralized logs; alert on trends"],
      strongAnswer: "Green ticks only say code ran. I emit metrics (StatsD/OpenTelemetry) for task durations, scheduler heartbeat, queue depth and pool usage; track SLA and duration <i>trends</i>; and publish data-quality metrics (row counts, freshness, null rates) alongside. Logs are centralized and searchable. Alerts fire on trends and data metrics — a job creeping toward its SLA or a row count dropping — not just on hard failures.",
      edge: "Alert fatigue is real — page on business-impacting signals (SLA, DQ), ticket the rest."
    },
    {
      id: "recurring-oom", topic: "Nightly big-join task keeps OOMing", category: "Performance",
      scenario: "A nightly join task recurrently OOM-kills its worker and shows up as a zombie. Retries recover it, but it happens most nights. What's the durable design change?",
      considerations: ["Airflow orchestrates, doesn't crunch", "Push down to warehouse/Spark", "Chunk / right-size", "Retries recover, don't fix"],
      strongAnswer: "Stop doing the heavy join in the worker. Push it down to the warehouse or a Spark job that Airflow just orchestrates, or process in bounded chunks — so memory is flat regardless of data growth. Keep <code>retries</code> for resilience and monitor zombie reaps, but treat recurring OOM as a design smell, not something to fix by forever raising memory limits.",
      edge: "If it must run in-worker, size the pod and use a dedicated queue so its OOMs don't take down co-located tasks."
    },
    {
      id: "upgrade-3", topic: "Planning a 2.x → 3.x upgrade", category: "Airflow 3.x",
      scenario: "You're planning an Airflow 2.x → 3.x upgrade for a large deployment. What are the headline changes you reason about, and how do you de-risk it?",
      considerations: ["API server + component separation", "Task SDK", "Assets / event-driven scheduling", "DAG processor", "Deprecations"],
      strongAnswer: "I frame the big shifts: a separated API server and DAG processor, the Task SDK for task authoring, first-class Assets/Datasets enabling event-driven scheduling, and a more mature triggerer/deferrable story. To de-risk: audit DAGs for import-safety and deprecated imports/params, test on a staging deployment, migrate the metadata DB carefully, and adopt new features (Assets) incrementally rather than big-bang.",
      edge: "Anchor claims to the version your deployment actually targets — don't assert a feature exists until you've confirmed it for that release."
    }
  ];
})();
