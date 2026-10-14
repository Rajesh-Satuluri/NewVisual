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
    },

    prerequisites: ["git", "github-actions", "environment-promotion", "secrets"],

    production: [
      { h: "Bundle state and deletions", body: "A bundle deploy reconciles tracked state — resources removed from <code>databricks.yml</code> are destroyed in the target. Review the plan before prod so dropping a job from the YAML doesn't silently delete RetailFlow's running revenue job." },
      { h: "Development vs production mode", body: "<code>mode: development</code> prefixes resources, pauses schedules, and tags runs as dev; <code>mode: production</code> enforces a clean, run-as identity. Deploying a dev-mode bundle to prod leaves schedules paused — the 7 AM revenue job never fires." },
      { h: "Service-principal identity and secrets", body: "Prod should <code>run_as</code> a service principal with a scoped CI token (OIDC), never a person's PAT — a user's token breaks the job the day they leave, and over-broad tokens widen blast radius." },
      { h: "Idempotent re-deploys", body: "<code>bundle deploy</code> is declarative, so re-running the same version is a no-op — but a job that isn't idempotent (non-merge writes) can double-count orders on a retried run; make the task itself idempotent, not just the deploy." },
      { h: "Validate as a gate", body: "<code>bundle validate</code> catches malformed YAML and bad references, but it does not test your transforms — keep <code>pytest</code> and a dev integration run as explicit gates before the prod deploy step." }
    ],

    misconceptions: [
      { myth: "Asset Bundles replace Terraform for Databricks.", truth: "Bundles deploy Databricks <i>assets</i> (jobs, pipelines, notebooks); Terraform provisions the workspace, storage, and account-level infra. They are complementary layers, not substitutes." },
      { myth: "<code>bundle validate</code> proves the job works.", truth: "It only checks the bundle definition is well-formed and references resolve — it runs no transform logic. Correctness still needs pytest plus an integration run on dev data." },
      { myth: "Deploying the same bundle twice could duplicate the job.", truth: "Deploys are declarative and idempotent — the same config reconciles to the same resources. Duplicate <i>data</i> comes from a non-idempotent task, not from re-deploying." },
      { myth: "The dev and prod jobs can drift if you're careful.", truth: "They can't drift by construction when both come from one bundle with per-target overrides — drift only returns the moment someone hand-edits the job in the workspace UI." }
    ],

    troubleshooting: [
      { symptom: "Prod revenue job never runs after a successful deploy.", cause: "The bundle was deployed with <code>mode: development</code>, which pauses schedules.", fix: "Deploy the prod target with <code>mode: production</code>; confirm the job's schedule shows UNPAUSED in the workspace and the next run is queued." },
      { symptom: "Deploy fails with a permissions / 403 error in prod.", cause: "CI is authenticating as a user token without rights, or the service principal lacks CAN_MANAGE on the target.", fix: "Set <code>run_as</code> to the service principal, grant it the needed permissions in the bundle, and re-run; verify the deploy completes and the run owner is the SP." },
      { symptom: "A job disappeared from prod after a refactor.", cause: "The resource was removed from the bundle YAML, so state reconciliation destroyed it.", fix: "Restore the resource definition (or confirm the deletion was intended), re-deploy, and verify the job exists and is scheduled." },
      { symptom: "Retried revenue run double-counts orders.", cause: "The task overwrites with append/insert, not a merge, so a re-run re-inserts rows.", fix: "Make the write idempotent (MERGE on <code>order_id</code> or overwrite the partition); re-run twice and confirm row counts are stable." }
    ],

    interview: [
      { q: "Why aren't generic GitHub Actions enough to deploy a Databricks job?", a: "Actions can test the Python, but a Databricks job is <i>stateful workspace config</i> — notebook, job cluster, schedule, permissions — that lives in the workspace, not in files. <b>Asset Bundles</b> put that config in <code>databricks.yml</code> with per-target overrides so the tested spec is promoted exactly, not recreated by hand." },
      { q: "What's the difference between development and production bundle modes?", a: "<code>development</code> namespaces resources per user, pauses schedules, and tags runs as dev to avoid clobbering shared state; <code>production</code> deploys clean names, runs as a configured identity, and keeps schedules active. Shipping a dev-mode bundle to prod leaves the job paused." },
      { q: "How do bundles keep dev and prod from drifting, and when does drift return?", a: "One bundle defines the resources once and overrides only what differs per <b>target</b>, so both environments are generated from the same source — drift is impossible by construction. It returns the instant someone hand-edits the job in the workspace UI instead of changing the bundle." },
      { q: "A re-run of the revenue job doubled the numbers. Is that a bundle problem?", a: "No — <code>bundle deploy</code> is idempotent, so the deploy isn't the cause. The <i>task</i> isn't idempotent: it appends rather than merging, so a retry re-inserts rows. Fix the write (MERGE on <code>order_id</code> or partition overwrite), not the bundle." }
    ],

    related: ["environment-promotion", "terraform", "secrets", "dbt-cicd"]
  }));
})();
