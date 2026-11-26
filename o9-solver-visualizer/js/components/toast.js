/* ============================================================
   components/toast.js — transient notifications
   Kafka convention: lightweight, self-dismissing toasts (e.g. "Module
   mastered ✓", "Progress saved", "Synced"). One live region, queued.

   Contract:
     AV.Toast.show(message, { kind:'info'|'success'|'warn', ms })
     AV.Toast.init()   // creates the live-region host once

   STATUS: SCAFFOLD (no-op show; console.debug fallback). Adds its host
   and styling (platform.css) when wired.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.SolverViz = window.SolverViz || {});

  AV.Toast = {
    init: function () { /* TODO: mount aria-live host */ },
    show: function (message /*, opts */) {
      try { if (window && window.console) console.debug("[toast]", message); } catch (e) {}
      /* TODO: render + auto-dismiss */
    }
  };
})();
