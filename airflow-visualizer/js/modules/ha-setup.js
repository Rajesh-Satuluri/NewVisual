/* ============================================================
   modules/ha-setup.js — high-availability deployment
   Arch diagram: LB → API servers, active-active schedulers,
   worker fleet, HA metadata DB behind PgBouncer.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  var NODES = [
    { id: "lb",     label: "Load Balancer",     sub: "health-checked, TLS",       x: 255, y: 20,  w: 190, h: 55, color: "cyan"    },
    { id: "api",    label: "API Servers ×N",    sub: "stateless · UI + REST",     x: 255, y: 120, w: 190, h: 60, color: "green"   },
    { id: "sched",  label: "Schedulers ×2+",    sub: "active-active, row-locked", x: 30,  y: 220, w: 200, h: 65, color: "airflow" },
    { id: "trig",   label: "Triggerers ×N",     sub: "deferrable task waits",     x: 470, y: 220, w: 190, h: 65, color: "purple"  },
    { id: "workers",label: "Worker Fleet",      sub: "Celery / K8s, autoscaled",  x: 255, y: 220, w: 190, h: 65, color: "yellow"  },
    { id: "pgb",    label: "PgBouncer",         sub: "connection pooler",         x: 255, y: 320, w: 190, h: 55, color: "orange"  },
    { id: "db",     label: "Metadata DB (HA)",  sub: "primary + standby replica", x: 255, y: 405, w: 190, h: 60, color: "red"     }
  ];

  var EDGES = [
    ["lb", "api"], ["api", "pgb"],
    ["sched", "pgb"], ["trig", "pgb"], ["workers", "pgb"],
    ["pgb", "db"]
  ];

  var STEPS = [
    {
      nodes: ["lb", "api"], edges: [["lb", "api"]],
      label: "1 · Front the UI with a load balancer",
      desc: "API servers (UI + REST) are <b>stateless</b> — run several behind a load balancer with health checks on <code>/health</code>. Any instance can serve any request. Losing one drops zero traffic; the LB routes around it."
    },
    {
      nodes: ["sched"], edges: [],
      label: "2 · Run schedulers active-active",
      desc: "Since Airflow 2.0 you can run <b>multiple schedulers simultaneously</b>. They coordinate through the metadata DB using <code>SELECT ... FOR UPDATE SKIP LOCKED</code> row-level locking — no leader election, no single point of failure. If one dies, the others keep scheduling with zero downtime."
    },
    {
      nodes: ["workers", "trig"], edges: [],
      label: "3 · Scale workers and triggerers horizontally",
      desc: "The <b>worker fleet</b> (Celery or Kubernetes) scales out for throughput and autoscales on queue depth. <b>Triggerers</b> handle deferrable-operator waits on an async event loop — run 2+ so long-polling sensors survive a triggerer restart."
    },
    {
      nodes: ["api", "sched", "trig", "workers", "pgb"], edges: [["api", "pgb"], ["sched", "pgb"], ["trig", "pgb"], ["workers", "pgb"]],
      label: "4 · Pool DB connections through PgBouncer",
      desc: "Every component opens DB sessions. At scale that overwhelms Postgres's <code>max_connections</code>. <b>PgBouncer</b> multiplexes hundreds of client connections onto a small server pool — the single most important HA component for a busy cluster."
    },
    {
      nodes: ["pgb", "db"], edges: [["pgb", "db"]],
      label: "5 · Make the metadata DB itself HA",
      desc: "The metadata DB is the one true stateful dependency. Use a managed HA Postgres (RDS Multi-AZ, Cloud SQL HA) with a <b>primary + synchronous standby</b> and automatic failover. Everything else can be recreated; this is what you back up and protect."
    },
    {
      nodes: ["lb", "api", "sched", "trig", "workers", "pgb", "db"], edges: EDGES,
      label: "6 · The full resilient topology",
      desc: "Put together: LB-fronted stateless API servers, 2+ active-active schedulers, an autoscaled worker fleet, redundant triggerers, PgBouncer, and an HA Postgres. Every tier tolerates the loss of one node with no manual intervention — the reference production deployment."
    }
  ];

  var CODE_SCHED =
    "# Run 2+ schedulers — no extra config needed.\n" +
    "# Each is identical; DB row-locking coordinates them.\n" +
    "\n" +
    "# scheduler-a\n" +
    "airflow scheduler\n" +
    "# scheduler-b (different host/pod)\n" +
    "airflow scheduler\n" +
    "\n" +
    "# Helm: just scale the replica count\n" +
    "#   scheduler:\n" +
    "#     replicas: 2\n" +
    "#   triggerer:\n" +
    "#     replicas: 2";

  var CODE_DB =
    "# airflow.cfg — point components at PgBouncer, not Postgres\n" +
    "[database]\n" +
    "sql_alchemy_conn = postgresql+psycopg2://" +
    "airflow@pgbouncer:6432/airflow\n" +
    "sql_alchemy_pool_size    = 5\n" +
    "sql_alchemy_max_overflow = 10\n" +
    "\n" +
    "# PgBouncer (transaction pooling)\n" +
    "#   pool_mode = transaction\n" +
    "#   max_client_conn = 1000\n" +
    "#   default_pool_size = 25";

  var module = {
    id: "ha-setup",
    title: "High Availability",
    fullWidth: true,
    _engine: null, _controls: null, _diagram: null, _off: null,

    render: function (container) {
      container.innerHTML =
        '<div class="module-header animate-fade-in-up">' +
          '<div class="module-eyebrow">Apache Airflow · Deployment</div>' +
          '<h1 class="module-title">High availability: no single point of failure</h1>' +
          '<p class="module-subtitle">A resilient Airflow runs every tier redundantly — load-balanced API servers, active-active schedulers, ' +
          "an autoscaled worker fleet, and an HA metadata DB fronted by PgBouncer. Any one node can die with zero downtime.</p>" +
        "</div>" +
        '<div class="arch-layout">' +
          '<div class="arch-canvas" id="ha-canvas"></div>' +
          '<aside class="arch-detail" id="ha-detail"></aside>' +
        "</div>" +
        '<div class="arch-controls" id="ha-controls"></div>' +
        '<section class="section" style="margin-top:var(--space-10)">' +
          '<div class="two-col-code" id="ha-codes"></div>' +
        "</section>" +
        '<section class="section">' +
          '<div class="callout tip"><span class="callout-icon">🏗️</span><div class="callout-body">' +
          "<b>The metadata DB is the crown jewel.</b> Schedulers, workers, and API servers are all recreatable and stateless. Spend your reliability budget on an HA, backed-up Postgres — losing it loses your entire operational state.</div></div>" +
          '<div class="callout info"><span class="badge badge-v3">3.x</span><div class="callout-body">' +
          "<b>Task Execution API:</b> Airflow 3 routes worker↔metadata traffic through the API server instead of direct DB access, so workers no longer need database credentials — a cleaner, more secure HA boundary.</div></div>" +
        "</section>";

      var diagram = AV.ArchDiagram.create({
        nodes: NODES, edges: EDGES, viewBox: "0 0 700 490", onSelect: function () {}
      });
      container.querySelector("#ha-canvas").appendChild(diagram.el);
      this._diagram = diagram;

      var detail = container.querySelector("#ha-detail");
      function defaultDetail() {
        detail.innerHTML =
          '<div class="arch-detail-title">Redundant at every tier</div>' +
          "<p>Press play to build the topology from the top down — load balancer, schedulers, workers, connection pooler, and an HA database.</p>" +
          '<div class="callout tip" style="margin-top:var(--space-4)"><span class="callout-icon">♻️</span>' +
          '<div class="callout-body">Active-active schedulers need <b>no</b> special config — just run more than one. DB row-locking does the coordination for you.</div></div>';
      }
      function showStep(idx) {
        if (idx < 0) { defaultDetail(); return; }
        var s = STEPS[idx];
        detail.innerHTML = '<div class="arch-detail-title">' + s.label + "</div><p>" + s.desc + "</p>";
      }

      var codes = container.querySelector("#ha-codes");
      var a = document.createElement("div"); a.className = "two-col-code-item";
      a.appendChild(AV.CodeViewer.create({ title: "active-active schedulers", lang: "bash", code: CODE_SCHED }));
      var b = document.createElement("div"); b.className = "two-col-code-item";
      b.appendChild(AV.CodeViewer.create({ title: "route through PgBouncer", lang: "bash", code: CODE_DB }));
      codes.appendChild(a); codes.appendChild(b);

      var engine = new AV.AnimationEngine({
        steps: STEPS.map(function (s) { return { label: s.label, duration: 2900 }; }), speed: 1
      });
      this._engine = engine;
      this._off = engine.on("stepchange", function (idx) {
        if (idx < 0) { diagram.clear(); showStep(-1); return; }
        diagram.setActive(STEPS[idx].nodes, STEPS[idx].edges);
        showStep(idx);
      });
      var controls = AV.AnimationControls.create(engine, { title: "Ready — press play" });
      container.querySelector("#ha-controls").appendChild(controls.el);
      this._controls = controls;
      defaultDetail();
    },

    destroy: function () {
      if (this._off) { this._off(); this._off = null; }
      if (this._controls) { this._controls.destroy(); this._controls = null; }
      if (this._engine) { this._engine.destroy(); this._engine = null; }
      if (this._diagram) { this._diagram.destroy(); this._diagram = null; }
    }
  };

  AV.registerModule(module);
})();
