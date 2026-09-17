/* ============================================================
   modules/home.js — landing screen
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  var TOPICS = [
    { id: "architecture", icon: "🏛️", title: "Architecture Overview", desc: "Watch a task flow from DAG file to running worker.", ready: true },
    { id: "dag-parsing", icon: "📄", title: "DAG Parsing", desc: "From .py file to serialized DAG in the database.", ready: true },
    { id: "scheduler", icon: "⏱️", title: "Scheduler Internals", desc: "The loop that turns schedules into task instances.", ready: true },
    { id: "task-instance", icon: "🔲", title: "Task Instance", desc: "The state machine every task moves through.", ready: true },
    { id: "executors", icon: "⚙️", title: "Executors", desc: "Local, Celery, and Kubernetes — how work gets dispatched.", ready: true },
    { id: "xcoms", icon: "📦", title: "XCom", desc: "How tasks pass data — and when not to.", ready: true }
  ];

  var STATS = [
    { num: "41", label: "Modules" },
    { num: "150+", label: "Practice questions" },
    { num: "31", label: "Concept walkthroughs" },
    { num: "3.x", label: "Airflow target" }
  ];

  // Learning tools surfaced below the core-concept grid so the
  // practice/reference modules are discoverable from the landing page.
  var TOOLS = [
    { id: "dag-coding", icon: "🧑‍💻", title: "Reading & Writing DAGs", desc: "Read a DAG fast; write one without boilerplate.", ready: true },
    { id: "interview-bank", icon: "🎤", title: "Interview Question Bank", desc: "Scenario & community questions to rehearse.", ready: true },
    { id: "study", icon: "🎴", title: "Study Deck", desc: "Every quiz question in one searchable place.", ready: true },
    { id: "cheat-sheet", icon: "📋", title: "Cheat Sheet", desc: "The whole mental model on one printable page.", ready: true }
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
        '<section class="section" style="margin-top:var(--space-10)">' +
          '<h2 class="section-title">Sharpen your skills</h2>' +
          '<div class="card-grid stagger">' + TOOLS.map(card).join("") + "</div>" +
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
