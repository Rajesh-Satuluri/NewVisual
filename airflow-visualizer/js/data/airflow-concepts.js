/* ============================================================
   airflow-concepts.js — declarative content for the visualizer
   The architecture graph (nodes + edges), the animated flow steps,
   and per-component detail copy with Airflow 2.x vs 3.x callouts.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});
  AV.data = AV.data || {};

  AV.data.architecture = {
    viewBox: "0 0 960 500",

    // id, label, sub, x, y, w, h, color (token name)
    nodes: [
      { id: "dag",        label: "DAG File",      sub: "@dag · operators",   x: 40,  y: 30,  w: 170, h: 60, color: "airflow" },
      { id: "processor",  label: "DAG Processor", sub: "parse → serialize",  x: 40,  y: 150, w: 170, h: 60, color: "cyan" },
      { id: "api",        label: "API Server",    sub: "UI · REST (3.x)",    x: 40,  y: 390, w: 170, h: 60, color: "cyan" },
      { id: "scheduler",  label: "Scheduler",     sub: "SchedulerJob loop",  x: 395, y: 30,  w: 175, h: 64, color: "airflow" },
      { id: "executor",   label: "Executor",      sub: "queues task work",   x: 395, y: 150, w: 175, h: 60, color: "green" },
      { id: "queue",      label: "Queue / Broker",sub: "Celery · Kubernetes",x: 395, y: 258, w: 175, h: 54, color: "yellow" },
      { id: "metadb",     label: "Metadata DB",   sub: "source of truth",    x: 395, y: 388, w: 175, h: 72, color: "purple" },
      { id: "logs",       label: "Logs",          sub: "task output",        x: 755, y: 30,  w: 170, h: 54, color: "muted" },
      { id: "worker",     label: "Worker",        sub: "runs task process",  x: 755, y: 150, w: 170, h: 60, color: "green" },
      { id: "task",       label: "Task Instance", sub: "execute()",          x: 755, y: 258, w: 170, h: 60, color: "airflow" },
      { id: "triggerer",  label: "Triggerer",     sub: "async deferrable",   x: 755, y: 388, w: 170, h: 60, color: "purple" }
    ],

    // [fromId, toId, meta?] — meta: { dir:"both", label, curve }.
    // Direction reflects data flow; "both" = read+write (double-headed).
    edges: [
      ["dag", "processor", { label: "parse" }],
      ["processor", "metadb", { label: "serialize" }],
      // Two-way, split into directed lanes so each direction reads clearly:
      ["metadb", "scheduler", { label: "reads serialized DAGs", curve: -340, labelT: 0.34 }],
      ["scheduler", "metadb", { label: "writes runs & TIs", curve: 230, labelT: 0.30 }],
      ["scheduler", "executor", { label: "hand off" }],
      ["executor", "queue", { label: "enqueue" }],
      ["queue", "worker", { label: "pull" }],
      ["worker", "task", { label: "execute" }],
      ["task", "metadb", { label: "report" }],
      ["task", "logs", { label: "write", curve: 235 }],
      ["api", "metadb", { dir: "both", label: "read / write" }],
      ["triggerer", "metadb", { dir: "both", label: "poll / resume" }]
    ],

    // The narrated request/scheduling flow. Driven by the AnimationEngine;
    // each step lights up nodes + edges and updates the detail panel.
    steps: [
      { label: "1 · Author a DAG", nodes: ["dag"], edges: [],
        desc: "An engineer writes a DAG file with the TaskFlow API or classic operators. It's just Python — a declarative graph of tasks and dependencies. Nothing runs yet.", code: true },
      { label: "2 · Parse the file", nodes: ["processor"], edges: [["dag", "processor"]],
        desc: "The <b>DAG Processor</b> (a standalone process in Airflow 3.x) imports the file on a schedule, evaluating the Python top-level code to build the DAG object in memory." },
      { label: "3 · Serialize to the DB", nodes: ["processor", "metadb"], edges: [["processor", "metadb"]],
        desc: "The parsed DAG is <b>serialized to JSON</b> and stored in the metadata DB. The scheduler and UI read this serialized form — they never import your Python file directly." },
      { label: "4 · Scheduler evaluates", nodes: ["scheduler", "metadb"], edges: [["metadb", "scheduler"], ["scheduler", "metadb"]],
        desc: "The <b>Scheduler</b> loop <b>reads</b> serialized DAGs and task states from the metadata DB, checks timetables, then <b>writes</b> a new <b>DAG run</b> plus <b>task instances</b> in state <span class='state-chip scheduled'>scheduled</span>. Those are the two directions of its metadata-DB link." },
      { label: "5 · Hand off to the executor", nodes: ["scheduler", "executor"], edges: [["scheduler", "executor"]],
        desc: "For tasks whose dependencies are met, the scheduler asks the <b>Executor</b> to run them. The task instance moves to <span class='state-chip queued'>queued</span>." },
      { label: "6 · Enqueue the work", nodes: ["executor", "queue"], edges: [["executor", "queue"]],
        desc: "Distributed executors (Celery, Kubernetes) push the command onto a <b>broker/queue</b>. LocalExecutor skips this and forks a subprocess directly." },
      { label: "7 · Worker picks it up", nodes: ["queue", "worker"], edges: [["queue", "worker"]],
        desc: "A <b>Worker</b> pulls the task from the queue and prepares to run it in an isolated process." },
      { label: "8 · Task executes", nodes: ["worker", "task"], edges: [["worker", "task"]],
        desc: "The worker runs the <b>task instance</b> — your operator's <code>execute()</code>. State becomes <span class='state-chip running'>running</span> via a heartbeat." },
      { label: "9 · Report state, logs & XCom", nodes: ["task", "metadb", "logs"], edges: [["task", "metadb"], ["task", "logs"]],
        desc: "On completion the task records <span class='state-chip success'>success</span>/<span class='state-chip failed'>failed</span>, writes logs, and pushes any XCom. <b>Airflow 3.x:</b> tasks report through the API server (Task Execution API), not a direct DB connection." },
      { label: "10 · Deferred? Triggerer", nodes: ["triggerer", "metadb"], edges: [["triggerer", "metadb"]],
        desc: "A deferrable task releases its worker slot and hands a trigger to the <b>Triggerer</b>, which watches the condition asynchronously and resumes the task when it fires." },
      { label: "11 · Observe in the UI", nodes: ["api", "metadb"], edges: [["api", "metadb"]],
        desc: "The <b>API Server</b> (the 3.x successor to the webserver) reads state from the metadata DB so the grid, graph, and logs reflect exactly what happened." }
    ],

    // Per-node detail shown when a node is clicked.
    detail: {
      dag: { title: "DAG File", body: "A Python file describing a <b>Directed Acyclic Graph</b> of tasks. Top-level code runs on every parse, so keep it cheap — no heavy imports or API calls at import time." },
      processor: { title: "DAG Processor", body: "Parses DAG files and serializes them to the DB.", note: { v: "3.x", text: "Runs as its own process, isolated from the scheduler. In 2.x this was a subprocess of the scheduler." } },
      api: { title: "API Server", body: "Serves the UI and REST API, and (in 3.x) the Task Execution API that workers use.", note: { v: "3.x", text: "Replaces the 2.x 'webserver'. It also brokers task-to-DB access so task code never touches the DB directly." } },
      scheduler: { title: "Scheduler", body: "The heart of Airflow. Continuously parses serialized DAGs, creates DAG runs and task instances, checks dependencies, and queues runnable tasks. Can be run <b>HA</b> (multiple active schedulers)." },
      executor: { title: "Executor", body: "The bridge between the scheduler and where tasks actually run: <b>Local</b>, <b>Celery</b>, <b>Kubernetes</b>, or <b>CeleryKubernetes</b>.", note: { v: "3.x", text: "Multiple executors can run side by side in a single deployment." } },
      queue: { title: "Queue / Broker", body: "Celery uses a broker (Redis/RabbitMQ) to distribute tasks to workers; Kubernetes schedules a pod per task. LocalExecutor has no broker." },
      metadb: { title: "Metadata Database", body: "Postgres/MySQL storing every DAG run, task instance, state, XCom, connection, variable, and pool. It is the single source of truth." },
      logs: { title: "Task Logs", body: "Each task attempt writes its own log, stored locally or shipped to remote storage (S3/GCS) and streamed back to the UI." },
      worker: { title: "Worker", body: "The process that actually executes task code. For Celery it's a long-running celery worker; for Kubernetes it's a short-lived pod." },
      task: { title: "Task Instance", body: "A specific run of a task for a specific logical date. It owns the state machine: <span class='state-chip scheduled'>scheduled</span> → <span class='state-chip queued'>queued</span> → <span class='state-chip running'>running</span> → <span class='state-chip success'>success</span>." },
      triggerer: { title: "Triggerer", body: "Runs asyncio-based triggers for deferrable operators, letting a task wait for an external condition <b>without holding a worker slot</b>." }
    }
  };
})();
