/* ============================================================
   app.js — Database Engineering & Internals Lab bootstrap.
   Route registry, hash router, theme toggle, sidebar active state,
   mobile sidebar toggle. Concept workspaces + most sections are
   lazy-loaded by the router.
   ============================================================ */
(function () {
  "use strict";
  var DL = (window.DBLab = window.DBLab || {});

  // ready:true → js/modules/<id>.js exists and is lazy-loaded.
  var ROUTES = {
    home:            { title: "Dashboard", ready: true },
    "master-map":    { title: "Master Map", ready: true },
    learn:           { title: "Learn", ready: true },
    concept:         { title: "Concept", ready: true },
    simulators:      { title: "Simulators", ready: true },
    progress:        { title: "Progress", ready: true },
    // Roadmap sections (render a branded "coming soon" until built):
    "engineering-lab": { title: "Engineering Lab", ready: false },
    "failure-lab":     { title: "Failure Lab", ready: false },
    "real-world":      { title: "Real-World Systems (ShopKart)", ready: false },
    interview:         { title: "Interview Center", ready: false },
    revision:          { title: "Revision", ready: false },
  };
  DL.routes = ROUTES;

  var App = {
    initTheme: function () {
      var root = document.documentElement;
      try { var s = localStorage.getItem("dblab-theme"); if (s === "light" || s === "dark") root.setAttribute("data-theme", s); } catch (e) {}
      var toggle = document.getElementById("theme-toggle");
      if (toggle) toggle.addEventListener("click", function () {
        var cur = root.getAttribute("data-theme") || (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
        var next = cur === "dark" ? "light" : "dark";
        root.setAttribute("data-theme", next);
        try { localStorage.setItem("dblab-theme", next); } catch (e) {}
      });
    },

    initSidebarToggle: function () {
      var btn = document.getElementById("sidebar-toggle");
      var sb = document.getElementById("sidebar");
      if (btn && sb) btn.addEventListener("click", function () { sb.classList.toggle("open"); });
      // Close sidebar on mobile after navigating.
      window.addEventListener("dblab:navigate", function () {
        if (window.innerWidth <= 900 && sb) sb.classList.remove("open");
      });
    },

    setActive: function (id) {
      // Concept workspaces highlight the Learn section.
      var navId = id === "concept" ? "learn" : id;
      document.querySelectorAll(".sidebar-link, .nav-pill").forEach(function (a) {
        a.classList.toggle("active", a.getAttribute("data-route") === navId);
      });
      var route = DL.routes[id];
      document.title = (route && route.title ? route.title : "Concept") + " · DB Engineering & Internals Lab";
    },

    start: function () {
      this.initTheme();
      this.initSidebarToggle();
      var container = document.getElementById("module-container");
      var self = this;
      var router = new DL.Router({
        routes: ROUTES,
        container: container,
        defaultRoute: "home",
        onRoute: function (id) { self.setActive(id); },
      });
      DL.router = router;
      router.start();
    },
  };

  DL.App = App;
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { App.start(); });
  } else {
    App.start();
  }
})();
