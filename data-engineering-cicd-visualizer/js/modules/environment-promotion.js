/* modules/environment-promotion.js — Environment Promotion (built on the concept-module factory) */
(function () {
  "use strict";
  var NS = (window.DECICDViz = window.DECICDViz || {});

  NS.registerModule(NS.Concept.build({
    id: "environment-promotion",
    title: "Environment Promotion",
    tool: "--tool-registry",
    icon: "🪜",
    eyebrow: "Real-World Scenario · Environment Promotion",
    subtitle: "Build the revenue processor once, then move that exact same artifact up the ladder — dev → test → staging → prod — changing only configuration, never the code.",
    mentalImage: "SAME ARTIFACT, MOVING FORWARD",

    flowTitle: "One artifact climbing the environments",
    flow: ["Build image once", "DEV", "TEST", "STAGING", "Approval gate", "PRODUCTION"],

    why: "When each environment builds its own copy, prod runs a <i>different</i> binary than the one QA approved — 'works in staging, breaks in prod' becomes routine because the thing you tested was never the thing you shipped.",
    what: "Environment promotion is the practice of <b>building an immutable artifact once</b> and moving that identical artifact through a series of environments, injecting environment-specific configuration and secrets at deploy time.",
    how: "CI builds and tags one image (e.g. <code>revenue-processor:sha-9f3c1</code>). That same digest is deployed to dev, then test, then staging, then — after an approval gate — production. Only environment variables, connection strings, and secrets differ per stage.",

    levels: {
      beginner: [
        { h: "Why environments exist at all", body: "You need somewhere to try a change that <b>isn't</b> the system paying real money. Environments are graduated copies of the pipeline: <b>dev</b> to experiment, <b>test</b> for automated checks, <b>staging</b> as a prod-like rehearsal, and <b>production</b> where the 7 AM dashboard actually reads." },
        { h: "The one-line idea", body: "Like moving one signed contract through departments for sign-off — you don't <i>retype</i> it at each desk. You promote the <b>same</b> artifact; each environment just adds its own stamp (its config)." },
        { h: "RetailFlow example", body: "The revenue processor image built from the net-revenue fix runs first in dev against sample orders, then in test, then staging against a prod-shaped copy — and only then is that identical image released to production." }
      ],
      intermediate: [
        { h: "What changes between environments — and what must not", body: "The <b>artifact never changes</b>. What changes is <i>configuration</i>: the database URL (<code>dev-warehouse</code> vs <code>prod-warehouse</code>), the S3 bucket, the dbt target, warehouse size, and secrets. These come from environment variables or a secret manager, injected at deploy time — not baked into the image." },
        { h: "Config outside the artifact", body: "Follow the Twelve-Factor rule: <b>config lives in the environment</b>. A single <code>revenue-processor</code> image reads <code>DATABASE_URL</code>, <code>ENV=staging</code>, and <code>WAREHOUSE_SIZE</code> at runtime. Swap those values and the same binary behaves correctly in each stage." },
        { h: "Infrastructure separation", body: "Each environment gets its own isolated infra: separate warehouses/schemas, separate buckets, separate service accounts. Dev can never accidentally write to the production <code>orders</code> table because it has no credentials that reach it." }
      ],
      proficient: [
        { h: "Immutable releases & artifact promotion", body: "Promotion means <b>re-tagging or re-deploying the same digest</b>, never rebuilding. <code>revenue-processor@sha256:…</code> promoted to prod is byte-for-byte what staging validated. If you rebuild per environment, you've broken the core guarantee — the prod artifact is unproven." },
        { h: "Approval gates", body: "The dev→test→staging hops can be fully automated; the staging→prod hop is usually a <b>manual approval gate</b> (a GitHub Environments protection rule, an Argo CD sync approval, or a change ticket). A human confirms 'staging looks right' before the same artifact reaches revenue-critical prod." },
        { h: "Rollback = promote the previous artifact", body: "Because releases are immutable and versioned, rollback is trivial: re-point production at the <i>previous</i> known-good digest (<code>revenue-processor:sha-8a1b0</code>). No hotfix build, no scramble — you promote a prior artifact you already trust, and the bad transform stops running within seconds." }
      ]
    },

    micro: [
      { name: "artifact", tip: "The single immutable build output (image, wheel, bundle) that gets promoted." },
      { name: "immutable release", tip: "Once tagged, the artifact's contents never change." },
      { name: "environment", tip: "An isolated copy of the system: dev, test, staging, prod." },
      { name: "promotion", tip: "Moving the same artifact to the next environment." },
      { name: "config injection", tip: "Environment-specific values supplied at deploy, not build." },
      { name: "environment variables", tip: "DATABASE_URL, ENV, WAREHOUSE_SIZE per stage." },
      { name: "secrets", tip: "Credentials pulled from a secret manager per environment." },
      { name: "infrastructure separation", tip: "Separate warehouses, buckets, service accounts per env." },
      { name: "approval gate", tip: "A required human sign-off before production." },
      { name: "image digest", tip: "sha256 content hash that pins the exact artifact." },
      { name: "rollback", tip: "Re-promote the previous known-good artifact." },
      "twelve-factor config"
    ],

    before: ["build per environment", "prod binary ≠ tested binary", "'works in staging' surprises", "config baked into code", "rollback = emergency rebuild"],
    after: ["build once, promote same digest", "prod runs the approved artifact", "config injected per env", "isolated infra per stage", "rollback = re-point to prior digest"],

    failure: {
      title: "Rebuilding the image for production",
      steps: ["Staging tests pass", "prod job rebuilds from main", "a dependency bumps", "different binary ships", "revenue job crashes at 6 AM"],
      explain: "Staging validated an artifact that production then <b>threw away and rebuilt</b>. Promoting the <i>same</i> immutable digest — not rebuilding — guarantees production runs exactly what QA signed off on, so a surprise dependency change can never sneak in between staging and prod."
    },

    whenNot: "Don't promote a <b>single artifact</b> when environments legitimately need different builds (e.g. a totally different data region with different compiled dependencies), and don't over-build the ladder for a throwaway experiment — a personal dev script that never touches shared data doesn't need a four-stage promotion pipeline.",

    story: {
      situation: "RetailFlow's net-revenue fix (<code>net_revenue = gross_revenue - refund_amount</code>) is committed and CI has built <code>revenue-processor:sha-9f3c1</code>.",
      problem: "Finance needs the fix in production, but a wrong revenue number on the exec dashboard is a fireable event — the change must be proven before it runs on real orders.",
      decision: "Promote the <i>one</i> image up the ladder: dev with sample orders, test with automated checks, staging against a prod-shaped warehouse — changing only <code>DATABASE_URL</code>, <code>ENV</code>, and secrets at each hop.",
      tool: "Immutable artifact promotion + a staging→prod approval gate.",
      result: "After staging matches the expected totals, a lead approves the gate and the <b>same</b> <code>sha-9f3c1</code> image is released to prod. The dashboard shows correct net revenue, and the artifact prod runs is the exact one that passed staging.",
      remember: "Build once, promote the same immutable artifact — only config and secrets change per environment, never the code."
    },

    code: [{
      title: "Promote one image through environments (config differs, artifact doesn't)",
      lang: "bash",
      code: "# CI built and pushed ONE immutable image:\n" +
            "IMAGE=registry.retailflow.io/revenue-processor:sha-9f3c1\n\n" +
            "# DEV — same image, dev config\n" +
            "kubectl set image deploy/revenue-processor app=$IMAGE -n dev\n" +
            "#   env: ENV=dev  DATABASE_URL=dev-warehouse  WAREHOUSE_SIZE=xsmall\n\n" +
            "# STAGING — SAME image, staging config\n" +
            "kubectl set image deploy/revenue-processor app=$IMAGE -n staging\n" +
            "#   env: ENV=staging DATABASE_URL=staging-warehouse WAREHOUSE_SIZE=small\n\n" +
            "# PRODUCTION — SAME image, after manual approval gate\n" +
            "kubectl set image deploy/revenue-processor app=$IMAGE -n prod\n" +
            "#   env: ENV=prod DATABASE_URL=prod-warehouse WAREHOUSE_SIZE=large",
      highlights: [2, 12]
    }, {
      title: "GitHub Environments: an approval gate before production",
      lang: "yaml",
      code: "deploy-prod:\n" +
            "  needs: deploy-staging\n" +
            "  runs-on: ubuntu-latest\n" +
            "  environment:\n" +
            "    name: production        # protection rule requires a reviewer\n" +
            "  steps:\n" +
            "    - name: Promote the SAME digest to prod\n" +
            "      run: |\n" +
            "        kubectl set image deploy/revenue-processor \\\n" +
            "          app=registry.retailflow.io/revenue-processor:sha-9f3c1 -n prod",
      highlights: [4, 5]
    }],

    remember: "Build the artifact once and promote that identical, immutable image through dev → test → staging → prod. Only configuration and secrets change per environment — so production always runs exactly what staging approved.",

    retention: {
      question: "RetailFlow validated <code>revenue-processor:sha-9f3c1</code> in staging. What must happen to that artifact on its way to production, and what is allowed to change?",
      answer: "The <b>same immutable artifact</b> (<code>sha-9f3c1</code>) is promoted to production unchanged — no rebuild. Only <b>configuration and secrets</b> (database URL, warehouse size, credentials) differ per environment. Rebuilding for prod would break the guarantee that prod runs what staging approved."
    },

    prerequisites: [
      { id: "artifact-lifecycle", label: "Artifact lifecycle" },
      "container-registry",
      "secrets"
    ],

    production: [
      { h: "Promote the same digest", body: "Re-tag or re-deploy the exact <code>@sha256</code> that staging validated — never rebuild per environment, or prod runs an unproven binary." },
      { h: "Config and secrets per environment", body: "Only <code>DATABASE_URL</code>, <code>ENV</code>, warehouse size, and credentials differ per stage, injected at deploy from env vars / a secret manager (Twelve-Factor), not baked into the image." },
      { h: "Approval gate before prod", body: "Automate dev→test→staging, but require a human sign-off on staging→prod (GitHub Environments protection rule, Argo CD sync approval) before the artifact reaches the revenue-critical path." },
      { h: "Isolate infrastructure per stage", body: "Separate warehouses/schemas, buckets, and service accounts so dev has no credential that can reach RetailFlow's production <code>orders</code> table." },
      { h: "Rollback = promote the prior digest", body: "Because releases are immutable and versioned, re-point prod at the previous known-good digest — no hotfix build, and the bad transform stops within seconds (code only; data repair is separate)." }
    ],

    misconceptions: [
      { myth: "Rebuilding from the same commit in each environment is equivalent to promoting.", truth: "A rebuild can pull a bumped dependency or different base image, so prod gets a <b>different binary</b> than staging approved — only promoting the same digest preserves the guarantee." },
      { myth: "Promotion should carry config along with the artifact.", truth: "Config and secrets must be <b>injected per environment</b> at deploy; baking them into the image means one artifact can't safely move across stages." },
      { myth: "Passing staging means prod is safe to flip automatically.", truth: "For a revenue-critical change, the staging→prod hop should pass a <b>human approval gate</b>; a wrong revenue number on the 7 AM dashboard is a fireable event." },
      { myth: "A successful promotion means the data in prod is correct.", truth: "Promotion guarantees prod runs the <i>approved code</i>; whether it produced right numbers still needs runtime data-quality and observability checks." }
    ],

    troubleshooting: [
      { symptom: "'Works in staging, breaks in prod' at 6 AM.", cause: "Prod rebuilt the image instead of promoting the staged digest, pulling a changed dependency.", fix: "Deploy the exact <code>sha-...</code> staging validated, stop rebuilding per environment, and verify the prod digest matches staging's before release." },
      { symptom: "Same image behaves wrong in one environment.", cause: "Config/secrets were baked into the image rather than injected per stage.", fix: "Externalize <code>DATABASE_URL</code>/<code>ENV</code>/secrets to env vars + secret manager, redeploy the same digest, and verify each stage reads its own config." },
      { symptom: "A change reached prod without review.", cause: "No protection rule on the staging→prod hop.", fix: "Add a GitHub Environments required reviewer (or Argo sync approval) on production, and verify an unapproved promotion is blocked." },
      { symptom: "Dev job wrote to the production warehouse.", cause: "Shared credentials / infra across environments.", fix: "Isolate per-env service accounts and warehouses so dev has no path to prod, then verify dev credentials are rejected by prod resources." },
      { symptom: "Rollback requires an emergency rebuild.", cause: "Deploys used moving tags, so no prior immutable digest is pinned.", fix: "Deploy by digest and keep history, then roll back by re-pointing prod at the previous known-good <code>sha-...</code> and verifying it runs healthy." }
    ],

    interview: [
      { q: "What does 'build once, promote the same artifact' guarantee, and why does rebuilding per environment break it?", a: "It guarantees that production runs the <b>exact binary</b> QA/staging approved. Rebuilding — even from the same commit — can pull a bumped dependency or different base image, so prod runs something never tested. Promoting the same immutable digest (<code>@sha256</code>) is the only way to keep 'what we tested is what we shipped' true." },
      { q: "If the artifact never changes between environments, what <i>does</i> change, and how?", a: "Only <b>configuration and secrets</b> — database URL, bucket, dbt target, warehouse size, credentials. Following Twelve-Factor, these live in the environment and are injected at deploy via env vars and a secret manager. The same <code>revenue-processor</code> image reads <code>ENV=staging</code> vs <code>ENV=prod</code> and behaves correctly in each." },
      { q: "Why is the staging→prod hop usually a manual approval gate when dev→staging is automated?", a: "Dev→test→staging are safe to automate because they don't touch real money or real consumers. The staging→prod hop reaches the revenue-critical path where a wrong number hits the 7 AM exec dashboard, so a human confirms 'staging looks right' first — via a GitHub Environments protection rule, Argo CD approval, or change ticket — before the same artifact is released." },
      { q: "How does immutable artifact promotion make rollback trivial?", a: "Because every release is a pinned, versioned digest, rolling back is just <b>re-pointing prod at the previous known-good digest</b> (<code>sha-8a1b0</code>) — no hotfix build, no scramble, and the bad transform stops within seconds. The caveat: that reverts <i>code</i> only; rows a bad run already wrote still need a separate backfill/restore." }
    ],

    related: ["artifact-lifecycle", "container-registry", "rollback", "secrets"]
  }));
})();
