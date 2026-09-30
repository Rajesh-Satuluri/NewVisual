/* ============================================================
   Metadata Explorer — S3 file tree + content viewer
   Left: collapsible tree of .metadata/ and data/ directories
   Right: syntax-highlighted file content + context explanation
   ============================================================ */

(function () {
  'use strict';

  const D = () => window.IcebergViz.Data;

  /* ── File tree definition ────────────────────────────────── */
  function _buildTree() {
    const d = D();
    return {
      id: 'root',
      label: 's3://shopkart-lakehouse-prod/',
      icon: 'bucket',
      children: [
        {
          id: 'warehouse',
          label: 'warehouse/',
          icon: 'folder',
          children: [
            {
              id: 'orders-table',
              label: 'orders/',
              icon: 'table',
              children: [
                {
                  id: 'metadata-dir',
                  label: '.metadata/',
                  icon: 'folder-meta',
                  expanded: true,
                  children: [
                    {
                      id: 'metadata-json',
                      label: 'v12.metadata.json',
                      icon: 'json',
                      badge: '187 KB',
                      fileType: 'metadata-json',
                    },
                    {
                      id: 'manifest-list-1',
                      label: 'snap-8912345678901234567-1-abc.avro',
                      icon: 'avro',
                      badge: '4.2 KB',
                      fileType: 'manifest-list',
                    },
                    {
                      id: 'manifest-list-2',
                      label: 'snap-7823456789012345678-1-def.avro',
                      icon: 'avro',
                      badge: '3.8 KB',
                      fileType: 'manifest-list-old',
                    },
                    {
                      id: 'manifest-br',
                      label: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890-m0.avro',
                      icon: 'avro',
                      badge: '12.4 KB',
                      fileType: 'manifest-br',
                    },
                    {
                      id: 'manifest-us',
                      label: 'b2c3d4e5-f6a7-8901-bcde-f01234567891-m0.avro',
                      icon: 'avro',
                      badge: '15.1 KB',
                      fileType: 'manifest-us',
                    },
                    {
                      id: 'manifest-de',
                      label: 'c3d4e5f6-a7b8-9012-cdef-012345678902-m0.avro',
                      icon: 'avro',
                      badge: '8.9 KB',
                      fileType: 'manifest-de',
                    },
                  ],
                },
                {
                  id: 'data-dir',
                  label: 'data/',
                  icon: 'folder-data',
                  expanded: false,
                  children: [
                    {
                      id: 'partition-br',
                      label: 'country_code=BR/',
                      icon: 'partition',
                      children: [
                        { id: 'data-br-1', label: '00001-1-a1b2c3d4.parquet', icon: 'parquet', badge: '128 MB', fileType: 'data-file-br' },
                        { id: 'data-br-2', label: '00002-2-b2c3d4e5.parquet', icon: 'parquet', badge: '128 MB', fileType: 'data-file-br' },
                        { id: 'data-br-3', label: '00003-3-c3d4e5f6.parquet', icon: 'parquet', badge: '128 MB', fileType: 'data-file-br' },
                      ],
                    },
                    {
                      id: 'partition-us',
                      label: 'country_code=US/',
                      icon: 'partition',
                      children: [
                        { id: 'data-us-1', label: '00001-1-d4e5f6a7.parquet', icon: 'parquet', badge: '128 MB', fileType: 'data-file-us' },
                        { id: 'data-us-2', label: '00002-2-e5f6a7b8.parquet', icon: 'parquet', badge: '128 MB', fileType: 'data-file-us' },
                        { id: 'data-us-3', label: '00003-3-f6a7b8c9.parquet', icon: 'parquet', badge: '128 MB', fileType: 'data-file-us' },
                      ],
                    },
                    {
                      id: 'partition-de',
                      label: 'country_code=DE/',
                      icon: 'partition',
                      children: [
                        { id: 'data-de-1', label: '00001-1-a7b8c9d0.parquet', icon: 'parquet', badge: '128 MB', fileType: 'data-file-de' },
                        { id: 'data-de-2', label: '00002-2-b8c9d0e1.parquet', icon: 'parquet', badge: '128 MB', fileType: 'data-file-de' },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
  }

  /* ── File content + context definitions ─────────────────── */
  function _getFileContent(fileType) {
    const d = D();
    switch (fileType) {
      case 'metadata-json':
        return {
          lang: 'json',
          title: 'v12.metadata.json — Table Metadata',
          code: JSON.stringify(d.metadataJson, null, 2),
          context: {
            role: 'Table Metadata File',
            layer: 'Layer 2',
            color: '#4aaeff',
            summary: 'The central catalog of the entire table. Contains the full schema history, partition spec evolution, snapshot history, and a pointer to the current snapshot.',
            keyFields: [
              { field: 'format-version', value: '2', note: 'Iceberg v2 format — supports row-level deletes' },
              { field: 'current-schema-id', value: '3', note: 'Active schema (4 columns incl. estimated_delivery)' },
              { field: 'current-snapshot-id', value: '8912345678901234567', note: 'Points to the latest snapshot' },
              { field: 'snapshots', value: '2 entries', note: 'Full snapshot chain (Black Friday + today\'s batch)' },
              { field: 'partition-specs', value: '2 specs', note: 'Spec 0 (date) → Spec 1 (date + country)' },
            ],
            insight: 'This single JSON file is the source of truth for all table state. When Spark queries orders, it fetches THIS file first. The entire metadata hierarchy radiates outward from here.',
          },
        };

      case 'manifest-list':
        return {
          lang: 'json',
          title: 'Manifest List — Snapshot 8912345678901234567',
          code: JSON.stringify({
            snapshot_id: 8912345678901234567,
            snapshot_type: 'append',
            timestamp_ms: 1732924800000,
            operation: 'append',
            manifests: d.manifestListEntry,
          }, null, 2),
          context: {
            role: 'Manifest List (Snapshot File)',
            layer: 'Layer 3',
            color: '#a371f7',
            summary: 'An Avro file listing all manifest files that together describe the complete table contents for this snapshot. Each entry includes partition-level statistics to enable pruning.',
            keyFields: [
              { field: 'manifest_path', value: '3 entries', note: 'One manifest per partition region (BR/US/DE)' },
              { field: 'added_files_count', value: 'per-partition', note: 'How many files were added in this snapshot' },
              { field: 'partitions', value: 'min/max bounds', note: 'Used for partition pruning — skip BR/DE manifests when querying US only' },
              { field: 'content', value: '0 = DATA', note: 'This manifest tracks data files (not delete files)' },
            ],
            insight: 'This is where the "16,000x speedup" happens. If you query WHERE country_code=\'US\', Iceberg reads this list, checks the partition bounds, and skips the BR and DE manifests entirely — never reading those 6 data files.',
          },
        };

      case 'manifest-list-old':
        return {
          lang: 'json',
          title: 'Manifest List — Snapshot 7823456789012345678 (Previous)',
          code: JSON.stringify({
            snapshot_id: 7823456789012345678,
            snapshot_type: 'append',
            timestamp_ms: 1732838400000,
            operation: 'append',
            parent_snapshot_id: null,
            manifests: [
              {
                manifest_path: 's3://shopkart-lakehouse-prod/warehouse/orders/.metadata/prev-m0.avro',
                manifest_length: 9876,
                partition_spec_id: 0,
                added_snapshot_id: 7823456789012345678,
                added_data_files_count: 45,
                existing_data_files_count: 0,
                deleted_data_files_count: 0,
              },
            ],
          }, null, 2),
          context: {
            role: 'Manifest List (Old Snapshot)',
            layer: 'Layer 3',
            color: '#a371f7',
            summary: 'The manifest list for the previous snapshot, kept for time travel. Iceberg never modifies or deletes old snapshot metadata unless you explicitly call expire_snapshots().',
            keyFields: [
              { field: 'snapshot_id', value: '7823456789012345678', note: 'Previous day\'s batch load snapshot' },
              { field: 'partition_spec_id', value: '0', note: 'Used old spec (date only, before country partition was added)' },
              { field: 'added_data_files_count', value: '45', note: '45 files added in this snapshot' },
            ],
            insight: 'Time travel works because these old manifest lists are preserved. SELECT * FROM orders VERSION AS OF 7823456789012345678 reads from THIS manifest list instead of the current one.',
          },
        };

      case 'manifest-br':
        return {
          lang: 'json',
          title: 'Manifest — Brazil Partition (country_code=BR)',
          code: JSON.stringify({
            manifest_path: 's3://shopkart-lakehouse-prod/warehouse/orders/.metadata/a1b2c3d4-m0.avro',
            partition: { country_code: 'BR', order_date: '2024-11-29' },
            content: 0,
            data_files: d.manifestFileEntry,
          }, null, 2),
          context: {
            role: 'Manifest File',
            layer: 'Layer 4',
            color: '#3fb950',
            summary: 'An Avro file listing all data files for a specific partition. Each entry includes column-level statistics (null counts, min/max values) for fine-grained data skipping.',
            keyFields: [
              { field: 'file_path', value: 's3://...parquet', note: 'Exact S3 path for each data file' },
              { field: 'file_format', value: 'PARQUET', note: 'Parquet columnar format with Snappy compression' },
              { field: 'record_count', value: '4,200,000+', note: 'Rows per file — enables accurate cost estimation' },
              { field: 'column_sizes', value: 'per-column bytes', note: 'Used to estimate scan cost' },
              { field: 'lower_bounds / upper_bounds', value: 'per-column min/max', note: 'Enables data file skipping within a partition' },
            ],
            insight: 'This manifest for Brazil has 3 data files. When Spark queries WHERE country_code=\'BR\' AND order_id > 90000000, it reads lower/upper bounds here and may skip files where all order_ids are below that threshold.',
          },
        };

      case 'manifest-us':
        return {
          lang: 'json',
          title: 'Manifest — United States Partition (country_code=US)',
          code: JSON.stringify({
            manifest_path: 's3://shopkart-lakehouse-prod/warehouse/orders/.metadata/b2c3d4e5-m0.avro',
            partition: { country_code: 'US', order_date: '2024-11-29' },
            content: 0,
            data_files: [
              {
                file_path: 's3://shopkart-lakehouse-prod/warehouse/orders/data/country_code=US/00001-1-d4e5f6a7.parquet',
                file_format: 'PARQUET',
                record_count: 6100000,
                file_size_in_bytes: 134217728,
                lower_bounds: { 1: '   ', 3: '2024-11-29', 4: 'US' },
                upper_bounds: { 1: 'ÿÿÿÿ', 3: '2024-11-29', 4: 'US' },
              },
              {
                file_path: 's3://shopkart-lakehouse-prod/warehouse/orders/data/country_code=US/00002-2-e5f6a7b8.parquet',
                file_format: 'PARQUET',
                record_count: 6100000,
                file_size_in_bytes: 134217728,
                lower_bounds: { 1: 'Ā   ', 3: '2024-11-29', 4: 'US' },
                upper_bounds: { 1: 'ǿÿÿÿ', 3: '2024-11-29', 4: 'US' },
              },
              {
                file_path: 's3://shopkart-lakehouse-prod/warehouse/orders/data/country_code=US/00003-3-f6a7b8c9.parquet',
                file_format: 'PARQUET',
                record_count: 5800000,
                file_size_in_bytes: 134217728,
                lower_bounds: { 1: 'Ȁ   ', 3: '2024-11-29', 4: 'US' },
                upper_bounds: { 1: '˿ÿÿÿ', 3: '2024-11-29', 4: 'US' },
              },
            ],
          }, null, 2),
          context: {
            role: 'Manifest File',
            layer: 'Layer 4',
            color: '#3fb950',
            summary: 'The US partition manifest. US is ShopKart\'s largest market with 18M daily orders — requiring 3 large data files of ~128 MB each.',
            keyFields: [
              { field: 'record_count', value: '18,000,000 total', note: '6.1M + 6.1M + 5.8M rows across 3 files' },
              { field: 'file_size_in_bytes', value: '128 MB each', note: 'Iceberg targets 128 MB files for optimal Spark parallelism' },
            ],
            insight: 'Notice this manifest is NOT read when you query WHERE country_code=\'BR\'. The manifest list entry for US contains partition bounds showing country_code is always \'US\', so Iceberg prunes this entire manifest during query planning.',
          },
        };

      case 'manifest-de':
        return {
          lang: 'json',
          title: 'Manifest — Germany Partition (country_code=DE)',
          code: JSON.stringify({
            manifest_path: 's3://shopkart-lakehouse-prod/warehouse/orders/.metadata/c3d4e5f6-m0.avro',
            partition: { country_code: 'DE', order_date: '2024-11-29' },
            content: 0,
            data_files: [
              {
                file_path: 's3://shopkart-lakehouse-prod/warehouse/orders/data/country_code=DE/00001-1-a7b8c9d0.parquet',
                file_format: 'PARQUET',
                record_count: 920000,
                file_size_in_bytes: 20971520,
                lower_bounds: { 1: '   ', 3: '2024-11-29', 4: 'DE' },
                upper_bounds: { 1: 'ÿÿÿ', 3: '2024-11-29', 4: 'DE' },
              },
              {
                file_path: 's3://shopkart-lakehouse-prod/warehouse/orders/data/country_code=DE/00002-2-b8c9d0e1.parquet',
                file_format: 'PARQUET',
                record_count: 880000,
                file_size_in_bytes: 20971520,
                lower_bounds: { 1: '   ', 3: '2024-11-29', 4: 'DE' },
                upper_bounds: { 1: 'ÿÿÿÿ', 3: '2024-11-29', 4: 'DE' },
              },
            ],
          }, null, 2),
          context: {
            role: 'Manifest File',
            layer: 'Layer 4',
            color: '#3fb950',
            summary: 'The Germany partition manifest. Germany is a smaller market (~1.8M daily orders) resulting in only 2 data files.',
            keyFields: [
              { field: 'record_count', value: '1,800,000 total', note: '920K + 880K rows across 2 files' },
              { field: 'file_size_in_bytes', value: '20 MB each', note: 'Smaller than target — may benefit from compaction' },
            ],
            insight: 'These smaller files indicate compaction may be needed. Running CALL orders_catalog.system.rewrite_data_files(table => \'orders\') would merge these into a single ~128 MB file, improving future query performance.',
          },
        };

      case 'data-file-br':
      case 'data-file-us':
      case 'data-file-de': {
        const cc = fileType === 'data-file-br' ? 'BR' : fileType === 'data-file-us' ? 'US' : 'DE';
        return {
          lang: 'text',
          title: `Parquet Data File — country_code=${cc}`,
          code: `# Parquet File — Binary Format (Columnar)
# Not directly human-readable, but Spark/Trino/DuckDB can read it natively.

Row Group 0 (128 MB, ~4.2M rows):
  Column: order_id       [INT64, SNAPPY]  — min: 10000001, max: 14200000
  Column: customer_id    [INT64, SNAPPY]  — min: 1000001,  max: 50000000
  Column: order_date     [DATE,  SNAPPY]  — min: 2024-11-29, max: 2024-11-29
  Column: country_code   [BINARY,SNAPPY]  — all values: "${cc}"
  Column: order_total    [DOUBLE,SNAPPY]  — min: 4.99, max: 9847.50
  Column: status         [BINARY,SNAPPY]  — values: COMPLETED, PENDING, CANCELLED

Row Group Footer (column statistics):
  Bloom filters enabled for: order_id, customer_id
  Dictionary pages: country_code (1 value), status (3 values)

File Footer:
  created_by: parquet-mr version 1.12.3 (build ...)
  num_rows: 4200000
  num_row_groups: 1
  schema:
    required group field_id=1 schema {
      required int64 field_id=1 order_id;
      required int64 field_id=2 customer_id;
      required binary field_id=3 (UTF8) order_date;
      required binary field_id=4 (UTF8) country_code;
      required double field_id=5 order_total;
      required binary field_id=6 (UTF8) status;
    }`,
          context: {
            role: 'Data File (Parquet)',
            layer: 'Layer 5',
            color: '#f97316',
            summary: `The actual order data for ${cc === 'BR' ? 'Brazil' : cc === 'US' ? 'United States' : 'Germany'}. Stored in Apache Parquet columnar format with Snappy compression. Iceberg never modifies existing data files — writes always create new files.`,
            keyFields: [
              { field: 'Format', value: 'Apache Parquet', note: 'Columnar storage — queries read only needed columns' },
              { field: 'Compression', value: 'Snappy', note: 'Fast decompression, ~2x smaller than uncompressed' },
              { field: 'Row Groups', value: '128 MB target', note: 'Tunable via write.target-file-size-bytes property' },
              { field: 'Column Stats', value: 'min/max per column', note: 'These stats are copied into the manifest file for pruning' },
              { field: 'Bloom Filters', value: 'order_id, customer_id', note: 'O(1) lookup for equality predicates' },
            ],
            insight: 'Iceberg treats data files as immutable. An UPDATE that changes 1 row results in a new Parquet file with the changed row, and the old file is marked as deleted in a new delete file — the original file is never touched.',
          },
        };
      }

      default:
        return {
          lang: 'text',
          title: 'Select a file',
          code: '# Select a file from the tree on the left\n# to view its contents and learn its role\n# in the Iceberg metadata hierarchy.',
          context: null,
        };
    }
  }

  /* ── Icon SVGs ───────────────────────────────────────────── */
  function _icon(type) {
    const icons = {
      bucket: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" width="15" height="15"><path d="M3 6c0-1.1 3.1-2 7-2s7 .9 7 2v8c0 1.1-3.1 2-7 2s-7-.9-7-2V6z"/><path d="M3 6c0 1.1 3.1 2 7 2s7-.9 7-2"/></svg>`,
      folder: `<svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15"><path d="M2 6a2 2 0 012-2h4l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" opacity=".7"/></svg>`,
      'folder-meta': `<svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15"><path d="M2 6a2 2 0 012-2h4l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" fill="#4aaeff" opacity=".7"/></svg>`,
      'folder-data': `<svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15"><path d="M2 6a2 2 0 012-2h4l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" fill="#f97316" opacity=".7"/></svg>`,
      table: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" width="15" height="15"><rect x="2" y="4" width="16" height="12" rx="1"/><path d="M2 8h16M8 8v8"/></svg>`,
      json: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" width="15" height="15" style="color:#4aaeff"><rect x="3" y="2" width="14" height="16" rx="1.5"/><path d="M7 7h2M7 10h6M7 13h4" stroke-linecap="round"/></svg>`,
      avro: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" width="15" height="15" style="color:#a371f7"><rect x="3" y="2" width="14" height="16" rx="1.5"/><path d="M7 7h6M7 10h4M7 13h5" stroke-linecap="round"/></svg>`,
      parquet: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" width="15" height="15" style="color:#f97316"><rect x="3" y="2" width="14" height="16" rx="1.5"/><path d="M7 7h6M7 10h6M7 13h6" stroke-linecap="round"/></svg>`,
      partition: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" width="15" height="15" style="color:#3fb950"><rect x="2" y="5" width="7" height="10" rx="1"/><rect x="11" y="5" width="7" height="10" rx="1"/><path d="M9 10h2"/></svg>`,
      chevron: `<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" width="10" height="10"><path d="M3 5l3 3 3-3"/></svg>`,
    };
    return icons[type] || icons.folder;
  }

  /* ── Tree node builder ───────────────────────────────────── */
  function _buildTreeNode(node, onSelect) {
    const li = document.createElement('li');
    li.className = 'me-tree-item' + (node.children ? ' me-tree-folder' : '');
    li.dataset.id = node.id;

    const row = document.createElement('div');
    row.className = 'me-tree-row';

    if (node.children) {
      const chevron = document.createElement('span');
      chevron.className = 'me-tree-chevron' + (node.expanded ? ' open' : '');
      chevron.innerHTML = _icon('chevron');
      row.appendChild(chevron);
    } else {
      const spacer = document.createElement('span');
      spacer.className = 'me-tree-spacer';
      row.appendChild(spacer);
    }

    const iconEl = document.createElement('span');
    iconEl.className = 'me-tree-icon';
    iconEl.innerHTML = _icon(node.icon);
    row.appendChild(iconEl);

    const labelEl = document.createElement('span');
    labelEl.className = 'me-tree-label';
    labelEl.textContent = node.label;
    if (node.badge) {
      const badge = document.createElement('span');
      badge.className = 'me-tree-badge';
      badge.textContent = node.badge;
      labelEl.appendChild(badge);
    }
    row.appendChild(labelEl);

    li.appendChild(row);

    if (node.children) {
      const childList = document.createElement('ul');
      childList.className = 'me-tree-children' + (node.expanded ? ' open' : '');
      node.children.forEach(child => {
        childList.appendChild(_buildTreeNode(child, onSelect));
      });
      li.appendChild(childList);

      row.addEventListener('click', () => {
        const chevron = row.querySelector('.me-tree-chevron');
        const isOpen = childList.classList.contains('open');
        childList.classList.toggle('open', !isOpen);
        if (chevron) chevron.classList.toggle('open', !isOpen);
      });
    } else if (node.fileType) {
      row.addEventListener('click', () => {
        // Deselect all
        document.querySelectorAll('.me-tree-row.selected').forEach(el => el.classList.remove('selected'));
        row.classList.add('selected');
        onSelect(node.fileType, node.label);
      });
    }

    return li;
  }

  /* ── Context panel ───────────────────────────────────────── */
  function _renderContext(ctx, container) {
    if (!ctx) {
      container.innerHTML = '<div class="me-empty-state"><p>No context available for this file.</p></div>';
      return;
    }

    container.innerHTML = `
      <div class="me-ctx-header" style="border-left: 3px solid ${ctx.color}; padding-left: 10px; margin-bottom: 14px;">
        <div class="me-ctx-role" style="color:${ctx.color}; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em;">${ctx.role}</div>
        <div class="me-ctx-layer" style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">${ctx.layer || ''}</div>
      </div>
      <p style="font-size: 13px; line-height: 1.6; color: var(--text-secondary); margin-bottom: 16px;">${ctx.summary}</p>
    `;

    if (ctx.keyFields && ctx.keyFields.length) {
      const table = document.createElement('table');
      table.className = 'me-ctx-table';
      table.innerHTML = `<thead><tr><th>Field</th><th>Value</th><th>Notes</th></tr></thead>`;
      const tbody = document.createElement('tbody');
      ctx.keyFields.forEach(f => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="me-ctx-field"><code>${f.field}</code></td>
          <td class="me-ctx-val">${f.value}</td>
          <td class="me-ctx-note">${f.note}</td>
        `;
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      container.appendChild(table);
    }

    if (ctx.insight) {
      const box = document.createElement('div');
      box.className = 'me-ctx-insight';
      box.innerHTML = `<span class="me-ctx-insight-icon">💡</span><span>${ctx.insight}</span>`;
      container.appendChild(box);
    }
  }

  /* ── Module ──────────────────────────────────────────────── */
  const MetadataExplorer = {
    id: 'metadata-explorer',
    title: 'Metadata Explorer',
    group: 'core',

    _cleanup: [],

    render(container) {
      container.innerHTML = '';
      this._cleanup = [];

      /* ── Page header ── */
      const header = document.createElement('div');
      header.className = 'module-header';
      header.innerHTML = `
        <div>
          <h1 class="gradient-text">Metadata Explorer</h1>
          <p class="module-subtitle">Browse the actual S3 file structure of the ShopKart orders table. Click any file to inspect its contents and understand its role in the Iceberg hierarchy.</p>
        </div>
        <div class="module-header-actions">
          <span class="badge badge-blue">S3 Browser</span>
          <span class="badge badge-purple">6 PB Table</span>
        </div>
      `;
      container.appendChild(header);

      /* ── Stats strip ── */
      const stats = document.createElement('div');
      stats.className = 'me-stats-strip';
      stats.innerHTML = `
        <div class="me-stat">
          <div class="me-stat-value" style="color:var(--blue)">5</div>
          <div class="me-stat-label">Metadata Layers</div>
        </div>
        <div class="me-stat">
          <div class="me-stat-value" style="color:var(--purple)">3</div>
          <div class="me-stat-label">Manifest Files</div>
        </div>
        <div class="me-stat">
          <div class="me-stat-value" style="color:var(--orange)">8</div>
          <div class="me-stat-label">Data Files Shown</div>
        </div>
        <div class="me-stat">
          <div class="me-stat-value" style="color:var(--green)">187 KB</div>
          <div class="me-stat-label">Total Metadata Size</div>
        </div>
        <div class="me-stat">
          <div class="me-stat-value" style="color:var(--iceberg)">6 PB</div>
          <div class="me-stat-label">Data Represented</div>
        </div>
      `;
      container.appendChild(stats);

      /* ── Main layout: tree + content + context ── */
      const layout = document.createElement('div');
      layout.className = 'me-layout';

      /* left: file tree */
      const treePanel = document.createElement('div');
      treePanel.className = 'me-tree-panel glass-card';

      const treeHeader = document.createElement('div');
      treeHeader.className = 'me-panel-header';
      treeHeader.innerHTML = `
        <span class="me-panel-title">S3 File Browser</span>
        <span class="me-panel-hint">Click files to inspect</span>
      `;
      treePanel.appendChild(treeHeader);

      const treeRoot = document.createElement('ul');
      treeRoot.className = 'me-tree-root';

      const onSelect = (fileType, filename) => {
        const content = _getFileContent(fileType);
        // update content panel (recreate header + code block)
        contentPanel.innerHTML = '';
        const ch = document.createElement('div');
        ch.className = 'me-panel-header';
        ch.innerHTML = `<span class="me-panel-title">${content.title}</span>`;
        contentPanel.appendChild(ch);
        const codeEl = window.IcebergViz.CodeViewer.create(content.code, content.lang, content.title);
        contentPanel.appendChild(codeEl);
        // update context panel body only (preserve the sticky header)
        const ctxBody = contextPanel.querySelector('.me-context-body');
        if (ctxBody) _renderContext(content.context, ctxBody);
      };

      const tree = _buildTree();
      treeRoot.appendChild(_buildTreeNode(tree, onSelect));
      treePanel.appendChild(treeRoot);

      /* middle: file content */
      const contentPanel = document.createElement('div');
      contentPanel.className = 'me-content-panel glass-card';
      contentPanel.innerHTML = `
        <div class="me-panel-header">
          <span class="me-panel-title">File Contents</span>
        </div>
        <div class="me-empty-state">
          <div class="me-empty-icon">${_icon('json')}</div>
          <p>Select a file from the tree to view its contents</p>
          <p class="me-empty-hint">Start with <strong>v12.metadata.json</strong> — the root of all Iceberg metadata</p>
        </div>
      `;

      /* right: context */
      const contextPanel = document.createElement('div');
      contextPanel.className = 'me-context-panel glass-card';
      contextPanel.innerHTML = `
        <div class="me-panel-header">
          <span class="me-panel-title">File Role &amp; Context</span>
        </div>
        <div class="me-context-body">
          <div class="me-empty-state">
            <p>Select a file to see its role in the metadata hierarchy</p>
          </div>
        </div>
      `;

      layout.appendChild(treePanel);
      layout.appendChild(contentPanel);
      layout.appendChild(contextPanel);
      container.appendChild(layout);

      /* ── Layer legend ── */
      const legend = document.createElement('div');
      legend.className = 'me-legend glass-card';
      legend.innerHTML = `
        <div class="me-legend-title">Iceberg Metadata Hierarchy</div>
        <div class="me-legend-items">
          <div class="me-legend-item"><span class="me-legend-dot" style="background:#4aaeff"></span>Layer 1: Catalog (Glue / Hive)</div>
          <div class="me-legend-item"><span class="me-legend-dot" style="background:#4aaeff"></span>Layer 2: Table Metadata (metadata.json)</div>
          <div class="me-legend-item"><span class="me-legend-dot" style="background:#a371f7"></span>Layer 3: Snapshot + Manifest List (.avro)</div>
          <div class="me-legend-item"><span class="me-legend-dot" style="background:#3fb950"></span>Layer 4: Manifest Files (.avro)</div>
          <div class="me-legend-item"><span class="me-legend-dot" style="background:#f97316"></span>Layer 5: Data Files (.parquet)</div>
        </div>
      `;
      container.appendChild(legend);

      /* ── Inline styles (scoped to this module) ── */
      this._injectStyles();

      /* ── Draggable column resizers (tree ↔ JSON ↔ role/context) ── */
      if (window.IcebergViz.SplitPane) {
        this._split = window.IcebergViz.SplitPane.attach(layout, {
          key: 'iceberg/metadata-explorer',
          disableBelow: 1100,
          tracks: [
            { min: 200, max: 480, def: 280 },  // S3 file tree
            { flex: true, min: 280 },          // file contents (JSON)
            { min: 240, max: 620, def: 320 },  // File Role & Context
          ],
        });
      }
    },

    destroy() {
      if (this._split) { this._split.detach(); this._split = null; }
      this._cleanup.forEach(fn => fn());
      this._cleanup = [];
      const style = document.getElementById('me-module-styles');
      if (style) style.remove();
    },

    _injectStyles() {
      if (document.getElementById('me-module-styles')) return;
      const s = document.createElement('style');
      s.id = 'me-module-styles';
      s.textContent = `
        /* Stats strip */
        .me-stats-strip {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 12px; margin-bottom: 20px;
        }
        .me-stat {
          background: var(--bg-1); border: 1px solid var(--border);
          border-radius: 10px; padding: 12px 14px; min-width: 0;
          text-align: center;
        }
        .me-stat-value { font-size: 22px; font-weight: 700; font-family: var(--font-mono); }
        .me-stat-label { font-size: 11px; color: var(--text-muted); margin-top: 2px; text-transform: uppercase; letter-spacing: .04em; overflow-wrap: anywhere; }

        /* Three-column layout */
        .me-layout {
          display: grid;
          grid-template-columns: 280px 1fr 300px;
          gap: 16px;
          margin-bottom: 16px;
          align-items: start;
        }
        @media (max-width: 1100px) {
          .me-layout { grid-template-columns: 260px 1fr; }
          .me-context-panel { display: none; }
        }
        @media (max-width: 800px) {
          .me-layout { grid-template-columns: 1fr; }
        }

        /* Panel shared styles */
        .me-tree-panel,
        .me-content-panel,
        .me-context-panel { padding: 0; overflow: hidden; }

        .me-panel-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 14px; border-bottom: 1px solid var(--border);
          background: var(--bg-1);
        }
        .me-panel-title { font-size: 12px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: .05em; }
        .me-panel-hint { font-size: 11px; color: var(--text-muted); }

        /* Tree */
        .me-tree-root, .me-tree-children {
          list-style: none; margin: 0; padding: 0;
        }
        .me-tree-root { padding: 8px 0; max-height: 520px; overflow-y: auto; }
        .me-tree-children { display: none; }
        .me-tree-children.open { display: block; }

        .me-tree-item { }
        .me-tree-row {
          display: flex; align-items: center; gap: 5px;
          padding: 5px 10px; cursor: pointer; user-select: none;
          font-size: 12.5px; color: var(--text-secondary);
          transition: background .12s;
        }
        .me-tree-row:hover { background: var(--bg-2); color: var(--text); }
        .me-tree-row.selected { background: rgba(74, 174, 255, .12); color: var(--iceberg); }

        .me-tree-children .me-tree-row { padding-left: 26px; }
        .me-tree-children .me-tree-children .me-tree-row { padding-left: 42px; }
        .me-tree-children .me-tree-children .me-tree-children .me-tree-row { padding-left: 58px; }

        .me-tree-chevron { color: var(--text-muted); transition: transform .15s; display: flex; align-items: center; }
        .me-tree-chevron.open { transform: rotate(0deg); }
        .me-tree-chevron:not(.open) { transform: rotate(-90deg); }
        .me-tree-spacer { width: 10px; display: inline-block; }
        .me-tree-icon { display: flex; align-items: center; flex-shrink: 0; }
        .me-tree-label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .me-tree-badge {
          margin-left: 6px; font-size: 10px; color: var(--text-muted);
          font-family: var(--font-mono);
        }

        /* Content panel */
        .me-content-panel {
          max-height: 560px; overflow-y: auto;
        }
        .me-content-panel .code-block {
          border-radius: 0; border: none; border-top: 1px solid var(--border);
        }
        .me-empty-state {
          padding: 40px 24px; text-align: center;
          color: var(--text-muted); font-size: 13px; line-height: 1.7;
        }
        .me-empty-icon { margin-bottom: 12px; opacity: .4; }
        .me-empty-hint { font-size: 12px; margin-top: 8px; }

        /* Context panel */
        .me-context-panel { padding: 0; max-height: 560px; overflow-y: auto; }
        .me-context-body { padding: 14px; }
        .me-context-panel .me-empty-state { padding: 20px 0; }
        .me-ctx-table {
          width: 100%; border-collapse: collapse; font-size: 12px;
          margin: 12px 0;
        }
        .me-ctx-table th {
          text-align: left; padding: 5px 8px; color: var(--text-muted);
          border-bottom: 1px solid var(--border); font-weight: 600;
          font-size: 10px; text-transform: uppercase; letter-spacing: .04em;
        }
        .me-ctx-table td { padding: 6px 8px; border-bottom: 1px solid rgba(255,255,255,.04); vertical-align: top; }
        .me-ctx-field code { font-family: var(--font-mono); font-size: 11px; color: var(--blue); }
        .me-ctx-val { font-family: var(--font-mono); font-size: 11px; color: var(--text-secondary); word-break: break-all; }
        .me-ctx-note { font-size: 11px; color: var(--text-muted); overflow-wrap: anywhere; }
        .me-ctx-insight {
          background: rgba(74, 174, 255, .08); border: 1px solid rgba(74,174,255,.2);
          border-radius: 8px; padding: 12px; margin: 14px 0;
          font-size: 12.5px; line-height: 1.6; color: var(--text-secondary);
          display: flex; gap: 8px; align-items: flex-start;
        }
        .me-ctx-insight-icon { font-size: 14px; flex-shrink: 0; margin-top: 1px; }

        /* Legend */
        .me-legend {
          padding: 14px 18px; display: flex; gap: 24px;
          align-items: center; flex-wrap: wrap;
        }
        .me-legend-title { font-size: 12px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: .05em; }
        .me-legend-items { display: flex; gap: 16px; flex-wrap: wrap; }
        .me-legend-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-muted); }
        .me-legend-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
      `;
      document.head.appendChild(s);
    },
  };

  window.IcebergViz = window.IcebergViz || {};
  window.IcebergViz.modules = window.IcebergViz.modules || {};
  window.IcebergViz.modules['metadata-explorer'] = MetadataExplorer;
})();
