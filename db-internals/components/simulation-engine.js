/**
 * SimulationEngine — stepped animation controller for DB Internals modules.
 *
 * Usage:
 *   const engine = new SimulationEngine({
 *     initialState: { ... },
 *     steps: [
 *       { label: 'Step 1', duration: 1200, mutate: state => { state.x = 1; } },
 *     ],
 *     onRender:  (state, stepIdx, steps) => { /* draw canvas *\/ },
 *     onMetrics: (state, stepIdx)        => { /* update counters *\/ },
 *   });
 *   engine.reset();
 *   SimulationEngine.renderControls(container, engine);
 *   SimulationEngine.renderTimeline(container, engine);
 */
export class SimulationEngine {
  constructor({ initialState, steps, onRender, onMetrics }) {
    this.initialState = initialState;
    this.steps        = steps;
    this.onRender     = onRender;
    this.onMetrics    = onMetrics;

    this._state   = null;
    this._step    = -1;
    this._playing = false;
    this._timer   = null;
    this._listeners = {};
    this._canvas  = null;   // set via attach() for the (state, canvas) render API
  }

  /**
   * New-API binding: attach a canvas so onRender is called as (state, canvas).
   * Triggers an initial render at the reset state. Returns the engine.
   */
  attach(canvas) {
    this._canvas = canvas;
    this.reset();
    return this;
  }

  // ── Public API ────────────────────────────────────────────────────────────

  reset() {
    this._stop();
    this._step  = -1;
    this._state = this._cloneInitial();
    this._render();
    this._emit('change');
  }

  play() {
    if (this._playing) return;
    if (this._step >= this.steps.length - 1) this.reset();
    this._playing = true;
    this._emit('change');
    this._tick();
  }

  pause() {
    this._stop();
    this._emit('change');
  }

  next() {
    if (this._step >= this.steps.length - 1) return;
    this._step++;
    if (this.steps[this._step]?.mutate) this.steps[this._step].mutate(this._state);
    this._render();
    this._emit('change');
    if (this._step >= 0) this._emit('step', this._step);
  }

  previous() {
    if (this._step <= 0) {
      this.reset();
      return;
    }
    this._step--;
    this._rebuildTo(this._step);
    this._render();
    this._emit('change');
    if (this._step >= 0) this._emit('step', this._step);
  }

  jumpTo(stepIdx) {
    if (stepIdx < 0 || stepIdx >= this.steps.length) return;
    this._stop();
    this._rebuildTo(stepIdx);
    this._step = stepIdx;
    this._render();
    this._emit('change');
    if (this._step >= 0) this._emit('step', this._step);
  }

  get isPlaying()   { return this._playing; }
  get currentStep() { return this._step; }
  get totalSteps()  { return this.steps.length; }
  get state()       { return this._state; }

