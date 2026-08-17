/* ============================================================
   modules/business-scenario.js — E-commerce Daily Sales & Ops
   The flagship "why Airflow" story: one nightly pipeline shown
   three ways (Business / System / Airflow), an animated run,
   two realistic failure scenarios, and a per-task inspector.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  // ── The pipeline: 13 tasks, two lanes converging at load_warehouse ──
  var TASKS = [
    { id: "extract_orders",     x: 15,  y: 15,  w: 158, h: 50, color: "cyan",
      biz: ["Get orders", "Sales"],        sys: ["E-commerce DB", "orders + items"], af: ["extract_orders", "Python · r2"],
      meaning: "Pull all of yesterday's customer orders and line items.",
      system: "E-commerce application DB", owner: "data-eng", retries: "2 · 3 min delay", exec: "~4 min",
      up: [], down: ["validate_data"] },
    { id: "extract_payments",   x: 15,  y: 78,  w: 158, h: 50, color: "purple",
      biz: ["Get payments", "Finance"],    sys: ["Payment API", "charges/refunds"], af: ["extract_payments", "Python · r3 backoff"],
      meaning: "Retrieve successful payments, failures, refunds, and chargebacks.",
      system: "Payment platform API", owner: "payments-eng", retries: "3 · exponential backoff", exec: "~6 min",
      up: [], down: ["validate_data"] },
    { id: "extract_marketing",  x: 15,  y: 141, w: 158, h: 50, color: "airflow",
      biz: ["Get marketing", "Growth"],    sys: ["Marketing APIs", "spend/conv."], af: ["extract_marketing", "Python · mapped"],
      meaning: "Pull campaign spend, clicks, and conversion metrics from ad platforms.",
      system: "Google / Meta / TikTok Ads", owner: "marketing-eng", retries: "2 · 3 min delay", exec: "~5 min",
      up: [], down: ["validate_data"] },
    { id: "extract_inventory",  x: 15,  y: 320, w: 158, h: 50, color: "orange",
      biz: ["Get stock", "Operations"],    sys: ["Warehouse", "stock/fulfil"], af: ["extract_inventory", "Python · SLA 3h"],
      meaning: "Retrieve inventory levels and warehouse fulfillment data.",
      system: "Inventory / Warehouse system", owner: "ops-eng", retries: "2 · 3 min delay", exec: "~4 min",
      up: [], down: ["validate_inventory"] },
    { id: "validate_data",      x: 200, y: 78,  w: 158, h: 50, color: "yellow",
      biz: ["Check quality", "Trust gate"], sys: ["Data checks", "completeness"], af: ["validate_data", "Python · r1"],
      meaning: "Check for missing orders, duplicate transactions, and invalid payments before anything downstream runs.",
      system: "Airflow data-quality checks", owner: "data-eng", retries: "1 · 2 min delay", exec: "~2 min",
      up: ["extract_orders", "extract_payments", "extract_marketing"], down: ["reconcile_payments"] },
    { id: "validate_inventory", x: 200, y: 320, w: 158, h: 50, color: "yellow",
      biz: ["Check stock data", "Trust gate"], sys: ["Data checks", "freshness"], af: ["validate_inventory", "ShortCircuit"],
      meaning: "Confirm the warehouse export actually landed and is complete before computing inventory metrics.",
      system: "Airflow data-quality checks", owner: "ops-eng", retries: "1 · 2 min delay", exec: "~1 min",
      up: ["extract_inventory"], down: ["inventory_metrics"] },
    { id: "reconcile_payments", x: 385, y: 78,  w: 158, h: 50, color: "green",
      biz: ["Match payments", "Finance"],  sys: ["Payment API", "orders↔pays"], af: ["reconcile_payments", "Python · r2"],
      meaning: "Ensure every paid order has a matching payment; calculate net sales after refunds.",
      system: "Payment platform + orders", owner: "data-eng", retries: "2 · 5 min delay", exec: "~5 min",
      up: ["validate_data"], down: ["transform_sales"] },
    { id: "inventory_metrics",  x: 385, y: 320, w: 158, h: 50, color: "orange",
      biz: ["Stock movement", "Operations"], sys: ["Warehouse", "turnover"], af: ["inventory_metrics", "Python · r2"],
      meaning: "Calculate inventory movement and flag low-stock high-sellers.",
      system: "Warehouse data", owner: "ops-eng", retries: "2 · 5 min delay", exec: "~3 min",
      up: ["validate_inventory"], down: ["load_warehouse"] },
    { id: "transform_sales",    x: 570, y: 78,  w: 158, h: 50, color: "green",
      biz: ["Net sales", "Analytics"],     sys: ["CRM + sales", "join"], af: ["transform_sales", "Python · r2"],
      meaning: "Join sales with customer (CRM) and marketing data; compute product-level sales.",
      system: "CRM + marketing + sales", owner: "analytics-eng", retries: "2 · 5 min delay", exec: "~7 min",
      up: ["reconcile_payments"], down: ["load_warehouse"] },
    { id: "load_warehouse",     x: 730, y: 60,  w: 158, h: 50, color: "purple",
      biz: ["Load warehouse", "Analytics"], sys: ["Data Warehouse", "cleaned data"], af: ["load_warehouse", "pool=warehouse_db"],
      meaning: "Store the cleaned datasets in the company's analytics warehouse.",
      system: "Data warehouse (Snowflake)", owner: "data-platform", retries: "2 · 5 min delay", exec: "~8 min",
      up: ["transform_sales", "inventory_metrics"], down: ["update_kpis"] },
    { id: "update_kpis",        x: 730, y: 140, w: 158, h: 50, color: "airflow",
      biz: ["Business KPIs", "Analytics"], sys: ["Data Warehouse", "metrics"], af: ["update_kpis", "Python · r2"],
      meaning: "Calculate revenue, orders, AOV, refund rate, conversion rate, and inventory turnover.",
      system: "Data warehouse", owner: "analytics-eng", retries: "2 · 5 min delay", exec: "~3 min",
      up: ["load_warehouse"], down: ["refresh_dashboard"] },
    { id: "refresh_dashboard",  x: 730, y: 220, w: 158, h: 50, color: "cyan",
      biz: ["Refresh dashboard", "Leadership"], sys: ["BI dashboard", "publish"], af: ["refresh_dashboard", "Python · r3"],
      meaning: "Make the latest numbers available to executives and business teams.",
      system: "BI dashboard (Tableau/Looker)", owner: "analytics-eng", retries: "3 · 2 min delay", exec: "~2 min",
      up: ["update_kpis"], down: ["send_alerts"] },
    { id: "send_alerts",        x: 730, y: 300, w: 158, h: 50, color: "red",
      biz: ["Send alerts", "All teams"],   sys: ["Alerting", "route"], af: ["send_alerts", "Branch"],
      meaning: "If revenue drops, payment failures spike, or a high-seller runs low, notify the right team.",
      system: "Alerting (Slack / PagerDuty)", owner: "data-eng", retries: "1 · no delay", exec: "~1 min",
      up: ["refresh_dashboard"], down: [] }
  ];
  var BY_ID = {}; TASKS.forEach(function (t) { BY_ID[t.id] = t; });

  var EDGES = [
    ["extract_orders", "validate_data"], ["extract_payments", "validate_data"], ["extract_marketing", "validate_data"],
    ["validate_data", "reconcile_payments"], ["reconcile_payments", "transform_sales"], ["transform_sales", "load_warehouse"],
    ["extract_inventory", "validate_inventory"], ["validate_inventory", "inventory_metrics"], ["inventory_metrics", "load_warehouse"],
    ["load_warehouse", "update_kpis"], ["update_kpis", "refresh_dashboard"], ["refresh_dashboard", "send_alerts"]
  ];

  // ── Step sequences per mode. Each step SETS state deltas + logs. ──
  var MODES = {
    run: {
      label: "🌙 Nightly run", legend: "success",
      steps: [
        { title: "02:00 — Airflow wakes up", set: {}, log: ["02:00 · scheduler · DAG run created for 2024-01-15"],
          biz: "It's 2 AM. Airflow starts ShopKart's daily pipeline for yesterday's business — while everyone sleeps.",
          sys: "The scheduler creates one DAG run. No source system has been touched yet.",
          af: "Scheduler creates the DagRun; all tasks sit in <b>scheduled</b> awaiting their dependencies." },
        { title: "Extract from every source", set: { extract_orders: "running", extract_payments: "running", extract_marketing: "running", extract_inventory: "running" },
          log: ["02:01 · executor · 4 extracts dispatched in parallel"],
          biz: "Pull yesterday's orders, payments, marketing, and stock — all at the same time.",
          sys: "E-commerce DB, Payment API, Marketing APIs, and the Warehouse are queried in parallel.",
          af: "Four independent extract tasks run concurrently on separate workers." },
        { title: "Extracts done → validate", set: { extract_orders: "success", extract_payments: "success", extract_marketing: "success", extract_inventory: "success", validate_data: "running", validate_inventory: "running" },
          log: ["02:07 · data-eng · all extracts complete", "02:07 · executor · validation started"],
          biz: "Before trusting anything, make sure the data is complete and clean.",
          sys: "Data-quality checks run over the freshly pulled datasets.",
          af: "validate_data (fan-in of three extracts) and validate_inventory run." },
        { title: "Reconcile & measure stock", set: { validate_data: "success", validate_inventory: "success", reconcile_payments: "running", inventory_metrics: "running" },
          log: ["02:09 · data-eng · validation passed"],
          biz: "Match every order to a payment; measure how stock moved.",
          sys: "Payment data is matched to orders; warehouse movement is computed.",
          af: "reconcile_payments and inventory_metrics run in their two parallel lanes." },
        { title: "Calculate net sales", set: { reconcile_payments: "success", inventory_metrics: "success", transform_sales: "running" },
          log: ["02:14 · data-eng · payments reconciled — 3 mismatches flagged"],
          biz: "Work out the company's actual net sales after refunds.",
          sys: "Sales joined with CRM and marketing for product-level performance.",
          af: "transform_sales runs; the inventory lane is already complete." },
        { title: "Load the warehouse", set: { transform_sales: "success", load_warehouse: "running" },
          log: ["02:21 · executor · both lanes ready → load_warehouse"],
          biz: "Make the cleaned data available for company-wide analytics.",
          sys: "Cleaned datasets are written to the analytics data warehouse.",
          af: "load_warehouse runs — both upstream lanes succeeded — under pool=warehouse_db." },
        { title: "Update business KPIs", set: { load_warehouse: "success", update_kpis: "running" },
          log: ["02:29 · analytics · warehouse loaded"],
          biz: "Turn raw data into the numbers leadership actually cares about.",
          sys: "Revenue, AOV, refund rate, conversion, and inventory turnover are computed.",
          af: "update_kpis runs against the freshly loaded warehouse." },
        { title: "Refresh the dashboard", set: { update_kpis: "success", refresh_dashboard: "running" },
          log: ["02:32 · analytics · KPIs updated"],
          biz: "Push the latest numbers to the executive dashboard.",
          sys: "The BI dashboard is refreshed with yesterday's results.",
          af: "refresh_dashboard runs; alerting waits downstream." },
        { title: "07:00 — the COO opens the dashboard", set: { refresh_dashboard: "success", send_alerts: "running" },
          log: ["02:34 · dashboard · refreshed", "07:00 · COO · opens the sales dashboard ✅"],
          biz: "The COO sees yesterday's performance — on time, complete, and trustworthy.",
          sys: "Every system's data now sits behind a single dashboard.",
          af: "refresh_dashboard succeeded; send_alerts evaluates the alert thresholds." },
        { title: "Alerts sent → pipeline complete", set: { send_alerts: "success" },
          log: ["02:34 · alerts · revenue normal · 1 low-stock warning → ops"],
          biz: "If anything looked wrong, the right team already knows before they log in.",
          sys: "Alerts routed to finance, ops, and marketing as needed.",
          af: "send_alerts (branching) completed; every task instance is success." }
      ]
    },
    payfail: {
      label: "💳 Payment API fails", legend: "failed",
      steps: [
        { title: "02:00 — run starts", set: {}, log: ["02:00 · scheduler · DAG run created"],
          biz: "The nightly run begins exactly as it does every night.", sys: "The scheduler creates the run.", af: "DagRun created; tasks scheduled." },
        { title: "Extracts run", set: { extract_orders: "running", extract_payments: "running", extract_marketing: "running", extract_inventory: "running" },
          log: ["02:01 · executor · extracts dispatched"],
          biz: "Pulling all four sources in parallel.", sys: "All source systems are queried.", af: "Four extracts running." },
        { title: "Payment API returns 503", set: { extract_orders: "success", extract_marketing: "success", extract_inventory: "success", extract_payments: "failed" },
          log: ["02:04 · payment_api · HTTP 503 Service Unavailable", "02:04 · airflow · extract_payments failed (try 1/4)"],
          biz: "The payment provider is briefly down — one source didn't come back.",
          sys: "The Payment platform is unreachable; the other three systems returned fine.",
          af: "extract_payments raised an exception → marked <b>failed</b>, try_number=1." },
        { title: "Airflow retries automatically", set: { extract_payments: "up-for-retry" },
          log: ["02:04 · scheduler · up_for_retry — waiting 4 min (exp backoff)"],
          biz: "Airflow doesn't give up on a blip — it waits and tries again on its own.",
          sys: "No human is involved yet; the payment system will be retried after a delay.",
          af: "try ≤ retries → <b>up_for_retry</b>; retry_delay grows with exponential backoff." },
        { title: "Downstream blocked · team alerted", set: { extract_payments: "running", validate_data: "blocked", reconcile_payments: "blocked", transform_sales: "blocked", load_warehouse: "blocked", update_kpis: "blocked", refresh_dashboard: "blocked", send_alerts: "blocked", validate_inventory: "running" },
          log: ["02:08 · scheduler · retry 2 dispatched", "02:08 · airflow · sales branch blocked until payments arrive", "02:08 · alert · on_failure_callback → payments-eng + data-eng"],
          biz: "Sales numbers can't be trusted without payments, so that whole branch pauses — and on-call is paged.",
          sys: "The payment-dependent work waits; the independent inventory branch keeps running.",
          af: "Everything downstream of extract_payments is upstream-blocked. on_failure_callback already alerted. The inventory lane is unaffected." },
        { title: "Retry succeeds", set: { extract_payments: "success", validate_inventory: "success", inventory_metrics: "success" },
          log: ["02:09 · payment_api · 200 OK", "02:09 · airflow · extract_payments success (try 2)"],
          biz: "The payment provider recovers; the missing data finally arrives.",
          sys: "The Payment platform responds; payments data is now in hand.",
          af: "extract_payments succeeds on retry 2; blocked tasks become runnable again." },
        { title: "Blocked work resumes", set: { validate_data: "running" },
          log: ["02:10 · executor · validate_data running — pipeline resumes"],
          biz: "With payments in, the sales branch picks up right where it paused.",
          sys: "Reconciliation and the downstream analytics proceed.",
          af: "Cleared dependencies → validate_data runs; the rest of the lane follows." },
        { title: "Complete — minutes late, not a day", set: { validate_data: "success", reconcile_payments: "success", transform_sales: "success", load_warehouse: "success", update_kpis: "success", refresh_dashboard: "success", send_alerts: "success" },
          log: ["02:41 · dashboard · refreshed", "07:00 · COO · dashboard is complete ✅"],
          biz: "The dashboard is still ready by 7 AM. The outage cost a few minutes — not the morning.",
          sys: "Every system's data made it through in the end.",
          af: "All tasks success; the automatic retry absorbed the outage with no human intervention." }
      ]
    },
    invlate: {
      label: "📦 Inventory arrives late", legend: "skipped",
      steps: [
        { title: "02:00 — run starts", set: {}, log: ["02:00 · scheduler · DAG run created"],
          biz: "The nightly run begins.", sys: "The scheduler creates the run.", af: "DagRun created; tasks scheduled." },
        { title: "Extracts run", set: { extract_orders: "running", extract_payments: "running", extract_marketing: "running", extract_inventory: "running" },
          log: ["02:01 · executor · extracts dispatched"],
          biz: "Pulling all four sources.", sys: "All source systems are queried.", af: "Four extracts running." },
        { title: "Stock export hasn't landed", set: { extract_orders: "success", extract_payments: "success", extract_marketing: "success", extract_inventory: "success", validate_data: "running", validate_inventory: "running" },
          log: ["02:06 · warehouse · nightly stock export not yet delivered"],
          biz: "Three sources are in — but the warehouse hasn't sent stock data yet.",
          sys: "The warehouse export is running late; the other systems are fine.",
          af: "validate_data runs; validate_inventory checks whether the export exists." },
        { title: "Validation holds the stock branch", set: { validate_data: "success", validate_inventory: "skipped", inventory_metrics: "skipped" },
          log: ["02:06 · validate_inventory · expected export missing → short-circuit", "02:06 · airflow · inventory_metrics skipped for now"],
          biz: "The quality gate catches the missing data and holds back the stock numbers — better late than wrong.",
          sys: "Inventory metrics do NOT run; no incomplete stock figures reach the dashboard.",
          af: "validate_inventory (ShortCircuitOperator) stops its branch; inventory_metrics is skipped." },
        { title: "Independent branch keeps going", set: { reconcile_payments: "running" },
          log: ["02:07 · data-eng · sales branch proceeds independently"],
          biz: "Sales, payments, and marketing don't need stock data — so that work simply continues.",
          sys: "Payment reconciliation and sales transforms proceed normally.",
          af: "The sales lane has no dependency on the inventory lane, so it runs unaffected." },
        { title: "Sales ready, load waits", set: { reconcile_payments: "success", transform_sales: "success", load_warehouse: "blocked" },
          log: ["02:20 · data-eng · sales branch ready", "02:20 · scheduler · load_warehouse waiting on inventory_metrics"],
          biz: "The sales numbers are ready; the full warehouse load waits for the last missing piece.",
          sys: "The warehouse load pauses until inventory metrics exist.",
          af: "load_warehouse depends on BOTH lanes → it waits (inventory not yet done)." },
        { title: "05:10 — inventory finally arrives", set: { validate_inventory: "running" },
          log: ["05:10 · warehouse · stock export delivered", "05:10 · sensor · dependency satisfied → branch resumes"],
          biz: "The warehouse finally sends the file; the paused branch wakes up.",
          sys: "Inventory data lands hours late; its branch can resume.",
          af: "validate_inventory re-runs (or a rescheduled sensor releases) and now passes." },
        { title: "Inventory branch finishes", set: { validate_inventory: "success", inventory_metrics: "running" },
          log: ["05:11 · executor · inventory_metrics running"],
          biz: "Now the stock-movement numbers can be computed correctly.",
          sys: "Warehouse metrics are calculated on complete data.",
          af: "inventory_metrics runs now that its input actually exists." },
        { title: "Full pipeline completes", set: { inventory_metrics: "success", load_warehouse: "success", update_kpis: "success", refresh_dashboard: "success", send_alerts: "success" },
          log: ["05:20 · dashboard · fully refreshed with inventory ✅"],
          biz: "The dashboard is complete — sales were on time, inventory caught up when its data allowed. Correctness over punctuality.",
          sys: "Every system is represented; nothing was ever reported on incomplete data.",
          af: "Both lanes success → load_warehouse and the tail complete." }
      ]
    }
  };
  var MODE_ORDER = ["run", "payfail", "invlate"];

  var CODE =
    "from airflow import DAG\n" +
    "from airflow.operators.python import PythonOperator, ShortCircuitOperator\n" +
    "from datetime import datetime, timedelta\n" +
    "\n" +
    "default_args = {\n" +
    "    'owner': 'data-eng',\n" +
    "    'retries': 2,\n" +
    "    'retry_delay': timedelta(minutes=5),\n" +
    "    'on_failure_callback': alert_owning_team,   # routes to the right team\n" +
    "}\n" +
    "\n" +
    "with DAG('ecommerce_daily_ops',\n" +
    "         schedule='0 2 * * *',            # every day at 02:00\n" +
    "         start_date=datetime(2024, 1, 1),\n" +
    "         catchup=False,\n" +
    "         default_args=default_args) as dag:\n" +
    "\n" +
    "    orders    = PythonOperator(task_id='extract_orders',    python_callable=pull_orders)\n" +
    "    payments  = PythonOperator(task_id='extract_payments',  python_callable=pull_payments,\n" +
    "                               retries=3, retry_exponential_backoff=True)\n" +
    "    marketing = PythonOperator(task_id='extract_marketing', python_callable=pull_marketing)\n" +
    "    inventory = PythonOperator(task_id='extract_inventory', python_callable=pull_inventory,\n" +
    "                               sla=timedelta(hours=3))\n" +
    "\n" +
    "    validate      = PythonOperator(task_id='validate_data',      python_callable=validate)\n" +
    "    validate_inv  = ShortCircuitOperator(task_id='validate_inventory', python_callable=inv_present)\n" +
    "    reconcile     = PythonOperator(task_id='reconcile_payments', python_callable=reconcile)\n" +
    "    transform     = PythonOperator(task_id='transform_sales',    python_callable=transform)\n" +
    "    inv_metrics   = PythonOperator(task_id='inventory_metrics',  python_callable=inv_metrics)\n" +
    "    load          = PythonOperator(task_id='load_warehouse',     python_callable=load, pool='warehouse_db')\n" +
    "    kpis          = PythonOperator(task_id='update_kpis',        python_callable=update_kpis)\n" +
    "    dashboard     = PythonOperator(task_id='refresh_dashboard',  python_callable=refresh, retries=3)\n" +
    "    alerts        = PythonOperator(task_id='send_alerts',        python_callable=route_alerts)\n" +
    "\n" +
    "    # Sales lane\n" +
    "    [orders, payments, marketing] >> validate >> reconcile >> transform\n" +
    "    # Inventory lane (independent until the warehouse load)\n" +
    "    inventory >> validate_inv >> inv_metrics\n" +
    "    # Both lanes converge, then KPIs → dashboard → alerts\n" +
    "    [transform, inv_metrics] >> load >> kpis >> dashboard >> alerts";

  // Fold step deltas into a full state snapshot at index idx.
  function snapshotAt(mode, idx) {
    var st = {};
    TASKS.forEach(function (t) { st[t.id] = "scheduled"; });
    for (var i = 0; i <= idx; i++) {
      var set = MODES[mode].steps[i].set;
      Object.keys(set).forEach(function (k) { st[k] = set[k]; });
    }
    return st;
  }
  function logsAt(mode, idx) {
    var out = [];
    for (var i = 0; i <= idx; i++) out = out.concat(MODES[mode].steps[i].log || []);
    return out;
  }

  var module = {
    id: "business-scenario",
    title: "Business Scenario: E-commerce Pipeline",
    fullWidth: true,
    _engine: null, _controls: null, _off: null, _diagram: null,
    _view: "business", _mode: "run", _idx: -1, _inspecting: null, _root: null, _clicks: null,

    render: function (container) {
      var self = this;
      this._view = "business"; this._mode = "run"; this._idx = -1; this._inspecting = null;

      container.innerHTML =
        '<div class="module-header animate-fade-in-up">' +
          '<div class="module-eyebrow">Apache Airflow · Why it matters</div>' +
          '<h1 class="module-title">It\'s 7:00 AM. The COO opens the sales dashboard.</h1>' +
          '<p class="module-subtitle">They expect to see <b>yesterday\'s</b> revenue, orders, refunds, inventory, and marketing — all in one place. ' +
          "That dashboard is ready only because, at 2 AM, Apache Airflow orchestrated a pipeline across seven systems. Let's work backward through it.</p>" +
        "</div>" +
        '<div class="callout info biz-role"><span class="callout-icon">🧭</span><div class="callout-body">' +
          "<b>Airflow\'s job is orchestration, not the business logic.</b> It doesn\'t calculate revenue or talk to customers. It decides <i>when</i> each task runs, <i>what</i> it depends on, <i>what happens when it fails</i>, and <i>how work moves</i> across the e-commerce DB, payment platform, warehouse, CRM, marketing APIs, data warehouse, and BI dashboard.</div></div>" +
        // View toggle
        '<div class="biz-controls-row">' +
          '<div class="biz-views" id="biz-views">' +
            '<span class="biz-views-label">View as:</span>' +
            '<button class="biz-view-btn active" data-view="business">🧑‍💼 Business</button>' +
            '<button class="biz-view-btn" data-view="system">🖥️ Systems</button>' +
            '<button class="biz-view-btn" data-view="airflow">⚙️ Airflow</button>' +
          "</div>" +
          '<div class="biz-modes" id="biz-modes">' +
            MODE_ORDER.map(function (m, i) {
              return '<button class="biz-mode-btn' + (i === 0 ? " active" : "") + '" data-mode="' + m + '">' + MODES[m].label + "</button>";
            }).join("") +
          "</div>" +
        "</div>" +
        '<div class="arch-layout">' +
          '<div class="arch-canvas" id="biz-canvas"></div>' +
          '<aside class="arch-detail" id="biz-detail"></aside>' +
        "</div>" +
        '<div class="arch-controls" id="biz-controls"></div>' +
        '<section class="section" style="margin-top:var(--space-10)">' +
          '<h2 class="section-title">The DAG underneath the story</h2>' +
          '<p class="section-lead">Non-technical readers can stop at the animation above. For engineers, here is the actual Airflow DAG that produces everything you just watched.</p>' +
          '<div id="biz-code"></div>' +
        "</section>" +
        '<section class="section">' +
          '<div class="callout tip"><span class="callout-icon">💡</span><div class="callout-body">' +
          "<b>Why not just a cron job + one big script?</b> Because a script can\'t retry only the payment step, run the four extracts in parallel, hold back inventory while letting sales through, alert the right team, or show you exactly which step failed at 2:13 AM. That coordination — across systems and failures — is what Airflow gives ShopKart.</div></div>" +
        "</section>";

      var diagram = AV.ArchDiagram.create({
        nodes: TASKS.map(function (t) {
          return { id: t.id, label: t.af[0], sub: t.af[1], x: t.x, y: t.y, w: t.w, h: t.h, color: t.color };
        }),
        edges: EDGES, viewBox: "0 0 905 388",
        onSelect: function (id) { self._inspecting = id; renderInspector(id); }
      });
      container.querySelector("#biz-canvas").appendChild(diagram.el);
      this._diagram = diagram;

      var detail = container.querySelector("#biz-detail");

      // ── State + label painting ────────────────────────────
      function paintStates(states) {
        var CLASSES = ["is-scheduled", "is-running", "is-success", "is-failed", "is-retry", "is-blocked", "is-skipped"];
        TASKS.forEach(function (t) {
          var g = diagram.el.querySelector('[data-id="' + t.id + '"]');
          if (!g) return;
          CLASSES.forEach(function (c) { g.classList.remove(c); });
          var s = states[t.id] || "scheduled";
          g.classList.add("is-" + (s === "up-for-retry" ? "retry" : s));
        });
        // Highlight edges whose upstream has completed.
        EDGES.forEach(function (e) {
          var line = diagram.el.querySelector('[data-edge="' + e[0] + "→" + e[1] + '"]');
          if (!line) return;
          var up = states[e[0]], dn = states[e[1]];
          var on = up === "success" && (dn === "running" || dn === "success");
          line.classList.toggle("active", on);
          line.classList.toggle("flow-line", on);
        });
      }

      function applyView(view) {
        TASKS.forEach(function (t) {
          var g = diagram.el.querySelector('[data-id="' + t.id + '"]');
          if (!g) return;
          var lab = g.querySelector(".node-label"), sub = g.querySelector(".node-sub");
          var pair = view === "business" ? t.biz : view === "system" ? t.sys : t.af;
          if (lab) lab.textContent = pair[0];
          if (sub) sub.textContent = pair[1];
        });
      }

      // ── Detail / event-log rendering ──────────────────────
      function stateChip(s) {
        var label = s === "up-for-retry" ? "up-for-retry" : s;
        var cls = s === "blocked" ? "queued" : s === "scheduled" ? "scheduled" : s;
        return '<span class="state-chip ' + cls + '">' + label + "</span>";
      }

      function renderDetail(idx) {
        self._inspecting = null;
        var mode = MODES[self._mode];
        if (idx < 0) {
          detail.innerHTML =
            '<div class="arch-detail-title">' + mode.label + "</div>" +
            "<p>Press <b>play</b> to run the pipeline. Switch <b>View as</b> to see the same run in plain business language, as systems, or as the real Airflow DAG. Click any box for its full task detail.</p>" +
            '<div class="biz-legend">' +
              legendItem("running", "running") + legendItem("success", "success") +
              legendItem("failed", "failed") + legendItem("queued", "blocked / waiting") +
              legendItem("skipped", "skipped") +
            "</div>";
          return;
        }
        var s = mode.steps[idx];
        var text = self._view === "business" ? s.biz : self._view === "system" ? s.sys : s.af;
        var logs = logsAt(self._mode, idx);
        var logHtml = logs.slice(-6).map(function (l) {
          return '<div class="biz-log-row">' + l.replace(/·/g, '<span class="biz-log-dot">·</span>') + "</div>";
        }).join("");
        detail.innerHTML =
          '<div class="arch-detail-step">Step ' + (idx + 1) + " / " + mode.steps.length + "</div>" +
          '<div class="arch-detail-title">' + s.title + "</div>" +
          "<p>" + text + "</p>" +
          '<div class="biz-log-head">Event log</div>' +
          '<div class="biz-log">' + logHtml + "</div>";
      }

      function legendItem(cls, label) {
        return '<span class="biz-legend-item"><span class="biz-legend-dot ' + cls + '"></span>' + label + "</span>";
      }

      function renderInspector(id) {
        var t = BY_ID[id];
        if (!t) return;
        var states = snapshotAt(self._mode, self._idx);
        var upstream = t.up.length ? t.up.map(function (u) { return "<code>" + u + "</code>"; }).join(", ") : "—";
        var downstream = t.down.length ? t.down.map(function (u) { return "<code>" + u + "</code>"; }).join(", ") : "—";
        detail.innerHTML =
          '<div class="biz-insp">' +
            '<div class="biz-insp-head"><code class="biz-insp-id">' + t.id + "</code>" +
              '<button class="biz-insp-close" id="biz-insp-close">✕</button></div>' +
            '<div class="biz-insp-state">' + stateChip(states[t.id] || "scheduled") + "</div>" +
            row("Business meaning", t.meaning) +
            row("System involved", t.system) +
            row("Owner / team", '<code>' + t.owner + "</code>") +
            row("Upstream", upstream) +
            row("Downstream", downstream) +
            row("Retry behavior", t.retries) +
            row("Execution time", t.exec) +
          "</div>";
        var close = detail.querySelector("#biz-insp-close");
        if (close) close.addEventListener("click", function () { renderDetail(self._idx); });
        function row(k, v) {
          return '<div class="biz-insp-row"><div class="biz-insp-k">' + k + "</div><div class=\"biz-insp-v\">" + v + "</div></div>";
        }
      }

      // ── Engine wiring (rebuilt per mode) ──────────────────
      function buildEngine() {
        if (self._off) { self._off(); self._off = null; }
        if (self._controls) { self._controls.destroy(); self._controls = null; }
        if (self._engine) { self._engine.destroy(); self._engine = null; }
        container.querySelector("#biz-controls").innerHTML = "";
        var steps = MODES[self._mode].steps;
        var engine = new AV.AnimationEngine({
          steps: steps.map(function (s) { return { label: s.title, duration: 3000 }; }), speed: 1
        });
        self._engine = engine;
        self._off = engine.on("stepchange", function (idx) {
          self._idx = idx;
          paintStates(snapshotAt(self._mode, idx));
          if (!self._inspecting) renderDetail(idx);
        });
        var controls = AV.AnimationControls.create(engine, { title: MODES[self._mode].label });
        container.querySelector("#biz-controls").appendChild(controls.el);
        self._controls = controls;
        self._idx = -1;
        paintStates(snapshotAt(self._mode, -1));
        renderDetail(-1);
      }

      // Code
      container.querySelector("#biz-code").appendChild(AV.CodeViewer.create({
        title: "ecommerce_daily_ops.py", lang: "python", code: CODE
      }));

      // Interaction: view + mode buttons
      function onClick(e) {
        var vb = e.target.closest(".biz-view-btn");
        if (vb) {
          container.querySelectorAll(".biz-view-btn").forEach(function (b) { b.classList.remove("active"); });
          vb.classList.add("active");
          self._view = vb.getAttribute("data-view");
          applyView(self._view);
          if (self._inspecting) renderInspector(self._inspecting); else renderDetail(self._idx);
          return;
        }
        var mb = e.target.closest(".biz-mode-btn");
        if (mb) {
          container.querySelectorAll(".biz-mode-btn").forEach(function (b) { b.classList.remove("active"); });
          mb.classList.add("active");
          self._mode = mb.getAttribute("data-mode");
          self._inspecting = null;
          buildEngine();
        }
      }
      this._root = container; this._clicks = onClick;
      container.addEventListener("click", onClick);

      applyView("business");
      buildEngine();
    },

    destroy: function () {
      if (this._root && this._clicks) this._root.removeEventListener("click", this._clicks);
      if (this._off) { this._off(); this._off = null; }
      if (this._controls) { this._controls.destroy(); this._controls = null; }
      if (this._engine) { this._engine.destroy(); this._engine = null; }
      if (this._diagram) { this._diagram.destroy(); this._diagram = null; }
      this._root = null; this._clicks = null;
    }
  };

  AV.registerModule(module);
})();
