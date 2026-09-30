/* ============================================================
   Command Palette — ⌘K / Ctrl+K fuzzy search over modules
   and Snowflake concepts. Keyboard + touch friendly.
   ============================================================ */

(function () {
  'use strict';

  // Extra search keywords per module id — makes fuzzy matches land.
  const KEYWORDS = {
    home:            ['overview', 'start', 'landing'],
    intro:           ['why snowflake', 'introduction', 'challenge', 'benefits'],
    architecture:    ['three layer', 'layers', 'design', 'overview'],
    'cloud-services':['optimizer', 'metadata', 'authentication', 'rbac', 'brain'],
    storage:         ['micro-partition', 'micropartition', 'columnar', 'pruning', 's3', 'compression'],
    compute:         ['virtual warehouse', 'cluster', 'auto-suspend', 'scaling', 'credits'],
    'query-execution':['sql', 'plan', 'optimize', 'compile', 'execution'],
    caching:         ['result cache', 'disk cache', 'metadata cache', 'performance'],
    'data-loading':  ['copy into', 'snowpipe', 'kafka', 'ingestion', 'streaming', 'etl'],
    'data-engineering':['streams', 'tasks', 'dynamic table', 'snowpipe streaming', 'pipeline', 'cdc', 'iceberg', 'external table', 'stage', 'file format', 'elt'],
    'cost-performance':['cost', 'performance', 'credit', 'resource monitor', 'warehouse size', 'clustering', 'materialized view', 'search optimization', 'query profile', 'pruning', 'spilling', 'budget', 'calculator'],
    governance:      ['governance', 'tag', 'tagging', 'classification', 'access history', 'lineage', 'object dependencies', 'audit'],
    'data-sharing':  ['data sharing', 'marketplace', 'listing', 'reader account', 'clean room', 'share', 'provider', 'consumer'],
    objects:         ['database', 'schema', 'table', 'hierarchy', 'account'],
    'semi-structured':['variant', 'json', 'flatten', 'parquet', 'avro', 'semi structured', 'nested', 'object', 'array'],
    rbac:            ['rbac', 'role', 'grant', 'privilege', 'access control', 'hierarchy', 'sysadmin', 'accountadmin', 'securityadmin'],
    advanced:        ['time travel', 'fail-safe', 'zero-copy clone', 'data sharing', 'snowpark'],
    security:        ['rbac', 'masking', 'row access', 'governance', 'compliance', 'encryption'],
    'e2e-flow':      ['end to end', 'watch event', 'recommendation', 'capstone', 'pipeline'],
    editions:        ['edition', 'standard', 'enterprise', 'business critical', 'vps', 'region', 'cloud', 'privatelink', 'network policy', 'snowsql', 'snowsight', 'driver', 'connector', 'connectivity'],
    reference:       ['glossary', 'cheat sheet', 'terms', 'definition', 'reference', 'sql reference', 'print'],
    'business-continuity':['business continuity', 'replication', 'failover', 'failback', 'disaster recovery', 'dr', 'fail-safe', 'client redirect'],
    comparison:      ['comparison', 'versus', 'vs', 'redshift', 'bigquery', 'databricks', 'compare', 'competitor'],
    certification:   ['snowpro', 'certification', 'exam', 'core', 'advanced', 'cert', 'domains'],
    apps:            ['streamlit', 'native apps', 'container services', 'snowpark', 'udf', 'stored procedure', 'application'],
    'interview-prep':['interview', 'questions', 'prep', 'practice', 'q&a', 'study', 'flashcards'],
  };

  const CommandPalette = {
    _overlay: null, _input: null, _results: null,
    _index: [], _matches: [], _sel: 0, _lastFocus: null,

    init() {
      this._build();
      this._buildIndex();
      // Capture Ctrl/Cmd+K before other handlers claim it.
      document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
          e.preventDefault(); e.stopPropagation();
          this.toggle();
        }
      }, true);
    },

    _build() {
      const o = document.createElement('div');
      o.className = 'cmdk-overlay';
      o.setAttribute('role', 'dialog');
      o.setAttribute('aria-modal', 'true');
      o.setAttribute('aria-label', 'Command palette');
      o.innerHTML = `
        <div class="cmdk-panel">
          <div class="cmdk-input-wrap">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="6.5" cy="6.5" r="4.5"/><line x1="10" y1="10" x2="14" y2="14"/></svg>
            <input class="cmdk-input" type="text" placeholder="Search modules & concepts…" autocomplete="off" spellcheck="false" aria-label="Search" />
            <span class="cmdk-hint">Esc</span>
          </div>
          <div class="cmdk-results" role="listbox"></div>
        </div>`;
      document.body.appendChild(o);
      this._overlay = o;
      this._input = o.querySelector('.cmdk-input');
      this._results = o.querySelector('.cmdk-results');

      o.addEventListener('click', (e) => { if (e.target === o) this.close(); });
      this._input.addEventListener('input', () => { this._sel = 0; this._search(this._input.value); });
      this._input.addEventListener('keydown', (e) => this._onKey(e));
    },

    _buildIndex() {
      const idx = [];
      const groups = window.SnowflakeViz.NAV_GROUPS || [];
      groups.forEach(g => g.items.forEach(item => {
        idx.push({
          type: 'Module', module: item.id, icon: item.icon,
          title: item.label, sub: g.label,
          hay: (item.label + ' ' + g.label + ' ' + (KEYWORDS[item.id] || []).join(' ')).toLowerCase(),
        });
      }));
      // Concepts — flatten every array-of-objects on the Concepts data.
      const C = window.SnowflakeViz.Concepts || {};
      Object.values(C).forEach(val => {
        if (!Array.isArray(val)) return;
        val.forEach(c => {
          if (!c || !c.name) return;
          const mod = this._guessModule((c.name + ' ' + (c.description || '')).toLowerCase());
          if (!mod) return;
          idx.push({
            type: 'Concept', module: mod, icon: c.icon || '•',
            title: c.name, sub: c.subtitle || 'Concept',
            hay: (c.name + ' ' + (c.subtitle || '') + ' ' + (c.description || '')).toLowerCase(),
          });
        });
      });
      this._index = idx;
    },

    _guessModule(text) {
      let best = null, bestScore = 0;
      Object.entries(KEYWORDS).forEach(([id, kws]) => {
        let score = 0;
        kws.forEach(k => { if (text.includes(k)) score += k.length; });
        if (score > bestScore) { bestScore = score; best = id; }
      });
      return best;
    },

    toggle() { this._overlay.classList.contains('visible') ? this.close() : this.open(); },

    open() {
      this._lastFocus = document.activeElement;
      this._overlay.classList.add('visible');
      this._input.value = '';
      this._search('');
      setTimeout(() => this._input.focus(), 0);
    },

    close() {
      this._overlay.classList.remove('visible');
      if (this._lastFocus && this._lastFocus.focus) this._lastFocus.focus();
    },

    _search(q) {
      q = q.trim().toLowerCase();
      let list;
      if (!q) {
        list = this._index.filter(i => i.type === 'Module');
      } else {
        list = this._index
          .map(i => ({ i, s: i.hay.includes(q) ? (i.hay.startsWith(q) ? 3 : 1) + (i.type === 'Module' ? 1 : 0) : 0 }))
          .filter(x => x.s > 0)
          .sort((a, b) => b.s - a.s)
          .map(x => x.i);
      }
      this._matches = list.slice(0, 20);
      this._render();
    },

    _render() {
      const r = this._results;
      if (!this._matches.length) { r.innerHTML = `<div class="cmdk-empty">No matches</div>`; return; }
      let html = '', lastType = null;
      this._matches.forEach((m, i) => {
        if (m.type !== lastType) { html += `<div class="cmdk-group-label">${m.type}s</div>`; lastType = m.type; }
        html += `<div class="cmdk-item" role="option" data-i="${i}" aria-selected="${i === this._sel}">
          <span class="cmdk-item-icon">${m.icon}</span>
          <span class="cmdk-item-body">
            <span class="cmdk-item-title">${_esc(m.title)}</span>
            <span class="cmdk-item-sub">${_esc(m.sub)}</span>
          </span>
          <span class="cmdk-item-tag">${m.type === 'Concept' ? '↳ ' + m.module : ''}</span>
        </div>`;
      });
      r.innerHTML = html;
      r.querySelectorAll('.cmdk-item').forEach(el => {
        el.addEventListener('click', () => this._choose(parseInt(el.dataset.i, 10)));
      });
      const selEl = r.querySelector('[aria-selected="true"]');
      if (selEl) selEl.scrollIntoView({ block: 'nearest' });
    },

    _onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); this.close(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); this._sel = Math.min(this._sel + 1, this._matches.length - 1); this._render(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); this._sel = Math.max(this._sel - 1, 0); this._render(); }
      else if (e.key === 'Enter') { e.preventDefault(); this._choose(this._sel); }
    },

    _choose(i) {
      const m = this._matches[i];
      if (!m) return;
      this.close();
      window.SnowflakeViz.navigate(m.module);
    },
  };

  function _esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  window.SnowflakeViz = window.SnowflakeViz || {};
  window.SnowflakeViz.CommandPalette = CommandPalette;
})();