  on(event, fn) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(fn);
    return () => this.off(event, fn);
  }

  off(event, fn) {
    if (!this._listeners[event]) return;
    this._listeners[event] = this._listeners[event].filter(f => f !== fn);
  }

  destroy() {
    this._stop();
    this._listeners = {};
  }

  // ── Private ───────────────────────────────────────────────────────────────

  _tick() {
    if (!this._playing) return;
    if (this._step >= this.steps.length - 1) {
      this._playing = false;
      this._emit('change');
      this._emit('complete');
      return;
    }
    this.next();
    const delay = this.steps[this._step]?.duration ?? 1200;
    this._timer = setTimeout(() => this._tick(), delay);
  }

  _stop() {
    this._playing = false;
    if (this._timer) { clearTimeout(this._timer); this._timer = null; }
  }

  _cloneInitial() {
    return JSON.parse(JSON.stringify(this.initialState));
  }

  _rebuildTo(targetStep) {
    this._state = this._cloneInitial();
    for (let i = 0; i <= targetStep; i++) {
      if (this.steps[i]?.mutate) this.steps[i].mutate(this._state);
    }
  }

  _render() {
    if (this.onRender) {
      if (this._canvas) this.onRender(this._state, this._canvas, this._step, this.steps);
      else              this.onRender(this._state, this._step, this.steps);
    }
    if (this.onMetrics) this.onMetrics(this._state, this._step);
  }

  _emit(event, arg) {
    (this._listeners[event] || []).forEach(fn => fn(arg !== undefined ? arg : this));
  }

  // ── Static helpers (call after engine is bound to DOM) ────────────────────

  /**
   * Wire up control buttons inside `container.querySelector('.canvas-controls')`.
   * Buttons must have ids: sim-prev, sim-play, sim-pause, sim-next, sim-reset.
   * Returns an unsubscribe function.
   */
  static renderControls(a, b) {
    // New API: renderControls(engine) → returns a ready-to-append element.
    if (a instanceof SimulationEngine) {
      const ctrl = document.createElement('div');
      ctrl.className = 'canvas-controls';
      SimulationEngine._wireControls(ctrl, a);
      return ctrl;
    }
    // Old API: renderControls(container, engine) → fills container, returns unsub.
    const container = a, engine = b;
    const ctrl = container.querySelector('.canvas-controls');
    if (!ctrl) return () => {};
    return SimulationEngine._wireControls(ctrl, engine);
  }

  static _wireControls(ctrl, engine) {
    ctrl.innerHTML = `
      <button class="ctrl-btn" id="sim-reset" title="Reset">↺ Reset</button>
      <button class="ctrl-btn" id="sim-prev"  title="Previous step">⏮ Prev</button>
      <button class="ctrl-btn" id="sim-play"  title="Play">▶ Play</button>
      <button class="ctrl-btn" id="sim-next"  title="Next step">Next ⏭</button>
      <span class="ctrl-label" id="sim-label">Step — / ${engine.totalSteps}</span>
    `;

    const playBtn  = ctrl.querySelector('#sim-play');
    const prevBtn  = ctrl.querySelector('#sim-prev');
    const nextBtn  = ctrl.querySelector('#sim-next');
    const resetBtn = ctrl.querySelector('#sim-reset');
    const label    = ctrl.querySelector('#sim-label');

    function syncUI(eng) {
      const step = eng.currentStep;
      label.textContent = step < 0
        ? `Step — / ${eng.totalSteps}`
        : `Step ${step + 1} / ${eng.totalSteps}`;

      const stepDef = step >= 0 ? eng.steps[step] : null;
      if (stepDef?.label) label.textContent += ` — ${stepDef.label}`;

      if (eng.isPlaying) {
        playBtn.textContent = '⏸ Pause';
        playBtn.classList.add('active');
      } else {
        playBtn.textContent = '▶ Play';
        playBtn.classList.remove('active');
      }
      prevBtn.disabled  = step < 0;
      nextBtn.disabled  = step >= eng.totalSteps - 1;
    }

    const unsub = engine.on('change', syncUI);
    syncUI(engine);

    playBtn.addEventListener('click', () => {
      if (engine.isPlaying) engine.pause(); else engine.play();
    });
    prevBtn.addEventListener('click',  () => engine.previous());
    nextBtn.addEventListener('click',  () => engine.next());
    resetBtn.addEventListener('click', () => engine.reset());

    return unsub;
  }

  /**
   * Render a scrubber timeline inside `container.querySelector('.sim-timeline')`.
   * Returns an unsubscribe function.
   */
  static renderTimeline(a, b) {
    // New API: renderTimeline(engine [, steps]) → returns a ready-to-append element.
    if (a instanceof SimulationEngine) {
      const tl = document.createElement('div');
      tl.className = 'sim-timeline';
      SimulationEngine._wireTimeline(tl, a);
      return tl;
    }
    // Old API: renderTimeline(container, engine) → fills container, returns unsub.
    const container = a, engine = b;
    const tl = container.querySelector('.sim-timeline');
    if (!tl) return () => {};
    return SimulationEngine._wireTimeline(tl, engine);
  }

  static _wireTimeline(tl, engine) {
    function rebuild(eng) {
      tl.innerHTML = eng.steps.map((s, i) => {
        let cls = 'sim-step';
        if (i < eng.currentStep)  cls += ' done';
        if (i === eng.currentStep) cls += ' active';
        return `<div class="${cls}" title="${s.label || `Step ${i+1}`}" data-step="${i}"></div>`;
      }).join('');

      tl.querySelectorAll('.sim-step').forEach(el => {
        el.addEventListener('click', () => engine.jumpTo(+el.dataset.step));
      });
    }

    const unsub = engine.on('change', rebuild);
    rebuild(engine);
    return unsub;
  }

  /**
   * Mount a complete, self-contained simulation panel into `container`.
   * Creates: .canvas-wrap > canvas, .canvas-controls, .sim-timeline, .canvas-explainer
   * Returns { engine, canvas, ctx, unsub }.
   */
  static mount({
    container,
    width = 800,
    height = 420,
    initialState,
    steps,
    onDraw,    // (ctx, state, stepIdx, steps, w, h) => void
    onMetrics, // (state, stepIdx) => void
    explainerFn, // (state, stepIdx, steps) => html string
  }) {
    container.innerHTML = `
      <div class="canvas-wrap">
        <canvas width="${width}" height="${height}" style="width:100%;max-height:${height}px"></canvas>
        <div class="canvas-controls"></div>
        <div class="sim-timeline"></div>
        ${explainerFn ? '<div class="canvas-explainer" id="sim-explainer"></div>' : ''}
      </div>
    `;

    const canvas = container.querySelector('canvas');
    const ctx    = canvas.getContext('2d');
    const explainerEl = container.querySelector('#sim-explainer');

    const engine = new SimulationEngine({
      initialState,
      steps,
      onRender: (state, stepIdx, stepsArr) => {
        ctx.clearRect(0, 0, width, height);
        onDraw(ctx, state, stepIdx, stepsArr, width, height);
        if (explainerEl && explainerFn) {
          explainerEl.innerHTML = explainerFn(state, stepIdx, stepsArr);
        }
      },
      onMetrics,
    });

    const u1 = SimulationEngine.renderControls(container.querySelector('.canvas-wrap'), engine);
    const u2 = SimulationEngine.renderTimeline(container.querySelector('.canvas-wrap'), engine);

    engine.reset();

    return {
      engine,
      canvas,
      ctx,
      unsub: () => { u1(); u2(); engine.destroy(); },
    };
  }
}
