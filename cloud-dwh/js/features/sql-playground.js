/* =====================================================================
   SQL Playground — runnable, offline SQL via vendored sql.js (SQLite/WASM)
   ---------------------------------------------------------------------
   - The engine (vendor/sql.js/sql-wasm-inline.js, ~940KB, wasm inlined)
     is NOT in the boot path. It is lazily injected the first time a page
     actually mounts a playground, so pages that never use SQL pay nothing.
   - Each mount gets its own in-memory database, seeded from spec.setup.
   - "Run" executes the learner's SQL; when a reference solution is given,
     the learner's result is diffed (as a row multiset, order-insensitive
     unless spec.ordered) against the solution's result run on the same
     seed, so "expected" always matches the engine.

   Public API:
     CDWH.SqlPlayground.load()  -> Promise<SQL>   (cached)
     CDWH.SqlPlayground.mount(container, spec) -> { destroy() }

   spec = {
     title, intro,                // optional headings
     setup:   'CREATE TABLE ...; INSERT ...;',  // DDL + seed (required)
     task:    'Write a query that ...',         // the prompt
     starter: '-- your SQL here',               // initial editor text
     solution:'SELECT ...',                     // reference query (enables diff)
     ordered: false,              // true = row order is part of correctness
     hint,                        // optional hint text
     note,                        // optional dialect note (e.g. QUALIFY)
   }
   ===================================================================== */
