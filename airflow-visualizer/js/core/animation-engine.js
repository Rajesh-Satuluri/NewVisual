/* ============================================================
   Animation Engine — reusable step-by-step player
   Decoupled from DOM; modules wire it to their SVG/HTML.
   State: 'idle' | 'playing' | 'paused' | 'complete'
   ============================================================ */
(function () {
  "use strict";

  class AnimationEngine {
    /**
     * @param {Object} opts
     * @param {Array}  opts.steps      - Array of Step objects { label, description, duration, enter(ctx), exit(ctx) }
     * @param {number} [opts.speed=1]  - Initial speed multiplier
     */
    constructor(opts = {}) {
      this.steps = opts.steps || [];
      this.speed = opts.speed || 1;
      this.currentStep = -1;
      this.state = "idle";
      this._timer = null;
      this._listeners = {};
      this._ctx = {};
    }

    /* ── Public API ──────────────────────────────────────── */

    setContext(ctx) { this._ctx = ctx || {}; }

    play() {
      if (this.steps.length === 0) return;
      if (this.state === "complete") this._resetState();
      this._setState("playing");
      // If nothing applied yet, apply the first step immediately.
      if (this.currentStep < 0) this._applyStep(0);
      this._scheduleNext();
    }

    pause() {
      if (this.state !== "playing") return;
      clearTimeout(this._timer);
      this._setState("paused");
    }

    toggle() {
      if (this.state === "playing") this.pause();
      else this.play();
    }

    reset() {
      clearTimeout(this._timer);
      for (let i = this.currentStep; i >= 0; i--) {
        const step = this.steps[i];
        if (step && typeof step.exit === "function") {
          try { step.exit(this._ctx); } catch (_) {}
        }
      }
      this._resetState();
    }

    next() {
      if (this.currentStep >= this.steps.length - 1) {
        if (this.state === "playing") this._setState("complete");
        return;
      }
      clearTimeout(this._timer);
      this._applyStep(this.currentStep + 1);
      if (this.state === "playing") this._scheduleNext();
    }

    prev() {
      if (this.currentStep <= 0) return;
      clearTimeout(this._timer);
      const cur = this.steps[this.currentStep];
      if (cur && typeof cur.exit === "function") {
        try { cur.exit(this._ctx); } catch (_) {}
      }
      this.currentStep--;
      this._emit("stepchange", this.currentStep);
      if (this.state === "playing") this._setState("paused");
    }

    goto(index) {
      if (index < 0 || index >= this.steps.length) return;
      clearTimeout(this._timer);
      if (index > this.currentStep) {
        for (let i = this.currentStep + 1; i <= index; i++) this._applyStep(i, true);
        this._emit("stepchange", this.currentStep);
      } else if (index < this.currentStep) {
        this.reset();
        for (let i = 0; i <= index; i++) this._applyStep(i, true);
        this._emit("stepchange", this.currentStep);
      }
      if (this.state === "playing") this._setState("paused");
    }

    setSpeed(s) { this.speed = Math.max(0.25, Math.min(8, s)); }

    destroy() {
      clearTimeout(this._timer);
      this._listeners = {};
      this._ctx = {};
    }

    on(event, handler) {
      (this._listeners[event] = this._listeners[event] || []).push(handler);
      return () => {
        this._listeners[event] = (this._listeners[event] || []).filter((h) => h !== handler);
      };
    }

    /* ── Computed ────────────────────────────────────────── */
    get totalSteps() { return this.steps.length; }
    get progress() {
      if (this.steps.length === 0) return 0;
      return (this.currentStep + 1) / this.steps.length;
    }
    get currentStepObj() { return this.steps[this.currentStep] || null; }
    get isPlaying() { return this.state === "playing"; }
    get isPaused() { return this.state === "paused"; }
    get isIdle() { return this.state === "idle"; }
    get isComplete() { return this.state === "complete"; }
    get canGoNext() { return this.currentStep < this.steps.length - 1; }
    get canGoPrev() { return this.currentStep > 0; }

    /* ── Private ─────────────────────────────────────────── */
    _scheduleNext() {
      clearTimeout(this._timer);
      if (this.state !== "playing") return;
      if (this.currentStep >= this.steps.length - 1) {
        this._setState("complete");
        return;
      }
      const step = this.steps[this.currentStep < 0 ? 0 : this.currentStep];
      const delay = ((step && step.duration) || 2200) / this.speed;
      this._timer = setTimeout(() => {
        this._applyStep(this.currentStep + 1);
        this._scheduleNext();
      }, delay);
    }

    _applyStep(index, silent = false) {
      if (index < 0 || index >= this.steps.length) return;
      this.currentStep = index;
      const step = this.steps[index];
      if (step && typeof step.enter === "function") {
        try { step.enter(this._ctx); } catch (e) { console.error("Step enter error:", e); }
      }
      if (!silent) this._emit("stepchange", index);
    }

    _resetState() {
      this.currentStep = -1;
      this._setState("idle");
      this._emit("stepchange", -1);
    }

    _setState(s) {
      this.state = s;
      this._emit("statechange", s);
    }

    _emit(event, data) {
      (this._listeners[event] || []).forEach((h) => {
        try { h(data); } catch (_) {}
      });
    }
  }

  /* ── Step factory helpers ───────────────────────────────── */
  AnimationEngine.fnStep = function (label, description, enter, exit, duration) {
    return { label: label, description: description, duration: duration || 2200, enter: enter, exit: exit };
  };

  window.AirflowViz = window.AirflowViz || {};
  window.AirflowViz.AnimationEngine = AnimationEngine;
})();
