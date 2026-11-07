import { createModuleShell, createIQSection } from '../components/module-shell.js';
import { drawRoundRect } from '../components/canvas-primitives.js';
import { sortDemands } from '../sim/scs-engine.js';

export const IQ = [
  { q: 'List the demand sort keys the solver applies, in order. What breaks a tie at each level?',
    a: 'Five keys, applied in strict order: <strong>1) Demand Priority</strong> (lower number = higher priority); <strong>2) Fair-Share Priority</strong> — used only when priority is NULL or tied; <strong>3) Due Date</strong> — ascending, earlier bucket first, used when fair-share ties; <strong>4) Quantity</strong> — ascending, <em>lower quantity planned first</em>, used when due dates tie; <strong>5) Key sort on the remaining Demand Node Components</strong> — ascending key, in configured order. The solver only consults the next key when all earlier keys are equal.',
    tip: 'The one candidates get wrong: quantity is ASCENDING — the SMALLER order is planned first on a tie, not the larger.' },
  { q: 'The config property names don’t match their labels. What are the gotchas?',
    a: 'Two are counter-intuitive. <strong>Demand Priority</strong> is driven by the config property <code>Demand Layer Measure</code>. <strong>Fair-Share Priority</strong> is driven by the config property <code>Demand Priority Measure</code> (note: "Priority Measure" ⇒ <em>fair-share</em>, not the primary priority). Quantity is driven by <code>Demand Qty Measure Name</code>, and the final key sort walks the <code>Demand Node Components</code> in configured order.',
    tip: 'Flagging that "Demand Priority Measure" configures the FAIR-SHARE key shows real config-level familiarity.' },
  { q: 'Why does the sort order matter so much to the final plan — isn’t it just presentation?',
    a: 'No — it is the single most consequential input to an order-by-order heuristic. The solver plans each demand <strong>to completion before the next</strong>, consuming scarce material and capacity as it goes. So the demand that sorts first gets first claim on the on-hand stock and the best (JIT) capacity; later demands see only what remains and are pushed to Build-Ahead, Build-Late, or short. Re-sort the demands and you re-decide who is met on time.',
    tip: 'Say "the sort is the allocation" — in OBO, ordering the demands IS rationing the scarce supply.' },
];

// Teaching dataset — designed so each of the 5 keys visibly changes the order.
// day = day-of-February (numeric, for display + compare).
const CARDS = [
  { id: 'SO-A', pri: 2, fs: 1, day: 6, qty: 40, key: 'K1' }, // priority demotes to last
  { id: 'SO-B', pri: 1, fs: 2, day: 2, qty: 10, key: 'K1' }, // fair-share demotes
  { id: 'SO-C', pri: 1, fs: 1, day: 9, qty: 60, key: 'K7' }, // latest due in its group
  { id: 'SO-D', pri: 1, fs: 1, day: 5, qty: 80, key: 'K3' }, // due ties, larger qty
  { id: 'SO-E', pri: 1, fs: 1, day: 5, qty: 50, key: 'K5' }, // due+qty tie with F
  { id: 'SO-F', pri: 1, fs: 1, day: 5, qty: 50, key: 'K2' }, // key breaks the F/E tie
];
const KEY_NAMES = ['Priority', 'Fair-Share', 'Due Date', 'Quantity', 'Node Key'];
const d2 = (n) => 'Feb ' + String(n).padStart(2, '0');

// Stable sort by the first `level` keys only (0 = original order).
function partialSort(level) {
  const idx = new Map(CARDS.map((c, i) => [c.id, i]));
  const cmp = (a, b) => {
    const seq = [
      () => a.pri - b.pri,
      () => a.fs - b.fs,
      () => a.day - b.day,
      () => a.qty - b.qty,
      () => a.key.localeCompare(b.key),
    ];
    for (let i = 0; i < level; i++) { const r = seq[i](); if (r) return r; }
    return idx.get(a.id) - idx.get(b.id);
  };
  return [...CARDS].sort(cmp);
}

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Foundations',
    title: 'Demand Sorting — the 5-Key Order',
    subtitle: 'Before it plans anything, the solver sorts every demand by five keys in a fixed order. That sort decides who gets the scarce supply first. Step through the keys and watch the queue settle.',
    tabs: [
      { id: 'sort',   label: '↕️ Progressive Sort' },
      { id: 'keys',   label: '🔑 The 5 Keys', content: keysTab() },
      { id: 'engine', label: '⚙️ Run the Engine' },
      { id: 'iq',     label: '🎯 Interview Q&A' },
    ],
  });

  const cleanup = buildSort(container);
  buildEngine(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return cleanup;
}

