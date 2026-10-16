/* ============================================================
   app.js — application bootstrap for API Engineering Lab
   Owns: route registry, hash router, theme toggle, keyboard-help
   modal, sidebar/topbar active-state, breadcrumb, prev/next
   lesson nav, lesson-progress meter, search button.
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
    home: { title: "Overview Dashboard", ready: true, group: "Start Here" },
    "business-scenario": { title: "ShopSphere Business Case", ready: false, group: "Start Here" },

    fundamentals: { title: "What is an API?", ready: true, group: "Fundamentals" },
    "http-lab": { title: "HTTP Request–Response Lab", ready: true, group: "Fundamentals" },
    "http-methods": { title: "HTTP Methods Lab", ready: true, group: "Fundamentals" },
    "status-codes": { title: "Status Code Explorer", ready: true, group: "Fundamentals" },
    "json-lab": { title: "JSON Laboratory", ready: true, group: "Fundamentals" },

    "rest-resources": { title: "Resources & CRUD", ready: true, group: "REST Design" },
    "endpoint-designer": { title: "Endpoint Designer", ready: true, group: "REST Design" },
    pagination: { title: "Pagination Simulator", ready: true, group: "REST Design" },
    idempotency: { title: "Idempotency & Retries", ready: true, group: "REST Design" },
    versioning: { title: "API Versioning", ready: true, group: "REST Design" },
    "error-design": { title: "Error Response Design", ready: true, group: "REST Design" },

    architecture: { title: "Architecture Explorer", ready: true, group: "Architecture" },
    resilience: { title: "Failure Injection & Resilience", ready: true, group: "Architecture" },
    protocols: { title: "REST · GraphQL · gRPC", ready: true, group: "Architecture" },
    "realtime-protocols": { title: "WebSockets · Webhooks · Queues", ready: true, group: "Architecture" },
    "protocol-matrix": { title: "Protocol Decision Matrix", ready: true, group: "Architecture" },

    "express-workshop": { title: "Express.js Workshop", ready: true, group: "Implementation" },
    "testing-workbench": { title: "API Testing Workbench", ready: true, group: "Implementation" },
    "testing-challenges": { title: "Testing Challenges", ready: true, group: "Implementation" },
    "openapi-studio": { title: "OpenAPI & Docs Studio", ready: true, group: "Implementation" },

    security: { title: "Security Lab", ready: false, group: "Security" },
    oauth: { title: "OAuth 2.0 & JWT", ready: false, group: "Security" },
    "rate-limiting": { title: "Rate Limiting", ready: false, group: "Security" },
    performance: { title: "Performance Lab", ready: false, group: "Performance" },
    caching: { title: "Caching", ready: false, group: "Performance" },
    observability: { title: "Observability", ready: false, group: "Performance" },

    "production-ops": { title: "Production Operations Lab", ready: false, group: "Practice" },
    incidents: { title: "Incident Simulator", ready: false, group: "Practice" },
    "senior-decisions": { title: "Senior Design Decisions", ready: false, group: "Practice" },
    challenges: { title: "Scenario Challenges", ready: false, group: "Practice" },
    "interview-prep": { title: "Knowledge & Interview Prep", ready: false, group: "Practice" },
    progress: { title: "Learning Progress", ready: false, group: "Practice" }
  };
  AV.routes = ROUTES;

  // Ordered list (sidebar order) drives prev/next lesson navigation.
  var NAV_ORDER = Object.keys(ROUTES);
  AV.navOrder = NAV_ORDER;

  var App = {
    initTheme: function () {
      var root = document.documentElement;
      var stored = null;
      try { stored = localStorage.getItem("apilab-theme"); } catch (e) {}
      if (stored === "light" || stored === "dark") root.setAttribute("data-theme", stored);

      var toggle = document.getElementById("theme-toggle");
      if (toggle) {
        toggle.addEventListener("click", function () {
          var current = root.getAttribute("data-theme");
          if (!current) current = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
          var next = current === "dark" ? "light" : "dark";
          root.setAttribute("data-theme", next);
          try { localStorage.setItem("apilab-theme", next); } catch (e) {}
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
        if (tag === "INPUT" || tag === "TEXTAREA" || (e.target && e.target.isContentEditable)) return;
        if (e.key === "?") open();
        else if (e.key === "Escape") close();
        else if (e.key === "t" || e.key === "T") { var tg = document.getElementById("theme-toggle"); if (tg) tg.click(); }
        else if (e.key === ".") App.gotoRel(1);
        else if (e.key === ",") App.gotoRel(-1);
        else if (e.key === "/") { e.preventDefault(); App.openSearch(); }
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
        { keys: [".",], desc: "Next lesson" },
        { keys: [","], desc: "Previous lesson" },
        { keys: ["/"], desc: "Search lessons" },
        { keys: ["T"], desc: "Toggle theme" },
        { keys: ["?"], desc: "Show this help" },
        { keys: ["Esc"], desc: "Close dialog" }
      ];
      list.innerHTML = shortcuts.map(function (s) {
        var keys = s.keys.map(function (k) { return "<kbd>" + k + "</kbd>"; }).join("");
        return '<div class="kbd-row"><span>' + s.desc + '</span><span class="kbd-keys">' + keys + "</span></div>";
      }).join("");
    },

    initSidebar: function () {
      var sidebar = document.getElementById("sidebar");
      var toggle = document.getElementById("sidebar-toggle");
      if (toggle && sidebar) {
        toggle.addEventListener("click", function () { sidebar.classList.toggle("open"); });
      }
      if (sidebar) {
        sidebar.addEventListener("click", function (e) {
          if (e.target.closest("a") && window.innerWidth <= 900) sidebar.classList.remove("open");
        });
      }
    },

    openSearch: function () {
      // Delegates to the command palette feature (Cmd/Ctrl-K bus).
      try { window.dispatchEvent(new CustomEvent("apilab:search")); } catch (e) {}
    },

    initToolbar: function () {
      var self = this;
      var prev = document.getElementById("prev-lesson");
      var next = document.getElementById("next-lesson");
      var search = document.getElementById("search-btn");
      if (prev) prev.addEventListener("click", function () { self.gotoRel(-1); });
      if (next) next.addEventListener("click", function () { self.gotoRel(1); });
      if (search) search.addEventListener("click", function () { self.openSearch(); });
    },

    gotoRel: function (delta) {
      var cur = this.router ? this.router.currentId : "home";
      var i = NAV_ORDER.indexOf(cur);
      if (i < 0) i = 0;
      var j = Math.min(NAV_ORDER.length - 1, Math.max(0, i + delta));
      if (j !== i) location.hash = "#" + NAV_ORDER[j];
    },

    // ── Active-nav + breadcrumb + progress (called on every route) ─
    syncNav: function (id) {
      var links = document.querySelectorAll("[data-route]");
      links.forEach(function (el) {
        var match = el.getAttribute("data-route") === id;
        el.classList.toggle("active", match);
        if (match) el.setAttribute("aria-current", "page");
        else el.removeAttribute("aria-current");
      });
      var route = ROUTES[id] || {};
      document.title = (route.title ? route.title + " · " : "") + "API Engineering Lab";

      // Breadcrumb
      var crumb = document.getElementById("crumb");
      if (crumb) {
        var grp = route.group ? '<span class="crumb-sep">/</span><span class="crumb-grp">' + route.group + "</span>" : "";
        var leaf = id === "home" ? "" : '<span class="crumb-sep">/</span><span class="crumb-leaf">' + (route.title || id) + "</span>";
        crumb.innerHTML = '<a href="#home">API Lab</a>' + grp + leaf;
      }

      // Prev/next enabled state
      var i = NAV_ORDER.indexOf(id);
      var prev = document.getElementById("prev-lesson");
      var next = document.getElementById("next-lesson");
      if (prev) prev.disabled = i <= 0;
      if (next) next.disabled = i >= NAV_ORDER.length - 1;

      this.markVisited(id);
      this.renderProgress();
    },

    markVisited: function (id) {
      try {
        var v = JSON.parse(localStorage.getItem("apilab-visited") || "[]");
        if (v.indexOf(id) === -1) { v.push(id); localStorage.setItem("apilab-visited", JSON.stringify(v)); }
      } catch (e) {}
    },

    renderProgress: function () {
      var fill = document.getElementById("lesson-progress-fill");
      var label = document.getElementById("lesson-progress-label");
      if (!fill || !label) return;
      var ready = NAV_ORDER.filter(function (k) { return ROUTES[k].ready; });
      var visited = [];
      try { visited = JSON.parse(localStorage.getItem("apilab-visited") || "[]"); } catch (e) {}
      var done = ready.filter(function (k) { return visited.indexOf(k) !== -1; }).length;
      var pct = ready.length ? Math.round(done / ready.length * 100) : 0;
      fill.style.width = pct + "%";
      label.textContent = pct + "%";
      label.title = done + " of " + ready.length + " live modules explored";
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
      AV.router = this.router;
      this.router.start();
    },

    start: function () {
      this.initTheme();
      this.initKeyboard();
      this.initSidebar();
      this.initToolbar();
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
