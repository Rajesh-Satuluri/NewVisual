/* ============================================================
   app.js — application bootstrap
   Owns: route registry, hash router, theme toggle, keyboard-help
   modal, sidebar/topbar active-state, mobile sidebar toggle.
   Modules are lazy-loaded on demand by the router.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  // ── Route registry ───────────────────────────────────────
  // ready:true → a module file exists at js/modules/<id>.js and is
  // lazy-loaded on navigation. Others render a "coming soon" screen
  // but still show correct titles + active nav state.
  var ROUTES = {
    home: { title: "Home", ready: true },
    architecture: { title: "Architecture Overview", ready: true },
    "dag-parsing": { title: "DAG Parsing", ready: true },
    "dag-run": { title: "DAG Run Lifecycle", ready: true },
    "task-instance": { title: "Task Instance", ready: true },
    scheduler: { title: "Scheduler Internals", ready: true },
    scheduling: { title: "Scheduling & Timetables", ready: true },
    backfill: { title: "Backfill", ready: true },
    executors: { title: "Executors", ready: true },
    "task-lifecycle": { title: "Task Lifecycle", ready: true },
    xcoms: { title: "XCom", ready: true },
    sensors: { title: "Sensors & Deferrable", ready: true },
    pools: { title: "Pools & Slots", ready: true },
    "task-mapping": { title: "Dynamic Tasks", ready: true },
    serialization: { title: "Serialization", ready: true },
    "metadata-db": { title: "Metadata DB", ready: true },
    callbacks: { title: "Callbacks", ready: true },
    templating: { title: "Templating & Jinja", ready: true },
    priority: { title: "Priority & Concurrency", ready: true },
    connections: { title: "Connections & Hooks", ready: true },
    variables: { title: "Variables & Params", ready: true },
    retries: { title: "Retries & SLAs", ready: true },
    logging: { title: "Logging", ready: true },
    monitoring: { title: "Monitoring & Metrics", ready: true },
    security: { title: "Security & RBAC" },
    cli: { title: "CLI Deep Dive" },
    "failure-scenarios": { title: "Failure Scenarios" },
    performance: { title: "Performance Tuning" },
    "ha-setup": { title: "High Availability" },
    kubernetes: { title: "Kubernetes Executor" },
    celery: { title: "Celery Executor" },
    interview: { title: "Interview Q&A" },
    quiz: { title: "Quiz" },
    glossary: { title: "Glossary" },
    "event-simulator": { title: "Event Simulator" },
    "master-map": { title: "Master Concept Map" }
  };
  AV.routes = ROUTES;

  var App = {
    // ── Theme ──────────────────────────────────────────────
    initTheme: function () {
      var root = document.documentElement;
      var stored = null;
      try { stored = localStorage.getItem("afviz-theme"); } catch (e) {}
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
          try { localStorage.setItem("afviz-theme", next); } catch (e) {}
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
      // Close the drawer after choosing a link on small screens.
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
      document.title = (route && route.title ? route.title + " · " : "") + "Apache Airflow Visualizer";
    },

    // ── Router ─────────────────────────────────────────────
    initRouter: function () {
      var container = document.getElementById("module-container");
      var self = this;
      this.router = new AV.Router({
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

  AV.App = App;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { App.start(); });
  } else {
    App.start();
  }
})();
