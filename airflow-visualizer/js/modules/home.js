/* ============================================================
   modules/home.js — landing screen
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  var TOPICS = [
    { id: "architecture", icon: "🏛️", title: "Architecture Overview", desc: "Watch a task flow from DAG file to running worker.", ready: true },
    { id: "scheduler", icon: "⏱️", title: "Scheduler Internals", desc: "The loop that turns schedules into task instances." },
    { id: "executors", icon: "⚙️", title: "Executors", desc: "Local, Celery, and Kubernetes — how work gets dispatched." },
    { id: "task-instance", icon: "🔲", title: "Task Instance", desc: "The state machine every task moves through." },
    { id: "xcoms", icon: "📦", title: "XCom", desc: "How tasks pass data — and when not to." },
    { id: "failure-scenarios", icon: "🔥", title: "Failure Scenarios", desc: "15 production incidents, root-caused." }
  ];

  var STATS = [
    { num: "51", label: "Modules" },
    { num: "80+", label: "Interview Q&As" },
    { num: "15", label: "Failure scenarios" },
    { num: "3.x", label: "Airflow target" }
  ];

  function card(t) {
    var badge = t.ready
      ? '<span class="badge badge-green">Live</span>'
      : '<span class="badge">Soon</span>';
    return (
      '<a class="card card-hover topic-card" href="#' + t.id + '">' +
        '<div class="topic-icon">' + t.icon + "</div>" +
        '<div class="card-title">' + t.title + badge + "</div>" +
        "<p>" + t.desc + "</p>" +
      "</a>"
    );
  }

  var module = {
    id: "home",
    title: "Home",
    render: function (container) {
      var stats = STATS.map(function (s) {
        return '<div class="stat"><div class="stat-num gradient-text">' + s.num +
          '</div><div class="stat-label">' + s.label + "</div></div>";
      }).join("");

      container.innerHTML =
        '<section class="hero animate-fade-in-up">' +
          '<div class="module-eyebrow">Interactive Learning Lab</div>' +
          '<h1 class="hero-title">Understand Apache Airflow<br><span class="gradient-text">from the inside out.</span></h1>' +
          '<p class="hero-sub">A visual, animated walkthrough of Airflow\'s internals — parsing, ' +
          "scheduling, execution, and the failure modes you'll be asked about in senior data-engineering interviews.</p>" +
          '<div class="hero-cta">' +
            '<a class="btn btn-primary" href="#architecture">Start with the architecture →</a>' +
            '<a class="btn btn-secondary" href="#interview">Interview prep</a>' +
          "</div>" +
          '<div class="stat-row">' + stats + "</div>" +
        "</section>" +
        '<section class="section" style="margin-top:var(--space-12)">' +
          '<h2 class="section-title">Start here</h2>' +
          '<div class="card-grid stagger">' + TOPICS.map(card).join("") + "</div>" +
        "</section>" +
        '<div class="callout info">' +
          '<span class="callout-icon">🌬️</span>' +
          '<div class="callout-body">Built around <b>ShopKart</b>, a fictional retailer, so every ' +
          "example — DAGs, tasks, incidents — stays consistent as you move between modules.</div>" +
        "</div>";
    },
    destroy: function () {}
  };

  AV.registerModule(module);
})();
