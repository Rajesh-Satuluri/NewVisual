/* ============================================================
   components/cloudsync-ui.js — sync settings panel
   Kafka convention: the small UI that shows sync status, the sync code,
   and push/pull buttons. Hidden entirely when AV.CloudSync.isConfigured()
   is false, so a local-only build shows nothing.

   Contract:
     AV.CloudSyncUI.create() -> HTML string   // "" when sync is inert
     AV.CloudSyncUI.init(container)

   STATUS: SCAFFOLD (returns empty while inert).
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.SolverViz = window.SolverViz || {});

  AV.CloudSyncUI = {
    create: function () {
      if (!(AV.CloudSync && AV.CloudSync.isConfigured && AV.CloudSync.isConfigured())) return "";
      return ""; /* TODO: status + sync code + push/pull */
    },
    init: function (/* container */) { /* TODO */ }
  };
})();
