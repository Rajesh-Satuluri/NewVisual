/* ============================================================
   data/prep/troubleshooting.js — Troubleshooting Lab scenarios
   ------------------------------------------------------------
   Interactive "observe the symptom → choose what to check next"
   investigation flows, rendered by js/components/investigation-flow.js
   and the js/modules/troubleshooting.js screen.

   Each scenario:
     { id, category, difficulty (easy|med|hard), icon, title, symptom,
       steps: [ { prompt, checks: [
           { label, correct:true,  evidence, reasoning } |
           { label, correct:false, why } ] } ],
       rootCause, resolution, prevention, interviewAnswer }

   The first six port the existing linear "Failure Scenarios" playbook
   into interactive flows; the rest are new, spanning the scheduler,
   dependencies, sensors, Kubernetes, Celery and data-engineering
   categories. Content is trusted HTML (authored in-repo). ES5-safe.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});
  AV.data = AV.data || {};

  AV.data.troubleshooting = [
    /* ── 1 · Task stuck in queued ───────────────────────────── */
    {
      id: "queued-stuck",
      category: "Task execution",
      difficulty: "med",
      icon: "⏳",
      title: "Task stuck in QUEUED for 30 minutes",
      symptom: "A task has been <span class='state-chip queued'>queued</span> for 30 minutes and won't start. The workers look healthy.",
      steps: [
        {
          prompt: "The task won't leave <code>queued</code>. What do you check <b>first</b>?",
          checks: [
            { label: "Whether the scheduler is alive and its heartbeat is current", correct: true,
              evidence: "<code>scheduler.heartbeat</code> is recent and the logs show scheduling loops running (or they've gone stale).",
              reasoning: "The scheduler is what moves a task from <code>queued</code> into the executor. A dead or stalled scheduler leaves tasks queued indefinitely — and healthy workers can't help, because nothing is handing them work." },
            { label: "Restart the workers", correct: false,
              why: "\"Healthy workers\" already rules them out as the first suspect. <code>queued</code> means the task hasn't been handed to a worker yet — that's <i>upstream</i> of the worker, in the scheduler/executor." },
            { label: "Re-run the task from the UI", correct: false,
              why: "Clearing and re-running doesn't address <i>why</i> it's stuck — it'll just queue again. Diagnose the cause before poking the task." }
          ]
        },
        {
          prompt: "The scheduler is healthy and scheduling other DAGs fine. Where do you look next?",
          checks: [
            { label: "Executor and pool open_slots", correct: true,
              evidence: "<code>airflow.executor.open_slots</code> is 0, or the task's <b>pool</b> shows 0 open slots.",
              reasoning: "If <code>parallelism</code> or the pool is saturated, the scheduler has nowhere to place the task even though the scheduler itself is fine. Open slots is the definitive capacity check." },
            { label: "The task's Python code", correct: false,
              why: "Code bugs surface once a task <i>runs</i> (running → failed), not while it's stuck in <code>queued</code>. Stuck-in-queued is capacity or routing, not logic." },
            { label: "The metadata DB schema", correct: false,
              why: "The schema isn't the issue when other DAGs schedule fine — you're looking for why <i>this</i> task can't get a slot." }
          ]
        },
        {
          prompt: "Slots are available and it still won't run. On <b>CeleryExecutor</b>, what's the likely cause?",
          checks: [
            { label: "It's routed to a queue no worker subscribes to", correct: true,
              evidence: "The task's <code>queue</code> (e.g. <code>gpu</code>) has no Celery worker listening on it (<code>--queues</code>).",
              reasoning: "Celery routes tasks by queue name. If no worker subscribes to that queue, the message sits in the broker forever — queued, never running." },
            { label: "Increase retries", correct: false,
              why: "Retries apply <i>after</i> a task runs and fails; they do nothing for a task that never gets dispatched." },
            { label: "Bump parallelism higher", correct: false,
              why: "You already confirmed open slots exist — more parallelism won't route a task to a queue nobody is listening on." }
          ]
        }
      ],
      rootCause: "The task was enqueued but never dispatched to a worker — because the scheduler stalled, a pool/parallelism slot wasn't free, or (Celery) it was routed to a queue with no subscribed worker.",
      resolution: "Restore or scale the scheduler, free/enlarge the exhausted pool or <code>parallelism</code>, or start a worker that listens on the task's queue. Clear the task once the cause is fixed.",
      prevention: "Alert on scheduler heartbeat and on pool/executor <code>open_slots</code> hitting 0; keep queue↔worker subscriptions in sync during config review.",
      interviewAnswer: "Queued means the scheduler accepted it but it hasn't reached a worker. I check three things in order: is the scheduler heartbeating, are there open executor/pool slots, and on Celery is a worker actually subscribed to that task's queue. It's almost always capacity or routing — not the task code."
    },

    /* ── 2 · Zombie tasks ───────────────────────────────────── */
    {
      id: "zombie-tasks",
      category: "Task execution",
      difficulty: "med",
      icon: "🧟",
      title: "Zombie task — running in the UI, but dead",
      symptom: "A task shows <span class='state-chip running'>running</span> in the UI, but there are no new logs and no progress for hours. It's blocking everything downstream.",
      steps: [
        {
          prompt: "The UI says <code>running</code> but nothing is happening. What's your first move?",
          checks: [
            { label: "Check the worker / pod that owns the task instance is still alive", correct: true,
              evidence: "The worker host or Kubernetes pod that was running the task no longer exists, or was evicted.",
              reasoning: "A task that's <code>running</code> in the UI but making no progress is the classic sign the worker died without reporting a final state — its heartbeat to the scheduler has gone stale." },
            { label: "Assume it's just slow and keep waiting", correct: false,
              why: "No logs and no heartbeat over a long window isn't slowness — it's a dead process. Waiting only delays recovery." },
            { label: "Kill the scheduler", correct: false,
              why: "The scheduler is exactly what <i>reaps</i> this zombie. Killing it removes the thing that recovers the task." }
          ]
        },
        {
          prompt: "The worker is gone. How does Airflow recover this on its own?",
          checks: [
            { label: "Zombie detection reaps it after the heartbeat threshold and marks it up_for_retry", correct: true,
              evidence: "After ≈<code>scheduler_zombie_task_threshold</code> (300 s) the scheduler logs \"Detected zombie\" and sets the task to <span class='state-chip up-for-retry'>up_for_retry</span>.",
              reasoning: "The scheduler tracks task heartbeats; when one goes stale it reaps the zombie and, if retries remain, reschedules a fresh try — automatic recovery." },
            { label: "Nothing — you must always clear it by hand", correct: false,
              why: "Manual clearing works, but isn't required: zombie detection handles it automatically once the heartbeat threshold passes (on by default)." },
            { label: "The worker restarts the same process", correct: false,
              why: "The worker died; that process is gone. Recovery comes from the scheduler scheduling a <i>new</i> try, not resurrecting the old one." }
          ]
        },
        {
          prompt: "It recovers via retry, but it recurs every night. What's the durable fix?",
          checks: [
            { label: "Root-cause the worker death (usually OOM) and size resources / chunk the work", correct: true,
              evidence: "Worker logs show an OOM-kill (exit 137) or node eviction on the same memory-heavy task each night.",
              reasoning: "Zombies are a symptom; the disease is whatever kills the worker. Fix the OOM/eviction and the zombie stops appearing." },
            { label: "Raise scheduler_zombie_task_threshold", correct: false,
              why: "That just makes Airflow wait longer before reaping — it hides the symptom and slows recovery without fixing the worker death." },
            { label: "Disable heartbeats", correct: false,
              why: "Heartbeats are how zombies are detected at all; disabling them means the task hangs forever." }
          ]
        }
      ],
      rootCause: "The worker executing the task died silently (OOM, eviction, node reboot), so the task instance's heartbeat went stale while the UI still showed it running.",
      resolution: "Let zombie detection reap it to <span class='state-chip up-for-retry'>up_for_retry</span> (ensure <code>retries &gt; 0</code>), then fix the underlying worker death — usually memory sizing or chunking the workload.",
      prevention: "Set <code>retries</code>, right-size worker/pod memory, avoid loading large data into the worker, and monitor for repeated zombie reaps as an early warning.",
      interviewAnswer: "A zombie is a task the UI shows as running whose worker actually died. The scheduler detects the stale heartbeat, reaps it, and retries it — so recovery is automatic with retries set. But I treat recurring zombies as a worker-death signal and fix the real cause, usually OOM, rather than bumping the zombie threshold."
    },

    /* ── 3 · Worker OOM ─────────────────────────────────────── */
    {
      id: "worker-oom",
      category: "Performance",
      difficulty: "med",
      icon: "🧨",
      title: "Task keeps getting OOM-killed",
      symptom: "A task dies with <code>SIGKILL</code> / exit code <code>137</code>, or its Kubernetes pod shows <code>OOMKilled</code>.",
      steps: [
        {
          prompt: "The task exits with code <code>137</code>. What does that tell you?",
          checks: [
            { label: "The process was SIGKILLed for exceeding a memory limit (OOM)", correct: true,
              evidence: "<code>137 = 128 + 9</code> (SIGKILL); on Kubernetes the pod status is <code>OOMKilled</code>.",
              reasoning: "Exit 137 is the near-universal signature of an out-of-memory kill by the OS or the cluster — not an application exception." },
            { label: "The DAG has a syntax error", correct: false,
              why: "Syntax/parse errors stop a task from ever starting and show as <i>import errors</i>, not a 137 exit from a running process." },
            { label: "The network timed out", correct: false,
              why: "Network timeouts raise application exceptions with tracebacks, not a bare SIGKILL/137." }
          ]
        },
        {
          prompt: "It's an OOM. What's the first thing to look at in the task itself?",
          checks: [
            { label: "Whether it loads a large dataset fully into memory", correct: true,
              evidence: "The task does <code>pandas.read_sql</code> of a whole table, or builds a huge in-memory structure.",
              reasoning: "Most Airflow OOMs come from pulling large data into the worker. Airflow should orchestrate — not be the compute engine for big data." },
            { label: "The number of retries", correct: false,
              why: "Retries just re-run the same OOM; they don't reduce memory use." },
            { label: "The scheduler heartbeat", correct: false,
              why: "The scheduler isn't running your task's memory; this is a worker/task resource issue." }
          ]
        },
        {
          prompt: "How do you fix it durably, rather than just raising the limit?",
          checks: [
            { label: "Process in chunks, or push the compute down to the warehouse / Spark", correct: true,
              evidence: "Switching <code>read_sql</code> to chunked reads or aggregation-in-DB keeps worker memory flat.",
              reasoning: "Bounding memory (chunking) or offloading heavy compute to a proper engine fixes the class of problem; raising limits only moves the ceiling." },
            { label: "Move the data through XCom instead", correct: false,
              why: "XCom stores values in the metadata DB — pushing large payloads through it just relocates the blow-up and bloats the DB." },
            { label: "Only raise the pod memory limit", correct: false,
              why: "A valid stopgap, but data grows and you'll hit the new ceiling. The durable fix is to stop loading big data into the worker at all." }
          ]
        }
      ],
      rootCause: "A task loaded more data into worker memory than the worker/pod allowed, so it was OOM-killed (exit 137 / <code>OOMKilled</code>).",
      resolution: "Chunk the processing or push heavy compute down to the database or Spark; raise pod memory via <code>executor_config</code> only as a temporary measure.",
      prevention: "Keep Airflow as an orchestrator; never move large payloads through XCom; set memory requests/limits and alert on OOM events.",
      interviewAnswer: "Exit 137 means an OOM kill. I check whether the task is pulling large data into the worker — the usual cause — and fix it by chunking or pushing the compute down to the warehouse or Spark, since Airflow should orchestrate, not crunch big data. Raising the memory limit is only a stopgap, and large data should never go through XCom."
    },

    /* ── 4 · Metadata DB connection exhaustion ──────────────── */
    {
      id: "metadata-db-exhaustion",
      category: "Performance",
      difficulty: "hard",
      icon: "🔌",
      title: "Metadata DB connection exhaustion",
      symptom: "Errors like <code>QueuePool limit of size N overflow M reached</code>; the whole UI is sluggish and the scheduler lags.",
      steps: [
        {
          prompt: "The UI is slow everywhere and you see <code>QueuePool limit … reached</code>. What layer is this?",
          checks: [
            { label: "Database connection capacity, not task logic", correct: true,
              evidence: "The error comes from SQLAlchemy's connection pool; Postgres shows connections near <code>max_connections</code>.",
              reasoning: "QueuePool errors mean components are opening more DB sessions than the pool (<code>sql_alchemy_pool_size</code> + <code>max_overflow</code>) or Postgres allows — a shared-resource bottleneck felt everywhere at once." },
            { label: "A single bad DAG", correct: false,
              why: "One DAG rarely exhausts the DB pool; the tell here is that <i>everything</i> — UI and scheduler — is slow, which points to a shared resource." },
            { label: "Worker OOM", correct: false,
              why: "OOM kills individual tasks with exit 137; it doesn't produce QueuePool errors across the UI and scheduler." }
          ]
        },
        {
          prompt: "What often makes this worse right before it happens?",
          checks: [
            { label: "Scaling out more schedulers / workers without pooling connections", correct: true,
              evidence: "A recently added scheduler or extra worker replicas pushed total connections past the cap.",
              reasoning: "Every component holds DB connections; adding more to \"go faster\" increases connection pressure — the opposite of what's needed when the DB is the bottleneck." },
            { label: "Turning on retries", correct: false,
              why: "Retries don't materially change steady-state DB connection counts." },
            { label: "Changing a UI setting", correct: false,
              why: "UI preferences don't affect DB connection pools." }
          ]
        },
        {
          prompt: "What's the standard fix?",
          checks: [
            { label: "Put PgBouncer in front of Postgres, tune sql_alchemy_pool_size, run db clean", correct: true,
              evidence: "PgBouncer multiplexes many client connections onto few DB connections; <code>airflow db clean</code> shrinks a bloated history.",
              reasoning: "Connection pooling (PgBouncer) is the canonical Airflow HA pattern for connection exhaustion, plus right-sized pools and regular cleanup to keep the DB fast." },
            { label: "Add even more schedulers", correct: false,
              why: "That adds connections — it worsens exhaustion. Pool first." },
            { label: "Increase task parallelism", correct: false,
              why: "More concurrent tasks means more sessions — again the wrong direction." }
          ]
        }
      ],
      rootCause: "More components and tasks opened metadata-DB sessions than the connection pool or Postgres <code>max_connections</code> allowed.",
      resolution: "Introduce PgBouncer, tune <code>sql_alchemy_pool_size</code> / <code>max_overflow</code>, and run <code>airflow db clean</code> to reduce DB load.",
      prevention: "Adopt PgBouncer before scaling schedulers/workers; monitor DB connections and metadata-DB size; schedule <code>db clean</code>.",
      interviewAnswer: "QueuePool errors with a slow UI and lagging scheduler point to metadata-DB connection exhaustion — a shared bottleneck. The standard fix is PgBouncer in front of Postgres plus tuned pool sizes and regular db clean. And I'm careful that scaling out schedulers or workers adds connections, so pooling has to come first."
    },

    /* ── 5 · Scheduler stopped scheduling ───────────────────── */
    {
      id: "scheduler-stopped",
      category: "Scheduler",
      difficulty: "hard",
      icon: "📴",
      title: "Scheduler stopped scheduling",
      symptom: "No new task instances are being created across <i>all</i> DAGs; existing runs sit idle. <code>scheduler.heartbeat</code> is stale.",
      steps: [
        {
          prompt: "No <b>new</b> task instances anywhere, though the webserver is up. Where do you look?",
          checks: [
            { label: "The scheduler process and its heartbeat", correct: true,
              evidence: "<code>scheduler.heartbeat</code> is stale, or the scheduler container is down / stuck looping.",
              reasoning: "Only the scheduler creates task instances. If nothing new is scheduled <i>anywhere</i>, the scheduler — not any DAG or worker — is the suspect." },
            { label: "The workers", correct: false,
              why: "Workers execute tasks that already exist; they don't create new task instances. \"Nothing new scheduled\" points upstream to the scheduler." },
            { label: "One specific DAG's code", correct: false,
              why: "The problem spans <i>all</i> DAGs, so it isn't one DAG — it's the shared scheduler." }
          ]
        },
        {
          prompt: "The scheduler is up but its loop is slow/blocked. What commonly stalls the parse loop?",
          checks: [
            { label: "Heavy work at the top level of a DAG file (imports, API/DB calls)", correct: true,
              evidence: "DAG parse time spiked right after a deploy that added a module-level network call.",
              reasoning: "The scheduler parses DAG files on a loop; expensive top-level code runs on every parse and can stall the whole loop, starving scheduling." },
            { label: "Too many successful task runs", correct: false,
              why: "Green runs don't block the parse loop; expensive parsing does." },
            { label: "The UI theme setting", correct: false,
              why: "UI settings have nothing to do with the scheduler's parse loop." }
          ]
        },
        {
          prompt: "How do you make this resilient?",
          checks: [
            { label: "Run multiple active-active schedulers (HA) and keep DAG files import-safe", correct: true,
              evidence: "With HA schedulers, one stall doesn't halt scheduling; import-safe files keep parse time low.",
              reasoning: "HA schedulers remove the single point of failure, and moving heavy work into task callables keeps the parse loop fast — the two durable fixes." },
            { label: "Restart the scheduler on a 5-minute cron", correct: false,
              why: "A band-aid that masks the real cause and can interrupt in-flight scheduling. Fix parse time and run HA instead." },
            { label: "Add more workers", correct: false,
              why: "Workers don't schedule; adding them does nothing for a scheduling stall." }
          ]
        }
      ],
      rootCause: "The scheduler crashed, lost its DB connection, or stalled in a slow DAG-parse loop (often heavy top-level code), so no new task instances were created.",
      resolution: "Restore the scheduler, move heavy imports/IO out of DAG-file top level into tasks, and run multiple active-active schedulers.",
      prevention: "Alert on scheduler heartbeat &gt; ~30 s and on DAG parse time; enforce import-safe DAG files; deploy HA schedulers.",
      interviewAnswer: "If nothing new is being scheduled across all DAGs, I look at the scheduler and its heartbeat — not workers or one DAG. A common cause is heavy top-level code blowing up DAG parse time. The durable fixes are import-safe DAG files and running HA active-active schedulers so one stall can't halt the whole cluster."
    },

    /* ── 6 · DAG import errors ──────────────────────────────── */
    {
      id: "dag-import-error",
      category: "DAG",
      difficulty: "easy",
      icon: "🚫",
      title: "A DAG vanished from the UI",
      symptom: "A DAG disappeared from the UI right after a deploy, or the top banner shows a red <b>Import Errors</b> count.",
      steps: [
        {
          prompt: "A DAG disappeared from the UI after a deploy. Most likely reason?",
          checks: [
            { label: "The DAG file raised an exception at parse time", correct: true,
              evidence: "The Import Errors banner shows a traceback for that file.",
              reasoning: "If a DAG file throws while being parsed, Airflow can't build the DAG object, so it drops out of the UI — the import-errors view has the traceback." },
            { label: "Someone paused it", correct: false,
              why: "A paused DAG still <i>appears</i> (just toggled off); it doesn't vanish. Disappearing means it failed to parse." },
            { label: "The scheduler is down", correct: false,
              why: "A down scheduler stops <i>new</i> scheduling but doesn't remove an already-registered DAG from the UI the way a parse error does." }
          ]
        },
        {
          prompt: "How do you see the actual error fastest?",
          checks: [
            { label: "Open Import Errors, or run python your_dag.py / airflow dags list-import-errors", correct: true,
              evidence: "Running the file locally reproduces the exact exception and line.",
              reasoning: "These surface the parse-time traceback directly, pinpointing the offending import or statement." },
            { label: "Read every task log", correct: false,
              why: "The task never ran — there are no task logs. The failure is at parse time, before any task." },
            { label: "Check worker memory", correct: false,
              why: "Parsing happens in the scheduler / DAG processor, not the worker; memory isn't the issue for an import error." }
          ]
        },
        {
          prompt: "The error is a top-level call to an external service that was down. The rule to prevent it?",
          checks: [
            { label: "Keep DAG files import-safe — defer network/DB/heavy work into task callables", correct: true,
              evidence: "Moving the call inside a task removes it from the parse path entirely.",
              reasoning: "Top-level code runs on every parse; any failure there removes the whole DAG. Real work belongs inside tasks that run at execution time." },
            { label: "Wrap the whole DAG file in try/except", correct: false,
              why: "Swallowing parse errors hides breakage and can register a half-built DAG; the fix is to not do IO at import time." },
            { label: "Increase retries", correct: false,
              why: "Retries are for task execution; a parse-time failure never reaches execution." }
          ]
        }
      ],
      rootCause: "The DAG module raised during parsing — a syntax error, missing dependency, or top-level call to an external service — so Airflow couldn't register it.",
      resolution: "Read the import-errors traceback (or run the file), fix the offending line, and move any IO/heavy work out of module top level into task callables.",
      prevention: "Enforce import-safe DAG files in review/CI (parse-check every DAG); no network/DB/heavy compute at import time.",
      interviewAnswer: "A DAG vanishing usually means it failed to parse — I check the Import Errors view or run the file directly for the traceback. The root rule is that DAG files must be import-safe: no network, DB, or heavy work at the top level, because that runs on every parse and any failure removes the whole DAG. All real work goes inside tasks."
    },

    /* ── 7 · ExternalTaskSensor never completes ─────────────── */
    {
      id: "external-task-sensor",
      category: "Dependencies",
      difficulty: "hard",
      icon: "🔗",
      title: "ExternalTaskSensor never completes",
      symptom: "An <code>ExternalTaskSensor</code> waits forever and the downstream DAG never starts, even though the upstream DAG \"looks done.\"",
      steps: [
        {
          prompt: "The sensor never succeeds though the upstream DAG ran. What do you check first?",
          checks: [
            { label: "That both DAGs share the same logical (execution) date", correct: true,
              evidence: "The sensor polls for the upstream task at the <i>same</i> logical date; the schedules differ, so there's no matching run.",
              reasoning: "ExternalTaskSensor matches on logical date by default. If the upstream runs on a different schedule or date, the sensor waits for a run that doesn't exist." },
            { label: "Increase the sensor timeout", correct: false,
              why: "A longer timeout just delays the failure; if the date never matches, it will never succeed regardless of timeout." },
            { label: "Restart the triggerer", correct: false,
              why: "The triggerer matters for <i>deferrable</i> sensors, but the core issue here is date matching, not the triggerer being down." }
          ]
        },
        {
          prompt: "The schedules differ by design. How do you align them?",
          checks: [
            { label: "Set execution_delta or execution_date_fn to map to the upstream run", correct: true,
              evidence: "With <code>execution_delta</code> / <code>execution_date_fn</code> the sensor targets the correct upstream logical date.",
              reasoning: "These parameters bridge different schedules so the sensor polls the run that actually exists." },
            { label: "Hard-code today's date", correct: false,
              why: "Hard-coding breaks backfills and any non-today run; the mapping must be relative to the logical date." },
            { label: "Remove the sensor and rely on timing", correct: false,
              why: "Without the dependency you lose the guarantee the upstream finished — which is the whole point of the sensor." }
          ]
        },
        {
          prompt: "Dates align, but the specific upstream task you're waiting on was skipped. What do you set?",
          checks: [
            { label: "allowed_states / failed_states (or watch a task that always runs)", correct: true,
              evidence: "By default the sensor waits for <code>success</code>; a skipped upstream task never reaches success, so it hangs.",
              reasoning: "The sensor only succeeds when the target task hits an allowed state. If that task can be skipped, account for it or watch a task that always runs." },
            { label: "Add more retries to the sensor", correct: false,
              why: "Retries re-run the same wait; they don't change which upstream states count as done." },
            { label: "Switch to poke mode", correct: false,
              why: "Poke vs reschedule is about worker-slot usage, not about which upstream states satisfy the dependency." }
          ]
        }
      ],
      rootCause: "The sensor was polling for an upstream run/state that never matched — usually a logical-date mismatch, or waiting on a task that was skipped.",
      resolution: "Align dates with <code>execution_delta</code> / <code>execution_date_fn</code> and set <code>allowed_states</code> / <code>failed_states</code> to match how the upstream actually behaves.",
      prevention: "Prefer Airflow Assets/Datasets for cross-DAG triggering where possible; document schedule relationships; test cross-DAG deps on backfill.",
      interviewAnswer: "An ExternalTaskSensor that hangs is almost always a logical-date mismatch — it matches on execution date by default, so different schedules need execution_delta or execution_date_fn. I also check allowed_states, because if the upstream task can be skipped it never reaches success. For new designs I'd consider Datasets/Assets instead of a cross-DAG sensor."
    },

    /* ── 8 · Sensors starving worker slots ──────────────────── */
    {
      id: "sensor-starvation",
      category: "Sensors",
      difficulty: "med",
      icon: "🛑",
      title: "Sensors are starving the worker pool",
      symptom: "Many DAGs use sensors, and suddenly normal tasks can't get worker slots — everything backs up behind waiting sensors.",
      steps: [
        {
          prompt: "Normal tasks are starved of slots. What's consuming them?",
          checks: [
            { label: "Poke-mode sensors each hold a worker slot for the entire wait", correct: true,
              evidence: "The number of running sensors equals the busy slots — they're all <code>running</code> but merely polling.",
              reasoning: "A classic poke sensor occupies a worker slot for its whole wait. Many long-waiting sensors can consume every slot, starving real work." },
            { label: "The scheduler is creating too many task instances", correct: false,
              why: "The scheduler isn't the bottleneck here — slots are full of waiting sensors, an execution-capacity issue." },
            { label: "The metadata DB is slow", correct: false,
              why: "DB slowness looks different (QueuePool errors, global sluggishness); here the slots are simply occupied by sensors." }
          ]
        },
        {
          prompt: "How do you free the slots while the sensors wait?",
          checks: [
            { label: "Use mode='reschedule' so a waiting sensor releases its slot between pokes", correct: true,
              evidence: "In reschedule mode the sensor frees the slot and is re-queued at the next poke interval.",
              reasoning: "Reschedule mode releases the worker slot during the wait, so waiting sensors stop hogging capacity." },
            { label: "Add retries to the sensors", correct: false,
              why: "Retries don't change slot occupancy during the wait; a poke sensor still sits in a slot." },
            { label: "Raise the sensor timeouts", correct: false,
              why: "Longer timeouts make starvation <i>worse</i> — sensors hold slots even longer." }
          ]
        },
        {
          prompt: "For frequent, long waits, what's the most scalable option?",
          checks: [
            { label: "Deferrable sensors/operators that hand off to the triggerer", correct: true,
              evidence: "Deferred tasks consume no worker slot; the async triggerer watches the condition and resumes them.",
              reasoning: "Deferrable operators free the worker entirely during the wait — one triggerer can watch thousands of waits, the most scalable pattern." },
            { label: "Just keep adding workers", correct: false,
              why: "Scaling workers to hold idle sensors is expensive and doesn't fix the design; deferral removes the waste." },
            { label: "Switch to poke with a tiny interval", correct: false,
              why: "Frequent poking increases load and still holds the slot — the opposite of scalable." }
          ]
        }
      ],
      rootCause: "Poke-mode sensors held worker slots for the entire duration of their waits, starving real tasks of execution capacity.",
      resolution: "Switch waiting sensors to <code>mode='reschedule'</code>, or better, to deferrable sensors that offload the wait to the triggerer.",
      prevention: "Default long/uncertain waits to deferrable or reschedule; reserve poke for very short waits; run a triggerer for deferrable support.",
      interviewAnswer: "Poke-mode sensors occupy a worker slot the whole time they wait, so a lot of them starve real tasks. The fix is reschedule mode, which frees the slot between pokes, or — best for frequent long waits — deferrable sensors that hand off to the triggerer and use no worker slot at all. Poke should be reserved for very short waits."
    },

    /* ── 9 · Kubernetes pod stuck Pending ───────────────────── */
    {
      id: "k8s-pod-pending",
      category: "Kubernetes",
      difficulty: "med",
      icon: "☸️",
      title: "KubernetesExecutor pods stuck Pending",
      symptom: "On KubernetesExecutor, worker pods stay <code>Pending</code> and never start; tasks don't progress.",
      steps: [
        {
          prompt: "Worker pods are stuck <code>Pending</code>. What do you inspect first?",
          checks: [
            { label: "kubectl describe pod events for the pending pod", correct: true,
              evidence: "Events read <code>Insufficient cpu/memory</code>, <code>FailedScheduling</code>, an unbound PVC, or a nodeSelector mismatch.",
              reasoning: "Pending means the pod can't be placed on a node yet. The pod's Events state exactly why — the fastest diagnostic." },
            { label: "The task's Python code", correct: false,
              why: "The container hasn't started, so no code has run. Pending is a scheduling/placement problem, not application logic." },
            { label: "Airflow's retries setting", correct: false,
              why: "Retries act after a task runs; they don't help a pod that can't be scheduled onto a node." }
          ]
        },
        {
          prompt: "<code>describe</code> shows <code>Insufficient memory</code>. What's happening?",
          checks: [
            { label: "No node has enough allocatable resources for the pod's requests", correct: true,
              evidence: "The sum of requests exceeds free capacity, and the cluster autoscaler (if any) hasn't added a node.",
              reasoning: "The K8s scheduler can't place a pod whose resource requests exceed any node's free capacity — it stays Pending until capacity appears." },
            { label: "The image is wrong", correct: false,
              why: "A bad image gives <code>ImagePullBackOff</code>/<code>ErrImagePull</code>, not Pending on \"Insufficient memory.\"" },
            { label: "The metadata DB is full", correct: false,
              why: "DB capacity doesn't affect Kubernetes pod scheduling." }
          ]
        },
        {
          prompt: "How do you resolve and prevent it?",
          checks: [
            { label: "Right-size pod requests via executor_config and ensure autoscaling/headroom", correct: true,
              evidence: "Lowering over-large requests, or adding node capacity, lets pods schedule.",
              reasoning: "Matching requests to reality and giving the cluster room (or a working autoscaler) is what clears and prevents Pending pods." },
            { label: "Set requests to zero", correct: false,
              why: "Zero requests risks oversubscription and OOM later — you trade Pending for instability." },
            { label: "Restart the Airflow scheduler repeatedly", correct: false,
              why: "The Airflow scheduler doesn't place pods; the Kubernetes scheduler does. Restarting Airflow won't add node capacity." }
          ]
        }
      ],
      rootCause: "Worker pods couldn't be scheduled onto a node — usually resource requests exceeding available capacity, or a nodeSelector/PVC/quota issue.",
      resolution: "Read pod Events, right-size resource requests via <code>executor_config</code>, and add capacity or fix the autoscaler / nodeSelector / quota.",
      prevention: "Set realistic requests/limits, keep cluster headroom or autoscaling, and alert on pods Pending beyond a threshold.",
      interviewAnswer: "Pending pods are a Kubernetes scheduling problem, not Airflow logic. I run kubectl describe on the pod and read the Events — usually Insufficient cpu/memory or a nodeSelector/PVC issue. The fix is right-sizing the pod's requests via executor_config and making sure the cluster has capacity or working autoscaling. Retries and scheduler restarts don't help, because the container never started."
    },

    /* ── 10 · Celery broker down ────────────────────────────── */
    {
      id: "celery-broker-down",
      category: "Celery",
      difficulty: "hard",
      icon: "🥦",
      title: "Celery tasks queued but never dispatched",
      symptom: "On CeleryExecutor, tasks are <span class='state-chip queued'>queued</span> but the workers sit idle and pick up nothing.",
      steps: [
        {
          prompt: "Tasks are queued but Celery workers are idle. What's the shared piece to check?",
          checks: [
            { label: "The Celery broker (Redis/RabbitMQ) is reachable and healthy", correct: true,
              evidence: "The broker is down/unreachable; the scheduler and workers log connection errors to it.",
              reasoning: "Celery routes every task through the broker. If it's down, the scheduler can't enqueue and workers can't consume — tasks stall with idle workers." },
            { label: "Each worker's Python environment", correct: false,
              why: "Idle workers <i>across the board</i> point to the shared broker, not many independent env problems." },
            { label: "The DAG code", correct: false,
              why: "Code runs after dispatch; nothing is being dispatched, so this is transport (broker), not logic." }
          ]
        },
        {
          prompt: "The broker is up, but workers still consume nothing. What next?",
          checks: [
            { label: "Whether workers subscribe to the queues the tasks are routed to (--queues)", correct: true,
              evidence: "Tasks target a queue that no running worker listens on.",
              reasoning: "Even with a healthy broker, a task routed to a queue with no subscribed worker sits unconsumed. Queue↔worker mismatch is a classic Celery trap." },
            { label: "Increase parallelism", correct: false,
              why: "Idle workers mean capacity isn't the constraint; routing/subscription is." },
            { label: "The webserver secret key", correct: false,
              why: "The secret key affects the UI/session, not task consumption from the broker." }
          ]
        },
        {
          prompt: "Broker healthy and queues aligned, but state looks stale. What underpins Celery reliability?",
          checks: [
            { label: "A healthy result backend and monitoring (Flower), plus broker HA", correct: true,
              evidence: "The result backend stores task results/state; Flower shows worker and queue health.",
              reasoning: "Celery needs a working broker <i>and</i> result backend; monitoring and broker HA prevent silent stalls and speed diagnosis." },
            { label: "Turn off the result backend", correct: false,
              why: "Removing it loses task-result tracking and can break state handling — not a fix." },
            { label: "Run more schedulers", correct: false,
              why: "The bottleneck is the messaging layer, not scheduling capacity." }
          ]
        }
      ],
      rootCause: "The Celery messaging layer failed — the broker was down/unreachable, or tasks were routed to queues no worker subscribed to — so tasks were never dispatched.",
      resolution: "Restore the broker (ideally HA), align worker <code>--queues</code> with task routing, and verify the result backend; confirm with Flower.",
      prevention: "Run the broker in HA, monitor broker/result-backend health and queue depth, and validate queue↔worker subscriptions on every deploy.",
      interviewAnswer: "Queued tasks with idle Celery workers point to the messaging layer. First I check the broker — Redis or RabbitMQ — because everything routes through it; if it's down, nothing dispatches. If the broker's healthy, I check that workers actually subscribe to the task's queue, since a routing mismatch leaves messages unconsumed. I'd run the broker in HA and watch it with Flower."
    },

    /* ── 11 · Duplicate data after a retry ──────────────────── */
    {
      id: "duplicate-data-retry",
      category: "Data Engineering",
      difficulty: "hard",
      icon: "🔁",
      title: "Retry produced duplicate rows",
      symptom: "A load task failed midway, retried, succeeded — and now the target table has duplicate rows.",
      steps: [
        {
          prompt: "A partial failure retried and succeeded, and now there are duplicates. What's the root issue?",
          checks: [
            { label: "The task isn't idempotent — a re-run appends instead of replacing/merging", correct: true,
              evidence: "The first (failed) try already wrote some rows; the retry wrote them again with a plain INSERT/append.",
              reasoning: "Retries re-execute the whole task. If the write appends without dedup/replace, a partial first try plus a full retry produces duplicates. Idempotency is the fix." },
            { label: "Retries are the problem — turn them off", correct: false,
              why: "Retries are essential for resilience; the real defect is non-idempotent writes. Removing retries hides the bug and hurts reliability." },
            { label: "The scheduler double-scheduled the run", correct: false,
              why: "This is a within-task retry appending data, not a duplicate DAG run — the write semantics are the cause." }
          ]
        },
        {
          prompt: "How do you make the load idempotent?",
          checks: [
            { label: "Delete-insert by partition, or MERGE/upsert on a natural key", correct: true,
              evidence: "The task first deletes the target partition for <code>{{ ds }}</code>, then inserts — or MERGEs on a key.",
              reasoning: "Overwriting the partition for the run's data interval (or upserting on a key) makes re-runs converge to the same result no matter how many times they run." },
            { label: "Add a UNIQUE constraint and ignore errors", correct: false,
              why: "That can mask real issues and may abort the batch; a partition overwrite or MERGE is the deterministic pattern." },
            { label: "Sort the output", correct: false,
              why: "Ordering doesn't remove duplicates; the write itself must be idempotent." }
          ]
        },
        {
          prompt: "What makes the write target the right slice on retries <b>and</b> backfills?",
          checks: [
            { label: "Key the write to the run's logical date ({{ ds }} / data_interval)", correct: true,
              evidence: "Using <code>{{ ds }}</code> means try 1, try 2, and a backfill all target the same partition.",
              reasoning: "Templating the write to the logical date makes it deterministic across retries and backfills — the same run always overwrites the same slice." },
            { label: "Use datetime.now() in the query", correct: false,
              why: "<code>now()</code> drifts between the failed try, the retry, and backfills — so they hit different partitions and duplicates/gaps appear." },
            { label: "Store the last row count in a Variable", correct: false,
              why: "External mutable state is fragile and not idempotent; derive the target slice from the logical date instead." }
          ]
        }
      ],
      rootCause: "The load wasn't idempotent: a partial first try plus a full retry appended overlapping rows, and/or the write keyed off wall-clock time instead of the run's logical date.",
      resolution: "Make the write idempotent — delete-insert by partition or MERGE/upsert — keyed to the run's logical date (<code>{{ ds }}</code> / <code>data_interval</code>).",
      prevention: "Design every load to be safely re-runnable; template writes to the logical date; test by running a task twice and confirming identical output.",
      interviewAnswer: "Duplicates after a retry mean the task isn't idempotent — the failed try wrote some rows and the retry appended them again. The fix isn't removing retries; it's making the write idempotent, typically delete-insert by partition or a MERGE keyed on the run's logical date like {{ ds }}. Keying to the logical date rather than now() also keeps it correct across retries and backfills."
    },

    /* ── 12 · Catchup storm on deploy ───────────────────────── */
    {
      id: "catchup-storm",
      category: "Scheduler",
      difficulty: "med",
      icon: "🌊",
      title: "New DAG instantly spawns hundreds of runs",
      symptom: "You deploy a new daily DAG and it immediately creates hundreds of runs, hammering the cluster and its data sources.",
      steps: [
        {
          prompt: "A fresh DAG instantly creates hundreds of runs. Why?",
          checks: [
            { label: "catchup=True with an old start_date backfills every missed interval", correct: true,
              evidence: "<code>start_date</code> is months back and catchup isn't disabled, so Airflow schedules every interval since then.",
              reasoning: "By default Airflow \"catches up\" from <code>start_date</code> to now, creating a run per missed interval. An old start_date plus catchup produces a flood on first deploy." },
            { label: "The scheduler is buggy", correct: false,
              why: "This is expected catchup behaviour, not a bug — it's driven by <code>start_date</code> + <code>catchup</code>." },
            { label: "Too many workers", correct: false,
              why: "Workers execute what's scheduled; the flood originates from catchup creating the runs, not from worker count." }
          ]
        },
        {
          prompt: "You want it to start from now, not replay history. What do you set?",
          checks: [
            { label: "catchup=False (with a sensible start_date)", correct: true,
              evidence: "With <code>catchup=False</code> the DAG schedules only from the current interval forward.",
              reasoning: "catchup=False tells Airflow not to backfill missed intervals, so a fresh deploy starts cleanly from now." },
            { label: "Delete and recreate the DAG each day", correct: false,
              why: "Operationally fragile and it loses history; <code>catchup=False</code> is the intended control." },
            { label: "Pause the scheduler globally", correct: false,
              why: "That halts <i>all</i> DAGs, not just this one — a blunt instrument for a per-DAG setting." }
          ]
        },
        {
          prompt: "You DO need to process history, but safely. How?",
          checks: [
            { label: "Run a controlled backfill and cap concurrency with max_active_runs (and pools)", correct: true,
              evidence: "<code>max_active_runs</code> limits simultaneous DAG runs; a deliberate backfill processes history at a safe rate.",
              reasoning: "Bounding <code>max_active_runs</code> (and using pools) lets you replay history without overwhelming the cluster — controlled, not a storm." },
            { label: "Set catchup=True and hope it throttles itself", correct: false,
              why: "Catchup doesn't self-throttle; without <code>max_active_runs</code> it schedules everything at once." },
            { label: "Increase parallelism to absorb it", correct: false,
              why: "That just lets the storm hit harder downstream (DB, source systems); you want to <i>cap</i> concurrency, not raise it." }
          ]
        }
      ],
      rootCause: "The DAG had catchup enabled with a far-past <code>start_date</code>, so Airflow backfilled every missed interval at once on deploy.",
      resolution: "Set <code>catchup=False</code> for go-forward scheduling; if history is needed, run a deliberate backfill with <code>max_active_runs</code> (and pools) limiting concurrency.",
      prevention: "Default new DAGs to <code>catchup=False</code>, choose <code>start_date</code> deliberately, and set <code>max_active_runs</code> on anything that could replay history.",
      interviewAnswer: "That's catchup: a new DAG with an old start_date backfills every missed interval on deploy. For go-forward-only scheduling I set catchup=False. If I genuinely need the history, I run a controlled backfill and cap max_active_runs — and use pools — so it processes at a safe rate instead of storming the cluster and its data sources."
    }
  ];
})();
