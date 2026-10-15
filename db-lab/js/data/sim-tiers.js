/* ============================================================
   sim-tiers.js — honest two-tier labelling for simulators.

   Every concept has a sim. There are two kinds, and the UI must say
   which is which rather than implying all 133 are interactive:

     "interactive" (⚡ Interactive Lab) — backed by a pure kernel
        (sims/kernels/*.mjs): the learner configures inputs and drives
        state; the picture renders the kernel's real state; tested.

     "walkthrough" (🎬 Guided Walkthrough) — the scripted-frame canvas
        animations: play / pause / scrub through authored steps.

   Flagship phases flip a concept id into INTERACTIVE as its kernel +
   tests + wiring land. Until then it is honestly a walkthrough.
   ============================================================ */
(function () {
  "use strict";
  var DL = (window.DBLab = window.DBLab || {});

  // Concepts whose sim is a real, tested interactive kernel.
  // (Empty today — the foundation phase ships the contract + harness;
  //  the flagship kernels below are built and flipped on in later phases.)
  var INTERACTIVE = {
    // m47: WAL + crash recovery        (Phase 2)
    // m36: B+Tree                      (Phase 3)
    // m30: buffer pool                 (Phase 3)
    // m48: MVCC                        (Phase 4)
    // m16/m17: query optimizer         (Phase 4)
    // m41: LSM tree                    (Phase 5)
    // m55/m63/m79: replication/consensus (Phase 5)
  };

  var META = {
    interactive: { label: "Interactive lab", icon: "⚡", badge: "⚡ interactive", cls: "tier-interactive" },
    walkthrough: { label: "Guided walkthrough", icon: "🎬", badge: "🎬 walkthrough", cls: "tier-walkthrough" },
  };

  /** Tier for a concept id: "interactive" | "walkthrough". */
  DL.simTier = function (conceptId) {
    return INTERACTIVE[conceptId] ? "interactive" : "walkthrough";
  };

  /** Display metadata for a tier string. */
  DL.simTierMeta = function (tier) {
    return META[tier] || META.walkthrough;
  };

  /** Count of interactive labs (for honest dashboard/subtitle copy). */
  DL.interactiveCount = function () {
    return Object.keys(INTERACTIVE).length;
  };
})();
