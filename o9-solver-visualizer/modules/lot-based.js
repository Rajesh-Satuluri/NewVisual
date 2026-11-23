import { createModuleShell, createIQSection } from '../components/module-shell.js';
import { drawRoundRect, drawArrow } from '../components/canvas-primitives.js';

export const IQ = [
  { q: 'What is "lot-based planning" in the SCS, and how does it change pegging compared with ordinary quantity-based planning?',
    a: 'In ordinary planning, supply at a node is a single <strong>fungible quantity</strong> per bucket — the solver pegs demand to an anonymous pool. In <strong>lot-based planning</strong>, supply is tracked as <strong>discrete, identity-bearing lots</strong>: each receipt or production run is a separate lot with its own <strong>lot number, quantity and attributes</strong> (receipt date, expiry, grade, source). Pegging becomes <strong>lot-to-lot</strong>: a demand pegs to specific lots, and each parent lot pegs down through the BOM to the exact component lots consumed to build it. That chain of lot-to-lot links is the <strong>genealogy</strong> — the thing that makes recall, traceability and attribute rules possible.',
    tip: 'One line: "quantity-based pegs to a pool; lot-based pegs to a numbered lot, and the lot-to-lot chain is the genealogy."' },
  { q: 'When several lots can satisfy one demand, how does the solver choose, and what do FIFO vs FEFO mean?',
    a: 'The solver applies a <strong>lot-selection rule</strong> to rank the eligible lots. <strong>FIFO</strong> (First-In-First-Out) consumes the <strong>earliest-received</strong> lot first — it empties old stock before new. <strong>FEFO</strong> (First-Expiry-First-Out) consumes the lot that <strong>expires soonest</strong> first, which minimises write-offs when shelf life matters and is <em>not</em> the same as FIFO (a newer lot can expire sooner). Selection can also be gated by <strong>attribute matching</strong> — a demand that requires grade A will skip grade-B lots regardless of age. The chosen lot is then pegged and its on-hand decremented; if it cannot fully cover the demand the solver moves to the next-ranked lot.',
    tip: 'FIFO = by receipt date; FEFO = by expiry date. They diverge whenever shelf life varies lot to lot.' },
  { q: 'What is lot genealogy, and why do planners care about forward vs backward traceability?',
    a: '<strong>Genealogy</strong> is the full lot-to-lot pegging tree that records which component lots were consumed to make which parent lots, through every BOM level. <strong>Backward traceability</strong> answers "what went into this finished lot?" — follow the pegs <em>down</em> to the raw-material lots (used for root-cause of a quality defect). <strong>Forward traceability</strong> answers "where did this raw lot end up?" — follow the pegs <em>up</em> to every finished lot and customer order it reached (used to scope a recall). Because the SCS already produces a traceable peg for every unit, lot-based planning turns that peg into a queryable genealogy without a separate track-and-trace system.',
    tip: 'Backward = down to ingredients (defect root cause). Forward = up to shipments (recall scope).' },
];

// ── Grounded teaching lots: three receipts of the same material node ───────────
// Each lot has an id, received-bucket, quantity, and expiry bucket.
const LOTS = [
  { id: 'L-241', recv: 1, qty: 40, exp: 9,  grade: 'A' },
  { id: 'L-255', recv: 2, qty: 30, exp: 6,  grade: 'A' },
  { id: 'L-262', recv: 3, qty: 50, exp: 11, grade: 'B' },
];
const DEMAND = 80;          // the order to fill
const DUE = 4;              // bucket it is due

