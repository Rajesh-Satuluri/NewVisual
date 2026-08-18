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
    }
  }));
})();
