/* modules/dbt-cicd.js — Tier 2 · dbt CI/CD (built on the concept-module factory) */
(function () {
  "use strict";
  var NS = (window.DECICDViz = window.DECICDViz || {});

  NS.registerModule(NS.Concept.build({
    id: "dbt-cicd",
    title: "dbt CI/CD",
    tool: "--tool-dbt",
    icon: "🔶",
    eyebrow: "Tier 2 · Data Engineering CI/CD",
    subtitle: "SQL transformations run like software: RetailFlow's net-revenue logic is version-controlled, tested, and documented before a single row reaches the warehouse.",
    mentalImage: "SQL WITH SOFTWARE DISCIPLINE",

    flowTitle: "A model change moving through dbt CI",
    flow: ["PR opened", "dbt parse", "dbt build", "dbt test", "changed-model validation", "merge", "prod run"],

    why: "RetailFlow analysts once pasted ad-hoc SQL straight into the warehouse — no tests, no history, no idea which query fed the 7 AM dashboard. A bad join silently double-counted orders for weeks.",
    what: "dbt is a <b>transformation framework</b>: you write <code>SELECT</code> models in SQL + Jinja, and dbt handles dependencies, materialization, testing, documentation, and lineage.",
    how: "Models <code>ref()</code> each other into a DAG. On every PR, dbt parses, builds only the changed models (<b>Slim CI</b>), and runs data tests — a failing test blocks the merge.",

    levels: {
      beginner: [
        { h: "The one-line idea", body: "dbt turns raw tables into clean ones using ordinary <code>SELECT</code> statements. Each saved query is a <b>model</b>, and dbt figures out the order to run them in." },
        { h: "The RetailFlow model chain", body: "<code>raw_orders</code> → <code>stg_orders</code> (clean/rename) → <code>int_orders</code> (join refunds) → <code>fct_orders</code> (business-ready facts). Each step is one <code>.sql</code> file that <code>ref()</code>s the one before it." },
        { h: "ref, source, seed", body: "<ul><li><code>source()</code> points at a raw table dbt didn't build.</li><li><code>ref()</code> points at another dbt model — this is what builds the lineage graph.</li><li>A <b>seed</b> is a small CSV (e.g. store lookup) loaded as a table.</li></ul>" }
      ],
      intermediate: [
        { h: "Tests are the safety net", body: "dbt tests are assertions on data. Built-ins: <code>unique</code>, <code>not_null</code>, <code>accepted_values</code>, <code>relationships</code> (referential integrity). Anything else is a <b>custom / singular test</b> — a SQL query that must return zero rows." },
        { h: "Jinja & materialization", body: "Models are SQL plus <b>Jinja</b> templating (<code>{{ ref() }}</code>, <code>{% if %}</code>). A <b>materialization</b> decides the output: <code>view</code>, <code>table</code>, <code>incremental</code> (append only new rows), or <code>ephemeral</code> (inlined CTE). A <b>macro</b> is a reusable Jinja function." },
        { h: "Slim CI", body: "Running every model on every PR is slow. <b>Slim CI</b> uses <code>state:modified+</code> against a stored <b>manifest</b> to build only changed models and their children, and <b>defers</b> unchanged upstream models to production — fast, cheap PR checks." }
      ],
      proficient: [
        { h: "State comparison & deferral", body: "<code>dbt build --select state:modified+ --defer --state ./prod-artifacts</code> compares the PR's <code>manifest.json</code> to production's. Unchanged parents resolve to the prod schema, so CI never rebuilds the whole warehouse to validate one model." },
        { h: "Contracts & exposures", body: "A <b>contract</b> enforces a model's column names, types, and constraints at build time — a breaking schema change fails fast. <b>Exposures</b> declare downstream consumers (the exec dashboard, a Looker tile) so lineage extends past dbt and you can assess blast radius." },
        { h: "Snapshots & interview angle", body: "A <b>snapshot</b> implements slowly-changing-dimension type-2 history (track how a customer's tier changed over time). Senior signal: separate staging/intermediate/marts layers, one-to-one raw-to-staging models, and tests at the boundary where data enters your control." }
      ]
    },

    micro: ["model", "source", "ref", "seed", "snapshot", "macro", "Jinja", "materialization", "incremental model",
      "test", "unique", "not_null", "accepted_values", "relationships", "custom test", "documentation", "lineage",
      "Slim CI", "state comparison", "deferred build", "contract", "exposure", "manifest"],

    before: ["ad-hoc SQL in the warehouse", "no tests", "no lineage", "double-counted orders", "which query is live?"],
    after: ["version-controlled models", "tests block bad merges", "auto lineage graph", "Slim CI on every PR", "self-documented"],

    failure: {
      title: "A join fan-out duplicates orders",
      steps: ["edit int_orders join", "each order matches 2 refund rows", "order_id no longer unique", "dbt unique test FAILED", "merge blocked"],
      explain: "A refactor of <code>int_orders</code> joined refunds one-to-many, so <code>fct_orders</code> counted each order twice — revenue would have doubled. The <code>unique</code> test on <code>order_id</code> returned duplicate rows, dbt exited non-zero, and CI <b>blocked the deployment</b> before the bad numbers reached the 7 AM dashboard."
    },

    whenNot: "dbt is for <b>transformation (the T in ELT)</b> — data already landed in a warehouse. Don't use it to extract or load data (use Airbyte/Fivetran/custom loaders), for row-by-row streaming, or as a general-purpose orchestrator; dbt models the SQL, something else moves the bytes and schedules the runs.",

    story: {
      situation: "RetailFlow's finance team reports refunds are inflating net revenue on the executive dashboard.",
      problem: "The fix lives in the transformation SQL, but changing it risks silently corrupting the numbers if the logic or grain is wrong.",
      decision: "The engineer edits <code>fct_orders</code> to compute <code>net_revenue = gross_revenue - refund_amount</code>, adds a <code>unique</code> + <code>not_null</code> test on <code>order_id</code>, and opens a PR.",
      tool: "dbt models + tests + Slim CI.",
      result: "Slim CI builds only the changed models, runs the tests, and passes — the fix merges and the next production run publishes correct net revenue.",
      remember: "In dbt the transformation and its tests ship together; a model that can't pass its own tests can't reach production."
    },

    code: [{
      title: "fct_orders.sql — net revenue as a dbt model",
      lang: "sql",
      code: "-- models/marts/fct_orders.sql\n" +
            "{{ config(materialized='incremental', unique_key='order_id') }}\n\n" +
            "select\n" +
            "    order_id,\n" +
            "    customer_id,\n" +
            "    gross_revenue,\n" +
            "    refund_amount,\n" +
            "    gross_revenue - refund_amount as net_revenue,\n" +
            "    order_completed_at\n" +
            "from {{ ref('stg_orders') }}\n" +
            "{% if is_incremental() %}\n" +
            "where order_completed_at > (select max(order_completed_at) from {{ this }})\n" +
            "{% endif %}",
      highlights: [2, 8, 9]
    }, {
      title: "schema.yml — tests that guard the model",
      lang: "yaml",
      code: "models:\n" +
            "  - name: fct_orders\n" +
            "    columns:\n" +
            "      - name: order_id\n" +
            "        tests:\n" +
            "          - unique\n" +
            "          - not_null\n" +
            "      - name: customer_id\n" +
            "        tests:\n" +
            "          - relationships:\n" +
            "              to: ref('dim_customers')\n" +
            "              field: customer_id\n" +
            "      - name: net_revenue\n" +
            "        tests:\n" +
            "          - dbt_utils.accepted_range:\n" +
            "              min_value: 0",
      highlights: [5, 6, 7, 10]
    }],

    remember: "dbt = analytics engineering: SQL SELECTs become a tested, documented, version-controlled DAG — and a failing test blocks the merge, not the dashboard.",

    retention: {
      question: "A RetailFlow PR only touches <code>int_orders</code>, but rebuilding the whole warehouse to validate it is slow and expensive. Which dbt feature validates just the change?",
      answer: "<b>Slim CI</b> — using <code>state:modified+</code> with <code>--defer</code> against stored production artifacts, dbt builds only the changed model and its downstream children while deferring unchanged parents to prod."
    },

    prerequisites: ["git", "github-actions", "testing-pyramid", "sql-testing"],

    production: [
      { h: "Store and refresh the prod manifest", body: "Slim CI compares the PR's <code>manifest.json</code> against a <i>production</i> one — if that artifact is stale or missing, <code>state:modified+</code> silently rebuilds everything or skips changed models. Publish fresh prod artifacts on every main-branch run." },
      { h: "Incremental late-arriving data", body: "A <code>max(order_completed_at)</code> incremental filter on RetailFlow's <code>daily_revenue</code> model misses orders that land after the watermark; use a lookback window or <code>incremental_strategy='merge'</code> on <code>order_id</code> so late refunds still correct net_revenue." },
      { h: "Contracts and schema evolution", body: "Put a <code>contract</code> on the model feeding the 7 AM dashboard so a renamed or retyped column fails the build instead of silently breaking the downstream exposure." },
      { h: "Tests as a real deploy gate", body: "A failing <code>dbt test</code> only blocks prod if the orchestrator runs <code>dbt build</code> (not <code>run</code>) and halts on non-zero exit; wire <code>--fail-fast</code> and check the exit code so a uniqueness failure actually stops the publish." },
      { h: "Warehouse cost", body: "<code>table</code> and full-refresh <code>incremental</code> rebuilds scan the whole history every run — bound CI to <code>state:modified+</code> and prefer incremental in prod to keep warehouse spend predictable." }
    ],

    misconceptions: [
      { myth: "A failing dbt test always blocks the deployment.", truth: "Only if the pipeline enforces it — <code>dbt run</code> ignores tests, and <code>test</code> failures block prod merely when the orchestrator runs <code>build</code>/<code>test</code> and acts on the non-zero exit. <code>severity: warn</code> tests never block." },
      { myth: "An incremental model using <code>max(timestamp)</code> catches all new rows.", truth: "It misses late-arriving rows (a refund posted after the watermark). Use a lookback window, a merge strategy, or an explicit watermark table." },
      { myth: "Slim CI tests the whole project cheaply.", truth: "It only builds <code>state:modified+</code> and defers the rest to prod — unchanged models are not re-tested, so a change that breaks an untouched downstream model via data (not SQL) can slip through until the full prod run." },
      { myth: "<code>ref()</code> just controls run order.", truth: "<code>ref()</code> builds the lineage DAG and resolves to the correct schema per target/defer — it is how dbt knows dependencies, enables Slim CI deferral, and powers lineage and exposures, not merely ordering." }
    ],

    troubleshooting: [
      { symptom: "<code>unique</code> test on <code>order_id</code> fails after an int_orders edit.", cause: "A join to refunds went one-to-many (fan-out), duplicating each order row.", fix: "Pre-aggregate refunds to one row per order (<code>group by order_id</code>) before joining, or join on a unique grain; re-run <code>dbt build</code> and confirm the unique test returns zero duplicates." },
      { symptom: "Slim CI rebuilds the entire warehouse on a one-model PR.", cause: "The stored prod <code>manifest.json</code> is missing or stale, so <code>state:modified+</code> can't diff.", fix: "Regenerate and upload prod artifacts from the latest main run, point <code>--state</code> at them, and verify only the changed model and children build." },
      { symptom: "Net revenue is correct in CI but wrong in prod.", cause: "The incremental model missed late-arriving refunds past its max-timestamp watermark.", fix: "Switch to <code>incremental_strategy='merge'</code> keyed on <code>order_id</code> with a lookback window; full-refresh once, then confirm late refunds update existing rows." },
      { symptom: "Build passes but a downstream dashboard column vanished.", cause: "An upstream column was renamed with no contract to catch it.", fix: "Add a <code>contract</code> (enforced: true) with column names/types to the model and its exposure; re-run and confirm the breaking change now fails the build." }
    ],

    interview: [
      { q: "How does Slim CI avoid rebuilding the whole warehouse on every PR?", a: "It diffs the PR's <code>manifest.json</code> against a stored <b>production</b> manifest, selects <code>state:modified+</code> (changed models plus descendants), and <code>--defer</code>s unchanged parents to the prod schema — so CI builds and tests only what changed while still resolving references correctly." },
      { q: "Does a failing dbt test block a deploy? When does it not?", a: "Only if the orchestrator runs <code>dbt build</code> or <code>test</code> and treats the non-zero exit as a gate. <code>dbt run</code> alone never runs tests, and a test with <code>severity: warn</code> logs but passes — so 'tests are green' only guarantees a block when the pipeline is wired to enforce it." },
      { q: "A RetailFlow incremental revenue model keeps missing late refunds. Why, and how do you fix it?", a: "A <code>where ts > max(ts)</code> filter only picks up rows newer than the last watermark, so a refund posted for an older order is never re-processed. Use <code>incremental_strategy='merge'</code> on <code>order_id</code> with a lookback window (reprocess the last N days) so late-arriving corrections update existing rows." },
      { q: "When would you use a contract vs a test?", a: "A <b>contract</b> enforces structure (column names, types, constraints) at build time and fails fast on schema drift; a <b>test</b> asserts data properties (unique, not_null, ranges) after the model builds. Contracts guard the interface for downstream consumers; tests guard the data." }
    ],

    related: ["sql-testing", "testing-pyramid", "data-quality", "github-actions"]
  }));
})();
