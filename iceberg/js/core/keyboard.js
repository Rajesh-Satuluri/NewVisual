/* ============================================================
   Keyboard Shortcuts System
   ============================================================ */

(function () {
  'use strict';

  const Keyboard = {
    _shortcuts: [],
    _navigate: null,

    init(navigateFn) {
      this._navigate = navigateFn;
      this._registerDefaults();
      document.addEventListener('keydown', this._onKeyDown.bind(this));
    },

    /** Register a shortcut. Returns an unregister function. */
    register(key, description, handler, group = 'General') {
      const entry = { key: key.toLowerCase(), description, handler, group };
      this._shortcuts.push(entry);
      return () => {
        this._shortcuts = this._shortcuts.filter(s => s !== entry);
      };
    },

    getAll() {
      return [...this._shortcuts];
    },

    _onKeyDown(e) {
      // Ignore when typing in inputs
      const tag = document.activeElement ? document.activeElement.tagName : '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (document.activeElement && document.activeElement.isContentEditable) return;

      const key = this._getKeyStr(e);
      const shortcut = this._shortcuts.find(s => s.key === key);
      if (shortcut) {
        e.preventDefault();
        try { shortcut.handler(e); } catch (_) {}
      }
    },

    _getKeyStr(e) {
      const parts = [];
      if (e.ctrlKey || e.metaKey) parts.push('ctrl');
      if (e.altKey) parts.push('alt');
      if (e.shiftKey) parts.push('shift');
      const k = e.key.toLowerCase();
      if (k !== 'control' && k !== 'alt' && k !== 'shift' && k !== 'meta') {
        parts.push(k);
      }
      return parts.join('+');
    },

    _registerDefaults() {
      const nav = this._navigate;

      // Navigation shortcuts
      this.register('g h', 'Go to Home', () => nav('home'), 'Navigation');
      this.register('g a', 'Go to Architecture', () => nav('architecture'), 'Navigation');
      this.register('g m', 'Go to Metadata Explorer', () => nav('metadata-explorer'), 'Navigation');
      this.register('g w', 'Go to Why Iceberg', () => nav('why-iceberg'), 'Navigation');
      this.register('g s', 'Go to Snapshot Explorer', () => nav('snapshot-explorer'), 'Navigation');
      this.register('g c', 'Go to CREATE TABLE', () => nav('create-table'), 'Navigation');
      this.register('g i', 'Go to Interview Mode', () => nav('interview'), 'Navigation');

      // Animation shortcuts
      this.register(' ', 'Play / Pause animation', () => {
        const ac = window.IcebergViz.AnimationControls;
        if (ac && ac._engine) {
          ac._engine.isPlaying ? ac._engine.pause() : ac._engine.play();
        }
      }, 'Animation');

      this.register('arrowright', 'Next step', () => {
        const ac = window.IcebergViz.AnimationControls;
        if (ac && ac._engine) ac._engine.next();
      }, 'Animation');

      this.register('arrowleft', 'Previous step', () => {
        const ac = window.IcebergViz.AnimationControls;
        if (ac && ac._engine) ac._engine.prev();
      }, 'Animation');

      this.register('r', 'Reset animation', () => {
        const ac = window.IcebergViz.AnimationControls;
        if (ac && ac._engine) ac._engine.reset();
      }, 'Animation');

      // UI
      this.register('?', 'Show keyboard shortcuts', () => {
        if (window.IcebergViz._showShortcutsModal) window.IcebergViz._showShortcutsModal();
      }, 'General');

      this.register('escape', 'Close modals / panels', () => {
        document.querySelectorAll('.modal-backdrop.visible').forEach(m => m.classList.remove('visible'));
      }, 'General');

      this.register('ctrl+k', 'Open command palette', () => {
        if (window.IcebergViz._openPalette) window.IcebergViz._openPalette();
      }, 'General');

      // Two-key sequences (g + letter) handled via a simple state machine
      this._setupTwoKeySequences();
    },

    _twoKeyTimer: null,
    _awaitingSecond: false,

    _setupTwoKeySequences() {
      // Override the 'g' key to start a two-key sequence
      document.addEventListener('keydown', (e) => {
        const tag = document.activeElement ? document.activeElement.tagName : '';
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;

        if (e.key.toLowerCase() === 'g' && !e.ctrlKey && !e.metaKey) {
          this._awaitingSecond = true;
          clearTimeout(this._twoKeyTimer);
          this._twoKeyTimer = setTimeout(() => {
            this._awaitingSecond = false;
          }, 1500);
          e.preventDefault();
        } else if (this._awaitingSecond) {
          this._awaitingSecond = false;
          clearTimeout(this._twoKeyTimer);
          const combo = 'g ' + e.key.toLowerCase();
          const shortcut = this._shortcuts.find(s => s.key === combo);
          if (shortcut) {
            e.preventDefault();
            try { shortcut.handler(e); } catch (_) {}
          }
        }
      }, true);
    },
  };

  window.IcebergViz = window.IcebergViz || {};
  window.IcebergViz.Keyboard = Keyboard;
})();
