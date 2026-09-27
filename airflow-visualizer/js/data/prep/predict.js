/* ============================================================
   data/prep/predict.js — "Predict what Airflow does"
   ------------------------------------------------------------
   Short DAG/code snippets; the learner predicts behaviour, then
   reveals what happens and why. Rendered by
   js/components/predict-output.js via js/modules/predict.js.

   Shape: { id, title, category, code, question, prediction,
            explanation, concept }
   `code` is plain text (CodeViewer escapes it). ES5-safe.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});
  AV.data = AV.data || {};

  AV.data.predict = [
    { id: "fan-in", title: "Two upstreams into one task", category: "Dependencies",
      code: "task_a >> task_b\ntask_c >> task_b",
      question: "When can task_b execute?",
      prediction: "task_b runs only after BOTH task_a and task_c have succeeded.",
      explanation: "task_b has two upstream dependencies; by default (trigger_rule <code>all_success</code>) it waits for every upstream to succeed.",
      concept: "Trigger rules / dependencies" },
    { id: "expand", title: "A mapped task", category: "Dynamic mapping",
      code: "@task\ndef extract():\n    return [1, 2, 3]\n\nprocess.expand(file=extract())",
      question: "What happens when this DAG runs?",
      prediction: "process is expanded into 3 mapped instances — one per item from extract() — running in parallel.",
      explanation: "Dynamic Task Mapping fans a single task into N instances at runtime from the upstream list.",
      concept: "Dynamic Task Mapping" },
    { id: "all-done", title: "trigger_rule = all_done", category: "Trigger rules",
      code: "clean_up = BashOperator(\n    task_id='clean_up',\n    bash_command='...',\n    trigger_rule='all_done',\n)",
      question: "When will clean_up run?",
      prediction: "Once all upstream tasks have finished — regardless of whether they succeeded, failed, or were skipped.",
      explanation: "<code>all_done</code> fires when every upstream has reached a terminal state — ideal for cleanup that must always run.",
      concept: "Trigger rules" },
    { id: "catchup", title: "catchup on an old start_date", category: "Scheduling",
      code: "dag = DAG(\n    'daily',\n    start_date=datetime(2024, 1, 1),\n    schedule='@daily',\n    catchup=True,\n)",
      question: "You deploy this on 2024-04-01. What happens?",
      prediction: "Airflow immediately creates ~90 DAG runs — one for every missed daily interval from Jan 1 to now.",
      explanation: "<code>catchup=True</code> backfills all intervals between start_date and now on deploy. Set <code>catchup=False</code> to avoid the flood.",
      concept: "Catchup" },
    { id: "ds-template", title: "Templated {{ ds }}", category: "Templating",
      code: "INSERT INTO t\nSELECT * FROM src\nWHERE dt = '{{ ds }}'",
      question: "For a run with logical_date 2024-01-15, what does this process?",
      prediction: "{{ ds }} renders to 2024-01-15, so the query processes exactly that day's partition — deterministically.",
      explanation: "<code>{{ ds }}</code> is the logical date (data-interval start) as YYYY-MM-DD; keying off it (not <code>now()</code>) makes the task idempotent across retries and backfills.",
      concept: "Templating / logical date" },
    { id: "branch", title: "A branch", category: "Branching",
      code: "branch = BranchPythonOperator(\n    task_id='branch',\n    python_callable=lambda **_: 'path_a',\n)\nbranch >> [path_a, path_b]",
      question: "Which downstream tasks run?",
      prediction: "path_a runs; path_b is skipped.",
      explanation: "BranchPythonOperator returns the task_id(s) to follow; the rest are skipped. A downstream join needs a trigger rule like <code>none_failed_min_one_success</code> to run after the skip.",
      concept: "Branching" },
    { id: "depends-past", title: "depends_on_past", category: "Scheduling",
      code: "default_args = {'depends_on_past': True}",
      question: "What does depends_on_past=True do?",
      prediction: "A task instance won't run until the same task's previous run succeeded.",
      explanation: "It serialises a task across runs — a failure in one interval blocks the next. Good for sequential correctness, but it can stall a backlog.",
      concept: "depends_on_past" },
    { id: "backoff", title: "Exponential backoff", category: "Reliability",
      code: "default_args = {\n    'retries': 3,\n    'retry_delay': timedelta(minutes=5),\n    'retry_exponential_backoff': True,\n}",
      question: "How does this task retry?",
      prediction: "On failure it retries up to 3 times, waiting ~5 min, then progressively longer (exponential backoff).",
      explanation: "<code>retry_exponential_backoff</code> grows the delay between attempts, easing pressure on a struggling dependency.",
      concept: "Retries" },
    { id: "top-level", title: "Top-level code", category: "DAG parsing",
      code: "import requests\ndata = requests.get('https://api...').json()  # module top level\n\nwith DAG(...) as dag:\n    ...",
      question: "When does the requests.get call execute?",
      prediction: "On every DAG parse — not at task runtime — because it's at module top level.",
      explanation: "Top-level code runs each time the scheduler parses the file; a slow or failing call inflates parse time or breaks the DAG. Move it into a task.",
      concept: "DAG parsing / import safety" },
    { id: "pool", title: "A shared pool", category: "Concurrency",
      code: "t = SomeOperator(\n    task_id='t',\n    pool='api_pool',  # pool has 5 slots\n)",
      question: "Many DAGs assign tasks to pool='api_pool' (5 slots). What's the effect?",
      prediction: "At most 5 tasks in api_pool run concurrently across ALL DAGs; the rest queue.",
      explanation: "Pools cap concurrency for a shared resource across DAGs — protecting, say, an API from overload — independent of global parallelism.",
      concept: "Pools" },
    { id: "schedule-none", title: "schedule = None", category: "Scheduling",
      code: "dag = DAG('manual', schedule=None, start_date=datetime(2024,1,1))",
      question: "When does this DAG run on its own?",
      prediction: "Never on a schedule — only when triggered manually, via the API, or by another DAG.",
      explanation: "<code>schedule=None</code> means no time-based runs; use it for on-demand or externally-triggered DAGs.",
      concept: "Scheduling" },
    { id: "taskflow-xcom", title: "TaskFlow wiring", category: "TaskFlow",
      code: "@task\ndef a():\n    return 42\n\n@task\ndef b(x):\n    print(x)\n\nb(a())",
      question: "What does b receive, and how?",
      prediction: "b receives 42 — the return value of a, passed automatically via XCom.",
      explanation: "In the TaskFlow API, calling <code>b(a())</code> creates an XCom dependency: a's return is pushed and pulled into b's argument, and a runs before b.",
      concept: "TaskFlow / XCom" }
  ];
})();