(function () {
  'use strict';
  const viz = (window.CDWH = window.CDWH || {});

  const ENGINE_SRC = 'vendor/sql.js/sql-wasm-inline.js';
  let _loadPromise = null;

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /** Lazily load + initialise sql.js. Resolves to the SQL module object. */
  function load() {
    if (_loadPromise) return _loadPromise;
    _loadPromise = new Promise(function (resolve, reject) {
      function init() {
        if (typeof window.initSqlJs !== 'function') {
          reject(new Error('SQL engine failed to register.'));
          return;
        }
        // Inline build: wasm is embedded, no locateFile needed.
        window.initSqlJs().then(resolve, reject);
      }
      if (typeof window.initSqlJs === 'function') { init(); return; }
      const s = document.createElement('script');
      s.src = ENGINE_SRC;
      s.async = true;
      s.onload = init;
      s.onerror = function () { reject(new Error('Could not download the SQL engine.')); };
      document.head.appendChild(s);
    });
    // Let a later mount retry if the first load failed.
    _loadPromise.catch(function () { _loadPromise = null; });
    return _loadPromise;
  }

  /** Run SQL, return { columns, rows } of the LAST result set (or null). */
  function execLast(db, sql) {
    const res = db.exec(sql); // throws on SQL error
    if (!res || !res.length) return { columns: [], rows: [] };
    const last = res[res.length - 1];
    return { columns: last.columns || [], rows: last.values || [] };
  }

  /** Canonical string form of a result for comparison. */
  function canon(result, ordered) {
    const rows = result.rows.map(function (r) {
      return r.map(function (v) { return v === null ? '␀' : String(v); }).join('␟');
    });
    if (!ordered) rows.sort();
    return rows.join('▒');
  }

  function buildTable(result) {
    if (!result.columns.length && !result.rows.length) {
      return '<p class="sqlp-empty">No rows.</p>';
    }
    let h = '<div class="sqlp-grid-wrap"><table class="sqlp-grid"><thead><tr>';
    result.columns.forEach(function (c) { h += '<th>' + esc(c) + '</th>'; });
    h += '</tr></thead><tbody>';
    result.rows.forEach(function (row) {
      h += '<tr>';
      row.forEach(function (v) {
        h += '<td' + (v === null ? ' class="sqlp-null"' : '') + '>' +
          (v === null ? 'NULL' : esc(v)) + '</td>';
      });
      h += '</tr>';
    });
    h += '</tbody></table></div>';
    if (result.rows.length) {
      h += '<p class="sqlp-rowcount">' + result.rows.length +
        ' row' + (result.rows.length === 1 ? '' : 's') + '</p>';
    }
    return h;
  }

  /**
   * Mount a playground into `container`. Returns an instance with destroy().
   */
  function mount(container, spec) {
    spec = spec || {};
    let db = null;          // persistent db, used only for the schema panel
    let SQLmod = null;      // the initialised sql.js module (closure-scoped)
    let destroyed = false;

    const wrap = document.createElement('div');
    wrap.className = 'sqlp';
    wrap.innerHTML =
      (spec.title ? '<h3 class="sqlp-title">' + esc(spec.title) + '</h3>' : '') +
      (spec.intro ? '<p class="sqlp-intro">' + esc(spec.intro) + '</p>' : '') +
      (spec.task ? '<div class="sqlp-task"><span class="sqlp-task-label">Task</span> ' +
        esc(spec.task) + '</div>' : '') +
      '<div class="sqlp-schema" data-schema></div>' +
      '<label class="sqlp-editor-label" for="sqlp-ta-' + rid() + '">Your SQL</label>' +
      '<textarea class="sqlp-editor" spellcheck="false" data-noswipe ' +
      'autocapitalize="off" autocomplete="off"></textarea>' +
      '<div class="sqlp-controls">' +
      '  <button type="button" class="sqlp-btn sqlp-run" data-run>▶ Run</button>' +
      '  <button type="button" class="sqlp-btn sqlp-reset" data-reset>↺ Reset</button>' +
      (spec.hint ? '  <button type="button" class="sqlp-btn sqlp-ghost" data-hint>💡 Hint</button>' : '') +
      (spec.solution ? '  <button type="button" class="sqlp-btn sqlp-ghost" data-sol>👁 Solution</button>' : '') +
      '</div>' +
      (spec.hint ? '<div class="sqlp-hint" hidden>' + esc(spec.hint) + '</div>' : '') +
      (spec.note ? '<p class="sqlp-note">ℹ️ ' + esc(spec.note) + '</p>' : '') +
      '<div class="sqlp-status" data-status aria-live="polite"></div>' +
      '<div class="sqlp-result" data-result></div>';
    container.appendChild(wrap);

    const ta = wrap.querySelector('.sqlp-editor');
    const statusEl = wrap.querySelector('[data-status]');
    const resultEl = wrap.querySelector('[data-result]');
    const schemaEl = wrap.querySelector('[data-schema]');
    const starter = spec.starter != null ? spec.starter : '';
    ta.value = starter;

    // Tab inserts two spaces instead of leaving the field.
    ta.addEventListener('keydown', function (e) {
      if (e.key === 'Tab') {
        e.preventDefault();
        const s = ta.selectionStart, en = ta.selectionEnd;
        ta.value = ta.value.slice(0, s) + '  ' + ta.value.slice(en);
        ta.selectionStart = ta.selectionEnd = s + 2;
      }
      // Ctrl/Cmd+Enter runs.
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); run(); }
    });

    function setStatus(kind, msg) {
      statusEl.className = 'sqlp-status sqlp-status-' + kind;
      statusEl.innerHTML = msg;
    }

    // A freshly-seeded, isolated database. Caller must close() it.
    function freshDb() {
      const d = new SQLmod.Database();
      if (spec.setup) d.run(spec.setup);
      return d;
    }

    function seedDb(SQL) {
      SQLmod = SQL;
      if (db) { try { db.close(); } catch (_) {} }
      db = new SQL.Database();
      if (spec.setup) db.run(spec.setup);
      renderSchema();
    }

    function renderSchema() {
      if (!db) return;
      try {
        const tbls = execLast(db,
          "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;");
        if (!tbls.rows.length) { schemaEl.innerHTML = ''; return; }
        let h = '<div class="sqlp-schema-head">Tables</div><div class="sqlp-schema-list">';
        tbls.rows.forEach(function (r) {
          const name = r[0];
          const cols = db.exec('PRAGMA table_info(' + name + ');');
          const colNames = (cols[0] ? cols[0].values : []).map(function (c) {
            return esc(c[1]) + '<span class="sqlp-col-type">' + esc(c[2]) + '</span>';
          }).join(', ');
          h += '<div class="sqlp-tbl"><code class="sqlp-tbl-name">' + esc(name) +
            '</code> <span class="sqlp-cols">(' + colNames + ')</span></div>';
        });
        h += '</div>';
        schemaEl.innerHTML = h;
      } catch (_) { schemaEl.innerHTML = ''; }
    }

    function run() {
      if (!SQLmod) { setStatus('err', 'Engine not ready yet…'); return; }
      const sql = ta.value.trim();
      if (!sql) { setStatus('err', 'Write a query first.'); resultEl.innerHTML = ''; return; }

      // Run the learner's SQL on its own fresh, isolated database so any DML
      // can't affect the reference run or the schema panel.
      let userRes, udb = null;
      try {
        udb = freshDb();
        userRes = execLast(udb, sql);
      } catch (err) {
        setStatus('err', '❌ SQL error: ' + esc(err.message));
        resultEl.innerHTML = '';
        if (udb) try { udb.close(); } catch (_) {}
        return;
      } finally {
        if (udb) try { udb.close(); } catch (_) {}
      }
      resultEl.innerHTML = buildTable(userRes);

      if (!spec.solution) { setStatus('ok', '✅ Query ran.'); return; }

      // Diff against the reference solution, run on a separate fresh seed.
      let solRes = null, sdb = null;
      try {
        sdb = freshDb();
        solRes = execLast(sdb, spec.solution);
      } catch (e) {
        setStatus('ok', '✅ Query ran. (Could not evaluate the reference answer.)');
        if (sdb) try { sdb.close(); } catch (_) {}
        return;
      } finally {
        if (sdb) try { sdb.close(); } catch (_) {}
      }
      const ok = canon(userRes, spec.ordered) === canon(solRes, spec.ordered);
      if (ok) {
        setStatus('pass', '✅ Correct — your result matches the expected output' +
          (spec.ordered ? ' (row order checked).' : '.'));
      } else {
        setStatus('fail', '⚠️ Runs, but the result doesn\'t match the expected output yet. ' +
          'Expected ' + solRes.rows.length + ' row' + (solRes.rows.length === 1 ? '' : 's') +
          ', got ' + userRes.rows.length + '.' +
          (spec.ordered ? '' : ' (Row order is ignored.)'));
      }
    }

    function wireButtons() {
      wrap.querySelector('[data-run]').addEventListener('click', run);
      wrap.querySelector('[data-reset]').addEventListener('click', function () {
        ta.value = starter;
        resultEl.innerHTML = '';
        setStatus('', '');
        ta.focus();
      });
      const hintBtn = wrap.querySelector('[data-hint]');
      if (hintBtn) hintBtn.addEventListener('click', function () {
        const h = wrap.querySelector('.sqlp-hint');
        h.hidden = !h.hidden;
      });
      const solBtn = wrap.querySelector('[data-sol]');
      if (solBtn) solBtn.addEventListener('click', function () {
        ta.value = spec.solution;
        ta.focus();
        setStatus('', 'Reference solution loaded into the editor — press Run.');
      });
    }

    // Load engine, seed, enable.
    setStatus('', '<span class="sqlp-loading">⏳ Loading SQL engine…</span>');
    ta.disabled = true;
    load().then(function (SQL) {
      if (destroyed) return;
      seedDb(SQL);
      ta.disabled = false;
      wireButtons();
      setStatus('', 'Engine ready. Write SQL and press <kbd>Run</kbd> (or Ctrl/⌘+Enter).');
    }).catch(function (err) {
      if (destroyed) return;
      ta.disabled = false;
      wireButtons();
      setStatus('err', '❌ ' + esc(err.message) +
        ' The SQL runner is unavailable, but you can still read the task and solution.');
    });

    return {
      destroy: function () {
        destroyed = true;
        if (db) { try { db.close(); } catch (_) {} db = null; }
      },
    };
  }

  let _ridN = 0;
  function rid() { return (++_ridN); }

  viz.SqlPlayground = { load: load, mount: mount };
})();
