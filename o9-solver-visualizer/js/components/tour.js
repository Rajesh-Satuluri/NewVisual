/* ============================================================
   components/tour.js — first-run guided tour
   Kafka convention: a short, dismissible walkthrough of the shell
   (sidebar, progress, command palette, playground). Runs once; the
   completion flag is o9scs_tour_done.

   Contract:
     AV.Tour.start(steps)   // steps: [{ selector, title, body }]
     AV.Tour.init()         // auto-start on first run unless done

   STATUS: SCAFFOLD (no-op). Implemented in the mastery iteration.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.SolverViz = window.SolverViz || {});

  var DONE_KEY = "o9scs_tour_done";

  AV.Tour = {
    doneKey: DONE_KEY,
    isDone: function () { try { return localStorage.getItem(DONE_KEY) === "1"; } catch (e) { return false; } },
    markDone: function () { try { localStorage.setItem(DONE_KEY, "1"); } catch (e) {} },
    start: function (/* steps */) { /* TODO: spotlight each step */ },
    init: function () { /* TODO: auto-start on first run */ }
  };
})();
