import { createModuleShell, initTabs, createIQSection, initIQ, PRIME_SCHEMA } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

// PostgreSQL 8 KB page anatomy built up section by section
const PAGE_SECTIONS = [
  {
    id: 'header',
    label: 'Page Header',
    bytes: '24 bytes',
    color: '#4F46E5',
    y: 0, h: 52,
    desc: 'PageHeaderData (24 bytes): pd_lsn (LSN of last WAL record touching this page), pd_checksum, pd_flags (all-visible, all-frozen), pd_lower (start of free space), pd_upper (end of free space), pd_special (start of special space), pd_pagesize_version.',
    fields: ['pd_lsn: 8 B (WAL position)', 'pd_checksum: 2 B', 'pd_flags: 2 B (all-visible, all-frozen)', 'pd_lower: 2 B (→ end of item IDs)', 'pd_upper: 2 B (→ start of tuples)', 'pd_special: 2 B', 'pd_pagesize_version: 2 B'],
  },
  {
    id: 'itemids',
    label: 'Item ID Array (Line Pointers)',
    bytes: 'N × 4 bytes',
    color: '#06B6D4',
    y: 52, h: 60,
    desc: 'ItemIdData entries grow downward from pd_lower. Each is 4 bytes: lp_off (15 bits — byte offset of tuple from page start), lp_flags (2 bits: normal/redirect/dead/unused), lp_len (15 bits — tuple byte length). TID = (page, slot_index).',
    fields: ['slot 0: off=2024, len=68, flags=normal', 'slot 1: off=1952, len=72, flags=normal', 'slot 2: off=1920, len=32, flags=dead ← MVCC dead tuple', 'slot 3: off=1872, len=48, flags=normal', '... grows toward lower addresses ...'],
  },
  {
    id: 'free',
    label: 'Free Space',
    bytes: '~6 KB',
    color: '#475569',
    y: 112, h: 80,
    desc: 'Free space between pd_lower (end of item IDs) and pd_upper (start of tuples). New items are allocated from both ends simultaneously — item IDs grow down, tuples grow up. When pd_lower >= pd_upper, page is full. VACUUM reclaims dead tuple space by compacting the page.',
    fields: ['Available until pd_lower meets pd_upper', 'pd_lower = 24 + (num_slots × 4)', 'pd_upper starts at 8192, decrements per tuple', 'Free = pd_upper − pd_lower'],
  },
  {
    id: 'tuples',
    label: 'Tuple Data (grows ↑)',
    bytes: 'variable',
    color: '#10B981',
    y: 192, h: 90,
    desc: 'Tuples packed from the top of the page downward. Each tuple: HeapTupleHeaderData (23 bytes fixed) + null bitmap (ceil(natts/8) bytes) + optional OID + attribute data. Attributes: fixed-length stored inline, variable-length (text, bytea) stored inline if small or via TOAST pointer if large.',
    fields: ['HeapTupleHeader: 23 B (t_xmin, t_xmax, t_ctid, t_infomask, natts)', 'Null bitmap: ⌈natts/8⌉ bytes (1 bit per column)', 'Padding for alignment (max 8-byte align)', 'order_id int8: 8 B', 'customer_id int8: 8 B', 'created_at timestamptz: 8 B', 'total numeric: 8 B', 'status text: 4 B varlena header + data'],
  },
  {
    id: 'special',
    label: 'Special Space',
    bytes: '0–24 bytes',
    color: '#8B5CF6',
    y: 282, h: 30,
    desc: 'Reserved for index-specific metadata at page end. Heap pages: 0 bytes. B+ tree pages: BTPageOpaqueData (16 bytes) storing left/right sibling page numbers, tree level, and page type flags. GiST/GIN have their own special structures.',
    fields: ['Heap page: 0 B (special not used)', 'B+ tree: btpo_prev, btpo_next (sibling links), btpo_level, btpo_flags'],
  },
];

