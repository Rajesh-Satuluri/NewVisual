/* modules/rollback.js — Tier 3 · Rollback (built on the concept-module factory) */
(function () {
  "use strict";
  var NS = (window.DECICDViz = window.DECICDViz || {});

  NS.registerModule(NS.Concept.build({
    id: "rollback",
    title: "Rollback",
    tool: "--tool-failure",
    icon: "⏪",
    eyebrow: "Tier 3 · Production Engineering",
    subtitle: "The undo button for a bad deployment — RetailFlow repoints the revenue pipeline to the previous immutable image in minutes, then discovers that rolling back the CODE did not roll back the wrong ROWS it already wrote.",
    mentalImage: "REVERT THE CODE ≠ REPAIR THE DATA",

    flowTitle: "A rollback moving through production",
    flow: ["Production", "Bad deployment", "Detection", "Rollback", "Previous artifact", "Verification"],

    why: "A deploy can look green and still be wrong — a bad revenue build ships, runs at 2 AM, and by 7 AM executives are reading numbers built on broken logic. You need to return to a known-good version <b>fast</b>, before the damage spreads.",
    what: "A rollback is a <b>controlled return to the last known-good release</b>: redeploy the previous immutable artifact (a pinned image digest, a Helm revision, a dbt/DAB version) so production runs proven code again.",
    how: "Detect the regression (alerts, data-quality failure), redeploy the previous artifact by its exact identifier, verify the pipeline is healthy — and then <b>separately repair any data the bad run already wrote</b>, because reverting code does not un-write rows.",

    levels: {
      beginner: [
        { h: "The one-line idea", body: "A rollback is 'undo' for a deployment: put production back on the version that worked yesterday. Because releases are <b>immutable artifacts</b> (a specific image, a specific version), 'the previous one' still exists and can be re-run instantly." },
        { h: "Redeploy old, don't hot-fix", body: "The safe move under pressure is <b>not</b> to write a new fix live — it's to redeploy the <i>previous</i> artifact that you already know is good. Forward-fixing comes later, calmly, through the normal PR + CI path." },
        { h: "RetailFlow example", body: "A change to <code>net_revenue = gross_revenue - refund_amount</code> shipped inverted (it <i>added</i> refunds). Detection fires. The team repoints the pipeline to the <b>previous image digest</b> and the next run uses correct code again — the code is fixed in minutes." }
      ],
      intermediate: [
        { h: "Code rollback vs data rollback", body: "Redeploying the old artifact fixes the <b>code path</b> going forward. It does <b>not</b> touch rows the bad run already wrote to the warehouse. If the 2 AM run loaded inflated revenue into the Gold table, that corrupt data is still sitting there after the rollback — it must be repaired separately by <b>backfill</b> or restore." },
        { h: "How you actually roll back", body: "<ul><li><b>Container image</b> — redeploy the previous <code>@sha256</code> digest, never a moving <code>:latest</code> tag.</li><li><b>Kubernetes</b> — <code>kubectl rollout undo</code>.</li><li><b>Helm</b> — <code>helm rollback &lt;release&gt; &lt;revision&gt;</code>.</li><li><b>Argo CD / GitOps</b> — revert the Git commit; the cluster syncs back.</li></ul>" },
        { h: "Verify, then backfill", body: "After the previous artifact is live, <b>verify</b> (health check, a data-quality run on a fresh sample) that production is healthy. Then reprocess the affected window — re-run the pipeline for the corrupted dates so the Gold table is overwritten with correct numbers." }
      ],
      proficient: [
        { h: "Idempotent, reprocessable pipelines", body: "Fast recovery depends on design: partitioned, <b>idempotent</b> loads (delete-and-insert or merge by partition) mean you can safely re-run any date range. Non-idempotent appends make backfill dangerous — you double-count. Rollback speed is a property you build in before the incident." },
        { h: "Rollback vs roll-forward", body: "Rollback (redeploy previous) is fastest when the previous version is known-good and schema-compatible. <b>Roll-forward</b> (ship a corrective fix) is required when a rollback would be incompatible — e.g. a migration already altered the schema, so you can't simply run old code against a new table." },
        { h: "The data-repair playbook", body: "1) Redeploy previous artifact. 2) Verify code path healthy. 3) Identify the blast radius — which partitions/dates the bad run touched. 4) <b>Backfill</b> those partitions from raw/Bronze, or <b>restore</b> from a snapshot / time-travel version. 5) Re-run downstream data-quality checks before releasing the dashboard." }
      ]
    },

    micro: ["known-good release", "immutable artifact", "image digest (@sha256)", "kubectl rollout undo",
      "helm rollback", "GitOps revert", "roll-forward", "blast radius", "backfill", "reprocess partition",
      "idempotent load", "merge / delete-insert", "table snapshot / time travel", "verification run", "data repair"],

    before: ["bad deploy stuck in prod", "panic hot-fix live", ":latest, no way back", "code reverted, data still wrong", "execs read corrupt revenue"],
    after: ["redeploy previous digest", "rollback in minutes", "pinned, reproducible releases", "backfill repairs the data", "verified before dashboard"],

    failure: {
      title: "Code rolled back, Gold table still corrupt",
      steps: ["Inverted net_revenue ships", "2 AM run writes inflated revenue", "alert + DQ check fire", "roll back to previous digest", "code path fixed — but bad rows remain", "backfill the corrupted partitions"],
      explain: "Redeploying the previous image fixed the <b>code</b> for the next run, but the 2 AM run had already written wrong rows to the <b>Gold table</b> — the rollback never touched them. The real remediation is two steps: <b>revert the artifact</b>, then <b>backfill / restore the affected partitions</b> and re-run data-quality checks. Rolling back code does not roll back data."
    },

    whenNot: "Don't roll back when it would be <b>incompatible</b> — if the bad release already ran a forward schema migration (new/renamed columns), redeploying old code against the new table just breaks differently. There, <b>roll forward</b> with a corrective release. And never treat rollback as a substitute for data repair: reverting the artifact alone leaves corrupt rows in place.",

    story: {
      situation: "RetailFlow ships a revenue change where <code>net_revenue = gross_revenue - refund_amount</code> was coded with the sign flipped, so refunds inflate revenue.",
      problem: "It passed a thin review, deployed green, and the 2 AM run wrote inflated numbers into the Gold <code>daily_revenue</code> table — hours before the 7 AM dashboard.",
      decision: "On-call redeploys the <b>previous image digest</b>, verifies the pipeline is healthy, then <b>backfills</b> the affected date partition from Bronze so the Gold table holds correct revenue.",
      tool: "Immutable-artifact rollback + partition backfill.",
      result: "The code path is good again within minutes; the corrupted partition is reprocessed and re-checked before the dashboard reads it. Both the code <i>and</i> the data are made right.",
      remember: "Rolling back the image fixes tomorrow's run; only a backfill fixes yesterday's rows."
    },

    code: [{
      title: "Roll back the revenue image, then backfill the corrupted partition",
      lang: "bash",
      code: "# 1) Roll back the CODE: redeploy the previous immutable digest (never :latest)\n" +
            "kubectl set image deployment/revenue-pipeline \\\n" +
            "  runner=ghcr.io/retailflow/revenue@sha256:9f2c...PREV\n" +
            "kubectl rollout status deployment/revenue-pipeline   # verify healthy\n" +
            "\n" +
            "# (Helm equivalent: roll back to the prior release revision)\n" +
            "# helm rollback revenue-pipeline 41\n" +
            "\n" +
            "# 2) Roll back the DATA: reprocess the partition the bad 2 AM run wrote.\n" +
            "#    Idempotent load overwrites the corrupted rows — no double counting.\n" +
            "python run_revenue_pipeline.py \\\n" +
            "  --backfill --date 2026-08-18 --full-refresh-partition\n" +
            "\n" +
            "# 3) Re-run data-quality checks before releasing the dashboard\n" +
            "soda scan -d warehouse checks/daily_revenue.yml",
      highlights: [2, 9, 12]
    }],

    remember: "A rollback returns production to the last known-good immutable artifact — but reverting the code does NOT un-write the rows a bad run already loaded. Recovery is two steps: redeploy the previous artifact, then backfill or restore the corrupted data and re-verify.",

    retention: {
      question: "RetailFlow's inverted net-revenue build already ran at 2 AM and wrote inflated numbers to the Gold table. You redeploy the previous image digest — is the incident over?",
      answer: "No. Redeploying the previous <b>artifact</b> only fixes the code path for future runs. The bad run already wrote wrong rows, which the rollback never touched. You must also <b>repair the data</b> — backfill / reprocess the affected partition (or restore from a snapshot / time-travel version) and re-run data-quality checks before the 7 AM dashboard reads it. Code rollback ≠ data rollback."
    },

    prerequisites: [
      { id: "deployment-strategies", label: "Deployment strategies" },
      "environment-promotion",
      "observability"
    ],

    production: [
      { h: "Roll back to a pinned digest", body: "Redeploy the previous immutable <code>@sha256</code> digest or Helm revision — never a moving <code>:latest</code> tag — so 'the previous version' is exactly reproducible." },
      { h: "Repair the data, not just the code", body: "RetailFlow's rollback fixes tomorrow's run; the inflated rows the 2 AM run wrote to the Gold table must be <b>backfilled/restored</b> separately before the 7 AM dashboard reads them." },
      { h: "Design for idempotent reprocessing", body: "Partitioned, idempotent loads (merge or delete-and-insert by partition) let you safely re-run any date range; non-idempotent appends turn a backfill into double-counting." },
      { h: "Know when to roll forward instead", body: "If the bad release already ran a forward schema migration, old code won't run against the new table — ship a corrective fix (roll-forward) rather than an incompatible rollback." },
      { h: "Verify before releasing the dashboard", body: "After rollback, run a data-quality check on a fresh sample and confirm the repaired partitions pass before letting consumers read the table." }
    ],

    misconceptions: [
      { myth: "Reverting the code reverses the bad data it already wrote.", truth: "A rollback changes the code path going forward only; rows the bad run loaded are still in the warehouse and must be backfilled or restored separately." },
      { myth: "Under pressure, the fastest fix is to hot-fix live.", truth: "The safe move is to redeploy the <b>previous known-good artifact</b> you already trust; forward-fixing comes later, calmly, through the normal PR + CI path." },
      { myth: "Rollback is always available.", truth: "If the release already ran a forward schema migration, redeploying old code against the new table just breaks differently — you must <b>roll forward</b> instead." },
      { myth: "A backfill can just re-run the pipeline for the bad dates.", truth: "Only if the load is <b>idempotent</b>; a plain append re-run double-counts, so the partition must be overwritten via merge or delete-and-insert." }
    ],

    troubleshooting: [
      { symptom: "Rolled back the image but the Gold table still shows inflated revenue.", cause: "The rollback only reverted code; the bad 2 AM run's rows remain.", fix: "Identify the affected partitions, backfill/reprocess them from Bronze with an idempotent load, re-run data-quality checks, and confirm the dashboard totals are correct." },
      { symptom: "Old code crashes immediately after rollback.", cause: "The bad release ran a forward schema migration the old code can't read.", fix: "Roll <b>forward</b> with a corrective release instead, or restore the schema; verify the pipeline runs green against the current table." },
      { symptom: "Backfill produced doubled revenue numbers.", cause: "The load appends rather than overwrites — it's not idempotent.", fix: "Switch the affected load to merge/delete-and-insert by partition, re-run the backfill, and verify row counts match the expected single-count totals." },
      { symptom: "Can't reproduce the previous version to roll back to.", cause: "Deploys used a moving <code>:latest</code> tag, so the prior artifact isn't pinned.", fix: "Deploy by immutable digest/revision going forward; recover the prior digest from the registry/Helm history, redeploy it, and verify the run is healthy." },
      { symptom: "Rollback looks healthy but downstream models are still wrong.", cause: "Repaired Gold partitions weren't re-verified before release.", fix: "Run the data-quality suite on the reprocessed window and confirm it passes before letting the 7 AM dashboard read the table." }
    ],

    interview: [
      { q: "Why isn't redeploying the previous artifact enough to resolve a bad data load?", a: "A rollback restores the <b>code path</b> for future runs, but the bad run already wrote wrong rows to the warehouse, and reverting code never un-writes them. Full recovery is two steps: <b>redeploy the previous artifact</b>, then <b>backfill or restore</b> the corrupted partitions and re-run data-quality checks before consumers read the table." },
      { q: "When would you roll <i>forward</i> instead of rolling back?", a: "When a rollback would be <b>incompatible</b> — e.g. the bad release already ran a forward schema migration (new/renamed columns), so old code can't run against the new table. There you ship a <b>corrective fix</b> through CI rather than redeploying an older, now-incompatible artifact." },
      { q: "RetailFlow's inverted net-revenue build ran at 2 AM and corrupted the Gold table. Walk through your incident response before the 7 AM dashboard.", a: "1) Redeploy the <b>previous image digest</b> and verify the code path is healthy. 2) Identify the <b>blast radius</b> — which partitions/dates the 2 AM run touched. 3) <b>Backfill</b> those partitions from Bronze (or restore from a snapshot/time-travel version) with an idempotent load. 4) Re-run <b>data-quality checks</b> on the reprocessed window. 5) Only then release the dashboard. Code rollback fixes tomorrow; the backfill fixes yesterday." },
      { q: "What pipeline design choices make rollback fast and safe?", a: "<b>Immutable, pinned artifacts</b> (digest/Helm revision, never <code>:latest</code>) so the prior version is instantly redeployable; <b>idempotent, partitioned loads</b> (merge/delete-insert) so any date range can be safely re-run; and <b>snapshots/time travel</b> so data can be restored. Rollback speed is a property you build in before the incident, not something you improvise during it." }
    ],

    problem: {
      before: "When a release went bad, teams scrambled to hand-fix production live, or rebuilt an old commit under pressure, hoping it matched what had worked.",
      insufficient: "Ad-hoc recovery is slow and error-prone exactly when stress is highest. And for data pipelines, reverting the <i>code</i> doesn't undo the <i>wrong data</i> already written — a crucial distinction manual scrambling misses.",
      failureModes: [
        "Code is rolled back but the bad revenue numbers already in the warehouse remain.",
        "A hand-fix in prod diverges from the repo and is lost on the next deploy.",
        "No last-good artifact exists, so 'rollback' means a slow rebuild."
      ]
    },
    definition: {
      formal: "<b>Rollback</b> returns a system to a previous known-good state. For deployments this means re-pointing to the prior <b>artifact</b>. A <b>forward fix</b> instead ships a new corrected version. Crucially, <b>code/config rollback</b> ≠ <b>data recovery</b>: undoing a deploy does not undo data the bad version already wrote.",
      distinguish: [
        { from: "Rollback vs forward fix", note: "Rollback restores the last-good version fast; a forward fix corrects the problem in a new release. Choose by speed, risk, and whether the old version is still valid." },
        { from: "Code rollback vs data recovery", note: "Re-pointing to the old artifact fixes behavior going forward; it doesn't repair rows already written — those need a backfill/restore." },
        { from: "Config rollback vs code rollback", note: "Sometimes only a config/flag change caused the incident; reverting config is faster and lower-risk than redeploying code." }
      ]
    },
    comparisons: [
      { title: "Rollback vs forward fix", aLabel: "Rollback", bLabel: "Forward fix",
        rows: [
          { dim: "Speed", a: "Fast — re-point to last good", b: "Slower — build + ship a fix" },
          { dim: "Risk", a: "Low if old version still valid", b: "Depends on the fix" },
          { dim: "When", a: "Old version is fine & schema compatible", b: "Can't go back (e.g. migration) — must go forward" }
        ],
        verdict: "Default to rollback when the previous version is still valid; forward-fix when a schema/data change makes going back impossible." }
    ],
    knowledgeChecks: [
      { level: "Explain", q: "You roll back the code but the dashboard is still wrong. Why?",
        options: [
          { label: "Code rollback doesn't undo data the bad version already wrote", ok: true, why: "Data recovery (backfill/restore) is a separate step." },
          { label: "The rollback failed", ok: false, why: "It may have succeeded — the written data is the issue." },
          { label: "Rollbacks never work for data", ok: false, why: "They fix behavior forward; the point is data needs its own recovery." }
        ], revisit: "rollback" },
      { level: "Decide", q: "A migration changed the schema, then a bug appeared. Rollback or forward fix?",
        options: [
          { label: "Often forward fix — you may not be able to go back", ok: true, why: "A schema/data migration can make the old version incompatible." },
          { label: "Always rollback", ok: false, why: "Rolling back code against a migrated schema can break worse." },
          { label: "Do nothing", ok: false, why: "The incident needs a deliberate recovery path." }
        ], revisit: "rollback" },
      { level: "Apply", q: "What makes rollback fast and safe?",
        options: [
          { label: "The last-good artifact still exists and is addressable", ok: true, why: "Re-point to the prior digest — no rebuild under pressure." },
          { label: "A documented manual hot-fix procedure", ok: false, why: "Hand-fixes diverge from the repo and are risky." },
          { label: "Deleting the bad release", ok: false, why: "You need the good one available, not the bad one gone." }
        ], revisit: "artifact-lifecycle" }
    ],
    mastery: {
      task: "Write RetailFlow's recovery plan for a release that produced wrong revenue: cover code rollback, the data recovery step, and verification that the number is right again.",
      acceptance: [
        "Re-points the deployment to the last-good artifact.",
        "Includes a backfill/restore to repair the already-written wrong data.",
        "Verifies correctness (reconciliation) before declaring recovery.",
        "States when you'd forward-fix instead (e.g. after a schema migration)."
      ]
    },
    furtherReading: [
      { title: "Continuous Delivery — deployment pipeline", publisher: "Humble & Farley", url: "https://continuousdelivery.com/", why: "How releasable artifacts and pipelines make safe rollback possible.", read: "Principles; the deployment pipeline.", reviewed: "2026-10-20" }
    ],

    related: ["deployment-strategies", "observability", "environment-promotion", "container-registry"]
  }));
})();
