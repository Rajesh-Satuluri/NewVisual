/* ============================================================
   modules/glossary.js — searchable term reference
   Interactive: live filter over an alphabetical term list.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  var TERMS = [
    ["Asset (Dataset)", "scheduling", "A named data object a DAG produces or consumes. Updates to an asset can trigger downstream DAGs — the basis of data-aware scheduling. Renamed from Dataset to Asset in Airflow 3."],
    ["Backfill", "scheduling", "Running a DAG for historical logical dates it never ran for. Fills gaps in a pipeline's history for a chosen date range."],
    ["Catchup", "scheduling", "When enabled, the scheduler creates a run for every missed interval between start_date and now. Usually set False to avoid a surprise stampede."],
    ["Connection", "config", "Stored credentials + endpoint for an external system, referenced by conn_id. Passwords are Fernet-encrypted at rest."],
    ["DAG", "core", "Directed Acyclic Graph — the pipeline definition: a set of tasks plus their dependencies, with no cycles."],
    ["DAG Run", "execution", "One execution of a DAG for a specific logical date, containing a task instance for each task."],
    ["Deferrable Operator", "execution", "An operator that releases its worker slot while waiting, handing the wait to the triggerer via an async trigger. Frees resources during long polls."],
    ["Executor", "execution", "The component that decides how and where task instances run: Local, Celery, or Kubernetes."],
    ["Fernet Key", "security", "A symmetric key used to encrypt connection passwords and sensitive variables in the metadata DB."],
    ["Hook", "core", "A reusable interface to an external system (S3, Postgres, HTTP). Operators use hooks; hooks resolve a Connection."],
    ["Logical Date", "scheduling", "The timestamp a run represents (formerly execution_date). For a daily run of Jan 15, it's the data interval's start — not wall-clock time."],
    ["Operator", "core", "A template for a single unit of work (PythonOperator, BashOperator). Instantiating one in a DAG creates a task."],
    ["Pool", "execution", "A named bucket of concurrency slots used to cap how many tasks hit a shared resource (e.g. a database) at once."],
    ["Priority Weight", "execution", "A task's scheduling priority when competing for slots. Higher weight wins; weight_rule controls how it aggregates."],
    ["Scheduler", "core", "The always-on loop that parses DAGs, creates DAG runs, and queues task instances when dependencies are met."],
    ["Sensor", "core", "A special operator that waits for a condition (a file, a partition, a time) before allowing downstream tasks to run."],
    ["Serialization", "core", "Converting a parsed DAG into JSON stored in the DB, so the scheduler and UI read DAGs without re-importing Python."],
    ["SLA", "operations", "A wall-clock deadline from the run's logical date. Missing it fires sla_miss_callback — even if the task later succeeds."],
    ["Task Instance", "execution", "A specific task for a specific DAG run — the atomic unit that moves through the state machine and gets a try_number."],
    ["Timetable", "scheduling", "The object that defines when a DAG runs and what data interval each run covers. Cron and dataset schedules are timetables."],
    ["Triggerer", "execution", "A separate async process that runs the triggers behind deferrable operators, so waiting tasks don't hold worker slots."],
    ["try_number", "execution", "The attempt counter for a task instance. Each retry increments it and writes its own log file (1.log, 2.log …)."],
    ["Variable", "config", "A global key-value stored in the metadata DB, read at runtime via Variable.get() or the {{ var }} template."],
    ["XCom", "execution", "Cross-communication — a small key-value passed between tasks via the metadata DB. For metadata and pointers, not large data."],
    ["Zombie Task", "operations", "A task whose worker died without reporting back. The scheduler detects the stale heartbeat and reaps it to up-for-retry."]
  ];

  var CAT_COLOR = {
    core: "airflow", scheduling: "cyan", execution: "green",
    config: "purple", security: "red", operations: "orange"
  };

  var module = {
    id: "glossary",
    title: "Glossary",
    fullWidth: true,
    _input: null, _handler: null,

    render: function (container) {
      var sorted = TERMS.slice().sort(function (a, b) { return a[0].localeCompare(b[0]); });

      container.innerHTML =
        '<div class="module-header animate-fade-in-up">' +
          '<div class="module-eyebrow">Apache Airflow · Reference</div>' +
          '<h1 class="module-title">Glossary: the vocabulary of Airflow</h1>' +
          '<p class="module-subtitle">Every core term in one place. Type to filter by name, definition, or category — ' +
          "handy for a fast lookup or a pre-interview refresher.</p>" +
        "</div>" +
        '<div class="gloss-toolbar">' +
          '<input type="text" id="gloss-search" class="gloss-search" placeholder="🔍  Filter terms — e.g. &quot;xcom&quot;, &quot;scheduling&quot;, &quot;deferrable&quot;" autocomplete="off">' +
          '<span class="gloss-count" id="gloss-count"></span>' +
        "</div>" +
        '<div class="gloss-list" id="gloss-list"></div>' +
        '<div class="gloss-empty" id="gloss-empty" hidden>No terms match — try a shorter search.</div>';

      var list = container.querySelector("#gloss-list");
      var count = container.querySelector("#gloss-count");
      var empty = container.querySelector("#gloss-empty");
      var input = container.querySelector("#gloss-search");
      this._input = input;

      function itemHTML(t) {
        var color = CAT_COLOR[t[1]] || "airflow";
        return '<div class="gloss-item" data-hay="' + (t[0] + " " + t[1] + " " + t[2]).toLowerCase() + '">' +
          '<div class="gloss-item-head">' +
            '<span class="gloss-term">' + t[0] + "</span>" +
            '<span class="badge badge-' + color + '">' + t[1] + "</span>" +
          "</div>" +
          '<p class="gloss-def">' + t[2] + "</p>" +
        "</div>";
      }

      list.innerHTML = sorted.map(itemHTML).join("");
      var items = Array.prototype.slice.call(list.querySelectorAll(".gloss-item"));

      function apply() {
        var q = input.value.trim().toLowerCase();
        var shown = 0;
        items.forEach(function (el) {
          var match = !q || el.getAttribute("data-hay").indexOf(q) !== -1;
          el.hidden = !match;
          if (match) shown++;
        });
        count.textContent = shown + " / " + items.length + " terms";
        empty.hidden = shown !== 0;
      }

      this._handler = apply;
      input.addEventListener("input", apply);
      apply();
    },

    destroy: function () {
      if (this._input && this._handler) this._input.removeEventListener("input", this._handler);
      this._input = null; this._handler = null;
    }
  };

  AV.registerModule(module);
})();
