/* ============================================================
   Data Loading — End-to-End Snowflake Ingestion Simulator (P0-A)

   An interactive, clickable 14-stage lifecycle. Pick one of five
   pipeline patterns (COPY INTO batch, Snowpipe auto-ingest, Snowpipe
   Streaming, Kafka connector, Postgres+Debezium CDC); step through
   the stages with the player controls or click any stage to inspect
   what physically happens, the SQL/config, state changes, failure
   modes and troubleshooting. Metrics are derived deterministically
   from the pattern + cursor (loadingSim.deriveMetrics) and are
   clearly labelled as illustrative. Nothing runs against a live
   account.
   ============================================================ */
(function () {
  'use strict';

  const AE  = () => window.CDWH.AnimationEngine;
  const CV  = () => window.CDWH.CodeViewer;
  const SIM = () => window.CDWH.P.snowflake.loadingSim;
  const SPEC = () => window.CDWH.P.snowflake.ingestPipelines;

  const ROLE_LABEL = { upstream: 'Upstream (outside Snowflake)', snowflake: 'Snowflake ingest', table: 'Table / transform', ops: 'Operations' };

  const Module = {
    render(canvas) {
      canvas.innerHTML = '';
      const spec = SPEC();
      if (!spec) { canvas.innerHTML = '<div class="placeholder-msg"><p>Pipeline spec not loaded.</p></div>'; return {}; }

      const state = { pattern: spec.patterns[0], activeIds: [], engine: null, selected: null,
                      whatif: { badRows: false, policy: 'continue', rerun: 'none' } };

      const page = _el('div', 'dl2-page');
      page.innerHTML = `
        <div class="mod-header">
          <div class="mod-eyebrow">Query &amp; Data</div>
          <h1 class="mod-title">End-to-End Ingestion Simulator</h1>
          <p class="mod-subtitle">Follow data from a source system all the way to a curated, reconciled Snowflake table. Pick a pipeline pattern, then step through — or click — any of the 14 lifecycle stages.</p>
        </div>`;
      canvas.appendChild(page);

      /* Pattern selector */
      const selWrap = _el('div', 'dl2-patterns');
      spec.patterns.forEach(p => {
        const b = _el('button', 'dl2-pattern');
        b.type = 'button';
        b.dataset.pattern = p.id;
        b.style.setProperty('--p-accent', p.accent);
        b.innerHTML = `<span class="dl2-pattern-label">${p.label}</span><span class="dl2-pattern-sub">${p.tagline}</span>`;
        b.addEventListener('click', () => selectPattern(p.id));
        selWrap.appendChild(b);
      });
      page.appendChild(selWrap);

      const layout = _el('div', 'dl2-layout');
      const left = _el('div', 'dl2-left');
      const right = _el('div', 'dl2-right');
      layout.append(left, right);
      page.appendChild(layout);

      /* Pipeline canvas (all 14 stages; skipped ones greyed) */
      left.appendChild(_sectionTitle('Lifecycle — click a stage'));
      const pipe = _el('div', 'dl2-pipe'); pipe.id = 'dl2-pipe';
      left.appendChild(pipe);

      /* Status + metrics */
      const status = _el('div', 'dl2-status'); status.id = 'dl2-status';
      status.innerHTML = `<span class="dl2-dot" id="dl2-dot"></span><span id="dl2-stext">Idle</span>`;
      left.appendChild(status);

      left.appendChild(_sectionTitle('Pipeline metrics (illustrative)'));
      const metrics = _el('div', 'dl2-metrics'); metrics.id = 'dl2-metrics';
      metrics.innerHTML = [
        ['files-disc', 'Files discovered'], ['files-load', 'Files loaded'],
        ['rows-parse', 'Rows parsed'], ['rows-ins', 'Rows inserted'],
        ['rows-rej', 'Rows rejected'], ['backlog', 'Backlog'],
        ['dur', 'Elapsed (sim)'], ['stat', 'Status'],
      ].map(([k, l]) => `<div class="dl2-metric"><div class="dl2-metric-val" id="m-${k}">—</div><div class="dl2-metric-lbl">${l}</div></div>`).join('');
      left.appendChild(metrics);

      const note = _el('div', 'dl2-note');
      note.innerHTML = '⚠️ <strong>Simulation.</strong> Figures are illustrative teaching values derived from the selected pattern — not guaranteed Snowflake throughput, latency or credit figures. No SQL runs against a live account.';
      left.appendChild(note);

      const distinction = _el('div', 'dl2-distinction'); distinction.id = 'dl2-distinction';
      left.appendChild(distinction);

      /* Right: detail panel */
      const detail = _el('div', 'dl2-detail'); detail.id = 'dl2-detail';
      right.appendChild(detail);

      /* What-if lab (full width, below the two columns) */
      const whatif = _el('section', 'dl2-whatif'); whatif.id = 'dl2-whatif';
      page.appendChild(whatif);

      const ctx = { canvas, state };

      function selectPattern(id) {
        state.pattern = spec.byId(id);
        state.activeIds = spec.stages.filter(s => !(state.pattern.skip || []).includes(s.id)).map(s => s.id);
        // highlight selector
        selWrap.querySelectorAll('.dl2-pattern').forEach(b => b.classList.toggle('active', b.dataset.pattern === id));
        document.documentElement.style.setProperty('--dl2-accent', state.pattern.accent);
        buildPipe();
        rebuildEngine();
        renderIdle();
        distinction.innerHTML = `<div class="dl2-distinction-tag">🔑 What makes this pattern different</div><p>${state.pattern.distinction}</p>`;
        showOverview();
        renderWhatIf();
      }

      /* ── What-if lab: predict how the load reacts to failures & replays ── */
      function renderWhatIf() {
        const p = state.pattern, wi = state.whatif, fileBased = !!p.fileBased;
        const policies = fileBased
          ? [['continue', "ON_ERROR = CONTINUE"], ['skip_file', "SKIP_FILE"], ['abort', "ABORT_STATEMENT"]]
          : [['continue', 'Dead-letter bad rows'], ['abort', 'Fail the pipeline']];
        // keep policy valid for this pattern
        if (!policies.some(x => x[0] === wi.policy)) wi.policy = 'continue';
        const reruns = [['none', 'No re-run'], ['replay', 'Replay same data'], ['force', fileBased ? 'Replay + FORCE' : 'Replay (FORCE n/a)']];

        const seg = (name, opts, cur, disabled) => opts.map(([v, l]) =>
          `<button type="button" class="dl2-seg${v === cur ? ' active' : ''}" data-seg="${name}" data-val="${v}"${disabled ? ' disabled' : ''}>${l}</button>`).join('');

        whatif.innerHTML =
          `<div class="dl2-whatif-head">
             <div class="dl2-section-title" style="margin:0">🧪 What-if lab — predict the outcome</div>
             <p class="dl2-whatif-sub">Flip a switch, predict what the load does, then read the result. All figures illustrative for <b>${_esc(p.label)}</b>.</p>
           </div>
           <div class="dl2-whatif-controls">
             <label class="dl2-switch">
               <input type="checkbox" id="wi-bad"${wi.badRows ? ' checked' : ''}>
               <span>Inject 3 malformed rows</span>
             </label>
             <div class="dl2-ctrl${wi.badRows ? '' : ' dimmed'}">
               <span class="dl2-ctrl-lbl">On a bad row:</span>
               <div class="dl2-seg-group">${seg('policy', policies, wi.policy, !wi.badRows)}</div>
             </div>
             <div class="dl2-ctrl">
               <span class="dl2-ctrl-lbl">Then re-deliver:</span>
               <div class="dl2-seg-group">${seg('rerun', reruns, wi.rerun, false)}</div>
             </div>
           </div>
           <div id="dl2-whatif-out"></div>`;

        whatif.querySelector('#wi-bad').addEventListener('change', (e) => { wi.badRows = e.target.checked; renderWhatIf(); });
        whatif.querySelectorAll('.dl2-seg').forEach(b => b.addEventListener('click', () => {
          if (b.disabled) return;
          wi[b.dataset.seg] = b.dataset.val; renderWhatIf();
        }));

        const r = computeWhatIf(p, wi);
        const kind = { ok: 'ok', partial: 'warn', abort: 'bad', dup: 'bad' }[r.statusKind] || 'ok';
        const stat = (v, l) => `<div class="dl2-metric"><div class="dl2-metric-val">${v}</div><div class="dl2-metric-lbl">${l}</div></div>`;
        whatif.querySelector('#dl2-whatif-out').innerHTML =
          `<div class="dl2-outcome dl2-outcome-${kind}">
             <div class="dl2-outcome-title">${_esc(r.title)}</div>
             <div class="dl2-outcome-metrics">
               ${fileBased ? stat(_fmt(r.filesLoaded) + ' / ' + _fmt(p.totals.files), 'Files loaded') : ''}
               ${stat(_fmt(r.inserted), 'Rows inserted')}
               ${stat(_fmt(r.rejected), 'Rows rejected')}
               ${stat(_fmt(r.dup), 'Duplicates')}
             </div>
             <p class="dl2-outcome-explain">${_esc(r.explain)}</p>
             <code class="dl2-outcome-config">${_esc(r.config)}</code>
           </div>`;
      }

      function buildPipe() {
        pipe.innerHTML = '';
        let lastGroup = null;
        spec.stages.forEach((s, i) => {
          if (s.group !== lastGroup) {
            const g = _el('div', 'dl2-group-label'); g.textContent = s.group; pipe.appendChild(g); lastGroup = s.group;
          }
          const used = !(state.pattern.skip || []).includes(s.id);
          const node = _el('button', 'dl2-node' + (used ? '' : ' dl2-skip'));
          node.type = 'button';
          node.dataset.stage = s.id;
          node.id = 'dl2-node-' + s.id;
          node.innerHTML = `<span class="dl2-node-icon">${s.icon}</span><span class="dl2-node-label">${s.label}</span>${used ? '' : '<span class="dl2-node-skip">not used</span>'}`;
          node.addEventListener('click', () => {
            if (used) { const idx = state.activeIds.indexOf(s.id); if (state.engine) state.engine.goto(idx); else selectStage(s.id); }
            else showSkipped(s.id);
          });
          pipe.appendChild(node);
        });
      }

      function rebuildEngine() {
        if (state.engine) { try { state.engine.destroy(); } catch (_) {} }
        const F = AE().fnStep;
        const steps = state.activeIds.map((id, i) =>
          F(state.pattern.detail[id].title, state.pattern.detail[id].what, () => renderCursor(i), null, 2600));
        const engine = new (AE())({ steps, speed: 1 });
        engine.setContext(ctx);
        engine.on('stepchange', i => { if (i < 0) renderIdle(); });
        window.CDWH.AnimationControls.register(engine);
        state.engine = engine;
      }

      function renderCursor(i) {
        const ids = state.activeIds;
        pipe.querySelectorAll('.dl2-node').forEach(n => n.classList.remove('dl2-active', 'dl2-done'));
        ids.forEach((id, k) => {
          const n = pipe.querySelector('#dl2-node-' + id);
          if (!n) return;
          if (k < i) n.classList.add('dl2-done');
          else if (k === i) n.classList.add('dl2-active');
        });
        const m = SIM().deriveMetrics(state.pattern, ids, i);
        paintMetrics(m);
        selectStage(ids[i], true);
      }

      function renderIdle() {
        pipe.querySelectorAll('.dl2-node').forEach(n => n.classList.remove('dl2-active', 'dl2-done'));
        paintMetrics(SIM().deriveMetrics(state.pattern, state.activeIds, -1));
      }

      function paintMetrics(m) {
        const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
        set('m-files-disc', m.filesDiscovered); set('m-files-load', m.filesLoaded);
        set('m-rows-parse', m.rowsParsed); set('m-rows-ins', m.rowsInserted);
        set('m-rows-rej', m.rowsRejected); set('m-backlog', m.backlog);
        set('m-dur', m.duration); set('m-stat', m.raw.done ? 'done' : (m.raw.idle ? 'idle' : 'running'));
        const dot = document.getElementById('dl2-dot'); const st = document.getElementById('dl2-stext');
        if (st) st.textContent = m.status;
        if (dot) dot.className = 'dl2-dot ' + (m.raw.done ? 'done' : m.raw.idle ? '' : 'live');
      }

      function showOverview() {
        detail.innerHTML =
          `<div class="dl2-detail-eyebrow">${state.pattern.label}</div>
           <h2 class="dl2-detail-title">${state.pattern.tagline}</h2>
           <p class="dl2-detail-what">Press <strong>Play</strong> (or click any lit stage) to walk the lifecycle. Greyed stages are <em>not used</em> by this pattern — click them to learn why.</p>`;
      }

      function showSkipped(id) {
        const s = spec.stages.find(x => x.id === id);
        detail.innerHTML =
          `<div class="dl2-detail-eyebrow dl2-badge-skip">Not used in ${state.pattern.short}</div>
           <h2 class="dl2-detail-title">${s.icon} ${s.label}</h2>
           <p class="dl2-detail-what">${_skipReason(state.pattern.id, id)}</p>`;
        pipe.querySelectorAll('.dl2-node').forEach(n => n.classList.remove('dl2-sel'));
        const n = pipe.querySelector('#dl2-node-' + id); if (n) n.classList.add('dl2-sel');
      }

      function selectStage(id, fromCursor) {
        const d = state.pattern.detail[id];
        const s = spec.stages.find(x => x.id === id);
        if (!d || !s) return;
        state.selected = id;
        pipe.querySelectorAll('.dl2-node').forEach(n => n.classList.remove('dl2-sel'));
        const n = pipe.querySelector('#dl2-node-' + id); if (n) n.classList.add('dl2-sel');
        const rows = [];
        if (d.io && d.io !== '—')     rows.push(['Input → output', d.io]);
        if (d.state && d.state !== '—') rows.push(['State change', d.state]);
        detail.innerHTML =
          `<div class="dl2-detail-eyebrow dl2-role-${d.role}">${ROLE_LABEL[d.role] || ''}</div>
           <h2 class="dl2-detail-title">${s.icon} ${d.title}</h2>
           <p class="dl2-detail-what">${d.what}</p>
           ${d.theory ? `<div class="dl2-theory"><div class="dl2-theory-tag">Why it works this way</div><p>${d.theory}</p></div>` : ''}
           ${rows.length ? '<div class="dl2-kv">' + rows.map(r => `<div class="dl2-kv-row"><span>${r[0]}</span><b>${r[1]}</b></div>`).join('') + '</div>' : ''}
           ${d.fail && d.fail !== '—' ? `<div class="dl2-fail"><h4>💥 Common failure</h4><p>${d.fail}</p></div>` : ''}
           ${d.fix && d.fix !== '—' ? `<div class="dl2-fix"><h4>🛠️ Troubleshoot</h4><p>${d.fix}</p></div>` : ''}
           <div id="dl2-code-slot"></div>`;
        if (d.code && CV()) {
          document.getElementById('dl2-code-slot').appendChild(CV().create(d.code.text, d.code.lang, d.code.label));
        }
      }

      selectPattern(spec.patterns[0].id);
      return { destroy() { if (state.engine) { try { state.engine.destroy(); } catch (_) {} } } };
    },
  };

  function _skipReason(patternId, stageId) {
    const R = {
      'streaming|transport': 'Snowpipe Streaming writes rows directly through a channel using the SDK — there is no object storage in the path at all.',
      'streaming|notify': 'There are no files, so there is no file-arrival event to react to. The channel carries rows continuously.',
      'streaming|discover': 'Nothing to discover: rows stream in through the channel rather than being found as files in a stage.',
      'snowpipe|': '', // none
      'batch_copy|notify': 'Bulk COPY INTO is pull-based: you run it (or a scheduled task runs it). It is not triggered by an arrival event the way Snowpipe is.',
      'kafka|notify': 'Kafka delivery is poll-based from the topic; the connector consumes records rather than reacting to a storage event.',
      'kafka|discover': 'The connector consumes topic partitions directly — there is no file-discovery step.',
      'cdc|notify': 'Change events arrive on a Kafka topic; the connector consumes them rather than reacting to a storage notification.',
      'cdc|discover': 'Changes are consumed from the topic in offset order — there are no files to discover.',
    };
    return R[patternId + '|' + stageId] || 'This pattern takes a different path and does not use this stage.';
  }

  /* Pure: predict the load outcome for a pattern given the what-if switches. */
  function computeWhatIf(pattern, wi) {
    const T = pattern.totals || { files: 0, rows: 0 };
    const fileBased = !!pattern.fileBased;
    const BAD = 3;
    const rowsTotal = T.rows;
    let filesLoaded = fileBased ? T.files : null;
    let inserted = rowsTotal, rejected = 0, dup = 0, statusKind = 'ok';
    let title = 'Clean load — everything lands exactly once';
    let explain = 'No injected issues: every row parses, loads once and reconciles. This is the happy path the lifecycle above walks.';
    let config = 'happy path — no error handling triggered';

    if (wi.badRows) {
      if (fileBased && wi.policy === 'skip_file') {
        const perFile = Math.max(1, Math.round(rowsTotal / Math.max(1, T.files)));
        filesLoaded = Math.max(0, T.files - 1); inserted = rowsTotal - perFile; rejected = 0; statusKind = 'partial';
        title = '1 file skipped — ' + _fmt(perFile) + ' good rows lost with it';
        explain = "ON_ERROR = SKIP_FILE discards the ENTIRE file on its first bad row, so the ~" + _fmt(perFile) + " good rows in that file never load. Safe for all-or-nothing files, wasteful when only a few rows are bad.";
        config = "ON_ERROR = 'SKIP_FILE'";
      } else if (wi.policy === 'abort') {
        inserted = 0; rejected = rowsTotal; if (fileBased) filesLoaded = 0; statusKind = 'abort';
        if (fileBased) {
          title = 'Whole load ABORTED — nothing lands';
          explain = 'ON_ERROR = ABORT_STATEMENT (the default) fails the entire COPY on the first bad row and rolls back. Predictable, but a single bad row blocks the whole batch.';
          config = "ON_ERROR = 'ABORT_STATEMENT'";
        } else {
          title = 'Pipeline halted at the bad record';
          explain = 'Failing the channel/consumer on a bad record stops ingestion at that point; downstream rows back up until someone intervenes. Minimal data loss, but latency and backlog spike.';
          config = 'on bad row → fail pipeline';
        }
      } else { // continue / dead-letter
        rejected = BAD; inserted = rowsTotal - BAD; statusKind = 'partial';
        if (fileBased) {
          title = BAD + ' rows rejected, the rest load fine';
          explain = 'ON_ERROR = CONTINUE loads every good row and writes the ' + BAD + ' malformed ones to the rejected-records output. The load succeeds; you quarantine and fix the rejects separately.';
          config = "ON_ERROR = 'CONTINUE'";
        } else {
          title = BAD + ' rows dead-lettered, stream keeps flowing';
          explain = 'Routing bad records to a dead-letter / error table lets the channel keep ingesting the good ones with no latency hit. You reconcile the dead-letter table later — the usual streaming choice.';
          config = 'on bad row → dead-letter table';
        }
      }
    }

    if (wi.rerun === 'replay') {
      const why = fileBased ? 'load metadata skips files already loaded'
        : (pattern.id === 'cdc' ? 'the MERGE upserts by key' : 'the channel offset token dedups');
      title += ' · replay = no change';
      explain += ' Re-delivering the same data changes nothing — ' + why + ', so the pipeline is idempotent.';
      config += '  ·  replay (idempotent)';
    } else if (wi.rerun === 'force') {
      if (fileBased && inserted > 0) {
        dup = inserted; statusKind = 'dup';
        title = 'Duplicates! FORCE re-loaded every row';
        explain = 'FORCE = TRUE bypasses the load-metadata dedup and re-inserts every row — now you have ~' + _fmt(dup) + ' duplicate rows. Reserve FORCE for a deliberate, controlled reload, never routine retries.';
        config += '  ·  FORCE = TRUE';
      } else if (fileBased) {
        // Nothing landed on the first pass (aborted) → FORCE just retries it.
        title += ' · FORCE re-runs, same result';
        explain += ' FORCE only bypasses file dedup; with nothing successfully loaded there is nothing to duplicate — the re-run hits the same bad row and ends the same way.';
        config += '  ·  FORCE = TRUE';
      } else {
        title += ' · FORCE n/a';
        explain += ' FORCE is a file-load flag with no meaning for a streaming/offset pattern, which dedups by token or key regardless.';
      }
    }

    return { fileBased, filesLoaded, inserted, rejected, dup, statusKind, title, explain, config };
  }

  function _fmt(n) { return n == null ? '—' : Math.round(n).toLocaleString('en-US'); }
  function _esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function _sectionTitle(t) { const e = _el('div', 'dl2-section-title'); e.textContent = t; return e; }
  function _el(tag, cls) { const el = document.createElement(tag); if (cls) el.className = cls; return el; }

  window.CDWH = window.CDWH || {};
  window.CDWH.Modules = window.CDWH.Modules || {};
  window.CDWH.P.snowflake.Modules.dataLoading = Module;
})();
