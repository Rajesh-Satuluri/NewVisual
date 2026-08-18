/* modules/git.js — Tier 1 · Git (built on the concept-module factory) */
(function () {
  "use strict";
  var NS = (window.DECICDViz = window.DECICDViz || {});

  NS.registerModule(NS.Concept.build({
    id: "git",
    title: "Git",
    tool: "--tool-git",
    icon: "🔩",
    eyebrow: "Tier 1 · Essential Foundations",
    subtitle: "A time machine for code — and the safe, parallel workspace that lets RetailFlow change its revenue pipeline without touching production.",
    mentalImage: "SAVE POINTS + PARALLEL ROADS",

    flowTitle: "A change moving through Git",
    flow: ["Working directory", "git add", "Staging area", "git commit", "Local repo", "git push", "GitHub"],

    why: "Before Git, teams kept <code>pipeline_final.py</code>, <code>pipeline_final_v2.py</code>, <code>pipeline_latest.py</code> — nobody knew which was live, and two people editing at once overwrote each other.",
    what: "Git is a <b>version-control system</b>: it records the full history of every change and lets many engineers work in parallel, then merge safely.",
    how: "Changes move working directory → staging → commit (a save point) → push to a shared remote. Branches give each change its own road until it's reviewed and merged.",

    levels: {
      beginner: [
        { h: "The one-line idea", body: "Git is like a save-point system in a video game. Every <code>commit</code> is a checkpoint you can return to, and the whole team shares the same save file through GitHub." },
        { h: "The three places code lives", body: "<ul><li><b>Working directory</b> — the files you're editing right now.</li><li><b>Staging area</b> — the changes you've marked to save next (<code>git add</code>).</li><li><b>Repository</b> — the saved history (<code>git commit</code>).</li></ul>" },
        { h: "RetailFlow example", body: "An engineer needs to fix the net-revenue formula. They create a branch, commit the fix, and push — the nightly production pipeline keeps running untouched the whole time." }
      ],
      intermediate: [
        { h: "Branches & merging", body: "A <b>branch</b> is an independent line of work. <code>feature/fix-net-revenue</code> lets you experiment while <code>main</code> stays production-ready. <b>Merge</b> brings the branch back; <b>rebase</b> replays your commits on top of the latest main for a linear history." },
        { h: "Remotes", body: "<code>origin</code> is the shared GitHub copy. <code>push</code> sends commits up; <code>fetch</code>/<code>pull</code> bring teammates' commits down. Everyone syncs through the same remote." },
        { h: "Undoing safely", body: "<code>revert</code> makes a new commit that undoes a change (safe on shared branches). <code>reset</code> rewinds local history (use only before pushing)." }
      ],
      proficient: [
        { h: "Merge internals", body: "<b>Fast-forward</b> just moves the branch pointer when there's no divergence. A <b>three-way merge</b> uses the common ancestor plus both tips to build a merge commit. Conflicts happen when both sides change the same lines." },
        { h: "Branching strategy", body: "RetailFlow uses short-lived feature branches + protected <code>main</code> with required checks — close to <b>trunk-based development</b>. Long-lived release branches add overhead most data teams don't need." },
        { h: "Power tools", body: "<code>cherry-pick</code> a single commit across branches; <code>reflog</code> recovers 'lost' commits; tags mark releases; protected branches + CODEOWNERS enforce review before merge." }
      ]
    },

    micro: ["repository", "working tree", "staging area", "commit", "HEAD", "branch", "remote", "origin",
      "push", "pull", "fetch", "merge", "rebase", "conflict", "tag", "revert", "reset", "cherry-pick", ".gitignore"],

    before: ["pipeline_final.py", "pipeline_final_v2.py", "overwrite each other", "no history", "who changed what?"],
    after: ["one repo, full history", "feature branches", "safe parallel work", "reviewable diffs", "revert in seconds"],

    failure: {
      title: "Editing production directly (no branch)",
      steps: ["Edit main live", "typo in revenue calc", "no review", "pushed to prod", "7 AM dashboard wrong"],
      explain: "A branch + pull request would have caught this in review and CI <b>before</b> it reached production. Git isolates risky work so a mistake never lands on <code>main</code> unreviewed."
    },

    whenNot: "Don't commit <b>large data files or secrets</b> to Git — use object storage and a secret manager. Git is for source and configuration, not gigabytes of Parquet or a database password.",

    story: {
      situation: "RetailFlow's finance team finds refunds are being counted as revenue.",
      problem: "The fix touches code that runs in production every night — editing it live is dangerous.",
      decision: "The engineer cuts <code>feature/fix-net-revenue</code>, commits the corrected formula, and opens a PR.",
      tool: "Git branches + commits.",
      result: "The fix is reviewed and tested in isolation, then merged — production never saw an untested change.",
      remember: "Git records <i>what</i> changed; a branch gives a risky change a safe place to live until it's proven."
    },

    code: [{
      title: "Fix the revenue calc on a feature branch",
      lang: "bash",
      code: "git checkout -b feature/fix-net-revenue\n" +
            "# edit transforms/revenue.py\n" +
            "git add transforms/revenue.py\n" +
            "git commit -m \"Fix net revenue: subtract refunds, not add\"\n" +
            "git push -u origin feature/fix-net-revenue",
      highlights: [1, 5]
    }],

    remember: "Git records what changed and when; branches let a team change production code safely in parallel — nothing risky reaches <code>main</code> until it's reviewed.",

    retention: {
      question: "RetailFlow's engineer wants to change the revenue formula, but the pipeline runs in production nightly. What Git concept lets them experiment safely?",
      answer: "A <b>feature branch</b> — an independent line of development. The change lives on the branch (and goes through a PR + CI) until it's proven safe to merge into <code>main</code>."
    }
  }));
})();
