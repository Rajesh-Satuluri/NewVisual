import { createModuleShell, initTabs, createIQSection, initIQ, PRIME_SCHEMA } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

// A single 'orders' row laid out byte by byte
// order_id int8, customer_id int8, created_at timestamptz, total numeric(12,2), status text, notes text (null)
const TUPLE_FIELDS = [
  { name: 'HeapTupleHeader', bytes: 23, color: '#4F46E5', desc: 'Fixed 23-byte header: t_xmin (xid of INSERT), t_xmax (xid of DELETE/UPDATE, 0 if live), t_ctid (current TID — self if not updated), t_infomask (HEAP_HASNULL, HEAP_HASVARWIDTH, HEAP_XMIN_COMMITTED…), t_infomask2 (natts), t_hoff (offset to data).' },
  { name: 'Null Bitmap', bytes: 1, color: '#8B5CF6', desc: '⌈natts/8⌉ bytes = 1 byte for 6 columns. Each bit: 1=not null, 0=null. Bit 0 = order_id (not null), bit 1 = customer_id, …, bit 5 = notes (null in this row → bit 5 = 0). Only present if HEAP_HASNULL flag is set in t_infomask.' },
  { name: 'order_id int8', bytes: 8, color: '#06B6D4', desc: 'Fixed 8-byte integer. No alignment padding needed (already 8-byte aligned from header+bitmap). Value: 1001 (0x00000000000003E9). Fixed-length columns are stored first for O(1) access — no scanning past variable-length fields.' },
  { name: 'customer_id int8', bytes: 8, color: '#06B6D4', desc: 'Fixed 8-byte integer. Value: 987654321. Sequential layout after order_id — 8-byte aligned, no padding.' },
  { name: 'created_at timestamptz', bytes: 8, color: '#10B981', desc: 'Stored as int64 microseconds since 2000-01-01 00:00:00 UTC (PostgreSQL epoch). E.g., Prime Day 2024-07-16 00:00:00 UTC = 771,321,600,000,000 μs. 8-byte aligned, fixed width.' },
  { name: 'total numeric(12,2)', bytes: 8, color: '#10B981', desc: 'PostgreSQL numeric stores as: 2-byte ndigits, 2-byte weight, 2-byte sign, 2-byte dscale, then digit words. Here fits in 8 bytes inline. Value: 149.99 → ndigits=2, weight=0, dscale=2.' },
  { name: 'status varlena', bytes: 11, color: '#F59E0B', desc: 'Variable-length text. 4-byte varlena header: top 2 bits = storage type, lower 30 bits = total byte length (including header). For \'shipped\' (7 bytes): header = (11 << 2) | 0 = 44, then 7 bytes UTF-8 data. Short strings use 1-byte header if len < 127.' },
  { name: 'notes varlena (NULL)', bytes: 0, color: '#EF4444', desc: 'notes column is NULL (bit 5 of null bitmap = 0). NULL values occupy zero bytes on disk — the null bitmap is the only record of nullity. This is why NULLable columns save space when frequently null, unlike NOT NULL DEFAULT \'\' which stores empty string bytes.' },
];

const TUPLE_STEPS = TUPLE_FIELDS.map((f, i) => ({
  fieldIdx: i,
  byteOffset: TUPLE_FIELDS.slice(0, i).reduce((a, f2) => a + f2.bytes, 0),
  desc: f.desc,
}));

