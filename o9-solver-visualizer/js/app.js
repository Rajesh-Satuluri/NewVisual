/* ============================================================
   app.js — application bootstrap (Iteration 0: Mastery shell)
   Owns: the TRACKS registry (single source of truth for the full
   11-track information architecture), the derived route table, the
   hash router, dynamic collapsible sidebar, theme toggle, keyboard
   help, command-palette + progress feature wiring, and the
   `app:navigate` event bus that decoupled features subscribe to.

   ready:true  → a module file exists at js/modules/<id>.js (built).
   ready:false → registered route; router shows the roadmap screen.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.SolverViz = window.SolverViz || {});

  /* ── TRACKS: the full study spine (see REVAMP-BLUEPRINT.md) ──
     Each item: [id, title, ready]. Existing modules keep their IDs
     so nothing breaks; new topics register as roadmap placeholders. */
  var TRACKS = [
    { id: "start", label: "Start Here", items: [
      ["home", "Home", true],
      ["dashboard", "Progress Dashboard", false],
      ["business-scenario", "📦 Business Scenario", true],
      ["worked-example", "Worked Example: Widget-A", true]
    ]},
    { id: "t0", label: "0 · Supply Chain Foundations", items: [
      ["sc-basics", "What is a Supply Chain", false],
      ["demand-supply-match", "The Demand–Supply Match", false],
      ["planning-landscape", "MRP · DRP · MPS · S&OP", false],
      ["key-vocab", "Core Vocabulary", false]
    ]},
    { id: "t1", label: "1 · Meet the Solver", items: [
      ["what-is-solver", "What is the o9 Solver", true],
      ["why-solver", "Why a Solver", true],
      ["solver-components", "Solver Components", true],
      ["planning-engine-stack", "Planning Engine Stack", true],
      ["objectives", "Solver Objectives", true],
      ["obo-heuristic", "Order-by-Order Heuristic", false],
      ["demand-sorting", "Demand Sorting", false],
      ["three-phases", "JIT · Build-Ahead · Build-Late", false],
      ["solve-pipeline", "The 23-Step Solve Pipeline", false]
    ]},
    { id: "t2", label: "2 · Network & Data Model", items: [
      ["nodes", "Nodes: Material / Activity / …", false],
      ["network-types", "Mfg · Distribution · Procurement", false],
      ["dimensions", "Dimensions", false],
      ["graphs", "Association Graphs", false],
      ["planning-horizon", "Planning Horizon", false],
      ["network-topology", "Network Topology", true],
      ["multi-echelon", "Multi-Echelon Flow", true],
      ["drp-overview", "DRP Overview", true]
    ]},
    { id: "t3", label: "3 · Solver Inputs", items: [
      ["inventory-inputs", "Inventory (BOH / ER)", true],
      ["demand-inputs", "Demand with Attributes", true],
      ["capacity-inputs", "Capacity", true],
      ["storage-inputs", "Storage", false],
      ["safety-stock", "Safety Stock Planning", false],
      ["wip-inputs", "WIP", false],
      ["activity-params", "Activity & Parameters", false],
      ["max-stock", "Max Stock", false],
      ["bom-effectivity", "BOM Component Effectivity", false],
      ["supply-order-inputs", "In-Flight Supply", true],
      ["constraint-params", "Constraint Params", true],
      ["other-inputs", "Infinite Inv · Rank List", false]
    ]},
    { id: "t4", label: "4 · Constraints & Timing", items: [
      ["hard-vs-soft", "Hard vs Soft Constraints", false],
      ["freeze-windows", "Freeze Windows", true],
      ["calendar-constraints", "Calendar & Holidays", true],
      ["quantity-constraints", "Lot Size · Min / Mult / Max", true],
      ["capacity-constraints", "Capacity Limits", true],
      ["network-validity", "Network Validity", true],
      ["priority-constraints", "Priority & Objective Rank List", true]
    ]},
    { id: "t5", label: "5 · Solver Decisions", items: [
      ["net-requirements", "Net Requirements", true],
      ["timing-logic", "Timing Logic", true],
      ["sourcing-logic", "Sourcing Logic", true],
      ["wip-sweep", "WIP / Inventory Sweep", false],
      ["material-reallocation", "Material Reallocation", false],
      ["shortage-handling", "Shortage Handling", true],
      ["allocation", "Allocation / Fair Share", true],
      ["safety-stock-pass", "Safety Stock Pass", false],
      ["excess-cleanup", "Excess Cleanup", false],
      ["pegging", "Pegging", true]
    ]},
    { id: "t6", label: "6 · Invocation & Planning Types", items: [
      ["invocation", "Invoking the Solver", false],
      ["constrained-unconstrained", "Constrained vs Unconstrained", false],
      ["plan-types", "Plan Types", false],
      ["incremental-order-promise", "Incremental & Order Promise", false],
      ["batch-sequence", "Batch Sequence", true]
    ]},
    { id: "t7", label: "7 · Outputs & Reports", items: [
      ["solver-outputs", "Solver Outputs", true],
      ["flow-plans", "Flow Plans", false],
      ["inventory-plan", "Inventory Plan", false],
      ["delivery-plan", "Delivery Plan", false],
      ["distribution-load-plan", "Distribution & Load Plan", false],
      ["where-used", "Where-Used Report", false],
      ["rca", "Root Cause Analysis (RCA)", false]
    ]},
    { id: "t8", label: "8 · Supported Models", items: [
      ["lot-based", "Lot-Based Planning", false],
      ["supply-code", "Supply Code Planning", false],
      ["mix-match", "Mix & Match Supply Code", false],
      ["shelf-life", "Shelf Life", false],
      ["class-based-shelf-life", "Class-Based Shelf Life", false],
      ["class-based-planning", "Class-Based Planning", false],
      ["no-carry", "No Inventory Hold (No Carry)", false],
      ["co-products", "Co-Products", false],
      ["yield-time-varying", "Time-Varying Yield", false],
      ["campaign-batch", "Campaign / Batch Consolidation", false],
      ["alt-resource-consolidation", "Alternate Resource Consolidation", false],
      ["multi-step-routing", "Multi-Step Routing", false],
      ["psp", "Planning Along a Single Path", false],
      ["soft-quarantine", "Soft Quarantine", false],
      ["shipping-holidays", "Shipping & Receiving Holidays", false],
      ["transition-substitution", "Transition & Substitution", false]
    ]},
    { id: "t9", label: "9 · Optimization · Perf · Ops", items: [
      ["optimization", "Optimization Passes", false],
      ["performance", "Performance & Scale", false],
      ["debug", "Debug & Diagnostics", false],
      ["config-ui", "Solver Config UI", false],
      ["ml-flow", "ML Flow", false],
      ["deployment", "Remote & Retail SCS", false]
    ]},
    { id: "t10", label: "10 · Learning & Mastery", items: [
      ["playground", "Solver Playground", false],
      ["sim-lab", "Scenario Lab", true],
      ["capability-matrix", "Capability Matrix", false],
      ["rca-clinic", "RCA Clinic", false],
      ["interview", "Interview Q&A", true],
      ["scenario-interview", "Scenario Interviews", true],
      ["mock-interview", "Mock Interview", false],
      ["quiz", "Quiz", true],
      ["decision-drills", "Decision Drills", false],
      ["glossary", "Glossary", true],
      ["cheatsheet", "Cheat Sheet", false],
      ["master-map", "Master Concept Map", true]
    ]}
  ];
  AV.tracks = TRACKS;

  // ── Derive the flat route table the router consumes ──
  var ROUTES = {};
  var SCREENS = []; // ordered {id, title, ready, track, trackLabel}
  TRACKS.forEach(function (tr) {
    tr.items.forEach(function (it) {
      var id = it[0], title = it[1], ready = !!it[2];
      ROUTES[id] = { title: title, ready: ready, group: tr.id };
      SCREENS.push({ id: id, title: title, ready: ready, track: tr.id, trackLabel: tr.label });
    });
  });
  AV.routes = ROUTES;

  // ── Public accessors (features depend on these, not the router) ──
  AV.getScreens = function () { return SCREENS.slice(); };
  AV.getTracks = function () { return TRACKS.slice(); };
  AV.getScreen = function (id) { return ROUTES[id] ? { id: id, title: ROUTES[id].title, ready: ROUTES[id].ready, track: ROUTES[id].group } : null; };
  AV.currentScreenId = function () { return (location.hash || "#home").replace(/^#/, "").trim() || "home"; };

  var NAV_COLLAPSE_KEY = "o9scs-nav-collapsed";

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
          if (!current) current = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
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
        // Command palette owns ⌘K / Ctrl-K.
        if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) return;
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
        { keys: ["⌘/Ctrl", "K"], desc: "Open command palette / search" },
        { keys: ["Space"], desc: "Play / pause animation" },
        { keys: ["→"], desc: "Next step" },
        { keys: ["←"], desc: "Previous step" },
        { keys: ["R"], desc: "Reset animation" },
        { keys: ["T"], desc: "Toggle theme" },
        { keys: ["?"], desc: "Show this help" },
        { keys: ["Esc"], desc: "Close dialog" }
      ];
      list.innerHTML = shortcuts.map(function (s) {
        var keys = s.keys.map(function (k) { return "<kbd>" + k + "</kbd>"; }).join("");
        return '<div class="kbd-row"><span>' + s.desc + '</span><span class="kbd-keys">' + keys + "</span></div>";
      }).join("");
    },

    // ── Dynamic sidebar built from TRACKS ──
    buildSidebar: function () {
      var sidebar = document.getElementById("sidebar");
      if (!sidebar) return;
      var collapsed = {};
      try { collapsed = JSON.parse(localStorage.getItem(NAV_COLLAPSE_KEY) || "{}") || {}; } catch (e) {}

      var html = '<div class="nav-progress" id="nav-progress"></div>';
      TRACKS.forEach(function (tr) {
        var isCollapsed = collapsed[tr.id] === true;
        var links = tr.items.map(function (it) {
          var id = it[0], title = it[1], ready = !!it[2];
          return '<li><a href="#' + id + '" class="sidebar-link" data-route="' + id + '">' +
            '<span class="sl-check" aria-hidden="true"></span>' +
            '<span class="sl-text">' + title + "</span>" +
            (ready ? "" : '<span class="sl-soon" title="On the build roadmap">soon</span>') +
          "</a></li>";
        }).join("");
        html +=
          '<div class="sidebar-section' + (isCollapsed ? " collapsed" : "") + '" data-track="' + tr.id + '">' +
            '<button class="sidebar-label" data-track-toggle="' + tr.id + '" aria-expanded="' + (!isCollapsed) + '">' +
              '<span class="sl-caret" aria-hidden="true">▾</span>' +
              '<span>' + tr.label + "</span>" +
              '<span class="sl-count" data-track-count="' + tr.id + '"></span>' +
            "</button>" +
            '<ul class="sidebar-list" role="list">' + links + "</ul>" +
          "</div>";
      });
      sidebar.innerHTML = html;

      // Collapse / expand track sections
      sidebar.addEventListener("click", function (e) {
        var btn = e.target.closest("[data-track-toggle]");
        if (!btn) return;
        var sec = btn.closest(".sidebar-section");
        var tid = btn.getAttribute("data-track-toggle");
        var nowCollapsed = sec.classList.toggle("collapsed");
        btn.setAttribute("aria-expanded", String(!nowCollapsed));
        try {
          var c = JSON.parse(localStorage.getItem(NAV_COLLAPSE_KEY) || "{}") || {};
          c[tid] = nowCollapsed; localStorage.setItem(NAV_COLLAPSE_KEY, JSON.stringify(c));
        } catch (err) {}
      });

      // Mobile: close drawer after choosing a link
      sidebar.addEventListener("click", function (e) {
        if (e.target.closest("a") && window.innerWidth <= 768) sidebar.classList.remove("open");
      });
    },

    initMobileToggle: function () {
      var btn = document.getElementById("sidebar-toggle");
      var sidebar = document.getElementById("sidebar");
      if (btn && sidebar) {
        btn.addEventListener("click", function () { sidebar.classList.toggle("open"); });
      }
    },

    syncNav: function (id) {
      document.querySelectorAll("[data-route]").forEach(function (el) {
        el.classList.toggle("active", el.getAttribute("data-route") === id);
      });
      // Auto-expand the track that owns the active screen
      var route = ROUTES[id];
      if (route) {
        var sec = document.querySelector('.sidebar-section[data-track="' + route.group + '"]');
        if (sec && sec.classList.contains("collapsed")) {
          sec.classList.remove("collapsed");
          var btn = sec.querySelector("[data-track-toggle]");
          if (btn) btn.setAttribute("aria-expanded", "true");
        }
      }
      var active = document.querySelector('.sidebar-link.active');
      if (active && active.scrollIntoView) {
        try { active.scrollIntoView({ block: "nearest" }); } catch (e) {}
      }
      document.title = (route && route.title ? route.title + " · " : "") + "o9 SCS Mastery";

      // Fire the event bus so decoupled features react (progress, etc.)
      try { document.dispatchEvent(new CustomEvent("app:navigate", { detail: { id: id } })); } catch (e) {}
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
      this.buildSidebar();
      this.initKeyboard();
      this.initMobileToggle();
      if (AV.Progress && AV.Progress.init) AV.Progress.init();
      if (AV.CommandPalette && AV.CommandPalette.init) AV.CommandPalette.init();
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