const PAGE_STEPS = PAGE_SECTIONS.map((s, i) => ({
  activeSection: i,
  desc: s.desc,
}));

function drawPage(ctx, stepIdx, w, h) {
  ctx.clearRect(0, 0, w, h);

  const pageX = 40, pageW = 220;
  const scale = (h - 60) / 312;
  const panelX = pageX + pageW + 40;

  // Page outline
  ctx.strokeStyle = '#334155'; ctx.lineWidth = 1.5;
  ctx.strokeRect(pageX, 20, pageW, (h - 60));

  // Label
  ctx.fillStyle = '#64748B'; ctx.font = '700 10px system-ui';
  ctx.fillText('PostgreSQL 8 KB Page', pageX, 16);
  ctx.fillStyle = '#475569'; ctx.font = '9px system-ui';
  ctx.fillText('8,192 bytes', pageX + pageW - 60, 16);

  PAGE_SECTIONS.forEach((s, i) => {
    const sy = 20 + s.y * scale;
    const sh = s.h * scale;
    const isActive = stepIdx >= 0 && PAGE_STEPS[stepIdx]?.activeSection === i;
    const isVisible = stepIdx < 0 || i <= (stepIdx >= 0 ? PAGE_STEPS[stepIdx].activeSection : -1);

    ctx.fillStyle = isVisible ? (isActive ? s.color + '44' : s.color + '18') : '#0A0F1A';
    ctx.strokeStyle = isVisible ? (isActive ? s.color : s.color + '55') : '#1E293B';
    ctx.lineWidth = isActive ? 2 : 1;
    ctx.fillRect(pageX + 1, sy, pageW - 2, sh);
    ctx.strokeRect(pageX + 1, sy, pageW - 2, sh);

    if (isVisible) {
      ctx.fillStyle = isActive ? s.color : s.color + 'AA';
      ctx.font = (isActive ? '700' : '400') + ' 9px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(s.label, pageX + pageW / 2, sy + sh / 2 + 3);
      if (sh > 22) {
        ctx.font = '8px system-ui'; ctx.fillStyle = '#475569';
        ctx.fillText(s.bytes, pageX + pageW / 2, sy + sh / 2 + 14);
      }
      ctx.textAlign = 'left';
    }

    // Arrow for active section
    if (isActive) {
      ctx.strokeStyle = s.color; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(pageX + pageW + 4, sy + sh / 2);
      ctx.lineTo(panelX - 8, sy + sh / 2);
      ctx.stroke();
    }
  });

  // Detail panel
  if (stepIdx >= 0) {
    const s = PAGE_SECTIONS[PAGE_STEPS[stepIdx].activeSection];
    const py = 20, panelW = w - panelX - 10, maxH = h - 40;
    ctx.fillStyle = '#0F172A';
    ctx.beginPath(); ctx.roundRect(panelX, py, panelW, maxH, 6); ctx.fill();
    ctx.strokeStyle = s.color + '66'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(panelX, py, panelW, maxH, 6); ctx.stroke();

    ctx.fillStyle = s.color; ctx.font = '700 10px system-ui';
    ctx.fillText(`${s.label}  (${s.bytes})`, panelX + 10, py + 18);

    s.fields.forEach((f, fi) => {
      ctx.fillStyle = fi === 0 ? '#94A3B8' : '#64748B';
      ctx.font = '8.5px monospace';
      ctx.fillText(f, panelX + 10, py + 34 + fi * 14);
    });
  } else {
    ctx.fillStyle = '#475569'; ctx.font = '13px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('Press Play to walk through each page section', w * 0.65, h / 2);
    ctx.textAlign = 'left';
  }
}

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Storage Engine · M27',
    title: 'Pages',
    subtitle: 'The 8 KB page — PostgreSQL\'s fundamental I/O unit. Every read and write transfers whole pages.',
    tabs: [
      { id: 'anatomy', label: '📄 Page Anatomy' },
      { id: 'types',   label: '🗂️ Page Types' },
      { id: 'iq',      label: '💼 Interview Q&A' },
    ],
  });
  initTabs(container);

  const anatTab = container.querySelector('#tab-anatomy');
  anatTab.innerHTML = `
    ${PRIME_SCHEMA}
    <div class="canvas-wrap" style="margin-top:12px">
      <canvas width="800" height="340" style="width:100%;max-height:340px"></canvas>
      <div class="canvas-controls"></div>
      <div class="sim-timeline"></div>
      <div class="canvas-explainer" id="page-explainer">
        <h3>PostgreSQL 8 KB Page Structure</h3>
        <p>Every table, index, TOAST, and FSM page is exactly <strong>8 192 bytes</strong>. The buffer pool, disk I/O, and WAL all operate in 8 KB units. Press <strong>Play</strong> to walk through each section of a heap data page.</p>
      </div>
    </div>
  `;

  const canvas = anatTab.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const engine = new SimulationEngine({
    initialState: { step: -1 },
    steps: PAGE_STEPS.map((s, i) => ({ label: PAGE_SECTIONS[i].label.substring(0, 18), duration: 2200, mutate: st => { st.step = i; } })),
    onRender: state => {
      drawPage(ctx, state.step, 800, 340);
      const el = anatTab.querySelector('#page-explainer');
      if (el && state.step >= 0) {
        const s = PAGE_SECTIONS[state.step];
        el.innerHTML = `<h3>${s.label} — ${s.bytes}</h3><p>${s.desc}</p>`;
      }
    },
  });
  SimulationEngine.renderControls(anatTab.querySelector('.canvas-wrap'), engine);
  SimulationEngine.renderTimeline(anatTab.querySelector('.canvas-wrap'), engine);
  drawPage(ctx, -1, 800, 340);
  engine.reset();

  container.querySelector('#tab-types').innerHTML = `
    <div class="scroll-content">
      <div class="section-header">
        <div class="section-title">Page Types in PostgreSQL</div>
        <div class="section-desc">All pages are 8 KB — but the content and special-space layout differ by purpose</div>
      </div>
      <div class="compare-table-wrap">
        <table class="compare-table">
          <thead><tr><th>Page Type</th><th>relkind</th><th>Special Space</th><th>Key Content</th></tr></thead>
          <tbody>
            ${[
              ['Heap Data', 'r (relation)', '0 bytes', 'HeapTuple rows; slot array; MVCC header per row (xmin, xmax)'],
              ['B+ Tree Internal', 'i (index)', 'BTPageOpaqueData: prev/next sibling, level, flags', 'IndexTuple: key value + right-child page pointer'],
              ['B+ Tree Leaf', 'i (index)', 'BTPageOpaqueData + linked list of leaves', 'IndexTuple: key value + TID (heap page, slot)'],
              ['TOAST', 't (TOAST table)', '0 bytes', 'Large attribute chunks: chunk_id, chunk_seq, chunk_data'],
              ['Free Space Map', 'f (FSM)', 'FSM-specific', 'Binary tree of max-free-space per subtree (1 B/page)'],
              ['Visibility Map', 'v (VM)', 'VM-specific', '2 bits per heap page: all-visible, all-frozen flags'],
              ['Metapage', 'i (B+ tree root)', 'BTMetaPageData: root page, oldest fast root', 'B+ tree metadata; always page 0 of an index file'],
            ].map(([t, k, sp, kc]) => `<tr><td><strong>${t}</strong></td><td><code>${k}</code></td><td style="font-size:10px">${sp}</td><td style="font-size:10px">${kc}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div class="prose" style="padding-top:20px">
        <h3>Page Checksums (pg_checksums)</h3>
        <p>PostgreSQL optionally computes a CRC-32C checksum of each page's content (excluding pd_lsn)
           stored in pd_checksum. On every page read, the checksum is verified — a mismatch means
           storage corruption. Enable at initdb time: <code>initdb --data-checksums</code>.
           Adds ~1–5% write overhead. Mandatory for production databases where storage corruption
           must be detected early. During Prime Day, a corrupt payment page detected here
           is better than silently serving wrong totals.</p>
        <h3>Page Size Considerations</h3>
        <div class="code-block" style="font-size:11px">
