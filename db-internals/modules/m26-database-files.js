import { createModuleShell, initTabs, createIQSection, initIQ, PRIME_SCHEMA } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

// Heap file: 8 pages, each holds up to 4 rows (unsorted, insertion order)
const HEAP_PAGES = [
  { id: 0, rows: [{ id: 1001, status: 'shipped' }, { id: 1002, status: 'pending' }, { id: 1003, status: 'shipped' }, { id: 1004, status: 'cancelled' }] },
  { id: 1, rows: [{ id: 1005, status: 'shipped' }, { id: 1006, status: 'shipped' }, { id: 1007, status: 'pending' }, { id: 1008, status: 'shipped' }] },
  { id: 2, rows: [{ id: 1009, status: 'shipped' }, { id: 1010, status: 'cancelled' }, { id: 1011, status: 'shipped' }, null] },
  { id: 3, rows: [{ id: 1012, status: 'pending' }, { id: 1013, status: 'shipped' }, null, null] },
];

const FILE_STEPS = [
  { phase: 'heap', scanPage: -1, desc: 'Heap file: rows stored in insertion order across pages. No sorting. A query for status=\'shipped\' must scan ALL pages — no way to skip.' },
  { phase: 'heap', scanPage: 0, desc: 'SeqScan: read Page 0 (4 rows). Filter status=shipped → 3 match. 1 miss (pending). Continue scanning.' },
  { phase: 'heap', scanPage: 1, desc: 'SeqScan: read Page 1 (4 rows). Filter → 3 match. 1 miss (pending). Still must read all pages — no early exit.' },
  { phase: 'heap', scanPage: 2, desc: 'SeqScan: read Page 2 (3 rows). Filter → 2 match. Cannot stop — more pages remain.' },
  { phase: 'heap', scanPage: 3, desc: 'SeqScan: read Page 3 (2 rows). Filter → 1 match. Total: 4 pages read, 11 rows fetched, 9 match. Full scan was required.' },
  { phase: 'sorted', scanPage: -1, desc: 'Clustered (sorted) file: rows sorted by order_id on disk. Index lookup → jump directly to page containing order_id=1005. No full scan.' },
  { phase: 'sorted', scanPage: 1, desc: 'B+ tree lookup: order_id=1005 → Page 1. Read exactly 1 page. Retrieve row directly. 1 page read vs 4 for heap scan. 4× faster.' },
  { phase: 'hash', scanPage: -1, desc: 'Hash file: rows hashed to buckets by primary key. Lookup by product_id → compute hash → jump to exact bucket. O(1) average case.' },
  { phase: 'hash', scanPage: 2, desc: 'Hash lookup: hash(product_id=\'B08N5WRWNW\') mod 4 = bucket 2. Read 1 page. Exact match found. But: range queries impossible — hash destroys order.' },
];

