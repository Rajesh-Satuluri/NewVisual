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
      const shortcut = this._shortcuts.find(s => s.key === key);
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
      const nav = this._navigate;

      // Navigation — Foundation
      this.register('g h', 'Go to Home',         () => nav('home'),          'Navigation');
      this.register('g 1', 'Go to Introduction',  () => nav('intro'),         'Navigation');

      // Navigation — Architecture
      this.register('g 2', 'Go to Architecture',  () => nav('architecture'),  'Navigation');
      this.register('g 3', 'Go to Cloud Services',() => nav('cloud-services'),'Navigation');
      this.register('g 4', 'Go to Storage Layer', () => nav('storage'),       'Navigation');
      this.register('g 5', 'Go to Compute Layer', () => nav('compute'),       'Navigation');

      // Navigation — Query & Data
      this.register('g 6', 'Go to Query Execution',() => nav('query-execution'),'Navigation');
      this.register('g 7', 'Go to Caching',        () => nav('caching'),        'Navigation');
      this.register('g 8', 'Go to Data Loading',   () => nav('data-loading'),   'Navigation');
      this.register('g v', 'Go to Semi-Structured', () => nav('semi-structured'),'Navigation');
      this.register('g d', 'Go to Data Engineering', () => nav('data-engineering'),'Navigation');

      // Navigation — Platform
      this.register('g 9', 'Go to Objects',        () => nav('objects'),         'Navigation');
      this.register('g b', 'Go to RBAC & Roles',   () => nav('rbac'),            'Navigation');
      this.register('g a', 'Go to Advanced Features',() => nav('advanced'),      'Navigation');
      this.register('g s', 'Go to Security',        () => nav('security'),        'Navigation');
      this.register('g o', 'Go to Data Governance', () => nav('governance'),     'Navigation');
      this.register('g m', 'Go to Data Sharing',    () => nav('data-sharing'),   'Navigation');
      this.register('g p', 'Go to Apps on Snowflake', () => nav('apps'),         'Navigation');
      this.register('g u', 'Go to Business Continuity', () => nav('business-continuity'),'Navigation');

      // Navigation — Operations
      this.register('g c', 'Go to Cost & Performance', () => nav('cost-performance'),'Navigation');
      this.register('g i', 'Go to Editions & Connectivity', () => nav('editions'), 'Navigation');
      this.register('g l', 'Go to Glossary & Cheat Sheet', () => nav('reference'), 'Navigation');
      this.register('g x', 'Go to Snowflake vs Field', () => nav('comparison'),   'Navigation');
      this.register('g t', 'Go to SnowPro Cert Map',   () => nav('certification'),'Navigation');
      this.register('g q', 'Go to Interview Prep',     () => nav('interview-prep'),'Navigation');

      this.register('g e', 'Go to E2E Flow',         () => nav('e2e-flow'),       'Navigation');

      // Animation
      this.register(' ', 'Play / Pause animation', () => {
        const ac = window.SnowflakeViz.AnimationControls;
        if (ac && ac._engine) ac._engine.isPlaying ? ac._engine.pause() : ac._engine.play();
      }, 'Animation');

      this.register('arrowright', 'Next step', () => {
        const ac = window.SnowflakeViz.AnimationControls;
        if (ac && ac._engine) ac._engine.next();
      }, 'Animation');

      this.register('arrowleft', 'Previous step', () => {
        const ac = window.SnowflakeViz.AnimationControls;
        if (ac && ac._engine) ac._engine.prev();
      }, 'Animation');

      this.register('r', 'Reset animation', () => {
        const ac = window.SnowflakeViz.AnimationControls;
        if (ac && ac._engine) ac._engine.reset();
      }, 'Animation');

      // UI
      this.register('?', 'Show keyboard shortcuts', () => {
        if (window.SnowflakeViz._showShortcutsModal) window.SnowflakeViz._showShortcutsModal();
      }, 'General');

      this.register('escape', 'Close modals / panels', () => {
        document.querySelectorAll('.modal-backdrop.visible').forEach(m => m.classList.remove('visible'));
      }, 'General');

      this.register('ctrl+k', 'Focus search', () => {
        const inp = document.getElementById('sidebar-search');
        if (inp) { inp.focus(); inp.select(); }
      }, 'General');

      this._setupTwoKeySequences();
    },

    _twoKeyTimer: null,
    _awaitingSecond: false,

    _setupTwoKeySequences() {
      document.addEventListener('keydown', (e) => {
        const tag = document.activeElement ? document.activeElement.tagName : '';
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;

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

  window.SnowflakeViz = window.SnowflakeViz || {};
  window.SnowflakeViz.Keyboard = Keyboard;
})();
