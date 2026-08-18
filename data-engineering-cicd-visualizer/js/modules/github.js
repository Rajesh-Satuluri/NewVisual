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
    }
  }));
})();
