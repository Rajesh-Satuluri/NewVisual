/* ============================================================
   Code Viewer — syntax-highlighted code blocks
   Supports JSON, SQL, Python/PySpark, shell paths
   ============================================================ */

(function () {
  'use strict';

  const CodeViewer = {

    /**
     * Create a full code block element with header + copy button.
     * @param {string} code - source code string
     * @param {string} lang - 'json' | 'sql' | 'python' | 'text'
     * @param {string} [title] - optional label shown in header
     * @returns {HTMLElement}
     */
    create(code, lang, title, opts) {
      opts = opts || {};
      const self = this;
      const langLc = String(lang).toLowerCase();

      // Editing is on by default; a caller can opt a block out with
      // { editable:false }. The persistence key is derived from the title
      // (stable across reloads) unless one is supplied, and lives under the
      // `iv:` prefix so Cloud sync picks edits up automatically.
      const editable = opts.editable !== false;
      const editKey = editable
        ? 'iv:cvedit:' + _slug(opts.editKey || title || lang)
        : null;

      const originalCode = code;
      let currentCode = (editKey && _loadOverride(editKey) != null)
        ? _loadOverride(editKey)
        : originalCode;
      let editing = false;

      const wrapper = document.createElement('div');
      wrapper.className = 'code-block';

      const header = document.createElement('div');
      header.className = 'code-block-header';

      const langEl = document.createElement('span');
      langEl.className = 'code-block-lang';
      langEl.textContent = title || lang.toUpperCase();

      const editedBadge = document.createElement('span');
      editedBadge.className = 'code-block-edited';
      editedBadge.textContent = 'edited';

      const titleWrap = document.createElement('span');
      titleWrap.className = 'code-block-titlewrap';
      titleWrap.appendChild(langEl);
      titleWrap.appendChild(editedBadge);

      const actions = document.createElement('div');
      actions.className = 'code-block-actions';

      const body = document.createElement('div');
      body.className = 'code-block-body';

      /* ── Comments toggle (JSON only) ── */
      let cmtBtn = null;
      const canAnnotate = langLc === 'json' && _canAnnotate();
      if (canAnnotate) {
        const hidden = _commentsHidden();
        if (hidden) wrapper.classList.add('cv-hide-comments');
        cmtBtn = document.createElement('button');
        cmtBtn.className = 'code-block-toggle btn-icon';
        cmtBtn.type = 'button';
        cmtBtn.setAttribute('aria-pressed', String(!hidden));
        cmtBtn.title = 'Show or hide inline explanations';
        cmtBtn.innerHTML = _iconComment() + '<span>Comments</span>';
        if (!hidden) cmtBtn.classList.add('active');
        _ensureToggleDelegate();
        actions.appendChild(cmtBtn);
      }

      /* ── Copy ── */
      const copyBtn = document.createElement('button');
      copyBtn.className = 'code-block-copy btn-icon';
      copyBtn.type = 'button';
      copyBtn.innerHTML = _iconCopy() + '<span>Copy</span>';
      copyBtn.addEventListener('click', () => {
        // Copy the clean source as currently shown — comments are display-only.
        navigator.clipboard.writeText(currentCode).then(() => {
          copyBtn.classList.add('copied');
          copyBtn.querySelector('span').textContent = 'Copied!';
          setTimeout(() => {
            copyBtn.classList.remove('copied');
            copyBtn.querySelector('span').textContent = 'Copy';
          }, 2000);
        });
      });

      /* ── Edit controls ── */
      let editBtn = null, saveBtn = null, cancelBtn = null, resetBtn = null;
      if (editable) {
        editBtn = document.createElement('button');
        editBtn.className = 'code-block-edit btn-icon';
        editBtn.type = 'button';
        editBtn.title = 'Edit this code';
        editBtn.innerHTML = _iconEdit() + '<span>Edit</span>';
        editBtn.addEventListener('click', enterEdit);

        saveBtn = document.createElement('button');
        saveBtn.className = 'code-block-save btn-icon';
        saveBtn.type = 'button';
        saveBtn.innerHTML = _iconCheck() + '<span>Save</span>';
        saveBtn.addEventListener('click', saveEdit);

        cancelBtn = document.createElement('button');
        cancelBtn.className = 'code-block-cancel btn-icon';
        cancelBtn.type = 'button';
        cancelBtn.innerHTML = _iconX() + '<span>Cancel</span>';
        cancelBtn.addEventListener('click', cancelEdit);

        resetBtn = document.createElement('button');
        resetBtn.className = 'code-block-reset btn-icon';
        resetBtn.type = 'button';
        resetBtn.title = 'Restore the original code';
        resetBtn.innerHTML = _iconReset() + '<span>Reset</span>';
        resetBtn.addEventListener('click', resetEdit);
      }

      actions.appendChild(copyBtn);
      if (editable) {
        actions.appendChild(editBtn);
        actions.appendChild(saveBtn);
        actions.appendChild(cancelBtn);
        actions.appendChild(resetBtn);
      }

      header.appendChild(titleWrap);
      header.appendChild(actions);
      wrapper.appendChild(header);
      wrapper.appendChild(body);

      /* ── Rendering ── */
      function renderView() {
        body.innerHTML = '';
        wrapper.classList.remove('cv-editing');
        const annotate = langLc === 'json' && _canAnnotate();
        if (annotate) {
          body.appendChild(_buildAnnotated(currentCode));
        } else {
          const pre = document.createElement('pre');
          pre.innerHTML = self.highlight(currentCode, lang);
          body.appendChild(pre);
        }
        const overridden = editKey && _loadOverride(editKey) != null;
        wrapper.classList.toggle('cv-edited', !!overridden);
        if (resetBtn) resetBtn.style.display = overridden ? '' : 'none';
      }

      function setEditingUI(on) {
        editing = on;
        wrapper.classList.toggle('cv-editing', on);
        if (editBtn) editBtn.style.display = on ? 'none' : '';
        if (copyBtn) copyBtn.style.display = on ? 'none' : '';
        if (cmtBtn) cmtBtn.style.display = on ? 'none' : '';
        if (saveBtn) saveBtn.style.display = on ? '' : 'none';
        if (cancelBtn) cancelBtn.style.display = on ? '' : 'none';
        if (resetBtn) {
          const overridden = editKey && _loadOverride(editKey) != null;
          resetBtn.style.display = (on || overridden) ? '' : 'none';
        }
      }

      function enterEdit() {
        body.innerHTML = '';
        const ta = document.createElement('textarea');
        ta.className = 'cv-editor';
        ta.spellcheck = false;
        ta.setAttribute('autocomplete', 'off');
        ta.value = currentCode;
        // Allow Tab to insert two spaces; Esc cancels; Ctrl/Cmd+Enter saves.
        ta.addEventListener('keydown', (e) => {
          if (e.key === 'Tab') {
            e.preventDefault();
            const s = ta.selectionStart, en = ta.selectionEnd;
            ta.value = ta.value.slice(0, s) + '  ' + ta.value.slice(en);
            ta.selectionStart = ta.selectionEnd = s + 2;
          } else if (e.key === 'Escape') {
            e.preventDefault(); cancelEdit();
          } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault(); saveEdit();
          }
        });
        body.appendChild(ta);
        setEditingUI(true);
        _autosize(ta);
        ta.addEventListener('input', () => _autosize(ta));
        ta.focus();
      }

      function saveEdit() {
        const ta = body.querySelector('.cv-editor');
        if (!ta) { setEditingUI(false); renderView(); return; }
        const next = ta.value;
        if (next === originalCode) {
          if (editKey) _saveOverride(editKey, null);   // back to pristine
        } else if (editKey) {
          _saveOverride(editKey, next);
        }
        currentCode = next;
        setEditingUI(false);
        renderView();
        _afterChange(editKey, next !== originalCode);
      }

      function cancelEdit() {
        setEditingUI(false);
        renderView();
      }

      function resetEdit() {
        if (editKey) _saveOverride(editKey, null);
        currentCode = originalCode;
        setEditingUI(false);
        renderView();
        _afterChange(editKey, false);
      }

      // Live re-apply when Cloud sync pulls a newer edit from another device.
      if (editKey) {
        const onCloud = () => {
          if (editing) return;                       // don't clobber an open editor
          if (!wrapper.isConnected) {                // block detached → drop listener
            window.removeEventListener('tableviz:cloud-refresh', onCloud);
            return;
          }
          const ov = _loadOverride(editKey);
          const next = ov != null ? ov : originalCode;
          if (next !== currentCode) { currentCode = next; renderView(); }
        };
        window.addEventListener('tableviz:cloud-refresh', onCloud);
      }

      renderView();
      setEditingUI(false);
      return wrapper;
    },

    /**
     * Return HTML string with syntax-highlighted spans.
     * @param {string} code
     * @param {string} lang
     */
    highlight(code, lang) {
      const escaped = _esc(code);
      switch (lang.toLowerCase()) {
        case 'json': return _highlightJSON(escaped);
        case 'sql':  return _highlightSQL(escaped);
        case 'python':
        case 'pyspark': return _highlightPython(escaped);
        default: return escaped;
      }
    },
  };

  /* ── Escaping ────────────────────────────────────────────── */
  function _esc(s) {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ── JSON Highlighter ────────────────────────────────────── */
  function _highlightJSON(code) {
    return code.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      (match) => {
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            // key
            return `<span class="tok-key">${match}</span>`;
          }
          // s3 paths
          if (/s3:\/\//.test(match)) {
            return `<span class="tok-path">${match}</span>`;
          }
          return `<span class="tok-str">${match}</span>`;
        }
        if (/true|false/.test(match)) return `<span class="tok-bool">${match}</span>`;
        if (/null/.test(match))        return `<span class="tok-null">${match}</span>`;
        return `<span class="tok-num">${match}</span>`;
      }
    );
  }

  /* ── SQL Highlighter ─────────────────────────────────────── */
  const SQL_KEYWORDS = [
    'SELECT','FROM','WHERE','GROUP BY','ORDER BY','HAVING','LIMIT',
    'INSERT','INTO','VALUES','UPDATE','SET','DELETE','MERGE',
    'CREATE','TABLE','DATABASE','SCHEMA','VIEW','INDEX',
    'ALTER','DROP','TRUNCATE','RENAME','ADD','REPLACE',
    'USING','PARTITIONED BY','TBLPROPERTIES','LOCATION','COMMENT',
    'CALL','AS','ON','JOIN','LEFT','RIGHT','INNER','OUTER','FULL',
    'UNION','ALL','DISTINCT','COUNT','SUM','MIN','MAX','AVG',
    'NOT','NULL','IS','AND','OR','IN','LIKE','BETWEEN','CASE','WHEN',
    'THEN','ELSE','END','CAST','TIMESTAMP','DATE','VERSION AS OF',
    'TIMESTAMP AS OF','WITH','BIGINT','INT','STRING','BOOLEAN',
    'DECIMAL','DOUBLE','FLOAT','STRUCT','ARRAY','MAP',
    'REQUIRED','NOT NULL','COMMENT','IF NOT EXISTS','OR REPLACE',
  ].sort((a, b) => b.length - a.length); // longest first

  function _highlightSQL(code) {
    // Comments first
    let result = code.replace(/--(.*?)(?=\n|$)/g, (m) => `<span class="tok-cmt">${m}</span>`);
    // Strings
    result = result.replace(/&#39;([^&#39;]*)&#39;/g, (m) => `<span class="tok-str">${m}</span>`);
    result = result.replace(/&quot;([^&quot;]*)&quot;/g, (m) => `<span class="tok-str">${m}</span>`);
    // Keywords
    SQL_KEYWORDS.forEach(kw => {
      const re = new RegExp(`\\b(${kw})\\b`, 'gi');
      result = result.replace(re, `<span class="tok-kw">$1</span>`);
    });
    // Numbers
    result = result.replace(/\b(\d+)\b/g, `<span class="tok-num">$1</span>`);
    // S3 paths
    result = result.replace(/(s3:\/\/[^\s&<'"]+)/g, `<span class="tok-path">$1</span>`);
    return result;
  }

  /* ── Python Highlighter ──────────────────────────────────── */
  const PY_KEYWORDS = [
    'def','class','import','from','return','if','else','elif',
    'for','while','in','not','and','or','True','False','None',
    'with','as','try','except','finally','raise','yield','lambda',
    'pass','break','continue','is','del','global','nonlocal','assert',
  ];

  function _highlightPython(code) {
    let result = code;
    // Comments
    result = result.replace(/#(.*?)(?=\n|$)/g, (m) => `<span class="tok-cmt">${m}</span>`);
    // Strings (triple quotes)
    result = result.replace(/(&#39;&#39;&#39;[\s\S]*?&#39;&#39;&#39;|&quot;&quot;&quot;[\s\S]*?&quot;&quot;&quot;)/g,
      (m) => `<span class="tok-str">${m}</span>`);
    // Single-line strings
    result = result.replace(/(&#39;[^&#39;\n]*&#39;|&quot;[^&quot;\n]*&quot;)/g,
      (m) => `<span class="tok-str">${m}</span>`);
    // Keywords
    PY_KEYWORDS.forEach(kw => {
      const re = new RegExp(`\\b(${kw})\\b`, 'g');
      result = result.replace(re, `<span class="tok-kw">$1</span>`);
    });
    // Function calls (identifier followed by '(')
    result = result.replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\s*(?=\()/g,
      `<span class="tok-fn">$1</span>`);
    // Numbers
    result = result.replace(/\b(\d+(?:\.\d+)?)\b/g, `<span class="tok-num">$1</span>`);
    // S3 paths
    result = result.replace(/(s3:\/\/[^\s&<'"]+)/g, `<span class="tok-path">$1</span>`);
    return result;
  }

  /* ── Inline annotations (JSON) ───────────────────────────── */
  const CMT_KEY = 'iv:json-comments-hidden';

  function _canAnnotate() {
    return !!(window.IcebergViz &&
      window.IcebergViz.JsonAnnotations &&
      typeof window.IcebergViz.JsonAnnotations.lookup === 'function');
  }

  function _commentsHidden() {
    try { return localStorage.getItem(CMT_KEY) === '1'; }
    catch (e) { return false; }
  }

  // One document-level listener drives every Comments toggle, so buttons
  // survive being re-serialised through outerHTML (as several screens do).
  let _toggleDelegated = false;
  function _ensureToggleDelegate() {
    if (_toggleDelegated) return;
    _toggleDelegated = true;
    document.addEventListener('click', (e) => {
      const btn = e.target.closest && e.target.closest('.code-block-toggle');
      if (!btn) return;
      const block = btn.closest('.code-block');
      if (!block) return;
      const nowHidden = block.classList.toggle('cv-hide-comments');
      btn.classList.toggle('active', !nowHidden);
      btn.setAttribute('aria-pressed', String(!nowHidden));
      _setCommentsHidden(nowHidden);
    });
  }
  function _setCommentsHidden(hidden) {
    try {
      if (hidden) localStorage.setItem(CMT_KEY, '1');
      else localStorage.removeItem(CMT_KEY);
    } catch (e) { /* storage unavailable — non-fatal */ }
  }

  // Leading JSON key on a line, e.g.  `  "file-path": "s3://…",`
  function _lineKey(rawLine) {
    const m = /^\s*"((?:\\.|[^"\\])+)"\s*:/.exec(rawLine);
    return m ? m[1] : '';
  }

  /**
   * Build a two-column grid: highlighted code + trailing "// note".
   * Lines with no known key (or Avro rows that already carry "doc")
   * get an empty comment cell so the grid stays aligned.
   */
  function _buildAnnotated(code) {
    const ann = window.IcebergViz.JsonAnnotations;
    const lines = String(code).split('\n');
    const wrap = document.createElement('div');
    wrap.className = 'cv-lines';

    lines.forEach((line) => {
      const codeCell = document.createElement('span');
      codeCell.className = 'cv-code';
      codeCell.innerHTML = _highlightJSON(_esc(line)) || '&nbsp;';

      const cmtCell = document.createElement('span');
      cmtCell.className = 'cv-cmt';
      // Avro/self-documenting rows already explain themselves via "doc".
      const note = /"doc"\s*:/.test(line) ? '' : ann.lookup(_lineKey(line));
      if (note) {
        cmtCell.textContent = '// ' + note;
        cmtCell.title = note;   // full text on hover (cell is single-line)
      }

      wrap.appendChild(codeCell);
      wrap.appendChild(cmtCell);
    });

    return wrap;
  }

  /* ── Icon ────────────────────────────────────────────────── */
  function _iconComment() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
    </svg>`;
  }

  function _iconCopy() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
      <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>`;
  }
  function _iconEdit() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>`;
  }
  function _iconCheck() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" width="13" height="13">
      <polyline points="20 6 9 17 4 12"/></svg>`;
  }
  function _iconX() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" width="13" height="13">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
  }
  function _iconReset() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
      <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>`;
  }

  /* ── Edit persistence helpers ────────────────────────────── */
  function _slug(s) {
    return String(s || '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'block';
  }
  function _loadOverride(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function _saveOverride(key, val) {
    try {
      if (val == null) localStorage.removeItem(key);
      else localStorage.setItem(key, val);
    } catch (e) { /* storage unavailable — non-fatal */ }
  }
  function _autosize(ta) {
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight + 2, 640) + 'px';
  }
  // After a save/reset: push to other devices (same mechanism as the
  // interview editor) and nudge the user once if Cloud sync isn't linked.
  let _nudged = false;
  function _afterChange(editKey, overridden) {
    const TV = window.IcebergViz || window.TableViz;
    if (!TV) return;
    const cloud = TV.cloud;
    if (cloud && typeof cloud.onLocalChange === 'function') cloud.onLocalChange();
    if (!TV.toast) return;
    const linked = !!(cloud && cloud.enabled && cloud.enabled());
    if (linked) {
      TV.toast('Saved — syncing to your other devices.', { type: 'success', duration: 2600 });
    } else if (overridden && !_nudged) {
      _nudged = true;
      TV.toast('Turn on Cloud sync to carry this edit to your other devices.',
        { type: 'info', title: 'Saved on this device', duration: 5200 });
    }
  }

  window.IcebergViz = window.IcebergViz || {};
  window.IcebergViz.CodeViewer = CodeViewer;
})();
