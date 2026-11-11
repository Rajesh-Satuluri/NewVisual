/* ============================================================
   Code Viewer — syntax-highlighted code blocks
   Supports JSON, SQL (Snowflake dialect), Python, shell
   ============================================================ */

(function () {
  'use strict';

  const EDIT_PREFIX = 'cdwh-cvedit:';

  const CodeViewer = {
    /**
     * @param {string} code    the original/pristine source
     * @param {string} lang    json|sql|snowflake|python|…
     * @param {string} [title] header label
     * @param {Object} [opts]  { editable?: boolean (default true),
     *                           editKey?: string (stable persistence id) }
     */
    create(code, lang, title, opts) {
      opts = opts || {};
      const editable = opts.editable !== false;
      const original = code;
      const editKey = editable ? _slug(opts.editKey || title || lang, original) : null;

      // current = original unless a saved override exists
      let current = original;
      if (editKey) { const ov = _loadOverride(editKey); if (ov != null) current = ov; }

      const wrapper = document.createElement('div');
      wrapper.className = 'code-block';

      const header = document.createElement('div');
      header.className = 'code-block-header';

      const langEl = document.createElement('span');
      langEl.className = 'code-block-lang';
      langEl.textContent = title || lang.toUpperCase();

      const badge = document.createElement('span');
      badge.className = 'cv-edited-badge';
      badge.textContent = 'edited';

      const actions = document.createElement('div');
      actions.className = 'code-block-actions';

      const copyBtn = document.createElement('button');
      copyBtn.className = 'code-block-copy btn-icon';
      copyBtn.innerHTML = _iconCopy() + '<span>Copy</span>';
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(current).then(() => {
          copyBtn.classList.add('copied');
          copyBtn.querySelector('span').textContent = 'Copied!';
          setTimeout(() => {
            copyBtn.classList.remove('copied');
            copyBtn.querySelector('span').textContent = 'Copy';
          }, 2000);
        });
      });

      const body = document.createElement('div');
      body.className = 'code-block-body';
      const pre = document.createElement('pre');
      body.appendChild(pre);

      const self = this;
      const renderView = () => {
        pre.innerHTML = self.highlight(current, lang);
        wrapper.classList.toggle('cv-edited', editKey && current !== original);
      };

      header.appendChild(langEl);
      if (editKey) header.appendChild(badge);
      header.appendChild(actions);

      // ── Editable controls ─────────────────────────────────────
      if (editKey) {
        const editBtn = document.createElement('button');
        editBtn.className = 'code-block-copy btn-icon cv-edit-btn';
        editBtn.innerHTML = _iconEdit() + '<span>Edit</span>';

        const saveBtn = _mkBtn('Save', 'cv-save');
        const cancelBtn = _mkBtn('Cancel', 'cv-cancel');
        const resetBtn = _mkBtn('Reset', 'cv-reset');

        const enterEdit = () => {
          const ta = document.createElement('textarea');
          ta.className = 'cv-editor';
          ta.value = current;
          ta.spellcheck = false;
          ta.setAttribute('aria-label', 'Edit code');
          body.replaceChild(ta, body.firstChild);
          ta.style.height = Math.max(ta.scrollHeight, 80) + 'px';
          ta.focus();
          editBtn.style.display = 'none';
          copyBtn.style.display = 'none';
          [saveBtn, cancelBtn, resetBtn].forEach(b => (b.style.display = ''));

          const commit = (val) => {
            current = val;
            if (current === original) { _saveOverride(editKey, null); }
            else { _saveOverride(editKey, current); }
            exitEdit();
          };
          ta.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); commit(ta.value); }
            else if (e.key === 'Escape') { e.preventDefault(); exitEdit(); }
          });
          saveBtn.onclick = () => commit(ta.value);
          cancelBtn.onclick = () => exitEdit();
          resetBtn.onclick = () => { _saveOverride(editKey, null); current = original; exitEdit(); };
        };
        const exitEdit = () => {
          renderView();
          if (body.firstChild !== pre) body.replaceChild(pre, body.firstChild);
          editBtn.style.display = '';
          copyBtn.style.display = '';
          [saveBtn, cancelBtn, resetBtn].forEach(b => (b.style.display = 'none'));
        };

        editBtn.addEventListener('click', enterEdit);
        [saveBtn, cancelBtn, resetBtn].forEach(b => { b.style.display = 'none'; actions.appendChild(b); });
        actions.appendChild(editBtn);

        // Live re-apply when state is imported/synced from elsewhere.
        window.addEventListener('clouddwh:state-refresh', () => {
          if (body.firstChild !== pre) return; // don't stomp an active edit
          const ov = _loadOverride(editKey);
          current = ov != null ? ov : original;
          renderView();
        });
      }

      actions.appendChild(copyBtn);
      renderView();

      wrapper.appendChild(header);
      wrapper.appendChild(body);
      return wrapper;
    },

    highlight(code, lang) {
      const escaped = _esc(code);
      switch (lang.toLowerCase()) {
        case 'json':       return _highlightJSON(escaped);
        case 'sql':
        case 'snowflake':  return _highlightSQL(escaped);
        case 'python':     return _highlightPython(escaped);
        default:           return escaped;
      }
    },
  };

  /* ── Override persistence (cdwh- namespace → carried by export/import) ── */
  function _loadOverride(key) {
    try { const v = localStorage.getItem(EDIT_PREFIX + key); return v == null ? null : JSON.parse(v); }
    catch (_) { return null; }
  }
  function _saveOverride(key, val) {
    try {
      if (val == null) localStorage.removeItem(EDIT_PREFIX + key);
      else localStorage.setItem(EDIT_PREFIX + key, JSON.stringify(val));
    } catch (_) {}
  }

  /* stable slug: explicit editKey if given, else (title|lang) + short hash of
     the original source so same-titled blocks don't share an override. */
  function _slug(base, source) {
    const s = String(base || 'code').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'code';
    return s + '-' + _hash(source || '');
  }
  function _hash(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
  }

  function _mkBtn(label, cls) {
    const b = document.createElement('button');
    b.className = 'code-block-copy btn-icon ' + cls;
    b.innerHTML = '<span>' + label + '</span>';
    return b;
  }

  function _esc(s) {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function _highlightJSON(code) {
    return code.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      (match) => {
        if (/^"/.test(match)) {
          if (/:$/.test(match)) return `<span class="tok-key">${match}</span>`;
          return `<span class="tok-str">${match}</span>`;
        }
        if (/true|false/.test(match)) return `<span class="tok-bool">${match}</span>`;
        if (/null/.test(match))        return `<span class="tok-null">${match}</span>`;
        return `<span class="tok-num">${match}</span>`;
      }
    );
  }

  /* Snowflake SQL keywords (superset of ANSI SQL) */
  const SQL_KEYWORDS = [
    // DDL
    'CREATE OR REPLACE','CREATE','TABLE','VIEW','MATERIALIZED VIEW','DATABASE',
    'SCHEMA','WAREHOUSE','STAGE','FILE FORMAT','PIPE','STREAM','TASK','PROCEDURE',
    'FUNCTION','SEQUENCE','SHARE','RESOURCE MONITOR',
    'ALTER','DROP','TRUNCATE','RENAME','ADD','REPLACE','CLONE',
    // DML
    'SELECT','FROM','WHERE','GROUP BY','ORDER BY','HAVING','LIMIT',
    'INSERT','INTO','VALUES','UPDATE','SET','DELETE','MERGE','COPY INTO',
    'INSERT OVERWRITE','UNION ALL','UNION',
    // Joins
    'JOIN','LEFT JOIN','RIGHT JOIN','INNER JOIN','OUTER JOIN','FULL OUTER JOIN',
    'CROSS JOIN','LEFT OUTER JOIN','ON','USING',
    // Snowflake-specific
    'WAREHOUSE','AUTO_SUSPEND','AUTO_RESUME','INITIALLY_SUSPENDED',
    'WAREHOUSE_SIZE','MAX_CLUSTER_COUNT','MIN_CLUSTER_COUNT',
    'SCALING_POLICY','COMMENT','TRANSIENT','TEMPORARY','SECURE',
    'TIME_TRAVEL_IN_DAYS','DATA_RETENTION_TIME_IN_DAYS',
    'CLUSTER BY','SEARCH OPTIMIZATION','DYNAMIC','TARGET_LAG',
    'AT','BEFORE','CHANGES','STREAM','TASK','SCHEDULE',
    'COPY GRANTS','QUERY_TAG','STATEMENT_TIMEOUT_IN_SECONDS',
    'NETWORK_POLICY','ROW ACCESS POLICY','MASKING POLICY',
    'TAG','ASSOCIATION','APPLY',
    // Query clauses
    'WITH','AS','DISTINCT','ALL','EXISTS','NOT EXISTS',
    'CASE','WHEN','THEN','ELSE','END','CAST','TRY_CAST',
    'OVER','PARTITION BY','ROWS BETWEEN','RANGE BETWEEN',
    'UNBOUNDED PRECEDING','CURRENT ROW','UNBOUNDED FOLLOWING',
    // Types
    'VARCHAR','STRING','TEXT','NUMBER','NUMERIC','DECIMAL',
    'INTEGER','BIGINT','SMALLINT','TINYINT','FLOAT','DOUBLE',
    'BOOLEAN','DATE','TIME','TIMESTAMP','TIMESTAMP_LTZ','TIMESTAMP_NTZ',
    'VARIANT','OBJECT','ARRAY','GEOGRAPHY','GEOMETRY',
    // Conditionals
    'NOT','NULL','IS NULL','IS NOT NULL','AND','OR','IN','NOT IN',
    'LIKE','ILIKE','BETWEEN','REGEXP',
    // Functions (common)
    'COUNT','SUM','AVG','MIN','MAX','COALESCE','NVL','IFF',
    'TO_DATE','TO_TIMESTAMP','TO_NUMBER','TO_VARCHAR',
    'DATEADD','DATEDIFF','DATE_TRUNC','EXTRACT',
    'CURRENT_TIMESTAMP','CURRENT_DATE','CURRENT_USER','CURRENT_ROLE',
    'CURRENT_WAREHOUSE','CURRENT_DATABASE','CURRENT_SCHEMA',
    'SPLIT_TO_TABLE','FLATTEN','PARSE_JSON','OBJECT_CONSTRUCT',
    'ARRAY_AGG','LISTAGG','ROW_NUMBER','RANK','DENSE_RANK',
    'LAG','LEAD','FIRST_VALUE','LAST_VALUE','NTILE',
    'SNOWFLAKE','INFORMATION_SCHEMA','ACCOUNT_USAGE',
    'RESULT_SCAN','LAST_QUERY_ID',
    'IF NOT EXISTS','OR REPLACE',
  ].sort((a, b) => b.length - a.length);

  function _highlightSQL(code) {
    let result = code.replace(/--(.*?)(?=\n|$)/g, (m) => `<span class="tok-cmt">${m}</span>`);
    result = result.replace(/&#39;([^&#39;]*)&#39;/g, (m) => `<span class="tok-str">${m}</span>`);
    result = result.replace(/&quot;([^&quot;]*)&quot;/g, (m) => `<span class="tok-str">${m}</span>`);
    SQL_KEYWORDS.forEach(kw => {
      const re = new RegExp(`\\b(${kw})\\b`, 'gi');
      result = result.replace(re, `<span class="tok-kw">$1</span>`);
    });
    result = result.replace(/\b(\d+)\b/g, `<span class="tok-num">$1</span>`);
    return result;
  }

  const PY_KEYWORDS = [
    'def','class','import','from','return','if','else','elif',
    'for','while','in','not','and','or','True','False','None',
    'with','as','try','except','finally','raise','yield','lambda',
    'pass','break','continue','is','del','global','nonlocal','assert',
  ];

  function _highlightPython(code) {
    let result = code;
    result = result.replace(/#(.*?)(?=\n|$)/g, (m) => `<span class="tok-cmt">${m}</span>`);
    result = result.replace(/(&#39;&#39;&#39;[\s\S]*?&#39;&#39;&#39;|&quot;&quot;&quot;[\s\S]*?&quot;&quot;&quot;)/g,
      (m) => `<span class="tok-str">${m}</span>`);
    result = result.replace(/(&#39;[^&#39;\n]*&#39;|&quot;[^&quot;\n]*&quot;)/g,
      (m) => `<span class="tok-str">${m}</span>`);
    PY_KEYWORDS.forEach(kw => {
      result = result.replace(new RegExp(`\\b(${kw})\\b`, 'g'), `<span class="tok-kw">$1</span>`);
    });
    result = result.replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\s*(?=\()/g, `<span class="tok-fn">$1</span>`);
    result = result.replace(/\b(\d+(?:\.\d+)?)\b/g, `<span class="tok-num">$1</span>`);
    return result;
  }

  function _iconCopy() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
      <rect x="9" y="9" width="13" height="13" rx="2"/>
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
    </svg>`;
  }

  function _iconEdit() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
      <path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>`;
  }

  window.CDWH = window.CDWH || {};
  window.CDWH.CodeViewer = CodeViewer;
})();
