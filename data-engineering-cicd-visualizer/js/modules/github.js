/* modules/github.js — Tier 1 · GitHub (built on the concept-module factory) */
(function () {
  "use strict";
  var NS = (window.DECICDViz = window.DECICDViz || {});

  NS.registerModule(NS.Concept.build({
    id: "github",
    title: "GitHub",
    tool: "--tool-github",
    icon: "🐙",
    eyebrow: "Tier 1 · Essential Foundations",
    subtitle: "The collaboration layer on top of Git — where RetailFlow's revenue fix gets reviewed, checked, and approved before it can ever touch main.",
    mentalImage: "SHARED HOME + REVIEW GATE",

    flowTitle: "A change moving through GitHub",
    flow: ["Developer", "Push branch", "Open PR #482", "CI checks", "Reviewer", "Approve", "Merge to main"],

    why: "Git tracks history, but a team still needs one shared place to host the code, discuss changes, gate merges behind review, and run checks automatically — otherwise anyone can push anything to production.",
    what: "GitHub is a <b>hosting + collaboration platform</b> built on Git: remote repositories, pull requests, code review, branch protection, issues, releases, and the automation that runs on every change.",
    how: "You push a branch to the remote, open a <b>pull request</b>, CI runs required checks, a reviewer approves, and <b>branch protection</b> only lets the merge happen once both pass.",

    levels: {
      beginner: [
        { h: "The one-line idea", body: "If Git is the save-point system, GitHub is the <b>shared clubhouse</b> where the whole team keeps the save file, talks about changes, and votes before anything becomes official." },
        { h: "The pull request", body: "A <b>pull request (PR)</b> says \"here's my branch — please review and merge it.\" It shows the diff, runs tests, and collects comments and approvals in one place. RetailFlow's engineer opens <b>PR #482</b> for the net-revenue fix." },
        { h: "Repository & remote", body: "The <b>repository</b> is the project's home on GitHub; <code>origin</code> is the <b>remote</b> your local Git pushes to. Everyone clones from and pushes to the same repo." }
      ],
      intermediate: [
        { h: "Review & branch protection", body: "<b>Branch protection</b> on <code>main</code> can require: 1+ approving reviews, <b>required status checks</b> (CI green), up-to-date branches, and no direct pushes. This is the gate that stopped the bad revenue change from being edited live." },
        { h: "CODEOWNERS & permissions", body: "A <code>.github/CODEOWNERS</code> file auto-requests specific reviewers for specific paths (e.g. the data team owns <code>transforms/</code>). Repo <b>permissions</b> (read/triage/write/maintain/admin) control who can push, merge, or change settings." },
        { h: "Issues, releases & environments", body: "<b>Issues</b> track bugs and work (\"refunds counted as revenue\"). <b>Releases</b> tag shipped versions. <b>Environments</b> (dev/prod) add deployment gates and can require manual approval before a deploy job runs." }
      ],
      proficient: [
        { h: "Secrets vs variables", body: "<b>Secrets</b> are encrypted and masked in logs (API tokens, connection strings); <b>variables</b> are plain config (region, warehouse name). Both scope to repo, environment, or org. Never put a credential in a variable — it will print in plaintext." },
        { h: "OIDC over long-lived keys", body: "Instead of storing a cloud password as a secret, GitHub Actions can mint a short-lived <b>OIDC</b> token that Azure/AWS trusts for one job. No standing credential to leak — the senior-preferred pattern for deploys." },
        { h: "Merge strategy & governance", body: "Squash-merge keeps <code>main</code> linear and each PR one commit. Required checks + CODEOWNERS + protected tags + signed commits form the audit trail regulators and finance ask for when revenue numbers change." }
      ]
    },

    micro: ["repository", "remote", "fork", "clone", "pull request", "review", "approval", "branch protection",
      "required checks", "CODEOWNERS", "issues", "labels", "milestones", "releases", "tags", "environments",
      "secrets", "variables", "permissions", "teams", "OIDC", "actions"],

    before: ["email zip files", "anyone pushes to main", "no review", "who approved?", "no audit trail"],
    after: ["one shared repo", "protected main", "PR review + CI gate", "CODEOWNERS routing", "full history of who approved"],

    failure: {
      title: "A rushed revenue change with no review gate",
      steps: ["Open PR #482", "CI check fails: pytest red", "branch protection blocks merge", "reviewer requests changes", "fix + re-run", "approved → merge"],
      explain: "With <b>required status checks</b> and <b>required reviews</b> on <code>main</code>, GitHub physically will not let a red or unreviewed PR merge. The gate — not good intentions — is what protects the 7 AM dashboard."
    },

    whenNot: "GitHub is not a data store or a secrets vault for large or sensitive assets — don't commit datasets, model weights, or raw credentials. Use object storage and a dedicated secret manager; GitHub holds source, config, and the review process around them.",

    story: {
      situation: "RetailFlow's finance team confirms refunds are inflating reported revenue, and an engineer has a one-line fix ready on a branch.",
      problem: "Pushing straight to <code>main</code> would ship an unreviewed change to a number executives read every morning.",
      decision: "The engineer opens <b>PR #482</b>; CODEOWNERS auto-requests a data-team reviewer and CI runs the test suite.",
      tool: "GitHub pull requests + branch protection + required checks.",
      result: "A teammate reviews the diff, CI passes, one approval lands, and only then does the merge button unlock.",
      remember: "A pull request turns a scary change into a reviewable, testable, approvable event — the merge can't happen until the gate is green."
    },

    code: [{
      title: "CODEOWNERS routes the revenue path to the data team",
      lang: "codeowners",
      code: "# .github/CODEOWNERS\n" +
            "# The data team must review any change to the transforms\n" +
            "/transforms/            @retailflow/data-eng\n" +
            "/transforms/revenue.py  @retailflow/data-eng @retailflow/finance-review\n" +
            "*.tf                    @retailflow/platform",
      highlights: [4]
    }],

    remember: "Git is the history; GitHub is the shared home plus the gate — pull requests, reviews, and required checks decide what's allowed to become <code>main</code>.",

    retention: {
      question: "RetailFlow wants to guarantee no revenue change reaches <code>main</code> without a passing test suite and a teammate's sign-off. What GitHub feature enforces this?",
      answer: "<b>Branch protection</b> on <code>main</code> with <b>required status checks</b> (CI must be green) and <b>required reviews</b> (at least one approval, often routed by <code>CODEOWNERS</code>). The merge button stays locked until both are satisfied."
    },

    prerequisites: ["git", "branching"],

    production: [
      { h: "Branch protection / rulesets as the real gate", body: "Require status checks, reviews, up-to-date branches, and block force-pushes on <code>main</code>. Set <code>enforce_admins</code> so even admins can't bypass the gate on PR #482's revenue change." },
      { h: "OIDC instead of long-lived cloud keys", body: "Let Actions mint short-lived <b>OIDC</b> tokens that Azure/AWS trust per job, so there's no standing credential in repo secrets to leak — the senior-preferred identity pattern for deploys." },
      { h: "Secrets vs variables, and scope", body: "Secrets are encrypted and masked; variables print in plaintext. Scope each to repo/environment/org and grant least privilege — never a prod token where a dev job can read it." },
      { h: "Auditability for revenue changes", body: "CODEOWNERS routing, required reviews, signed commits, and protected tags give finance the who/when audit trail they ask for whenever <code>net_revenue</code> logic changes." }
    ],

    misconceptions: [
      { myth: "GitHub and Git are the same thing.", truth: "Git is the distributed version-control tool; GitHub is a hosting + collaboration platform built on top of it (PRs, reviews, Actions, protection rules). You can use Git with no GitHub at all." },
      { myth: "Branch protection stops everyone, including admins.", truth: "Only if <b>Include administrators</b> / <code>enforce_admins</code> is enabled. By default admins can often bypass required checks." },
      { myth: "A PR approval means the code is tested.", truth: "Approval is a human review; it does not run tests. You need <b>required status checks</b> for CI to actually gate the merge." },
      { myth: "Deleting a secret from the UI removes it from past runs.", truth: "Logs and forks may retain exposed values; a leaked secret must be <b>rotated</b>, not just deleted." }
    ],

    troubleshooting: [
      { symptom: "Merge button is greyed out on a green PR.", cause: "A required review is missing, the branch is behind <code>main</code>, or a required check hasn't reported.", fix: "Check the PR's merge-box: request the CODEOWNERS review, click 'Update branch', or re-run the missing check; the button unlocks when all required gates pass." },
      { symptom: "CODEOWNERS isn't requesting the data team.", cause: "The file is in the wrong path, the pattern doesn't match, or the team lacks repo access.", fix: "Place it at <code>.github/CODEOWNERS</code>, confirm the glob matches <code>transforms/revenue.py</code>, and ensure the team has at least read access; verify via the PR's 'Reviewers' auto-request." },
      { symptom: "An admin pushed straight to <code>main</code>, bypassing review.", cause: "<code>enforce_admins</code> is off.", fix: "Enable 'Include administrators' in branch protection; verify by attempting a direct push and confirming it's rejected." },
      { symptom: "A deploy job can't read <code>secrets.PROD_TOKEN</code>.", cause: "The secret is scoped to an environment the job doesn't declare, or it's a variable not a secret.", fix: "Add <code>environment: prod</code> to the job (or move the secret to the right scope); verify the step no longer prints an empty/undefined value." }
    ],

    interview: [
      { q: "How do you guarantee no unreviewed, untested change reaches <code>main</code> on GitHub?", a: "Branch protection on <code>main</code> requiring passing status checks and at least one approving review (ideally CODEOWNERS-routed), with 'Include administrators' on so nobody bypasses it — the merge button is wired to those gates, not to good intentions." },
      { q: "Why prefer OIDC over storing a cloud key as a GitHub secret?", a: "OIDC mints a short-lived token the cloud trusts for a single job, so there's no long-lived credential sitting in secrets to leak or rotate; it narrows the blast radius and is auditable per run." },
      { q: "What's the difference between a secret and a variable in GitHub Actions?", a: "Secrets are encrypted at rest and masked in logs for credentials; variables are plaintext config like a region or warehouse name. Putting a credential in a variable exposes it in plaintext, so it's a real security bug." },
      { q: "A reviewer approved a PR but it still broke prod. What gate was missing?", a: "Approval is only human review — it doesn't run tests. A <b>required status check</b> (CI) must gate the merge, and post-deploy verification belongs to CD; approval alone proves nothing about correctness." }
    ],

    problem: {
      before: "Git alone is distributed — everyone has a full copy, but there's no agreed shared home, no place to discuss a change, and no gate that stops someone pushing straight to the line production builds on.",
      insufficient: "Without a review-and-checks gate, 'please run the tests and get someone to look' is a social convention, not an enforced rule. Under deadline it's the first thing skipped, and an unreviewed revenue change reaches the mainline.",
      failureModes: [
        "Someone force-pushes to the shared branch and rewrites history others depend on.",
        "A change merges with a red test suite because nothing blocked it.",
        "No record of who approved a finance-critical change when auditors ask."
      ]
    },
    definition: {
      formal: "GitHub is a hosting and collaboration platform built on Git. A <b>pull request</b> is a proposed merge of one branch into another that collects the diff, automated <b>status checks</b>, and human reviews in one place. <b>Branch protection</b> (rulesets) are server-side rules that block a merge until declared conditions — required checks, required reviews, up-to-date branch — are satisfied.",
      distinguish: [
        { from: "Git vs GitHub", note: "Git is the version-control tool; GitHub is one host for it (GitLab/Bitbucket are others). You can use Git with no GitHub." },
        { from: "Review vs required check", note: "A review is a human approving the diff; a required status check is CI actually running. Approval does not run tests — you need both." },
        { from: "Secret vs variable", note: "Secrets are encrypted and masked; variables are plaintext config. A credential in a variable is a security bug." }
      ]
    },
    mechanics: [
      { h: "The PR merge-box gate", body: "When you open a PR, GitHub evaluates branch-protection rules on the target branch. Each required check reports a status on the head commit; each required review must be approved. The merge button stays disabled until every declared condition is green." },
      { h: "CODEOWNERS routing", body: "A <code>.github/CODEOWNERS</code> file maps path globs to teams; a PR touching a matched path auto-requests those owners as reviewers and can make their approval required." },
      { h: "Identity for deploys", body: "Instead of a stored cloud key, Actions can present an <b>OIDC</b> token that the cloud's trust policy accepts for a specific repo/branch/job, minting short-lived credentials with no standing secret to leak." }
    ],
    knowledgeChecks: [
      { level: "Explain", q: "A PR was approved by a teammate but still broke prod. Which gate was missing?",
        options: [
          { label: "A required status check (CI) — approval doesn't run tests", ok: true, why: "Human review ≠ automated verification; you need required checks too." },
          { label: "Nothing — approval guarantees correctness", ok: false, why: "Approval is a human reading the diff, not a test run." },
          { label: "A second approval", ok: false, why: "More approvals still don't run the test suite." }
        ], revisit: "github" },
      { level: "Apply", q: "You must guarantee the data team reviews any change to <code>transforms/</code>. What do you add?",
        options: [
          { label: "A CODEOWNERS rule mapping that path to the team", ok: true, why: "CODEOWNERS auto-requests and can require those reviewers." },
          { label: "A comment asking people to remember", ok: false, why: "A convention isn't enforcement; use CODEOWNERS + required review." },
          { label: "A branch name rule", ok: false, why: "Branch names don't route reviewers." }
        ], revisit: "github" },
      { level: "Decide", q: "Your deploy needs cloud access. Most secure option on GitHub?",
        options: [
          { label: "OIDC short-lived tokens, no stored key", ok: true, why: "No standing credential to leak; scoped and auditable per run." },
          { label: "A long-lived key in repo secrets", ok: false, why: "A standing credential that can leak and must be rotated." },
          { label: "A key in a repo variable", ok: false, why: "Variables are plaintext — never put credentials there." }
        ], revisit: "secrets" }
    ],
    mastery: {
      task: "Describe the exact branch-protection configuration for RetailFlow's <code>main</code> that guarantees no unreviewed, untested change to <code>transforms/revenue.py</code> can merge — and name the file that routes the review.",
      acceptance: [
        "Requires at least one approving review.",
        "Requires the CI status check(s) to pass.",
        "Requires the branch to be up to date and blocks force-pushes.",
        "Enables 'include administrators' and names .github/CODEOWNERS for routing."
      ]
    },
    furtherReading: [
      { title: "About pull requests", publisher: "GitHub Docs", url: "https://docs.github.com/en/pull-requests", why: "How PRs, reviews, and required checks fit together.", read: "Collaborating with pull requests → reviews; About protected branches.", reviewed: "2026-10-20" },
      { title: "About code owners", publisher: "GitHub Docs", url: "https://docs.github.com/en/repositories", why: "Exact CODEOWNERS syntax and how required-owner review works.", read: "Managing your repository → About code owners.", reviewed: "2026-10-20" }
    ],

    related: ["git", "github-actions", "branching", "ci-vs-cd"]
  }));
})();
