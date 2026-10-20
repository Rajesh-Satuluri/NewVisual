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
    },

    production: [
      { h: "Keep secrets and data out of history", body: "A committed credential or Parquet file stays in history forever — <code>git rm</code> doesn't remove it. Use a <code>.gitignore</code>, a secret manager, and pre-commit scanning; a leaked key must be <b>rotated</b>, not just deleted." },
      { h: "Protect main and shared branches", body: "On shared history prefer <code>revert</code> (a new undo commit) over <code>reset</code>/force-push. RetailFlow protects <code>main</code> so no one can rewrite the history the nightly revenue pipeline builds on." },
      { h: "Signed commits for auditability", body: "Finance-critical changes like <code>feature/fix-net-revenue</code> benefit from GPG/SSH-signed commits and tags, so the audit trail proves <i>who</i> changed <code>net_revenue = gross_revenue - refund_amount</code>." },
      { h: "Reproducible checkouts", body: "Pin dependencies and use tags/SHAs, not moving branch names, when a pipeline checks out code to run — so a deploy is tied to one exact commit, not 'whatever main was'." }
    ],

    misconceptions: [
      { myth: "<code>git pull</code> is just a download.", truth: "It is <code>fetch</code> + <code>merge</code> (or <code>rebase</code>). It can create merge commits and conflicts in your working tree, unlike a plain fetch." },
      { myth: "A commit saves my working-directory files.", truth: "Only <b>staged</b> changes are committed. Edits you never <code>git add</code> stay out of the commit — a common cause of 'my fix didn't ship'." },
      { myth: "<code>git reset --hard</code> loses commits permanently.", truth: "Commits usually survive in the <b>reflog</b> for ~90 days; <code>git reflog</code> + <code>git checkout</code> can recover them. Only truly unreferenced, garbage-collected objects are gone." },
      { myth: "Rebase and merge produce the same history.", truth: "Merge preserves the branch topology with a merge commit; rebase rewrites your commits onto a new base for a linear history — and must not be done on already-pushed shared branches." }
    ],

    troubleshooting: [
      { symptom: "<code>! [rejected] ... (non-fast-forward)</code> on push.", cause: "The remote branch has commits you don't have locally.", fix: "<code>git pull --rebase</code> to replay your work on top, resolve conflicts, then push. Verify with <code>git status</code> showing 'up to date'." },
      { symptom: "A committed change isn't in the pushed branch.", cause: "The file was edited but never staged, or committed on a different branch.", fix: "<code>git log --oneline -- transforms/revenue.py</code> to locate the commit; <code>git cherry-pick</code> or re-commit on the right branch, then confirm with <code>git show</code>." },
      { symptom: "Merge conflict markers (<code>&lt;&lt;&lt;&lt;&lt;&lt;&lt;</code>) in revenue.py.", cause: "Both branches changed the same lines.", fix: "Edit to the correct <code>net_revenue</code> logic, <code>git add</code> the file, <code>git commit</code>; verify by running the unit test for net revenue." },
      { symptom: "A secret was accidentally committed and pushed.", cause: "The credential is now in remote history.", fix: "<b>Rotate the credential immediately</b>, then scrub history with <code>git filter-repo</code> and force-push; verify the value no longer appears in <code>git log -p</code>." }
    ],

    interview: [
      { q: "Explain the difference between <code>git merge</code> and <code>git rebase</code>, and when you'd use each.", a: "Merge records a merge commit and keeps true history — safe for shared branches. Rebase replays commits onto a new base for a linear history — great for cleaning up a local feature branch before a PR, but never on commits others have already pulled, because it rewrites SHAs." },
      { q: "You pushed a commit that broke the nightly revenue job. How do you undo it safely?", a: "Use <code>git revert &lt;sha&gt;</code> to create a new commit that reverses the change — it's safe on shared history because it doesn't rewrite it, whereas <code>reset</code>/force-push would break everyone who already pulled <code>main</code>." },
      { q: "What is the staging area and why does Git have it?", a: "It's an intermediate index between the working tree and a commit, letting you craft a commit from a subset of your changes — e.g. commit the revenue fix while leaving unrelated debug edits uncommitted, which keeps commits focused and reviewable." },
      { q: "How would you recover a commit after an accidental <code>git reset --hard</code>?", a: "Run <code>git reflog</code> to find the lost commit's SHA — the reflog records where HEAD has been for ~90 days — then <code>git checkout</code> or <code>git cherry-pick</code> it back, provided garbage collection hasn't pruned it." }
    ],

    interactive: [{
      title: "Interactive: build a commit graph",
      lead: "Run safe, simulated Git operations and watch the history graph change. Nothing touches a real repo.",
      mount: function (host) {
        // Model: commits [{id, branch, parent}], branches {name: headId}, HEAD branch.
        var seq = 0;
        var commits = [{ id: "c0", branch: "main", parent: null, msg: "init" }];
        var branches = { main: "c0" };
        var head = "main";
        var log = [];

        function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
        function newId() { return "c" + (++seq); }

        var wrap = document.createElement("div");
        wrap.className = "gv";
        wrap.innerHTML =
          '<div class="gv-controls">' +
            '<label class="gv-head">HEAD: <select class="gv-branch"></select></label>' +
            '<button type="button" class="btn btn-secondary btn-sm gv-commit">commit</button>' +
            '<button type="button" class="btn btn-secondary btn-sm gv-branch-new">branch feature/*</button>' +
            '<button type="button" class="btn btn-secondary btn-sm gv-merge">merge → main</button>' +
            '<button type="button" class="btn btn-ghost btn-sm gv-reset">reset demo</button>' +
          "</div>" +
          '<div class="gv-graph"></div>' +
          '<pre class="gv-log"></pre>';
        host.appendChild(wrap);

        var sel = wrap.querySelector(".gv-branch");
        var graph = wrap.querySelector(".gv-graph");
        var logEl = wrap.querySelector(".gv-log");

        function paint() {
          sel.innerHTML = Object.keys(branches).map(function (b) {
            return '<option value="' + esc(b) + '"' + (b === head ? " selected" : "") + ">" + esc(b) + "</option>";
          }).join("");
          graph.innerHTML = commits.map(function (c) {
            var isHead = branches[head] === c.id;
            var tags = Object.keys(branches).filter(function (b) { return branches[b] === c.id; });
            return '<div class="gv-commit-node gv-b-' + esc(c.branch) + (isHead ? " gv-is-head" : "") + '">' +
              '<span class="gv-dot"></span>' +
              '<span class="gv-cid">' + esc(c.id) + "</span>" +
              '<span class="gv-cmsg">' + esc(c.msg) + "</span>" +
              (tags.length ? '<span class="gv-tags">' + tags.map(function (t) { return '<span class="gv-tag">' + esc(t) + "</span>"; }).join("") + "</span>" : "") +
            "</div>";
          }).join("");
          logEl.textContent = log.slice(-6).join("\n");
        }

        function doCommit() {
          var id = newId();
          commits.push({ id: id, branch: head, parent: branches[head], msg: head === "main" ? "work on main" : "feature work" });
          branches[head] = id;
          log.push("$ git commit        → " + id + " on " + head);
          paint();
        }
        function doBranch() {
          var name = "feature/f" + (Object.keys(branches).length);
          branches[name] = branches[head];
          head = name;
          log.push("$ git checkout -b " + name);
          paint();
        }
        function doMerge() {
          if (head === "main") { log.push("# already on main — nothing to merge"); paint(); return; }
          var id = newId();
          commits.push({ id: id, branch: "main", parent: branches.main, msg: "merge " + head, merge: head });
          branches.main = id;
          log.push("$ git checkout main && git merge " + head + " → " + id);
          head = "main";
          paint();
        }
        function reset() {
          seq = 0; commits = [{ id: "c0", branch: "main", parent: null, msg: "init" }];
          branches = { main: "c0" }; head = "main"; log = [];
          paint();
        }

        sel.addEventListener("change", function () { head = sel.value; paint(); });
        wrap.querySelector(".gv-commit").addEventListener("click", doCommit);
        wrap.querySelector(".gv-branch-new").addEventListener("click", doBranch);
        wrap.querySelector(".gv-merge").addEventListener("click", doMerge);
        wrap.querySelector(".gv-reset").addEventListener("click", reset);
        paint();
      }
    }],

    problem: {
      before: "Teams versioned code by copying folders: <code>pipeline_final/</code>, <code>pipeline_final_v2/</code>, <code>pipeline_REALLY_final/</code>. Sharing meant emailing zips or editing files on a shared drive.",
      insufficient: "Copies don't record <i>why</i> something changed, can't merge two people's edits, and silently overwrite each other. There's no reliable way to answer 'what changed between the version that worked and the one that broke?'",
      failureModes: [
        "Two engineers edit the shared revenue script; the last to save wins and the other's work vanishes.",
        "Nobody can tell which copy is the one running in production.",
        "A bad change can't be isolated or undone because there's no history to revert to."
      ]
    },
    intuition: {
      plain: "Git gives every change a permanent, labelled save point and lets each person work on their own copy of the whole history, then reconcile safely. Nothing is lost, and you can always see who changed what and why.",
      analogy: "Like a video game's save points plus parallel save slots: you branch off to try something risky, and if it goes wrong you load the last good save — the main save is untouched.",
      breaks: "Game saves are usually linear and single-player; Git is distributed and multi-player, so it must also <i>merge</i> independent lines of history — something a single save slot never does."
    },
    definition: {
      formal: "Git is a distributed version-control system. A <b>commit</b> is an immutable snapshot of the tracked tree plus metadata (author, message, parent commit(s)), identified by a hash of its content. A <b>branch</b> is a movable pointer to a commit; <b>HEAD</b> points at your current branch. History is a directed acyclic graph of commits.",
      distinguish: [
        { from: "Working tree vs staging vs commit", note: "The working tree is your current files; the staging area (index) is what you've marked for the next commit; a commit is the recorded snapshot. Edits you never <code>git add</code> aren't committed." },
        { from: "Branch vs commit", note: "A commit is a fixed snapshot; a branch is just a moving label pointing at one. Deleting a branch doesn't delete its commits immediately." },
        { from: "git fetch vs pull", note: "<code>fetch</code> only downloads remote commits; <code>pull</code> is fetch + merge/rebase and can change your working tree and create conflicts." }
      ]
    },
    mechanics: [
      { h: "Content-addressed snapshots", body: "Each commit stores a snapshot of the whole tree (as blobs/trees) and the parent commit's hash. Because the id is a hash of the content + parents, history is tamper-evident and a commit's identity is fixed — rewriting it creates a <i>new</i> commit with a new id." },
      { h: "Branches are cheap pointers", body: "Creating a branch just writes a 41-byte pointer; that's why feature branches are free. <code>HEAD</code> tracks the current branch, and committing moves that branch pointer forward." },
      { h: "Merging", body: "A <b>fast-forward</b> merge moves the pointer when there's no divergence. A <b>three-way merge</b> uses the common ancestor plus both tips to synthesize a merge commit; a conflict arises only when both sides changed the same region." },
      { h: "The reflog safety net", body: "Git records where HEAD has been in the <b>reflog</b> for ~90 days, so most 'lost' commits after a bad reset are recoverable until garbage collection prunes unreferenced objects." }
    ],
    trace: [
      { t: "git checkout -b feature/fix-net-revenue", state: "success", detail: "Creates a branch pointer at the current commit and moves HEAD to it." },
      { t: "edit transforms/revenue.py", state: "running", detail: "Changes live only in the working tree so far." },
      { t: "git add transforms/revenue.py", state: "success", detail: "Stages the change into the index — now it will be part of the next commit." },
      { t: "git commit -m \"Fix net revenue…\"", state: "success", detail: "Records an immutable snapshot; the branch pointer advances to the new commit." },
      { t: "git push -u origin feature/fix-net-revenue", state: "success", detail: "Uploads the commit to the shared remote and sets the upstream for future pushes." }
    ],
    comparisons: [
      { title: "git revert vs git reset", aLabel: "revert", bLabel: "reset",
        rows: [
          { dim: "What it does", a: "Adds a new commit that undoes a change", b: "Moves the branch pointer to an earlier commit" },
          { dim: "Rewrites history?", a: "No", b: "Yes (for commits after the target)" },
          { dim: "Safe on shared branches?", a: "Yes", b: "No — breaks everyone who pulled" },
          { dim: "Use when", a: "Undoing a pushed/shared change", b: "Cleaning up local, unpushed work" }
        ],
        verdict: "On <code>main</code> or any pushed branch, always <b>revert</b>; keep <b>reset</b> for local history you haven't shared." },
      { title: "merge vs rebase", aLabel: "merge", bLabel: "rebase",
        rows: [
          { dim: "History shape", a: "Preserves topology + merge commit", b: "Linear, replayed onto a new base" },
          { dim: "Commit ids", a: "Unchanged", b: "Rewritten (new SHAs)" },
          { dim: "Shared branches", a: "Safe", b: "Never rebase already-pushed commits" }
        ],
        verdict: "Rebase to tidy a <i>local</i> feature branch before a PR; merge to integrate shared history." }
    ],
    knowledgeChecks: [
      { level: "Recall", q: "Which command records a snapshot into history?",
        options: [
          { label: "git commit", ok: true, why: "A commit records the staged snapshot into the repository." },
          { label: "git add", ok: false, why: "That stages changes; it doesn't commit them." },
          { label: "git push", ok: false, why: "That uploads existing commits to a remote." }
        ], revisit: "git" },
      { level: "Predict", q: "You edited a file but never ran <code>git add</code>, then committed. What's in the commit?",
        options: [
          { label: "Not your edit — only staged changes are committed", ok: true, why: "Unstaged edits stay in the working tree, out of the commit." },
          { label: "Your edit, automatically", ok: false, why: "Git only commits what's staged (unless you use -a)." },
          { label: "Nothing can be committed", ok: false, why: "Other staged changes could still commit; yours wouldn't." }
        ], revisit: "git" },
      { level: "Troubleshoot", q: "Push is rejected as non-fast-forward. Best next step?",
        options: [
          { label: "git pull --rebase, resolve, then push", ok: true, why: "Replays your commits on top of the remote's new work, then pushes cleanly." },
          { label: "git push --force immediately", ok: false, why: "Force-push can destroy teammates' commits on a shared branch." },
          { label: "Delete the remote branch", ok: false, why: "Destructive and unnecessary; integrate the remote work instead." }
        ], revisit: "git" },
      { level: "Decide", q: "A pushed commit broke the nightly job. How do you undo it safely?",
        options: [
          { label: "git revert the commit", ok: true, why: "Creates a new undo commit without rewriting shared history." },
          { label: "git reset --hard and force-push", ok: false, why: "Rewrites history others have pulled — breaks their clones." },
          { label: "Edit files and recommit silently", ok: false, why: "Loses the audit trail of what was reverted and why." }
        ], revisit: "git" }
    ],
    mastery: {
      task: "On a fresh branch, make two separate commits (a code change and a doc change), then combine them into the right order for a clean PR without losing either — and explain whether you'd rebase or merge to land it on protected <code>main</code>.",
      acceptance: [
        "Two focused commits exist with clear messages.",
        "You can show the branch's history with git log.",
        "You correctly choose revert (not reset) for any shared-history undo.",
        "Your explanation states you never rebase already-pushed shared commits."
      ]
    },
    furtherReading: [
      { title: "Pro Git (book) + Reference", publisher: "git-scm.com", url: "https://git-scm.com/doc", why: "The authoritative, free reference and book — especially branching and the staging model.", read: "Ch. 2 (recording changes) and Ch. 3 (branching & merging).", reviewed: "2026-10-20" }
    ],

    related: ["github", "branching", "ci-vs-cd", "github-actions"]
  }));
})();
