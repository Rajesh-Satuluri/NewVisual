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
    },

    prerequisites: ["git", "github"],

    production: [
      { h: "Protected main makes short branches safe", body: "Trunk-based flow only works with branch protection on <code>main</code>: required CI (unit + dbt tests), at least one review, and up-to-date branches — so a short-lived branch can't merge breakage into RetailFlow's deployable trunk." },
      { h: "Feature flags over long branches", body: "Ship unfinished work dark behind a flag/config instead of letting a branch live for weeks; this keeps integration continuous while hiding incomplete revenue logic from the 7 AM dashboard." },
      { h: "Reliable tests are the prerequisite", body: "Merging to <code>main</code> daily without a trustworthy automated suite just spreads breakage faster. The CI safety net is what earns the right to integrate often." },
      { h: "Rebase daily to avoid drift", body: "The longer <code>feature/fix-net-revenue</code> diverges from <code>main</code>, the bigger the eventual conflict — rebasing on <code>main</code> daily keeps each integration tiny and auditable." }
    ],

    misconceptions: [
      { myth: "Trunk-based development means no branches at all.", truth: "It means <b>short-lived</b> branches (hours to a day) that integrate into trunk frequently, or direct commits behind flags — not the absence of branches." },
      { myth: "Git Flow is the industry best practice for everything.", truth: "Git Flow suits versioned, release-cadence software. For continuously-deployed data pipelines its long-lived <code>develop</code>/<code>release</code> branches add merge pain for no benefit." },
      { myth: "More isolation (longer branches) is always safer.", truth: "Longer branches drift from <code>main</code> and make merges a risky 'big bang'. Frequent small integrations are actually safer because conflicts stay tiny." },
      { myth: "A branching strategy is just a naming convention.", truth: "It's a decision about integration frequency and release model, backed by branch protection and CI — naming is the least important part." }
    ],

    troubleshooting: [
      { symptom: "Merging a week-old branch produces a huge conflict in revenue.py.", cause: "The branch drifted far from <code>main</code>.", fix: "Rebase onto <code>main</code> (resolving incrementally), re-run the net-revenue tests, and going forward keep branches short-lived and rebase daily." },
      { symptom: "Unfinished feature code is blocking a release because it's half-merged.", cause: "Incomplete work was merged to trunk without gating.", fix: "Wrap it in a <b>feature flag</b> defaulted off, merge safely, and enable it only when complete; verify the flag-off path matches current behavior." },
      { symptom: "Daily merges keep breaking main.", cause: "Weak or missing CI gates on <code>main</code>.", fix: "Add required status checks (unit + dbt) and a review requirement to branch protection; verify a deliberately failing test now blocks the merge." },
      { symptom: "A hotfix on a release branch never made it back to main.", cause: "No cherry-pick/merge-forward step.", fix: "Cherry-pick the fix onto <code>main</code> (or merge the release branch forward) and verify the commit appears in <code>git log main</code>." }
    ],

    interview: [
      { q: "Compare Git Flow and trunk-based development — when would you choose each?", a: "Git Flow's long-lived <code>develop</code>/<code>release</code>/<code>hotfix</code> branches fit versioned software with scheduled releases and multiple supported versions; trunk-based (short-lived branches off a protected <code>main</code>) fits continuously-deployed systems like data pipelines, where frequent small integrations and strong CI beat heavy release machinery." },
      { q: "Why do short-lived branches reduce merge risk?", a: "They integrate before <code>main</code> drifts far, so conflicts stay small and are resolved while the code is fresh — the opposite of a weeks-old branch whose 'big bang' merge can silently clobber another change like the refund fix." },
      { q: "What must be in place before a team can safely adopt trunk-based development?", a: "A reliable automated test suite and branch protection on <code>main</code>, plus feature flags for incomplete work — otherwise daily merges just propagate breakage faster across everyone building on the trunk." },
      { q: "Why do most data pipelines avoid release branches?", a: "There's rarely a need to maintain 'version 1.3 of the revenue pipeline' in the field — there's just the current pipeline deployed continuously — so release/hotfix branches are overhead with no corresponding benefit." }
    ],

    problem: {
      before: "Early teams either all committed to one branch (and constantly broke each other) or kept huge long-lived branches per person that only merged every few weeks.",
      insufficient: "Both extremes hurt: one shared branch means half-finished work breaks everyone; long-lived branches drift from the mainline until the eventual merge is a conflict-ridden 'big bang' nobody remembers the context for.",
      failureModes: [
        "A three-week branch's merge silently reverts someone else's fix.",
        "Unfinished work committed to the shared branch blocks a release.",
        "Nobody can say which branch is actually deployable."
      ]
    },
    definition: {
      formal: "A branching strategy is the agreed convention for how branches are created, integrated, and released. <b>Trunk-based development</b> integrates every change into one mainline at least daily via short-lived branches (or direct commits behind flags). <b>Git Flow</b> uses long-lived <code>main</code>+<code>develop</code> plus <code>feature/</code>, <code>release/</code>, and <code>hotfix/</code> branches for versioned, scheduled releases.",
      distinguish: [
        { from: "Trunk-based vs 'no branches'", note: "Trunk-based means <i>short-lived</i> branches integrating frequently, not the absence of branches." },
        { from: "Strategy vs naming", note: "A strategy is a decision about integration frequency and release model backed by protection + CI — the branch names are the least important part." },
        { from: "Isolation vs integration", note: "Longer branches maximize isolation but make merges risky; frequent small integrations keep conflicts tiny." }
      ]
    },
    comparisons: [
      { title: "Git Flow vs Trunk-based development", aLabel: "Git Flow", bLabel: "Trunk-based",
        rows: [
          { dim: "Branch lifetime", a: "Long-lived develop/release/hotfix", b: "Short-lived (hours–a day)" },
          { dim: "Integration frequency", a: "Infrequent, at release time", b: "At least daily" },
          { dim: "Merge pain", a: "Higher — big-bang merges", b: "Lower — tiny, frequent" },
          { dim: "Needs", a: "Release discipline", b: "Strong CI + feature flags" },
          { dim: "Best fit", a: "Versioned shipped software", b: "Continuously-deployed pipelines" }
        ],
        verdict: "RetailFlow's pipeline deploys continuously, so <b>trunk-based / short-lived feature branches</b> fit; Git Flow's release machinery would be dead weight." }
    ],
    knowledgeChecks: [
      { level: "Explain", q: "Why do short-lived branches reduce merge risk?",
        options: [
          { label: "They integrate before main drifts, so conflicts stay tiny", ok: true, why: "Frequent small merges beat a weeks-old big-bang merge." },
          { label: "They skip code review", ok: false, why: "Short-lived branches still go through PR + CI." },
          { label: "They never conflict", ok: false, why: "They can conflict, but the conflicts are small and fresh." }
        ], revisit: "branching" },
      { level: "Decide", q: "A continuously-deployed revenue pipeline — which strategy?",
        options: [
          { label: "Short-lived feature branches off protected main (trunk-based)", ok: true, why: "No versioned field releases to maintain; integrate continuously." },
          { label: "Full Git Flow with develop + release branches", ok: false, why: "Release/hotfix machinery adds merge pain for no benefit here." },
          { label: "One shared branch, no PRs", ok: false, why: "Half-finished work would break the deployable line." }
        ], revisit: "branching" },
      { level: "Apply", q: "You must ship incomplete work without a long-lived branch. What do you use?",
        options: [
          { label: "A feature flag, merged dark and off by default", ok: true, why: "Keeps integration continuous while hiding unfinished behavior." },
          { label: "A three-week branch", ok: false, why: "That's exactly the drift trunk-based avoids." },
          { label: "Commit directly to main, enabled", ok: false, why: "Exposes unfinished logic to production." }
        ], revisit: "branching" }
    ],
    mastery: {
      task: "Recommend a branching strategy for RetailFlow's Daily Revenue Pipeline and justify it in three sentences, naming the one safeguard that makes your choice safe.",
      acceptance: [
        "Chooses short-lived feature branches / trunk-based with reasoning tied to continuous deployment.",
        "Names branch protection on main (required CI + review) as the safeguard.",
        "Mentions feature flags for incomplete work and daily rebase to avoid drift."
      ]
    },
    furtherReading: [
      { title: "Pro Git — Branching & Merging", publisher: "git-scm.com", url: "https://git-scm.com/doc", why: "The mechanics beneath any branching strategy.", read: "Ch. 3 — Git Branching (branches in a nutshell, rebasing).", reviewed: "2026-10-20" }
    ],

    related: ["git", "github", "ci-vs-cd", "github-actions"]
  }));
})();
