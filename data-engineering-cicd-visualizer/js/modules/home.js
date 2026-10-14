/* modules/home.js — landing screen */
(function () {
  "use strict";
  var NS = (window.DECICDViz = window.DECICDViz || {});

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

  // Flat lookup of all topic items (for titles in the dashboard).
  var ITEM = {};
  TIERS.forEach(function (tier) { tier.items.forEach(function (it) { ITEM[it.id] = it; }); });

  function titleOf(id) {
    if (ITEM[id]) return ITEM[id].title;
    var r = (NS.routes || {})[id];
    return (r && r.title) || id;
  }

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

  function dashboard() {
    if (!NS.Progress) return "";
    var P = NS.Progress;
    var st = P.stats();
    var rec = P.recommended();
    var last = P.lastVisited();
    var bms = P.bookmarks();
    var rev = P.revisionQueue();
    var qz = P.quiz();

    function pill(id) {
      if (!id) return "";
      return '<a class="dash-pill" href="#' + id + '">' + titleOf(id) + " →</a>";
    }
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

  NS.registerModule({
    id: "home",
    title: "Home",
    render: function (container) {
      var flow = PATH.map(function (p, i) {
        return (i ? '<span class="home-flow-arrow">→</span>' : "") +
          '<span class="home-flow-node">' + p + "</span>";
      }).join("");

      var tiers = TIERS.map(function (tier) {
        return '<section class="section"><div class="home-tier-head">' +
          '<h2 class="section-title">' + tier.label + "</h2>" +
          tierProgress(tier) +
          '<span class="home-roi">ROI: ' + tier.roi + "</span></div>" +
          '<div class="card-grid stagger">' + tier.items.map(card).join("") + "</div></section>";
      }).join("");

      container.innerHTML =
        '<section class="hero animate-fade-in-up">' +
          '<div class="module-eyebrow">Interactive Learning Lab · RetailFlow</div>' +
          '<h1 class="hero-title">Data Engineering CI/CD<br><span class="gradient-text">from <code>git push</code> to production data.</span></h1>' +
          '<p class="hero-sub">Learn the engineering systems that take PySpark, SQL, dbt, Airflow, and Databricks code safely ' +
          "from a developer's laptop to production — taught end-to-end through one company, <b>RetailFlow</b>, and one real change to its revenue pipeline.</p>" +
          '<div class="hero-cta">' +
            '<a class="btn btn-primary" href="#git">Start with Git →</a>' +
            '<a class="btn btn-secondary" href="#business-scenario">Watch a change reach production</a>' +
            '<a class="btn btn-ghost" href="#interview">Interview prep</a>' +
          "</div>" +
          '<div class="home-flow">' + flow + "</div>" +
        "</section>" +
        '<div class="callout tip animate-fade-in"><span class="callout-icon">🧭</span><div class="callout-body">' +
          "Modules are ordered by <b>ROI for a modern Data Engineer</b> — learn the top tiers first. " +
          "Kubernetes, Argo CD, and Jenkins matter, but they shouldn't distract from Git, CI/CD, Terraform, Docker, Databricks, dbt, and testing.</div></div>" +
        dashboard() +
        tiers;

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
            document.body.appendChild(a); a.click();
            document.body.removeChild(a);
            setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
          } catch (e) {}
        });
      }
      if (resetBtn && NS.Progress) {
        resetBtn.addEventListener("click", function () {
          if (window.confirm("Reset all local progress, bookmarks, and revision queue? This can't be undone.")) {
            NS.Progress.reset();
            var c = document.getElementById("module-container");
            if (c) { c.innerHTML = ""; NS.modules.home.render(c); }
          }
        });
      }
    },
    destroy: function () {}
  });
})();
