/* ============================================================
   navigation-sync.js — deep links, resume, and speed persistence
   - Restores the last-visited route on a bare load.
   - Deep-links the animation step via "#route/step" (shareable).
   - Remembers playback speed across modules.
   All storage access is guarded; every hook no-ops if data is absent.
   ============================================================ */
(function () {
  "use strict";
  var LAST = "afviz-last-route", SPEED = "afviz-speed";

  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  // ── Resume last route on a bare entry (no hash) ────────────
  (function resume() {
    var hash = (location.hash || "").replace(/^#/, "").trim();
    if (hash) return;
    var last = get(LAST);
    if (last && last !== "home") location.replace("#" + last);
  })();

  // Persist the route each time it changes.
  window.addEventListener("afviz:navigate", function (e) {
    var id = e.detail && e.detail.id;
    if (id) set(LAST, id);
  });

  // ── Per-module engine wiring on mount ──────────────────────
  var writing = false;
  window.addEventListener("afviz:mounted", function () {
    var mod = window.AirflowViz && window.AirflowViz.router && window.AirflowViz.router.current;
    var engine = mod && mod._engine;
    if (!engine || typeof engine.goto !== "function") return;

    // Apply saved playback speed (and sync the control's <select>).
    var savedSpeed = parseFloat(get(SPEED));
    if (savedSpeed && typeof engine.setSpeed === "function") {
      engine.setSpeed(savedSpeed);
      var sel = document.querySelector(".anim-speed select");
      if (sel) sel.value = String(savedSpeed);
    }

    // Restore a deep-linked step (defer so the module's own reset settles first).
    var step = window.AirflowViz.router._step();
    if (step !== null && step >= 0 && step < engine.totalSteps) {
      setTimeout(function () { try { engine.goto(step); } catch (e) {} }, 40);
    }

    // Reflect step changes back into the URL (without remounting).
    engine.on("stepchange", function (idx) {
      if (idx < 0) return;
      writing = true;
      var base = window.AirflowViz.router.currentId || (location.hash || "").replace(/^#/, "").split("/")[0];
      try { history.replaceState(null, "", "#" + base + "/" + idx); } catch (e) {}
      writing = false;
    });
  });

  // Same-route step link (e.g. pasting "#architecture/7" while already on that
  // module): drive the engine to that step without a remount. replaceState from
  // our own writer does not fire hashchange, so there is no feedback loop.
  window.addEventListener("hashchange", function () {
    if (writing) return;
    var r = window.AirflowViz && window.AirflowViz.router;
    var mod = r && r.current;
    var engine = mod && mod._engine;
    if (!engine || typeof engine.goto !== "function" || !r._id) return;
    if (r._id() !== r.currentId) return; // different route → router remounts it
    var step = r._step();
    if (step !== null && step >= 0 && step < engine.totalSteps && step !== engine.currentStep) {
      try { engine.goto(step); } catch (e) {}
    }
  });

  // Persist speed whenever the user changes it (delegated on the control select).
  document.addEventListener("change", function (e) {
    var t = e.target;
    if (t && t.tagName === "SELECT" && t.closest && t.closest(".anim-speed")) {
      set(SPEED, t.value);
    }
  });
})();
