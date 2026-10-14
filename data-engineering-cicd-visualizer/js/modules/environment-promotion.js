/* modules/environment-promotion.js — Environment Promotion (built on the concept-module factory) */
(function () {
  "use strict";
  var NS = (window.DECICDViz = window.DECICDViz || {});

  var concept = NS.Concept.build({
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
  });

  // ── Chapter 3 · Code Change → Production (implementation walkthrough) ──
  // One representative change (the net-revenue fix) tracked through 10
  // steps with coherent, consistent reference files. Everything here is
  // a labelled REFERENCE IMPLEMENTATION / PSEUDOCODE — simplified,
  // internally consistent, and NOT a real company's private config.
  var STEPS = [
    {
      t: "Identify the change", tier: "reference",
      what: "A metric is wrong: <code>net_revenue</code> adds refunds instead of subtracting them, so the 7 AM dashboard overstates revenue. Ticket <b>REV-482</b> asks to fix the definition and backfill history.",
      why: "Before touching code, the team records the affected datasets (<code>fct_revenue</code>, every dashboard built on it), the risk (a wrong exec number), and acceptance criteria — so reviewers and CI know what 'done' means.",
      io: { in: "Bug report from Finance", out: "Ticket REV-482 with acceptance criteria" },
      fail: "Skipping this step → a fix with no agreed definition of correct, so no test can gate it.",
      files: [{ title: "ticket REV-482 (acceptance criteria)", lang: "text",
        code: "Title: Fix net_revenue — subtract refunds, not add\n" +
          "Affected: dbt model fct_revenue, exec revenue dashboard\n" +
          "Accept:\n" +
          "  - net_revenue(gross=100, refund=20) == 80\n" +
          "  - fct_revenue.order_id is unique (no fan-out)\n" +
          "  - history recomputed (backfill) after deploy" }]
    },
    {
      t: "Source control", tier: "reference",
      what: "Create a branch, make the one-line change, commit, open <b>PR #482</b> against <code>main</code> with required checks and a reviewer.",
      why: "The change lives in isolation until a human reviews it and CI is green. Branch protection makes review + green checks mandatory to merge.",
      io: { in: "Ticket REV-482", out: "PR #482 on feature/fix-net-revenue" },
      fail: "Committing straight to main bypasses review and CI — the bad number ships unchecked.",
      files: [{ title: "branch, commit, PR", lang: "bash",
        code: "git checkout -b feature/fix-net-revenue\n" +
          "# edit src/transforms/revenue.py (one line)\n" +
          "git commit -am \"Fix net_revenue: subtract refunds, not add\"\n" +
          "git push -u origin feature/fix-net-revenue\n" +
          "gh pr create --fill --base main   # -> PR #482", highlights: [2] },
        { title: "src/transforms/revenue.py", lang: "python",
        code: "df = df.withColumn(\n" +
          "    \"net_revenue\",\n" +
          "    F.col(\"gross_revenue\") - F.col(\"refund_amount\"),  # was: +\n" +
          ")", highlights: [3] }]
    },
    {
      t: "Automated validation", tier: "reference",
      what: "On the PR, CI runs: format/lint, <b>pytest</b> (the net_revenue assertion), <b>dbt build + tests</b> (uniqueness on order_id), <b>Airflow DAG import</b> check, and a dependency scan.",
      why: "Each check maps to one acceptance criterion. A red check blocks merge — correctness is enforced here, not hoped for later.",
      io: { in: "PR #482 commit", out: "Pass/fail checks" },
      fail: "The wrong formula makes pytest get 120 ≠ 80 → the check fails → the PR cannot merge. That is the gate working.",
      files: [{ title: "tests/test_revenue.py", lang: "python",
        code: "def test_net_revenue_subtracts_refunds():\n" +
          "    assert net_revenue(gross=100, refund=20) == 80\n" +
          "    # with the bug (gross+refund) this returns 120 and FAILS" },
        { title: ".github/workflows/ci.yml (validation jobs)", lang: "yaml",
        code: "on: [pull_request]\n" +
          "jobs:\n" +
          "  validate:\n" +
          "    runs-on: ubuntu-latest\n" +
          "    steps:\n" +
          "      - uses: actions/checkout@v4\n" +
          "      - run: ruff check . && black --check .\n" +
          "      - run: pytest -q\n" +
          "      - run: dbt build --select state:modified+ --fail-fast\n" +
          "      - run: python -c \"from airflow.models import DagBag; assert not DagBag().import_errors\"\n" +
          "      - run: pip-audit", highlights: [7, 8, 9] }]
    },
    {
      t: "Build & artifact", tier: "reference",
      what: "After checks pass, CI builds <b>one</b> immutable image, tags it by commit SHA, and pushes it to the registry.",
      why: "The deployable artifact is built once and promoted unchanged. Pinned dependencies + the SHA tag make it traceable and reproducible.",
      io: { in: "Validated source @ commit 9f3c1", out: "revenue-processor:sha-9f3c1 (by digest)" },
      fail: "Rebuilding per environment can pull a bumped dependency → prod runs a binary staging never tested.",
      files: [{ title: "docker/Dockerfile (pinned, non-root)", lang: "dockerfile",
        code: "FROM python:3.11-slim@sha256:<pinned>\n" +
          "COPY requirements.lock .\n" +
          "RUN pip install --no-cache-dir -r requirements.lock\n" +
          "COPY src/ /app/src/\n" +
          "USER 1001\n" +
          "ENTRYPOINT [\"python\", \"-m\", \"src.transforms.revenue\"]" },
        { title: "build + push by SHA", lang: "bash",
        code: "SHA=$(git rev-parse --short HEAD)   # 9f3c1\n" +
          "docker build -t registry.retailflow.io/revenue-processor:sha-$SHA .\n" +
          "docker push registry.retailflow.io/revenue-processor:sha-$SHA" }]
    },
    {
      t: "Infrastructure & config", tier: "reference",
      what: "If infra must change (warehouse size, a new table), <b>Terraform</b> plans it in the PR and applies after approval. Per-env values live in config files; secrets come from a manager at deploy.",
      why: "Infra is code too: a reviewed plan, an approved apply, no portal clicks. Config and secrets stay OUT of the image so one artifact runs everywhere.",
      io: { in: "HCL + per-env config", out: "Applied infra; config injected at deploy" },
      fail: "A manual portal change → drift; the next plan shows surprise diffs and prod stops matching code.",
      files: [{ title: "infrastructure/warehouse.tf", lang: "hcl",
        code: "resource \"databricks_sql_warehouse\" \"revenue\" {\n" +
          "  name          = \"revenue-${var.env}\"\n" +
          "  cluster_size  = var.warehouse_size   # xsmall dev / large prod\n" +
          "  auto_stop_mins = 10\n" +
          "}" },
        { title: "config/prod.yml (no secrets committed)", lang: "yaml",
        code: "env: prod\n" +
          "database_url: ${DATABASE_URL}     # injected from secret manager\n" +
          "warehouse_size: large\n" +
          "dbt_target: prod" }]
    },
    {
      t: "Environment promotion", tier: "reference",
      what: "The same <code>sha-9f3c1</code> image moves dev → test → staging → prod. Only config/secrets change. The staging→prod hop requires a human approval.",
      why: "Each stage validates against more prod-like data. Automating up to staging is safe; the revenue-critical prod hop gets a gate because a wrong number is a fireable event.",
      io: { in: "revenue-processor:sha-9f3c1", out: "Same digest running in each env" },
      fail: "Flipping to prod automatically on a green staging → an unreviewed revenue change reaches the exec dashboard.",
      files: [{ title: "promote the SAME digest", lang: "bash",
        code: "IMAGE=registry.retailflow.io/revenue-processor:sha-9f3c1\n" +
          "kubectl set image deploy/revenue app=$IMAGE -n dev\n" +
          "kubectl set image deploy/revenue app=$IMAGE -n staging\n" +
          "# prod: only after the approval gate below\n" +
          "kubectl set image deploy/revenue app=$IMAGE -n prod" }]
    },
    {
      t: "Production deployment", tier: "reference",
      what: "A <b>GitHub Actions</b> deploy job, gated by a protected <code>production</code> environment, promotes the digest and (separately) does NOT yet run data.",
      why: "The deploy mechanism is itself code and auditable. The protection rule is the concrete thing that stops an unapproved promotion.",
      io: { in: "Approved release", out: "Prod pointing at sha-9f3c1" },
      fail: "No environment protection → anyone merging can ship to prod.",
      files: [{ title: ".github/workflows/deploy.yml (prod job)", lang: "yaml",
        code: "deploy-prod:\n" +
          "  needs: deploy-staging\n" +
          "  runs-on: ubuntu-latest\n" +
          "  environment:\n" +
          "    name: production        # required reviewer protection rule\n" +
          "  steps:\n" +
          "    - name: Promote the SAME digest\n" +
          "      run: kubectl set image deploy/revenue \\\n" +
          "             app=registry.retailflow.io/revenue-processor:sha-9f3c1 -n prod", highlights: [4, 5] }]
    },
    {
      t: "Runtime execution", tier: "reference",
      what: "Deploying the code is NOT running the pipeline. Airflow triggers the scheduled run that reads orders, recomputes <code>fct_revenue</code>, and writes Gold — idempotently, so a rerun overwrites its partition instead of doubling it.",
      why: "This is the data-flow half. Idempotent, partitioned writes make reruns and backfills safe — essential because the fix also needs history recomputed.",
      io: { in: "Deployed DAG + image", out: "Fresh fct_revenue partition" },
      fail: "Non-idempotent append → a rerun doubles revenue; late source feed → stale partition.",
      files: [{ title: "airflow/dags/daily_revenue.py (idempotent write)", lang: "python",
        code: "@task\n" +
          "def write_gold(df, ds):\n" +
          "    (df.write.mode(\"overwrite\")          # not append → rerun-safe\n" +
          "       .option(\"replaceWhere\", f\"date = '{ds}'\")\n" +
          "       .saveAsTable(\"gold.fct_revenue\"))", highlights: [3, 4] }]
    },
    {
      t: "Production verification", tier: "reference",
      what: "After the run, assertions prove the <b>data</b> is right: net_revenue invariant, uniqueness, freshness, and reconciliation against the source total.",
      why: "A green deploy and a green job are not proof of correct numbers. These checks are the only thing that proves the business outcome.",
      io: { in: "fct_revenue partition", out: "Pass/fail data assertions" },
      fail: "Treating 'job succeeded' as 'data correct' → a silently-wrong dashboard at 7 AM.",
      files: [{ title: "sql/verify_revenue.sql", lang: "sql",
        code: "-- 1. invariant: net = gross - refund\n" +
          "SELECT count(*) AS bad FROM gold.fct_revenue\n" +
          "WHERE net_revenue <> gross_revenue - refund_amount;   -- expect 0\n\n" +
          "-- 2. freshness: today is present\n" +
          "SELECT max(order_date) = current_date AS fresh FROM gold.fct_revenue;\n\n" +
          "-- 3. reconcile against source within tolerance\n" +
          "SELECT abs(sum(net_revenue) - (SELECT net FROM finance.source_totals)) < 1.0 AS ok\n" +
          "FROM gold.fct_revenue;" }]
    },
    {
      t: "Traceability", tier: "reference",
      what: "Any production number traces back through the full chain: run → artifact digest → deploy → merged PR → CI results → commit → ticket.",
      why: "During an audit or incident you can answer 'where did this number come from?' in minutes — the chain is the evidence.",
      io: { in: "A row in fct_revenue", out: "The commit + PR + CI that produced it" },
      fail: "Mutable :latest tags or portal deploys break the chain — you can't prove what ran.",
      files: [{ title: "the traceability chain", lang: "text",
        code: "dashboard number\n" +
          "  <- gold.fct_revenue run 2026-10-14 (Airflow run_id=…)\n" +
          "  <- image revenue-processor:sha-9f3c1 (digest sha256:…)\n" +
          "  <- deploy.yml run #468 (approved by lead)\n" +
          "  <- PR #482 merged (CI green: pytest, dbt, DAG import)\n" +
          "  <- commit 9f3c1 'Fix net_revenue'\n" +
          "  <- ticket REV-482" }]
    }
  ];

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function renderWalkthrough(container) {
    var E = NS.Evidence;
    var sec = document.createElement("section");
    sec.className = "section wt";
    sec.innerHTML =
      '<h2 class="section-title">Walkthrough: one change, ten steps to production</h2>' +
      '<p class="cs-lead">A representative change — fixing the <code>net_revenue</code> metric — tracked from ticket to a ' +
      "verified production number. The files are a <b>consistent reference implementation</b>: same repo, branch, PR #482, and " +
      "image digest throughout. Click a step to open its code.</p>" +
      (E && E.ready() ? E.legend() : "");

    var layout = document.createElement("div");
    layout.className = "wt-layout";
    var steps = document.createElement("ol");
    steps.className = "wt-steps";
    steps.innerHTML = STEPS.map(function (s, i) {
      return '<li><button type="button" class="wt-step' + (i === 0 ? " active" : "") +
        '" data-i="' + i + '"><span class="wt-step-n">' + (i + 1) + "</span>" +
        '<span class="wt-step-t">' + esc(s.t) + "</span></button></li>";
    }).join("");
    var detail = document.createElement("div");
    detail.className = "wt-detail";
    layout.appendChild(steps);
    layout.appendChild(detail);
    sec.appendChild(layout);
    container.appendChild(sec);

    function paint(i) {
      var s = STEPS[i];
      steps.querySelectorAll(".wt-step").forEach(function (b) {
        b.classList.toggle("active", +b.getAttribute("data-i") === i);
      });
      detail.innerHTML =
        '<div class="wt-detail-head"><span class="wt-detail-n">Step ' + (i + 1) + " / " + STEPS.length + "</span>" +
          '<h3 class="wt-detail-t">' + esc(s.t) + "</h3>" +
          (NS.Evidence && NS.Evidence.ready() ? NS.Evidence.badge(s.tier) : "") + "</div>" +
        '<p class="wt-what">' + s.what + "</p>" +
        '<p class="wt-why"><b>Why:</b> ' + s.why + "</p>" +
        '<div class="wt-io">' +
          '<span class="wt-io-k">In</span><span>' + esc(s.io.in) + "</span>" +
          '<span class="wt-io-k">Out</span><span>' + esc(s.io.out) + "</span>" +
        "</div>" +
        '<div class="wt-fail">💥 ' + s.fail + "</div>" +
        '<div class="wt-code"></div>';
      var codeWrap = detail.querySelector(".wt-code");
      if (NS.CodeViewer && codeWrap) {
        s.files.forEach(function (f) {
          codeWrap.appendChild(NS.CodeViewer.create({
            title: f.title, lang: f.lang, code: f.code, highlights: f.highlights || []
          }));
        });
      }
    }
    steps.addEventListener("click", function (e) {
      var b = e.target.closest(".wt-step");
      if (b) paint(+b.getAttribute("data-i"));
    });
    paint(0);
  }

  // Wrapper module: Chapter-3 walkthrough on top, then the preserved
  // Environment-Promotion concept module below.
  NS.registerModule({
    id: "environment-promotion",
    title: concept.title,
    render: function (container) {
      var E = NS.Evidence;
      container.innerHTML =
        '<div class="module-header animate-fade-in-up">' +
          '<div class="module-eyebrow">📘 Case Study · Chapter 3 of 4</div>' +
          '<h1 class="module-title gradient-text">A Code Change Travels to Production</h1>' +
          '<p class="module-subtitle">The most hands-on chapter: exactly how a representative change is built, validated, ' +
          "packaged, promoted, run, verified, and traced — step by step, with the real files.</p>" +
        "</div>";
      if (E && E.ready()) {
        var cn = document.createElement("div");
        cn.innerHTML = E.chapterNav("environment-promotion") +
          '<section class="section">' + E.claimGroup("workflow") +
          '<p class="cs-ref-link">Full sources are listed in <a href="#business-scenario">Chapter 1 · References</a>.</p></section>';
        container.appendChild(cn);
      }
      renderWalkthrough(container);

      if (E && E.ready()) {
        container.appendChild(E.learningCheck([{
          q: "You fixed and deployed a metric definition, but historical dashboard values still show the old numbers. Why?",
          options: [
            { label: "The deploy failed.", ok: false, why: "The deploy succeeded — deploying a new definition doesn’t recompute rows that were already written." },
            { label: "Deploying new code doesn’t rewrite old data — you must backfill / reprocess history.", ok: true, why: "A code change is not a data change; history needs an idempotent backfill to be recomputed." },
            { label: "Dashboards cache forever — clear the cache.", ok: false, why: "The stored values themselves are old; they must be recomputed, not just re-fetched." }
          ]
        }]));
      }

      // Divider, then the preserved concept module (promotion deep-dive).
      var div = document.createElement("div");
      div.className = "cs-sandbox-note";
      div.innerHTML = "📚 <div><b>Deep dive below.</b> The original Environment-Promotion lesson (build-once-promote, " +
        "approval gates, rollback) is preserved in full as the reference for this chapter's promotion step.</div>";
      container.appendChild(div);
      var sub = document.createElement("div");
      container.appendChild(sub);
      try { concept.render(sub); } catch (e) { console.error("concept render error:", e); }

      if (E && E.ready()) {
        var pn = document.createElement("div");
        pn.innerHTML = E.chapterPrevNext("environment-promotion");
        container.appendChild(pn);
      }
    },
    destroy: function () { try { concept.destroy && concept.destroy(); } catch (e) {} }
  });
})();
