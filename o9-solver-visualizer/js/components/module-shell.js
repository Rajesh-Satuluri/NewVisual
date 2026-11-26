/* ============================================================
   components/module-shell.js — standard module chrome
   Kafka convention: createModuleShell({tag,title,subtitle,tabs})
   + initTabs(container) + createIQSection() (interview-question box).
   New modules build their header/tabs through this for consistency.

   Contract:
     AV.ModuleShell.create({ eyebrow, title, subtitle, tabs:[{id,label}] }) -> HTML string
     AV.ModuleShell.initTabs(container)        // wires .shell-tab switching
     AV.ModuleShell.createIQSection({q, points:[…]}) -> HTML string

   STATUS: SCAFFOLD (no-op create returns a minimal valid header). Filled
   when new modules adopt it; not yet wired into index.html.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.SolverViz = window.SolverViz || {});

  AV.ModuleShell = {
    create: function (opts) {
      opts = opts || {};
      var eyebrow = opts.eyebrow ? '<div class="module-eyebrow">' + opts.eyebrow + "</div>" : "";
      var sub = opts.subtitle ? '<p class="module-subtitle">' + opts.subtitle + "</p>" : "";
      return (
        '<div class="module-header animate-fade-in-up">' + eyebrow +
        '<h1 class="module-title gradient-text">' + (opts.title || "") + "</h1>" + sub +
        "</div>"
      );
    },
    initTabs: function (/* container */) { /* TODO: wire tab switching */ },
    createIQSection: function (/* opts */) { return ""; /* TODO */ }
  };
})();
