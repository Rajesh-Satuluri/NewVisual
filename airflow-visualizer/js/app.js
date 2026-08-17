/* ============================================================
   app.js — bootstrap (Phase 0 shell)
   Wires theme toggle, sidebar active-state, keyboard-help modal,
   and renders a placeholder in the canvas. The hash router and
   module registry land in Phase 1.
   ============================================================ */
(function () {
  "use strict";

  window.AirflowViz = window.AirflowViz || {};

  var App = {
    // ── Theme ──────────────────────────────────────────────
    initTheme: function () {
      var root = document.documentElement;
      var stored = null;
      try { stored = localStorage.getItem("afviz-theme"); } catch (e) {}
      if (stored === "light" || stored === "dark") {
        root.setAttribute("data-theme", stored);
      }
      var toggle = document.getElementById("theme-toggle");
      if (toggle) {
        toggle.addEventListener("click", function () {
          var current = root.getAttribute("data-theme");
          // If unset, infer from OS to decide the flip target.
          if (!current) {
            current = window.matchMedia("(prefers-color-scheme: light)").matches
              ? "light" : "dark";
          }
          var next = current === "dark" ? "light" : "dark";
          root.setAttribute("data-theme", next);
          try { localStorage.setItem("afviz-theme", next); } catch (e) {}
        });
      }
    },

    // ── Sidebar / nav active state (hash-driven) ───────────
    initNav: function () {
      var self = this;
      function sync() {
        var route = (location.hash || "#home").slice(1);
        var links = document.querySelectorAll("[data-route]");
        links.forEach(function (el) {
          el.classList.toggle("active", el.getAttribute("data-route") === route);
        });
        self.renderPlaceholder(route);
      }
      window.addEventListener("hashchange", sync);
      sync();
    },

    // ── Keyboard-help modal + basic shortcuts ──────────────
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
        if (e.key === "?") { open(); }
        else if (e.key === "Escape") { close(); }
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
      list.innerHTML = shortcuts.map(function (s) {
        var keys = s.keys.map(function (k) { return "<kbd>" + k + "</kbd>"; }).join("");
        return '<div class="kbd-row"><span>' + s.desc +
               '</span><span class="kbd-keys">' + keys + "</span></div>";
      }).join("");
    },

    // ── Placeholder canvas (until Phase 1 modules land) ────
    renderPlaceholder: function (route) {
      var container = document.getElementById("module-container");
      if (!container) return;
      var label = route.replace(/-/g, " ").replace(/\b\w/g, function (c) {
        return c.toUpperCase();
      });
      container.innerHTML =
        '<div class="module-header animate-fade-in-up">' +
          '<div class="module-eyebrow">Apache Airflow Visualizer</div>' +
          '<h1 class="module-title gradient-text">' + label + '</h1>' +
          '<p class="module-subtitle">The application shell is live. Interactive ' +
          'modules, animations, and diagrams arrive in the next build phases.</p>' +
        '</div>' +
        '<div class="card animate-fade-in" style="margin-top:var(--space-6)">' +
          '<div class="card-title">Phase 0 — Foundation shipped</div>' +
          '<p>Design tokens, layout shell, component styles, and animation ' +
          'primitives are in place. Navigate the sidebar to preview routing; ' +
          'each link will resolve to a full interactive module as phases land.</p>' +
          '<div class="flex gap-2" style="margin-top:var(--space-4);flex-wrap:wrap">' +
            '<span class="badge badge-airflow">Tokens</span>' +
            '<span class="badge badge-cyan">Layout</span>' +
            '<span class="badge badge-green">Components</span>' +
            '<span class="badge badge-purple">Animations</span>' +
          '</div>' +
        '</div>' +
        '<div class="callout info" style="margin-top:var(--space-6)">' +
          '<span class="callout-icon">🌬️</span>' +
          '<div class="callout-body">Built as a static site — pure HTML, CSS, ' +
          'and vanilla JS. Deployed to GitHub Pages, no framework, no bundler.</div>' +
        '</div>';
    },

    start: function () {
      this.initTheme();
      this.initKeyboard();
      this.initNav();
    }
  };

  window.AirflowViz.App = App;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { App.start(); });
  } else {
    App.start();
  }
})();
