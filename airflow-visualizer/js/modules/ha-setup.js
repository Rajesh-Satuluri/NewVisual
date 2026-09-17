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
      what: "API servers (UI + REST) are <b>stateless</b>, so you run several behind a load balancer with health checks on <code>/health</code>. Any instance can serve any request.",
      why: "Statelessness means no session is pinned to a box — losing one instance drops zero traffic. The LB simply stops routing to an unhealthy node.",
      how: "Deploy N API servers, put an L7 load balancer in front, and health-check <code>/health</code>. Terminate TLS at the LB and spread requests across the pool.",
      when: "Always, in any production deployment where the UI/API must stay up.",
      mistake: "Running a single API server and treating it as critical — an unnecessary single point of failure for something trivially replicable.",
      interview: "“How do you make the Airflow UI highly available?” Stateless API servers behind a health-checked load balancer — an easy win that shows you know which tiers are stateless.",
      example: "When one of ShopKart's three API pods is recycled during a deploy, analysts notice nothing — the LB routes around it instantly."
    },
    {
      nodes: ["sched"], edges: [],
      label: "2 · Run schedulers active-active",
      what: "Since Airflow 2.0 you can run <b>multiple schedulers simultaneously</b>, all active. There's no primary/standby and no leader election.",
      why: "The scheduler is the beating heart — a single one is a single point of failure for <i>all</i> scheduling. Active-active removes that risk and adds throughput at the same time.",
      how: "They coordinate through the metadata DB using <code>SELECT … FOR UPDATE SKIP LOCKED</code> row locks, so each scheduler grabs different task instances. If one dies, the others keep scheduling with zero downtime.",
      when: "Any production cluster — run at least two, on different nodes or pods.",
      mistake: "Assuming HA schedulers need special config or a coordinator (ZooKeeper, etcd). They need none — just run more than one against the same DB.",
      interview: "A favorite: “how do two schedulers avoid double-scheduling the same task?” Row-level DB locks with <code>SKIP LOCKED</code>, no external coordinator. Nail that and you sound senior.",
      example: "ShopKart runs two schedulers; a node failure at 02:15 takes one out and the nightly run never even pauses."
    },
    {
      nodes: ["workers", "trig"], edges: [],
      label: "3 · Scale workers and triggerers horizontally",
      what: "The <b>worker fleet</b> (Celery or Kubernetes) scales out for throughput, and <b>triggerers</b> handle deferrable-operator waits on an async event loop.",
      why: "Workers are where the actual work happens, so throughput scales with worker count. Triggerers must be redundant too, or a triggerer restart drops every long-running sensor wait.",
      how: "Autoscale workers on queue depth; run <b>2+ triggerers</b> so deferred tasks survive a restart. Both tiers are horizontally scalable and stateless between tasks.",
      when: "When task volume grows, or when you rely on deferrable sensors/operators that wait for hours.",
      mistake: "Running a single triggerer — a restart there silently strands every deferred task waiting on it until it comes back.",
      interview: "It shows depth to mention the triggerer as an HA concern, not just workers. Deferrable waits need redundancy just like scheduling does.",
      example: "ShopKart autoscales Celery workers on Black Friday and runs two triggerers so its 2–6&nbsp;AM inventory sensors keep waiting through a rolling deploy."
    },
    {
      nodes: ["api", "sched", "trig", "workers", "pgb"], edges: [["api", "pgb"], ["sched", "pgb"], ["trig", "pgb"], ["workers", "pgb"]],
      label: "4 · Pool DB connections through PgBouncer",
      what: "Every component opens DB sessions, and at scale that overwhelms Postgres's <code>max_connections</code>. <b>PgBouncer</b> multiplexes hundreds of client connections onto a small server pool.",
      why: "Postgres connections are expensive; hundreds of direct clients exhaust the server. PgBouncer is the single most important HA component for a busy cluster because it keeps the DB from tipping over.",
      how: "Point every component's <code>sql_alchemy_conn</code> at PgBouncer (transaction pooling), keep per-component pools small, and let PgBouncer front the real database. Hundreds of clients collapse to a couple dozen server connections.",
      when: "As soon as combined connections (schedulers × workers × concurrency) approach the DB's limit.",
      mistake: "Scaling workers and schedulers without pooling, then hitting “FATAL: sorry, too many clients already” at peak load.",
      interview: "“Your Postgres is out of connections under load — what do you add?” PgBouncer in transaction mode. Knowing why (connection multiplexing) is the senior detail.",
      example: "ShopKart's 16 workers × 16 concurrency plus schedulers would open ~300 connections; PgBouncer collapses them onto 25 server connections."
    },
    {
      nodes: ["pgb", "db"], edges: [["pgb", "db"]],
      label: "5 · Make the metadata DB itself HA",
      what: "The metadata DB is the <b>one true stateful dependency</b>. Use managed HA Postgres with a <b>primary + synchronous standby</b> and automatic failover.",
      why: "Everything else — schedulers, workers, API servers — is recreatable and stateless. The database holds all operational state, so it's the thing you must not lose.",
      how: "Run RDS Multi-AZ, Cloud SQL HA, or Patroni with a synchronous replica and automatic failover. Back it up, test restores, and put your reliability budget here.",
      when: "Every production deployment — this tier is non-negotiable for HA.",
      mistake: "Investing in redundant schedulers and workers while running a single, unreplicated Postgres — the one stateful component becomes your single point of failure.",
      interview: "“If you could only make one tier HA, which?” The metadata DB. Explaining that the rest is stateless and recreatable proves you understand the architecture.",
      example: "ShopKart runs RDS Multi-AZ; an AZ outage triggers automatic failover to the standby and the cluster resumes against the promoted primary."
    },
    {
      nodes: ["lb", "api", "sched", "trig", "workers", "pgb", "db"], edges: EDGES,
      label: "6 · The full resilient topology",
      what: "Put together: an LB-fronted stateless API tier, 2+ active-active schedulers, an autoscaled worker fleet, redundant triggerers, PgBouncer, and an HA Postgres.",
      why: "Each tier independently tolerates losing a node with no manual intervention. Composed, they give you a cluster with no single point of failure — the reference production deployment.",
      how: "Every tier is either stateless-and-replicated (API, scheduler, worker, triggerer) or explicitly made HA (the DB, fronted by PgBouncer). Failure of any one node is absorbed automatically.",
      when: "The target architecture for any business-critical Airflow.",
      mistake: "Making four tiers redundant but forgetting one — a lone triggerer or an unpooled DB quietly reintroduces a single point of failure.",
      interview: "Being able to sketch this whole topology, and say which parts are stateless vs stateful, is exactly the “design a production Airflow” system-design question.",
      example: "ShopKart's production diagram matches this exactly, and its quarterly game-day kills one node per tier to prove nothing goes down."
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
        detail.innerHTML = AV.Explain.render(s);
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
