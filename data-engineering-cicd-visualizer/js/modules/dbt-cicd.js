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
    }
  }));
})();
