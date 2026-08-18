/* modules/databricks-bundles.js — Tier 2 · Databricks Asset Bundles (built on the concept-module factory) */
(function () {
  "use strict";
  var NS = (window.DECICDViz = window.DECICDViz || {});

  NS.registerModule(NS.Concept.build({
    id: "databricks-bundles",
    title: "Databricks Asset Bundles",
    tool: "--tool-databricks",
    icon: "🧱",
    eyebrow: "Tier 2 · Data Engineering CI/CD",
    subtitle: "The CI/CD-native way to ship Databricks work — RetailFlow's revenue job, its notebooks, and its cluster config defined as code and promoted dev → test → prod from a single bundle.",
    mentalImage: "ONE BUNDLE → MANY TARGETS",

    flowTitle: "A revenue job promoted through the bundle",
    flow: ["PR", "validate + pytest", "bundle validate", "deploy --target dev", "integration test", "approval", "deploy --target prod"],

    why: "Generic CI/CD builds and tests code, but a Databricks job is code <i>plus</i> a job definition, cluster spec, schedule, and permissions living inside a workspace. Copy-clicking that config between dev and prod is exactly how the revenue job breaks in one environment and not the other.",
    what: "Databricks Asset Bundles (DABs) describe your <b>jobs, notebooks, clusters, and permissions as code</b> in a <code>databricks.yml</code>, with per-environment <b>targets</b>, deployed by the Databricks CLI.",
    how: "You define <b>resources</b> once and override per <b>target</b> (dev/test/prod) with <b>variables</b>; <code>databricks bundle validate</code> checks it, and <code>databricks bundle deploy --target prod</code> pushes the exact tested config into the right workspace.",

    levels: {
      beginner: [
        { h: "The one-line idea", body: "A bundle is <b>your whole Databricks project in a folder</b> — the code, the job that runs it, and the cluster it runs on — all written down so you can deploy it with one command instead of clicking around the workspace." },
        { h: "Why not just Actions?", body: "GitHub Actions can test your Python fine. But your <b>job definition</b> (which notebook, what schedule, which cluster, who can run it) lives inside Databricks. Bundles put <i>that</i> config in code too, so nothing is set up by hand." },
        { h: "One bundle, many targets", body: "A <b>target</b> is an environment — <code>dev</code>, <code>test</code>, <code>prod</code>. The same bundle deploys to each, changing only what differs (workspace URL, cluster size, schedule). The revenue job you tested in dev is the same job that runs in prod." }
      ],
      intermediate: [
        { h: "databricks.yml & resources", body: "The <code>databricks.yml</code> is the entry point: it names the bundle, includes <b>resources</b> (jobs, pipelines defined in <code>resources/*.yml</code>), and declares <b>targets</b>. A job resource points at your notebook/wheel, its <b>job cluster</b>, tasks, and schedule." },
        { h: "Targets, variables & overrides", body: "Set defaults once, then override per target: dev uses a tiny single-node cluster and no schedule; prod uses an autoscaling cluster and a 6 AM cron. <b>Variables</b> parameterize names and sizes so there's one definition, not three copies." },
        { h: "Permissions & environment config", body: "Bundles set <b>permissions</b> as code — dev is writable by the team, prod is run-only for a service principal and CAN_MANAGE for the platform group. Environment-specific config (catalog, schema, storage path) lives in each target block." }
      ],
      proficient: [
        { h: "The CI/CD promotion flow", body: "The pipeline: PR → <code>pytest</code> the transforms → <code>bundle validate</code> → <code>bundle deploy --target dev</code> → run an <b>integration test</b> job on real dev data → <b>manual approval</b> → <code>bundle deploy --target prod</code>. Prod only ever receives config that passed every earlier gate." },
        { h: "Why generic CI/CD isn't enough", body: "Databricks assets are stateful workspace objects, not just files. Bundles give them idempotent, declarative deploys with a state/lock model and per-target isolation — so \"deploy the job\" is reproducible instead of a human recreating it click-by-click in prod." },
        { h: "Service principals & isolation", body: "Prod deploys run as a <b>service principal</b>, not a person, using OIDC or a scoped token from CI secrets. Separate workspaces (or catalogs) per target keep a dev mistake from ever touching production revenue data." }
      ]
    },

    micro: ["bundle", "databricks.yml", "resources", "jobs", "targets", "dev/test/prod", "variables",
      "job cluster", "permissions", "service principal", "bundle validate", "bundle deploy", "artifacts", "sync"],

    before: ["click-configure the job in prod", "dev and prod drift apart", "\"works in dev\" only", "no record of the job spec", "manual promotion"],
    after: ["job defined in code", "one bundle, per-target overrides", "validate + deploy commands", "gated dev → prod promotion", "reproducible in any workspace"],

    failure: {
      title: "Promoting the tested revenue job to prod, safely",
      steps: ["PR with fixed formula", "pytest + bundle validate ✅", "deploy --target dev", "integration test on dev data ✅", "manual approval", "deploy --target prod"],
      explain: "The corrected net-revenue job is validated, deployed to <b>dev</b>, and run against real dev data to confirm the totals. Only after an <b>approval</b> does <code>bundle deploy --target prod</code> push the <i>identical</i> config to production — no one hand-edits the prod job, so dev and prod can't silently diverge."
    },

    whenNot: "Bundles are for deploying and versioning Databricks <i>assets</i> (jobs, DLT pipelines, notebooks, clusters) — not for orchestrating runtime dependencies between tasks (that's the job/DLT graph) or for managing non-Databricks cloud infra (use Terraform for the workspace and storage themselves).",

    story: {
      situation: "RetailFlow's Daily Revenue job has a corrected formula tested and green in CI.",
      problem: "Getting it live has meant a human recreating the job config in the prod workspace — error-prone, and dev and prod slowly drift.",
      decision: "The job, its cluster, schedule, and permissions are defined in a bundle with <code>dev</code> and <code>prod</code> targets.",
      tool: "Databricks Asset Bundles deployed via the Databricks CLI in CI.",
      result: "After tests and a dev integration run, one approved <code>bundle deploy --target prod</code> promotes the exact tested config — dev and prod stay identical by construction.",
      remember: "Define the Databricks job once as code; promote it dev → prod with a command, not clicks — the config that passed is the config that ships."
    },

    code: [{
      title: "databricks.yml — one job, dev and prod targets",
      lang: "yaml",
      code: "bundle:\n" +
            "  name: retailflow-revenue\n" +
            "\n" +
            "include:\n" +
            "  - resources/jobs.yml   # src/bronze|silver|gold, tests/ live alongside\n" +
            "\n" +
            "variables:\n" +
            "  warehouse_size:\n" +
            "    default: Small\n" +
            "\n" +
            "targets:\n" +
            "  dev:\n" +
            "    mode: development\n" +
            "    default: true\n" +
            "    workspace:\n" +
            "      host: https://adb-dev.azuredatabricks.net\n" +
            "  prod:\n" +
            "    mode: production\n" +
            "    workspace:\n" +
            "      host: https://adb-prod.azuredatabricks.net\n" +
            "    variables:\n" +
            "      warehouse_size: Large\n" +
            "    run_as:\n" +
            "      service_principal_name: sp-retailflow-prod",
      highlights: [11, 12, 17, 24]
    }, {
      title: "CI promotion: validate → dev → approve → prod",
      lang: "bash",
      code: "pytest -q\n" +
            "databricks bundle validate\n" +
            "databricks bundle deploy --target dev\n" +
            "databricks bundle run revenue_daily --target dev   # integration test\n" +
            "# --- manual approval gate in the workflow ---\n" +
            "databricks bundle deploy --target prod",
      highlights: [2, 3, 6]
    }],

    remember: "A bundle is the whole Databricks job — code, cluster, schedule, permissions — as one versioned unit; <code>bundle deploy --target</code> promotes the tested config dev → prod without a human ever recreating it.",

    retention: {
      question: "Why is generic GitHub Actions CI/CD not enough for RetailFlow's Databricks revenue job, and what do Asset Bundles add?",
      answer: "Generic CI only tests the Python; the <b>job definition</b> — notebook, cluster, schedule, permissions — is stateful config inside the Databricks workspace. <b>Asset Bundles</b> put that config in code (<code>databricks.yml</code>) with per-environment <b>targets</b>, so <code>bundle deploy --target prod</code> promotes the exact tested job spec instead of a human recreating it by hand."
    }
  }));
})();
