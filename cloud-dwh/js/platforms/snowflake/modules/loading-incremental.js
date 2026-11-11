/* ============================================================
   Incremental & CDC Lab (P0-C) — initial load vs incremental
   ingestion, MERGE, watermarks, idempotency and CDC insert/update/
   delete. Backed by the pure reducers in sim-core (applyBatch /
   seedTarget / watermarkPick) over a small deterministic dataset.
   Deterministic in-browser simulation; no live execution.
   ============================================================ */
(function () {
  'use strict';
  const CV   = () => window.CDWH.CodeViewer;
  const SIM  = () => window.CDWH.P.snowflake.loadingSim;
  const DATA = () => window.CDWH.P.snowflake.cdcDataset;

  const STRAT_SQL = {
    append: `-- Blind append: every event becomes a new row. Replays duplicate.
INSERT INTO curated.orders
SELECT order_id, customer_id, status, amount, updated_at, lsn
FROM staging.order_changes;   -- no key, no dedup → duplicates on replay`,
    dedup_insert: `-- Insert-only after de-duplicating events. Never applies updates.
INSERT INTO curated.orders
SELECT order_id, customer_id, status, amount, updated_at, lsn
FROM staging.order_changes s
WHERE NOT EXISTS (SELECT 1 FROM curated.orders t WHERE t.order_id = s.order_id);`,
    merge: `-- Upsert MERGE, de-dup source by key (latest lsn). No delete handling.
MERGE INTO curated.orders t
USING (
  SELECT * FROM staging.order_changes
  QUALIFY ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY lsn DESC) = 1
) s
ON t.order_id = s.order_id
WHEN MATCHED THEN UPDATE SET status=s.status, amount=s.amount, updated_at=s.updated_at, lsn=s.lsn
WHEN NOT MATCHED THEN INSERT (order_id,customer_id,status,amount,updated_at,lsn)
  VALUES (s.order_id,s.customer_id,s.status,s.amount,s.updated_at,s.lsn);
-- op='d' rows fall through as no-ops → deletes are NOT reflected.`,
    merge_cdc: `-- Delete-aware MERGE: dedup by key (latest lsn) then branch on op.
MERGE INTO curated.orders t
USING (
  SELECT * FROM staging.order_changes
  QUALIFY ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY lsn DESC) = 1
) s
ON t.order_id = s.order_id
WHEN MATCHED AND s.op = 'd' THEN DELETE
WHEN MATCHED AND s.op IN ('u','c') THEN UPDATE SET
  status=s.status, amount=s.amount, updated_at=s.updated_at, lsn=s.lsn
WHEN NOT MATCHED AND s.op <> 'd' THEN INSERT
  (order_id,customer_id,status,amount,updated_at,lsn)
  VALUES (s.order_id,s.customer_id,s.status,s.amount,s.updated_at,s.lsn);`,
    copy_tracking: `-- COPY tracks loaded files for ~64 days; re-running skips a loaded file.
COPY INTO curated.orders FROM @stage/changes/
ON_ERROR = 'CONTINUE';
-- Idempotent at the FILE level only. The SAME rows in a NEW file still
-- duplicate — file tracking is not business-key idempotency.`,
    force_reload: `-- FORCE re-loads files already loaded → duplicates. Not a safe default.
COPY INTO curated.orders FROM @stage/changes/
FORCE = TRUE;`,
    cdc_replay: `-- Replay-safe CDC apply: event-id dedup + latest-lsn + delete handling.
MERGE INTO curated.orders t
USING (
  SELECT * FROM staging.order_changes
  WHERE event_id NOT IN (SELECT event_id FROM curated.applied_events)   -- replay guard
  QUALIFY ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY lsn DESC) = 1
) s
ON t.order_id = s.order_id
WHEN MATCHED AND s.op='d' THEN DELETE
WHEN MATCHED THEN UPDATE SET status=s.status, amount=s.amount, updated_at=s.updated_at, lsn=s.lsn
WHEN NOT MATCHED AND s.op<>'d' THEN INSERT (order_id,customer_id,status,amount,updated_at,lsn)
  VALUES (s.order_id,s.customer_id,s.status,s.amount,s.updated_at,s.lsn);`,
  };

  const Module = {
    render(canvas) {
      canvas.innerHTML = '';
      const page = _el('div', 'mod-page');
      page.innerHTML = `
        <div class="mod-header">
          <div class="mod-eyebrow">Query &amp; Data</div>
          <h1 class="mod-title">Incremental &amp; CDC Lab</h1>
          <p class="mod-subtitle">Initial load vs incremental ingestion: apply change batches, watch the target table mutate, and see why dedup, MERGE, watermarks, delete-handling and idempotency strategy decide whether results are correct. Deterministic simulation.</p>
        </div>`;
      canvas.appendChild(page);

      const tabs = ['Incremental & MERGE', 'Idempotency', 'Watermarks', 'CDC ops'];
      const bar = _el('div', 'wk-tabs'); const body = _el('div', 'wk-body');
      tabs.forEach((t, i) => {
        const b = _el('button', 'wk-tab' + (i === 0 ? ' active' : ''));
        b.type = 'button'; b.textContent = t;
        b.addEventListener('click', () => { bar.querySelectorAll('.wk-tab').forEach(x => x.classList.remove('active')); b.classList.add('active'); render(i); });
        bar.appendChild(b);
      });
      page.append(bar, body);

      function render(i) {
        body.innerHTML = '';
        if (i === 0) renderEngine();
        else if (i === 1) renderIdempotency();
        else if (i === 2) renderWatermarks();
        else renderCDC();
      }

      /* ---------- Tab 1: interactive engine ---------- */
      function renderEngine() {
        const d = DATA();
        const st = { strategy: 'merge_cdc', applied: [], cur: SIM().seedTarget(d.snapshot), last: null };

        const ctrls = _el('div', 'wk-controls');
        ctrls.innerHTML = `<label class="wk-ctl">Strategy
          <select id="in-strat">${Object.entries(SIM().STRATEGIES).map(([k, v]) => `<option value="${k}"${k === 'merge_cdc' ? ' selected' : ''}>${v}</option>`).join('')}</select></label>
          <span id="in-batchbtns" class="in-batchbtns"></span>
          <button type="button" id="in-replay" class="wk-run" style="background:#a371f7">Replay last</button>
          <button type="button" id="in-reset" class="wk-run" style="background:#6e7681">Reset</button>`;
        body.appendChild(ctrls);

        const layout = _el('div', 'in-layout');
        layout.innerHTML = `
          <div><div class="wk-mini-h">Target: CURATED.ORDERS <span id="in-count" class="in-count"></span></div><div id="in-target"></div></div>
          <div><div class="wk-mini-h">Last batch applied (source)</div><div id="in-source"></div>
               <div class="wk-mini-h" style="margin-top:.7rem">This apply</div><div id="in-stats"></div></div>`;
        body.appendChild(layout);

        const sqlWrap = _el('div'); sqlWrap.id = 'in-sql'; body.appendChild(sqlWrap);
        body.appendChild(_subhead('Batch history'));
        const hist = _el('div'); hist.id = 'in-hist'; body.appendChild(hist);

        function batchButtons() {
          const w = document.getElementById('in-batchbtns'); w.innerHTML = '';
          d.batches.forEach((b, i) => {
            const btn = _el('button', 'in-bbtn'); btn.type = 'button'; btn.textContent = 'Apply ' + b.label.split('—')[0].trim();
            btn.disabled = i !== st.applied.length;         // enforce order
            if (st.applied.includes(i)) btn.classList.add('done');
            btn.title = b.note;
            btn.addEventListener('click', () => { const r = SIM().applyBatch(st.cur, b, st.strategy); st.cur = r.state; st.applied.push(i); st.last = { batch: b, stats: r.stats }; paint(); });
            w.appendChild(btn);
          });
        }

        function paint() {
          document.getElementById('in-count').textContent = `(${st.cur.rows.length} rows)`;
          document.getElementById('in-target').innerHTML = _table(d.columns, st.cur.rows);
          document.getElementById('in-source').innerHTML = st.last ? _eventsTable(st.last.batch.events) : '<p class="in-empty">No batch applied yet — initial snapshot is loaded.</p>';
          document.getElementById('in-stats').innerHTML = st.last ? _stats(st.last.stats) + (st.last.batch.note ? `<div class="wk-sum-note">${st.last.batch.note}</div>` : '') : '<p class="in-empty">—</p>';
          const sqlWrapEl = document.getElementById('in-sql'); sqlWrapEl.innerHTML = '';
          if (CV()) sqlWrapEl.appendChild(CV().create(STRAT_SQL[st.strategy], 'sql', 'Apply logic — ' + SIM().STRATEGIES[st.strategy]));
          const h = st.cur.history.filter(x => x.batch !== 'Initial snapshot');
          document.getElementById('in-hist').innerHTML = h.length
            ? `<table class="wk-table"><thead><tr><th>#</th><th>Batch</th><th>Strategy</th><th>ins</th><th>upd</th><th>del</th><th>ign</th><th>rows</th></tr></thead><tbody>${h.map((x, k) => `<tr><td>${k + 1}</td><td>${x.batch}</td><td>${SIM().STRATEGIES[x.strategy]}</td><td>${x.stats.inserted}</td><td>${x.stats.updated}</td><td>${x.stats.deleted}</td><td>${x.stats.ignored}</td><td>${x.count}</td></tr>`).join('')}</tbody></table>`
            : '<p class="in-empty">Apply a batch to build history.</p>';
          batchButtons();
          const rb = document.getElementById('in-replay'); if (rb) rb.disabled = !st.last;
        }

        document.getElementById('in-strat').addEventListener('change', e => { st.strategy = e.target.value; st.applied = []; st.cur = SIM().seedTarget(d.snapshot); st.last = null; paint(); });
        document.getElementById('in-reset').addEventListener('click', () => { st.applied = []; st.cur = SIM().seedTarget(d.snapshot); st.last = null; paint(); });
        document.getElementById('in-replay').addEventListener('click', () => { if (!st.last) return; const r = SIM().applyBatch(st.cur, st.last.batch, st.strategy); st.cur = r.state; st.last = { batch: st.last.batch, stats: r.stats }; paint(); });
        paint();
      }

      /* ---------- Tab 2: idempotency matrix ---------- */
      function renderIdempotency() {
        const d = DATA();
        body.appendChild(_callout('🔁 The idempotency test', 'Process the <strong>same batch twice</strong> and compare the target. A strategy is idempotent if the second apply does not change the result. Batch 2 here contains a duplicate event and out-of-order updates.'));
        const batch = d.byId('b2');
        const rows = Object.keys(SIM().STRATEGIES).map(strat => {
          let s = SIM().seedTarget(d.snapshot);
          const r1 = SIM().applyBatch(s, batch, strat); const c1 = r1.count;
          const r2 = SIM().applyBatch(r1.state, batch, strat); const c2 = r2.count;
          const idem = c1 === c2;
          return { strat, c1, c2, idem };
        });
        const notes = {
          append: 'Every event appended again → grows without bound.',
          dedup_insert: 'Stable, but insert-only never applies the update — wrong data, right count.',
          merge: 'Upsert on the key: re-applying re-updates to the same values → stable.',
          merge_cdc: 'Key upsert + delete handling + event dedup → stable and correct.',
          copy_tracking: 'Same file is skipped on replay (stable) — but the duplicate event inside the file already duplicated a row on first load.',
          force_reload: 'FORCE re-loads the file → duplicates every replay.',
          cdc_replay: 'Event-id guard + latest-lsn + delete handling → fully replay-safe.',
        };
        const tbl = _el('div');
        tbl.innerHTML = `<table class="wk-table"><thead><tr><th>Strategy</th><th>Rows after 1st</th><th>Rows after replay</th><th>Idempotent?</th><th>Why</th></tr></thead><tbody>${rows.map(r => `<tr class="${r.idem ? 'r-ok' : 'r-bad'}"><td>${SIM().STRATEGIES[r.strat]}</td><td>${r.c1}</td><td>${r.c2}</td><td class="wk-res">${r.idem ? '✓ yes' : '✗ no'}</td><td class="wk-reason" style="max-width:420px">${notes[r.strat]}</td></tr>`).join('')}</tbody></table>`;
        body.appendChild(tbl);
        body.appendChild(_callout('🧠 Takeaway', 'Snowflake file-load tracking (COPY) prevents re-loading the same <em>file</em>, but it is <strong>not</strong> row-level idempotency. Correctness comes from business keys + event ids + deterministic ordering + delete handling — a keyed MERGE, not FORCE or blind append.'));
      }

      /* ---------- Tab 3: watermarks ---------- */
      function renderWatermarks() {
        const d = DATA();
        body.appendChild(_callout('🌊 High-water marks', 'An incremental extract remembers where it stopped. The column you watermark on decides what the next run sees.'));
        const late = d.byId('b4').events;
        const ctrls = _el('div', 'wk-controls');
        ctrls.innerHTML = `<label class="wk-ctl">Watermark column
          <select id="wm-col"><option value="updated_at">updated_at (timestamp)</option><option value="lsn">lsn (source sequence)</option></select></label>
          <span class="wk-ctl">Current mark: <b id="wm-mark"></b></span>`;
        body.appendChild(ctrls);
        const out = _el('div'); out.id = 'wm-out'; body.appendChild(out);
        function run() {
          const col = document.getElementById('wm-col').value;
          const mark = col === 'lsn' ? 10 : '2024-02-01 10:00';   // state after batches 1–3
          document.getElementById('wm-mark').textContent = String(mark);
          const picked = SIM().watermarkPick(late, col, mark);
          const ev = late[0];
          const got = picked.length > 0;
          out.innerHTML =
            `<div class="wk-mini-h">Late-arriving change (order 2 → RETURNED, real time 08:00, lsn 11)</div>` +
            _eventsTable(late) +
            `<div class="wk-summary ${got ? 'wk-success' : 'wk-aborted'}" style="margin-top:.7rem"><div class="wk-sum-line"><strong>${got ? '✓ Picked up' : '✗ Missed'}</strong> by a ${col} watermark &gt; ${mark}.</div><div class="wk-sum-note">${got ? 'The source sequence keeps rising, so an lsn/offset watermark catches changes even when their event time is old.' : 'Its event time (08:00) is below the timestamp mark (10:00), so a timestamp-only watermark skips it — silent data loss. Overlapping windows help but are fragile; prefer a monotonic source sequence (lsn/offset).'}</div></div>`;
        }
        document.getElementById('wm-col').addEventListener('change', run); run();
        body.appendChild(_callout('⚠️ Timestamp watermarks are not universally safe', 'Clock skew, late data and equal timestamps make timestamp-only watermarks miss or re-scan rows. Use inclusive/exclusive bounds deliberately and prefer source transaction ids, sequence numbers or CDC offsets where available.'));
      }

      /* ---------- Tab 4: CDC narrative ---------- */
      function renderCDC() {
        body.appendChild(_callout('🧬 CDC lifecycle', 'Postgres commits → the WAL records the change → Debezium emits a change event (op + before/after + LSN) → Kafka → Snowflake RAW change table → delete-aware MERGE → curated current state.'));
        const flow = _el('div', 'wk-grid');
        [['INSERT (op=c)', 'No before image; after image is the new row. MERGE → INSERT when the key is absent.'],
         ['UPDATE (op=u)', 'before = prior values, after = new values. MERGE → UPDATE on key match; order by LSN so the newest wins.'],
         ['DELETE (op=d)', 'after is null (a tombstone). Insert/update-only MERGE ignores it → the row lingers forever. Must branch to DELETE.']]
          .forEach(([h, t]) => { const c = _el('div', 'wk-card'); c.innerHTML = `<div class="wk-card-h">${h}</div><p>${t}</p>`; flow.appendChild(c); });
        body.appendChild(flow);
        if (CV()) body.appendChild(CV().create(STRAT_SQL.cdc_replay, 'sql', 'Replay-safe, delete-aware CDC MERGE'));
        body.appendChild(_callout('🔑 Non-obvious rules', 'A delete cannot be handled by insert/update-only logic. Duplicate source keys make a MERGE non-deterministic unless you pick one row per key (latest LSN). Connector event schemas differ — normalise before you MERGE.'));
        body.appendChild(_el('div', 'dl2-note')).innerHTML = '⚠️ Illustrative simulation of CDC semantics — not a live connector.';
      }

      /* ---------- shared renderers ---------- */
      function _table(cols, rows) {
        if (!rows.length) return '<p class="in-empty">(empty table)</p>';
        return `<table class="wk-table"><thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${cols.map(c => `<td>${_fmt(r[c])}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
      }
      function _eventsTable(events) {
        const cols = ['event_id', 'op', 'order_id', 'status', 'amount', 'updated_at', 'lsn'];
        return `<table class="wk-table"><thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>${events.map(e => `<tr class="op-${e.op}">${cols.map(c => `<td>${_fmt(e[c])}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
      }
      function _stats(s) {
        return `<div class="wk-sum-counts"><span class="wk-pill ok">${s.inserted} ins</span><span class="wk-pill upd">${s.updated} upd</span><span class="wk-pill del">${s.deleted} del</span><span class="wk-pill ign">${s.ignored} ignored</span></div>`;
      }
      render(0);
      return {};
    },
  };

  function _subhead(t) { const e = _el('div', 'wk-mini-h'); e.style.marginTop = '.9rem'; e.textContent = t; return e; }
  function _callout(tag, html) { const d = _el('div', 'wk-callout'); d.innerHTML = `<div class="wk-callout-tag">${tag}</div><p>${html}</p>`; return d; }
  function _fmt(v) { return v == null ? '<span class="in-null">∅</span>' : String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  function _el(tag, cls) { const el = document.createElement(tag); if (cls) el.className = cls; return el; }

  window.CDWH = window.CDWH || {};
  window.CDWH.Modules = window.CDWH.Modules || {};
  window.CDWH.P.snowflake.Modules.loadingIncremental = Module;
})();
