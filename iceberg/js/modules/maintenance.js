/* ============================================================
   Maintenance Module
   Interactive 3-tab module: OPTIMIZE, EXPIRE SNAPSHOTS,
   REMOVE ORPHAN FILES. Each tab has its own "run" button.
   No AnimationEngine — CSS animations triggered on click.
   ============================================================ */

(function () {
  'use strict';

  const IV = window.IcebergViz;

  /* ── Style injection ────────────────────────────────────── */
  function _injectStyles() {
    if (document.getElementById('maint-styles')) return;
    const s = document.createElement('style');
    s.id = 'maint-styles';
    s.textContent = `
.maint-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: var(--bg-1);
}

/* ── Tab bar ── */
.maint-tabs {
  display: flex;
  gap: 2px;
  padding: 12px 20px 0;
  background: var(--bg-2);
  border-bottom: 1px solid var(--border-default);
  flex-shrink: 0;
}

.maint-tab {
  padding: 8px 18px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: 8px 8px 0 0;
  border: 1px solid transparent;
  border-bottom: none;
  transition: background 0.12s, color 0.12s;
  user-select: none;
}
.maint-tab:hover { color: var(--text-secondary); background: var(--bg-3); }
.maint-tab.active {
  color: var(--text-primary);
  background: var(--bg-1);
  border-color: var(--border-default);
  margin-bottom: -1px;
  padding-bottom: 9px;
}

/* ── Content area ── */
.maint-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 24px 24px;
}

.maint-panel { display: none; }
.maint-panel.active { display: block; }

/* ── Section header ── */
.maint-section-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 4px;
}
.maint-section-subtitle {
  font-size: 13px;
  color: var(--text-muted);
  margin: 0 0 20px;
  line-height: 1.5;
}

/* ── Diagram area ── */
.maint-diagram {
  background: var(--bg-2);
  border: 1px solid var(--border-default);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  min-height: 140px;
  position: relative;
}

.maint-diagram-label {
  font-size: 10px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: .06em;
  font-weight: 600;
  margin-bottom: 12px;
}

/* ── File grid (OPTIMIZE tab) ── */
.maint-file-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 8px;
}
.maint-file-sq {
  border-radius: 3px;
  transition: all 0.4s ease;
}
.maint-file-sq.small {
  width: 12px; height: 12px;
  background: rgba(88,166,255,0.4);
  border: 1px solid rgba(88,166,255,0.3);
}
.maint-file-sq.large {
  width: 36px; height: 36px;
  background: rgba(86,211,100,0.4);
  border: 1px solid rgba(86,211,100,0.4);
  display: none;
}
.maint-file-sq.merging {
  background: rgba(240,136,62,0.5) !important;
  transform: scale(0.85);
}
.maint-file-sq.merged {
  display: none !important;
}
.maint-file-sq.large.visible {
  display: block;
  animation: maint-pop-in 0.3s ease forwards;
}
@keyframes maint-pop-in {
  from { transform: scale(0.2); opacity: 0; }
  to   { transform: scale(1);   opacity: 1; }
}

/* ── Snapshot timeline ── */
.maint-snap-timeline {
  display: flex;
  align-items: center;
  gap: 0;
  padding: 12px 0;
  overflow-x: auto;
}
.maint-snap-circle {
  width: 56px; height: 56px;
  border-radius: 50%;
  border: 2px solid var(--blue);
  background: var(--bg-3);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.5s ease;
  position: relative;
}
.maint-snap-circle.expired {
  border-color: var(--border-default);
  background: var(--bg-2);
  opacity: 0.4;
}
.maint-snap-circle.expired::after {
  content: '';
  position: absolute;
  left: 8px; top: 26px;
  width: 40px; height: 2px;
  background: var(--red);
  transform: rotate(-30deg);
}
.maint-snap-circle.current {
  border-color: var(--green);
  box-shadow: 0 0 12px rgba(86,211,100,0.3);
}
.maint-snap-label {
  font-size: 9.5px;
  font-weight: 700;
  color: var(--text-primary);
}
.maint-snap-date {
  font-size: 8px;
  color: var(--text-muted);
}
.maint-snap-connector {
  width: 24px; height: 2px;
  background: var(--border-default);
  flex-shrink: 0;
}

/* ── File browser (orphan tab) ── */
.maint-file-browser {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
}
.maint-file-col {
  background: var(--bg-3);
  border: 1px solid var(--border-default);
  border-radius: 8px;
  padding: 12px;
}
.maint-file-col-title {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .05em;
  margin-bottom: 8px;
}
.maint-file-col-title.blue { color: var(--blue); }
.maint-file-col-title.red  { color: var(--red); }
.maint-file-icon {
  display: inline-block;
  width: 10px; height: 10px;
  border-radius: 2px;
  margin: 1px;
  transition: background 0.3s;
}
.maint-file-icon.ref     { background: rgba(88,166,255,0.5); }
.maint-file-icon.orphan  { background: rgba(248,81,73,0.6); }
.maint-file-icon.removed { background: rgba(139,148,158,0.2); }

/* ── SQL block ── */
.maint-sql {
  background: var(--bg-2);
  border: 1px solid var(--border-default);
  border-radius: 10px;
  padding: 14px 16px;
  margin-bottom: 20px;
}
.maint-sql-title {
  font-size: 10px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: .05em;
  font-weight: 600;
  margin-bottom: 8px;
}
.maint-sql pre {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-secondary);
  margin: 0;
  white-space: pre;
  overflow-x: auto;
  line-height: 1.7;
}
.ms-k { color: var(--blue); font-weight: 600; }
.ms-s { color: var(--green); }
.ms-n { color: var(--orange); }
.ms-c { color: var(--text-muted); font-style: italic; }

/* ── Stats cards ── */
.maint-stats-row {
  display: grid;
  gap: 10px;
  margin-bottom: 20px;
}
.maint-stats-row.cols-4 { grid-template-columns: repeat(4, 1fr); }
.maint-stats-row.cols-3 { grid-template-columns: repeat(3, 1fr); }

.maint-stat-card {
  background: var(--bg-2);
  border: 1px solid var(--border-default);
  border-radius: 10px;
  padding: 12px 14px;
}
.maint-stat-card-label {
  font-size: 10px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: .04em;
  margin-bottom: 6px;
}
.maint-stat-card-val {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  font-family: var(--font-mono);
  line-height: 1.2;
}
.maint-stat-card-val.blue   { color: var(--blue); }
.maint-stat-card-val.green  { color: var(--green); }
.maint-stat-card-val.orange { color: var(--orange); }
.maint-stat-card-val.red    { color: var(--red); }
.maint-stat-card-sub {
  font-size: 10px;
  color: var(--text-muted);
  margin-top: 2px;
}

/* ── Run button ── */
.maint-run-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 20px;
  background: var(--blue);
  color: #fff;
  font-size: 12.5px;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;
  margin-bottom: 16px;
  user-select: none;
}
.maint-run-btn:hover { background: #4aaeff; }
.maint-run-btn:active { transform: scale(0.97); }
.maint-run-btn.running { background: var(--orange); cursor: wait; }
.maint-run-btn.done    { background: var(--green); cursor: default; }

/* ── Warning box ── */
.maint-warning {
  background: rgba(248,81,73,0.07);
  border: 1px solid rgba(248,81,73,0.35);
  border-radius: 8px;
  padding: 12px 14px;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 16px;
}
.maint-warning strong { color: var(--red); }

/* ── Info box ── */
.maint-info {
  background: rgba(88,166,255,0.06);
  border: 1px solid rgba(88,166,255,0.2);
  border-radius: 8px;
  padding: 12px 14px;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 16px;
}

/* ── Optimize before/after labels ── */
.maint-row-labels {
  display: flex;
  gap: 16px;
  margin-bottom: 6px;
}
.maint-row-label {
  font-size: 10px;
  color: var(--text-muted);
  font-weight: 600;
}
.maint-row-label.before { color: var(--blue); }
.maint-row-label.after  { color: var(--green); }
`;
    document.head.appendChild(s);
  }

  /* ═══════════════════════════════════════════════════════════
     TAB 1 — OPTIMIZE
  ═══════════════════════════════════════════════════════════ */
  function _buildOptimizeTab() {
    const el = document.createElement('div');
    el.className = 'maint-panel active';
    el.id = 'maint-panel-optimize';

    el.innerHTML = `
      <div class="maint-section-title">OPTIMIZE (rewrite_data_files)</div>
      <div class="maint-section-subtitle">Compact small Parquet files into larger ones. ShopKart runs this every Sunday 02:00 UTC via Airflow. Reduces manifest scan overhead by 5.9× and improves query planning.</div>

      <div class="maint-diagram" id="maint-opt-diagram">
        <div class="maint-diagram-label">File Compaction Visualization</div>
        <div class="maint-row-labels">
          <span class="maint-row-label before">Before: 2,400 files (avg 16 MB)</span>
        </div>
        <div class="maint-file-grid" id="maint-opt-before"></div>
        <div class="maint-row-labels" style="margin-top:14px;">
          <span class="maint-row-label after">After: 120 files (avg 512 MB)</span>
        </div>
        <div class="maint-file-grid" id="maint-opt-after"></div>
      </div>

      <button class="maint-run-btn" id="maint-opt-btn">
        <svg viewBox="0 0 16 16" fill="currentColor" width="12" height="12"><polygon points="4,2 14,8 4,14"/></svg>
        Run OPTIMIZE
      </button>

      <div class="maint-sql">
        <div class="maint-sql-title">ShopKart Compaction Job (Airflow, every Sunday 02:00 UTC)</div>
        <pre><span class="ms-k">CALL</span> system.rewrite_data_files(
  table <span class="ms-k">=></span> <span class="ms-s">'prod.orders'</span>,
  strategy <span class="ms-k">=></span> <span class="ms-s">'binpack'</span>,
  options <span class="ms-k">=></span> map(
    <span class="ms-s">'target-file-size-bytes'</span>, <span class="ms-n">'536870912'</span>,    <span class="ms-c">-- 512 MB</span>
    <span class="ms-s">'min-file-size-bytes'</span>,    <span class="ms-n">'134217728'</span>,    <span class="ms-c">-- 128 MB</span>
    <span class="ms-s">'max-file-size-bytes'</span>,    <span class="ms-n">'1073741824'</span>,   <span class="ms-c">-- 1 GB</span>
    <span class="ms-s">'delete-file-threshold'</span>,  <span class="ms-n">'2'</span>             <span class="ms-c">-- compact if ≥2 deletes</span>
  )
)</pre>
      </div>

      <div class="maint-stats-row cols-4" id="maint-opt-stats">
        <div class="maint-stat-card">
          <div class="maint-stat-card-label">Files Before</div>
          <div class="maint-stat-card-val red" id="maint-opt-stat-before">2,400</div>
          <div class="maint-stat-card-sub">avg 16 MB each</div>
        </div>
        <div class="maint-stat-card">
          <div class="maint-stat-card-label">Files After</div>
          <div class="maint-stat-card-val green" id="maint-opt-stat-after">120</div>
          <div class="maint-stat-card-sub">avg 512 MB each</div>
        </div>
        <div class="maint-stat-card">
          <div class="maint-stat-card-label">Query Speedup</div>
          <div class="maint-stat-card-val orange">6.8×</div>
          <div class="maint-stat-card-sub">less planning overhead</div>
        </div>
        <div class="maint-stat-card">
          <div class="maint-stat-card-label">Manifest Scan</div>
          <div class="maint-stat-card-val blue">47 → 8</div>
          <div class="maint-stat-card-sub">manifests to read</div>
        </div>
      </div>
    `;
    return el;
  }

  function _initOptimize(panel) {
    const beforeGrid = panel.querySelector('#maint-opt-before');
    const afterGrid  = panel.querySelector('#maint-opt-after');
    const btn        = panel.querySelector('#maint-opt-btn');
    if (!beforeGrid || !afterGrid || !btn) return;

    // Create 60 small file squares (representing 2400)
    for (let i = 0; i < 60; i++) {
      const sq = document.createElement('div');
      sq.className = 'maint-file-sq small';
      sq.dataset.idx = i;
      beforeGrid.appendChild(sq);
    }

    // Create 10 large file squares (representing 120) — hidden initially
    for (let i = 0; i < 10; i++) {
      const sq = document.createElement('div');
      sq.className = 'maint-file-sq large';
      sq.dataset.afterIdx = i;
      afterGrid.appendChild(sq);
    }

    let running = false;
    btn.addEventListener('click', () => {
      if (running) return;
      running = true;
      btn.classList.add('running');
      btn.textContent = 'Running…';

      // Phase 1: mark small files as merging
      const smalls = beforeGrid.querySelectorAll('.maint-file-sq.small');
      smalls.forEach((sq, i) => {
        setTimeout(() => sq.classList.add('merging'), i * 15);
      });

      // Phase 2: merge small files (hide them)
      setTimeout(() => {
        smalls.forEach((sq, i) => {
          setTimeout(() => sq.classList.add('merged'), i * 12);
        });
      }, 800);

      // Phase 3: show large files
      const larges = afterGrid.querySelectorAll('.maint-file-sq.large');
      larges.forEach((sq, i) => {
        setTimeout(() => sq.classList.add('visible'), 1200 + i * 100);
      });

      // Done
      setTimeout(() => {
        btn.classList.remove('running');
        btn.classList.add('done');
        btn.innerHTML = `
          <svg viewBox="0 0 16 16" fill="currentColor" width="12" height="12"><path d="M14 3L6 13 2 9"/></svg>
          Compaction Complete
        `;
        running = false;
      }, 2500);
    });
  }

  /* ═══════════════════════════════════════════════════════════
     TAB 2 — EXPIRE SNAPSHOTS
  ═══════════════════════════════════════════════════════════ */
  function _buildExpireTab() {
    const el = document.createElement('div');
    el.className = 'maint-panel';
    el.id = 'maint-panel-expire';

    const snaps = [
      { id: 1, label: 'S1', date: '2023-11-15', current: false },
      { id: 2, label: 'S2', date: '2023-12-01', current: false },
      { id: 3, label: 'S3', date: '2023-12-15', current: false },
      { id: 4, label: 'S4', date: '2024-01-01', current: false },
      { id: 5, label: 'S5', date: '2024-01-15', current: false },
      { id: 6, label: 'S6', date: '2024-02-01', current: false },
      { id: 7, label: 'S7', date: '2024-02-15', current: false },
      { id: 8, label: 'S8', date: '2024-03-01', current: true  },
    ];

    const timelineHtml = snaps.map((s, i) => `
      ${i > 0 ? '<div class="maint-snap-connector"></div>' : ''}
      <div class="maint-snap-circle ${s.current ? 'current' : ''}" id="maint-snap-${s.id}" data-snap="${s.id}">
        <div class="maint-snap-label">${s.label}</div>
        <div class="maint-snap-date">${s.date.slice(5)}</div>
      </div>
    `).join('');

    el.innerHTML = `
      <div class="maint-section-title">EXPIRE SNAPSHOTS</div>
      <div class="maint-section-subtitle">Remove old snapshot metadata and unreachable data files. Frees storage but makes time travel to expired snapshots impossible. ShopKart retains last 5 snapshots + all newer than 30 days.</div>

      <div class="maint-diagram">
        <div class="maint-diagram-label">Snapshot Timeline (8 snapshots — 3 to expire)</div>
        <div class="maint-snap-timeline">${timelineHtml}</div>
        <div style="font-size:10px;color:var(--text-muted);margin-top:8px;">
          Policy: retain_last=5, older_than=2024-01-01 · Snapshots 1–3 will be expired
        </div>
      </div>

      <button class="maint-run-btn" id="maint-expire-btn">
        <svg viewBox="0 0 16 16" fill="currentColor" width="12" height="12"><polygon points="4,2 14,8 4,14"/></svg>
        Expire Snapshots
      </button>

      <div class="maint-warning">
        <strong>⚠ Warning:</strong> After expiry, time-travel to expired snapshots is impossible.
        Snapshot 1 (2023-11-15) through Snapshot 3 (2023-12-15) will no longer be accessible.
        Any jobs relying on VERSION AS OF those snapshot IDs will fail.
      </div>

      <div class="maint-sql">
        <div class="maint-sql-title">ShopKart Snapshot Retention (daily cleanup job)</div>
        <pre><span class="ms-k">CALL</span> system.expire_snapshots(
  table <span class="ms-k">=></span> <span class="ms-s">'prod.orders'</span>,
  older_than <span class="ms-k">=></span> <span class="ms-k">TIMESTAMP</span> <span class="ms-s">'2024-01-01 00:00:00'</span>,
  retain_last <span class="ms-k">=></span> <span class="ms-n">5</span>,
  max_concurrent_deletes <span class="ms-k">=></span> <span class="ms-n">100</span>
)</pre>
      </div>

      <div class="maint-stats-row cols-4">
        <div class="maint-stat-card">
          <div class="maint-stat-card-label">Snapshots Expired</div>
          <div class="maint-stat-card-val red">3</div>
          <div class="maint-stat-card-sub">S1, S2, S3</div>
        </div>
        <div class="maint-stat-card">
          <div class="maint-stat-card-label">Metadata Files Freed</div>
          <div class="maint-stat-card-val orange">847</div>
          <div class="maint-stat-card-sub">manifest + snap avro</div>
        </div>
        <div class="maint-stat-card">
          <div class="maint-stat-card-label">Storage Freed</div>
          <div class="maint-stat-card-val green">2.1 GB</div>
          <div class="maint-stat-card-sub">metadata only</div>
        </div>
        <div class="maint-stat-card">
          <div class="maint-stat-card-label">Orphan Risk</div>
          <div class="maint-stat-card-val blue">Reduced</div>
          <div class="maint-stat-card-sub">unreachable files cleaned</div>
        </div>
      </div>
    `;
    return el;
  }

  function _initExpire(panel) {
    const btn = panel.querySelector('#maint-expire-btn');
    if (!btn) return;

    let running = false;
    btn.addEventListener('click', () => {
      if (running) return;
      running = true;
      btn.classList.add('running');
      btn.textContent = 'Expiring…';

      // Expire snapshots 1, 2, 3 with a delay
      [1, 2, 3].forEach((id, i) => {
        setTimeout(() => {
          const circle = panel.querySelector(`#maint-snap-${id}`);
          if (circle) circle.classList.add('expired');
        }, 500 + i * 400);
      });

      setTimeout(() => {
        btn.classList.remove('running');
        btn.classList.add('done');
        btn.innerHTML = `
          <svg viewBox="0 0 16 16" fill="currentColor" width="12" height="12"><path d="M14 3L6 13 2 9"/></svg>
          3 Snapshots Expired
        `;
        running = false;
      }, 2500);
    });
  }

  /* ═══════════════════════════════════════════════════════════
     TAB 3 — REMOVE ORPHAN FILES
  ═══════════════════════════════════════════════════════════ */
  function _buildOrphanTab() {
    const el = document.createElement('div');
    el.className = 'maint-panel';
    el.id = 'maint-panel-orphan';

    // Build file icons HTML
    const refCount = 48;
    const orphanCount = 32;
    const refIcons = Array.from({length: refCount}, (_, i) =>
      `<div class="maint-file-icon ref" id="maint-ref-${i}" title="Referenced file ${i+1}"></div>`
    ).join('');
    const orphanIcons = Array.from({length: orphanCount}, (_, i) =>
      `<div class="maint-file-icon orphan" id="maint-orphan-${i}" title="Orphan file ${i+1}"></div>`
    ).join('');

    el.innerHTML = `
      <div class="maint-section-title">REMOVE ORPHAN FILES</div>
      <div class="maint-section-subtitle">S3 files not referenced by any Iceberg metadata are "orphans." They accumulate from failed writes, killed jobs, and manual S3 operations. ShopKart runs weekly cleanup to reclaim 12.7 GB.</div>

      <div class="maint-diagram">
        <div class="maint-diagram-label">S3 Warehouse — orders/data/</div>
        <div class="maint-file-browser">
          <div class="maint-file-col">
            <div class="maint-file-col-title blue">Referenced Files (24,000)</div>
            <div id="maint-ref-icons" style="display:flex;flex-wrap:wrap;gap:3px;">
              ${refIcons}
            </div>
            <div style="font-size:9px;color:var(--text-muted);margin-top:6px;">… + 23,952 more referenced files</div>
          </div>
          <div class="maint-file-col">
            <div class="maint-file-col-title red">Orphan Files (847)</div>
            <div id="maint-orphan-icons" style="display:flex;flex-wrap:wrap;gap:3px;">
              ${orphanIcons}
            </div>
            <div style="font-size:9px;color:var(--text-muted);margin-top:6px;">… + 815 more orphan files</div>
            <div id="maint-orphan-count-badge" style="margin-top:8px;font-size:11px;font-family:var(--font-mono);color:var(--red);font-weight:700;">847 orphans found</div>
          </div>
        </div>
      </div>

      <button class="maint-run-btn" id="maint-orphan-btn">
        <svg viewBox="0 0 16 16" fill="currentColor" width="12" height="12"><polygon points="4,2 14,8 4,14"/></svg>
        Remove Orphan Files
      </button>

      <div class="maint-info">
        Orphan files accumulate from:
        <ul style="margin:6px 0 0 16px;padding:0;list-style:disc;">
          <li>Failed writes that committed partially</li>
          <li>Concurrent jobs killed mid-write</li>
          <li>Manual S3 operations that bypassed the catalog</li>
          <li>Old staging files not cleaned up</li>
        </ul>
        Safe window: only remove files older than 3 days (ongoing writes won't be affected).
      </div>

      <div class="maint-sql">
        <div class="maint-sql-title">ShopKart Orphan Cleanup (weekly job)</div>
        <pre><span class="ms-k">CALL</span> system.remove_orphan_files(
  table <span class="ms-k">=></span> <span class="ms-s">'prod.orders'</span>,
  location <span class="ms-k">=></span> <span class="ms-s">'s3://shopkart-lakehouse/warehouse/orders/'</span>,
  older_than <span class="ms-k">=></span> <span class="ms-k">TIMESTAMP</span> <span class="ms-s">'2024-03-01 00:00:00'</span>,
  dry_run <span class="ms-k">=></span> <span class="ms-k">false</span>
)</pre>
      </div>

      <div class="maint-stats-row cols-4">
        <div class="maint-stat-card">
          <div class="maint-stat-card-label">Orphan Files</div>
          <div class="maint-stat-card-val red">847</div>
          <div class="maint-stat-card-sub">not in any manifest</div>
        </div>
        <div class="maint-stat-card">
          <div class="maint-stat-card-label">Storage Freed</div>
          <div class="maint-stat-card-val green">12.7 GB</div>
          <div class="maint-stat-card-sub">reclaimed from S3</div>
        </div>
        <div class="maint-stat-card">
          <div class="maint-stat-card-label">Cost Saved</div>
          <div class="maint-stat-card-val orange">$0.76/day</div>
          <div class="maint-stat-card-sub">at $0.023/GB-mo</div>
        </div>
        <div class="maint-stat-card">
          <div class="maint-stat-card-label">Safe Window</div>
          <div class="maint-stat-card-val blue">&gt; 3 days</div>
          <div class="maint-stat-card-sub">min age before removal</div>
        </div>
      </div>
    `;
    return el;
  }

  function _initOrphan(panel) {
    const btn = panel.querySelector('#maint-orphan-btn');
    if (!btn) return;

    let running = false;
    btn.addEventListener('click', () => {
      if (running) return;
      running = true;
      btn.classList.add('running');
      btn.textContent = 'Removing…';

      // Animate orphan icons to "removed" state
      const orphanIcons = panel.querySelectorAll('.maint-file-icon.orphan');
      orphanIcons.forEach((icon, i) => {
        setTimeout(() => {
          icon.classList.remove('orphan');
          icon.classList.add('removed');
        }, i * 25);
      });

      const countBadge = panel.querySelector('#maint-orphan-count-badge');

      setTimeout(() => {
        if (countBadge) {
          countBadge.style.color = 'var(--green)';
          countBadge.textContent = '847 orphans removed ✓';
        }
        btn.classList.remove('running');
        btn.classList.add('done');
        btn.innerHTML = `
          <svg viewBox="0 0 16 16" fill="currentColor" width="12" height="12"><path d="M14 3L6 13 2 9"/></svg>
          847 Orphans Removed (12.7 GB freed)
        `;
        running = false;
      }, 1800);
    });
  }

  /* ── Module render ─────────────────────────────────────── */
  const mod = {
    id: 'maintenance',
    title: 'Maintenance Ops',
    group: 'advanced',

    render(container) {
      container.innerHTML = '';
      _injectStyles();

      const page = document.createElement('div');
      page.className = 'maint-page page-enter';

      // Tab bar
      const tabs = document.createElement('div');
      tabs.className = 'maint-tabs';
      const tabDefs = [
        { id: 'optimize', label: 'OPTIMIZE' },
        { id: 'expire',   label: 'EXPIRE SNAPSHOTS' },
        { id: 'orphan',   label: 'REMOVE ORPHAN FILES' },
      ];
      tabDefs.forEach(t => {
        const btn = document.createElement('div');
        btn.className = 'maint-tab' + (t.id === 'optimize' ? ' active' : '');
        btn.textContent = t.label;
        btn.dataset.tab = t.id;
        tabs.appendChild(btn);
      });
      page.appendChild(tabs);

      // Content area
      const content = document.createElement('div');
      content.className = 'maint-content';

      const optPanel    = _buildOptimizeTab();
      const expirePanel = _buildExpireTab();
      const orphanPanel = _buildOrphanTab();

      content.appendChild(optPanel);
      content.appendChild(expirePanel);
      content.appendChild(orphanPanel);
      page.appendChild(content);

      container.appendChild(page);

      // Init interactive behaviors
      _initOptimize(optPanel);
      _initExpire(expirePanel);
      _initOrphan(orphanPanel);

      // Tab switching
      tabs.addEventListener('click', (e) => {
        const tab = e.target.closest('[data-tab]');
        if (!tab) return;
        const targetId = tab.dataset.tab;

        tabs.querySelectorAll('.maint-tab').forEach(t => {
          t.classList.toggle('active', t.dataset.tab === targetId);
        });
        content.querySelectorAll('.maint-panel').forEach(p => {
          p.classList.toggle('active', p.id === `maint-panel-${targetId}`);
        });
      });
    },

    destroy() {
      document.getElementById('maint-styles')?.remove();
    },
  };

  window.IcebergViz = window.IcebergViz || {};
  window.IcebergViz.modules = window.IcebergViz.modules || {};
  window.IcebergViz.modules['maintenance'] = mod;
})();
