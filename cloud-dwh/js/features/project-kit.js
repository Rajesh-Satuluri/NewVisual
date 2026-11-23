/* =====================================================================
   ProjectKit — spec-driven renderer for end-to-end project modules
   ---------------------------------------------------------------------
   One guided project = diagram → downloadable sample data → SQL in the
   CodeViewer → live expected-output tables → injected-bug debugging →
   discussion Q&A. All six sections are composed from existing components
   (CodeViewer, SqlPlayground, ScenarioEngine, QAAccordion) so each new
   project is almost entirely content.

   SINGLE SOURCE OF TRUTH FOR DATA
   -------------------------------
   `spec.datasets[*]` defines columns + rows ONCE. From that one definition
   ProjectKit derives (a) the on-screen preview table, (b) the downloadable
   CSV, and (c) the SQLite seed (CREATE TABLE + INSERT) fed to every runnable
   step and every "Expected output" panel. The file you download, the data
   you query, and the data behind the expected answers therefore cannot drift.

   Public API:
     CDWH.ProjectKit.render(canvas, spec) -> { destroy() }

   spec = {
     id, eyebrow, title, lead,
     meta:   { role, difficulty, duration, skills:[...] },
     goals:  [ 'string', ... ],                 // "what you'll build" bullets
     diagram:{ caption, svg:'<svg>…</svg>' },    // theme-aware inline SVG
     datasets:[ {
        name:'stg_orders', filename:'orders.csv', caption:'…',
        columns:[ {name:'order_id', type:'INTEGER'}, … ],   // type = SQLite affinity
        rows:[ [101, …], … ],
     }, … ],
     seedNote,                                   // optional note above datasets
     build:[ {
        title, explain,                          // step heading + prose (HTML ok in explain via `html:true`)
        lang:'sql', code:'…',                    // shown in CodeViewer (authentic dialect)
        dialectNote,                             // optional "Snowflake idiom vs runnable" note
        run:{ task, starter, solution, ordered, hint, note },  // optional → runnable + expected panel
     }, … ],
     debug:[
        { kind:'fix',  title, brief, spec:{ task, starter, solution, ordered, hint, note }, lesson },
        { kind:'investigate', scenario:{ …ScenarioEngine.investigation shape… } },
     ],
     qa:[ { q, a, difficulty }, … ],
   }
   ===================================================================== */