function drawTuple(ctx, stepIdx, w, h) {
  ctx.clearRect(0, 0, w, h);

  const totalBytes = TUPLE_FIELDS.reduce((a, f) => a + f.bytes, 0);
  const barX = 20, barY = 50, barH = 44, barW = w - 40;

  ctx.fillStyle = '#64748B'; ctx.font = '600 10px system-ui';
  ctx.fillText(`orders row — ${totalBytes} bytes total on disk`, barX, 38);

  // Draw byte bar
  let cx = barX;
  TUPLE_FIELDS.forEach((f, i) => {
    if (f.bytes === 0) return;
    const fw = (f.bytes / totalBytes) * barW;
    const isActive = stepIdx >= 0 && TUPLE_STEPS[stepIdx]?.fieldIdx === i;
    const isDone = stepIdx >= 0 && i < TUPLE_STEPS[stepIdx]?.fieldIdx;

    ctx.fillStyle = isActive ? f.color : (isDone ? f.color + '55' : f.color + '22');
    ctx.strokeStyle = isActive ? f.color : f.color + '44';
    ctx.lineWidth = isActive ? 2 : 1;
    ctx.fillRect(cx, barY, fw, barH);
    ctx.strokeRect(cx, barY, fw, barH);

    if (fw > 28) {
      ctx.fillStyle = isActive ? '#fff' : '#475569';
      ctx.font = (isActive ? '700' : '400') + ' 8px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(f.bytes + 'B', cx + fw / 2, barY + barH / 2 + 3);
      ctx.textAlign = 'left';
    }
    cx += fw;
  });

  // Offset ruler
  ctx.fillStyle = '#1E293B'; ctx.font = '8px monospace';
  let ox = barX;
  let cumBytes = 0;
  TUPLE_FIELDS.forEach(f => {
    if (f.bytes === 0) return;
    ctx.fillStyle = '#334155';
    ctx.fillText(cumBytes, ox, barY + barH + 12);
    ox += (f.bytes / totalBytes) * barW;
    cumBytes += f.bytes;
  });
  ctx.fillStyle = '#334155'; ctx.fillText(cumBytes, ox - 4, barY + barH + 12);

  // Field labels below bar
  ox = barX;
  TUPLE_FIELDS.forEach((f, i) => {
    if (f.bytes === 0) return;
    const fw = (f.bytes / totalBytes) * barW;
    const isActive = stepIdx >= 0 && TUPLE_STEPS[stepIdx]?.fieldIdx === i;
    if (fw > 20) {
      ctx.fillStyle = isActive ? f.color : '#334155';
      ctx.font = (isActive ? '700' : '400') + ' 7.5px system-ui';
      ctx.save();
      ctx.translate(ox + fw / 2, barY + barH + 28);
      ctx.rotate(-Math.PI / 5);
      ctx.textAlign = 'left';
      ctx.fillText(f.name.split(' ')[0], 0, 0);
      ctx.restore();
      ctx.textAlign = 'left';
    }
    ox += fw;
  });

  // Detail panel
  if (stepIdx >= 0) {
    const f = TUPLE_FIELDS[TUPLE_STEPS[stepIdx].fieldIdx];
    const offset = TUPLE_STEPS[stepIdx].byteOffset;
    const py = barY + barH + 70;
    ctx.fillStyle = '#0F172A';
    ctx.beginPath(); ctx.roundRect(barX, py, barW, h - py - 10, 6); ctx.fill();
    ctx.strokeStyle = f.color + '66'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(barX, py, barW, h - py - 10, 6); ctx.stroke();

    ctx.fillStyle = f.color; ctx.font = '700 11px system-ui';
    ctx.fillText(`${f.name}  —  ${f.bytes === 0 ? 'NULL (0 bytes)' : f.bytes + ' bytes at offset ' + offset}`, barX + 12, py + 18);
    ctx.fillStyle = '#94A3B8'; ctx.font = '10px system-ui';
    const words = f.desc.split(' ');
    let line = '', lineY = py + 34, maxW = barW - 24;
    words.forEach(word => {
      const test = line + (line ? ' ' : '') + word;
      if (ctx.measureText(test).width > maxW) {
        ctx.fillText(line, barX + 12, lineY);
        line = word; lineY += 14;
      } else { line = test; }
    });
    if (line) ctx.fillText(line, barX + 12, lineY);
  } else {
    ctx.fillStyle = '#475569'; ctx.font = '12px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('Press Play to walk through each field of an orders tuple byte by byte', w / 2, barY + barH + 90);
    ctx.textAlign = 'left';
  }
}

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Storage Engine · M28',
    title: 'Records & Tuples',
    subtitle: 'Fixed-length vs variable-length fields, null bitmaps, and MVCC headers — a Prime Day order row on disk.',
    tabs: [
      { id: 'layout', label: '🔢 Tuple Layout' },
      { id: 'mvcc',   label: '🕐 MVCC Header' },
      { id: 'iq',     label: '💼 Interview Q&A' },
    ],
  });
  initTabs(container);

  const layoutTab = container.querySelector('#tab-layout');
  layoutTab.innerHTML = `
    ${PRIME_SCHEMA}
    <div class="canvas-wrap" style="margin-top:12px">
      <canvas width="800" height="360" style="width:100%;max-height:360px"></canvas>
      <div class="canvas-controls"></div>
      <div class="sim-timeline"></div>
      <div class="canvas-explainer" id="tuple-explainer">
        <h3>Tuple (Row) On-Disk Layout</h3>
        <p>An <code>orders</code> row: HeapTupleHeader + null bitmap + fixed-length fields + variable-length fields.
           Fixed columns are stored first for O(1) access. Variable-length (varlena) columns follow.
           Press <strong>Play</strong> to walk through each field.</p>
      </div>
    </div>
  `;

  const canvas = layoutTab.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const engine = new SimulationEngine({
    initialState: { step: -1 },
    steps: TUPLE_STEPS.map((s, i) => ({ label: TUPLE_FIELDS[i].name.substring(0, 16), duration: 2000, mutate: st => { st.step = i; } })),
    onRender: state => {
      drawTuple(ctx, state.step, 800, 360);
      const el = layoutTab.querySelector('#tuple-explainer');
      if (el && state.step >= 0) {
        const f = TUPLE_FIELDS[state.step];
        el.innerHTML = `<h3>${f.name} — ${f.bytes === 0 ? 'NULL (0 bytes on disk)' : f.bytes + ' bytes'}</h3><p>${f.desc}</p>`;
      }
    },
  });
  SimulationEngine.renderControls(layoutTab.querySelector('.canvas-wrap'), engine);
  SimulationEngine.renderTimeline(layoutTab.querySelector('.canvas-wrap'), engine);
  drawTuple(ctx, -1, 800, 360);
  engine.reset();

  container.querySelector('#tab-mvcc').innerHTML = `
    <div class="scroll-content">
      <div class="section-header">
        <div class="section-title">MVCC Header Fields — t_xmin, t_xmax, t_ctid</div>
        <div class="section-desc">Every tuple carries its own visibility information — no lock needed to read</div>
      </div>
      <div class="code-block" style="font-size:11px">
<span class="cmt">-- HeapTupleHeaderData layout (23 bytes):</span>
t_xmin:      4 B  ← TransactionId that INSERTed this version
t_xmax:      4 B  ← TransactionId that DELETEd/UPDATEd (0 = live)
t_ctid:      6 B  ← (pageno: 4B, slotno: 2B) current TID
                    self → this is current version
                    → other page → an UPDATE created a newer version
t_infomask:  2 B  ← flags:
                    HEAP_XMIN_COMMITTED  (0x0100) — xmin known committed
                    HEAP_XMIN_INVALID    (0x0200) — xmin aborted
                    HEAP_XMAX_COMMITTED  (0x0400) — xmax known committed
                    HEAP_XMAX_INVALID    (0x0800) — xmax aborted
                    HEAP_HASNULL         (0x0001) — has null column
                    HEAP_HASVARWIDTH     (0x0002) — has varlena column
                    HEAP_HASEXTERNAL     (0x0004) — has TOAST pointer
t_infomask2: 2 B  ← upper 6 bits = natts (number of attributes)
t_hoff:      1 B  ← offset from tuple start to attribute data
      </div>
      <div class="info-grid" style="padding-top:14px">
        ${[
          { label: 'INSERT', color: '#10B981', desc: 'INSERT sets t_xmin = current_txid, t_xmax = 0, t_ctid = self. t_infomask: HEAP_XMIN_INVALID (will be cleared on commit). No other tuple references this yet.' },
          { label: 'DELETE', color: '#EF4444', desc: 'DELETE sets t_xmax = current_txid. The tuple is NOT removed from the page — it becomes "dead" to transactions with xid > t_xmax (after commit). VACUUM physically removes it later.' },
          { label: 'UPDATE', color: '#F59E0B', desc: 'UPDATE = DELETE old + INSERT new. Old tuple: t_xmax = current_txid, t_ctid → new tuple\'s (page, slot). New tuple: t_xmin = current_txid, t_xmax = 0, t_ctid = self. Creates a version chain.' },
          { label: 'Visibility check', color: '#4F46E5', desc: 'A tuple is visible to transaction T if: t_xmin committed AND t_xmin < T.xid AND (t_xmax = 0 OR t_xmax aborted OR t_xmax ≥ T.snapshot). This check uses pg_clog (commit log) for commit status.' },
          { label: 'Hint bits', color: '#8B5CF6', desc: 'HEAP_XMIN_COMMITTED / HEAP_XMAX_COMMITTED are hint bits. Once a transaction commits, any reader that checks its status sets the hint bit in t_infomask — avoiding repeated clog lookups. This is a "write-on-read" pattern.' },
          { label: 'Transaction wraparound', color: '#06B6D4', desc: 'Transaction IDs are 32-bit — wrap after ~2 billion. PostgreSQL uses VACUUM FREEZE (t_xmin = FrozenTransactionId = 2) to mark tuples as eternally visible — immune to wraparound. All-frozen bit in the VM tracks pages that are fully frozen.' },
        ].map(e => `
          <div class="info-card" style="border-color:${e.color}33">
            <div style="font-weight:700;font-size:11px;color:${e.color};margin-bottom:6px">${e.label}</div>
            <div class="info-card-body">${e.desc}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  container.querySelector('#tab-iq').innerHTML = createIQSection([
    {
      q: 'How does PostgreSQL store NULL values and what is the cost of nullable columns?',
      a: 'NULL values occupy zero bytes in the tuple data area. A null bitmap (⌈natts/8⌉ bytes, one bit per column) in the tuple header tracks which columns are null — bit 1 = not null, bit 0 = null. The bitmap is only present if the HEAP_HASNULL flag is set in t_infomask. Cost of nullable columns: (1) Extra null bitmap bytes in the header (1 byte per 8 columns); (2) NULL checks require reading the null bitmap — small but non-zero CPU overhead. Benefit: frequently-null columns cost essentially 0 storage for the null rows. Contrast with a NOT NULL DEFAULT \'\' text column — stores 4–5 bytes per row even when logically empty. At Amazon scale (350M product rows), a frequently-null "discontinued_at" timestamp saves ~2.8 GB vs NOT NULL DEFAULT \'infinity\'.',
      tip: 'Columns declared NOT NULL have no null bitmap entry — natts determines the bitmap size. Reordering columns to put NULLable ones last reduces alignment padding in many cases.',
    },
    {
      q: 'What is alignment padding in tuples and how does it affect row size?',
      a: 'PostgreSQL aligns each attribute in a tuple to its natural alignment boundary (int2: 2-byte, int4: 4-byte, int8/float8/timestamptz: 8-byte, text: 4-byte varlena header, char/bool: 1-byte). Padding bytes are inserted between fields to satisfy alignment. Example: bool (1 byte) followed by int8 (8 bytes) → 7 bytes of padding between them (to align int8 to 8-byte boundary). Column ordering matters: placing large fixed-width columns first, followed by small fixed-width, then variable-length, minimizes padding. CREATE TABLE bad (flag bool, val int8, note text) → bool + 7pad + int8 + note = 16+ bytes vs CREATE TABLE good (val int8, flag bool, note text) → int8 + bool + 3pad + note (varlena, 4-byte aligned) = 13+ bytes. At 100M rows: 3 bytes × 100M = 300 MB wasted for poor column ordering.',
      tip: 'Use SELECT pg_column_size(row(val1, val2, ...)) to measure actual storage size of a row, including alignment padding but excluding TOAST.',
    },
    {
      q: 'What is the MVCC version chain and how does UPDATE create tuple versions?',
      a: 'PostgreSQL UPDATE does NOT modify a tuple in place. Instead: (1) The old tuple gets t_xmax = current_txid (marking it deleted for readers with later xids). (2) A new tuple is inserted (t_xmin = current_txid, t_xmax = 0, t_ctid = self). (3) The OLD tuple\'s t_ctid is set to the new tuple\'s TID, forming a version chain. A reader following a version chain: find tuple where t_xmin committed before snapshot xid, t_xmax > snapshot xid (or not committed). This creates "bloat" — old versions stay until VACUUM removes them. Bloat impact: each UPDATE to a 100-byte order row creates a 100-byte dead tuple. 1M updates/hour on Prime Day → 100 MB/hour of dead tuples accumulating until autovacuum runs. Monitor: SELECT n_dead_tup FROM pg_stat_user_tables WHERE relname = \'orders\'.',
      tip: 'HOT (Heap-Only Tuple) update is an optimization: if no indexed column changes and the new tuple fits on the same page, t_ctid chains within the page avoid updating index pages — reduces write amplification by ~10× for frequent updates to non-indexed columns.',
    },
  ]);
  initIQ(container);

  return () => engine.destroy();
}
