/* ============================================================
   data/prep/answers-levels.js — "Improve Your Answer" (Weak/Good/Senior)
   ------------------------------------------------------------
   For each interview question: what a beginner says, what a competent
   engineer says, what a senior says, and why the senior answer wins.
   Rendered by js/components/tiered-answer.js (tabs) via
   js/modules/answer-levels.js.

   Shape: { id, question, category, tiers: [ { label, body } ] }
   Content is trusted HTML (authored in-repo). ES5-safe.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});
  AV.data = AV.data || {};

  function item(id, question, category, weak, good, senior, why) {
    return { id: id, question: question, category: category, tiers: [
      { label: "Weak", body: "<p>" + weak + "</p>" },
      { label: "Good", body: "<p>" + good + "</p>" },
      { label: "Senior", body: "<p>" + senior + "</p>" },
      { label: "Why senior wins", body: "<p>" + why + "</p>" }
    ] };
  }

  AV.data.answersLevels = [
    item("tb-data", "Would you use Airflow to process 1 TB of data?", "Architecture",
      "Yes, Airflow can process the data.",
      "Airflow can orchestrate the pipeline that processes the data.",
      "Airflow should orchestrate, not crunch. I'd have it trigger a Spark/Databricks or warehouse job to do the 1 TB compute, and just coordinate, retry, and gate on success — keeping big data out of workers and out of XCom.",
      "It names the anti-pattern (Airflow as a compute engine), gives the correct pattern (orchestrate push-down compute), and ties in worker/XCom limits — production judgement, not just \"it works\"."),
    item("xcom-for", "What is XCom for?", "Execution",
      "To share data between tasks.",
      "To pass small values between tasks; it's stored in the metadata DB.",
      "It's a control-plane channel for small values — an id, a path, a count. Large data goes to object storage and I pass a reference, or use a custom XCom backend, because the metadata DB is a shared cluster bottleneck.",
      "It adds the size boundary, the alternative, and the systemic reason (shared metadata DB) — exactly what interviewers probe."),
    item("failing-task", "How do you handle a task that keeps failing?", "Reliability",
      "Add more retries.",
      "Set retries with backoff and read the logs to find the cause.",
      "Retries with backoff for transient failures, but I diagnose the root cause first — a deterministic failure just burns retries. I separate transient (network) from deterministic (bad data/code), make the task idempotent so retries are safe, and alert on final failure.",
      "It separates transient vs deterministic failures and adds idempotency and alerting; \"just add retries\" is the junior tell."),
    item("idempotent", "How do you make a pipeline idempotent?", "Reliability",
      "Turn on retries.",
      "Make re-running produce the same result — overwrite instead of append.",
      "Key writes to the logical date and overwrite the partition (or MERGE on a key), write atomically, and derive everything from {{ ds }} rather than now(). Then retries, backfills and reruns all converge — and I test it by running twice and diffing the output.",
      "Idempotency isn't retries; the senior gives the concrete write pattern, logical-date keying, and an actual test."),
    item("which-executor", "Which executor would you choose?", "Executors",
      "CeleryExecutor — it's popular.",
      "It depends on scale — Local for small, Celery or Kubernetes for distributed.",
      "It depends on the workload: Local for single-node/dev, Celery for steady high-throughput short tasks on warm workers, Kubernetes for isolation and bursty/heterogeneous jobs. I weigh pod-startup latency vs warm-pool cost — and either way the metadata DB is the shared ceiling.",
      "It ties the choice to workload characteristics and names the real trade-offs and the shared bottleneck."),
    item("pass-data", "How do you pass data between tasks?", "Execution",
      "Through XCom.",
      "Small values via XCom; larger data via a shared store.",
      "References through XCom, payloads through object storage or the warehouse. I keep the metadata DB lean, make written objects deterministic per logical date so retries are safe, and consider a custom XCom backend when many DAGs pass medium objects.",
      "It distinguishes reference vs payload and adds retry-safety and the backend option."),
    item("schedule-deploy", "How do you deploy a DAG without it re-running all of history?", "Scheduling",
      "Set a start date.",
      "Set catchup=False so it doesn't backfill.",
      "catchup=False with a deliberate start_date so it runs go-forward only; if I need history I run a controlled backfill with max_active_runs capped. I also key logic to the logical date, not wall-clock, so any backfill stays correct.",
      "It covers catchup, deliberate backfill, and logical-date correctness together — not just one flag."),
    item("fail-midway", "What happens if a task fails midway through writing data?", "Reliability",
      "It retries and finishes.",
      "It retries; you might get partial data if you're not careful.",
      "A partial write plus a retry duplicates or corrupts data unless the write is idempotent. I make it overwrite its partition (or MERGE) and write atomically — staging then swap — so a mid-way failure leaves no half-state and the retry converges.",
      "It names the failure mode (partial write) and the concrete safeguard (atomic + idempotent)."),
    item("scale-airflow", "How do you scale Airflow as load grows?", "Performance",
      "Add more workers.",
      "Scale workers and schedulers and tune concurrency.",
      "Scale the executor (Celery workers or K8s capacity) and run HA schedulers — but the real ceiling is the metadata DB, so PgBouncer, tuned pools, db clean, and import-safe DAGs to keep parse times low. I scale the bottleneck, not just workers.",
      "It identifies the true bottleneck (metadata DB and parsing), not just \"more workers\"."),
    item("pipeline-healthy", "How do you know a pipeline is healthy?", "Operations",
      "The DAG is green.",
      "Green runs, plus checking logs and durations.",
      "Green means the code ran, not that the data is right. I add data-quality checks that gate publish, emit duration/SLA and DQ metrics, and alert on trends — a job creeping toward its SLA, a dropping row count — not just on hard failures.",
      "It separates task success from data correctness and describes real observability, which is the senior differentiator.")
  ];
})();
