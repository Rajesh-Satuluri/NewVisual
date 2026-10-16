/* ============================================================
   mode-lens.js — makes the learning-mode selector do something
   on every module.

   The top-bar modes (learn · explore · build · debug · interview)
   set <body data-mode="…"> (see features/modes.js). This feature
   turns that signal into a visible, lab-wide effect: it reads what
   the mounted module actually offers (interactive controls, code,
   a quiz, failure tooling) and, for the chosen mode, drops a short
   context hint at the top of the module and spotlights the relevant
   surface — scrolling to it when the user actively picks a mode.

   Deliberately additive: it never hides a module's core content, so
   a module that doesn't fit a mode still renders fully and instead
   points the learner to the module that does.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  function mode() {
    return (AV.ui && AV.ui.getMode && AV.ui.getMode()) || "learn";
  }
  function container() { return document.getElementById("module-container"); }

  // What does the mounted module give us to work with?
  function scan(c) {
    function q(sel) { return c.querySelector(sel); }
    return {
      interactive: q('input[type="range"], select, textarea, .tabstrip .tab, canvas, .arch-canvas, .state-machine') ||
                   c.querySelector('button.btn-primary'),
      code: q(".code-block, pre, textarea"),
      quiz: q(".ty-section"),
      failure: q('[data-debug], select#hl-scenario, [id$="-reset"], [id*="fail"], [id*="reset"], .status-pill.st-5xx')
    };
  }

  // Per-mode copy. `has` = capability present in THIS module → phrasing
  // changes between "do it here" and "the module that does this is …".
  var COPY = {
    learn: {
      icon: "📘",
      line: function () { return "<b>Learn mode.</b> Read the explanations top to bottom — concepts first, then the interactive parts below."; }
    },
    explore: {
      icon: "🧪",
      line: function (has) {
        return has.interactive
          ? "<b>Explore mode.</b> Jump straight in — the interactive controls are highlighted. Change inputs and watch the results update."
          : "<b>Explore mode.</b> This page is mostly reading. For hands-on controls try the <a href=\"#http-lab\">HTTP Lab</a>, <a href=\"#pagination\">Pagination</a> or <a href=\"#architecture\">Architecture Explorer</a>.";
      }
    },
    build: {
      icon: "🛠️",
      line: function (has) {
        return has.code
          ? "<b>Build mode.</b> The code/spec is highlighted below — read it as the real implementation, or edit it directly."
          : "<b>Build mode.</b> No code on this page. Head to the <a href=\"#express-workshop\">Express.js Workshop</a> or <a href=\"#openapi-studio\">OpenAPI Studio</a> to build.";
      }
    },
    debug: {
      icon: "🐞",
      line: function (has) {
        return has.failure
          ? "<b>Debug mode.</b> Failure paths are unlocked and highlighted — break the request and read how the system responds."
          : "<b>Debug mode.</b> No failures to inject here. The <a href=\"#resilience\">Failure Injection</a> and <a href=\"#incidents\">Incident Simulator</a> labs are built for this.";
      }
    },
    interview: {
      icon: "🎤",
      line: function (has) {
        return has.quiz
          ? "<b>Interview mode.</b> Scroll to <b>Test Yourself</b> below and answer before revealing — that's the recall that sticks."
          : "<b>Interview mode.</b> No quiz on this page. Drill answers in <a href=\"#interview-prep\">Interview Prep</a> and <a href=\"#challenges\">Scenario Challenges</a>.";
      }
    }
  };

  function clearRings(c) {
    c.querySelectorAll(".mode-spot").forEach(function (el) { el.classList.remove("mode-spot", "mode-pulse"); });
  }

  // Highlight the surface a mode cares about and optionally scroll to it.
  function spotlight(c, target, scrollTo) {
    if (!target) return;
    // Climb to a sensible container to outline (a panel/section), not a bare input.
    var host = target.closest(".panel, .lab-2col, .code-viewer, .ty-section, .tabstrip, .arch-canvas, section") || target;
    host.classList.add("mode-spot");
    if (scrollTo) {
      try { host.scrollIntoView({ behavior: "smooth", block: "center" }); } catch (e) { host.scrollIntoView(); }
      host.classList.add("mode-pulse");
      setTimeout(function () { host.classList.remove("mode-pulse"); }, 1400);
    }
  }

  function apply(trigger) {
    var c = container();
    if (!c) return;
    var m = mode();
    var has = scan(c);
    clearRings(c);

    // ── Hint bar (replace any previous one) ──
    var prev = c.querySelector(".mode-hint");
    if (prev) prev.parentNode.removeChild(prev);
    var copy = COPY[m] || COPY.learn;
    var bar = document.createElement("div");
    bar.className = "mode-hint mode-hint-" + m;
    bar.innerHTML = '<span class="mode-hint-icon">' + copy.icon + "</span>" +
      '<span class="mode-hint-text">' + copy.line(has) + "</span>";
    var header = c.querySelector(".module-header");
    if (header && header.nextSibling) c.insertBefore(bar, header.nextSibling);
    else if (header) c.appendChild(bar);
    else c.insertBefore(bar, c.firstChild);

    // Only scroll/pulse when the user actively flipped the mode, not on
    // every navigation — otherwise moving between pages yanks the viewport.
    var active = trigger === "mode";

    if (m === "explore") spotlight(c, has.interactive, active);
    else if (m === "build") spotlight(c, has.code, active);
    else if (m === "interview") spotlight(c, has.quiz, active);
    else if (m === "debug") spotlight(c, has.failure, active);
    // learn: no spotlight, reading-first.
  }

  // Re-apply whenever the mode changes or a new module mounts.
  window.addEventListener("apilab:mode", function () { apply("mode"); });
  window.addEventListener("afviz:mounted", function () { apply("mount"); });

  function boot() { if (container() && container().children.length) apply("mount"); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
