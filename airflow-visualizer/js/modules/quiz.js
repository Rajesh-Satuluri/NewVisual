/* ============================================================
   modules/quiz.js — interactive knowledge check
   Interactive: multiple-choice with scoring and explanations.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  var QUESTIONS = [
    {
      q: "A daily DAG has <code>logical_date = 2024-01-15</code>. When does its run actually execute?",
      options: [
        "At the start of Jan 15 (00:00)",
        "At the end of the interval — early Jan 16",
        "Immediately when the DAG is unpaused",
        "Exactly at noon on Jan 15"
      ],
      answer: 1,
      why: "A run represents a data interval and fires at its <b>end</b>, so all of Jan 15's data is complete before processing. logical_date is the interval's start, not the execution time."
    },
    {
      q: "100 sensors are waiting on external files, each holding a worker slot. What fixes the slot exhaustion?",
      options: [
        "Increase retry_delay",
        "Set catchup=False",
        "Use deferrable operators / the triggerer",
        "Add more XComs"
      ],
      answer: 2,
      why: "Deferrable operators <b>yield their worker slot</b> and hand the wait to the triggerer's async event loop, which watches thousands of conditions without occupying workers."
    },
    {
      q: "Which is the correct way to pass a 2 GB DataFrame between two tasks?",
      options: [
        "Return it directly via XCom",
        "Store it as an Airflow Variable",
        "Write it to S3/warehouse and pass the path via XCom",
        "Put it in the DAG's params"
      ],
      answer: 2,
      why: "XCom lives in the metadata DB and is for <b>small</b> values. Persist large data externally and pass only a <b>pointer</b> (path/table) through XCom."
    },
    {
      q: "How do multiple active-active schedulers avoid scheduling the same task twice?",
      options: [
        "A ZooKeeper leader election",
        "DB row-level locking (SELECT … FOR UPDATE SKIP LOCKED)",
        "A Redis distributed lock",
        "Only one scheduler is ever active"
      ],
      answer: 1,
      why: "Schedulers coordinate purely through the metadata DB using <code>SKIP LOCKED</code> row locking — no external coordinator, no leader election, no single point of failure."
    },
    {
      q: "A task shows <span class='state-chip running'>running</span> in the UI but its worker pod was OOMKilled. What happens?",
      options: [
        "It runs forever and blocks downstream tasks",
        "The scheduler reaps it as a zombie → up-for-retry",
        "It is silently marked success",
        "The DAG run is deleted"
      ],
      answer: 1,
      why: "The heartbeat goes stale; <b>zombie detection</b> reaps it after <code>scheduler_zombie_task_threshold</code> and marks it up-for-retry so <code>retries</code> can recover it."
    },
    {
      q: "With <code>retries=3</code> and <code>retry_exponential_backoff=True</code> (retry_delay=5m), the wait before attempt 3 is:",
      options: [ "5 minutes", "10 minutes", "15 minutes", "20 minutes" ],
      answer: 1,
      why: "Delay = retry_delay × 2^(try-1). Before attempt 3, try=2 → 5 × 2¹ = <b>10 minutes</b> (attempt 2 waited 5m, attempt 3 waits 10m), capped by max_retry_delay."
    },
    {
      q: "Which component is the single stateful source of truth you must back up?",
      options: [
        "The Celery broker (Redis)",
        "The scheduler's local disk",
        "The metadata database",
        "The triggerer process"
      ],
      answer: 2,
      why: "Schedulers, workers, and API servers are stateless and recreatable. The <b>metadata DB</b> holds all DAG-run and task state — protect and back it up with an HA setup."
    },
    {
      q: "Why must top-level DAG-file code stay cheap?",
      options: [
        "It runs once at deploy time only",
        "The scheduler re-imports the file every parse loop",
        "It counts against XCom storage",
        "It blocks the Celery broker"
      ],
      answer: 1,
      why: "The scheduler <b>re-parses every DAG file</b> on each loop. Expensive top-level imports or network calls stall parsing for all DAGs — keep real work inside task callables."
    },
    {
      q: "Which trigger rule makes a task run once <b>all</b> upstream tasks finish, regardless of success or failure?",
      options: [ "all_success", "all_done", "one_success", "none_failed" ],
      answer: 1,
      why: "<code>all_done</code> waits for every upstream to reach a terminal state and then runs no matter the outcome — ideal for a cleanup or 'always send a report' task. The default <code>all_success</code> would skip if any upstream failed."
    },
    {
      q: "A Pool with 3 slots is assigned to 10 tasks that are all ready at once. How many run simultaneously?",
      options: [ "10", "3", "1", "0 — pools block execution" ],
      answer: 1,
      why: "A <b>Pool</b> caps concurrency against a shared resource. Three tasks take the three slots; the other seven wait in <span class='state-chip queued'>queued</span> until a slot frees. Pools cut across DAGs, protecting fragile APIs and databases."
    },
    {
      q: "What does <code>depends_on_past=True</code> do?",
      options: [
        "Waits for all downstream tasks of the previous run",
        "Holds the task until the same task in the previous DAG run succeeded",
        "Retries automatically on any past failure",
        "Disables catchup for the DAG"
      ],
      answer: 1,
      why: "It serializes a task across runs: this run's instance won't start until the <i>previous</i> run's copy of the <i>same task</i> succeeded. Great for stateful incremental loads; risky if an old run gets stuck, as it stalls everything after it."
    },
    {
      q: "Where should production secrets live so they never sit in the metadata DB at all?",
      options: [
        "Hard-coded as constants in the DAG file",
        "In XCom, pushed by the first task",
        "A secrets backend (Vault / AWS Secrets Manager)",
        "In the DAG's docstring"
      ],
      answer: 2,
      why: "A <b>secrets backend</b> makes Airflow fetch Connections/Variables at runtime from Vault, AWS/GCP Secret Manager, etc. — nothing sensitive is stored in the metadata DB, and access is scoped by the backend's IAM."
    },
    {
      q: "What is the <b>default</b> trigger rule for a task?",
      options: [ "all_done", "all_success", "none_failed", "one_success" ],
      answer: 1,
      why: "By default a task runs only when <b>all</b> its upstream tasks have <span class='state-chip success'>succeeded</span> (<code>all_success</code>). If any upstream fails or is skipped, the task is set <span class='state-chip skipped'>upstream_failed / skipped</span>."
    },
    {
      q: "Kubernetes task pods are deleted after they finish, and their logs vanish. What's the fix?",
      options: [
        "Increase retries",
        "Enable remote logging to S3/GCS",
        "Switch to the Local executor",
        "Raise core.parallelism"
      ],
      answer: 1,
      why: "Logs are written on the pod's local disk, which disappears with the pod. <b>Remote logging</b> ships them to S3/GCS/ELK so the API server can read them back and they survive the pod's deletion."
    },
    {
      q: "What is the role of <b>PgBouncer</b> in a large Airflow deployment?",
      options: [
        "It brokers Celery messages",
        "It pools connections in front of the metadata DB",
        "It stores and encrypts secrets",
        "It load-balances the API servers"
      ],
      answer: 1,
      why: "Hundreds of workers and scheduler loops can exhaust Postgres's connection limit. <b>PgBouncer</b> multiplexes many client connections onto a small pool of real DB connections — the official Helm chart ships it for this reason."
    },
    {
      q: "Which executor gives every task instance its own fresh, isolated pod?",
      options: [ "LocalExecutor", "CeleryExecutor", "KubernetesExecutor", "SequentialExecutor" ],
      answer: 2,
      why: "The <b>KubernetesExecutor</b> launches one pod per task instance — perfect isolation and per-task CPU/memory — at the cost of pod-startup latency. Celery reuses a warm worker pool; Local forks subprocesses on one host."
    },
    {
      q: "You want an alert task to fire the moment <b>any</b> upstream task fails. Which trigger rule?",
      options: [ "all_failed", "one_failed", "all_done", "none_failed" ],
      answer: 1,
      why: "<code>one_failed</code> fires as soon as a single upstream reaches <span class='state-chip failed'>failed</span>, without waiting for the others — exactly what you want for a fast alerting/notification task. <code>all_failed</code> would require every upstream to fail."
    },
    {
      q: "What makes a task <b>idempotent</b>?",
      options: [
        "It never fails",
        "Re-running it produces the same result as running it once",
        "It has retries enabled",
        "It writes its output to XCom"
      ],
      answer: 1,
      why: "Idempotency means running the task once or many times yields the same end state — e.g. delete-then-insert or upsert keyed on <code>logical_date</code>. It's the property that makes retries, clears, and backfills safe."
    },
    {
      q: "By default, when a task misses its <b>SLA</b>, what happens?",
      options: [
        "The task is killed and marked failed",
        "An SLA miss is recorded and the callback/email fires — the task keeps running",
        "The whole DAG run is deleted",
        "All downstream tasks are skipped"
      ],
      answer: 1,
      why: "An SLA is a lateness signal, not a kill switch. Airflow records the <b>SLA miss</b> and fires <code>sla_miss_callback</code> (and can email), but the task continues — so on-call and downstream consumers know the pipeline is late."
    },
    {
      q: "A DAG with <code>catchup=True</code> is unpaused after a year of downtime. What does the scheduler do?",
      options: [
        "Runs the DAG exactly once",
        "Creates a run for every missed interval since start_date",
        "Does nothing until the next scheduled time",
        "Marks the DAG failed"
      ],
      answer: 1,
      why: "With catchup on, the scheduler backfills a run for <i>every</i> missed interval — potentially 365 at once, a stampede. This is why most teams set <code>catchup=False</code> and run deliberate backfills instead."
    },
    {
      q: "In Airflow 3, user DAG files are parsed by:",
      options: [
        "The webserver/API server",
        "A dedicated DAG processor, separate from the scheduler",
        "Each Celery worker before running a task",
        "The triggerer"
      ],
      answer: 1,
      why: "Airflow 3 isolates parsing in a standalone <b>DAG processor</b> that serializes DAG structure into the metadata DB. This keeps arbitrary user code out of the scheduler process, improving reliability and security."
    },
    {
      q: "Tasks are stuck in <span class='state-chip scheduled'>scheduled</span> and won't start, though nothing is failing. What do you check <b>first</b>?",
      options: [
        "The Fernet key",
        "Concurrency limits: parallelism, max_active_tasks_per_dag, and pool slots",
        "The DAG's docstring",
        "XCom table size"
      ],
      answer: 1,
      why: "'Ready but not running' almost always means a slot ceiling: cluster-wide <code>parallelism</code>, per-DAG <code>max_active_tasks_per_dag</code>, <code>max_active_runs</code>, or an exhausted <b>pool</b>. Any one of them will hold tasks in scheduled."
    },
    {
      q: "What does <code>airflow tasks test &lt;dag&gt; &lt;task&gt; &lt;date&gt;</code> do?",
      options: [
        "Runs the task and records it as a normal task instance",
        "Runs one task with real templated context but writes no state to the DB",
        "Triggers the whole DAG immediately",
        "Only validates the DAG file's syntax"
      ],
      answer: 1,
      why: "<code>airflow tasks test</code> executes a <b>single task</b> in isolation with a real, templated context but does <i>not</i> create a task instance or persist any state — ideal for local debugging. Contrast <code>airflow dags trigger</code>, which starts a real, tracked run."
    }
  ];

  // How many questions each attempt serves, drawn fresh from the bank above.
  var QUIZ_SIZE = Math.min(10, QUESTIONS.length);

  // Fisher–Yates: draw a shuffled subset so every attempt is a different set.
  function drawPool() {
    var a = QUESTIONS.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a.slice(0, QUIZ_SIZE);
  }

  var module = {
    id: "quiz",
    title: "Quiz",
    fullWidth: true,
    _root: null, _handler: null, _state: null,

    render: function (container) {
      var self = this;
      this._state = { idx: 0, score: 0, answered: false, pool: drawPool() };

      container.innerHTML =
        '<div class="module-header animate-fade-in-up">' +
          '<div class="module-eyebrow">Apache Airflow · Knowledge Check</div>' +
          '<h1 class="module-title">Quiz: test your Airflow internals</h1>' +
          '<p class="module-subtitle">' + QUIZ_SIZE + " questions drawn fresh from a bank of " + QUESTIONS.length +
          ", covering the trickiest corners of Airflow behaviour. Pick an answer to see whether you're right — and exactly why. " +
          "Hit <i>Try again</i> for a brand-new set.</p>" +
        "</div>" +
        '<div class="quiz-shell" id="quiz-shell"></div>';

      var shell = container.querySelector("#quiz-shell");
      this._root = container;

      function renderQuestion() {
        var st = self._state;
        var q = st.pool[st.idx];
        st.answered = false;
        shell.innerHTML =
          '<div class="quiz-progress">' +
            '<span class="quiz-counter">Question ' + (st.idx + 1) + " / " + st.pool.length + "</span>" +
            '<span class="quiz-score">Score: ' + st.score + "</span>" +
            '<div class="quiz-bar"><div class="quiz-bar-fill" style="width:' +
              ((st.idx) / st.pool.length * 100) + '%"></div></div>' +
          "</div>" +
          '<div class="quiz-card">' +
            '<div class="quiz-q">' + q.q + "</div>" +
            '<div class="quiz-options" id="quiz-options">' +
              q.options.map(function (o, i) {
                return '<button class="quiz-option" data-i="' + i + '">' +
                  '<span class="quiz-opt-key">' + String.fromCharCode(65 + i) + "</span>" +
                  '<span class="quiz-opt-text">' + o + "</span></button>";
              }).join("") +
            "</div>" +
            '<div class="quiz-feedback" id="quiz-feedback" hidden></div>' +
          "</div>";
      }

      function renderResult() {
        var st = self._state;
        var pct = Math.round(st.score / st.pool.length * 100);
        var verdict = pct === 100 ? "Flawless — you know Airflow cold. 🏆"
          : pct >= 75 ? "Strong — you'd hold your own in a senior interview. 💪"
          : pct >= 50 ? "Solid base — revisit scheduling and execution internals. 📚"
          : "Good start — walk the animated modules and try again. 🌱";
        shell.innerHTML =
          '<div class="quiz-card quiz-result">' +
            '<div class="quiz-result-score gradient-text">' + st.score + " / " + st.pool.length + "</div>" +
            '<div class="quiz-result-pct">' + pct + "%</div>" +
            "<p class='quiz-result-verdict'>" + verdict + "</p>" +
            '<button class="btn btn-primary" id="quiz-restart">Try again ↻</button>' +
          "</div>";
      }

      function onClick(e) {
        var st = self._state;
        var opt = e.target.closest(".quiz-option");
        if (opt && !st.answered) {
          st.answered = true;
          var chosen = parseInt(opt.getAttribute("data-i"), 10);
          var q = st.pool[st.idx];
          var correct = chosen === q.answer;
          if (correct) st.score++;
          var btns = shell.querySelectorAll(".quiz-option");
          btns.forEach(function (b, i) {
            b.disabled = true;
            if (i === q.answer) b.classList.add("quiz-correct");
            else if (i === chosen) b.classList.add("quiz-wrong");
          });
          var fb = shell.querySelector("#quiz-feedback");
          fb.hidden = false;
          fb.className = "quiz-feedback " + (correct ? "quiz-fb-right" : "quiz-fb-wrong");
          fb.innerHTML =
            '<div class="quiz-fb-head">' + (correct ? "✓ Correct" : "✗ Not quite") + "</div>" +
            "<p>" + q.why + "</p>" +
            '<button class="btn btn-primary quiz-next" id="quiz-next">' +
              (st.idx === st.pool.length - 1 ? "See results →" : "Next question →") + "</button>";
          return;
        }
        if (e.target.id === "quiz-next") {
          st.idx++;
          if (st.idx >= st.pool.length) renderResult();
          else renderQuestion();
          return;
        }
        if (e.target.id === "quiz-restart") {
          self._state = { idx: 0, score: 0, answered: false, pool: drawPool() };
          renderQuestion();
        }
      }

      this._handler = onClick;
      container.addEventListener("click", onClick);
      renderQuestion();
    },

    destroy: function () {
      if (this._root && this._handler) this._root.removeEventListener("click", this._handler);
      this._root = null; this._handler = null; this._state = null;
    }
  };

  AV.registerModule(module);
})();