8 KB pages  (default):  good for OLTP — row-level I/O, many small rows
16 KB pages (compile):  better for OLAP — fewer page fetches for wide scans
32 KB pages:            possible but wastes memory for small-row tables
4  KB pages:            aligns with OS page, fewer wasted bytes for small tables

Rule: page size ≥ maximum tuple size (else: TOAST overflow)
PostgreSQL max tuple size: page_size − page_header − item_id = ~8160 bytes
        </div>
      </div>
    </div>
  `;

  container.querySelector('#tab-iq').innerHTML = createIQSection([
    {
      q: 'What is the difference between pd_lower and pd_upper in a PostgreSQL page header?',
      a: 'pd_lower is the byte offset from the page start to the END of the item ID (line pointer) array — it marks where new item IDs would be appended. pd_upper is the byte offset from the page start to the BEGINNING of the tuple data area — it marks where the last written tuple begins. Free space between pd_lower and pd_upper. On INSERT: a new item ID is added at pd_lower (increments by 4 bytes), and the tuple is written at pd_upper − tuple_size (decrements). The page is full when pd_lower ≥ pd_upper. On DELETE: the item ID is marked dead (lp_flags = LP_DEAD), but pd_lower and pd_upper do not move — space is not reclaimed until VACUUM compacts (vacuums) the page.',
      tip: 'A common interview test: "how does PostgreSQL know if a page has free space?" — FSM stores an approximation of (pd_upper − pd_lower) per page.',
    },
    {
      q: 'Why does PostgreSQL use 8 KB as the default page size, and can it be changed?',
      a: 'The 8 KB default (BLCKSZ) is chosen to: (1) Match common OS page sizes (4 KB is Linux default; 8 KB amortizes syscall overhead with less waste than 64 KB). (2) Fit enough tuples per page to keep tree height low for index pages. (3) Keep buffer pool granularity fine enough to avoid caching unnecessary data. The page size is a compile-time constant (--with-blocksize=N, N=1–32 in KB, power of 2). It cannot be changed after initdb without a full dump/restore — the entire cluster uses one page size. For time-series or columnar workloads, 16 KB or 32 KB can reduce index height and I/O. ClickHouse and Parquet use 128 KB or larger blocks to maximize sequential I/O throughput for OLAP.',
      tip: 'Amazon Aurora uses a 16 KB page size internally (derived from MySQL InnoDB). This is why Aurora can differ in performance characteristics from vanilla PostgreSQL for the same schema.',
    },
    {
      q: 'What is a page "split" in a B+ tree index and why does it matter for write performance?',
      a: 'A page split occurs when a B+ tree leaf or internal node page is full and a new key must be inserted. PostgreSQL splits the full page into two half-full pages: (1) Allocates a new page. (2) Redistributes half the entries. (3) Inserts a new key in the parent pointing to the new page. (4) If parent is also full → recursive split upward. (5) Root split increases tree height. Impact on performance: each split requires writing 3 pages (original, new sibling, updated parent) and a WAL record — 3× the normal insert I/O. During Prime Day write surges (millions of orders/hour), index splits cascade and cause write amplification. Mitigations: (1) Set fillfactor=70 on high-write indexes (leaves 30% slack for insertions without splitting). (2) Use sequential UUIDs or serial IDs to fill pages left-to-right (avoids mid-page splits). (3) Monitor pg_stat_user_indexes.idx_blks_hit for split-induced cache churn.',
      tip: 'Random UUIDs as primary keys cause the "UUID hotspot" problem — splits happen across all index levels simultaneously because inserts land at random positions. Use UUIDv7 (time-ordered) or ULID instead.',
    },
  ]);
  initIQ(container);

  return () => engine.destroy();
}
