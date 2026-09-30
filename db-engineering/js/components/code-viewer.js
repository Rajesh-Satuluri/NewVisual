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
    create(code, lang, title) {
      const wrapper = document.createElement('div');
      wrapper.className = 'code-block';

      const header = document.createElement('div');
      header.className = 'code-block-header';

      const langEl = document.createElement('span');
      langEl.className = 'code-block-lang';
      langEl.textContent = title || lang.toUpperCase();

      const copyBtn = document.createElement('button');
      copyBtn.className = 'code-block-copy btn-icon';
      copyBtn.innerHTML = _iconCopy() + '<span>Copy</span>';
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(code).then(() => {
          copyBtn.classList.add('copied');
          copyBtn.querySelector('span').textContent = 'Copied!';
          setTimeout(() => {
            copyBtn.classList.remove('copied');
            copyBtn.querySelector('span').textContent = 'Copy';
          }, 2000);
        });
      });

      header.appendChild(langEl);
      header.appendChild(copyBtn);

      const body = document.createElement('div');
      body.className = 'code-block-body';

      const pre = document.createElement('pre');
      pre.innerHTML = this.highlight(code, lang);
      body.appendChild(pre);

      wrapper.appendChild(header);
      wrapper.appendChild(body);
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
        if (/^"/. test(match)) {
          if (/:$/.test(match)) {
            return '<span class="tok-key">' + match + '</span>';
          }
          if (/s3:\/\//.test(match)) {
            return '<span class="tok-path">' + match + '</span>';
          }
          return '<span class="tok-str">' + match + '</span>';
        }
        if (/true|false/.test(match)) return '<span class="tok-bool">' + match + '</span>';
        if (/null/.test(match))        return '<span class="tok-null">' + match + '</span>';
        return '<span class="tok-num">' + match + '</span>';
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
    let result = code.replace(/--(.*?)(?=\n|$)/g, (m) => '<span class="tok-cmt">' + m + '</span>');
    // Strings
    result = result.replace(/&#39;([^&#39;]*)&#39;/g, (m) => '<span class="tok-str">' + m + '</span>');
    result = result.replace(/&quot;([^&quot;]*)&quot;/g, (m) => '<span class="tok-str">' + m + '</span>');
    // Keywords
    SQL_KEYWORDS.forEach(kw => {
      const re = new RegExp('\\b(' + kw + ')\\b', 'gi');
      result = result.replace(re, '<span class="tok-kw">$1</span>');
    });
    // Numbers
    result = result.replace(/\b(\d+)\b/g, '<span class="tok-num">$1</span>');
    // S3 paths
    result = result.replace(/(s3:\/\/[^\s&<'"]+)/g, '<span class="tok-path">$1</span>');
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
    result = result.replace(/#(.*?)(?=\n|$)/g, (m) => '<span class="tok-cmt">' + m + '</span>');
    // Strings (triple quotes)
    result = result.replace(/(&#39;&#39;&#39;[\s\S]*?&#39;&#39;&#39;|&quot;&quot;&quot;[\s\S]*?&quot;&quot;&quot;)/g,
      (m) => '<span class="tok-str">' + m + '</span>');
    // Single-line strings
    result = result.replace(/(&#39;[^&#39;\n]*&#39;|&quot;[^&quot;\n]*&quot;)/g,
      (m) => '<span class="tok-str">' + m + '</span>');
    // Keywords
    PY_KEYWORDS.forEach(kw => {
      const re = new RegExp('\\b(' + kw + ')\\b', 'g');
      result = result.replace(re, '<span class="tok-kw">$1</span>');
    });
    // Function calls (identifier followed by '(')
    result = result.replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\s*(?=\()/g,
      '<span class="tok-fn">$1</span>');
    // Numbers
    result = result.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="tok-num">$1</span>');
    // S3 paths
    result = result.replace(/(s3:\/\/[^\s&<'"]+)/g, '<span class="tok-path">$1</span>');
    return result;
  }

  /* ── Icon ────────────────────────────────────────────────── */
  function _iconCopy() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
  }

  window.IcebergViz = window.IcebergViz || {};
  window.IcebergViz.CodeViewer = CodeViewer;
})();
