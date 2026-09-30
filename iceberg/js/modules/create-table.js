/* ============================================================
   Create Table Module
   Animates the full CREATE TABLE … USING iceberg sequence:
   DDL → schema validation → partition spec → metadata.json written
   ============================================================ */

(function () {
  'use strict';

  const D  = () => window.IcebergViz.Data;
  const IV = window.IcebergViz;

  /* ── Style injection ────────────────────────────────────── */
  function _injectStyles() {
    if (document.getElementById('ct-styles')) return;
    const s = document.createElement('style');
    s.id = 'ct-styles';
    s.textContent = `
.ct-page { display:flex; flex-direction:column; height:100%; overflow:hidden; }

.ct-outer {
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

.ct-canvas {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: var(--bg-1);
  overflow: hidden;
  position: relative;
}

.ct-sidebar {
  width: 360px;
  border-left: 1px solid var(--border-default);
  background: var(--bg-2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
}

.ct-sidebar-header {
  padding: 14px 18px;
  border-bottom: 1px solid var(--border-default);
  flex-shrink: 0;
}

.ct-sidebar-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.ct-sidebar-desc {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  line-height: 1.5;
  min-height: 36px;
}

.ct-steps-list {
  flex: 0 0 auto;
  overflow-y: auto;
  padding: 6px 0;
  border-bottom: 1px solid var(--border-default);
  max-height: 260px;
}

.ct-step-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 16px;
  cursor: pointer;
  transition: background var(--ease-fast);
  border-left: 3px solid transparent;
  margin-bottom: 1px;
}
.ct-step-item:hover { background: var(--bg-3); }
.ct-step-item.active {
  background: rgba(74,174,255,0.07);
  border-left-color: var(--blue);
}
.ct-step-item.done { opacity: 0.65; }

.ct-step-badge {
  width: 20px; height: 20px;
  border-radius: 50%;
  background: var(--bg-4);
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
  transition: background var(--ease-fast), color var(--ease-fast);
}
.ct-step-item.active .ct-step-badge  { background: var(--blue); color: #fff; }
.ct-step-item.done .ct-step-badge    { background: var(--green); color: #fff; }

.ct-step-text {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.4;
}
.ct-step-item.active .ct-step-text { color: var(--text-primary); font-weight: 500; }

.ct-code-panel {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}
.ct-code-panel .code-block { margin: 0; }

/* SVG animation helper classes */
.ct-pulse rect { animation: ct-pulse-anim 0.6s ease-out; }
@keyframes ct-pulse-anim {
  0%   { filter: drop-shadow(0 0 0px rgba(74,174,255,0)); }
  50%  { filter: drop-shadow(0 0 12px rgba(74,174,255,0.8)); }
  100% { filter: drop-shadow(0 0 4px rgba(74,174,255,0.3)); }
}
`;
    document.head.appendChild(s);
  }

  /* ── Step data ──────────────────────────────────────────── */
  function _getStepsData() {
    const sql = D().sql.createTable;

    const schema0 = JSON.stringify({
      "schema-id": 0,
      "type": "struct",
      "fields": [
        { "id": 1, "name": "order_id",        "type": "long",        "required": true,  "doc": "Unique order identifier" },
        { "id": 2, "name": "customer_id",     "type": "long",        "required": true,  "doc": "FK to customers table" },
        { "id": 3, "name": "order_date",      "type": "date",        "required": true,  "doc": "Date order was placed" },
        { "id": 4, "name": "order_timestamp", "type": "timestamptz", "required": true,  "doc": "Exact time (UTC)" },
        { "id": 5, "name": "country_code",    "type": "string",      "required": true,  "doc": "ISO 3166-1 alpha-2" }
      ]
    }, null, 2);

    const partSpec = JSON.stringify({
      "spec-id": 0,
      "fields": [
        { "source-id": 3, "field-id": 1000, "transform": "day",      "name": "order_date_day" },
        { "source-id": 5, "field-id": 1001, "transform": "identity", "name": "country_code"   }
      ]
    }, null, 2);

    const metaV1 = JSON.stringify({
      "format-version": 2,
      "table-uuid": "b55d9dda-6561-423a-8bfc-8be6f4b0cf9e",
      "location": "s3://shopkart-lakehouse/warehouse/prod/orders",
      "last-sequence-number": 0,
      "last-updated-ms": 1705612800000,
      "last-column-id": 5,
      "current-schema-id": 0,
      "current-partition-spec": 0,
      "current-snapshot-id": null,
      "snapshots": [],
      "sort-orders": [{ "order-id": 0, "fields": [] }],
      "properties": {
        "write.target-file-size-bytes": "134217728",
        "write.parquet.compression-codec": "zstd"
      }
    }, null, 2);

    const snapshotEmpty = JSON.stringify({
      "current-snapshot-id": null,
      "snapshots": [],
      "_note": "Table exists in the catalog but contains no data rows. metadata.json is on S3 but no snapshot has been committed."
    }, null, 2);

    const sortOrder = JSON.stringify({
      "sort-orders": [
        {
          "order-id": 0,
          "fields": [
            {
              "transform": "identity",
              "source-id": 1,
              "direction": "asc",
              "null-order": "nulls-first"
            }
          ]
        }
      ]
    }, null, 2);

    const catalogEntry = JSON.stringify({
      "DatabaseName": "shopkart_prod",
      "TableName": "orders",
      "TableType": "EXTERNAL_TABLE",
      "Parameters": {
        "table_type": "ICEBERG",
        "metadata_location": "s3://shopkart-lakehouse/warehouse/prod/orders/metadata/v1-a1b2c3.metadata.json"
      },
      "StorageDescriptor": {
        "Location": "s3://shopkart-lakehouse/warehouse/prod/orders",
        "InputFormat": "org.apache.iceberg.mr.mapreduce.IcebergInputFormat",
        "OutputFormat": "org.apache.iceberg.mr.mapreduce.IcebergOutputFormat"
      }
    }, null, 2);

    const summary = `-- ✓ Table created — zero data files exist yet.
-- The entire table lives in a single 2.1 KB metadata.json.

-- Verify:
SELECT * FROM shopkart.prod.orders.snapshots;
-- (0 rows — no data written)

SHOW TBLPROPERTIES shopkart.prod.orders;
-- table_type      = ICEBERG
-- metadata_location = s3://…/v1-a1b2c3.metadata.json

-- Summary of what was created on S3:
-- .metadata/
--   v1-a1b2c3.metadata.json   2.1 KB
-- data/
--   (empty — no Parquet files yet)
--
-- Next step: INSERT data to create Snapshot 1.`;

    return [
      { label: 'DDL Submitted',          description: 'Spark client sends CREATE TABLE DDL to AWS Glue Catalog. The catalog validates the table name and database.',                             code: sql,           lang: 'sql',  codeTitle: 'CREATE TABLE DDL' },
      { label: 'Schema Validated',        description: 'Catalog validates the 5 required columns and assigns permanent column IDs 1–5. IDs are never reused, even after DROP COLUMN.',            code: schema0,       lang: 'json', codeTitle: 'Schema Spec (schema-id: 0)' },
      { label: 'Partition Spec Stored',   description: 'Partition spec-id=0 recorded: day(order_date) × identity(country_code). The "hidden" transforms are stored here — users never see them.', code: partSpec,      lang: 'json', codeTitle: 'Partition Spec (spec-id: 0)' },
      { label: 'metadata.json v1 Written',description: 'First metadata.json written to S3. File size: 2.1 KB. Contains schema, partition spec, and an empty snapshots array.',                    code: metaV1,        lang: 'json', codeTitle: 'v1-a1b2c3.metadata.json' },
      { label: 'Snapshot List Empty',     description: 'current-snapshot-id is null and snapshots: []. The table object exists but has never had a commit. Any SELECT returns 0 rows.',           code: snapshotEmpty, lang: 'json', codeTitle: 'Snapshot state (empty)' },
      { label: 'Sort Order Registered',   description: 'Default sort order (order-id=0) stored: order_id ASC NULLS FIRST. Writers will Z-order data files by this key for better clustering.',    code: sortOrder,     lang: 'json', codeTitle: 'Sort Order (order-id: 0)' },
      { label: 'Catalog Entry Created',   description: 'Glue Catalog entry created. metadata_location points to v1-a1b2c3.metadata.json. Every read query starts here.',                          code: catalogEntry,  lang: 'json', codeTitle: 'AWS Glue Catalog Entry' },
      { label: 'Table Ready',             description: 'Table is ready for writes. No Parquet data files exist yet. The entire table definition fits in 2.1 KB on S3.',                            code: summary,       lang: 'sql',  codeTitle: 'Table Ready — Summary' },
    ];
  }

  /* ── SVG Diagram ────────────────────────────────────────── */
  function _buildSVG() {
    const W = 590, H = 390;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.style.maxWidth = W + 'px';
    svg.style.maxHeight = H + 'px';
    svg.id = 'ct-svg';

    svg.innerHTML = `
<defs>
  <marker id="ct-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="#484f58"/>
  </marker>
  <marker id="ct-arr-blue" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="#58a6ff"/>
  </marker>
  <marker id="ct-arr-green" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="#3fb950"/>
  </marker>
  <filter id="ct-glow-blue">
    <feGaussianBlur stdDeviation="3" result="b"/>
    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="ct-glow-green">
    <feGaussianBlur stdDeviation="3" result="b"/>
    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="ct-glow-orange">
    <feGaussianBlur stdDeviation="3" result="b"/>
    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
</defs>

<rect width="${W}" height="${H}" fill="var(--bg-1)" rx="0"/>
<text x="14" y="18" font-family="system-ui" font-size="10" fill="rgba(139,148,158,0.4)" font-weight="600" letter-spacing="1">ShopKart CREATE TABLE Animation</text>

<!-- ── Spark Client ── -->
<g id="ct-spark">
  <rect x="20" y="34" width="175" height="64" rx="8" fill="#0d1f3c" stroke="#1f6feb" stroke-width="1.5"/>
  <text x="40" y="58" font-size="15" dominant-baseline="middle">⚡</text>
  <text x="62" y="55" font-family="system-ui" font-size="12" font-weight="600" fill="#e6edf3">Spark SQL Client</text>
  <text x="62" y="71" font-family="ui-monospace" font-size="9.5" fill="rgba(88,166,255,0.75)">CREATE TABLE … USING iceberg</text>
  <text x="62" y="87" font-family="ui-monospace" font-size="9" fill="rgba(139,148,158,0.5)">shopkart.prod.orders</text>
</g>

<!-- ── Catalog ── -->
<g id="ct-catalog">
  <rect x="385" y="34" width="185" height="64" rx="8" fill="#1a1030" stroke="#6e40c9" stroke-width="1.5"/>
  <text x="400" y="58" font-size="15" dominant-baseline="middle">🏛</text>
  <text x="422" y="55" font-family="system-ui" font-size="12" font-weight="600" fill="#e6edf3">AWS Glue Catalog</text>
  <text x="422" y="71" font-family="ui-monospace" font-size="9.5" fill="rgba(163,113,247,0.75)">shopkart_prod.orders</text>
  <text x="422" y="87" font-family="ui-monospace" font-size="9" fill="rgba(139,148,158,0.5)">REST Catalog API</text>
</g>

<!-- ── Arrow: Spark → Catalog (static base) ── -->
<line x1="196" y1="66" x2="383" y2="66" stroke="#30363d" stroke-width="1.5" marker-end="url(#ct-arr)"/>
<text x="295" y="60" text-anchor="middle" font-family="system-ui" font-size="9" fill="rgba(139,148,158,0.35)">DDL</text>

<!-- ── Active arrow Spark → Catalog (hidden until step 0) ── -->
<g id="ct-arrow-ddl" opacity="0">
  <line x1="196" y1="66" x2="383" y2="66" stroke="#58a6ff" stroke-width="2.5" marker-end="url(#ct-arr-blue)"/>
  <text x="295" y="57" text-anchor="middle" font-family="system-ui" font-size="9.5" font-weight="600" fill="#58a6ff">CREATE TABLE DDL</text>
</g>

<!-- ── Catalog → S3 arrow (hidden until step 3) ── -->
<g id="ct-arrow-s3" opacity="0">
  <line x1="477" y1="99" x2="477" y2="147" stroke="#3fb950" stroke-width="2" stroke-dasharray="5 3" marker-end="url(#ct-arr-green)"/>
  <text x="490" y="130" font-family="system-ui" font-size="9.5" font-weight="600" fill="#3fb950">write</text>
</g>

<!-- ── S3 Bucket container ── -->
<g id="ct-s3box">
  <rect x="20" y="148" width="550" height="222" rx="10" fill="#1a1409" stroke="#f97316" stroke-width="1.5" opacity="0.9"/>
  <text x="36" y="170" font-family="system-ui" font-size="11" font-weight="700" fill="#f97316">S3  s3://shopkart-lakehouse/warehouse/prod/orders/</text>

  <!-- .metadata/ subdirectory -->
  <rect x="32" y="180" width="526" height="90" rx="6" fill="rgba(249,115,22,0.06)" stroke="rgba(249,115,22,0.3)" stroke-width="1" stroke-dasharray="4 3"/>
  <text x="46" y="198" font-family="ui-monospace" font-size="10" fill="rgba(249,115,22,0.7)">📂 .metadata/</text>

  <!-- metadata.json file (hidden until step 3) -->
  <g id="ct-file-meta1" opacity="0">
    <rect x="50" y="204" width="230" height="54" rx="5" fill="#1a1030" stroke="#a371f7" stroke-width="1.5"/>
    <text x="66" y="222" font-size="12" dominant-baseline="middle">📄</text>
    <text x="84" y="219" font-family="ui-monospace" font-size="10" font-weight="600" fill="#e6edf3">v1-a1b2c3.metadata.json</text>
    <text x="84" y="234" font-family="ui-monospace" font-size="9" fill="rgba(163,113,247,0.7)">2.1 KB · format-version: 2</text>
    <text x="84" y="248" font-family="ui-monospace" font-size="9" fill="rgba(163,113,247,0.55)">snapshots: [] · schema-id: 0</text>
  </g>

  <!-- data/ subdirectory -->
  <rect x="32" y="282" width="526" height="78" rx="6" fill="rgba(63,185,80,0.04)" stroke="rgba(63,185,80,0.2)" stroke-width="1" stroke-dasharray="4 3"/>
  <text x="46" y="300" font-family="ui-monospace" font-size="10" fill="rgba(63,185,80,0.55)">📂 data/</text>
  <text id="ct-data-empty-label" x="200" y="330" text-anchor="middle" font-family="ui-monospace" font-size="10" fill="rgba(139,148,158,0.35)" opacity="0">(empty — no data files until INSERT)</text>
</g>

<!-- ── Status badge (shown at step 7) ── -->
<g id="ct-ready-badge" opacity="0">
  <rect x="240" y="148" width="110" height="28" rx="14" fill="#0a1f10" stroke="#3fb950" stroke-width="1.5"/>
  <text x="295" y="166" text-anchor="middle" font-family="system-ui" font-size="11" font-weight="700" fill="#3fb950">✓  Table Ready</text>
</g>

<!-- ── Highlight overlays for Spark/Catalog ── -->
<rect id="ct-hl-spark"   x="18"  y="32"  width="179" height="68" rx="9" fill="none" stroke="#58a6ff" stroke-width="2.5" opacity="0" filter="url(#ct-glow-blue)"/>
<rect id="ct-hl-catalog" x="383" y="32"  width="189" height="68" rx="9" fill="none" stroke="#a371f7" stroke-width="2.5" opacity="0" filter="url(#ct-glow-blue)"/>
<rect id="ct-hl-s3"      x="18"  y="146" width="554" height="226" rx="11" fill="none" stroke="#f97316" stroke-width="2.5" opacity="0" filter="url(#ct-glow-orange)"/>
`;

    return svg;
  }

  /* ── Animation Steps ────────────────────────────────────── */
  function _buildAnimationSteps(svg) {
    const AE = IV.AnimationEngine;

    function g(id) { return svg.getElementById(id); }
    function show(id) { const el = g(id); if (el) el.setAttribute('opacity', '1'); }
    function hide(id) { const el = g(id); if (el) el.setAttribute('opacity', '0'); }
    function hlOn(id)  { const el = g(id); if (el) { el.setAttribute('opacity', '1'); el.style.filter='drop-shadow(0 0 8px rgba(74,174,255,0.7))'; } }
    function hlOff(id) { const el = g(id); if (el) { el.setAttribute('opacity', '0'); el.style.filter=''; } }
    function hlOrange(id) { const el = g(id); if (el) { el.setAttribute('opacity', '1'); el.style.filter='drop-shadow(0 0 8px rgba(249,115,22,0.7))'; } }
    function hlGreen(id)  { const el = g(id); if (el) { el.setAttribute('opacity', '1'); el.style.filter='drop-shadow(0 0 8px rgba(63,185,80,0.6))'; } }

    return [
      AE.fnStep('DDL Submitted', '', (ctx) => {
        show('ct-arrow-ddl');
        hlOn('ct-hl-spark');
      }, (ctx) => {
        hide('ct-arrow-ddl');
        hlOff('ct-hl-spark');
      }, 2500),

      AE.fnStep('Schema Validated', '', (ctx) => {
        hlOn('ct-hl-catalog');
      }, (ctx) => {
        hlOff('ct-hl-catalog');
      }, 2500),

      AE.fnStep('Partition Spec Stored', '', (ctx) => {
        const el = g('ct-hl-catalog');
        if (el) el.setAttribute('stroke', '#a371f7');
      }, (ctx) => {
        const el = g('ct-hl-catalog');
        if (el) el.setAttribute('stroke', '#58a6ff');
      }, 2500),

      AE.fnStep('metadata.json v1 Written', '', (ctx) => {
        show('ct-arrow-s3');
        show('ct-file-meta1');
        hlOrange('ct-hl-s3');
        const f = g('ct-file-meta1');
        if (f) f.style.filter = 'drop-shadow(0 0 10px rgba(163,113,247,0.8))';
      }, (ctx) => {
        hide('ct-arrow-s3');
        hide('ct-file-meta1');
        hlOff('ct-hl-s3');
      }, 2800),

      AE.fnStep('Snapshot List Empty', '', (ctx) => {
        show('ct-data-empty-label');
        const f = g('ct-file-meta1');
        if (f) f.style.filter = '';
        hlOff('ct-hl-s3');
      }, (ctx) => {
        hide('ct-data-empty-label');
      }, 2500),

      AE.fnStep('Sort Order Registered', '', (ctx) => {
        hlOn('ct-hl-catalog');
        const el = g('ct-hl-catalog');
        if (el) el.setAttribute('stroke', '#a371f7');
      }, (ctx) => {
        hlOff('ct-hl-catalog');
      }, 2500),

      AE.fnStep('Catalog Entry Created', '', (ctx) => {
        hlOn('ct-hl-catalog');
        const el = g('ct-hl-catalog');
        if (el) { el.setAttribute('stroke', '#3fb950'); el.style.filter = 'drop-shadow(0 0 8px rgba(63,185,80,0.6))'; }
        hide('ct-arrow-ddl');
      }, (ctx) => {
        hlOff('ct-hl-catalog');
      }, 2800),

      AE.fnStep('Table Ready', '', (ctx) => {
        show('ct-ready-badge');
        hlOff('ct-hl-catalog');
        hlOff('ct-hl-spark');
        const rb = g('ct-ready-badge');
        if (rb) rb.style.filter = 'drop-shadow(0 0 10px rgba(63,185,80,0.8))';
      }, (ctx) => {
        hide('ct-ready-badge');
      }, 3000),
    ];
  }

  /* ── Sidebar + Step List ────────────────────────────────── */
  function _buildSidebar(page, engine, stepsData) {
    const list = page.querySelector('#ct-steps-list');
    const titleEl = page.querySelector('#ct-step-title');
    const descEl = page.querySelector('#ct-step-desc');
    const codePanel = page.querySelector('#ct-code-panel');
    if (!list) return;

    list.innerHTML = stepsData.map((s, i) => `
      <div class="ct-step-item" data-step="${i}">
        <div class="ct-step-badge">${i + 1}</div>
        <div class="ct-step-text">${s.label}</div>
      </div>
    `).join('');

    function updateUI(idx) {
      list.querySelectorAll('.ct-step-item').forEach((el, i) => {
        el.classList.toggle('active', i === idx);
        el.classList.toggle('done', i < idx);
      });
      const step = idx >= 0 ? stepsData[idx] : null;
      if (titleEl) titleEl.textContent = step ? step.label : 'Press Play to begin';
      if (descEl)  descEl.textContent  = step ? step.description : 'Use the animation controls below or click any step.';
      if (codePanel && step && step.code) {
        codePanel.innerHTML = '';
        codePanel.appendChild(IV.CodeViewer.create(step.code, step.lang || 'json', step.codeTitle));
      } else if (codePanel && !step) {
        codePanel.innerHTML = '';
      }
      const active = list.querySelector('.ct-step-item.active');
      if (active) active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }

    engine.on('stepchange', updateUI);

    list.addEventListener('click', (e) => {
      const item = e.target.closest('[data-step]');
      if (item) engine.goto(parseInt(item.dataset.step, 10));
    });
  }

  /* ── Module ─────────────────────────────────────────────── */
  const mod = {
    id: 'create-table',
    title: 'CREATE TABLE',
    group: 'write-ops',
    _engine: null,

    render(container) {
      container.innerHTML = '';
      _injectStyles();

      const page = document.createElement('div');
      page.className = 'ct-page page-enter';
      page.innerHTML = `
        <div class="ct-outer">
          <div class="ct-canvas" id="ct-canvas"></div>
          <div class="ct-sidebar">
            <div class="ct-sidebar-header">
              <div class="ct-sidebar-title" id="ct-step-title">Press Play to begin</div>
              <div class="ct-sidebar-desc" id="ct-step-desc">Watch how Iceberg handles CREATE TABLE — from DDL submission to the first metadata.json on S3.</div>
            </div>
            <div class="ct-steps-list" id="ct-steps-list"></div>
            <div class="ct-code-panel" id="ct-code-panel"></div>
          </div>
        </div>
      `;
      container.appendChild(page);

      const svg = _buildSVG();
      page.querySelector('#ct-canvas').appendChild(svg);

      const stepsData = _getStepsData();
      const steps     = _buildAnimationSteps(svg);
      const engine    = new IV.AnimationEngine({ steps });
      engine.setContext({ svg });
      this._engine = engine;

      _buildSidebar(page, engine, stepsData);
      IV.AnimationControls.register(engine);
    },

    destroy() {
      if (this._engine) { this._engine.destroy(); this._engine = null; }
      IV.AnimationControls.hide();
      document.getElementById('ct-styles')?.remove();
    },
  };

  window.IcebergViz = window.IcebergViz || {};
  window.IcebergViz.modules = window.IcebergViz.modules || {};
  window.IcebergViz.modules['create-table'] = mod;
})();
