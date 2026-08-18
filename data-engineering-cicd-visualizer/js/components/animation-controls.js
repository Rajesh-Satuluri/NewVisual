/* ============================================================
   animation-controls.js — transport bar bound to an AnimationEngine
   DECICDViz.AnimationControls.create(engine, opts) → { el, destroy() }
   Registers DECICDViz.activeControls so keyboard.js can drive it.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.DECICDViz = window.DECICDViz || {});

  var ICON_PLAY = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
  var ICON_PAUSE = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>';

  function btn(cls, title, html) {
    var b = document.createElement("button");
    b.className = cls;
    b.type = "button";
    b.title = title;
    b.setAttribute("aria-label", title);
    b.innerHTML = html;
    return b;
  }

  function create(engine, opts) {
    opts = opts || {};
    var total = engine.totalSteps;

    var bar = document.createElement("div");
    bar.className = "anim-controls";

    var playBtn = btn("anim-play", "Play / pause (Space)", ICON_PLAY);
    var prevBtn = btn("icon-btn", "Previous step (←)", "&#9664;");
    var nextBtn = btn("icon-btn", "Next step (→)", "&#9654;");
    var resetBtn = btn("icon-btn", "Reset (R)", "&#8635;");

    var btns = document.createElement("div");
    btns.className = "anim-btns";
    btns.appendChild(playBtn);
    btns.appendChild(prevBtn);
    btns.appendChild(nextBtn);
    btns.appendChild(resetBtn);

    var label = document.createElement("div");
    label.className = "anim-step-label";
    label.textContent = opts.title || "Ready";

    var counter = document.createElement("span");
    counter.className = "anim-counter";
    counter.textContent = "0 / " + total;

    var scrub = document.createElement("input");
    scrub.type = "range";
    scrub.className = "anim-scrub";
    scrub.min = "0";
    scrub.max = String(Math.max(0, total - 1));
    scrub.value = "0";
    scrub.setAttribute("aria-label", "Step scrubber");

    var speedWrap = document.createElement("label");
    speedWrap.className = "anim-speed";
    speedWrap.innerHTML = "<span>speed</span>";
    var speed = document.createElement("select");
    [0.5, 1, 1.5, 2, 3].forEach(function (s) {
      var o = document.createElement("option");
      o.value = String(s);
      o.textContent = s + "×";
      if (s === (engine.speed || 1)) o.selected = true;
      speed.appendChild(o);
    });
    speedWrap.appendChild(speed);

    var labelWrap = document.createElement("div");
    labelWrap.className = "anim-label-wrap";
    labelWrap.appendChild(label);
    labelWrap.appendChild(counter);

    bar.appendChild(btns);
    bar.appendChild(labelWrap);
    bar.appendChild(scrub);
    bar.appendChild(speedWrap);

    // ── Wiring ────────────────────────────────────────────
    playBtn.addEventListener("click", function () { engine.toggle(); });
    prevBtn.addEventListener("click", function () { engine.prev(); });
    nextBtn.addEventListener("click", function () { engine.next(); });
    resetBtn.addEventListener("click", function () { engine.reset(); });
    scrub.addEventListener("input", function () { engine.goto(parseInt(scrub.value, 10)); });
    speed.addEventListener("change", function () { engine.setSpeed(parseFloat(speed.value)); });

    function renderStep(idx) {
      var shown = idx < 0 ? 0 : idx + 1;
      counter.textContent = shown + " / " + total;
      scrub.value = String(idx < 0 ? 0 : idx);
      var step = engine.currentStepObj;
      label.textContent = step && step.label ? step.label : (opts.title || "Ready");
    }
    function renderState(state) {
      playBtn.innerHTML = state === "playing" ? ICON_PAUSE : ICON_PLAY;
      playBtn.classList.toggle("is-playing", state === "playing");
    }

    var offStep = engine.on("stepchange", renderStep);
    var offState = engine.on("statechange", renderState);
    renderStep(engine.currentStep);
    renderState(engine.state);

    // Expose a small surface for the global keyboard handler.
    AV.activeControls = {
      toggle: function () { engine.toggle(); },
      next: function () { engine.next(); },
      prev: function () { engine.prev(); },
      reset: function () { engine.reset(); }
    };

    return {
      el: bar,
      destroy: function () {
        offStep();
        offState();
        if (AV.activeControls) AV.activeControls = null;
      }
    };
  }

  AV.AnimationControls = { create: create };
})();
