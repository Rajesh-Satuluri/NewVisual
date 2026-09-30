/* ============================================================
   Animation Controls — the play/pause/step bar at bottom
   Wires a registered AnimationEngine to the control bar DOM.
   ============================================================ */

(function () {
  'use strict';

  const AnimationControls = {
    _engine: null,
    _bar: null,
    _unsubscribers: [],

    init() {
      this._bar = document.getElementById('anim-controls-bar');
      if (!this._bar) return;

      // Wire static button clicks
      this._bar.querySelector('#anim-btn-play')?.addEventListener('click', () => {
        if (!this._engine) return;
        this._engine.isPlaying ? this._engine.pause() : this._engine.play();
      });
      this._bar.querySelector('#anim-btn-prev')?.addEventListener('click', () => this._engine?.prev());
      this._bar.querySelector('#anim-btn-next')?.addEventListener('click', () => this._engine?.next());
      this._bar.querySelector('#anim-btn-reset')?.addEventListener('click', () => this._engine?.reset());

      this._bar.querySelector('#anim-speed')?.addEventListener('change', (e) => {
        this._engine?.setSpeed(parseFloat(e.target.value));
      });

      // Progress track click to jump
      this._bar.querySelector('#anim-progress-track')?.addEventListener('click', (e) => {
        if (!this._engine || this._engine.totalSteps === 0) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const ratio = (e.clientX - rect.left) / rect.width;
        const index = Math.round(ratio * (this._engine.totalSteps - 1));
        this._engine.goto(index);
      });
    },

    /** Register an engine and show the control bar */
    register(engine) {
      this._detach();
      this._engine = engine;
      this._attach();
      this._bar?.classList.add('visible');
      this._sync();
    },

    /** Hide the control bar and detach from engine */
    hide() {
      this._detach();
      this._engine = null;
      this._bar?.classList.remove('visible');
    },

    _attach() {
      if (!this._engine) return;
      this._unsubscribers.push(
        this._engine.on('statechange', () => this._sync()),
        this._engine.on('stepchange', () => this._sync()),
        // Mirror the current step into the URL so a paused animation is
        // shareable/bookmarkable (#screen/step). App wires the handler.
        this._engine.on('stepchange', (i) => {
          if (window.IcebergViz && typeof window.IcebergViz._syncStepToUrl === 'function') {
            window.IcebergViz._syncStepToUrl(i);
          }
        }),
      );
    },

    _detach() {
      this._unsubscribers.forEach(fn => fn && fn());
      this._unsubscribers = [];
    },

    _sync() {
      const eng = this._engine;
      if (!this._bar || !eng) return;

      const playBtn = this._bar.querySelector('#anim-btn-play');
      const prevBtn = this._bar.querySelector('#anim-btn-prev');
      const nextBtn = this._bar.querySelector('#anim-btn-next');
      const fill    = this._bar.querySelector('#anim-progress-fill');
      const label   = this._bar.querySelector('#anim-step-label');
      const counter = this._bar.querySelector('#anim-step-counter');

      // Play/Pause icon swap
      if (playBtn) {
        const isPlaying = eng.isPlaying;
        playBtn.classList.toggle('play-active', isPlaying);
        playBtn.innerHTML = isPlaying ? _iconPause() : _iconPlay();
        playBtn.title = isPlaying ? 'Pause (Space)' : 'Play (Space)';
      }

      // Disable prev/next at boundaries
      if (prevBtn) prevBtn.disabled = !eng.canGoPrev;
      if (nextBtn) nextBtn.disabled = !eng.canGoNext;

      // Progress fill
      if (fill) {
        fill.style.width = (eng.progress * 100).toFixed(1) + '%';
      }

      // Step label & counter
      const step = eng.currentStepObj;
      if (label) label.textContent = step ? step.label || step.description || '' : 'Press Play to start';
      if (counter) {
        const cur = eng.currentStep >= 0 ? eng.currentStep + 1 : 0;
        counter.textContent = `${cur} / ${eng.totalSteps}`;
      }
    },
  };

  /* ── SVG icons (inline for zero-dependency) ─────────────── */
  function _iconPlay() {
    return `<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
      <polygon points="5,3 19,12 5,21"/>
    </svg>`;
  }
  function _iconPause() {
    return `<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
      <rect x="6" y="4" width="4" height="16" rx="1"/>
      <rect x="14" y="4" width="4" height="16" rx="1"/>
    </svg>`;
  }

  window.IcebergViz = window.IcebergViz || {};
  window.IcebergViz.AnimationControls = AnimationControls;
})();
