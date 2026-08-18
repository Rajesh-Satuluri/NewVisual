/* ============================================================
   app.js — application bootstrap
   Owns: route registry, hash router, theme toggle, keyboard-help
   modal, sidebar/topbar active-state, mobile sidebar toggle.
   Modules are lazy-loaded on demand by the router.
   ready:true → a module file exists at js/modules/<id>.js.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.SolverViz = window.SolverViz || {});

  var ROUTES = {
    home: { title: "Home", ready: true },
    "business-scenario": { title: "Business Scenario: Nightly Supply Solve", ready: true },

    // Foundations
    "what-is-solver": { title: "What is the o9 Solver", ready: true },
    "planning-engine-stack": { title: "Planning Engine Stack", ready: true },
    "why-solver": { title: "Why a Solver", ready: true },
    "solver-components": { title: "Solver Components", ready: true },

    // DRP Framework
    "drp-overview": { title: "DRP Overview", ready: false },
    "multi-echelon": { title: "Multi-Echelon Flow", ready: false },
    objectives: { title: "Solver Objectives", ready: false },

    // Solver Inputs
    "demand-inputs": { title: "Demand Inputs", ready: false },
    "inventory-inputs": { title: "Inventory Inputs", ready: false },
    "supply-order-inputs": { title: "In-Flight Supply", ready: false },
    "network-topology": { title: "Network Topology", ready: false },
    "constraint-params": { title: "Constraint Parameters", ready: false },
    "capacity-inputs": { title: "Capacity Inputs", ready: false },

    // Constraints
    "freeze-windows": { title: "Freeze Windows", ready: false },
    "calendar-constraints": { title: "Calendar Constraints", ready: false },
    "quantity-constraints": { title: "Min / Mult / EOQ", ready: false },
    "capacity-constraints": { title: "Capacity Limits", ready: false },
    "network-validity": { title: "Network Validity", ready: false },
    "priority-constraints": { title: "Priority Rules", ready: false },

    // Solver Decisions
    "net-requirements": { title: "Net Requirements", ready: false },
    "timing-logic": { title: "Timing Logic", ready: false },
    "sourcing-logic": { title: "Sourcing Logic", ready: false },
    "shortage-handling": { title: "Shortage Handling", ready: false },
    allocation: { title: "Allocation", ready: false },
    pegging: { title: "Pegging", ready: false },

    // Execution & Outputs
    "batch-sequence": { title: "Batch Sequence", ready: false },
    "solver-outputs": { title: "Solver Outputs", ready: false },
    "worked-example": { title: "Worked Example", ready: false },

    // Learning Mode
    "sim-lab": { title: "Solver Behavior Lab", ready: false },
    interview: { title: "Interview Q&A", ready: false },
    "scenario-interview": { title: "Scenario Interviews", ready: false },
    quiz: { title: "Quiz", ready: false },
    glossary: { title: "Glossary", ready: false },
    "master-map": { title: "Master Concept Map", ready: false }
  };
  AV.routes = ROUTES;

  var App = {
    initTheme: function () {
      var root = document.documentElement;
      var stored = null;
      try { stored = localStorage.getItem("o9viz-theme"); } catch (e) {}
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
          try { localStorage.setItem("o9viz-theme", next); } catch (e) {}
        });
      }
    },

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

    initSidebar: function () {
      var sidebar = document.getElementById("sidebar");
      if (!sidebar) return;
      sidebar.addEventListener("click", function (e) {
        if (e.target.closest("a") && window.innerWidth <= 768) sidebar.classList.remove("open");
      });
    },

    syncNav: function (id) {
      var links = document.querySelectorAll("[data-route]");
      links.forEach(function (el) {
        el.classList.toggle("active", el.getAttribute("data-route") === id);
      });
      var route = ROUTES[id];
      document.title = (route && route.title ? route.title + " · " : "") + "o9 Solver Visualizer";
    },

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
