/* modules/github-actions.js — Tier 2 · GitHub Actions (built on the concept-module factory) */
(function () {
  "use strict";
  var NS = (window.DECICDViz = window.DECICDViz || {});

  NS.registerModule(NS.Concept.build({
    id: "github-actions",
    title: "GitHub Actions",
    tool: "--tool-ci",
    icon: "🔄",
    eyebrow: "Tier 2 · Data Engineering CI/CD",
    subtitle: "The robot that runs on every push — lint, test, and dbt-check RetailFlow's revenue pipeline automatically, so a broken change is caught in minutes, not at 7 AM.",
    mentalImage: "ROBOT ON EVERY PUSH",

    flowTitle: "The CI workflow on each push",
    flow: ["push", "checkout", "setup Python", "install deps", "lint", "pytest", "dbt test", "docker build", "artifact"],

    why: "Manual testing doesn't scale: humans forget to run the suite, run it on the wrong branch, or skip it under deadline. Every unchecked push is a chance for the refund bug to reach production.",
    what: "GitHub Actions is <b>CI/CD automation built into GitHub</b>: you describe workflows in YAML, and GitHub runs them on real machines whenever an event (push, PR, schedule) fires.",
    how: "An <b>event</b> triggers a <b>workflow</b>; the workflow runs <b>jobs</b> on <b>runners</b>; each job runs <b>steps</b> (shell commands or reusable <b>actions</b>) and can produce <b>artifacts</b> and gate deploys behind <b>approval</b>.",

    levels: {
      beginner: [
        { h: "The one-line idea", body: "GitHub Actions is a <b>tireless robot teammate</b>. Every time someone pushes code, it checks out the repo, installs everything, and runs the tests — reporting green or red right on the pull request." },
        { h: "Workflow = a recipe file", body: "You put a YAML file in <code>.github/workflows/</code>. It lists <b>on</b> (when to run), and <b>jobs</b> → <b>steps</b> (what to do). GitHub reads it and does the work on a fresh virtual machine called a <b>runner</b>." },
        { h: "RetailFlow example", body: "When the engineer pushes the net-revenue fix, the workflow runs <code>pytest</code> automatically. If <code>test_net_revenue</code> fails, the PR shows a red X and the merge stays blocked." }
      ],
      intermediate: [
        { h: "Jobs, steps & actions", body: "A <b>job</b> is a group of <b>steps</b> on one runner. A <b>step</b> is either a shell command (<code>run:</code>) or an <b>action</b> — a reusable package like <code>actions/checkout@v4</code> or <code>actions/setup-python@v5</code>. Jobs run in parallel unless you add <code>needs:</code>." },
        { h: "Matrix, cache & artifacts", body: "A <b>matrix</b> runs the same job across versions (Python 3.10/3.11/3.12) in parallel. <b>Cache</b> (<code>actions/cache</code>) speeds up repeated pip installs. <b>Artifacts</b> (<code>upload-artifact</code>) save build outputs — the test report, the coverage file, the Docker image tag." },
        { h: "Secrets & environments", body: "Reference credentials as <code>${{ secrets.DATABRICKS_TOKEN }}</code> — encrypted and masked in logs. Tie a deploy job to an <b>environment</b> (prod) that requires manual <b>approval</b> before it runs, giving a human the final say on production." }
      ],
      proficient: [
        { h: "Reusable & composite workflows", body: "Factor shared CI into a <b>reusable workflow</b> (<code>on: workflow_call</code>) that every RetailFlow repo calls — one place to fix the test setup. Composite actions bundle repeated steps. DRY beats copy-pasting YAML across 20 repos." },
        { h: "Status checks as merge gates", body: "Each job publishes a <b>status check</b>. Mark <code>test</code> and <code>lint</code> as <b>required</b> in branch protection — now the merge button is literally wired to the robot's verdict, not a promise that someone ran tests locally." },
        { h: "Runners, cost & security", body: "GitHub-hosted runners are convenient; <b>self-hosted</b> runners reach private VPC data warehouses but must be hardened. Pin actions to a commit SHA (not a moving tag), use OIDC instead of stored cloud keys, and scope <code>permissions:</code> to least privilege." }
      ]
    },

    micro: ["workflow", "event", "trigger", "job", "runner", "step", "action", "uses", "run", "matrix",
      "artifact", "cache", "secret", "variable", "environment", "approval", "needs", "reusable workflow",
      "status check", "concurrency", "permissions", "OIDC"],

    before: ["\"did you run the tests?\"", "tests skipped under deadline", "broken merge to main", "found broken at 7 AM", "manual deploys"],
    after: ["tests run on every push", "red X blocks merge", "matrix across versions", "artifacts saved", "gated prod deploy"],

    failure: {
      title: "The refund bug caught by CI before merge",
      steps: ["push net-revenue change", "checkout + setup-python", "pip install", "pytest runs", "test_net_revenue fails ❌", "PR merge blocked"],
      explain: "The engineer's own unit test asserts <code>net_revenue == gross - refunds</code>. On push, Actions runs it automatically; the failing assertion turns the required status check red, and branch protection refuses the merge — the pipeline caught its own bug in ~90 seconds."
    },

    whenNot: "Actions isn't a general-purpose job scheduler or an orchestrator for long data pipelines — use Airflow/Databricks for that. It's for CI/CD around your code: build, test, and deploy triggered by repository events, not for running your nightly 3-hour Spark job.",

    story: {
      situation: "RetailFlow opens PR #482 with the corrected net-revenue formula.",
      problem: "Nobody wants to trust that the author remembered to run every test on the right branch and Python version.",
      decision: "A <code>ci.yml</code> workflow runs on every push: checkout, setup Python, install, lint, pytest, and dbt test.",
      tool: "GitHub Actions CI workflow wired as a required status check.",
      result: "Every push re-runs the full suite automatically; the PR shows a green check only when it's genuinely safe to merge.",
      remember: "CI isn't about running tests once — it's about running them <i>every single time</i>, automatically, so \"it works on my machine\" stops being the standard."
    },

    code: [{
      title: ".github/workflows/ci.yml — run tests on every push",
      lang: "yaml",
      code: "name: CI\n" +
            "on:\n" +
            "  push:\n" +
            "  pull_request:\n" +
            "    branches: [main]\n" +
            "jobs:\n" +
            "  test:\n" +
            "    runs-on: ubuntu-latest\n" +
            "    strategy:\n" +
            "      matrix:\n" +
            "        python-version: [\"3.11\", \"3.12\"]\n" +
            "    steps:\n" +
            "      - uses: actions/checkout@v4\n" +
            "      - uses: actions/setup-python@v5\n" +
            "        with:\n" +
            "          python-version: ${{ matrix.python-version }}\n" +
            "      - name: Install deps\n" +
            "        run: pip install -r requirements.txt\n" +
            "      - name: Lint\n" +
            "        run: ruff check .\n" +
            "      - name: Run tests\n" +
            "        run: pytest -q\n" +
            "      - name: dbt tests\n" +
            "        run: dbt test --select revenue",
      highlights: [13, 14, 22]
    }],

    remember: "One YAML file in <code>.github/workflows/</code> turns every push into checkout → install → lint → test → build — the same steps, every time, gating the merge on a green result.",

    retention: {
      question: "RetailFlow wants the revenue test suite to run automatically on every push and block the merge if it fails. Which GitHub Actions pieces make that happen?",
      answer: "A <b>workflow</b> triggered by the <code>push</code>/<code>pull_request</code> <b>event</b>, with a <b>job</b> whose <b>steps</b> checkout, install, and run <code>pytest</code>. Marking that job's <b>status check</b> as <b>required</b> in branch protection wires the green result to the merge button."
    },

    prerequisites: ["github", "git", "ci-vs-cd"],

    // ── Deep-theory layer (golden template, Iteration 3) ──────
    problem: {
      before: "Before CI, teams ran tests <i>manually</i> on their own laptops before merging — if they remembered. Integration happened rarely and in big, scary batches; a shared branch would sit broken for hours while people argued about whose change did it.",
      insufficient: "Manual testing doesn't scale with team size or deadline pressure. Someone always runs the suite on the wrong branch, on a stale dependency set, or skips it to ship before 7 AM. \"It works on my machine\" becomes the de-facto quality bar — and that machine is never production.",
      failureModes: [
        "A change merges because the author <i>believed</i> the tests passed, but never actually ran them on the final diff.",
        "Tests pass on one engineer's Python 3.12 and fail on the runner's 3.11 — an environment difference nobody saw.",
        "The bad merge only surfaces hours later when the nightly job produces a wrong number on the executive dashboard."
      ]
    },

    intuition: {
      plain: "GitHub Actions is a tireless teammate that watches your repository. Whenever something happens that you care about — a push, a pull request, a nightly timer — it spins up a clean computer, follows a checklist you wrote, and reports back pass or fail, in the open, on the pull request.",
      analogy: "Think of a factory conveyor belt with inspection stations: every product (commit) rides the same belt and passes the same checks in the same order, so nothing ships without being inspected.",
      breaks: "A conveyor belt processes one item at a time in a fixed line; Actions runs <i>jobs in parallel</i> by default and each job gets its own fresh machine that is thrown away afterwards — there is no shared belt state between them unless you explicitly pass an artifact."
    },

    definition: {
      formal: "GitHub Actions is an event-driven automation platform built into GitHub. A <b>workflow</b> is a YAML file in <code>.github/workflows/</code> that declares <b>events</b> it responds to and one or more <b>jobs</b>; each job runs on a <b>runner</b> and executes an ordered list of <b>steps</b> (shell commands or reusable <b>actions</b>). A workflow <i>run</i> is one execution of a workflow for a specific event and commit.",
      distinguish: [
        { from: "Workflow vs job vs step", note: "A <b>workflow</b> is the whole file; a <b>job</b> is a unit that runs on one runner; a <b>step</b> is a single command or action inside a job. Confusing them leads to expecting steps in different jobs to share files (they don't)." },
        { from: "Action vs workflow", note: "An <b>action</b> (<code>actions/checkout</code>) is a reusable building block used by a step via <code>uses:</code>. A <b>workflow</b> orchestrates steps and actions. People say \"an Action\" loosely for both — keep them separate." },
        { from: "CI platform vs orchestrator", note: "Actions is for CI/CD around repository events, not for running a 3-hour nightly Spark pipeline — that's Airflow/Databricks." }
      ]
    },

    mechanics: [
      { h: "Event → workflow run", body: "A repository <b>event</b> (push, pull_request, schedule, workflow_dispatch) that matches a workflow's <code>on:</code> filters creates one <b>workflow run</b>. The run uses a snapshot of the workflow file from the ref that triggered it — so changing the YAML affects future runs, not the one in flight." },
      { h: "Jobs land on fresh, isolated runners", body: "Each <b>job</b> is scheduled onto a <b>runner</b> — a clean VM or container chosen by <code>runs-on</code>. Jobs are isolated: they share <i>no</i> filesystem or memory. Anything one job needs from another must travel as an <b>artifact</b> or job <b>output</b>." },
      { h: "Steps are processes; exit codes decide fate", body: "Within a job, <b>steps</b> run top-to-bottom on the same runner. Each <code>run:</code> step launches a shell process; a <b>non-zero exit code</b> fails the step, which by default fails the job, which fails the run. <code>if:</code> and <code>continue-on-error</code> override this." },
      { h: "Job dependencies form a DAG", body: "Jobs run in <b>parallel</b> by default. <code>needs:</code> declares dependencies, turning jobs into a directed graph; if a needed job fails, its dependents are skipped. This is how you fan out tests and fan in a deploy." },
      { h: "Artifacts vs cache — different guarantees", body: "An <b>artifact</b> is an immutable output you deliberately persist (a test report, a built image tag) — reliable and retained. A <b>cache</b> is a best-effort speed optimization keyed by a hash; a cache <i>miss</i> is normal and must never change correctness." },
      { h: "Status checks wire results to the merge button", body: "Each job publishes a <b>status check</b> on the commit. Branch protection can mark specific checks <b>required</b>, so the merge button is physically gated on the robot's verdict, not a human's promise." }
    ],

    architecture: {
      title: "The moving parts of a workflow run",
      lead: "Click each component to see its role, what you configure, and how it fails.",
      components: [
        { name: "Event", kind: "trigger", role: "A repository happening (push, pull_request, schedule, manual dispatch) that may start a run.", config: "<code>on:</code> with branch/path filters and event types.", failures: "Workflow silently never runs because the <code>on:</code> filter or branch doesn't match.", connects: "Matches a Workflow file → creates a Workflow run." },
        { name: "Workflow file", kind: ".github/workflows/*.yml", role: "Declares when to run and what jobs to run; one YAML file per workflow.", config: "<code>name</code>, <code>on</code>, <code>permissions</code>, <code>concurrency</code>, <code>jobs</code>.", failures: "A YAML indentation error means the workflow is invalid and never triggers; check the Actions tab.", connects: "Read by GitHub to build the run; references Actions via <code>uses:</code>." },
        { name: "Runner", kind: "VM / container", role: "The machine a job executes on — GitHub-hosted or self-hosted.", config: "<code>runs-on</code> (e.g. ubuntu-latest) or a self-hosted label.", failures: "GitHub-hosted runners can't reach a private VPC; self-hosted runners must be patched and hardened.", connects: "Hosts one Job at a time; thrown away after." },
        { name: "Job", kind: "unit of work", role: "A named group of steps on one runner; parallel unless ordered by needs.", config: "<code>needs</code>, <code>strategy.matrix</code>, <code>environment</code>, job-level <code>if</code>.", failures: "Expecting files from another job without passing an artifact — they're isolated.", connects: "Contains Steps; can depend on other Jobs." },
        { name: "Step", kind: "command / action", role: "A single shell command (<code>run:</code>) or a reusable action (<code>uses:</code>).", config: "<code>run</code>, <code>uses</code>, <code>with</code>, <code>env</code>, step <code>if</code>.", failures: "A non-zero exit code fails the step and, by default, the whole job.", connects: "Runs inside a Job; may consume secrets/env." },
        { name: "Artifact store", kind: "output persistence", role: "Holds files uploaded during a run so later jobs or humans can download them.", config: "<code>actions/upload-artifact</code> / <code>download-artifact</code>.", failures: "Confusing an artifact (durable) with a cache (best-effort) and relying on a cache for correctness.", connects: "Written by a Job's step; read by a later Job." },
        { name: "Status check", kind: "merge gate", role: "The pass/fail signal a job reports on the commit/PR.", config: "Marked <b>required</b> in branch protection; context name must match the job.", failures: "A required-check name mismatch leaves the PR forever 'pending'.", connects: "Produced by a Job; wired to the merge button." }
      ]
    },

    trace: [
      { t: "Engineer pushes the net-revenue fix to feature/fix-net-revenue", state: "running", detail: "A <code>push</code> event is emitted for that ref." },
      { t: "GitHub matches the event against ci.yml's on: filters", state: "running", detail: "The push matches, so one <b>workflow run</b> is created from the YAML at that commit." },
      { t: "The test job is queued and a fresh ubuntu-latest runner is assigned", state: "running", detail: "A clean VM — no leftover state from any previous run." },
      { t: "Step: actions/checkout pulls the repo at the pushed SHA", state: "success", detail: "The runner now has exactly the code that was pushed." },
      { t: "Step: setup-python installs 3.11, restores the pip cache", state: "success", detail: "Environment pinned; cache hit speeds up install." },
      { t: "Step: pip install -r requirements.txt", state: "success", detail: "Dependencies resolved from the lockfile." },
      { t: "Step: pytest runs test_net_revenue", state: "failed", detail: "The assertion <code>net_revenue(100,20)==80</code> gets 120 — a non-zero exit code." },
      { t: "The failed step fails the job, which fails the run", state: "failed", detail: "Exit-code propagation: step → job → run." },
      { t: "The 'test' status check turns red on the PR", state: "blocked", detail: "Branch protection marks 'test' required." },
      { t: "The merge button is disabled until the check is green", state: "blocked", detail: "The bad number never reaches production — caught in ~90 seconds." }
    ],

    annotated: [{
      title: ".github/workflows/ci.yml — annotated",
      lang: "yaml",
      code: "name: CI\n" +
            "on:\n" +
            "  push:\n" +
            "  pull_request:\n" +
            "    branches: [main]\n" +
            "permissions:\n" +
            "  contents: read\n" +
            "concurrency:\n" +
            "  group: ci-${{ github.ref }}\n" +
            "  cancel-in-progress: true\n" +
            "jobs:\n" +
            "  test:\n" +
            "    runs-on: ubuntu-latest\n" +
            "    strategy:\n" +
            "      matrix:\n" +
            "        python-version: [\"3.11\", \"3.12\"]\n" +
            "    steps:\n" +
            "      - uses: actions/checkout@v4\n" +
            "      - uses: actions/setup-python@v5\n" +
            "        with:\n" +
            "          python-version: ${{ matrix.python-version }}\n" +
            "          cache: pip\n" +
            "      - run: pip install -r requirements.txt\n" +
            "      - run: ruff check .\n" +
            "      - run: pytest -q\n" +
            "      - run: dbt test --select revenue",
      highlights: [6, 8, 24],
      notes: [
        { on: "on:", what: "Declares the events that start this workflow.", why: "Running on both <code>push</code> and <code>pull_request</code> catches problems on branches <i>and</i> on the PR merge view.", ifRemoved: "The workflow has no trigger and will never run." },
        { on: "permissions: contents: read", what: "Scopes the automatic GITHUB_TOKEN to read-only.", why: "Least privilege — CI only needs to read the repo, so a compromised step can't push or alter releases.", ifRemoved: "The token falls back to the repo/org default, which may grant write scopes CI doesn't need." },
        { on: "concurrency:", what: "Groups runs by ref and cancels superseded ones.", why: "A rapid second push cancels the now-stale first run, saving runner minutes and avoiding confusing double results.", ifRemoved: "Every push runs to completion even when already obsolete." },
        { on: "strategy.matrix.python-version", what: "Runs the job once per listed Python version, in parallel.", why: "Catches version-specific breakage before it reaches production runners.", ifRemoved: "You only test one version and ship a latent incompatibility." },
        { on: "actions/checkout@v4", what: "Checks out the repo onto the runner.", why: "Nothing else works without the code; it's the first step of almost every job.", ifRemoved: "Later steps run against an empty workspace and fail." },
        { on: "cache: pip", what: "Caches pip downloads keyed by the lockfile.", why: "Speeds up repeated installs; a miss just means a slower run, never a wrong result.", ifRemoved: "Every run re-downloads all dependencies." }
      ]
    }],

    io: [
      { given: "A <code>push</code> to <code>feature/fix-net-revenue</code> where <code>test_net_revenue</code> fails", produces: "A workflow run with a <b>red</b> 'test' status check; the PR merge button is blocked", note: "This is the refund-bug case: CI stops the bad number before merge." },
      { given: "A <code>push</code> where all tests pass on both 3.11 and 3.12", produces: "A <b>green</b> required check; the PR becomes mergeable", note: "Matrix means both versions must be green." },
      { given: "A push to a branch that doesn't match <code>on:</code> filters", produces: "<b>No run at all</b> — nothing appears in the Actions tab", note: "A common 'why didn't CI run?' cause." }
    ],

    comparisons: [
      { title: "Artifact vs cache", aLabel: "Artifact", bLabel: "Cache",
        rows: [
          { dim: "Purpose", a: "Persist a deliverable output", b: "Speed up a future run" },
          { dim: "Reliability", a: "Durable, always retrievable while retained", b: "Best-effort — a miss is normal" },
          { dim: "Affects correctness?", a: "Yes — it <i>is</i> the output", b: "No — must never change results" },
          { dim: "Keyed by", a: "A name you choose", b: "A hash (e.g. lockfile)" }
        ],
        verdict: "Use an <b>artifact</b> when a later job or a human needs the file; use a <b>cache</b> only to avoid repeating slow work." },
      { title: "GitHub-hosted vs self-hosted runner", aLabel: "GitHub-hosted", bLabel: "Self-hosted",
        rows: [
          { dim: "Setup", a: "Zero — managed for you", b: "You provision, patch, harden" },
          { dim: "Network", a: "Public internet only", b: "Can reach a private VPC / warehouse" },
          { dim: "Security burden", a: "GitHub's", b: "Yours — a real ops cost" },
          { dim: "Best for", a: "Most CI", b: "Jobs needing internal network or special hardware" }
        ],
        verdict: "Default to GitHub-hosted; reach for self-hosted only when a job genuinely needs private-network access or specialized hardware." }
    ],

    realWorld: [
      { tier: "fact", text: "At Airbnb, changes to Minerva metric definitions go through code review, static validation, and test runs before a metric is finalized — metric logic is treated as version-controlled code, which is exactly what a CI workflow enforces.", sources: ["minerva-1"] },
      { tier: "reference", text: "RetailFlow's <code>ci.yml</code> (checkout → setup → lint → pytest → dbt test, gated as a required check) is a reference implementation of that idea for this curriculum — not a copy of any company's internal pipeline." }
    ],

    tradeoffs: [
      { kind: "good", h: "Fast, consistent feedback", body: "Every change is checked the same way, automatically, in minutes — \"works on my machine\" stops being the bar." },
      { kind: "cost", h: "Runner minutes & maintenance", body: "CI consumes compute; self-hosted runners add patching and hardening work. Caching and concurrency limits keep cost sane." },
      { kind: "bad", h: "When it's overkill", body: "A one-off personal script with no collaborators and no deploy doesn't need a workflow — a pre-commit hook may be enough." },
      { kind: "note", h: "Alternatives", body: "GitLab CI, Azure Pipelines, Jenkins, CircleCI all do CI; the concepts (events, jobs, runners, artifacts) transfer. The choice usually follows where your code already lives." }
    ],

    failures: [
      { symptom: "The workflow doesn't trigger on a push.",
        evidence: "Nothing appears in the Actions tab after pushing; no red or green check on the commit.",
        rootCause: "The YAML is on a different branch, the <code>on:</code>/<code>branches</code> filters exclude the pushed ref, or the file is malformed and invalid.",
        investigation: ["Confirm <code>.github/workflows/ci.yml</code> exists <i>on the branch you pushed</i>.", "Check the <code>on:</code> and <code>branches</code> filters against the ref.", "Open the Actions tab for a YAML parse error."],
        correction: "Fix the branch/filter or the YAML so the event matches.",
        verification: "Push again and confirm a run appears and the check reports.",
        prevention: "Validate workflow YAML in review; keep a simple <code>on: [push, pull_request]</code> while iterating." },
      { symptom: "<code>pip install</code> is slow on every run.",
        evidence: "The install step takes minutes each time; logs show every package downloaded fresh.",
        rootCause: "No dependency caching configured.",
        investigation: ["Look for a 'Cache restored' line in the setup step (absent = no cache).", "Confirm a lockfile exists to key the cache on."],
        correction: "Add <code>cache: pip</code> to <code>setup-python</code> (or <code>actions/cache</code> keyed on the lockfile hash).",
        verification: "Re-run; the install step is faster and logs show a cache hit.",
        prevention: "Make caching part of the standard reusable workflow." },
      { symptom: "A step can't reach the private data warehouse.",
        evidence: "Connection timeouts to an internal host from a GitHub-hosted runner.",
        rootCause: "GitHub-hosted runners live on the public internet with no path into the VPC.",
        investigation: ["Confirm the host is private (not publicly routable).", "Check whether a self-hosted runner exists in that network."],
        correction: "Run the job on a hardened self-hosted runner inside the network.",
        verification: "A small smoke query succeeds before the full job runs.",
        prevention: "Document which jobs require self-hosted runners; keep them patched." },
      { symptom: "A required status check never reports on the PR.",
        evidence: "The PR merge box shows the check as perpetually 'Expected' / pending.",
        rootCause: "The required-check context name in branch protection doesn't match the job, or the workflow didn't run for this event.",
        investigation: ["Compare the required-check name with the actual job/check name.", "Confirm the triggering event fired a run."],
        correction: "Align the required-check context with the job name (matrix adds the variant to the name).",
        verification: "The PR now shows the check as required and pending/passing.",
        prevention: "Set required checks from an actual run's check names, not typed by hand." }
    ],

    knowledgeChecks: [
      { level: "Recall", q: "Where must a workflow file live to be picked up by GitHub Actions?",
        options: [
          { label: "<code>.github/workflows/</code> in the repo", ok: true, why: "GitHub scans that directory for YAML workflow files." },
          { label: "The repository root", ok: false, why: "Only <code>.github/workflows/</code> is scanned for workflows." },
          { label: "<code>actions/</code> at the root", ok: false, why: "There is no such convention; it's <code>.github/workflows/</code>." }
        ], revisit: "github-actions" },
      { level: "Explain", q: "Why do two jobs in the same workflow not share files by default?",
        options: [
          { label: "Each job runs on its own fresh, isolated runner", ok: true, why: "Jobs are isolated; pass data via artifacts or job outputs." },
          { label: "Because YAML forbids it", ok: false, why: "It's a runtime isolation property, not a YAML rule." },
          { label: "They do share files automatically", ok: false, why: "They don't — this is a common and costly misconception." }
        ], revisit: "github-actions" },
      { level: "Predict", q: "You push to a branch that doesn't match the workflow's <code>on:</code> filters. What happens?",
        options: [
          { label: "No workflow run is created at all", ok: true, why: "If the event doesn't match the filters, nothing runs." },
          { label: "It runs but is marked skipped", ok: false, why: "A non-matching event creates no run to skip." },
          { label: "It runs on the default branch instead", ok: false, why: "Filters gate creation; they don't redirect the ref." }
        ], revisit: "github-actions" },
      { level: "Apply", q: "You need the deploy job to run only after tests pass. What do you add?",
        options: [
          { label: "<code>needs: [test]</code> on the deploy job", ok: true, why: "<code>needs</code> creates the dependency so deploy waits for (and requires) test." },
          { label: "List deploy before test in the file", ok: false, why: "Order in the file doesn't sequence jobs; they run in parallel without <code>needs</code>." },
          { label: "Put both in one step", ok: false, why: "They're separate jobs; a step can't express a cross-job dependency." }
        ], revisit: "github-actions" },
      { level: "Troubleshoot", q: "CI is green locally but a fork's PR can't read a secret. Most likely cause?",
        options: [
          { label: "Secrets aren't exposed to fork-PR workflows by design", ok: true, why: "It's a deliberate security boundary so untrusted contributors can't exfiltrate secrets." },
          { label: "The secret was deleted", ok: false, why: "More likely it's the fork-PR boundary; verify before assuming deletion." },
          { label: "Secrets only work on self-hosted runners", ok: false, why: "Secrets work on hosted runners; the issue is the fork-PR trigger." }
        ], revisit: "secrets" },
      { level: "Decide", q: "A job must query an internal warehouse behind a VPC. Which runner, and what's the cost?",
        options: [
          { label: "Self-hosted runner — you accept patching/hardening it", ok: true, why: "Only a runner inside the network can reach the VPC; you now own its security and upkeep." },
          { label: "GitHub-hosted — it's simpler", ok: false, why: "Hosted runners can't reach a private VPC; convenience doesn't solve the network path." },
          { label: "Neither — disable the check", ok: false, why: "Dropping the check removes protection; solve the network path instead." }
        ], revisit: "github-actions" }
    ],

    mastery: {
      task: "Design a <code>ci.yml</code> for RetailFlow's revenue repo that validates every pull request to <code>main</code> and gates the merge. Write the YAML yourself, then compare with the annotated example above.",
      acceptance: [
        "Triggers on <code>pull_request</code> to <code>main</code> (and on <code>push</code>).",
        "Sets <code>permissions</code> to least privilege (read by default).",
        "Runs lint, <code>pytest</code>, and <code>dbt test</code> as distinct steps.",
        "Uses a matrix across at least two Python versions.",
        "Caches dependencies, and would be marked a required status check in branch protection."
      ],
      hint: "Start from <code>name</code>/<code>on</code>/<code>permissions</code>, then one <code>test</code> job with <code>runs-on</code>, a <code>strategy.matrix</code>, and the steps in order: checkout → setup-python(cache) → install → lint → pytest → dbt test."
    },

    furtherReading: [
      { title: "GitHub Actions — Writing workflows", publisher: "GitHub Docs", url: "https://docs.github.com/en/actions/writing-workflows", why: "The authoritative reference for events, jobs, runners, steps, matrix, and needs.", read: "Choose when your workflow runs → Events that trigger workflows; Workflow syntax reference.", reviewed: "2026-10-20" },
      { title: "Security hardening for GitHub Actions", publisher: "GitHub Docs", url: "https://docs.github.com/en/actions/security-for-github-actions", why: "Covers SHA-pinning third-party actions, GITHUB_TOKEN permissions, and the fork-PR secret boundary.", read: "Security hardening → Using secrets safely; Hardening for self-hosted runners.", reviewed: "2026-10-20" },
      { title: "About security hardening with OpenID Connect", publisher: "GitHub Docs", url: "https://docs.github.com/en/actions/security-for-github-actions", why: "How to give jobs short-lived cloud credentials instead of storing long-lived keys.", read: "OpenID Connect → the cloud provider you deploy to.", reviewed: "2026-10-20" }
    ],

    production: [
      { h: "Pin actions to a full commit SHA", body: "A tag like <code>@v4</code> is mutable — a compromised maintainer can repoint it. Pin to a 40-char commit SHA (and renovate it) so a supply-chain swap can't run in RetailFlow's pipeline." },
      { h: "OIDC + least-privilege permissions", body: "Set <code>permissions:</code> to the minimum (default read-only) and use OIDC for cloud deploys instead of long-lived secrets; the default <code>GITHUB_TOKEN</code> should not have write scope it doesn't need." },
      { h: "Concurrency to avoid clobbering deploys", body: "A <code>concurrency</code> group cancels or queues overlapping runs so two pushes don't deploy the revenue pipeline on top of each other and race." },
      { h: "Environment approvals for prod", body: "Gate the prod deploy job behind an <b>environment</b> with required reviewers, so a human signs off before the net-revenue change reaches the 7 AM dashboard." },
      { h: "Secrets masking and fork safety", body: "Secrets are masked in logs and are <b>not</b> exposed to <code>pull_request</code> runs from forks — don't rely on secrets in untrusted-PR CI; use <code>pull_request_target</code> only with extreme care." }
    ],

    misconceptions: [
      { myth: "A moving tag like <code>actions/checkout@v4</code> is immutable.", truth: "Tags can be repointed; only a full commit SHA is immutable. SHA-pin third-party actions to prevent supply-chain attacks." },
      { myth: "Jobs always run in order.", truth: "Jobs run <b>in parallel</b> by default. Ordering requires <code>needs:</code> to declare dependencies." },
      { myth: "Secrets are available to every workflow run.", truth: "Secrets are not passed to workflows triggered by PRs from forks, which is a deliberate security boundary — fork CI can't exfiltrate them." },
      { myth: "The <code>GITHUB_TOKEN</code> has full repo write by default.", truth: "Its default permissions are configurable and increasingly default to read-only; you grant write scopes explicitly via <code>permissions:</code>." }
    ],

    interview: [
      { q: "Why pin a GitHub Action to a commit SHA instead of a tag?", a: "A tag is mutable — a compromised action maintainer can move <code>@v4</code> to malicious code that then runs with your workflow's permissions and secrets. A full SHA is immutable, so pinning (plus automated bumps) closes that supply-chain hole." },
      { q: "How do you give an Actions job cloud access without storing a long-lived key?", a: "Configure OIDC: GitHub mints a short-lived token the cloud's trust policy accepts for that specific repo/branch/job, so no standing credential lives in secrets and the grant is scoped and auditable per run." },
      { q: "Your CI passes but a fork's PR can't read a needed secret — why, and is that right?", a: "Secrets aren't exposed to workflows triggered by fork PRs, by design, so untrusted contributors can't exfiltrate them. It's correct; move secret-needing steps to a trusted trigger or run them post-merge rather than loosening the boundary." },
      { q: "When would you use a self-hosted runner over a GitHub-hosted one?", a: "When the job needs network access into a private VPC (e.g. an internal data warehouse) or specialized hardware. The trade-off is you now own patching and hardening the runner, which is real security and ops work." }
    ],

    related: ["github", "ci-vs-cd", "git", "docker"]
  }));
})();
