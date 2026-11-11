/* ============================================================
   components/cloudsync.js — optional Supabase progress sync
   Kafka convention: INERT until configured. If supabase-config.js is
   blank, the whole tool is local-only and this is a no-op. When filled,
   it performs a per-key, type-aware MERGE (never a blind overwrite) of
   the o9scs_* keys, keyed by a hashed sync code (o9scs:synccode — this
   key is deliberately NOT itself synced).

   Merge rules (mirror Kafka):
     • mastery/visited sets → union
     • quiz best scores     → max
     • review cards         → most-recent by ts
     • scalars              → most-recent by ts

   Contract:
     AV.CloudSync.isConfigured() -> bool
     AV.CloudSync.push() / pull() / sync()   // async; resolve no-op when inert
     AV.CloudSync.merge(local, remote) -> merged

   STATUS: SCAFFOLD (inert; isConfigured() === false until wired). Ships a
   co-located cloudsync.test.mjs for the merge rules when implemented.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.SolverViz = window.SolverViz || {});

  AV.CloudSync = {
    isConfigured: function () {
      var cfg = window.O9SCS_SUPABASE || null;
      return !!(cfg && cfg.url && cfg.anonKey);
    },
    merge: function (local /*, remote */) { return local; /* TODO: per-key type-aware merge */ },
    push: function () { return Promise.resolve(false); /* inert until configured */ },
    pull: function () { return Promise.resolve(false); },
    sync: function () { return Promise.resolve(false); }
  };
})();