// ── Tab 1: progressive sort animation ─────────────────────────────────────────
function buildSort(container) {
  const tab = container.querySelector('#tab-sort');
  tab.innerHTML = `
    <div class="canvas-wrap">
      <div class="canvas-caption">Six demands in the order they arrived. Press <b>Apply Next Key</b> to sort by one more key at a time — Priority → Fair-Share → Due Date → Quantity → Node Key. Watch each card slide to its new rank; the highlighted column is the key currently deciding.</div>
      <canvas id="ds-canvas" width="800" height="330" style="width:100%;max-width:800px"></canvas>
      <div class="canvas-controls">
        <button class="ctrl-btn" id="ds-next">▶ Apply Next Key</button>
        <button class="ctrl-btn" id="ds-all">⚡ Sort Fully</button>
        <button class="ctrl-btn" id="ds-reset">↺ Reset</button>
        <span class="ctrl-label" id="ds-status">Level 0 — arrival order (unsorted).</span>
      </div>
    </div>
    <div class="canvas-explainer">
      <h3>What you're watching</h3>
      <p>Each key is a tie-breaker for the one before it. <strong>Priority</strong> dominates — it alone moved <code>SO-A</code> to the back. Only <em>within</em> a priority tie does <strong>Fair-Share</strong> matter; only within a fair-share tie does <strong>Due Date</strong>; and so on down to the <strong>Node Key</strong>, which settles two orders (<code>SO-E</code> / <code>SO-F</code>) that are otherwise identical.</p>
      <p>This final queue is the plan order. The solver will now take the top card, plan it to completion against the network, then the next — so the card that ended up first gets first claim on every scarce unit. <strong>The sort is the allocation.</strong></p>
    </div>`;

  const canvas = tab.querySelector('#ds-canvas');
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');

  const topY = 56, rowH = 40, gap = 4, rowW = 720, rowX = 40;
  // columns: label, P, FS, Due, Qty, Key  → x centers
  const cols = [
    { label: 'Order',      x: rowX + 70,  w: 120 },
    { label: 'Priority',   x: rowX + 230, w: 90 },
    { label: 'Fair-Share', x: rowX + 335, w: 95 },
    { label: 'Due Date',   x: rowX + 450, w: 100 },
    { label: 'Quantity',   x: rowX + 565, w: 90 },
    { label: 'Node Key',   x: rowX + 670, w: 80 },
  ];

  let level = 0;
  const pos = new Map(CARDS.map((c, i) => [c.id, { y: topY + i * (rowH + gap), ty: topY + i * (rowH + gap) }]));

  function applyLevel(l) {
    level = Math.max(0, Math.min(5, l));
    const order = level === 0 ? CARDS : partialSort(level);
    order.forEach((c, rank) => { pos.get(c.id).ty = topY + rank * (rowH + gap); });
    const st = tab.querySelector('#ds-status');
    if (level === 0) st.textContent = 'Level 0 — arrival order (unsorted).';
    else st.textContent = `Key ${level}: ${KEY_NAMES[level - 1]} applied. ` + (level === 5 ? 'Fully sorted — this is the plan order.' : 'Ties remain; apply the next key.');
    tab.querySelector('#ds-next').disabled = level >= 5;
  }

  function colorFor(c) {
    if (c.pri >= 2) return '#F59E0B';
    if (c.fs >= 2) return '#38BDF8';
    return '#10B981';
  }

  let raf = null;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0A0E1A'; ctx.fillRect(0, 0, canvas.width, canvas.height);

    // header row
    cols.forEach((col, i) => {
      const activeKeyCol = level > 0 && i === level; // cols[1..5] map to keys 1..5
      ctx.font = activeKeyCol ? 'bold 11px system-ui' : '10px system-ui';
      ctx.fillStyle = activeKeyCol ? '#818CF8' : '#64748B';
      ctx.textAlign = i === 0 ? 'left' : 'center';
      ctx.fillText(col.label, i === 0 ? rowX + 14 : col.x, 40);
      if (activeKeyCol) {
        drawRoundRect(ctx, col.x - col.w / 2, 46, col.w, topY - 46 + 6 * (rowH + gap) - 6, 8, '#6366F111', '#6366F155');
      }
    });

    // rank numbers + rows (draw in current y order)
    const ranked = [...CARDS].sort((a, b) => pos.get(a.id).y - pos.get(b.id).y);
    const rankOf = new Map(ranked.map((c, i) => [c.id, i]));

    CARDS.forEach(c => {
      const p = pos.get(c.id);
      p.y += (p.ty - p.y) * 0.18; // lerp
      const col = colorFor(c);
      drawRoundRect(ctx, rowX, p.y, rowW, rowH, 9, '#111827', col + '88');
      // rank badge
      ctx.textAlign = 'center';
      ctx.font = 'bold 12px system-ui'; ctx.fillStyle = col;
      ctx.fillText(String(rankOf.get(c.id) + 1), rowX + 18, p.y + rowH / 2 + 4);
      // order id
      ctx.textAlign = 'left'; ctx.font = 'bold 13px system-ui'; ctx.fillStyle = '#E2E8F0';
      ctx.fillText(c.id, rowX + 36, p.y + rowH / 2 + 4);
      // values
      ctx.textAlign = 'center'; ctx.font = '12px system-ui'; ctx.fillStyle = '#94A3B8';
      const pills = [
        [cols[1].x, String(c.pri)],
        [cols[2].x, String(c.fs)],
        [cols[3].x, d2(c.day)],
        [cols[4].x, String(c.qty)],
        [cols[5].x, c.key],
      ];
      pills.forEach(([x, v], i) => {
        const active = level > 0 && i + 1 === level;
        ctx.fillStyle = active ? '#C7D2FE' : '#94A3B8';
        ctx.font = active ? 'bold 12px system-ui' : '12px system-ui';
        ctx.fillText(v, x, p.y + rowH / 2 + 4);
      });
    });

    raf = requestAnimationFrame(draw);
  }
  raf = requestAnimationFrame(draw);

  tab.querySelector('#ds-next').addEventListener('click', () => applyLevel(level + 1));
  tab.querySelector('#ds-all').addEventListener('click', () => applyLevel(5));
  tab.querySelector('#ds-reset').addEventListener('click', () => applyLevel(0));
  applyLevel(0);

  return () => { if (raf) cancelAnimationFrame(raf); };
}

