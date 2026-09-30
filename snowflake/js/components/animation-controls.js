/* ============================================================
   Animation Controls — play/pause/step bar at bottom
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

      this._bar.querySelector('#anim-btn-play')?.addEventListener('click', () => {
        if (!this._engine) return;
        this._engine.isPlaying ? this._engine.pause() : this._engine.play();
      });
      this._bar.querySelector('#anim-btn-prev')?.addEventListener('click',  () => this._engine?.prev());
      this._bar.querySelector('#anim-btn-next')?.addEventListener('click',  () => this._engine?.next());
      this._bar.querySelector('#anim-btn-reset')?.addEventListener('click', () => this._engine?.reset());

      // Restore saved playback speed into the selector.
      let savedSpeed = null;
      try { savedSpeed = localStorage.getItem('sviz-speed'); } catch (_) {}
      const speedSel = this._bar.querySelector('#anim-speed');
      if (speedSel && savedSpeed) speedSel.value = savedSpeed;

      speedSel?.addEventListener('change', (e) => {
        this._engine?.setSpeed(parseFloat(e.target.value));
        try { localStorage.setItem('sviz-speed', e.target.value); } catch (_) {}
      });

      this._bar.querySelector('#anim-progress-track')?.addEventListener('click', (e) => {
        if (!this._engine || this._engine.totalSteps === 0) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const ratio = (e.clientX - rect.left) / rect.width;
        const index = Math.round(ratio * (this._engine.totalSteps - 1));
        this._engine.goto(index);
      });
    },

    register(engine) {
      this._detach();
      this._engine = engine;

      // Apply the persisted playback speed to the new engine.
      const speedSel = this._bar?.querySelector('#anim-speed');
      if (speedSel && speedSel.value) engine.setSpeed(parseFloat(speedSel.value));

      this._attach();

      // Keep the URL in sync as steps change: #module/step (shareable).
      this._unsubscribers.push(engine.on('stepchange', (i) => {
        const id = window.SnowflakeViz.currentModuleId;
        if (!id) return;
        const hash = i >= 0 ? `#${id}/${i}` : `#${id}`;
        if (location.hash !== hash) history.replaceState(null, '', hash);
      }));

      this._bar?.classList.add('visible');
      this._sync();

      // Honor a deep-linked step (#module/step) once the module is wired.
      const pending = window.SnowflakeViz._pendingStep;
      if (Number.isInteger(pending) && pending >= 0) {
        window.SnowflakeViz._pendingStep = null;
        setTimeout(() => { try { engine.goto(pending); } catch (_) {} }, 0);
      }
    },

    hide() {
      this._detach();
      this._engine = null;
      this._bar?.classList.remove('visible');
    },

    _attach() {
      if (!this._engine) return;
      this._unsubscribers.push(
        this._engine.on('statechange', () => this._sync()),
        this._engine.on('stepchange',  () => this._sync()),
      );
    },

    _detach() {
      this._unsubscribers.forEach(fn => fn && fn());
      this._unsubscribers = [];
    },

    _sync() {
      const eng = this._engine;
      if (!this._bar || !eng) return;

      const playBtn  = this._bar.querySelector('#anim-btn-play');
      const prevBtn  = this._bar.querySelector('#anim-btn-prev');
      const nextBtn  = this._bar.querySelector('#anim-btn-next');
      const fill     = this._bar.querySelector('#anim-progress-fill');
      const label    = this._bar.querySelector('#anim-step-label');
      const counter  = this._bar.querySelector('#anim-step-counter');

      if (playBtn) {
        const isPlaying = eng.isPlaying;
        playBtn.classList.toggle('play-active', isPlaying);
        playBtn.innerHTML = isPlaying ? _iconPause() : _iconPlay();
        playBtn.title = isPlaying ? 'Pause (Space)' : 'Play (Space)';
      }

      if (prevBtn) prevBtn.disabled = !eng.canGoPrev;
      if (nextBtn) nextBtn.disabled = !eng.canGoNext;

      if (fill) fill.style.width = (eng.progress * 100).toFixed(1) + '%';

      const step = eng.currentStepObj;
      if (label) label.textContent = step ? (step.label || step.description || '') : 'Press Play to start';
      if (counter) {
        const cur = eng.currentStep >= 0 ? eng.currentStep + 1 : 0;
        counter.textContent = `${cur} / ${eng.totalSteps}`;
      }
    },
  };

  function _iconPlay() {
    return `<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><polygon points="5,3 19,12 5,21"/></svg>`;
  }

  function _iconPause() {
    return `<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
      <rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>
    </svg>`;
  }

  window.SnowflakeViz = window.SnowflakeViz || {};
  window.SnowflakeViz.AnimationControls = AnimationControls;
})();
