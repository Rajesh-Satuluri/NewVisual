/* ============================================================
   app.js — application bootstrap
   Owns: route registry, hash router, theme toggle, keyboard-help
   modal, sidebar/topbar active-state, mobile sidebar toggle.
   Modules are lazy-loaded on demand by the router.

   Data Engineering CI/CD Visualizer — namespace: DECICDViz.
   Content modules (js/modules/*.js) are added in later build
   iterations; until a module file exists, its route renders the
   router's "coming soon" fallback with the correct title + nav.
   ============================================================ */
(function () {
  "use strict";
  var NS = (window.DECICDViz = window.DECICDViz || {});

  // ── Route registry ───────────────────────────────────────
  // ready:true → a module file exists at js/modules/<id>.js and is
  // lazy-loaded on navigation. Order mirrors the ROI-first sidebar.
  var ROUTES = {
    home: { title: "Home", ready: true },

    // Real-world scenario
    "business-scenario": { title: "A Code Change Travels to Production", ready: true },
    "end-to-end-pipeline": { title: "End-to-End Pipeline", ready: true },
    "environment-promotion": { title: "Environment Promotion", ready: true },
    "failure-simulator": { title: "Failure Simulator", ready: true },

    // Tier 1 — Essential Foundations
    git: { title: "Git", ready: true },
    github: { title: "GitHub", ready: true },
    "github-actions": { title: "GitHub Actions", ready: true },

    // Tier 2 — Data Engineering CI/CD
    terraform: { title: "Terraform", ready: true },
    docker: { title: "Docker", ready: true },
    "databricks-bundles": { title: "Databricks Asset Bundles", ready: true },
    "dbt-cicd": { title: "dbt CI/CD", ready: true },
    pytest: { title: "pytest / Python Testing", ready: true },
    "sql-testing": { title: "SQL Testing", ready: true },
    "airflow-cicd": { title: "Airflow CI/CD", ready: true },

    // Tier 3 — Production Engineering
    kubernetes: { title: "Kubernetes", ready: true },
    helm: { title: "Helm", ready: true },
    "container-registry": { title: "Container Registry", ready: true },
    secrets: { title: "Secrets & Environment Management", ready: true },
    "data-quality": { title: "Data Quality", ready: true },
    sonarqube: { title: "SonarQube / Static Analysis", ready: true },

    // Tier 4 — Enterprise / Platform
    "azure-devops": { title: "Azure DevOps", ready: true },
    "argo-cd": { title: "Argo CD / GitOps", ready: true },
    jenkins: { title: "Jenkins", ready: true },

    // Engineering concepts
    "ci-vs-cd": { title: "CI vs CD", ready: true },
    "artifact-lifecycle": { title: "Artifact Lifecycle", ready: true },
    branching: { title: "Git Branching", ready: true },
    "testing-pyramid": { title: "Testing Pyramid", ready: true },
    "deployment-strategies": { title: "Deployment Strategies", ready: true },
    rollback: { title: "Rollback", ready: true },
    security: { title: "CI/CD Security", ready: true },
    observability: { title: "Observability", ready: true },

    // Learning
    interview: { title: "Interview Questions", ready: false },
    quiz: { title: "Quiz", ready: false },
    glossary: { title: "Glossary", ready: true },
    "master-map": { title: "Master Map", ready: true }
  };
  NS.routes = ROUTES;

  var App = {
    // ── Theme ──────────────────────────────────────────────
    initTheme: function () {
      var root = document.documentElement;
      var stored = null;
      try { stored = localStorage.getItem("decicd-theme"); } catch (e) {}
      if (stored === "light" || stored === "dark") root.setAttribute("data-theme", stored);

      var toggle = document.getElementById("theme-toggle");
      if (toggle) {
        toggle.addEventListener("click", function () {
          var current = root.getAttribute("data-theme");
          if (!current) {
            current = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
          }
          var next = current === "dark" ? "light" : "dark";
          root.setAttribute("data-theme", next);
          try { localStorage.setItem("decicd-theme", next); } catch (e) {}
        });
      }
    },

    // ── Keyboard-help modal + global (non-transport) keys ──
    initKeyboard: function () {
      var modal = document.getElementById("kbd-modal");
      var openBtn = document.getElementById("kbd-help-btn");
      var closeBtn = modal ? modal.querySelector(".modal-close") : null;
      var backdrop = modal ? modal.querySelector(".modal-backdrop") : null;

      function open() { if (modal) modal.classList.remove("hidden"); }
      function close() { if (modal) modal.classList.add("hidden"); }

      if (openBtn) openBtn.addEventListener("click", open);
      if (closeBtn) closeBtn.addEventListener("click", close);
      if (backdrop) backdrop.addEventListener("click", close);

      document.addEventListener("keydown", function (e) {
        var tag = (e.target && e.target.tagName) || "";
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        if (e.key === "?") open();
        else if (e.key === "Escape") close();
        else if (e.key === "t" || e.key === "T") {
          var toggle = document.getElementById("theme-toggle");
          if (toggle) toggle.click();
        }
      });

      this.renderShortcutList();
    },

    renderShortcutList: function () {
      var list = document.getElementById("kbd-list");
      if (!list) return;
      var shortcuts = [
        { keys: ["Space"], desc: "Play / pause animation" },
        { keys: ["→"], desc: "Next step" },
        { keys: ["←"], desc: "Previous step" },
        { keys: ["R"], desc: "Reset animation" },
        { keys: ["T"], desc: "Toggle theme" },
        { keys: ["?"], desc: "Show this help" },
        { keys: ["Esc"], desc: "Close dialog" }
      ];
      list.innerHTML = shortcuts
        .map(function (s) {
          var keys = s.keys.map(function (k) { return "<kbd>" + k + "</kbd>"; }).join("");
          return '<div class="kbd-row"><span>' + s.desc + '</span><span class="kbd-keys">' + keys + "</span></div>";
        })
        .join("");
    },

    // ── Mobile sidebar ─────────────────────────────────────
    initSidebar: function () {
      var sidebar = document.getElementById("sidebar");
      if (!sidebar) return;
      sidebar.addEventListener("click", function (e) {
        if (e.target.closest("a") && window.innerWidth <= 768) sidebar.classList.remove("open");
      });
    },

    // ── Active-nav sync (called by the router on every route) ─
    syncNav: function (id) {
      var links = document.querySelectorAll("[data-route]");
      links.forEach(function (el) {
        el.classList.toggle("active", el.getAttribute("data-route") === id);
      });
      var route = ROUTES[id];
      document.title = (route && route.title ? route.title + " · " : "") + "Data Engineering CI/CD Visualizer";
    },

    // ── Router ─────────────────────────────────────────────
    initRouter: function () {
      var container = document.getElementById("module-container");
      var self = this;
      this.router = new NS.Router({
        routes: ROUTES,
        container: container,
        defaultRoute: "home",
        onRoute: function (id) { self.syncNav(id); }
      });
      this.router.start();
    },

    start: function () {
      this.initTheme();
      this.initKeyboard();
      this.initSidebar();
      this.initRouter();
    }
  };

  NS.App = App;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { App.start(); });
  } else {
    App.start();
  }
})();
