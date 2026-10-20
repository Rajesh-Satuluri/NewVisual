/* modules/home.js — landing screen + two learning modes
   Guided Academy (level-by-level, prerequisite-aware path) and
   Reference Lab (ROI-tiered topic grid for free exploration). Both
   modes share the same progress and the same lesson metadata
   (DECICDViz.Curriculum) — the toggle only changes presentation. */
(function () {
  "use strict";
  var NS = (window.DECICDViz = window.DECICDViz || {});

  var MODE_KEY = "decicd-mode-v1";
  function getMode() {
    try { var m = localStorage.getItem(MODE_KEY); if (m === "guided" || m === "reference") return m; } catch (e) {}
    return "guided";
  }
  function setMode(m) { try { localStorage.setItem(MODE_KEY, m); } catch (e) {} }

  var PATH = ["Git", "GitHub", "CI", "Tests", "Docker", "Terraform", "Databricks", "Airflow / dbt", "Production"];

  var TIERS = [
    { label: "Tier 1 · Foundations", roi: "Very High", items: [
      { id: "git", icon: "🔩", title: "Git", desc: "Version history + safe parallel work." },
      { id: "github", icon: "🐙", title: "GitHub", desc: "PRs, review, branch protection." },
      { id: "github-actions", icon: "🔄", title: "GitHub Actions", desc: "Automated CI/CD on every push." }
    ]},
    { label: "Tier 2 · Data Engineering CI/CD", roi: "Very High", items: [
      { id: "terraform", icon: "🏗️", title: "Terraform", desc: "Infrastructure as code." },
      { id: "docker", icon: "🐳", title: "Docker", desc: "Package once, run anywhere." },
      { id: "databricks-bundles", icon: "🧱", title: "Databricks Bundles", desc: "Promote jobs dev→prod." },
      { id: "dbt-cicd", icon: "🔶", title: "dbt CI/CD", desc: "SQL transforms with tests + lineage." },
      { id: "pytest", icon: "🧪", title: "pytest", desc: "Python & PySpark tests." },
      { id: "sql-testing", icon: "🧮", title: "SQL Testing", desc: "Validate data correctness." },
      { id: "airflow-cicd", icon: "🌀", title: "Airflow CI/CD", desc: "Test & deploy DAGs." }
    ]},
    { label: "Tier 3 · Production Engineering", roi: "Medium–High", items: [
      { id: "kubernetes", icon: "☸️", title: "Kubernetes", desc: "Run containers at scale." },
      { id: "helm", icon: "⎈", title: "Helm", desc: "Templated k8s deployments." },
      { id: "container-registry", icon: "📦", title: "Container Registry", desc: "Store & promote images." },
      { id: "secrets", icon: "🔐", title: "Secrets", desc: "Keep credentials out of Git." },
      { id: "data-quality", icon: "✅", title: "Data Quality", desc: "Validate the data, not just the code." },
      { id: "sonarqube", icon: "🔎", title: "SonarQube", desc: "Static analysis & quality gates." }
    ]},
    { label: "Tier 4 · Enterprise / Platform", roi: "Contextual", items: [
      { id: "azure-devops", icon: "🔷", title: "Azure DevOps", desc: "Enterprise CI/CD suite." },
      { id: "argo-cd", icon: "🐙", title: "Argo CD", desc: "GitOps for Kubernetes." },
      { id: "jenkins", icon: "🔧", title: "Jenkins", desc: "Legacy CI, still common." }
    ]}
  ];

  // Flat lookup of all topic items (for titles + icons in both modes).
  var ITEM = {};
  TIERS.forEach(function (tier) { tier.items.forEach(function (it) { ITEM[it.id] = it; }); });

  function titleOf(id) {
    if (ITEM[id]) return ITEM[id].title;
    var r = (NS.routes || {})[id];
    return (r && r.title) || id;
  }
  function iconOf(id) { return (ITEM[id] && ITEM[id].icon) || "📄"; }

  // ── Capstone track (the 4 connected case-study chapters) ────
  var CAPSTONE = [
    { id: "business-scenario", label: "Business problem & impact" },
    { id: "end-to-end-pipeline", label: "Architecture & design" },
    { id: "environment-promotion", label: "Code change → production" },
    { id: "failure-simulator", label: "Incident response & recovery" }
  ];

  // ── Prerequisite-aware lesson status ────────────────────────
  // complete > in-progress (visited) > available (prereqs done) > locked.
  function lessonStatus(id) {
    var P = NS.Progress, C = NS.Curriculum;
    if (!P) return "available";
    if (P.isComplete(id)) return "complete";
    var pre = (C && C.has(id)) ? C.prereqs(id) : [];
    var ready = pre.every(function (p) { return P.isComplete(p); });
    if (P.isVisited(id)) return "in-progress";
    return ready ? "available" : "locked";
  }

  // Ordered list of lesson ids by level, then insertion order.
  function orderedLessons() {
    var C = NS.Curriculum;
    if (!C) return [];
    var byLevel = C.byLevel(), out = [];
    C.levels.forEach(function (l) { (byLevel[l.n] || []).forEach(function (id) { out.push(id); }); });
    return out;
  }

  // The single clearest next action: first level-ordered lesson that is
  // available (prereqs met) and not complete; fall back to first incomplete.
  function nextAction() {
    var ids = orderedLessons(), firstIncomplete = null;
    for (var i = 0; i < ids.length; i++) {
      var st = lessonStatus(ids[i]);
      if (st === "complete") continue;
      if (firstIncomplete == null) firstIncomplete = ids[i];
      if (st === "available" || st === "in-progress") return ids[i];
    }
    return firstIncomplete;
  }

  // ── Mode toggle ─────────────────────────────────────────────
  function modeToggle(mode) {
    function btn(key, label, sub) {
      return '<button type="button" class="mode-btn' + (mode === key ? " active" : "") +
        '" data-mode="' + key + '" role="tab" aria-selected="' + (mode === key) + '">' +
        '<span class="mode-btn-label">' + label + "</span>" +
        '<span class="mode-btn-sub">' + sub + "</span></button>";
    }
    return '<div class="mode-toggle" role="tablist" aria-label="Learning mode">' +
      btn("guided", "🎓 Guided Academy", "Structured path, beginner → expert") +
      btn("reference", "🔧 Reference Lab", "Jump to any tool or topic") +
      "</div>";
  }

  // ── Guided Academy: the level-by-level path ─────────────────
  function statusChip(st) {
    var map = {
      complete: ['done', '✓', 'Complete'],
      "in-progress": ['prog', '◐', 'In progress'],
      available: ['avail', '○', 'Ready'],
      locked: ['lock', '🔒', 'Prereqs first']
    };
    var m = map[st] || map.available;
    return '<span class="lesson-status ' + m[0] + '" title="' + m[2] + '">' + m[1] + "</span>";
  }

  function lessonRow(id) {
    var C = NS.Curriculum, m = C.meta(id);
    var st = lessonStatus(id);
    var pre = C.prereqs(id);
    var preHint = (st === "locked" && pre.length)
      ? ' title="Do first: ' + pre.map(titleOf).join(", ") + '"' : "";
    return '<a class="lesson-row lesson-' + st + '" href="#' + id + '"' + preHint + '>' +
      statusChip(st) +
      '<span class="lesson-row-icon">' + iconOf(id) + "</span>" +
      '<span class="lesson-row-main">' +
        '<span class="lesson-row-title">' + titleOf(id) + "</span>" +
        (m && m.estMinutes ? '<span class="lesson-row-est">~' + m.estMinutes + " min</span>" : "") +
      "</span>" +
      (st === "locked" && pre.length ? '<span class="lesson-row-lock">needs ' + pre.map(titleOf).join(" · ") + "</span>" : "") +
    "</a>";
  }

  function levelCard(level, ids, openId) {
    var P = NS.Progress;
    var done = ids.filter(function (id) { return P && P.isComplete(id); }).length;
    var open = ids.indexOf(openId) !== -1;
    return '<details class="level-card"' + (open ? " open" : "") + '>' +
      '<summary class="level-head">' +
        '<span class="level-n">L' + level.n + "</span>" +
        '<span class="level-titles"><span class="level-title">' + level.title + "</span>" +
          '<span class="level-summary">' + level.summary + "</span></span>" +
        '<span class="level-progress">' + done + "/" + ids.length + "</span>" +
      "</summary>" +
      '<div class="level-lessons">' + ids.map(lessonRow).join("") + "</div>" +
    "</details>";
  }

  function capstoneCard() {
    var P = NS.Progress;
    var done = CAPSTONE.filter(function (c) { return P && P.isComplete(c.id); }).length;
    var rows = CAPSTONE.map(function (c, i) {
      var st = lessonStatus(c.id);
      return '<a class="capstone-step" href="#' + c.id + '">' +
        statusChip(st) +
        '<span class="capstone-step-n">Ch ' + (i + 1) + "</span>" +
        '<span class="capstone-step-label">' + c.label + "</span></a>";
    }).join("");
    return '<section class="section capstone-card">' +
      '<div class="capstone-head">' +
        '<h2 class="section-title">🏷️ Capstone track · RetailFlow → Airbnb case study</h2>' +
        '<span class="capstone-progress">' + done + "/" + CAPSTONE.length + " chapters</span>" +
      "</div>" +
      '<p class="capstone-lead">One connected, evidence-based case study that ties the whole curriculum together — ' +
        "from the business problem to incident recovery. Then take the hands-on " +
        '<a class="cs-ref-link" href="#capstone">14-milestone RetailFlow Capstone</a>.</p>' +
      '<div class="capstone-steps">' + rows + "</div>" +
      '<div class="capstone-cta"><a class="btn btn-secondary btn-sm" href="#capstone">Open the 14-milestone capstone →</a></div>' +
    "</section>";
  }

  // ── Competency: mastery stages across the curriculum ───────
  function masteryCard() {
    var P = NS.Progress;
    if (!P || !P.masterySummary) return "";
    var sum = P.masterySummary();
    var labels = ["Not started", "Understand", "Implement", "Apply", "Diagnose", "Integrate"];
    var reached = 0; // lessons at stage >=1
    for (var i = 1; i <= 5; i++) reached += sum.buckets[i];
    var seg = [1, 2, 3, 4, 5].map(function (st) {
      var n = sum.buckets[st];
      var pct = sum.total ? Math.round((n / sum.total) * 100) : 0;
      return '<div class="mastery-seg mastery-s' + st + '" style="--w:' + pct + '%" title="' +
        labels[st] + ": " + n + '"><span class="mastery-seg-n">' + n + "</span></div>";
    }).join("");
    var legend = [1, 2, 3, 4, 5].map(function (st) {
      return '<span class="mastery-leg"><span class="mastery-dot mastery-s' + st + '"></span>' + labels[st] + "</span>";
    }).join("");
    return '<section class="section mastery-card">' +
      '<div class="dash-card-title">🧠 Skill mastery <span class="mastery-sub">derived from your knowledge-checks, labs &amp; capstone — not time on page</span></div>' +
      '<div class="mastery-bar">' + seg + "</div>" +
      '<div class="mastery-legend">' + legend + "</div>" +
      '<p class="mastery-foot">' + reached + " / " + sum.total + " lessons engaged. Stages climb as you pass checks, solve labs, and complete capstone milestones.</p>" +
    "</section>";
  }

  // ── Spaced review: concepts you missed resurface ───────────
  function reviewCard() {
    var P = NS.Progress;
    if (!P || !P.reviews) return "";
    var all = P.reviews();
    if (!all.length) return "";
    var due = all.filter(function (r) { return r.due; });
    function row(r) {
      return '<a class="review-chip' + (r.due ? " due" : "") + '" href="#' + r.id + '">' +
        titleOf(r.id) + (r.due ? " · due" : "") + "</a>";
    }
    return '<section class="section review-card">' +
      '<div class="dash-card-title">🔁 Spaced review ' +
        (due.length ? '<span class="review-due-badge">' + due.length + " due now</span>" : '<span class="mastery-sub">scheduled</span>') + "</div>" +
      '<p class="review-lead">Concepts you missed in a knowledge check come back on a spaced schedule. Answering them correctly pushes the next review further out.</p>' +
      '<div class="review-chips">' + all.slice(0, 12).map(row).join("") + "</div>" +
    "</section>";
  }

  function academyView(mode) {
    var C = NS.Curriculum;
    if (!C) return referenceView(); // graceful fallback
    var next = nextAction();
    var byLevel = C.byLevel();

    var hero = next ? (
      '<section class="section next-action">' +
        '<div class="next-action-eyebrow">▶ Your next step</div>' +
        '<a class="next-action-card" href="#' + next + '">' +
          '<span class="next-action-icon">' + iconOf(next) + "</span>" +
          '<span class="next-action-body">' +
            '<span class="next-action-title">' + titleOf(next) + "</span>" +
            '<span class="next-action-sub">' +
              (C.meta(next) ? "Level " + C.levelOf(next) + " · " + (C.levelInfo(C.levelOf(next)) || {}).title : "Continue learning") +
            "</span>" +
          "</span>" +
          '<span class="next-action-go">Start →</span>' +
        "</a>" +
      "</section>"
    ) : '<section class="section next-action"><div class="next-action-eyebrow">🎉 Path complete</div>' +
        '<p class="next-action-done">You have completed every lesson in the guided path. Revisit anything, or explore the Reference Lab.</p></section>';

    var levels = C.levels.map(function (l) {
      var ids = byLevel[l.n] || [];
      if (!ids.length) return "";
      return levelCard(l, ids, next);
    }).join("");

    return hero + masteryCard() + reviewCard() + capstoneCard() +
      '<section class="section"><h2 class="section-title">The learning path</h2>' +
        '<p class="section-lead">Eleven levels, beginner to expert. Each lesson shows its status and what to learn first. ' +
          "You can open any lesson any time — the order is guidance, not a lock.</p>" +
        '<div class="academy-levels">' + levels + "</div>" +
      "</section>";
  }

  // ── Reference Lab: ROI-tiered topic grid ────────────────────
  function card(t) {
    var done = NS.Progress && NS.Progress.isComplete(t.id);
    var visited = NS.Progress && NS.Progress.isVisited(t.id);
    var badge = done ? '<span class="topic-badge done" title="Completed">✓</span>'
      : (visited ? '<span class="topic-badge seen" title="Visited">•</span>' : "");
    return '<a class="card card-hover topic-card' + (done ? " is-done" : "") + '" href="#' + t.id + '">' +
      badge +
      '<div class="topic-icon">' + t.icon + "</div>" +
      '<div class="card-title">' + t.title + "</div>" +
      "<p>" + t.desc + "</p></a>";
  }
  function tierProgress(tier) {
    if (!NS.Progress) return "";
    var ids = tier.items.map(function (i) { return i.id; });
    var done = ids.filter(function (id) { return NS.Progress.isComplete(id); }).length;
    return '<span class="home-tier-progress">' + done + "/" + ids.length + "</span>";
  }
  function referenceView() {
    var tiers = TIERS.map(function (tier) {
      return '<section class="section"><div class="home-tier-head">' +
        '<h2 class="section-title">' + tier.label + "</h2>" +
        tierProgress(tier) +
        '<span class="home-roi">ROI: ' + tier.roi + "</span></div>" +
        '<div class="card-grid stagger">' + tier.items.map(card).join("") + "</div></section>";
    }).join("");
    return '<div class="callout tip animate-fade-in"><span class="callout-icon">🔧</span><div class="callout-body">' +
        "<b>Reference Lab.</b> Jump straight to any tool or concept. Press <kbd>/</kbd> to search across topics, " +
        "commands, and errors. Every page links back to its place in the guided path.</div></div>" +
      tiers;
  }

  // ── Dashboard (shared by both modes) ────────────────────────
  function dashboard() {
    if (!NS.Progress) return "";
    var P = NS.Progress;
    var st = P.stats();
    var rec = nextAction();
    var last = P.lastVisited();
    var bms = P.bookmarks();
    var rev = P.revisionQueue();
    var qz = P.quiz();

    function pill(id) { if (!id) return ""; return '<a class="dash-pill" href="#' + id + '">' + titleOf(id) + " →</a>"; }
    function list(items, emptyText) {
      if (!items.length) return '<p class="dash-empty">' + emptyText + "</p>";
      return '<div class="dash-chips">' + items.map(function (b) {
        return '<a class="dash-chip" href="#' + b.route + '">' + titleOf(b.id) + "</a>";
      }).join("") + "</div>";
    }
    var started = st.visited > 0 || bms.length || rev.length || qz;

    return '<section class="section dash animate-fade-in-up">' +
      '<div class="dash-head"><h2 class="section-title">Your learning dashboard</h2>' +
        '<div class="dash-head-actions">' +
          '<button type="button" class="btn btn-ghost btn-sm" id="dash-export">Export</button>' +
          '<button type="button" class="btn btn-ghost btn-sm" id="dash-reset">Reset</button>' +
        '</div></div>' +
      '<div class="dash-grid">' +
        '<div class="dash-card dash-progress">' +
          '<div class="dash-ring" style="--pct:' + st.pct + '"><span>' + st.pct + '%</span></div>' +
          '<div class="dash-progress-meta">' +
            '<div class="dash-stat"><b>' + st.complete + '</b> / ' + st.total + ' topics completed</div>' +
            '<div class="dash-stat-sub">' + st.visited + ' visited' +
              (qz ? ' · quiz best ' + qz.best + '/' + qz.total : '') + '</div>' +
            (rec ? '<div class="dash-next">Recommended next: ' + pill(rec) + '</div>' : '<div class="dash-next">🎉 All topics complete.</div>') +
            (last && last !== rec ? '<div class="dash-next dash-next-sub">Jump back in: ' + pill(last) + '</div>' : '') +
          '</div>' +
        '</div>' +
        '<div class="dash-card">' +
          '<div class="dash-card-title">★ Bookmarks</div>' +
          list(bms, "No bookmarks yet — open a topic and tap ☆ Bookmark.") +
        '</div>' +
        '<div class="dash-card">' +
          '<div class="dash-card-title">🔁 Revision queue</div>' +
          list(rev, "Empty — add topics to revise from any topic page.") +
        '</div>' +
      '</div>' +
      (started ? '' : '<p class="dash-hint">Progress, bookmarks, and your revision queue are saved in this browser only ' +
        '(no account, no sync across devices).</p>') +
    '</section>';
  }

  function heroHTML(mode) {
    return '<section class="hero animate-fade-in-up">' +
      '<div class="module-eyebrow">Data Engineering CI/CD Academy · RetailFlow</div>' +
      '<h1 class="hero-title">From <code>git push</code><br><span class="gradient-text">to trustworthy production data.</span></h1>' +
      '<p class="hero-sub">Learn the engineering systems that take PySpark, SQL, dbt, Airflow, and Databricks code safely ' +
      "from a laptop to production — a structured path from zero to production-ready, grounded in one continuous case study.</p>" +
      '<div class="hero-cta">' +
        '<a class="btn btn-primary" href="#' + (nextAction() || "ci-vs-cd") + '">▶ ' + (NS.Progress && NS.Progress.stats().visited ? "Continue" : "Start learning") + '</a>' +
        '<a class="btn btn-secondary" href="#business-scenario">Watch a change reach production</a>' +
        '<a class="btn btn-ghost" href="#labs">🧪 Hands-on labs</a>' +
      "</div>" +
      '<div class="home-flow">' + PATH.map(function (p, i) {
        return (i ? '<span class="home-flow-arrow">→</span>' : "") + '<span class="home-flow-node">' + p + "</span>";
      }).join("") + "</div>" +
    "</section>";
  }

  function renderInto(container) {
    var mode = getMode();
    container.innerHTML =
      heroHTML(mode) +
      modeToggle(mode) +
      dashboard() +
      (mode === "guided" ? academyView(mode) : referenceView());

    // Mode toggle handlers (re-render in place).
    container.querySelectorAll(".mode-btn").forEach(function (b) {
      b.addEventListener("click", function () {
        setMode(b.getAttribute("data-mode"));
        renderInto(container);
      });
    });

    // Dashboard controls.
    var exportBtn = container.querySelector("#dash-export");
    var resetBtn = container.querySelector("#dash-reset");
    if (exportBtn && NS.Progress) {
      exportBtn.addEventListener("click", function () {
        try {
          var blob = new Blob([NS.Progress.exportJSON()], { type: "application/json" });
          var url = URL.createObjectURL(blob);
          var a = document.createElement("a");
          a.href = url; a.download = "retailflow-cicd-progress.json";
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
          setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
        } catch (e) {}
      });
    }
    if (resetBtn && NS.Progress) {
      resetBtn.addEventListener("click", function () {
        if (window.confirm("Reset all local progress, bookmarks, and revision queue? This can't be undone.")) {
          NS.Progress.reset();
          renderInto(container);
        }
      });
    }
  }

  NS.registerModule({
    id: "home",
    title: "Home",
    render: function (container) { renderInto(container); },
    destroy: function () {}
  });
})();