// Resolve consumption under a rule: returns [{id, take}] in consumption order.
function allocate(rule) {
  const pool = LOTS.map(l => ({ ...l }));
  if (rule === 'FIFO') pool.sort((a, b) => a.recv - b.recv);
  else if (rule === 'FEFO') pool.sort((a, b) => a.exp - b.exp);
  let need = DEMAND;
  const picks = [];
  for (const l of pool) {
    if (need <= 0) break;
    const take = Math.min(need, l.qty);
    picks.push({ id: l.id, take, exp: l.exp, recv: l.recv });
    need -= take;
  }
  return picks;
}

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Models Supported',
    title: 'Lot-Based Planning',
    subtitle: 'Supply stops being an anonymous quantity and becomes a set of numbered lots, each with a receipt date, an expiry and attributes. Watch the solver pick lots for one order under FIFO vs FEFO, then peg them into a genealogy tree.',
    tabs: [
      { id: 'select',  label: '🏷️ Lot Selection' },
      { id: 'genealogy', label: '🌳 Genealogy', content: genealogyTab() },
      { id: 'concepts', label: '📖 How It Works', content: conceptsTab() },
      { id: 'iq',      label: '🎯 Interview Q&A' },
    ],
  });

  const cleanup = buildCanvas(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return cleanup;
}

