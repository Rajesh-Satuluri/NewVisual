/* ============================================================
   data/prep/version.js — Airflow 2.x → 3.x version trap
   ------------------------------------------------------------
   For each concept: how it looked in 2.x, what changed in 3.x, and an
   interview-safe way to say it (deliberately hedged where exact
   internals vary by release). Rendered by js/components/tiered-answer.js
   via js/modules/version-trap.js.

   Shape: { id, question, category, tiers: [ {label, body} ] }
   Content is trusted HTML (authored in-repo). ES5-safe.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});
  AV.data = AV.data || {};

  function item(id, question, v2, v3, safe) {
    return { id: id, question: question, category: "Airflow 3.x", tiers: [
      { label: "Airflow 2.x", body: "<p>" + v2 + "</p>" },
      { label: "Airflow 3.x", body: "<p>" + v3 + "</p>" },
      { label: "Say it safely", body: "<p>" + safe + "</p>" }
    ] };
  }

  AV.data.version = [
    item("architecture", "Overall architecture",
      "Scheduler, executor/workers, a Flask webserver UI, and the metadata DB. Components — including workers — talk to the metadata DB fairly directly.",
      "Adds a dedicated <b>API server</b> and a separated <b>DAG processor</b>; task execution goes through the API rather than workers hitting the DB directly — cleaner isolation and security.",
      "\"Airflow 3 separates components more strictly — an API server mediates task execution and the DAG processor is standalone — for isolation and security. In 2.x, components including workers talked to the metadata DB more directly.\" Keep it at the separation level; don't overclaim internals."),
    item("api-server", "API server",
      "A REST API exists, but task execution isn't mediated by a dedicated API server; tasks/workers reach the metadata DB directly.",
      "A first-class <b>API server</b> mediates access; tasks communicate via the Task SDK/API instead of touching the DB directly — enabling remote execution and tighter security boundaries.",
      "\"3.x introduces an API server so tasks don't hit the metadata DB directly.\" If pressed on internals, stay high-level."),
    item("dag-processor", "DAG processor",
      "DAG parsing can run inside the scheduler process (or as a standalone processor).",
      "The <b>DAG processor is separated</b> from the scheduler, isolating parsing from scheduling for resilience and security.",
      "\"Separating the DAG processor keeps heavy or untrusted parsing from stalling the scheduler.\" Tie it to the classic 'slow parse stalls scheduling' failure."),
    item("task-execution", "Task execution model",
      "Workers execute tasks and read/write the metadata DB directly.",
      "Tasks run via the <b>Task SDK</b> and communicate through the API server — decoupling task code from direct DB access and enabling remote/edge execution.",
      "\"3.x decouples task execution from the metadata DB via the Task SDK and API server.\""),
    item("task-sdk", "Task SDK",
      "No separate Task SDK; you author with operators and the TaskFlow API against Airflow internals.",
      "A <b>Task SDK</b> provides a stable interface for authoring and executing tasks independent of Airflow internals, supporting decoupled/versioned execution.",
      "\"The Task SDK is the stable authoring/execution interface introduced in 3.x.\""),
    item("assets", "Assets / Datasets",
      "Datasets (from 2.4) enable basic data-aware scheduling — a DAG can be scheduled on dataset updates.",
      "Datasets evolve into <b>Assets</b>, a richer first-class model for data-driven/event scheduling and lineage.",
      "\"Data-aware scheduling started as Datasets in 2.x and became Assets in 3.x.\" If unsure of exact naming for the target version, say 'Assets/Datasets'."),
    item("event-driven", "Event-driven scheduling",
      "Dataset-triggered DAGs let one DAG run when another updates a dataset.",
      "Expanded <b>event-driven scheduling</b> via Assets — DAGs react to data events rather than only the clock.",
      "\"Event-driven, data-aware scheduling lets DAGs run when data updates instead of on a fixed time — Datasets in 2.x, Assets in 3.x.\""),
    item("deferrable", "Deferrable operators & the triggerer",
      "Deferrable operators and the triggerer already exist (from 2.2) for async waits that free worker slots.",
      "Deferrable operators and the triggerer remain, and are central to the scalable-waiting story.",
      "\"Deferrable operators plus the triggerer aren't new to 3.x — they arrived in 2.2 — but they're the recommended way to wait at scale in both.\" A common trap is calling deferrable a 3.x feature."),
    item("ha-scheduler", "Scheduler HA",
      "Active-active HA schedulers have existed since 2.0.",
      "HA schedulers continue; with the separated API server and DAG processor the control plane is more modular.",
      "\"Active-active schedulers came in 2.0, not 3.x — 3.x adds more component separation around them.\""),
    item("deprecations", "Deprecations & migration",
      "SubDAGs and various legacy imports/params are still around (often deprecated).",
      "SubDAGs are removed (use TaskGroups), and various deprecated imports/params are dropped; DAGs must be import-safe and updated.",
      "\"For a 2→3 migration I'd audit deprecated imports/params, replace SubDAGs with TaskGroups, and test import-safety — and confirm the exact removals against the target release notes rather than guess.\"")
  ];
})();
