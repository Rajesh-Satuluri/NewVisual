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

  function card(t) {
    return '<a class="card card-hover topic-card" href="#' + t.id + '">' +
      '<div class="topic-icon">' + t.icon + "</div>" +
      '<div class="card-title">' + t.title + "</div>" +
      "<p>" + t.desc + "</p></a>";
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
        tiers;
    },
    destroy: function () {}
  });
})();
