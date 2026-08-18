/* modules/branching.js — Git Branching Strategies (built on the concept-module factory) */
(function () {
  "use strict";
  var NS = (window.DECICDViz = window.DECICDViz || {});

  NS.registerModule(NS.Concept.build({
    id: "branching",
    title: "Git Branching Strategies",
    tool: "--tool-git",
    icon: "🌿",
    eyebrow: "Engineering Concept · Branching Strategies",
    subtitle: "How a team organizes parallel work — Git Flow, trunk-based, feature branches, release branches — and why RetailFlow ships its pipelines from short-lived branches off a protected main.",
    mentalImage: "PARALLEL ROADS",

    flowTitle: "A change on a short-lived feature branch",
    flow: ["main (protected)", "cut feature/fix-net-revenue", "commit + push", "open PR", "CI + review", "merge to main", "delete branch"],

    why: "Everyone committing to one branch means half-finished work and a broken revenue job land on the line others build on. But the opposite extreme — heavy long-lived branches — turns every merge into a painful, conflict-ridden 'big bang' weeks after the code was written.",
    what: "A <b>branching strategy</b> is the agreed pattern for how branches are created, integrated, and released. The main choices are <b>Git Flow</b>, <b>trunk-based development</b>, <b>feature branches</b>, and <b>release branches</b> — each a different trade between isolation and integration frequency.",
    how: "Pick a strategy that matches release cadence and team size. RetailFlow uses <b>short-lived feature branches off a protected <code>main</code></b> (near trunk-based): each change lives a day or two, passes CI + review in a PR, then merges — keeping integration continuous and merges small.",

    levels: {
      beginner: [
        { h: "What a strategy even is", body: "A branch is a parallel road for a change. A <b>strategy</b> is your team's rule for how many roads exist, how long they live, and how they merge back. The goal: let people work in parallel without stepping on each other or on production." },
        { h: "The tension every strategy balances", body: "<b>Isolation</b> (keep my risky work separate) vs <b>integration</b> (merge often so conflicts stay tiny). Long-lived branches maximize isolation but make merges huge; short-lived branches integrate constantly but need discipline and good CI." },
        { h: "RetailFlow in one line", body: "RetailFlow keeps <code>main</code> always-deployable and cuts a tiny branch per change — like <code>feature/fix-net-revenue</code> — that merges within a day. Small roads, merged fast." }
      ],
      intermediate: [
        { h: "Git Flow", body: "<b>Workflow:</b> long-lived <code>main</code> + <code>develop</code>, plus <code>feature/*</code>, <code>release/*</code>, and <code>hotfix/*</code> branches. <b>Advantages:</b> explicit release structure, good for versioned software with scheduled releases. <b>Disadvantages:</b> heavy, many long-lived branches, painful merges, slow integration. <b>When appropriate:</b> shipped software with multiple supported versions and formal release windows." },
        { h: "Trunk-Based Development", body: "<b>Workflow:</b> everyone integrates into one trunk (<code>main</code>) at least daily, via tiny short-lived branches or direct commits behind feature flags. <b>Advantages:</b> continuous integration, tiny conflicts, fast feedback, pairs perfectly with CI/CD. <b>Disadvantages:</b> demands strong automated tests and feature flags for unfinished work. <b>When appropriate:</b> teams practicing CI/CD — including most data pipelines." },
        { h: "Feature Branches", body: "<b>Workflow:</b> one branch per unit of work, reviewed via PR, then merged. <b>Advantages:</b> clean isolation, code review built in, CI runs per PR. <b>Disadvantages:</b> if branches live too long they drift from <code>main</code> and merges get ugly. <b>When appropriate:</b> almost everyone — the key is keeping them <i>short-lived</i>." },
        { h: "Release Branches", body: "<b>Workflow:</b> cut <code>release/1.4</code> to stabilize a version while <code>main</code> keeps moving; only bug fixes go onto it. <b>Advantages:</b> lets you patch a shipped version without blocking new work. <b>Disadvantages:</b> cherry-pick overhead, risk of divergence between the release branch and main. <b>When appropriate:</b> when you must support a specific deployed version over time." }
      ],
      proficient: [
        { h: "Choosing for data engineering", body: "Data pipelines usually deploy continuously, not in versioned releases, so <b>trunk-based / short-lived feature branches</b> fit best. There's rarely a reason to support 'version 1.3 of the revenue pipeline' in the field — there's just the current pipeline, so Git Flow's release/hotfix machinery is mostly dead weight." },
        { h: "Protected main + required checks", body: "The safety net that makes short-lived branches safe: <b>branch protection</b> on <code>main</code> requiring a passing CI run (unit + dbt tests), at least one review, and up-to-date branches before merge. Nothing reaches <code>main</code> — the always-deployable trunk — without green checks." },
        { h: "Keeping branches short-lived in practice", body: "Break work into small mergeable slices; rebase on <code>main</code> daily to avoid drift; hide incomplete features behind flags or config rather than long branches. A branch open for weeks is the real source of merge pain, not branching itself." }
      ]
    },

    micro: [
      { name: "main / trunk", tip: "The always-deployable line everything integrates into." },
      { name: "feature branch", tip: "A short-lived branch for one unit of work." },
      { name: "Git Flow", tip: "main + develop + feature/release/hotfix branches." },
      { name: "trunk-based development", tip: "Everyone integrates into trunk at least daily." },
      { name: "release branch", tip: "Stabilize a version while main keeps moving." },
      { name: "hotfix branch", tip: "Urgent fix branched off a release/main." },
      { name: "pull request", tip: "Proposed merge with review + CI." },
      { name: "branch protection", tip: "Required checks/reviews before merge to main." },
      { name: "merge vs rebase", tip: "Merge commit preserves topology; rebase gives linear history." },
      { name: "feature flag", tip: "Ship unfinished code dark instead of hiding it in a long branch." },
      { name: "short-lived", tip: "Merge within a day or two to avoid drift." },
      { name: "CODEOWNERS", tip: "Require specific reviewers on sensitive paths." }
    ],

    before: ["long-lived develop + release branches", "weeks-old feature branches", "'big bang' merges", "huge conflicts in revenue.py", "unclear what's deployable"],
    after: ["short-lived branches off protected main", "merge within a day", "tiny, frequent integrations", "CI + review on every PR", "main is always deployable"],

    failure: {
      title: "A three-week feature branch",
      steps: ["cut branch, work 3 weeks", "main moves far ahead", "merge day arrives", "huge conflict in revenue.py", "refunds logic silently reverted"],
      explain: "The longer a branch lives, the more <code>main</code> drifts away from it and the bigger the eventual merge conflict. Short-lived branches that merge within a day — the trunk-based habit — keep every integration tiny, so a stale branch can never quietly clobber the refund fix during a messy merge."
    },

    whenNot: "Short-lived trunk-based flow isn't free: it <b>requires solid automated tests and feature flags</b>. Without a reliable CI safety net, merging to <code>main</code> daily just spreads breakage faster — and if you genuinely must support multiple shipped versions of a product, the ceremony of Git Flow / release branches earns its keep.",

    story: {
      situation: "RetailFlow's team debates a branching model as it scales the Daily Revenue Pipeline; someone proposes full Git Flow with <code>develop</code> and <code>release/*</code> branches.",
      problem: "The pipeline deploys continuously — there are no versioned field releases to maintain — so Git Flow's long-lived branches would add heavy merges and slow every fix, including urgent revenue corrections.",
      decision: "Adopt <b>short-lived feature branches off a protected <code>main</code></b> (near trunk-based): one small branch per change, merged within a day after passing CI and review.",
      tool: "Feature branches + branch protection on <code>main</code> (required CI + review).",
      result: "The net-revenue fix lands via <code>feature/fix-net-revenue</code> in an afternoon — reviewed, tested, merged — with no long-lived branch drift, and <code>main</code> stays continuously deployable.",
      remember: "Match the strategy to the release model: continuously-deployed data pipelines want short-lived branches off a protected trunk, not Git Flow's long-lived release machinery."
    },

    code: [{
      title: "Short-lived feature branch on a protected main",
      lang: "bash",
      code: "git checkout main && git pull\n" +
            "git checkout -b feature/fix-net-revenue\n" +
            "# edit transforms/revenue.py — net_revenue = gross_revenue - refund_amount\n" +
            "git commit -am \"Fix net revenue: subtract refunds\"\n" +
            "git push -u origin feature/fix-net-revenue\n" +
            "# open a PR → CI (unit + dbt tests) + 1 review required by branch protection\n" +
            "# merge within a day, then:\n" +
            "git branch -d feature/fix-net-revenue",
      highlights: [2, 6]
    }, {
      title: "Branch protection that makes trunk-based safe (GitHub ruleset)",
      lang: "yaml",
      code: "# main branch protection\n" +
            "required_status_checks:\n" +
            "  strict: true                 # branch must be up to date with main\n" +
            "  checks:\n" +
            "    - context: unit-tests\n" +
            "    - context: dbt-test\n" +
            "required_pull_request_reviews:\n" +
            "  required_approving_review_count: 1\n" +
            "enforce_admins: true\n" +
            "allow_force_pushes: false",
      highlights: [3, 8]
    }],

    remember: "There's no single 'best' branching strategy — match it to how you release. Continuously-deployed data pipelines fit short-lived feature branches off a protected, always-deployable <code>main</code>; Git Flow's long-lived release/hotfix branches suit versioned software, not RetailFlow's daily pipeline.",

    retention: {
      question: "Why does RetailFlow pick short-lived feature branches off a protected <code>main</code> instead of full Git Flow for its Daily Revenue Pipeline?",
      answer: "The pipeline is <b>continuously deployed</b> — there are no versioned field releases to maintain — so Git Flow's long-lived <code>develop</code>/<code>release</code>/<code>hotfix</code> branches add merge pain and slow fixes for no benefit. Short-lived branches (near <b>trunk-based development</b>) integrate daily, keep conflicts tiny, and — with branch protection requiring CI + review — keep <code>main</code> always deployable."
    }
  }));
})();
