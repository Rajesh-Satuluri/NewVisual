/* ============================================================
   Schema Evolution Module
   8-step animation showing Iceberg schema evolution:
   ADD COLUMN → RENAME → UPDATE COLUMN → DROP COLUMN.
   Left panel: live schema table that mutates per step.
   Right panel: step list + ALTER TABLE SQL.
   ============================================================ */

(function () {
  'use strict';

  const D  = () => window.IcebergViz.Data;
  const IV = window.IcebergViz;

  /* ── Styles ─────────────────────────────────────────────── */
  function _injectStyles() {
    if (document.getElementById('schev-styles')) return;
    const s = document.createElement('style');
    s.id = 'schev-styles';
    s.textContent = `
.schev-page { display:flex; flex-direction:column; height:100%; overflow:hidden; }

.schev-outer {
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

/* ── Left: schema canvas ── */
.schev-canvas {
  flex: 1;
  padding: 24px 28px;
  overflow-y: auto;
  background: var(--bg-1);
  display: flex;
  flex-direction: column;
  gap: 0;
}

.schev-canvas-title {
  font-size: var(--text-base);
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 4px;
}
.schev-canvas-sub {
  font-size: var(--text-xs);
  color: var(--text-muted);
  margin-bottom: 20px;
  font-family: var(--font-mono);
}

.schev-schema-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-3);
  border: 1px solid var(--border-default);
  border-radius: 20px;
  padding: 4px 12px 4px 8px;
  font-size: var(--text-xs);
  color: var(--text-muted);
  margin-bottom: 16px;
  font-weight: 600;
}
.schev-schema-badge-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: var(--blue);
}

/* Schema table */
.schev-table-wrap {
  background: var(--bg-2);
  border: 1px solid var(--border-default);
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 20px;
}

.schev-table {
  width: 100%;
  border-collapse: collapse;
}
.schev-table th {
  text-align: left;
  padding: 8px 12px;
  background: var(--bg-3);
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .06em;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border-default);
  white-space: nowrap;
}
.schev-table td {
  padding: 9px 12px;
  border-bottom: 1px solid var(--border-subtle);
  font-size: var(--text-xs);
  font-family: var(--font-mono);
  color: var(--text-secondary);
  transition: background .25s, color .25s;
}
.schev-table tr:last-child td { border-bottom: none; }

/* Row animation states */
.schev-row-new td {
  background: rgba(63,185,80,0.12) !important;
  color: var(--text-primary);
}
.schev-row-changed td {
  background: rgba(88,166,255,0.08) !important;
  color: var(--text-primary);
}
.schev-row-dropped td {
  background: rgba(248,81,73,0.08) !important;
  color: var(--red) !important;
  text-decoration: line-through;
  opacity: 0.6;
}
.schev-row-highlight td {
  background: rgba(249,115,22,0.08) !important;
  color: var(--text-primary);
}

.schev-td-name { color: var(--text-primary); font-weight: 600; }
.schev-td-type { color: var(--blue); }
.schev-td-id   { color: var(--text-muted); }
.schev-td-req  { color: var(--text-muted); }
.schev-td-schema { color: var(--text-muted); }

/* Change log */
.schev-changelog {
  background: var(--bg-2);
  border: 1px solid var(--border-default);
  border-radius: 8px;
  padding: 12px 16px;
  font-size: var(--text-xs);
  color: var(--text-secondary);
  line-height: 1.6;
}
.schev-changelog-title {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .06em;
  color: var(--text-muted);
  margin-bottom: 8px;
}
.schev-change-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 4px 0;
  border-bottom: 1px solid var(--border-subtle);
  transition: all .3s;
}
.schev-change-item:last-child { border-bottom: none; }
.schev-change-icon { width: 16px; height: 16px; border-radius: 50%; display:flex; align-items:center; justify-content:center; font-size:9px; flex-shrink:0; margin-top:1px; }
.schev-change-icon.add  { background:rgba(63,185,80,0.2);  color:var(--green); }
.schev-change-icon.ren  { background:rgba(88,166,255,0.2); color:var(--blue); }
.schev-change-icon.upd  { background:rgba(249,115,22,0.2); color:var(--orange); }
.schev-change-icon.drop { background:rgba(248,81,73,0.2);  color:var(--red); }
.schev-change-text { color: var(--text-secondary); }

/* ── Right: sidebar ── */
.schev-sidebar {
  width: 360px;
  border-left: 1px solid var(--border-default);
  background: var(--bg-2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
}

.schev-sidebar-header {
  padding: 14px 18px;
  border-bottom: 1px solid var(--border-default);
  flex-shrink: 0;
}
.schev-sidebar-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}
.schev-sidebar-desc {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  line-height: 1.5;
  min-height: 36px;
}

.schev-steps-list {
  flex: 0 0 auto;
  overflow-y: auto;
  padding: 6px 0;
  border-bottom: 1px solid var(--border-default);
  max-height: 280px;
}

.schev-step-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 7px 16px;
  cursor: pointer;
  transition: background var(--ease-fast);
  border-left: 3px solid transparent;
  margin-bottom: 1px;
}
.schev-step-item:hover { background: var(--bg-3); }
.schev-step-item.active { background: rgba(74,174,255,0.07); border-left-color: var(--blue); }
.schev-step-item.done { opacity: 0.6; }

.schev-step-badge {
  width: 20px; height: 20px; border-radius: 50%;
  background: var(--bg-4); color: var(--text-muted);
  font-size: 10px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; margin-top: 1px;
  transition: background var(--ease-fast), color var(--ease-fast);
}
.schev-step-item.active .schev-step-badge { background: var(--blue); color: #fff; }
.schev-step-item.done   .schev-step-badge { background: var(--green); color: #fff; }

.schev-step-text { font-size: 12px; color: var(--text-secondary); line-height: 1.4; }
.schev-step-item.active .schev-step-text { color: var(--text-primary); font-weight: 500; }

.schev-code-panel { flex: 1; overflow-y: auto; padding: 10px; }
.schev-code-panel .code-block { margin: 0; }
`;
    document.head.appendChild(s);
  }

  /* ── Schema state machine ───────────────────────────────── */
  // Each step returns the full schema state at that point.
  // Rows: { id, name, type, required, schemaId, state: '' | 'new' | 'changed' | 'dropped' | 'highlight' }

  function _schemaAtStep(idx) {
    const base = [
      { id: 1, name: 'order_id',    type: 'BIGINT',  required: 'NOT NULL', schemaId: 'v0', state: '' },
      { id: 2, name: 'customer_id', type: 'BIGINT',  required: 'NOT NULL', schemaId: 'v0', state: '' },
      { id: 3, name: 'order_date',  type: 'DATE',    required: 'NOT NULL', schemaId: 'v0', state: '' },
    ];

    if (idx === 0) return base.map(r => ({...r, state: ''}));

    if (idx === 1) {
      return [
        ...base,
        { id: 4, name: 'status',        type: 'STRING', required: 'nullable', schemaId: 'v1', state: 'new' },
      ];
    }

    if (idx === 2) {
      return [
        ...base,
        { id: 4, name: 'status',        type: 'STRING', required: 'nullable', schemaId: 'v1', state: '' },
        { id: 5, name: 'order_total',   type: 'DOUBLE', required: 'nullable', schemaId: 'v1', state: 'new' },
      ];
    }

    if (idx === 3) {
      return [
        ...base,
        { id: 4, name: 'status',             type: 'STRING', required: 'nullable', schemaId: 'v1', state: '' },
        { id: 5, name: 'order_total',        type: 'DOUBLE', required: 'nullable', schemaId: 'v1', state: '' },
        { id: 6, name: 'estimated_delivery', type: 'DATE',   required: 'nullable', schemaId: 'v1', state: 'new' },
      ];
    }

    if (idx === 4) {
      // RENAME order_date → placed_date (id=3 unchanged)
      return [
        { id: 1, name: 'order_id',           type: 'BIGINT',  required: 'NOT NULL', schemaId: 'v0', state: '' },
        { id: 2, name: 'customer_id',        type: 'BIGINT',  required: 'NOT NULL', schemaId: 'v0', state: '' },
        { id: 3, name: 'placed_date',        type: 'DATE',    required: 'NOT NULL', schemaId: 'v2', state: 'changed' },
        { id: 4, name: 'status',             type: 'STRING',  required: 'nullable', schemaId: 'v1', state: '' },
        { id: 5, name: 'order_total',        type: 'DOUBLE',  required: 'nullable', schemaId: 'v1', state: '' },
        { id: 6, name: 'estimated_delivery', type: 'DATE',    required: 'nullable', schemaId: 'v1', state: '' },
      ];
    }

    if (idx === 5) {
      // UPDATE COLUMN status — add comment
      return [
        { id: 1, name: 'order_id',           type: 'BIGINT',  required: 'NOT NULL', schemaId: 'v0', state: '' },
        { id: 2, name: 'customer_id',        type: 'BIGINT',  required: 'NOT NULL', schemaId: 'v0', state: '' },
        { id: 3, name: 'placed_date',        type: 'DATE',    required: 'NOT NULL', schemaId: 'v2', state: '' },
        { id: 4, name: 'status',             type: 'STRING',  required: 'nullable', schemaId: 'v2', state: 'highlight', comment: 'COMPLETED|PENDING|CANCELLED|REFUNDED' },
        { id: 5, name: 'order_total',        type: 'DOUBLE',  required: 'nullable', schemaId: 'v1', state: '' },
        { id: 6, name: 'estimated_delivery', type: 'DATE',    required: 'nullable', schemaId: 'v1', state: '' },
      ];
    }

    if (idx === 6) {
      // DROP COLUMN estimated_delivery (id=6 retired)
      return [
        { id: 1, name: 'order_id',           type: 'BIGINT',  required: 'NOT NULL', schemaId: 'v0', state: '' },
        { id: 2, name: 'customer_id',        type: 'BIGINT',  required: 'NOT NULL', schemaId: 'v0', state: '' },
        { id: 3, name: 'placed_date',        type: 'DATE',    required: 'NOT NULL', schemaId: 'v2', state: '' },
        { id: 4, name: 'status',             type: 'STRING',  required: 'nullable', schemaId: 'v2', state: '' },
        { id: 5, name: 'order_total',        type: 'DOUBLE',  required: 'nullable', schemaId: 'v1', state: '' },
        { id: 6, name: 'estimated_delivery', type: 'DATE',    required: 'nullable', schemaId: 'v1', state: 'dropped' },
      ];
    }

    // idx === 7: Final schema v3
    return [
      { id: 1, name: 'order_id',    type: 'BIGINT',  required: 'NOT NULL', schemaId: 'v3', state: '' },
      { id: 2, name: 'customer_id', type: 'BIGINT',  required: 'NOT NULL', schemaId: 'v3', state: '' },
      { id: 3, name: 'placed_date', type: 'DATE',    required: 'NOT NULL', schemaId: 'v3', state: '' },
      { id: 4, name: 'status',      type: 'STRING',  required: 'nullable', schemaId: 'v3', state: '' },
      { id: 5, name: 'order_total', type: 'DOUBLE',  required: 'nullable', schemaId: 'v3', state: '' },
    ];
  }

  /* ── Step metadata ──────────────────────────────────────── */
  function _getStepsData() {
    const schemaJson = JSON.stringify(D().metadataJson.content.schemas[1], null, 2);

    return [
      {
        label: 'Original Schema v0',
        description: 'ShopKart deployed April 2022 with 3 columns. Column IDs 1–3 are permanent. The schema-id=0 spec will be kept in metadata.json forever for historical file compatibility.',
        code: `-- Original schema: 3 columns
-- Deployed: April 2022

CREATE TABLE shopkart.prod.orders (
  order_id     BIGINT NOT NULL COMMENT 'Unique order identifier',
  customer_id  BIGINT NOT NULL COMMENT 'FK to customers table',
  order_date   DATE   NOT NULL COMMENT 'Date order was placed'
)
USING iceberg
PARTITIONED BY (days(order_date));`,
        lang: 'sql', codeTitle: 'Schema v0 — Original DDL',
        schemaVersion: 'Schema v0 · 3 columns',
        changeLog: [],
      },
      {
        label: 'ADD COLUMN status STRING',
        description: 'Column status STRING added. Column ID=4 assigned — IDs are permanent, never reused. Existing Parquet files are NOT rewritten. Old files return NULL for status.',
        code: `-- ADD COLUMN (milliseconds, zero downtime)
ALTER TABLE shopkart.prod.orders
ADD COLUMN status STRING
COMMENT 'Order status: PENDING, COMPLETED, CANCELLED, REFUNDED';

-- Old Parquet files are NOT rewritten.
-- Readers with schema-id=3 will see NULL for status
-- in files written under schema-id=0.
-- Column ID=4 is permanent and unique.`,
        lang: 'sql', codeTitle: 'ALTER TABLE ADD COLUMN status',
        schemaVersion: 'Schema v1 · 4 columns',
        changeLog: [{ type: 'add', text: 'Added status STRING (id=4, nullable)' }],
      },
      {
        label: 'ADD COLUMN order_total DOUBLE',
        description: 'Column order_total DOUBLE added as ID=5. NULL for all historical rows until a backfill job runs. The ADD COLUMN itself completes in milliseconds — no file rewrite.',
        code: `-- ADD COLUMN order_total
ALTER TABLE shopkart.prod.orders
ADD COLUMN order_total DOUBLE
COMMENT 'Order total in USD';

-- NULL for all historical rows until backfill.
-- Writers using the new schema will populate this field.
-- Writers using the old schema (schema-id=0) will produce NULL.`,
        lang: 'sql', codeTitle: 'ALTER TABLE ADD COLUMN order_total',
        schemaVersion: 'Schema v1 · 5 columns',
        changeLog: [
          { type: 'add', text: 'Added status STRING (id=4)' },
          { type: 'add', text: 'Added order_total DOUBLE (id=5, nullable)' },
        ],
      },
      {
        label: 'ADD COLUMN estimated_delivery DATE',
        description: 'Column estimated_delivery DATE added as ID=6. This column was added during incident SK-2023-0908 to track delivery SLAs. It will later be dropped in step 7.',
        code: `-- ADD COLUMN estimated_delivery
ALTER TABLE shopkart.prod.orders
ADD COLUMN estimated_delivery DATE
COMMENT 'Expected delivery date';

-- Related incident: SK-2023-0908
-- Column added to support SLA tracking initiative.
-- (Later deprecated — see step 7: DROP COLUMN)`,
        lang: 'sql', codeTitle: 'ALTER TABLE ADD COLUMN estimated_delivery',
        schemaVersion: 'Schema v1 · 6 columns',
        changeLog: [
          { type: 'add', text: 'Added status STRING (id=4)' },
          { type: 'add', text: 'Added order_total DOUBLE (id=5)' },
          { type: 'add', text: 'Added estimated_delivery DATE (id=6)' },
        ],
      },
      {
        label: 'RENAME COLUMN order_date → placed_date',
        description: 'Column ID=3 keeps its permanent ID. Only the name changes in metadata.json. Any reader that references column by ID=3 continues to work. No data rewritten.',
        code: `-- RENAME COLUMN (metadata-only change)
ALTER TABLE shopkart.prod.orders
RENAME COLUMN order_date TO placed_date;

-- Key insight: column ID=3 never changes.
-- Readers that reference column-id=3 still work perfectly.
-- Hive readers using column name would break — Iceberg doesn't.
-- This is why Iceberg uses column IDs, not names, for schema evolution.`,
        lang: 'sql', codeTitle: 'ALTER TABLE RENAME COLUMN',
        schemaVersion: 'Schema v2 · 6 columns',
        changeLog: [
          { type: 'add', text: 'Added status STRING (id=4)' },
          { type: 'add', text: 'Added order_total DOUBLE (id=5)' },
          { type: 'add', text: 'Added estimated_delivery DATE (id=6)' },
          { type: 'ren', text: 'Renamed order_date → placed_date (id=3 unchanged)' },
        ],
      },
      {
        label: 'UPDATE COLUMN — add doc comment',
        description: 'Adds a documentation comment to status describing the valid values. This is a metadata-only change — no data rewrite. Useful for self-documenting schema.',
        code: `-- UPDATE COLUMN: add documentation comment
ALTER TABLE shopkart.prod.orders
ALTER COLUMN status
COMMENT 'COMPLETED|PENDING|CANCELLED|REFUNDED';

-- Metadata-only change. Column doc is stored in
-- metadata.json → schema.fields[].doc field.
-- No data files touched.`,
        lang: 'sql', codeTitle: 'ALTER TABLE ALTER COLUMN COMMENT',
        schemaVersion: 'Schema v2 · 6 columns',
        changeLog: [
          { type: 'add', text: 'Added status STRING (id=4)' },
          { type: 'add', text: 'Added order_total DOUBLE (id=5)' },
          { type: 'add', text: 'Added estimated_delivery DATE (id=6)' },
          { type: 'ren', text: 'Renamed order_date → placed_date (id=3)' },
          { type: 'upd', text: 'Updated status doc comment (id=4)' },
        ],
      },
      {
        label: 'DROP COLUMN estimated_delivery',
        description: 'Column ID=6 is dropped. ID=6 is permanently retired — it will never be reused. Old files written with ID=6 are still readable (the data is ignored). This action is irreversible.',
        code: `-- DROP COLUMN (WARNING: irreversible)
ALTER TABLE shopkart.prod.orders
DROP COLUMN estimated_delivery;

-- Column ID=6 is PERMANENTLY RETIRED.
-- It will never be reused (protects against schema confusion).
-- Old Parquet files still contain the column bytes,
-- but readers using the current schema will ignore them.
--
-- To recover: you would need to ADD COLUMN with a NEW id (e.g. id=7).`,
        lang: 'sql', codeTitle: 'ALTER TABLE DROP COLUMN',
        schemaVersion: 'Schema v2→v3 · dropping col',
        changeLog: [
          { type: 'add', text: 'Added status STRING (id=4)' },
          { type: 'add', text: 'Added order_total DOUBLE (id=5)' },
          { type: 'add', text: 'Added estimated_delivery DATE (id=6)' },
          { type: 'ren', text: 'Renamed order_date → placed_date (id=3)' },
          { type: 'upd', text: 'Updated status doc (id=4)' },
          { type: 'drop', text: 'Dropped estimated_delivery (id=6 retired)' },
        ],
      },
      {
        label: 'Schema v3 — Final',
        description: 'Current schema (schema-id=3) matches the metadata.json current-schema-id. All 5 columns are active. ID=6 is retired. The schema history is preserved for historical file reads.',
        code: schemaJson,
        lang: 'json', codeTitle: 'Current schema (schema-id: 3) from metadata.json',
        schemaVersion: 'Schema v3 · 5 columns · FINAL',
        changeLog: [
          { type: 'add', text: 'Added status STRING (id=4)' },
          { type: 'add', text: 'Added order_total DOUBLE (id=5)' },
          { type: 'ren', text: 'Renamed order_date → placed_date (id=3)' },
          { type: 'upd', text: 'Updated status doc (id=4)' },
          { type: 'drop', text: 'Dropped estimated_delivery (id=6 — retired)' },
        ],
      },
    ];
  }

  /* ── Render schema table ────────────────────────────────── */
  function _renderSchema(canvas, stepIdx) {
    const rows = _schemaAtStep(stepIdx);
    const stepsData = _getStepsData();
    const step = stepsData[stepIdx];

    const tableBody = canvas.querySelector('#schev-table-body');
    const badgeEl   = canvas.querySelector('#schev-schema-badge-text');
    const changeLog = canvas.querySelector('#schev-changelog');
    if (!tableBody) return;

    // Update schema version badge
    if (badgeEl) badgeEl.textContent = step.schemaVersion;

    // Render rows
    tableBody.innerHTML = rows.map(row => {
      const rowClass = row.state ? `schev-row-${row.state}` : '';
      return `<tr class="${rowClass}" data-col-id="${row.id}">
        <td class="schev-td-name">${row.name}${row.comment ? `<span style="color:var(--text-muted);font-weight:400;font-size:9px;margin-left:6px">// ${row.comment}</span>` : ''}</td>
        <td class="schev-td-type">${row.type}</td>
        <td class="schev-td-id">${row.id}</td>
        <td class="schev-td-req">${row.required}</td>
        <td class="schev-td-schema">${row.schemaId}</td>
      </tr>`;
    }).join('');

    // Render change log
    if (changeLog) {
      if (step.changeLog.length === 0) {
        changeLog.innerHTML = `<div class="schev-changelog-title">Changes from v0</div><div style="font-size:var(--text-xs);color:var(--text-muted)">(none — original schema)</div>`;
      } else {
        const icons = { add: '+', ren: '↺', upd: '✎', drop: '✕' };
        changeLog.innerHTML = `
          <div class="schev-changelog-title">Cumulative Changes from v0</div>
          ${step.changeLog.map(c => `
            <div class="schev-change-item">
              <div class="schev-change-icon ${c.type}">${icons[c.type]}</div>
              <div class="schev-change-text">${c.text}</div>
            </div>
          `).join('')}
        `;
      }
    }
  }

  /* ── Animation steps ────────────────────────────────────── */
  function _buildAnimationSteps(canvas) {
    return Array.from({ length: 8 }, (_, i) =>
      IV.AnimationEngine.fnStep(
        _getStepsData()[i].label,
        '',
        (ctx) => { _renderSchema(canvas, i); },
        (ctx) => {
          if (i > 0) _renderSchema(canvas, i - 1);
          else       _renderSchema(canvas, 0);
        },
        2500
      )
    );
  }

  /* ── Module ─────────────────────────────────────────────── */
  const mod = {
    id: 'schema-evolution',
    title: 'Schema Evolution',
    group: 'metadata',
    _engine: null,

    render(container) {
      container.innerHTML = '';
      _injectStyles();

      const page = document.createElement('div');
      page.className = 'schev-page page-enter';

      page.innerHTML = `
        <div class="schev-outer">
          <!-- Left: live schema table -->
          <div class="schev-canvas" id="schev-canvas">
            <div class="schev-canvas-title">shopkart.prod.orders — Schema History</div>
            <div class="schev-canvas-sub">Iceberg column IDs are permanent. Schema changes are metadata-only operations.</div>
            <div class="schev-schema-badge">
              <div class="schev-schema-badge-dot"></div>
              <span id="schev-schema-badge-text">Schema v0 · 3 columns</span>
            </div>
            <div class="schev-table-wrap">
              <table class="schev-table">
                <thead>
                  <tr>
                    <th>Column Name</th>
                    <th>Type</th>
                    <th>Column ID</th>
                    <th>Nullable</th>
                    <th>Since</th>
                  </tr>
                </thead>
                <tbody id="schev-table-body"></tbody>
              </table>
            </div>
            <div class="schev-changelog" id="schev-changelog"></div>
          </div>

          <!-- Right: step sidebar -->
          <div class="schev-sidebar">
            <div class="schev-sidebar-header">
              <div class="schev-sidebar-title" id="schev-step-title">Press Play to begin</div>
              <div class="schev-sidebar-desc" id="schev-step-desc">Watch the schema evolve across 8 operations — all metadata-only, zero data rewrite.</div>
            </div>
            <div class="schev-steps-list" id="schev-steps-list"></div>
            <div class="schev-code-panel" id="schev-code-panel"></div>
          </div>
        </div>
      `;

      container.appendChild(page);

      const canvas    = page.querySelector('#schev-canvas');
      const stepsData = _getStepsData();
      const steps     = _buildAnimationSteps(canvas);
      const engine    = new IV.AnimationEngine({ steps });
      engine.setContext({ canvas });
      this._engine = engine;

      // Initial schema render
      _renderSchema(canvas, 0);

      // Build step list
      const list      = page.querySelector('#schev-steps-list');
      const titleEl   = page.querySelector('#schev-step-title');
      const descEl    = page.querySelector('#schev-step-desc');
      const codePanel = page.querySelector('#schev-code-panel');

      list.innerHTML = stepsData.map((s, i) => `
        <div class="schev-step-item" data-step="${i}">
          <div class="schev-step-badge">${i + 1}</div>
          <div class="schev-step-text">${s.label}</div>
        </div>
      `).join('');

      engine.on('stepchange', (idx) => {
        list.querySelectorAll('.schev-step-item').forEach((el, i) => {
          el.classList.toggle('active', i === idx);
          el.classList.toggle('done', i < idx);
        });
        const step = idx >= 0 ? stepsData[idx] : null;
        if (titleEl) titleEl.textContent = step ? step.label : 'Press Play to begin';
        if (descEl)  descEl.textContent  = step ? step.description : 'Watch the schema evolve — all changes are metadata-only.';
        if (codePanel && step) {
          codePanel.innerHTML = '';
          codePanel.appendChild(IV.CodeViewer.create(step.code, step.lang || 'sql', step.codeTitle));
        }
        const active = list.querySelector('.schev-step-item.active');
        if (active) active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      });

      list.addEventListener('click', (e) => {
        const item = e.target.closest('[data-step]');
        if (item) engine.goto(parseInt(item.dataset.step, 10));
      });

      IV.AnimationControls.register(engine);
    },

    destroy() {
      if (this._engine) { this._engine.destroy(); this._engine = null; }
      IV.AnimationControls.hide();
      document.getElementById('schev-styles')?.remove();
    },
  };

  window.IcebergViz = window.IcebergViz || {};
  window.IcebergViz.modules = window.IcebergViz.modules || {};
  window.IcebergViz.modules['schema-evolution'] = mod;
})();
