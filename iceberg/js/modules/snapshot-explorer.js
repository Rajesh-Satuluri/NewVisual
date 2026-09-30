/* ============================================================
   Snapshot Explorer Module
   Interactive explorer: snapshot timeline, detail panel,
   time-travel SQL, tags & branches, expire snapshots.
   ============================================================ */

(function () {
  'use strict';

  const D  = () => window.IcebergViz.Data;
  const IV = window.IcebergViz;

  /* ── Styles ─────────────────────────────────────────────── */
  function _injectStyles() {
    if (document.getElementById('snex-styles')) return;
    const s = document.createElement('style');
    s.id = 'snex-styles';
    s.textContent = `
.snex-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  padding: 24px 28px 0;
  box-sizing: border-box;
  gap: 0;
}

/* ── Header ── */
.snex-header {
  flex-shrink: 0;
  margin-bottom: 18px;
}
.snex-header-title {
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 4px;
}
.snex-header-sub {
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

/* ── Timeline ── */
.snex-timeline-wrap {
  flex-shrink: 0;
  margin-bottom: 20px;
}
.snex-timeline-label {
  font-size: var(--text-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .08em;
  color: var(--text-muted);
  margin-bottom: 10px;
}
.snex-timeline {
  display: flex;
  align-items: stretch;
  gap: 0;
  overflow-x: auto;
  padding-bottom: 4px;
}
.snex-snap-card {
  flex: 1;
  min-width: 140px;
  background: var(--bg-2);
  border: 1.5px solid var(--border-default);
  border-radius: 8px;
  padding: 12px 14px;
  cursor: pointer;
  transition: border-color .15s, background .15s, box-shadow .15s;
  position: relative;
}
.snex-snap-card:hover {
  border-color: var(--border-subtle);
  background: var(--bg-3);
}
.snex-snap-card.selected {
  border-color: var(--blue);
  background: rgba(74,174,255,0.06);
  box-shadow: 0 0 0 1px rgba(74,174,255,0.2);
}
.snex-snap-card.status-expired { opacity: 0.45; }
.snex-snap-card.status-rolled-back { border-color: rgba(248,81,73,0.5); }
.snex-snap-card.status-current { border-color: var(--green); }

.snex-snap-icon { font-size: 18px; margin-bottom: 6px; }
.snex-snap-label {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 3px;
}
.snex-snap-op {
  font-size: var(--text-xs);
  color: var(--text-muted);
  font-family: var(--font-mono);
  margin-bottom: 3px;
}
.snex-snap-ts {
  font-size: 10px;
  color: var(--text-muted);
  font-family: var(--font-mono);
}
.snex-snap-badge {
  position: absolute;
  top: 8px; right: 8px;
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .04em;
  padding: 2px 6px;
  border-radius: 4px;
}
.snex-badge-current  { background: rgba(63,185,80,0.15);  color: var(--green); }
.snex-badge-tagged   { background: rgba(163,113,247,0.15); color: var(--purple); }
.snex-badge-expired  { background: rgba(139,148,158,0.1);  color: var(--text-muted); }
.snex-badge-rolledback { background: rgba(248,81,73,0.15); color: var(--red); }

/* Arrow between cards */
.snex-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 6px;
  color: var(--text-muted);
  font-size: 16px;
  flex-shrink: 0;
  align-self: center;
}

/* ── Bottom panel ── */
.snex-bottom {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  min-height: 0;
  overflow: hidden;
  padding-bottom: 24px;
}

.snex-panel {
  background: var(--bg-2);
  border: 1px solid var(--border-default);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.snex-panel-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-default);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.snex-panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 14px 16px;
}

/* Detail rows */
.snex-detail-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 7px 0;
  border-bottom: 1px solid var(--border-subtle);
  font-size: var(--text-xs);
}
.snex-detail-row:last-child { border-bottom: none; }
.snex-detail-key {
  width: 140px;
  flex-shrink: 0;
  color: var(--text-muted);
  font-family: var(--font-mono);
}
.snex-detail-val {
  color: var(--text-primary);
  font-family: var(--font-mono);
  word-break: break-all;
}
.snex-detail-val.path { color: var(--blue); }
.snex-detail-val.good { color: var(--green); }
.snex-detail-val.warn { color: var(--red); }

/* Time travel panel */
.snex-tt-query {
  margin-bottom: 12px;
}
.snex-tt-query .code-block { margin: 0; }

/* Tags & branches */
.snex-refs-wrap {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--border-default);
}
.snex-refs-title {
  font-size: var(--text-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .08em;
  color: var(--text-muted);
  margin-bottom: 8px;
}
.snex-ref-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px solid var(--border-subtle);
  font-size: var(--text-xs);
}
.snex-ref-row:last-child { border-bottom: none; }
.snex-ref-name { font-family: var(--font-mono); color: var(--text-primary); font-weight: 600; }
.snex-ref-type { font-size: 9px; font-weight: 700; text-transform: uppercase; padding: 1px 5px; border-radius: 3px; }
.snex-ref-type.branch { background: rgba(88,166,255,0.15); color: var(--blue); }
.snex-ref-type.tag    { background: rgba(163,113,247,0.15); color: var(--purple); }
.snex-ref-snap { font-family: var(--font-mono); color: var(--text-muted); }
.snex-ref-current { color: var(--green); font-weight: 600; }

/* Expire button */
.snex-expire-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  padding: 7px 14px;
  background: rgba(248,81,73,0.1);
  border: 1px solid rgba(248,81,73,0.35);
  border-radius: 6px;
  color: var(--red);
  font-size: var(--text-xs);
  font-weight: 600;
  cursor: pointer;
  transition: background .15s;
}
.snex-expire-btn:hover { background: rgba(248,81,73,0.18); }

.snex-empty-state {
  color: var(--text-muted);
  font-size: var(--text-sm);
  text-align: center;
  padding: 32px 0;
}
`;
    document.head.appendChild(s);
  }

  /* ── Snapshot data ──────────────────────────────────────── */
  function _snapshots() {
    const chain = D().snapshotChain;
    if (chain && chain.length >= 5) return chain;
    // fallback if not populated
    return [
      { id: 'snap-1001', snapshotId: 1001729675574597001, operation: 'append',    label: 'Initial Migration',    timestamp: '2024-01-15 02:00 UTC', addedFiles: 12847, totalRecords: '62.1 B', description: 'Historical migration from Hive (Jan–Oct 2024)', status: 'expired' },
      { id: 'snap-2002', snapshotId: 2002019143787970520, operation: 'append',    label: 'Streaming: Day 1',     timestamp: '2024-01-16 00:00 UTC', addedFiles: 384,   totalRecords: '63.9 B', description: 'First day of Flink streaming writes',          status: 'active'  },
      { id: 'snap-3003', snapshotId: 3051729675574597004, operation: 'append',    label: 'Q4 Close ← tagged',   timestamp: '2023-12-31 23:59 UTC', addedFiles: 1847,  totalRecords: '84.6 B', description: 'Quarter-end, tagged for 7-year compliance',   status: 'tagged', tag: 'q4_2024_close' },
      { id: 'snap-4004', snapshotId: 4004019143787970520, operation: 'overwrite', label: 'BAD DATA ⚠',          timestamp: '2024-01-19 14:03 UTC', addedFiles: 847,   totalRecords: '84.2 B', description: 'Accidental overwrite — rolled back in 8 min', status: 'rolled-back' },
      { id: 'snap-current', snapshotId: 8922019143787970520, operation: 'append', label: 'Current',             timestamp: '2024-11-29 14:22 UTC', addedFiles: 384,   totalRecords: '86.4 B', description: 'Latest Black Friday 2024 streaming append',   status: 'current' },
    ];
  }

  function _snapIcon(snap) {
    if (snap.status === 'expired')     return '🕗';
    if (snap.status === 'rolled-back') return '⚠️';
    if (snap.status === 'current')     return '📸';
    if (snap.status === 'tagged')      return '🏷';
    return '📸';
  }

  function _badgeHTML(snap) {
    if (snap.status === 'current')     return `<span class="snex-snap-badge snex-badge-current">MAIN</span>`;
    if (snap.status === 'tagged')      return `<span class="snex-snap-badge snex-badge-tagged">TAGGED</span>`;
    if (snap.status === 'expired')     return `<span class="snex-snap-badge snex-badge-expired">EXPIRED</span>`;
    if (snap.status === 'rolled-back') return `<span class="snex-snap-badge snex-badge-rolledback">REVERTED</span>`;
    return '';
  }

  function _opColor(op) {
    if (op === 'append')    return 'var(--green)';
    if (op === 'overwrite') return 'var(--red)';
    if (op === 'delete')    return 'var(--orange)';
    return 'var(--text-muted)';
  }

  /* ── Build timeline ─────────────────────────────────────── */
  function _buildTimeline(container, snaps, onSelect) {
    container.innerHTML = '';
    snaps.forEach((snap, i) => {
      // arrow between cards
      if (i > 0) {
        const arrow = document.createElement('div');
        arrow.className = 'snex-arrow';
        arrow.textContent = '→';
        container.appendChild(arrow);
      }

      const card = document.createElement('div');
      card.className = `snex-snap-card status-${snap.status}`;
      card.dataset.snapId = snap.id;
      card.innerHTML = `
        ${_badgeHTML(snap)}
        <div class="snex-snap-icon">${_snapIcon(snap)}</div>
        <div class="snex-snap-label">${snap.label}</div>
        <div class="snex-snap-op" style="color:${_opColor(snap.operation)}">${snap.operation}</div>
        <div class="snex-snap-ts">${snap.timestamp}</div>
      `;
      card.addEventListener('click', () => {
        container.querySelectorAll('.snex-snap-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        onSelect(snap);
      });
      container.appendChild(card);
    });
  }

  /* ── Build detail panel ─────────────────────────────────── */
  function _renderDetail(panel, snap) {
    const snapIdx = {
      'snap-1001': 0,
      'snap-2002': 1,
      'snap-3003': 2,
      'snap-4004': 3,
      'snap-current': 4,
    };
    const parentIds = [null, 1001729675574597001, 2002019143787970520, 3051729675574597004, 4004019143787970520];
    const manifestPaths = {
      'snap-1001': 's3://shopkart-lakehouse/…/snap-1001…avro',
      'snap-2002': 's3://shopkart-lakehouse/…/snap-2002…avro',
      'snap-3003': 's3://shopkart-lakehouse/…/snap-3051…-b4c9de.avro',
      'snap-4004': 's3://shopkart-lakehouse/…/snap-4004…avro',
      'snap-current': 's3://shopkart-lakehouse/warehouse/prod/orders/metadata/snap-8922019143787970520-1-a3f8bc.avro',
    };
    const idx = snapIdx[snap.id] !== undefined ? snapIdx[snap.id] : 4;
    const parentId = parentIds[idx];

    function row(key, val, cls = '') {
      return `<div class="snex-detail-row">
        <div class="snex-detail-key">${key}</div>
        <div class="snex-detail-val ${cls}">${val}</div>
      </div>`;
    }

    panel.innerHTML = `
      ${row('snapshot-id',        snap.snapshotId.toString().substring(0, 19))}
      ${row('parent-snapshot-id', parentId ? parentId.toString().substring(0, 19) : '<em style="opacity:.5">null (first snapshot)</em>')}
      ${row('timestamp',          snap.timestamp)}
      ${row('operation',          `<span style="color:${_opColor(snap.operation)};font-weight:600">${snap.operation}</span>`)}
      ${row('status',             `<span style="color:${snap.status === 'current' ? 'var(--green)' : snap.status === 'rolled-back' ? 'var(--red)' : 'var(--text-muted)'};font-weight:600">${snap.status}</span>`)}
      ${row('added-files',        snap.addedFiles.toLocaleString())}
      ${row('total-records',      snap.totalRecords)}
      ${row('description',        `<em style="color:var(--text-secondary)">${snap.description}</em>`)}
      ${row('manifest-list',      `<span class="path" style="font-size:9px;word-break:break-all;color:var(--blue)">${manifestPaths[snap.id] || '—'}</span>`)}
      ${snap.tag ? row('tag', `<span style="color:var(--purple);font-weight:600">${snap.tag}</span>`) : ''}
    `;
  }

  /* ── Build time-travel panel ────────────────────────────── */
  function _renderTimeTravel(panel, snap) {
    const ts = snap.timestamp.replace(' UTC', '');
    const sql1 = `-- Time travel by snapshot ID
SELECT *
FROM shopkart.prod.orders
VERSION AS OF ${snap.snapshotId};`;

    const sql2 = `-- Time travel by timestamp
SELECT *
FROM shopkart.prod.orders
TIMESTAMP AS OF '${ts}';`;

    const sql3 = `-- PySpark time travel
df = spark.read \\
    .option("snapshot-id", "${snap.snapshotId}") \\
    .table("shopkart.prod.orders")`;

    const expireSQL = D().sql.expireSnapshots;

    panel.innerHTML = `
      <div class="snex-tt-query">
        <div style="font-size:var(--text-xs);font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">By Snapshot ID</div>
        ${IV.CodeViewer.create(sql1, 'sql', 'VERSION AS OF').outerHTML}
      </div>
      <div class="snex-tt-query">
        <div style="font-size:var(--text-xs);font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">By Timestamp</div>
        ${IV.CodeViewer.create(sql2, 'sql', 'TIMESTAMP AS OF').outerHTML}
      </div>
      <div class="snex-tt-query">
        <div style="font-size:var(--text-xs);font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">PySpark API</div>
        ${IV.CodeViewer.create(sql3, 'python', 'PySpark time travel').outerHTML}
      </div>
      <div class="snex-refs-wrap">
        <div class="snex-refs-title">Refs · Branches · Tags</div>
        <div class="snex-ref-row">
          <span class="snex-ref-type branch">branch</span>
          <span class="snex-ref-name">main</span>
          <span class="snex-ref-snap">→ snap-8922… </span>
          <span class="snex-ref-current">← CURRENT</span>
        </div>
        <div class="snex-ref-row">
          <span class="snex-ref-type tag">tag</span>
          <span class="snex-ref-name">q4_2024_close</span>
          <span class="snex-ref-snap">→ snap-3051… (7-year retention)</span>
        </div>
        <div style="margin-top:12px">
          ${IV.CodeViewer.create(expireSQL, 'sql', 'Expire Snapshots').outerHTML}
        </div>
      </div>
    `;
  }

  /* ── Module ─────────────────────────────────────────────── */
  const mod = {
    id: 'snapshot-explorer',
    title: 'Snapshot Explorer',
    group: 'metadata',

    render(container) {
      container.innerHTML = '';
      _injectStyles();

      const page = document.createElement('div');
      page.className = 'snex-page page-enter';

      page.innerHTML = `
        <div class="snex-header">
          <div class="snex-header-title">📸 Snapshot Explorer</div>
          <div class="snex-header-sub">Click any snapshot to inspect its metadata and generate time-travel queries. ShopKart orders table — 86.4 billion rows across 47 snapshots.</div>
        </div>

        <div class="snex-timeline-wrap">
          <div class="snex-timeline-label">Snapshot chain — showing 5 of 47 snapshots</div>
          <div class="snex-timeline" id="snex-timeline"></div>
        </div>

        <div class="snex-bottom">
          <div class="snex-panel">
            <div class="snex-panel-header">
              📄 Snapshot Detail
              <span style="font-size:var(--text-xs);color:var(--text-muted);font-weight:400;margin-left:auto" id="snex-detail-snap-id">Click a snapshot above</span>
            </div>
            <div class="snex-panel-body" id="snex-detail-body">
              <div class="snex-empty-state">Select a snapshot to view its metadata properties</div>
            </div>
          </div>

          <div class="snex-panel">
            <div class="snex-panel-header">
              ⏱ Time-Travel &amp; Refs
              <span style="font-size:var(--text-xs);color:var(--text-muted);font-weight:400;margin-left:auto">SQL + PySpark</span>
            </div>
            <div class="snex-panel-body" id="snex-tt-body">
              <div class="snex-empty-state">Select a snapshot to generate time-travel queries</div>
            </div>
          </div>
        </div>
      `;

      container.appendChild(page);

      const snaps      = _snapshots();
      const timeline   = page.querySelector('#snex-timeline');
      const detailBody = page.querySelector('#snex-detail-body');
      const ttBody     = page.querySelector('#snex-tt-body');
      const detailId   = page.querySelector('#snex-detail-snap-id');

      _buildTimeline(timeline, snaps, (snap) => {
        if (detailId) detailId.textContent = snap.snapshotId.toString().substring(0, 10) + '…';
        _renderDetail(detailBody, snap);
        _renderTimeTravel(ttBody, snap);
      });

      // Auto-select current snapshot
      const currentSnap = snaps.find(s => s.status === 'current') || snaps[snaps.length - 1];
      const currentCard = timeline.querySelector(`[data-snap-id="${currentSnap.id}"]`);
      if (currentCard) currentCard.click();
    },

    destroy() {
      document.getElementById('snex-styles')?.remove();
    },
  };

  window.IcebergViz = window.IcebergViz || {};
  window.IcebergViz.modules = window.IcebergViz.modules || {};
  window.IcebergViz.modules['snapshot-explorer'] = mod;
})();