function drawFiles(ctx, stepIdx, w, h) {
  ctx.clearRect(0, 0, w, h);
  if (stepIdx < 0) {
    ctx.fillStyle = '#475569'; ctx.font = '13px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('Press Play to compare heap, clustered, and hash file organization', w/2, h/2);
    ctx.textAlign = 'left'; return;
  }

  const step = FILE_STEPS[stepIdx];
  const pageW = 155, pageH = 90, gap = 12;
  const startX = 20, startY = 50;

  if (step.phase === 'heap') {
    ctx.fillStyle = '#4F46E5'; ctx.font = '700 11px system-ui';
    ctx.fillText('Heap File — Insertion Order (orders table, 4 pages shown)', startX, 24);
    ctx.fillStyle = '#64748B'; ctx.font = '10px system-ui';
    ctx.fillText('SeqScan: must read ALL pages for status=\'shipped\'', startX, 38);

    HEAP_PAGES.forEach((pg, pi) => {
      const x = startX + pi * (pageW + gap);
      const y = startY;
      const isScanned = step.scanPage === pi;
      const isPast = step.scanPage > pi;

      ctx.fillStyle = isScanned ? '#4F46E5' + '33' : (isPast ? '#0F172A' : '#0A0F1A');
      ctx.strokeStyle = isScanned ? '#818CF8' : (isPast ? '#1E293B' : '#1E293B');
      ctx.lineWidth = isScanned ? 2 : 1;
      ctx.beginPath(); ctx.roundRect(x, y, pageW, pageH, 6); ctx.fill(); ctx.stroke();

      ctx.fillStyle = isScanned ? '#818CF8' : '#475569';
      ctx.font = '700 9px system-ui';
      ctx.fillText(`Page ${pi} (8 KB)`, x + 6, y + 13);

      pg.rows.forEach((row, ri) => {
        if (!row) return;
        const ry = y + 22 + ri * 16;
        const match = row.status === 'shipped';
        ctx.fillStyle = match ? '#10B981' + '22' : '#EF4444' + '11';
        ctx.strokeStyle = match ? '#10B981' + '66' : '#EF4444' + '33';
        ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.roundRect(x + 4, ry, pageW - 8, 13, 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = match ? '#10B981' : '#EF4444';
        ctx.font = '8px monospace';
        ctx.fillText(`#${row.id} ${row.status}`, x + 7, ry + 9);
      });

      if (isScanned) {
        ctx.fillStyle = '#818CF8'; ctx.font = '700 9px system-ui'; ctx.textAlign = 'center';
        ctx.fillText('▶ scanning', x + pageW/2, y + pageH + 14);
        ctx.textAlign = 'left';
      }
    });

    // I/O counter
    const reads = step.scanPage === -1 ? 0 : step.scanPage + 1;
    ctx.fillStyle = '#1E293B';
    ctx.beginPath(); ctx.roundRect(startX, startY + pageH + 30, 660, 28, 4); ctx.fill();
    ctx.fillStyle = '#F59E0B'; ctx.font = '700 10px system-ui';
    ctx.fillText(`Pages read: ${reads} / 4`, startX + 8, startY + pageH + 49);
    ctx.fillStyle = '#64748B'; ctx.font = '10px system-ui';
    ctx.fillText(`   — ${step.desc}`, startX + 80, startY + pageH + 49);
  }

  if (step.phase === 'sorted') {
    ctx.fillStyle = '#10B981'; ctx.font = '700 11px system-ui';
    ctx.fillText('Clustered File — Sorted by order_id (index lookup → direct page access)', startX, 24);
    ctx.fillStyle = '#64748B'; ctx.font = '10px system-ui';
    ctx.fillText('Looking up order_id=1005 → B+ tree → Page 1 only', startX, 38);

    const sorted = [
      { id: 0, range: '1001–1004', rows: ['#1001 Alice', '#1002 Bob', '#1003 Carol', '#1004 Dave'] },
      { id: 1, range: '1005–1008', rows: ['#1005 Eve ★', '#1006 Frank', '#1007 Grace', '#1008 Heidi'] },
      { id: 2, range: '1009–1012', rows: ['#1009 Ivan', '#1010 Judy', '#1011 Kate', '#1012 Leo'] },
      { id: 3, range: '1013–1016', rows: ['#1013 Mia', '(free)', '(free)', '(free)'] },
    ];
    sorted.forEach((pg, pi) => {
      const x = startX + pi * (pageW + gap);
      const y = startY;
      const isTarget = step.scanPage === pi;
      ctx.fillStyle = isTarget ? '#10B981' + '22' : '#0A0F1A';
      ctx.strokeStyle = isTarget ? '#10B981' : '#1E293B';
      ctx.lineWidth = isTarget ? 2 : 1;
      ctx.beginPath(); ctx.roundRect(x, y, pageW, pageH, 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = isTarget ? '#10B981' : '#475569';
      ctx.font = '700 9px system-ui';
      ctx.fillText(`Page ${pi} [${pg.range}]`, x + 5, y + 13);
      pg.rows.forEach((row, ri) => {
        const ry = y + 22 + ri * 16;
        const isStar = row.includes('★');
        ctx.fillStyle = isStar ? '#F59E0B' + '33' : 'transparent';
        if (isStar) { ctx.beginPath(); ctx.roundRect(x + 4, ry, pageW - 8, 13, 2); ctx.fill(); }
        ctx.fillStyle = isStar ? '#F59E0B' : '#475569';
        ctx.font = '8px monospace';
        ctx.fillText(row, x + 7, ry + 9);
      });
    });

    if (step.scanPage === 1) {
      ctx.strokeStyle = '#F59E0B'; ctx.lineWidth = 1.5; ctx.setLineDash([4,3]);
      const tx = startX + 1 * (pageW + gap);
      ctx.beginPath(); ctx.moveTo(tx + pageW/2, startY - 30); ctx.lineTo(tx + pageW/2, startY - 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#F59E0B'; ctx.font = '700 9px system-ui'; ctx.textAlign = 'center';
      ctx.fillText('B+ tree → here', tx + pageW/2, startY - 34);
      ctx.textAlign = 'left';
    }

    ctx.fillStyle = '#1E293B';
    ctx.beginPath(); ctx.roundRect(startX, startY + pageH + 30, 660, 28, 4); ctx.fill();
    ctx.fillStyle = '#10B981'; ctx.font = '700 10px system-ui';
    ctx.fillText(`Pages read: ${step.scanPage === -1 ? 0 : 1} / 4`, startX + 8, startY + pageH + 49);
    ctx.fillStyle = '#64748B'; ctx.font = '10px system-ui';
    ctx.fillText(`   — ${step.desc}`, startX + 80, startY + pageH + 49);
  }

  if (step.phase === 'hash') {
    ctx.fillStyle = '#06B6D4'; ctx.font = '700 11px system-ui';
    ctx.fillText('Hash File — Keyed by hash(product_id) mod N (O(1) point lookup)', startX, 24);
    ctx.fillStyle = '#64748B'; ctx.font = '10px system-ui';
    ctx.fillText('hash(\'B08N5WRWNW\') mod 4 = 2 → bucket 2 directly', startX, 38);

    const buckets = [
      { id: 0, rows: ['Echo Dot', 'Fire Stick'] },
      { id: 1, rows: ['Kindle', 'AirPods Pro'] },
      { id: 2, rows: ['Galaxy S24 ★', 'iPad Air'] },
      { id: 3, rows: ['MacBook', '(free)'] },
    ];
    buckets.forEach((bk, bi) => {
      const x = startX + bi * (pageW + gap);
      const y = startY;
      const isTarget = step.scanPage === bi;
      ctx.fillStyle = isTarget ? '#06B6D4' + '22' : '#0A0F1A';
      ctx.strokeStyle = isTarget ? '#06B6D4' : '#1E293B';
      ctx.lineWidth = isTarget ? 2 : 1;
      ctx.beginPath(); ctx.roundRect(x, y, pageW, pageH, 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = isTarget ? '#06B6D4' : '#475569';
      ctx.font = '700 9px system-ui';
      ctx.fillText(`Bucket ${bi}`, x + 5, y + 13);
      bk.rows.forEach((row, ri) => {
        const ry = y + 26 + ri * 22;
        const isStar = row.includes('★');
        ctx.fillStyle = isStar ? '#F59E0B' + '33' : 'transparent';
        if (isStar) { ctx.beginPath(); ctx.roundRect(x + 4, ry - 10, pageW - 8, 18, 2); ctx.fill(); }
        ctx.fillStyle = isStar ? '#F59E0B' : '#475569';
        ctx.font = '8px monospace';
        ctx.fillText(row, x + 7, ry);
      });
    });

    ctx.fillStyle = '#1E293B';
    ctx.beginPath(); ctx.roundRect(startX, startY + pageH + 30, 660, 28, 4); ctx.fill();
    ctx.fillStyle = '#06B6D4'; ctx.font = '700 10px system-ui';
    ctx.fillText(`Pages read: ${step.scanPage === -1 ? 0 : 1} / 4`, startX + 8, startY + pageH + 49);
    ctx.fillStyle = '#64748B'; ctx.font = '10px system-ui';
    ctx.fillText(`   — ${step.desc}`, startX + 80, startY + pageH + 49);
  }
}

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Storage Engine · M26',
    title: 'Database Files',
    subtitle: 'Heap files, clustered (sorted) files, and hash files — how row layout on disk drives query performance.',
    tabs: [
      { id: 'files',  label: '📁 File Types' },
      { id: 'layout', label: '🗄️ PostgreSQL Layout' },
      { id: 'iq',     label: '💼 Interview Q&A' },
    ],
  });
  initTabs(container);

  const filesTab = container.querySelector('#tab-files');
  filesTab.innerHTML = `
    ${PRIME_SCHEMA}
    <div class="canvas-wrap" style="margin-top:12px">
      <canvas width="800" height="260" style="width:100%;max-height:260px"></canvas>
      <div class="canvas-controls"></div>
      <div class="sim-timeline"></div>
      <div class="canvas-explainer" id="files-explainer">
        <h3>Three File Organization Strategies</h3>
        <p>A database file is a set of pages. How those pages organize rows determines I/O cost.
           Press <strong>Play</strong> to compare heap (unsorted), clustered (sorted), and hash file layouts.</p>
      </div>
    </div>
  `;

  const canvas = filesTab.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const engine = new SimulationEngine({
    initialState: { step: -1 },
    steps: FILE_STEPS.map((s, i) => ({ label: s.phase + ' ' + i, duration: 1800, mutate: st => { st.step = i; } })),
    onRender: state => {
      drawFiles(ctx, state.step, 800, 260);
      const el = filesTab.querySelector('#files-explainer');
      if (el && state.step >= 0) {
        const s = FILE_STEPS[state.step];
        const title = s.phase === 'heap' ? 'Heap File' : s.phase === 'sorted' ? 'Clustered File' : 'Hash File';
        el.innerHTML = `<h3>${title} — Step ${state.step + 1}</h3><p>${s.desc}</p>`;
      }
    },
  });
  SimulationEngine.renderControls(filesTab.querySelector('.canvas-wrap'), engine);
  SimulationEngine.renderTimeline(filesTab.querySelector('.canvas-wrap'), engine);
  drawFiles(ctx, -1, 800, 260);
  engine.reset();

  container.querySelector('#tab-layout').innerHTML = `
    <div class="scroll-content">
      <div class="section-header">
        <div class="section-title">PostgreSQL On-Disk File Layout</div>
        <div class="section-desc">Every table and index is a file (or set of 1 GB segments) in PGDATA/base/&lt;dboid&gt;/</div>
      </div>
      <div class="code-block" style="font-size:11px">
<span class="kw">$PGDATA/base/16384/</span>            ← database OID directory
  24580                              ← pg_class.relfilenode for 'orders' table
  24580.1                            ← segment 2 (when file exceeds 1 GB)
  24580_fsm                          ← Free Space Map (which pages have room)
  24580_vm                           ← Visibility Map (all-frozen, all-visible bits)
  24581                              ← 'orders_pkey' index (B+ tree)
  24582                              ← 'idx_orders_created_at' index
      </div>
      <div class="info-grid" style="padding-top:12px">
        ${[
          { label: 'Heap file (relkind=r)', color: '#4F46E5', desc: 'Main table file. Pages in insertion order. Each page holds tuples with slot array. Rows are accessed via (pageno, slotno) TID = ctid.' },
          { label: 'TOAST table (_toast)', color: '#10B981', desc: 'Out-of-line storage for values > ~2 KB (TOAST threshold). Large text/bytea fields are compressed and sliced into TOAST chunks. Main table stores a pointer.' },
          { label: 'Free Space Map (_fsm)', color: '#06B6D4', desc: '1 byte per page encoding how much free space remains (in 1/256 units of 8192 bytes). INSERT uses FSM to find a page with enough room without reading data pages.' },
          { label: 'Visibility Map (_vm)', color: '#F59E0B', desc: 'Bit per page: all-visible (no dead tuples) and all-frozen (no wraparound needed). Index-Only Scans use all-visible bit to skip heap fetch for visibility check.' },
          { label: 'Index file (relkind=i)', color: '#8B5CF6', desc: 'B+ tree, hash, GiST, GIN, BRIN index pages. Same 8 KB page size. B+ tree: internal nodes hold keys+pointers; leaf nodes hold keys+TIDs.' },
          { label: '1 GB segment limit', color: '#EF4444', desc: 'A relation file is split into 1 GB segments (24580, 24580.1, 24580.2…). Keeps each OS file under the ext4/XFS large-file limit and allows parallel writes.' },
        ].map(e => `
          <div class="info-card" style="border-color:${e.color}33">
            <div style="font-family:monospace;font-size:11px;color:${e.color};font-weight:700;margin-bottom:6px">${e.label}</div>
            <div class="info-card-body">${e.desc}</div>
          </div>
        `).join('')}
      </div>
      <div class="compare-table-wrap" style="margin-top:16px">
        <table class="compare-table">
          <thead><tr><th>File Type</th><th>Point Lookup</th><th>Range Scan</th><th>Insert</th><th>Use Case</th></tr></thead>
          <tbody>
            ${[
              ['Heap (unsorted)', 'O(N) — full scan', 'O(N)', 'O(1) — append', 'General-purpose tables, OLTP writes'],
              ['Clustered / IOT', 'O(log N) via index', 'O(log N + K)', 'O(log N) — maintain order', 'Range queries, ORDER BY same key'],
              ['Hash File', 'O(1) average', '❌ impossible', 'O(1) amortized', 'Point lookups only (key-value)'],
            ].map(([ft, pk, rs, ins, use]) => `<tr><td><strong>${ft}</strong></td><td>${pk}</td><td>${rs}</td><td>${ins}</td><td style="font-size:10px">${use}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  container.querySelector('#tab-iq').innerHTML = createIQSection([
    {
      q: 'What is a heap file and why does PostgreSQL use it as the default table storage?',
      a: 'A heap file stores rows in insertion order across fixed-size pages (8 KB default in PostgreSQL). Rows from new INSERTs go to the first page with free space (found via the Free Space Map), and UPDATEs leave dead tuples in place (MVCC). PostgreSQL uses heap as the default because: (1) INSERTs are O(1) — no ordering to maintain; (2) Any row can be written to any page — no hotspot during Prime Day bulk inserts; (3) MVCC dead tuples and VACUUM work naturally with heap layout; (4) Multiple indexes on the same heap work without restriction. Trade-off: range scans on non-indexed columns require full heap scan. InnoDB uses a clustered primary key (IOT) by default, which makes primary key range scans faster but slows secondary index lookups (must double-dereference).',
      tip: 'PostgreSQL added CLUSTER command and pg_partman for range partitioning, which approximate clustered file organization for specific access patterns.',
    },
    {
      q: 'What is the TOAST mechanism and when is it triggered?',
      a: 'TOAST (The Oversized-Attribute Storage Technique) handles column values larger than ~2 KB (TOAST_TUPLE_THRESHOLD = 2048 bytes). When a tuple would exceed this threshold: (1) Variable-length columns are candidates for TOASTing. (2) The value is first compressed (LZ4 or pglz) — if result < 8192 bytes, it goes inline with a TOAST pointer marker. (3) If still too large, the value is sliced into ~2 KB chunks stored in a separate TOAST table (relkind=t) keyed by (chunk_id, chunk_seq). The main table row stores a varlena pointer (va_extsize, va_toastrelid, va_valueid). (4) For bytea/text fields like product descriptions or order notes at Amazon scale, TOAST is routine. Cost: each TOAST access requires a join to the TOAST table — avoid TOASTing high-frequency access columns.',
      tip: 'TOAST has 4 storage strategies per column: PLAIN (never toast), EXTENDED (compress then out-of-line), EXTERNAL (out-of-line without compression), MAIN (compress before out-of-line).',
    },
    {
      q: 'How does the Free Space Map (FSM) help INSERT performance at high write rates?',
      a: 'The Free Space Map maintains a 1-byte approximation of free space per page (value × 32 = free bytes, granularity of 32 bytes). When an INSERT arrives: (1) PostgreSQL calls GetPageWithFreeSpace(heap, tuple_size) — FSM returns a page with enough room without reading any data pages. (2) The actual page is fetched from the buffer pool (or disk) and the tuple is inserted. (3) FSM is updated after the insert. Without FSM, every INSERT would need to scan pages to find free space — O(N) I/O per insert. During Prime Day write surges: VACUUM autovacuum reclaims dead tuple space and updates FSM entries. FILLFACTOR controls how full a page gets (default 100% for heap, 90% for indexes) — leaving slack in pages reduces page splits during UPDATEs.',
      tip: 'FSM is stored as a binary tree of max-free-space per subtree — a lookup is O(log N) pages but typically resolved in 1–2 levels from the root (cached in buffer pool).',
    },
  ]);
  initIQ(container);

  return () => engine.destroy();
}