// ── Tab 1: live lot-selection canvas (FIFO vs FEFO) ───────────────────────────
function buildCanvas(container) {
  const tab = container.querySelector('#tab-select');
  tab.innerHTML = `
    <div class="canvas-wrap">
      <div class="canvas-caption">One order for <b>${DEMAND}</b> units, due <b>W${DUE}</b>, and three lots on hand. Switch the <b>lot-selection rule</b> and watch which lots the solver consumes — and in what order. <b style="color:#38BDF8">FIFO</b> empties the oldest receipt first; <b style="color:#F59E0B">FEFO</b> empties the soonest-to-expire first. They are <i>not</i> the same lot order.</div>
      <canvas id="lotb-canvas" width="860" height="340" style="width:100%;max-width:860px"></canvas>
      <div class="canvas-controls">
        <button class="ctrl-btn" id="lotb-fifo">🔵 FIFO (by receipt)</button>
        <button class="ctrl-btn" id="lotb-fefo">🟠 FEFO (by expiry)</button>
        <button class="ctrl-btn" id="lotb-step">▶ Step</button>
        <button class="ctrl-btn" id="lotb-reset">↺ Reset</button>
        <span class="ctrl-label" id="lotb-status">Pick a rule, then Step through the allocation.</span>
      </div>
    </div>
    <div class="canvas-explainer">
      <h3>What you're watching</h3>
      <p>The three lots carry different <strong>identities</strong>: <code>L-241</code> (recv W1, exp W9), <code>L-255</code> (recv W2, exp W6), <code>L-262</code> (recv W3, exp W11). A fungible plan would just say "120 on hand, take 80." Lot-based planning instead ranks the lots and consumes <strong>specific</strong> ones, pegging each pick to the order.</p>
      <p><strong>FIFO</strong> orders by receipt: <code>L-241(40) → L-255(30) → L-262(10)</code> — oldest stock leaves first. <strong>FEFO</strong> orders by expiry: <code>L-255(30, exp W6) → L-241(40, exp W9) → L-262(10)</code> — the lot that would spoil soonest leaves first. Same 80 units, <strong>different lots</strong>, so a different genealogy and a different write-off risk. When expiry varies lot to lot, FIFO can leave a soon-to-expire lot sitting in stock; FEFO is what shelf-life-sensitive plans use.</p>
    </div>`;

  const canvas = tab.querySelector('#lotb-canvas');
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  const statusEl = tab.querySelector('#lotb-status');

  let rule = 'FIFO';
  let picks = allocate(rule);
  let shown = 0;            // number of picks revealed
  let pop = 0;

  function setRule(r) { rule = r; picks = allocate(r); shown = 0; pop = 12; statusEl.textContent = `${rule}: ${picks.length} lot(s) will be consumed. Step to reveal.`; }
  function step() {
    if (shown >= picks.length) return;
    shown++; pop = 12;
    const p = picks[shown - 1];
    const cum = picks.slice(0, shown).reduce((s, x) => s + x.take, 0);
    statusEl.textContent = `${rule}: consume ${p.take} from ${p.id} (recv W${p.recv}, exp W${p.exp}). Pegged ${cum}/${DEMAND}.`;
  }
  function reset() { shown = 0; pop = 12; statusEl.textContent = `Pick a rule, then Step through the allocation.`; }

  const lotX = 40, lotW = 150, lotGap = 24, lotY = 70, lotH = 150;
  const orderX = 620, orderY = 110, orderW = 190, orderH = 120;

  let raf = null;
  function draw() {
    if (pop > 0) pop--;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0A0E1A'; ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = 'left'; ctx.font = 'bold 12px system-ui'; ctx.fillStyle = '#CBD5E1';
    ctx.fillText('Lots on hand', lotX, 44);
    ctx.font = '10px system-ui'; ctx.fillStyle = '#64748B';
    ctx.fillText(`rule: ${rule}`, lotX, 60);

    // order box on the right
    drawRoundRect(ctx, orderX, orderY, orderW, orderH, 12, '#111827', '#6366F1');
    ctx.textAlign = 'center'; ctx.font = 'bold 12px system-ui'; ctx.fillStyle = '#A5B4FC';
    ctx.fillText('Order · due W' + DUE, orderX + orderW / 2, orderY + 24);
    const cum = picks.slice(0, shown).reduce((s, x) => s + x.take, 0);
    ctx.font = 'bold 30px system-ui'; ctx.fillStyle = cum >= DEMAND ? '#10B981' : '#E2E8F0';
    ctx.fillText(`${cum} / ${DEMAND}`, orderX + orderW / 2, orderY + 64);
    ctx.font = '10px system-ui'; ctx.fillStyle = '#64748B';
    ctx.fillText(cum >= DEMAND ? 'fully pegged' : 'filling…', orderX + orderW / 2, orderY + 92);

    // lots in consumption order (left→right follows the rule ranking)
    const ordered = rule === 'FIFO' ? [...LOTS].sort((a, b) => a.recv - b.recv)
                                    : [...LOTS].sort((a, b) => a.exp - b.exp);
    ordered.forEach((l, i) => {
      const x = lotX + i * (lotW + lotGap);
      const pick = picks.find(p => p.id === l.id);
      const pickIdx = picks.findIndex(p => p.id === l.id);
      const revealed = pick && pickIdx < shown;
      const isLatest = pickIdx === shown - 1;
      const grow = isLatest ? (pop / 12) * 3 : 0;
      const bx = x - grow, by = lotY - grow, bw = lotW + grow * 2, bh = lotH + grow * 2;

      const border = revealed ? (rule === 'FIFO' ? '#38BDF8' : '#F59E0B') : '#1e2a3f';
      drawRoundRect(ctx, bx, by, bw, bh, 12, '#111827', border + (revealed ? '' : '66'));

      ctx.textAlign = 'center';
      ctx.font = 'bold 15px system-ui'; ctx.fillStyle = revealed ? '#E2E8F0' : '#475569';
      ctx.fillText(l.id, bx + bw / 2, by + 28);
      ctx.font = '10px system-ui'; ctx.fillStyle = '#64748B';
      ctx.fillText(`recv W${l.recv} · exp W${l.exp}`, bx + bw / 2, by + 48);
      ctx.fillText(`grade ${l.grade}`, bx + bw / 2, by + 64);

      // quantity bar
      const barY = by + 78, barH = 46, barX = bx + 20, barW = bw - 40;
      drawRoundRect(ctx, barX, barY, barW, barH, 6, '#0d1322', '#1e2a3f');
      const takeFrac = pick ? pick.take / l.qty : 0;
      if (revealed && takeFrac > 0) {
        drawRoundRect(ctx, barX, barY, barW * takeFrac, barH, 6, border + '55', border);
      }
      ctx.font = 'bold 16px system-ui'; ctx.fillStyle = revealed ? '#E2E8F0' : '#475569';
      ctx.fillText(revealed ? `−${pick.take} of ${l.qty}` : `${l.qty} on hand`, bx + bw / 2, barY + 30);

      // rank chip
      if (pick) {
        ctx.font = 'bold 10px system-ui';
        ctx.fillStyle = revealed ? border : '#334155';
        ctx.fillText(`#${pickIdx + 1} consumed`, bx + bw / 2, by + bh - 8);
      } else {
        ctx.font = '10px system-ui'; ctx.fillStyle = '#334155';
        ctx.fillText('untouched', bx + bw / 2, by + bh - 8);
      }

      // peg line to order when revealed
      if (revealed) {
        drawArrow(ctx, bx + bw, by + bh / 2, orderX - 4, orderY + orderH / 2, border + 'AA', 1.6);
      }
    });

    raf = requestAnimationFrame(draw);
  }
  raf = requestAnimationFrame(draw);

  tab.querySelector('#lotb-fifo').addEventListener('click', () => setRule('FIFO'));
  tab.querySelector('#lotb-fefo').addEventListener('click', () => setRule('FEFO'));
  tab.querySelector('#lotb-step').addEventListener('click', step);
  tab.querySelector('#lotb-reset').addEventListener('click', reset);
  setRule('FIFO');

  return () => { if (raf) cancelAnimationFrame(raf); };
}

