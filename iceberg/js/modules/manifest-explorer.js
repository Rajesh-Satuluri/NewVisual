/* ============================================================
   Manifest Explorer Module
   Interactive: select a manifest, view data files, column
   stats, partition bounds, and the Avro schema.
   ============================================================ */

(function () {
  'use strict';

  const D  = () => window.IcebergViz.Data;
  const IV = window.IcebergViz;

  /* ── Styles ─────────────────────────────────────────────── */
  function _injectStyles() {
    if (document.getElementById('mfex-styles')) return;
    const s = document.createElement('style');
    s.id = 'mfex-styles';
    s.textContent = `
.mfex-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  padding: 24px 28px 0;
  box-sizing: border-box;
}

.mfex-header {
  flex-shrink: 0;
  margin-bottom: 16px;
}
.mfex-header-title {
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 4px;
}
.mfex-header-sub {
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.mfex-body {
  flex: 1;
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 18px;
  min-height: 0;
  overflow: hidden;
  padding-bottom: 24px;
}

/* ── LEFT: manifest cards ── */
.mfex-cards-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
}

.mfex-manifest-card {
  background: var(--bg-2);
  border: 1.5px solid var(--border-default);
  border-radius: 8px;
  padding: 12px 14px;
  cursor: pointer;
  transition: border-color .15s, background .15s, box-shadow .15s;
}
.mfex-manifest-card:hover {
  border-color: var(--border-subtle);
  background: var(--bg-3);
}
.mfex-manifest-card.selected {
  border-color: var(--blue);
  background: rgba(74,174,255,0.06);
  box-shadow: 0 0 0 1px rgba(74,174,255,0.15);
}
.mfex-manifest-card.delete-manifest {
  border-color: rgba(248,81,73,0.35);
}
.mfex-manifest-card.delete-manifest.selected {
  border-color: var(--red);
  background: rgba(248,81,73,0.05);
}

.mfex-card-top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.mfex-card-icon { font-size: 18px; }
.mfex-card-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-primary);
}
.mfex-card-subtitle {
  font-size: 10px;
  color: var(--text-muted);
  font-family: var(--font-mono);
  margin-bottom: 8px;
  word-break: break-all;
}
.mfex-card-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  font-size: 10px;
}
.mfex-card-stat {
  background: var(--bg-3);
  border-radius: 4px;
  padding: 3px 6px;
  color: var(--text-secondary);
}
.mfex-card-stat strong {
  display: block;
  font-size: 12px;
  font-weight: 700;
  color: var(--text-primary);
  font-family: var(--font-mono);
}
.mfex-status-badge {
  display: inline-block;
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: 3px;
  margin-top: 6px;
}
.mfex-status-added    { background: rgba(63,185,80,0.15); color: var(--green); }
.mfex-status-existing { background: rgba(88,166,255,0.1); color: var(--blue); }
.mfex-status-delete   { background: rgba(248,81,73,0.1);  color: var(--red); }

/* ── RIGHT: detail panel ── */
.mfex-detail-panel {
  background: var(--bg-2);
  border: 1px solid var(--border-default);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Tabs */
.mfex-tabs {
  display: flex;
  align-items: center;
  gap: 0;
  border-bottom: 1px solid var(--border-default);
  padding: 0 16px;
  background: var(--bg-2);
  flex-shrink: 0;
}
.mfex-tab-btn {
  padding: 12px 16px;
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-muted);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: color .12s, border-color .12s;
  white-space: nowrap;
}
.mfex-tab-btn:hover { color: var(--text-secondary); }
.mfex-tab-btn.active { color: var(--blue); border-bottom-color: var(--blue); }

.mfex-tab-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

/* Data files table */
.mfex-files-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-xs);
}
.mfex-files-table th {
  text-align: left;
  padding: 6px 8px;
  border-bottom: 1px solid var(--border-default);
  color: var(--text-muted);
  font-weight: 600;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: .04em;
  white-space: nowrap;
}
.mfex-files-table td {
  padding: 6px 8px;
  border-bottom: 1px solid var(--border-subtle);
  color: var(--text-secondary);
  font-family: var(--font-mono);
  font-size: 10px;
  vertical-align: top;
}
.mfex-files-table tr:last-child td { border-bottom: none; }
.mfex-files-table tr:hover td { background: var(--bg-3); }
.mfex-path-cell {
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--blue);
  cursor: default;
}
.mfex-expand-row { background: var(--bg-3) !important; }
.mfex-expand-row td { padding: 0; }
.mfex-col-stats-inner {
  padding: 8px 12px;
  font-family: var(--font-mono);
  font-size: 9.5px;
  color: var(--text-secondary);
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}
.mfex-col-stat-item {
  background: var(--bg-4);
  border-radius: 4px;
  padding: 4px 8px;
}
.mfex-col-stat-key { color: var(--text-muted); font-size: 9px; }
.mfex-col-stat-range { color: var(--text-primary); font-size: 9.5px; margin-top: 1px; }

/* Column stats bar chart */
.mfex-bar-chart { padding: 4px 0; }
.mfex-bar-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}
.mfex-bar-label {
  width: 160px;
  flex-shrink: 0;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.mfex-bar-track {
  flex: 1;
  height: 14px;
  background: var(--bg-4);
  border-radius: 7px;
  overflow: hidden;
}
.mfex-bar-fill {
  height: 100%;
  border-radius: 7px;
  background: var(--blue);
  transition: width .4s ease;
}
.mfex-bar-val {
  width: 60px;
  flex-shrink: 0;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-muted);
  text-align: right;
}

/* Partition bounds */
.mfex-bounds-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.mfex-bound-card {
  background: var(--bg-3);
  border: 1px solid var(--border-default);
  border-radius: 6px;
  padding: 10px 12px;
}
.mfex-bound-col { font-size: 10px; color: var(--text-muted); font-family: var(--font-mono); margin-bottom: 4px; }
.mfex-bound-range { display: flex; align-items: center; gap: 8px; font-family: var(--font-mono); font-size: 11px; color: var(--text-primary); }
.mfex-bound-sep { color: var(--text-muted); font-size: 10px; }

.mfex-empty-state {
  color: var(--text-muted);
  font-size: var(--text-sm);
  text-align: center;
  padding: 48px 0;
}
`;
    document.head.appendChild(s);
  }

  /* ── Manifest data ──────────────────────────────────────── */
  function _manifests() {
    const brEntries = D().manifestFileEntry.entries;

    const usEntries = [
      {
        "status": 1,
        "snapshot-id": 8922019143787970520,
        "sequence-number": 47,
        "data-file": {
          "content": 0,
          "file-path": "s3://shopkart-lakehouse/warehouse/prod/orders/data/order_date_day=2024-11-29/country_code=US/part-00000-g7h8.parquet",
          "file-format": "PARQUET",
          "partition": { "order_date_day": 20058, "country_code": "US" },
          "record-count": 52841,
          "file-size-in-bytes": 127926272,
          "null-value-counts": { "4": 0, "6": 892, "8": 1021 },
          "lower-bounds": { "1": "20000001", "3": "2024-11-29", "4": "5.99",  "5": "US" },
          "upper-bounds": { "1": "20052841", "3": "2024-11-29", "4": "5299.99","5": "US" }
        }
      },
      {
        "status": 1,
        "snapshot-id": 8922019143787970520,
        "sequence-number": 47,
        "data-file": {
          "content": 0,
          "file-path": "s3://shopkart-lakehouse/warehouse/prod/orders/data/order_date_day=2024-11-29/country_code=US/part-00001-i9j0.parquet",
          "file-format": "PARQUET",
          "partition": { "order_date_day": 20058, "country_code": "US" },
          "record-count": 48920,
          "file-size-in-bytes": 131072000,
          "null-value-counts": { "4": 0, "6": 1105, "8": 883 },
          "lower-bounds": { "1": "20052842", "3": "2024-11-29", "4": "8.99",  "5": "US" },
          "upper-bounds": { "1": "20101762", "3": "2024-11-29", "4": "4799.00","5": "US" }
        }
      }
    ];

    const deEntries = [
      {
        "status": 1,
        "snapshot-id": 8922019143787970520,
        "sequence-number": 47,
        "data-file": {
          "content": 0,
          "file-path": "s3://shopkart-lakehouse/warehouse/prod/orders/data/order_date_day=2024-11-29/country_code=DE/part-00000-m3n4.parquet",
          "file-format": "PARQUET",
          "partition": { "order_date_day": 20058, "country_code": "DE" },
          "record-count": 18493,
          "file-size-in-bytes": 128974848,
          "null-value-counts": { "4": 0, "6": 412, "8": 287 },
          "lower-bounds": { "1": "30000001", "3": "2024-11-29", "4": "9.99",  "5": "DE" },
          "upper-bounds": { "1": "30018493", "3": "2024-11-29", "4": "3999.00","5": "DE" }
        }
      }
    ];

    return [
      {
        id: 'manifest-br',
        label: 'BR · 2024-11-29',
        filename: 'a1b2c3d4-manifest.avro',
        partition: 'country_code=BR, order_date_day=2024-11-29',
        fileCount: 3,
        totalSize: '403 MB',
        totalSizeBytes: 422936064,
        manifestSize: '4.2 MB',
        status: 'ADDED',
        entries: brEntries,
        icon: '📊',
        color: 'var(--blue)',
      },
      {
        id: 'manifest-us',
        label: 'US · 2024-11-29',
        filename: 'e5f6g7h8-manifest.avro',
        partition: 'country_code=US, order_date_day=2024-11-29',
        fileCount: 389,
        totalSize: '48.2 GB',
        totalSizeBytes: 51758366720,
        manifestSize: '18.7 MB',
        status: 'ADDED',
        entries: usEntries,
        icon: '📊',
        color: 'var(--green)',
      },
      {
        id: 'manifest-de',
        label: 'DE · 2024-11-29',
        filename: 'i9j0k1l2-manifest.avro',
        partition: 'country_code=DE, order_date_day=2024-11-29',
        fileCount: 47,
        totalSize: '5.9 GB',
        totalSizeBytes: 6341787648,
        manifestSize: '2.1 MB',
        status: 'ADDED',
        entries: deEntries,
        icon: '📊',
        color: 'var(--purple)',
      },
      {
        id: 'manifest-del',
        label: 'Delete Manifest',
        filename: 'del-f1e2d3c4-manifest.avro',
        partition: 'country_code=DE, order_date_day=2024-01-19',
        fileCount: 1,
        totalSize: '0 MB',
        totalSizeBytes: 0,
        manifestSize: '0.3 MB',
        status: 'DELETE',
        entries: [],
        icon: '🗑',
        color: 'var(--red)',
        deleteNote: 'Positional delete file from Fraud Delete operation (snap-4004). Contains row-level delete markers pointing back to original data files.',
      },
    ];
  }

  /* ── Avro schema constant ───────────────────────────────── */
  const AVRO_SCHEMA = JSON.stringify({
    "type": "record",
    "name": "manifest_entry",
    "fields": [
      { "name": "status",          "type": "int",    "doc": "0=EXISTING, 1=ADDED, 2=DELETED" },
      { "name": "snapshot_id",     "type": ["null","long"] },
      { "name": "sequence_number", "type": ["null","long"] },
      { "name": "data_file", "type": {
        "type": "record", "name": "r2",
        "fields": [
          { "name": "content",            "type": "int",    "doc": "0=DATA, 1=POSITION_DELETES, 2=EQUALITY_DELETES" },
          { "name": "file_path",          "type": "string" },
          { "name": "file_format",        "type": "string", "doc": "PARQUET|ORC|AVRO" },
          { "name": "partition",          "type": { "type": "record", "name": "r102", "fields": [
            { "name": "order_date_day", "type": ["null","int"] },
            { "name": "country_code",   "type": ["null","string"] }
          ]}},
          { "name": "record_count",       "type": "long" },
          { "name": "file_size_in_bytes", "type": "long" },
          { "name": "column_sizes",       "type": ["null",{"type":"map","values":"long"}] },
          { "name": "value_counts",       "type": ["null",{"type":"map","values":"long"}] },
          { "name": "null_value_counts",  "type": ["null",{"type":"map","values":"long"}] },
          { "name": "lower_bounds",       "type": ["null",{"type":"map","values":"bytes"}] },
          { "name": "upper_bounds",       "type": ["null",{"type":"map","values":"bytes"}] }
        ]
      }}
    ]
  }, null, 2);

  /* ── Render: Data Files tab ─────────────────────────────── */
  function _renderDataFiles(container, manifest) {
    if (manifest.deleteNote) {
      container.innerHTML = `
        <div style="background:rgba(248,81,73,0.07);border:1px solid rgba(248,81,73,0.3);border-radius:8px;padding:14px 16px;margin-bottom:14px">
          <div style="font-size:var(--text-sm);font-weight:600;color:var(--red);margin-bottom:6px">Delete Manifest</div>
          <div style="font-size:var(--text-xs);color:var(--text-secondary);line-height:1.6">${manifest.deleteNote}</div>
        </div>
        <div style="font-size:var(--text-xs);color:var(--text-muted)">Delete files contain offset-based row position markers (for positional deletes) or equality condition rows (for equality deletes). They are merged with data files at read time by the Iceberg reader.</div>
      `;
      return;
    }

    const entries = manifest.entries;
    const MAX_DISPLAY = 5; // show up to 5 file rows

    let rows = '';
    const display = entries.slice(0, MAX_DISPLAY);

    display.forEach((entry, idx) => {
      const df = entry['data-file'];
      const path = df['file-path'];
      const shortPath = path.split('/').slice(-1)[0];
      const records = (df['record-count'] || 0).toLocaleString();
      const sizeMB = ((df['file-size-in-bytes'] || 0) / 1048576).toFixed(1) + ' MB';
      const status = entry.status === 1 ? 'ADDED' : entry.status === 0 ? 'EXISTING' : 'DELETED';
      const statusClass = status === 'ADDED' ? 'mfex-status-added' : status === 'EXISTING' ? 'mfex-status-existing' : 'mfex-status-delete';

      const lower = df['lower-bounds'] || {};
      const upper = df['upper-bounds'] || {};

      rows += `
        <tr class="mfex-file-row" data-idx="${idx}">
          <td class="mfex-path-cell" title="${path}">🗄 ${shortPath}</td>
          <td>PARQUET</td>
          <td>${records}</td>
          <td>${sizeMB}</td>
          <td><span class="mfex-status-badge ${statusClass}">${status}</span></td>
          <td><button style="background:none;border:1px solid var(--border-default);border-radius:4px;color:var(--text-muted);font-size:9px;padding:2px 6px;cursor:pointer" data-expand="${idx}">▼ stats</button></td>
        </tr>
        <tr class="mfex-expand-row" id="mfex-expand-${idx}" style="display:none">
          <td colspan="6">
            <div class="mfex-col-stats-inner">
              ${Object.entries(lower).map(([colId, lo]) => {
                const hi = upper[colId] || '—';
                const colNames = {'1':'order_id','2':'customer_id','3':'order_date','4':'order_timestamp','5':'country_code','6':'total_amount'};
                const name = colNames[colId] || `col-${colId}`;
                return `<div class="mfex-col-stat-item"><div class="mfex-col-stat-key">col ${colId}: ${name}</div><div class="mfex-col-stat-range">${lo} → ${hi}</div></div>`;
              }).join('')}
            </div>
          </td>
        </tr>
      `;
    });

    const extra = entries.length > MAX_DISPLAY
      ? `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);font-size:10px;padding:8px">… and ${entries.length - MAX_DISPLAY} more files (showing ${MAX_DISPLAY} of ${manifest.fileCount})</td></tr>`
      : '';

    container.innerHTML = `
      <div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:10px">
        <strong style="color:var(--text-secondary)">${manifest.fileCount}</strong> data files ·
        <strong style="color:var(--text-secondary)">${manifest.totalSize}</strong> total ·
        manifest size: ${manifest.manifestSize}
      </div>
      <div style="overflow-x:auto">
        <table class="mfex-files-table">
          <thead>
            <tr>
              <th>File Path</th>
              <th>Format</th>
              <th>Records</th>
              <th>Size</th>
              <th>Status</th>
              <th>Stats</th>
            </tr>
          </thead>
          <tbody id="mfex-files-tbody">${rows}${extra}</tbody>
        </table>
      </div>
    `;

    // Wire expand buttons
    container.querySelectorAll('[data-expand]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = btn.dataset.expand;
        const expandRow = container.querySelector(`#mfex-expand-${idx}`);
        if (!expandRow) return;
        const isOpen = expandRow.style.display !== 'none';
        expandRow.style.display = isOpen ? 'none' : 'table-row';
        btn.textContent = isOpen ? '▼ stats' : '▲ hide';
      });
    });
  }

  /* ── Render: Column Stats bar chart ────────────────────── */
  function _renderColStats(container, manifest) {
    if (!manifest.entries.length) {
      container.innerHTML = '<div class="mfex-empty-state">No data files in this manifest.</div>';
      return;
    }

    const maxRecords = Math.max(...manifest.entries.map(e => e['data-file']['record-count'] || 0));

    let bars = manifest.entries.map((entry, i) => {
      const df = entry['data-file'];
      const count = df['record-count'] || 0;
      const sizeMB = ((df['file-size-in-bytes'] || 0) / 1048576).toFixed(1);
      const shortName = df['file-path'].split('/').slice(-1)[0].substring(0, 28);
      const pct = maxRecords > 0 ? (count / maxRecords * 100).toFixed(1) : 0;
      return `
        <div class="mfex-bar-row">
          <div class="mfex-bar-label" title="${df['file-path']}">${shortName}</div>
          <div class="mfex-bar-track">
            <div class="mfex-bar-fill" style="width:${pct}%;background:var(--blue)"></div>
          </div>
          <div class="mfex-bar-val">${count.toLocaleString()}</div>
        </div>
      `;
    }).join('');

    if (manifest.fileCount > manifest.entries.length) {
      bars += `<div style="text-align:center;color:var(--text-muted);font-size:10px;margin-top:8px">Showing ${manifest.entries.length} of ${manifest.fileCount} files</div>`;
    }

    container.innerHTML = `
      <div style="font-size:var(--text-xs);font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:14px">Row Count per File</div>
      <div class="mfex-bar-chart">${bars}</div>
      <div style="margin-top:16px;font-size:var(--text-xs);color:var(--text-muted);border-top:1px solid var(--border-default);padding-top:12px">
        Each bar represents one Parquet data file. Uniform bar heights indicate good task parallelism and no data skew.
        Target file size: <strong style="color:var(--text-secondary)">128 MB</strong>.
      </div>
    `;
  }

  /* ── Render: Partition Bounds ───────────────────────────── */
  function _renderPartitionBounds(container, manifest) {
    const mle = D().manifestListEntry;
    const entry = mle.entries.find(e => {
      const p = e['manifest-path'] || '';
      return manifest.id === 'manifest-br' ? p.includes('a1b2') :
             manifest.id === 'manifest-us' ? p.includes('e5f6') :
             manifest.id === 'manifest-de' ? p.includes('i9j0') : false;
    });

    if (!entry) {
      container.innerHTML = `
        <div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:12px">
          Partition bounds from the <strong>manifest list entry</strong> for this manifest.
          Used for manifest-level pruning — entire manifests are skipped without opening them.
        </div>
        <div class="mfex-bounds-grid">
          <div class="mfex-bound-card">
            <div class="mfex-bound-col">order_date_day (transform: day)</div>
            <div class="mfex-bound-range">2024-11-29 <span class="mfex-bound-sep">→</span> 2024-11-29</div>
          </div>
          <div class="mfex-bound-card">
            <div class="mfex-bound-col">country_code (transform: identity)</div>
            <div class="mfex-bound-range">${manifest.label.substring(0,2)} <span class="mfex-bound-sep">→</span> ${manifest.label.substring(0,2)}</div>
          </div>
        </div>
      `;
      return;
    }

    const partitions = entry['partitions'] || [];
    const colNames = ['order_date_day (day transform)', 'country_code (identity)'];

    container.innerHTML = `
      <div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:14px">
        These bounds come from the <strong style="color:var(--text-secondary)">manifest list</strong> entry for this manifest.
        A query's partition predicate is evaluated against these bounds — if no overlap, the manifest is entirely skipped.
      </div>
      <div class="mfex-bounds-grid">
        ${partitions.map((p, i) => `
          <div class="mfex-bound-card">
            <div class="mfex-bound-col">${colNames[i] || 'column ' + i}</div>
            <div class="mfex-bound-range">
              <span style="color:var(--green)">${p['lower-bound']}</span>
              <span class="mfex-bound-sep">→</span>
              <span style="color:var(--orange)">${p['upper-bound']}</span>
            </div>
            <div style="font-size:9px;color:var(--text-muted);margin-top:4px">contains-null: ${p['contains-null']}</div>
          </div>
        `).join('')}
      </div>
      <div style="margin-top:14px">
        ${IV.CodeViewer.create(JSON.stringify(entry, null, 2), 'json', 'Manifest List Entry').outerHTML}
      </div>
    `;
  }

  /* ── Render: Avro Schema ────────────────────────────────── */
  function _renderAvroSchema(container) {
    container.innerHTML = `
      <div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:12px;line-height:1.6">
        All Iceberg manifest files use this standardized Avro schema. The schema is embedded in the Avro file header,
        making manifests self-describing. The <code style="font-family:var(--font-mono);color:var(--blue)">data_file.lower_bounds</code>
        and <code style="font-family:var(--font-mono);color:var(--blue)">upper_bounds</code> fields contain column-level min/max values,
        serialized as binary per the Iceberg single-value serialization spec.
      </div>
      ${IV.CodeViewer.create(AVRO_SCHEMA, 'json', 'Manifest Avro Schema').outerHTML}
    `;
  }

  /* ── Render detail pane ─────────────────────────────────── */
  function _renderDetail(detailPanel, manifest) {
    const tabsEl = detailPanel.querySelector('#mfex-tabs');
    const tabContent = detailPanel.querySelector('#mfex-tab-content');
    if (!tabsEl || !tabContent) return;

    const tabs = ['Data Files', 'Column Stats', 'Partition Bounds', 'Avro Schema'];
    let activeTab = 'Data Files';

    function renderTab(tab) {
      activeTab = tab;
      tabsEl.querySelectorAll('.mfex-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
      });
      tabContent.innerHTML = '';
      if (tab === 'Data Files')       _renderDataFiles(tabContent, manifest);
      if (tab === 'Column Stats')     _renderColStats(tabContent, manifest);
      if (tab === 'Partition Bounds') _renderPartitionBounds(tabContent, manifest);
      if (tab === 'Avro Schema')      _renderAvroSchema(tabContent);
    }

    tabsEl.innerHTML = tabs.map(t =>
      `<div class="mfex-tab-btn${t === activeTab ? ' active' : ''}" data-tab="${t}">${t}</div>`
    ).join('');

    tabsEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.mfex-tab-btn');
      if (btn) renderTab(btn.dataset.tab);
    });

    renderTab(activeTab);
  }

  /* ── Module ─────────────────────────────────────────────── */
  const mod = {
    id: 'manifest-explorer',
    title: 'Manifest Explorer',
    group: 'metadata',

    render(container) {
      container.innerHTML = '';
      _injectStyles();

      const page = document.createElement('div');
      page.className = 'mfex-page page-enter';

      page.innerHTML = `
        <div class="mfex-header">
          <div class="mfex-header-title">📊 Manifest Explorer</div>
          <div class="mfex-header-sub">Inspect manifest files for snapshot 8922019143787970520 — Black Friday 2024 append. Click a manifest to explore its data files, column statistics, partition bounds, and Avro schema.</div>
        </div>
        <div class="mfex-body">
          <div class="mfex-cards-panel" id="mfex-cards-panel"></div>
          <div class="mfex-detail-panel">
            <div class="mfex-tabs" id="mfex-tabs"></div>
            <div class="mfex-tab-content" id="mfex-tab-content">
              <div class="mfex-empty-state">Select a manifest to explore</div>
            </div>
          </div>
        </div>
      `;

      container.appendChild(page);

      const manifests = _manifests();
      const cardsPanel = page.querySelector('#mfex-cards-panel');
      const detailPanel = page.querySelector('.mfex-detail-panel');

      manifests.forEach((manifest) => {
        const card = document.createElement('div');
        const isDelete = manifest.status === 'DELETE';
        card.className = `mfex-manifest-card${isDelete ? ' delete-manifest' : ''}`;
        card.dataset.manifestId = manifest.id;

        const statusBadgeClass = isDelete ? 'mfex-status-delete' : 'mfex-status-added';

        card.innerHTML = `
          <div class="mfex-card-top">
            <div class="mfex-card-icon">${manifest.icon}</div>
            <div class="mfex-card-title" style="color:${manifest.color}">${manifest.label}</div>
          </div>
          <div class="mfex-card-subtitle">${manifest.filename}</div>
          <div class="mfex-card-stats">
            <div class="mfex-card-stat"><strong>${manifest.fileCount}</strong>files</div>
            <div class="mfex-card-stat"><strong>${manifest.totalSize}</strong>total</div>
            <div class="mfex-card-stat"><strong>${manifest.manifestSize}</strong>manifest</div>
            <div class="mfex-card-stat"><strong>${manifest.entries.length > 0 ? manifest.entries[0]['data-file']['file-format'] : 'N/A'}</strong>format</div>
          </div>
          <div><span class="mfex-status-badge ${statusBadgeClass}">${manifest.status}</span></div>
        `;

        card.addEventListener('click', () => {
          cardsPanel.querySelectorAll('.mfex-manifest-card').forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
          _renderDetail(detailPanel, manifest);
        });

        cardsPanel.appendChild(card);
      });

      // Auto-select BR manifest
      const firstCard = cardsPanel.querySelector('.mfex-manifest-card');
      if (firstCard) firstCard.click();

      /* ── Draggable column resizer (manifest cards ↔ detail) ── */
      const body = page.querySelector('.mfex-body');
      if (body && window.IcebergViz.SplitPane) {
        mod._split = window.IcebergViz.SplitPane.attach(body, {
          key: 'iceberg/manifest-explorer',
          disableBelow: 720,
          tracks: [
            { min: 200, max: 460, def: 260 },  // manifest cards
            { flex: true, min: 300 },          // detail
          ],
        });
      }
    },

    destroy() {
      if (mod._split) { mod._split.detach(); mod._split = null; }
      document.getElementById('mfex-styles')?.remove();
    },
  };

  window.IcebergViz = window.IcebergViz || {};
  window.IcebergViz.modules = window.IcebergViz.modules || {};
  window.IcebergViz.modules['manifest-explorer'] = mod;
})();