// ── Tab 2: the 5 keys (wiki-grounded) ─────────────────────────────────────────
function keysTab() {
  const rows = [
    ['1', 'Demand Priority', 'Lower number = higher priority. The primary sort.', '<code>Demand Layer Measure</code>'],
    ['2', 'Fair-Share Priority', 'Lower = higher. Used only when Demand Priority is NULL or tied.', '<code>Demand Priority Measure</code>'],
    ['3', 'Due Date', 'Ascending — the earlier bucket is planned first. Used when fair-share ties.', '— (demand due date)'],
    ['4', 'Quantity', '<strong>Ascending</strong> — the lower quantity is planned first. Used when due dates tie.', '<code>Demand Qty Measure Name</code>'],
    ['5', 'Key sort on remaining attributes', 'Ascending key on the rest of the Demand Node Components, in configured order; compares the next attribute only when the current one ties.', '<code>Demand Node Components</code>'],
  ];
  return `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">The five sort keys, in order</div><div class="section-desc">Straight from the SCS "High Level Overview → Algorithm". The solver consults a key only when every earlier key is equal.</div></div>
      <div class="table-scroll">
        <table class="compare-table">
          <thead><tr><th>#</th><th>Key</th><th>Rule</th><th>SCS config property</th></tr></thead>
          <tbody>${rows.map(([n, k, r, c]) => `<tr><td style="font-weight:700;color:var(--accent)">${n}</td><td style="font-weight:600;color:var(--text)">${k}</td><td>${r}</td><td style="color:var(--text2)">${c}</td></tr>`).join('')}</tbody>
        </table>
      </div>
      <div class="info-grid" style="margin-top:18px">
        <div class="info-card" style="border-left:3px solid #F59E0B"><div class="info-card-title">⚠️ Quantity is ascending</div><div class="info-card-body">On a tie, the <strong>smaller</strong> order is planned first ("lower quantity is planned first"). A common interview trap — don't say "largest first".</div></div>
        <div class="info-card" style="border-left:3px solid #38BDF8"><div class="info-card-title">⚠️ Naming quirk</div><div class="info-card-body">The config property <code>Demand Priority Measure</code> configures the <strong>Fair-Share</strong> key — not the primary Demand Priority (which is <code>Demand Layer Measure</code>).</div></div>
        <div class="info-card" style="border-left:3px solid #10B981"><div class="info-card-title">✅ NULL falls through</div><div class="info-card-body">If a demand has no value for a key (e.g. no priority), the solver falls through to the next key — it is not dropped or sent to the back by default.</div></div>
      </div>
    </div>`;
}