(function () {
  'use strict';
  const viz = (window.CDWH = window.CDWH || {});

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  /* ── Data derivation: datasets are the single source of truth ───────── */

  function sqlLit(val, type) {
    if (val === null || val === undefined) return 'NULL';
    if (type === 'INTEGER' || type === 'REAL') return String(val);
    return "'" + String(val).replace(/'/g, "''") + "'";
  }

  /** CREATE TABLE + INSERT for every dataset — the SQLite seed. */
  function buildSeed(datasets) {
    const parts = [];
    datasets.forEach(function (ds) {
      const cols = ds.columns.map(function (c) { return c.name + ' ' + (c.type || 'TEXT'); }).join(', ');
      parts.push('CREATE TABLE ' + ds.name + ' (' + cols + ');');
      if (ds.rows && ds.rows.length) {
        const values = ds.rows.map(function (row) {
          return '(' + row.map(function (v, i) {
            return sqlLit(v, ds.columns[i] && ds.columns[i].type);
          }).join(', ') + ')';
        }).join(',\n  ');
        parts.push('INSERT INTO ' + ds.name + ' VALUES\n  ' + values + ';');
      }
    });
    return parts.join('\n');
  }

  /** RFC-4180-ish CSV for one dataset. */
  function buildCsv(ds) {
    const needsQuote = function (s) { return /[",\n\r]/.test(s); };
    const cell = function (v) {
      if (v === null || v === undefined) return '';
      const s = String(v);
      return needsQuote(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const lines = [ds.columns.map(function (c) { return cell(c.name); }).join(',')];
    (ds.rows || []).forEach(function (row) {
      lines.push(row.map(cell).join(','));
    });
    return lines.join('\r\n');
  }

  function downloadText(filename, text, mime) {
    try {
      const blob = new Blob([text], { type: (mime || 'text/plain') + ';charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
    } catch (_) { /* download unsupported — preview table is still shown */ }
  }

  /** A compact preview table (first `limit` rows) for a dataset. */
  function previewTable(ds, limit) {
    limit = limit || 6;
    let h = '<div class="pk-grid-wrap"><table class="pk-grid"><thead><tr>';
    ds.columns.forEach(function (c) {
      h += '<th>' + esc(c.name) + '<span class="pk-col-type">' + esc(c.type || 'TEXT') + '</span></th>';
    });
    h += '</tr></thead><tbody>';
    (ds.rows || []).slice(0, limit).forEach(function (row) {
      h += '<tr>' + row.map(function (v) {
        return '<td' + (v === null ? ' class="pk-null"' : '') + '>' +
          (v === null ? 'NULL' : esc(v)) + '</td>';
      }).join('') + '</tr>';
    });
    h += '</tbody></table></div>';
    const n = (ds.rows || []).length;
    if (n > limit) h += '<p class="pk-more">… ' + (n - limit) + ' more row' + (n - limit === 1 ? '' : 's') + ' in the file</p>';
    else h += '<p class="pk-more">' + n + ' row' + (n === 1 ? '' : 's') + '</p>';
    return h;
  }

  /* ── Result grid (shared with the expected-output panels) ───────────── */
  function resultGrid(result) {
    if (!result || (!result.columns.length && !result.rows.length)) {
      return '<p class="pk-empty">No rows.</p>';
    }
    let h = '<div class="pk-grid-wrap"><table class="pk-grid"><thead><tr>';
    result.columns.forEach(function (c) { h += '<th>' + esc(c) + '</th>'; });
    h += '</tr></thead><tbody>';
    result.rows.forEach(function (row) {
      h += '<tr>' + row.map(function (v) {
        return '<td' + (v === null ? ' class="pk-null"' : '') + '>' +
          (v === null ? 'NULL' : esc(v)) + '</td>';
      }).join('') + '</tr>';
    });
    h += '</tbody></table></div><p class="pk-more">' + result.rows.length +
      ' row' + (result.rows.length === 1 ? '' : 's') + '</p>';
    return h;
  }

  /** Run `sql` against a fresh seed and return {columns, rows}. */
  function runExpected(SQL, seed, sql) {
    const db = new SQL.Database();
    try {
      if (seed) db.run(seed);
      const res = db.exec(sql);
      if (!res || !res.length) return { columns: [], rows: [] };
      const last = res[res.length - 1];
      return { columns: last.columns || [], rows: last.values || [] };
    } finally {
      try { db.close(); } catch (_) {}
    }
  }

  /* ── Section renderers ──────────────────────────────────────────────── */

  function renderHeader(root, spec) {
    const head = el('div', 'pk-head');
    head.innerHTML =
      (spec.eyebrow ? '<div class="mod-eyebrow">' + esc(spec.eyebrow) + '</div>' : '') +
      '<h1 class="mod-title">' + esc(spec.title) + '</h1>' +
      (spec.lead ? '<p class="mod-subtitle">' + spec.lead + '</p>' : '');
    if (spec.meta) {
      const m = spec.meta;
      let chips = '';
      if (m.role)       chips += '<span class="pk-chip">👤 ' + esc(m.role) + '</span>';
      if (m.difficulty) chips += '<span class="pk-chip">🎚️ ' + esc(m.difficulty) + '</span>';
      if (m.duration)   chips += '<span class="pk-chip">⏱️ ' + esc(m.duration) + '</span>';
      (m.skills || []).forEach(function (s) { chips += '<span class="pk-chip pk-chip-skill">' + esc(s) + '</span>'; });
      head.appendChild(el('div', 'pk-chips', chips));
    }
    if (spec.goals && spec.goals.length) {
      head.appendChild(el('div', 'pk-goals',
        '<div class="pk-goals-h">What you\'ll build</div><ul>' +
        spec.goals.map(function (g) { return '<li>' + g + '</li>'; }).join('') + '</ul>'));
    }
    root.appendChild(head);
  }

  function sectionTitle(n, text, sub) {
    return '<div class="pk-section-head"><span class="pk-section-n">' + n + '</span>' +
      '<div><h2 class="pk-section-title">' + esc(text) + '</h2>' +
      (sub ? '<p class="pk-section-sub">' + sub + '</p>' : '') + '</div></div>';
  }

  function renderDiagram(root, spec) {
    if (!spec.diagram) return;
    const sec = el('section', 'pk-section pk-diagram-sec');
    sec.innerHTML = sectionTitle('1', 'Architecture', spec.diagram.caption || '');
    const fig = el('div', 'pk-diagram');
    fig.innerHTML = spec.diagram.svg || '';
    sec.appendChild(fig);
    root.appendChild(sec);
  }

  function renderDatasets(root, spec) {
    if (!spec.datasets || !spec.datasets.length) return;
    const sec = el('section', 'pk-section');
    sec.innerHTML = sectionTitle('2', 'Sample data',
      spec.seedNote || 'Download the raw files to follow along in your own Snowflake account, or just read the previews — the same rows seed the runnable steps below.');

    // Download-all convenience.
    const bar = el('div', 'pk-data-actions');
    const allBtn = el('button', 'pk-btn pk-btn-primary', '⬇ Download all CSVs');
    allBtn.type = 'button';
    allBtn.addEventListener('click', function () {
      spec.datasets.forEach(function (ds, i) {
        setTimeout(function () { downloadText(ds.filename, buildCsv(ds), 'text/csv'); }, i * 250);
      });
    });
    bar.appendChild(allBtn);
    sec.appendChild(bar);

    spec.datasets.forEach(function (ds) {
      const card = el('div', 'pk-dataset');
      const head = el('div', 'pk-dataset-head');
      head.innerHTML = '<code class="pk-dataset-name">' + esc(ds.filename) +
        '</code>' + (ds.caption ? '<span class="pk-dataset-cap">' + esc(ds.caption) + '</span>' : '');
      const dl = el('button', 'pk-btn pk-btn-sm', '⬇ CSV');
      dl.type = 'button';
      dl.addEventListener('click', function () { downloadText(ds.filename, buildCsv(ds), 'text/csv'); });
      head.appendChild(dl);
      card.appendChild(head);
      card.appendChild(el('div', 'pk-dataset-body', previewTable(ds)));
      sec.appendChild(card);
    });
    root.appendChild(sec);
  }

  function renderBuild(root, spec, ctx) {
    if (!spec.build || !spec.build.length) return;
    const sec = el('section', 'pk-section');
    sec.innerHTML = sectionTitle('3', 'Build it, step by step',
      'Authentic Snowflake SQL for each stage. Steps marked <span class="pk-run-tag">▶ runnable</span> execute in your browser and check your result against the expected output.');

    spec.build.forEach(function (step, i) {
      const card = el('div', 'pk-step');
      const runnable = !!step.run;
      card.innerHTML =
        '<div class="pk-step-head"><span class="pk-step-n">Step ' + (i + 1) + '</span>' +
        '<h3 class="pk-step-title">' + esc(step.title) + '</h3>' +
        (runnable ? '<span class="pk-run-tag">▶ runnable</span>' : '<span class="pk-ddl-tag">Snowflake DDL/DML</span>') +
        '</div>';
      if (step.explain) {
        card.appendChild(el('div', 'pk-step-explain', step.html ? step.explain : '<p>' + esc(step.explain) + '</p>'));
      }
      if (step.code && viz.CodeViewer) {
        card.appendChild(viz.CodeViewer.create(step.code, step.lang || 'sql',
          step.codeTitle || 'Snowflake SQL', { editable: false }));
      }
      if (step.dialectNote) {
        card.appendChild(el('p', 'pk-dialect-note', 'ℹ️ ' + step.dialectNote));
      }

      if (runnable && viz.SqlPlayground) {
        const host = el('div', 'pk-step-run');
        card.appendChild(host);
        const spc = Object.assign({ setup: ctx.seed }, step.run);
        const inst = viz.SqlPlayground.mount(host, spc);
        if (inst) ctx.instances.push(inst);

        // Live, guaranteed-correct expected-output panel.
        if (step.run.solution) {
          const det = el('details', 'pk-expected');
          det.innerHTML = '<summary>Show expected output</summary>' +
            '<div class="pk-expected-body" data-exp>Loading…</div>';
          card.appendChild(det);
          let filled = false;
          det.addEventListener('toggle', function () {
            if (!det.open || filled) return;
            filled = true;
            const body = det.querySelector('[data-exp]');
            viz.SqlPlayground.load().then(function (SQL) {
              try {
                body.innerHTML = resultGrid(runExpected(SQL, ctx.seed, step.run.solution));
              } catch (e) {
                body.innerHTML = '<p class="pk-empty">Could not compute: ' + esc(e.message) + '</p>';
              }
            }, function () { body.innerHTML = '<p class="pk-empty">SQL engine unavailable.</p>'; });
          });
        }
      }
      sec.appendChild(card);
    });
    root.appendChild(sec);
  }

  function renderDebug(root, spec, ctx) {
    if (!spec.debug || !spec.debug.length) return;
    const sec = el('section', 'pk-section');
    sec.innerHTML = sectionTitle('4', 'Debug the pipeline',
      'Every item here is a bug that shows up in real builds — and a favourite interviewer trap. Diagnose it, then fix it.');

    spec.debug.forEach(function (d, i) {
      const card = el('div', 'pk-debug');
      if (d.kind === 'investigate' && viz.ScenarioEngine && d.scenario) {
        card.innerHTML = '<div class="pk-debug-head"><span class="pk-debug-n">Bug ' + (i + 1) + '</span>' +
          '<h3 class="pk-debug-title">' + esc(d.title || d.scenario.title || 'Investigate') + '</h3>' +
          '<span class="pk-debug-kind">🔎 diagnose</span></div>';
        const host = el('div', 'pk-debug-body');
        card.appendChild(host);
        viz.ScenarioEngine.investigation(host, d.scenario);
      } else if (d.kind === 'fix' && viz.SqlPlayground && d.spec) {
        card.innerHTML = '<div class="pk-debug-head"><span class="pk-debug-n">Bug ' + (i + 1) + '</span>' +
          '<h3 class="pk-debug-title">' + esc(d.title) + '</h3>' +
          '<span class="pk-debug-kind pk-debug-fix">🛠️ fix the query</span></div>' +
          (d.brief ? '<div class="pk-debug-brief">' + (d.html ? d.brief : '<p>' + esc(d.brief) + '</p>') + '</div>' : '');
        const host = el('div', 'pk-debug-body');
        card.appendChild(host);
        const spc = Object.assign({ setup: ctx.seed }, d.spec);
        const inst = viz.SqlPlayground.mount(host, spc);
        if (inst) ctx.instances.push(inst);
        if (d.lesson) {
          const det = el('details', 'pk-lesson');
          det.innerHTML = '<summary>Why this happens &amp; how to say it in an interview</summary>' +
            '<div class="pk-lesson-body">' + (d.html ? d.lesson : '<p>' + esc(d.lesson) + '</p>') + '</div>';
          card.appendChild(det);
        }
      }
      sec.appendChild(card);
    });
    root.appendChild(sec);
  }

  function renderQA(root, spec) {
    if (!spec.qa || !spec.qa.length || !viz.QAAccordion) return;
    const sec = el('section', 'pk-section');
    sec.innerHTML = sectionTitle('5', 'Interview discussion',
      'The questions an interviewer actually asks about a project like this. Say your answer out loud first, then open each one.');
    sec.appendChild(viz.QAAccordion.create(spec.qa, {
      editPrefix: 'pk-' + (spec.id || 'project'),
    }));
    root.appendChild(sec);
  }

  /* ── Entry point ────────────────────────────────────────────────────── */
  function render(canvas, spec) {
    const ctx = { seed: buildSeed(spec.datasets || []), instances: [] };
    const root = el('div', 'pk-page');
    canvas.appendChild(root);

    renderHeader(root, spec);
    renderDiagram(root, spec);
    renderDatasets(root, spec);
    renderBuild(root, spec, ctx);
    renderDebug(root, spec, ctx);
    renderQA(root, spec);

    return {
      destroy: function () {
        ctx.instances.forEach(function (i) { try { i && i.destroy && i.destroy(); } catch (_) {} });
        ctx.instances.length = 0;
      },
    };
  }

  viz.ProjectKit = { render: render, buildSeed: buildSeed, buildCsv: buildCsv };
})();
