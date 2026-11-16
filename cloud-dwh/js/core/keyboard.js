/* ============================================================
   Keyboard Shortcuts System — Snowflake Architecture Visualizer
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
      // Rebuild the g-chord navigation shortcuts for the active platform.
      document.addEventListener('cdwh:navigate', (e) => {
        const plat = e && e.detail && e.detail.platform;
        if (plat && plat !== this._lastNavPlatform) {
          this._lastNavPlatform = plat;
          this.rebuildNav(window.CDWH.NAV_GROUPS);
        }
      });
    },

    register(key, description, handler, group = 'General') {
      const entry = { key: key.toLowerCase(), description, handler, group };
      this._shortcuts.push(entry);
      return () => { this._shortcuts = this._shortcuts.filter(s => s !== entry); };
    },

    getAll() { return [...this._shortcuts]; },

    _onKeyDown(e) {
      const tag = document.activeElement ? document.activeElement.tagName : '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (document.activeElement && document.activeElement.isContentEditable) return;
      const key = this._getKeyStr(e);
      let shortcut = this._shortcuts.find(s => s.key === key);
      // Shifted punctuation (e.g. '?') reports shiftKey; also match the bare symbol.
      if (!shortcut && key.startsWith('shift+')) {
        const bare = key.slice(6);
        if (bare.length === 1 && /[^a-z0-9]/.test(bare)) shortcut = this._shortcuts.find(s => s.key === bare);
      }
      if (shortcut) {
        e.preventDefault();
        try { shortcut.handler(e); } catch (_) {}
      }
    },

    _getKeyStr(e) {
      const parts = [];
      if (e.ctrlKey || e.metaKey) parts.push('ctrl');
      if (e.altKey)   parts.push('alt');
      if (e.shiftKey) parts.push('shift');
      const k = e.key.toLowerCase();
      if (k !== 'control' && k !== 'alt' && k !== 'shift' && k !== 'meta') parts.push(k);
      return parts.join('+');
    },

    _registerDefaults() {
      // Navigation g-chords are built per platform in rebuildNav().
      this.rebuildNav(window.CDWH.NAV_GROUPS);

      // Animation
      this.register(' ', 'Play / Pause animation', () => {
        const ac = window.CDWH.AnimationControls;
        if (ac && ac._engine) ac._engine.isPlaying ? ac._engine.pause() : ac._engine.play();
      }, 'Animation');

      this.register('arrowright', 'Next step', () => {
        const ac = window.CDWH.AnimationControls;
        if (ac && ac._engine) ac._engine.next();
      }, 'Animation');

      this.register('arrowleft', 'Previous step', () => {
        const ac = window.CDWH.AnimationControls;
        if (ac && ac._engine) ac._engine.prev();
      }, 'Animation');

      this.register('r', 'Reset animation', () => {
        const ac = window.CDWH.AnimationControls;
        if (ac && ac._engine) ac._engine.reset();
      }, 'Animation');

      // UI
      this.register('?', 'Show keyboard shortcuts', () => {
        if (window.CDWH._showShortcutsModal) window.CDWH._showShortcutsModal();
      }, 'General');

      this.register('escape', 'Close modals / panels', () => {
        document.querySelectorAll('.modal-backdrop.visible').forEach(m => m.classList.remove('visible'));
      }, 'General');

      // Ctrl/Cmd+K is owned by the command palette; '/' focuses the
      // sidebar filter without colliding with it.
      this.register('/', 'Focus sidebar search', () => {
        const inp = document.getElementById('sidebar-search');
        if (inp) { inp.focus(); inp.select(); }
      }, 'General');

      this._setupTwoKeySequences();
    },

    _navUnregs: [],
    _lastNavPlatform: null,

    // Build `g h` (home) + `g 1`..`g 9` chords from the active platform's nav.
    rebuildNav(groups) {
      this._navUnregs.forEach(u => { try { u(); } catch (_) {} });
      this._navUnregs = [];
      const nav = this._navigate;
      if (!nav) return;
      const items = (groups || []).flatMap(g => g.items || []);
      let n = 1;
      items.forEach(item => {
        let key;
        if (item.id === 'home') key = 'g h';
        else if (n <= 9) { key = 'g ' + n; n++; }
        else return;
        this._navUnregs.push(
          this.register(key, 'Go to ' + item.label, () => nav(item.id), 'Navigation'));
      });
    },

    _twoKeyTimer: null,
    _awaitingSecond: false,

    _setupTwoKeySequences() {
      document.addEventListener('keydown', (e) => {
        const ae = document.activeElement;
        const tag = ae ? ae.tagName : '';
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (ae && ae.isContentEditable)) return;

        if (e.key.toLowerCase() === 'g' && !e.ctrlKey && !e.metaKey) {
          this._awaitingSecond = true;
          clearTimeout(this._twoKeyTimer);
          this._twoKeyTimer = setTimeout(() => { this._awaitingSecond = false; }, 1500);
          e.preventDefault();
        } else if (this._awaitingSecond) {
          this._awaitingSecond = false;
          clearTimeout(this._twoKeyTimer);
          const combo = 'g ' + e.key.toLowerCase();
          const shortcut = this._shortcuts.find(s => s.key === combo);
          if (shortcut) { e.preventDefault(); try { shortcut.handler(e); } catch (_) {} }
        }
      }, true);
    },
  };

  window.CDWH = window.CDWH || {};
  window.CDWH.Keyboard = Keyboard;
})();