// ── Tab 3: run the real engine ────────────────────────────────────────────────
function engineRows(list, ranked) {
  return list.map((d, i) => `
    <tr>
      <td>${ranked ? `<strong>${i + 1}</strong>` : '<span style="color:var(--text3)">—</span>'}</td>
      <td><code>${d.id}</code></td>
      <td><span class="pill ${d.pri === 1 ? 'pill-green' : 'pill-amber'}">${d.pri}</span></td>
      <td>${d.fs}</td><td>${d2(d.day)}</td><td>${d.qty}</td><td>${d.key}</td>
    </tr>`).join('');
}
function buildEngine(container) {
  const tab = container.querySelector('#tab-engine');
  tab.innerHTML = `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">The real, unit-tested engine</div><div class="section-desc">This runs <code>sortDemands()</code> from <code>sim/scs-engine.js</code> — the same function covered by <code>node --test</code>. Same six demands as the animation.</div></div>
      <div class="table-scroll">
        <table class="compare-table">
          <thead><tr><th>Rank</th><th>Order</th><th>Priority</th><th>Fair-Share</th><th>Due Date</th><th>Qty</th><th>Key</th></tr></thead>
          <tbody id="ds-eng-body">${engineRows(CARDS, false)}</tbody>
        </table>
      </div>
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:14px">
        <button class="ctrl-btn" id="ds-eng-run">▶ Run sortDemands()</button>
        <button class="ctrl-btn" id="ds-eng-reset" hidden>↺ Reset</button>
        <span id="ds-eng-note" class="ctrl-label"></span>
      </div>
      <div class="canvas-explainer" style="margin-top:18px"><h3>Why the engine matters</h3><p>The animation teaches the <em>idea</em>; this proves the <em>implementation</em>. The result here is produced by the identical comparator the Playground and worked examples use — so when the next modules consume a sorted queue, you know exactly how it was ordered.</p></div>
    </div>`;
  const run = tab.querySelector('#ds-eng-run'), rst = tab.querySelector('#ds-eng-reset');
  const body = tab.querySelector('#ds-eng-body'), note = tab.querySelector('#ds-eng-note');
  // map CARDS → engine shape (priority/fairShare/dueDate/qty/key), keep id+display fields.
  const toEngine = CARDS.map(c => ({ ...c, priority: c.pri, fairShare: c.fs, dueDate: '2026-02-' + String(c.day).padStart(2, '0') }));
  run.addEventListener('click', () => {
    const s = sortDemands(toEngine);
    body.innerHTML = engineRows(s, true);
    note.innerHTML = `Sorted. <b>${s[0].id}</b> plans first; <b>${s[s.length - 1].id}</b> last. <code>SO-F</code> edges <code>SO-E</code> on the Node Key tie-break.`;
    run.hidden = true; rst.hidden = false;
  });
  rst.addEventListener('click', () => { body.innerHTML = engineRows(CARDS, false); note.textContent = ''; rst.hidden = true; run.hidden = false; });
}
