/* ============================================================
   modules/home.js — landing screen
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.SolverViz = window.SolverViz || {});

  var TOPICS = [
    { id: "business-scenario", icon: "📦", title: "Nightly Supply Solve", desc: "Follow Widget-A from the Buyer's 8 AM workbench back through the nightly solve.", ready: true },
    { id: "what-is-solver", icon: "🧠", title: "What is the o9 Solver", desc: "The constraint-aware, graph-traversal engine behind supply decisions.", ready: true },
    { id: "planning-engine-stack", icon: "🏗️", title: "Planning Engine Stack", desc: "Rule engine → solver → rule engine, the 3-layer o9 stack.", ready: true },
    { id: "why-solver", icon: "❓", title: "Why a Solver", desc: "Why hundreds of Item-LCs can't be balanced by hand.", ready: true },
    { id: "solver-components", icon: "⚙️", title: "Solver Components", desc: "Consumption + Production + WIP solvers, coupled.", ready: true },
    { id: "sim-lab", icon: "🧪", title: "Solver Behavior Lab", desc: "Fire disruptions and watch the solver re-plan. (Coming soon)", ready: false }
  ];

  var STATS = [
    { num: "36", label: "Modules planned" },
    { num: "4", label: "Network echelons" },
    { num: "6", label: "Solver scenarios" },
    { num: "CATMPN", label: "o9 configuration" }
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
          '<h1 class="hero-title">Understand the o9 Supply Chain Solver<br><span class="gradient-text">from demand signal to purchase schedule.</span></h1>' +
          '<p class="hero-sub">A visual, animated walkthrough of the o9 Distribution Planning Solver (CATMPN) — DRP, ' +
          "inputs, constraints, net-requirement logic, shortage &amp; allocation, and the scenario questions you'll be asked in supply-planning interviews.</p>" +
          '<div class="hero-cta">' +
            '<a class="btn btn-primary" href="#business-scenario">Start with the nightly solve →</a>' +
            '<a class="btn btn-secondary" href="#what-is-solver">What is the solver?</a>' +
          "</div>" +
          '<div class="stat-row">' + stats + "</div>" +
        "</section>" +
        '<section class="section" style="margin-top:var(--space-12)">' +
          '<h2 class="section-title">Start here</h2>' +
          '<div class="card-grid stagger">' + TOPICS.map(card).join("") + "</div>" +
        "</section>" +
        '<div class="callout info">' +
          '<span class="callout-icon">📦</span>' +
          '<div class="callout-body">Built around the <b>CAT Aftermarket Parts Network</b> and one hero item, ' +
          "<b>Widget-A</b>, so every example — forecast, on-hand, order quantity — stays consistent as you move between modules.</div>" +
        "</div>";
    },
    destroy: function () {}
  };

  AV.registerModule(module);
})();