// ── Tab 2: genealogy (static, wiki-grounded) ──────────────────────────────────
function genealogyTab() {
  return `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">Lot genealogy — the pegging tree with identities</div><div class="section-desc">Because the solver pegs every unit, lot-based planning turns those pegs into a lot-to-lot tree through every BOM level. Read it <em>down</em> for backward traceability, <em>up</em> for forward.</div></div>

      <div class="canvas-explainer">
        <h3>One finished lot, traced both ways</h3>
        <pre style="font-family:ui-monospace,monospace;font-size:12px;line-height:1.7;color:var(--text2);overflow-x:auto;margin:0">
  CUST ORDER SO-7781  (80 ea)
    └─ pegs to  FG lot  <b style="color:var(--accent)">F-900</b>  (made W3)
         ├─ consumed  COMP lot  <b style="color:#38BDF8">C-412</b>  (40 ea, recv W1)
         ├─ consumed  COMP lot  <b style="color:#38BDF8">C-418</b>  (40 ea, recv W2)
         │       └─ made from  RAW lot  <b style="color:#F59E0B">R-205</b>  (supplier S2)
         └─ used on  RESOURCE  LINE_A  (run R-77)
        </pre>
      </div>

      <div class="info-grid" style="margin-top:4px">
        <div class="info-card" style="border-left:3px solid #38BDF8"><div class="info-card-title">Backward traceability</div><div class="info-card-body">Start at a <strong>finished lot</strong> and follow pegs <em>down</em> to every component and raw lot that built it. This is how a quality defect is traced to its root supplier lot — e.g. <code>F-900 → C-418 → R-205 (supplier S2)</code>.</div></div>
        <div class="info-card" style="border-left:3px solid #F59E0B"><div class="info-card-title">Forward traceability</div><div class="info-card-body">Start at a <strong>raw / component lot</strong> and follow pegs <em>up</em> to every finished lot and customer order it reached. This is how a recall is scoped — "every shipment that touched <code>R-205</code>."</div></div>
        <div class="info-card" style="border-left:3px solid #10B981"><div class="info-card-title">Why it's free here</div><div class="info-card-body">A dedicated track-and-trace system rebuilds genealogy after the fact. The SCS already emits a peg per unit during planning, so the genealogy is a <strong>by-product of the plan</strong>, available before anything is made.</div></div>
      </div>

      <div class="section-header" style="margin-top:22px"><div class="section-title">What a lot carries</div><div class="section-desc">A lot is a quantity <em>plus</em> identity. These attributes travel with it and can gate which demands it may fill.</div></div>
      <div class="table-scroll">
        <table class="compare-table">
          <thead><tr><th>Attribute</th><th>Meaning</th><th>Used by</th></tr></thead>
          <tbody>
            <tr><td style="font-weight:600;color:var(--text)">Lot number</td><td>The unique identity of the receipt or production run.</td><td>Pegging, genealogy</td></tr>
            <tr><td style="font-weight:600;color:var(--text)">Receipt bucket</td><td>When the lot became available on hand.</td><td>FIFO selection</td></tr>
            <tr><td style="font-weight:600;color:var(--text)">Expiry bucket</td><td>When the lot can no longer be consumed.</td><td>FEFO, shelf life</td></tr>
            <tr><td style="font-weight:600;color:var(--text)">Grade / spec</td><td>A quality or specification class on the lot.</td><td>Attribute matching</td></tr>
            <tr><td style="font-weight:600;color:var(--text)">Source</td><td>The supplier or plant the lot came from.</td><td>Sourcing rules, recall scope</td></tr>
          </tbody>
        </table>
      </div>
    </div>`;
}

