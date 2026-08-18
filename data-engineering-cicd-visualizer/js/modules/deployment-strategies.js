/* modules/deployment-strategies.js — Deployment Strategies (concept-module factory) */
(function () {
  "use strict";
  var NS = (window.DECICDViz = window.DECICDViz || {});

  NS.registerModule(NS.Concept.build({
    id: "deployment-strategies",
    title: "Deployment Strategies",
    tool: "--tool-ci",
    icon: "🚦",
    eyebrow: "Engineering Concept · Deployment Strategies",
    subtitle: "Rolling, blue/green, canary, recreate — how to release a change safely, plus the data-engineering twist: schema migrations, backward compatibility, and pipeline versioning.",
    mentalImage: "RELEASE THE RISK GRADUALLY",

    flowTitle: "Rolling out a risky transform with a canary",
    flow: ["New version built", "canary: 5% of runs", "watch metrics", "healthy? widen", "50% → 100%", "or roll back fast"],

    why: "Flipping every job to a new version at once means a bad transform hits 100% of the revenue pipeline instantly — and a schema change that drops a column can silently break every downstream dashboard before anyone notices.",
    what: "A <b>deployment strategy</b> is how you replace a running version with a new one: <b>recreate</b>, <b>rolling</b>, <b>blue/green</b>, or <b>canary</b>. In data engineering you must <i>also</i> manage <b>schema migrations, backward compatibility, data-contract changes, and pipeline versioning</b>, because the data outlives any single deploy.",
    how: "Choose based on risk and downtime tolerance: recreate for simple/low-stakes, rolling for gradual node-by-node replacement, blue/green for instant switch + instant rollback, canary to expose a risky change to a small slice first. For schema changes, deploy <b>backward-compatible</b> steps so old and new code both work during the transition.",

    levels: {
      beginner: [
        { h: "The idea", body: "When you ship a new version, you rarely want to swap <i>everything</i> at once — that turns a small bug into a total outage. Deployment strategies are different ways to introduce the new version <b>gradually</b> (or with a fast escape hatch) so problems stay small and reversible." },
        { h: "The four classic strategies", body: "<ul><li><b>Recreate:</b> stop old, start new (brief downtime).</li><li><b>Rolling:</b> replace instances a few at a time.</li><li><b>Blue/green:</b> run new version alongside old, flip traffic when ready.</li><li><b>Canary:</b> send a small % to the new version, watch, then widen.</li></ul>" },
        { h: "The data twist, in one line", body: "Code you can roll back in seconds. <b>Data and schema you often can't</b> — a dropped column or rewritten table is hard to undo — so data engineering adds rules about changing schemas safely." }
      ],
      intermediate: [
        { h: "Recreate & Rolling", body: "<b>Recreate:</b> tear down the old version, then start the new one — simple, but there's a downtime gap. Fine for a nightly batch job that isn't running at deploy time. <b>Rolling:</b> replace instances incrementally (e.g. Kubernetes updates pods a few at a time) so there's no full outage, but old and new run <i>simultaneously</i> mid-roll — which means both versions must tolerate the same data/schema." },
        { h: "Blue/Green", body: "Stand up the <b>new</b> version (green) fully alongside the <b>current</b> one (blue), test green, then flip the switch (load balancer, DNS, or which environment the scheduler points at). <b>Advantage:</b> instant cutover and instant rollback (flip back to blue). <b>Cost:</b> double the infrastructure during the switch." },
        { h: "Canary", body: "Route a <b>small slice</b> — say 5% of pipeline runs, or one partition — through the new version while everything else stays on the old. Watch metrics (row counts, revenue totals, error rate); if healthy, widen to 50% then 100%; if not, pull the canary. Best strategy for a <b>risky transform</b> where you want real production signal at low blast radius." },
        { h: "Schema migration risk", body: "Unlike code, a schema change touches persistent data every downstream consumer depends on. Dropping or renaming <code>gross_revenue</code>, or changing its type, can break dashboards and models that are deployed independently — so schema changes need their own careful, staged strategy." }
      ],
      proficient: [
        { h: "Backward-compatible schema changes (expand/contract)", body: "Use the <b>expand → migrate → contract</b> pattern. <b>Expand:</b> add the new column (nullable/defaulted) without touching the old one — additive changes are backward compatible, so old code keeps working. <b>Migrate:</b> backfill and switch readers/writers to the new column. <b>Contract:</b> only after nothing reads the old column, drop it. Never expand and contract in the same release." },
        { h: "Data contracts & pipeline versioning", body: "A <b>data contract</b> is the agreed schema/semantics between the pipeline and its consumers. Changing it (renaming a field, changing units, changing meaning) is a breaking change that must be versioned and announced — e.g. publish <code>orders_v2</code> alongside <code>orders_v1</code> and let consumers migrate, rather than mutating <code>v1</code> under them." },
        { h: "Rollback with state in mind", body: "Blue/green and canary make <i>code</i> rollback instant. But if the new version already <b>wrote data</b> in a new shape, rolling back code isn't enough — that's why additive, backward-compatible changes matter: old code can still read a table that merely gained a column. Design so a rollback never leaves the pipeline reading data it can't understand." }
      ]
    },

    micro: [
      { name: "recreate", tip: "Stop old, start new — brief downtime." },
      { name: "rolling deployment", tip: "Replace instances a few at a time." },
      { name: "blue/green", tip: "Run new beside old, flip traffic, flip back to roll back." },
      { name: "canary", tip: "Small % to new version, watch, then widen." },
      { name: "blast radius", tip: "How much breaks if the new version is bad." },
      { name: "schema migration", tip: "A change to the table structure the data lives in." },
      { name: "backward compatible", tip: "Old code still works against the new schema." },
      { name: "expand/contract", tip: "Add new first, drop old only after nothing reads it." },
      { name: "data contract", tip: "Agreed schema/semantics between producer and consumers." },
      { name: "pipeline versioning", tip: "orders_v2 alongside orders_v1 for breaking changes." },
      { name: "backfill", tip: "Populate the new column/table for historical rows." },
      { name: "rollback", tip: "Return to the previous known-good version fast." }
    ],

    before: ["swap every job to new version at once", "a bad transform hits 100% instantly", "drop/rename columns in place", "downstream dashboards break silently", "rollback = scramble"],
    after: ["canary a risky change to a small slice", "watch metrics before widening", "additive, backward-compatible schema steps", "consumers migrate on their own schedule", "blue/green flip-back rollback"],

    failure: {
      title: "A breaking schema change shipped all at once",
      steps: ["rename gross_revenue → revenue_gross", "deploy transform to 100%", "downstream dbt models still ref gross_revenue", "models error / dashboards blank", "no fast rollback — data already rewritten"],
      explain: "A rename is a <b>breaking</b>, non-backward-compatible change pushed to everything at once, so every consumer still expecting <code>gross_revenue</code> broke instantly. The safe path is <b>expand/contract</b>: add the new column first (keep the old), migrate readers, and only drop the old column once nothing references it — combined with a <b>canary</b> so a risky transform proves itself on a small slice before going wide."
    },

    whenNot: "Don't reach for heavy blue/green or canary machinery when it isn't warranted: a small <b>nightly batch job</b> that runs once and isn't live at deploy time can just be <b>recreated</b>, and doubling infrastructure for blue/green is wasteful for a low-stakes internal report. Match the strategy to the blast radius.",

    story: {
      situation: "RetailFlow needs to add a <code>refund_amount</code> column to the <code>orders</code> table and change the transform so <code>net_revenue = gross_revenue - refund_amount</code> — but dozens of downstream dbt models and dashboards read <code>orders</code>.",
      problem: "Renaming or restructuring <code>orders</code> in place would break every downstream consumer at once, and a wrong revenue number would hit the 7 AM exec dashboard instantly.",
      decision: "Use a <b>backward-compatible</b> schema change (expand: add <code>refund_amount</code> as a nullable column, default 0, without touching existing columns) and <b>canary</b> the new transform on ~5% of order partitions first, watching revenue totals before widening.",
      tool: "Additive schema migration (expand/contract) + canary deployment of the transform.",
      result: "Old models keep working throughout because nothing was removed; the canary confirms net-revenue totals look right on the small slice, the rollout widens to 100%, and the old column is retired only later once no model references it.",
      remember: "Code rolls back in seconds; data doesn't — so make schema changes additive and backward-compatible, and canary risky transforms before they run on everything."
    },

    code: [{
      title: "Backward-compatible schema change — expand, don't rename",
      lang: "sql",
      code: "-- EXPAND: additive change, old code keeps working (backward compatible)\n" +
            "ALTER TABLE orders ADD COLUMN refund_amount NUMERIC(12,2) DEFAULT 0;\n\n" +
            "-- MIGRATE: backfill history, then point the transform at the new column\n" +
            "UPDATE orders SET refund_amount = 0 WHERE refund_amount IS NULL;\n\n" +
            "-- net_revenue now = gross_revenue - refund_amount\n" +
            "-- CONTRACT: only AFTER no model reads a deprecated column, drop it\n" +
            "-- (run in a LATER release, never the same one as EXPAND)",
      highlights: [1, 2]
    }, {
      title: "Canary the risky transform — small slice first, then widen",
      lang: "yaml",
      code: "# argo Rollout: canary the revenue-processor before it runs on everything\n" +
            "strategy:\n" +
            "  canary:\n" +
            "    steps:\n" +
            "      - setWeight: 5          # 5% of runs use the new net_revenue transform\n" +
            "      - pause: { duration: 30m }   # watch revenue totals + error rate\n" +
            "      - setWeight: 50\n" +
            "      - pause: { duration: 30m }\n" +
            "      - setWeight: 100        # fully rolled out once metrics stay healthy",
      highlights: [5, 6]
    }, {
      title: "Blue/green cutover with instant rollback",
      lang: "bash",
      code: "# GREEN (new) runs beside BLUE (current); flip only when green is verified\n" +
            "kubectl apply -f revenue-processor-green.yaml     # stand up new version\n" +
            "# verify green against staging data...\n" +
            "kubectl patch svc revenue-processor -p \\\n" +
            "  '{\"spec\":{\"selector\":{\"version\":\"green\"}}}'    # flip traffic to green\n" +
            "# ROLLBACK is instant — flip the selector back to blue:\n" +
            "kubectl patch svc revenue-processor -p \\\n" +
            "  '{\"spec\":{\"selector\":{\"version\":\"blue\"}}}'",
      highlights: [4, 5]
    }],

    remember: "Pick a deployment strategy by blast radius: recreate (simple), rolling (gradual, no outage), blue/green (instant flip + flip-back), canary (small slice first). In data engineering, add schema discipline — additive, backward-compatible changes (expand/contract), versioned data contracts — because code rolls back in seconds but data does not.",

    retention: {
      question: "RetailFlow must add <code>refund_amount</code> to <code>orders</code> and change the transform, but dozens of downstream models read that table. Which deployment approach keeps them from breaking?",
      answer: "Make the schema change <b>backward compatible</b> using <b>expand/contract</b>: <i>add</i> the new <code>refund_amount</code> column (nullable/defaulted) without removing or renaming anything, so old models keep working; migrate readers to the new formula; and drop old columns only in a later release once nothing references them. Pair it with a <b>canary</b> so the risky transform proves out on a small slice of runs before going to 100%."
    }
  }));
})();
