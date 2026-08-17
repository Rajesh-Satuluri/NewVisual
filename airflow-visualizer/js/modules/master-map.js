/* ============================================================
   modules/master-map.js — master concept map
   A categorized, clickable index of every module, showing how
   Airflow's concepts group together. Links navigate via hash.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  var GROUPS = [
    {
      title: "Core Architecture", color: "airflow", icon: "🏛️",
      items: [
        ["architecture", "Architecture Overview", "How the pieces fit together"],
        ["metadata-db", "Metadata DB", "The single source of truth"],
        ["serialization", "Serialization", "DAG → JSON in the database"],
        ["scheduler", "Scheduler Internals", "The loop that drives everything"]
      ]
    },
    {
      title: "Authoring DAGs", color: "cyan", icon: "✍️",
      items: [
        ["dag-parsing", "DAG Parsing", "From .py file to serialized DAG"],
        ["templating", "Templating & Jinja", "Runtime values in your tasks"],
        ["task-mapping", "Dynamic Tasks", "Fan out at runtime"],
        ["connections", "Connections & Hooks", "Reach external systems"],
        ["variables", "Variables & Params", "Config, global and per-run"]
      ]
    },
    {
      title: "Scheduling", color: "purple", icon: "📅",
      items: [
        ["scheduling", "Scheduling & Timetables", "When a DAG runs"],
        ["dag-run", "DAG Run Lifecycle", "One execution, start to finish"],
        ["backfill", "Backfill", "Fill historical intervals"],
        ["sensors", "Sensors & Deferrable", "Wait without wasting slots"]
      ]
    },
    {
      title: "Execution", color: "green", icon: "⚙️",
      items: [
        ["task-instance", "Task Instance", "The atomic unit of work"],
        ["task-lifecycle", "Task Lifecycle", "The state machine"],
        ["executors", "Executors", "How work gets dispatched"],
        ["celery", "Celery Executor", "Warm worker pool + broker"],
        ["kubernetes", "Kubernetes Executor", "One pod per task"],
        ["xcoms", "XCom", "Passing data between tasks"]
      ]
    },
    {
      title: "Concurrency & Resilience", color: "orange", icon: "🚦",
      items: [
        ["pools", "Pools & Slots", "Cap shared-resource access"],
        ["priority", "Priority & Concurrency", "Who runs first"],
        ["retries", "Retries & SLAs", "Recover from failure"],
        ["callbacks", "Callbacks", "React to state changes"]
      ]
    },
    {
      title: "Operations", color: "yellow", icon: "🛠️",
      items: [
        ["logging", "Logging", "Worker to log platform"],
        ["monitoring", "Monitoring & Metrics", "Know your pipeline's health"],
        ["performance", "Performance Tuning", "Find and fix bottlenecks"],
        ["failure-scenarios", "Failure Scenarios", "The incident playbook"],
        ["cli", "CLI Deep Dive", "Operate from the terminal"]
      ]
    },
    {
      title: "Platform & Security", color: "red", icon: "🔐",
      items: [
        ["security", "Security & RBAC", "Auth, roles, and secrets"],
        ["ha-setup", "High Availability", "No single point of failure"]
      ]
    },
    {
      title: "Practice & Reference", color: "cyan", icon: "🎓",
      items: [
        ["interview", "Interview Q&A", "The questions you'll be asked"],
        ["quiz", "Quiz", "Test your internals knowledge"],
        ["event-simulator", "Event Simulator", "Watch a task instance react"],
        ["glossary", "Glossary", "Every term in one place"]
      ]
    }
  ];

  var module = {
    id: "master-map",
    title: "Master Concept Map",
    fullWidth: true,

    render: function (container) {
      var total = GROUPS.reduce(function (n, g) { return n + g.items.length; }, 0);

      container.innerHTML =
        '<div class="module-header animate-fade-in-up">' +
          '<div class="module-eyebrow">Apache Airflow · Overview</div>' +
          '<h1 class="module-title">Master concept map: the whole picture</h1>' +
          '<p class="module-subtitle">Every concept in this lab, grouped by the role it plays — from core architecture through ' +
          "authoring, scheduling, execution, operations, and interview prep. Click any node to jump straight to it.</p>" +
        "</div>" +
        '<div class="map-grid">' +
          GROUPS.map(function (g) {
            return '<section class="map-group">' +
              '<div class="map-group-head">' +
                '<span class="map-group-icon">' + g.icon + "</span>" +
                '<h2 class="map-group-title">' + g.title + "</h2>" +
                '<span class="map-group-rail" style="background:var(--' + g.color + ')"></span>' +
              "</div>" +
              '<div class="map-nodes">' +
                g.items.map(function (it) {
                  return '<a class="map-node" href="#' + it[0] + '" style="--node-accent:var(--' + g.color + ')">' +
                    '<span class="map-node-title">' + it[1] + "</span>" +
                    '<span class="map-node-desc">' + it[2] + "</span></a>";
                }).join("") +
              "</div>" +
            "</section>";
          }).join("") +
        "</div>" +
        '<section class="section" style="margin-top:var(--space-10)">' +
          '<div class="callout tip"><span class="callout-icon">🧭</span><div class="callout-body">' +
          "<b>A suggested path:</b> start with <a href='#architecture'>Architecture</a> → <a href='#dag-parsing'>DAG Parsing</a> → <a href='#scheduler'>Scheduler</a> → <a href='#task-instance'>Task Instance</a> → <a href='#executors'>Executors</a>, then branch into operations and finish with the <a href='#quiz'>Quiz</a>. All " + total + " modules are live.</div></div>" +
        "</section>";
    },

    destroy: function () {}
  };

  AV.registerModule(module);
})();