// ── Tab 3: concepts (static, wiki-grounded) ───────────────────────────────────
function conceptsTab() {
  return `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">When lot-based planning is turned on</div><div class="section-desc">Lot-based planning is a modelling choice on a material node, not a global switch. The node's supply is then represented as discrete lots instead of a single bucketed quantity.</div></div>
      <div class="info-grid">
        <div class="info-card" style="border-left:3px solid #6366F1"><div class="info-card-title">Discrete, not continuous</div><div class="info-card-body">Each receipt / production run is its own lot object. The solver cannot split identity — it consumes whole-or-part of a <em>named</em> lot, never an averaged pool.</div></div>
        <div class="info-card" style="border-left:3px solid #A78BFA"><div class="info-card-title">Lot sizing still applies</div><div class="info-card-body">Min / Multiple / Max Lot shape the <strong>size of each produced lot</strong>. A new production lot is lot-sized first, then grossed up for yield as it propagates upstream.</div></div>
        <div class="info-card" style="border-left:3px solid #38BDF8"><div class="info-card-title">Selection rule drives pegging</div><div class="info-card-body">FIFO / FEFO / attribute-match decides which lot a demand pegs to. Change the rule and the <em>same</em> on-hand produces a different plan and a different genealogy.</div></div>
      </div>

      <div class="section-header" style="margin-top:22px"><div class="section-title">Lot-selection rules</div><div class="section-desc">How the solver ranks eligible lots when more than one can fill a demand.</div></div>
      <div class="table-scroll">
        <table class="compare-table">
          <thead><tr><th>Rule</th><th>Ranks lots by…</th><th>Use when</th></tr></thead>
          <tbody>
            <tr><td style="font-weight:700;color:var(--accent)">FIFO</td><td>Earliest receipt date first.</td><td>You want oldest stock to move first (general rotation).</td></tr>
            <tr><td style="font-weight:700;color:var(--accent)">FEFO</td><td>Earliest expiry date first.</td><td>Shelf life varies lot to lot; you want to minimise write-offs.</td></tr>
            <tr><td style="font-weight:700;color:var(--accent)">Attribute match</td><td>Only lots whose grade / spec matches the demand are eligible; then FIFO/FEFO among them.</td><td>A demand requires a specific grade, source or certification.</td></tr>
          </tbody>
        </table>
      </div>

      <div class="canvas-explainer" style="margin-top:18px"><h3>The cost of identity</h3>
        <p>Lot-based planning is heavier than quantity planning — the solver carries and pegs every lot, so the model is larger and slower. Turn it on where identity <em>matters</em>: regulated industries (pharma, food, aerospace) that need genealogy for recall, or where shelf life and grade gate what can fill a demand. Where supply is genuinely fungible, ordinary quantity planning is faster and gives the same answer.</p>
      </div>
    </div>`;
}
