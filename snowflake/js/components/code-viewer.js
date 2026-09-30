/* ============================================================
   Code Viewer — syntax-highlighted code blocks
   Supports JSON, SQL (Snowflake dialect), Python, shell
   ============================================================ */

(function () {
  'use strict';

  const CodeViewer = {
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

  window.SnowflakeViz = window.SnowflakeViz || {};
  window.SnowflakeViz.CodeViewer = CodeViewer;
})();
